"""
Temporary password email delivery tests (temporary password never arrives).

These tests exercise the REAL send path end to end (request -> service ->
common.email_template -> common.transactional_email -> Django email backend).
The Django locmem email backend is the standard test configuration
(loyallia.settings.test), not a mock of the feature: it is the deployment's
configured EMAIL_BACKEND, captured in memory so deliveries can be asserted.

Covered guarantees:
- Portal password email is actually attempted and delivered on request, and
  the emailed temporary password authenticates against the portal.
- Team member welcome email is attempted and delivered; the emailed
  password authenticates the new user.
- Send failures surface to the caller (success=False / email_sent=False)
  instead of a silent pass.
- Temporary passwords are never written to logs.
- SuperAdmin tenant creation emails the owner the temporary password, and
  the API response leak can be stopped via PlatformSetting
  'super_admin_expose_temp_password' (default: unchanged behavior).
"""

import json
import re

from django.core import mail
from django.test import RequestFactory, TestCase, override_settings
from django.test.client import Client

from apps.authentication.models import UserRole
from apps.customers.models import CustomerPortalAccount
from apps.tenants.models import PlatformSetting
from apps.tenants.super_admin_api.schemas import CreateTenantWizardIn
from apps.tenants.super_admin_api.tenants import create_tenant
from common.messages import get_message
from tests.factories import (
    make_customer,
    make_plan,
    make_subscription,
    make_tenant,
    make_user,
)

# Standard test email configuration: force the deployed EMAIL_BACKEND path
# (locmem) regardless of any Vault-provided SMTP secrets in the environment.
LOCAL_EMAIL_SETTINGS = {
    "TRANSACTIONAL_EMAIL_HOST": "",
    "TRANSACTIONAL_EMAIL_HOST_USER": "",
    "TRANSACTIONAL_EMAIL_HOST_PASSWORD": "",
    "EMAIL_BACKEND": "django.core.mail.backends.locmem.EmailBackend",
}

# Real transport failure (connection refused on 127.0.0.1:1) — no mocks: the
# configured EMAIL_BACKEND is plain SMTP pointed at a closed port.
FAILING_EMAIL_SETTINGS = {
    "TRANSACTIONAL_EMAIL_HOST": "",
    "TRANSACTIONAL_EMAIL_HOST_USER": "",
    "TRANSACTIONAL_EMAIL_HOST_PASSWORD": "",
    "EMAIL_BACKEND": "django.core.mail.backends.smtp.EmailBackend",
    "EMAIL_HOST": "127.0.0.1",
    "EMAIL_PORT": 1,
    "EMAIL_HOST_USER": "",
    "EMAIL_HOST_PASSWORD": "",
    "EMAIL_USE_TLS": False,
    "EMAIL_TIMEOUT": 3,
}


def _extract_temp_password(message) -> str:
    """Extract the temporary password from the plain-text email body."""
    label = get_message("EMAIL_TEMPLATE_PASSWORD_LABEL")
    match = re.search(
        rf"^{re.escape(label)}:\s*(\S+)$", message.body, flags=re.MULTILINE
    )
    assert match is not None, f"temp password not found in email body: {message.body!r}"
    return match.group(1)


def _get_auth_header(user) -> str:
    """Get JWT auth header by logging in (same pattern as test_api.py)."""
    resp = Client().post(
        "/api/v1/auth/login/",
        data=json.dumps({"email": user.email, "password": user._test_password}),
        content_type="application/json",
    )
    assert resp.status_code == 200, f"login failed: {resp.content}"
    return f"Bearer {resp.json().get('access_token', '')}"


@override_settings(**LOCAL_EMAIL_SETTINGS)
class PortalPasswordEmailTest(TestCase):
    """POST /api/v1/portal/generate-password/ delivers the temp password."""

    def _request_password(self, email: str):
        return self.client.post(
            "/api/v1/portal/generate-password/",
            data=json.dumps({"email": email}),
            content_type="application/json",
        )

    def test_portal_password_email_is_attempted_and_delivered(self):
        email = "portal-temp-pwd-deliver@test.com"
        make_customer(make_tenant(), email=email)

        resp = self._request_password(email)

        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.json()["success"])
        self.assertEqual(len(mail.outbox), 1)
        message = mail.outbox[0]
        self.assertEqual(message.to, [email])
        self.assertIn(get_message("EMAIL_TEMPLATE_PASSWORD_LABEL"), message.body)

        # The emailed password is the real one: it authenticates the portal.
        password = _extract_temp_password(message)
        login = self.client.post(
            "/api/v1/portal/login/",
            data=json.dumps({"email": email, "password": password}),
            content_type="application/json",
        )
        self.assertEqual(login.status_code, 200)
        self.assertTrue(login.json()["success"])
        self.assertTrue(CustomerPortalAccount.objects.filter(email=email).exists())

    def test_temp_password_is_not_logged(self):
        email = "portal-temp-pwd-logs@test.com"
        make_customer(make_tenant(), email=email)

        with self.assertLogs(level="DEBUG") as captured_logs:
            self._request_password(email)

        password = _extract_temp_password(mail.outbox[0])
        logged = "\n".join(captured_logs.output)
        self.assertNotIn(password, logged)

    def test_unknown_email_returns_success_and_sends_nothing(self):
        resp = self._request_password("portal-unknown-no-mail@test.com")

        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.json()["success"])
        self.assertEqual(len(mail.outbox), 0)


@override_settings(**LOCAL_EMAIL_SETTINGS)
class TeamWelcomeEmailTest(TestCase):
    """POST /api/v1/tenants/team/ delivers the welcome email with the password."""

    EMAIL = "team-temp-pwd@test.com"

    def setUp(self):
        self.tenant = make_tenant()
        self.owner = make_user(tenant=self.tenant, role=UserRole.OWNER)
        self.header = _get_auth_header(self.owner)
        plan = make_plan(max_users=10)
        make_subscription(self.tenant, plan=plan)

    def _add_member(self):
        return self.client.post(
            "/api/v1/tenants/team/",
            data=json.dumps(
                {
                    "email": self.EMAIL,
                    "first_name": "New",
                    "last_name": "Member",
                    "role": "MANAGER",
                }
            ),
            content_type="application/json",
            HTTP_AUTHORIZATION=self.header,
        )

    def test_team_welcome_email_is_attempted_and_delivered(self):
        with self.assertLogs(level="DEBUG") as captured_logs:
            resp = self._add_member()

        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data["success"])
        self.assertTrue(data["email_sent"])

        self.assertEqual(len(mail.outbox), 1)
        message = mail.outbox[0]
        self.assertEqual(message.to, [self.EMAIL])
        self.assertIn(get_message("EMAIL_TEMPLATE_PASSWORD_LABEL"), message.body)

        # The emailed password is the real one: it authenticates the new user.
        password = _extract_temp_password(message)
        login = self.client.post(
            "/api/v1/auth/login/",
            data=json.dumps({"email": self.EMAIL, "password": password}),
            content_type="application/json",
        )
        self.assertEqual(login.status_code, 200)

        # The temporary password never reaches the logs.
        self.assertNotIn(password, "\n".join(captured_logs.output))


@override_settings(**FAILING_EMAIL_SETTINGS)
class EmailSendFailureSurfacesTest(TestCase):
    """A failing transport surfaces an error to the caller (never silent)."""

    EMAIL = "portal-send-fail@test.com"

    def test_portal_password_email_failure_surfaces_error(self):
        make_customer(make_tenant(), email=self.EMAIL)

        resp = self.client.post(
            "/api/v1/portal/generate-password/",
            data=json.dumps({"email": self.EMAIL}),
            content_type="application/json",
        )

        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertFalse(data["success"])
        self.assertEqual(data["message"], get_message("EMAIL_SEND_ERROR"))
        self.assertEqual(len(mail.outbox), 0)

    def test_team_welcome_email_failure_surfaces_email_sent_false(self):
        tenant = make_tenant()
        owner = make_user(tenant=tenant, role=UserRole.OWNER)
        header = _get_auth_header(owner)
        make_subscription(tenant, plan=make_plan(max_users=10))

        resp = self.client.post(
            "/api/v1/tenants/team/",
            data=json.dumps(
                {
                    "email": "team-send-fail@test.com",
                    "first_name": "New",
                    "last_name": "Member",
                    "role": "STAFF",
                }
            ),
            content_type="application/json",
            HTTP_AUTHORIZATION=header,
        )

        # The user flow is not rolled back, but the failure is surfaced.
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data["success"])
        self.assertFalse(data["email_sent"])
        self.assertEqual(len(mail.outbox), 0)


@override_settings(**LOCAL_EMAIL_SETTINGS)
class SuperAdminTempPasswordExposureTest(TestCase):
    """Owner welcome email carries the password; response leak is gateable."""

    def _create_tenant(self, owner_email: str):
        request = RequestFactory().post(
            "/api/v1/admin/tenants/",
            data=json.dumps({}),
            content_type="application/json",
        )
        request.user = make_user(tenant=None, role=UserRole.SUPER_ADMIN)
        plan = make_plan(slug="r7-test-plan")
        payload = CreateTenantWizardIn(
            name="R7 Email Tenant",
            legal_name="R7 Email Tenant SA",
            ruc="1790012345001",
            city="Quito",
            owner_email=owner_email,
            owner_first_name="Owner",
            owner_last_name="R7",
            plan_slug=plan.slug,
            locations=[
                {
                    "name": "Sede Principal",
                    "address": "Av. Siempre Viva",
                    "city": "Quito",
                    "is_primary": True,
                }
            ],  # type: ignore[reportArgumentType]
        )
        with self.captureOnCommitCallbacks(execute=True):
            return create_tenant(request, payload)

    def test_owner_welcome_email_contains_the_temp_password(self):
        response = self._create_tenant("owner-r7-a@test.com")

        # Default behavior preserved: temp_password is returned to the caller.
        self.assertTrue(response.temp_password)
        self.assertEqual(len(mail.outbox), 1)
        password = _extract_temp_password(mail.outbox[0])
        self.assertEqual(password, response.temp_password)

    def test_temp_password_can_be_stopped_in_responses_but_still_emailed(self):
        PlatformSetting.set("super_admin_expose_temp_password", "false")

        response = self._create_tenant("owner-r7-b@test.com")

        # The API no longer leaks the temporary password...
        self.assertEqual(response.temp_password, "")
        # ...but the owner still receives it by email.
        self.assertEqual(len(mail.outbox), 1)
        password = _extract_temp_password(mail.outbox[0])
        self.assertTrue(password)


class TempPasswordNotLoggedAcrossFlowsTest(TestCase):
    """Temp passwords never reach the logs in any covered flow."""

    def test_portal_and_team_flows_do_not_log_the_password(self):
        with override_settings(**LOCAL_EMAIL_SETTINGS):
            tenant = make_tenant()
            make_customer(tenant, email="portal-no-log@test.com")
            owner = make_user(tenant=tenant, role=UserRole.OWNER)
            header = _get_auth_header(owner)
            make_subscription(tenant, plan=make_plan(max_users=10))

            with self.assertLogs(level="DEBUG") as captured_logs:
                self.client.post(
                    "/api/v1/portal/generate-password/",
                    data=json.dumps({"email": "portal-no-log@test.com"}),
                    content_type="application/json",
                )
                self.client.post(
                    "/api/v1/tenants/team/",
                    data=json.dumps(
                        {
                            "email": "team-no-log@test.com",
                            "first_name": "No",
                            "last_name": "Log",
                            "role": "STAFF",
                        }
                    ),
                    content_type="application/json",
                    HTTP_AUTHORIZATION=header,
                )

            self.assertEqual(len(mail.outbox), 2)
            passwords = [_extract_temp_password(m) for m in mail.outbox]
            logged = "\n".join(captured_logs.output)
            for password in passwords:
                self.assertNotIn(password, logged)
