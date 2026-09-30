"""QR payload alignment and Apple Web Service auth consistency.

The scanner looks up CustomerPass.objects.get(qr_code=<scanned string>).
Stored QR images must therefore encode the raw pass serial, not an HMAC
token. Apple's authenticationToken must match what the web service accepts.
"""

import json

import pytest
from django.test import RequestFactory

from apps.customers.pass_engine.apple_pass import _ensure_apple_auth_token
from apps.customers.pass_engine.apple_pass_web_service import (
    _apple_token_matches,
    _validate_apple_auth,
)
from apps.customers.pass_engine.qr_generator import (
    generate_and_store_qr,
    generate_qr_image,
    generate_qr_token,
    verify_qr_token,
)
from tests.factories import make_card, make_customer, make_customer_pass, make_tenant


@pytest.mark.django_db
class TestQrPayloadAlignment:
    def test_stored_qr_encodes_raw_serial(self, monkeypatch):
        """generate_and_store_qr must embed pass_obj.qr_code (scanner lookup key)."""
        tenant = make_tenant()
        card = make_card(tenant)
        customer = make_customer(tenant)
        cp = make_customer_pass(customer, card)
        assert cp.qr_code

        captured: dict = {}

        def fake_upload(object_key, data, content_type):
            captured["key"] = object_key
            captured["data"] = data
            return f"/assets/{object_key}"

        monkeypatch.setattr(
            "apps.customers.pass_engine.qr_generator._upload_to_storage",
            fake_upload,
        )

        url = generate_and_store_qr(cp)

        assert url.startswith("/assets/qr/")
        assert captured["key"] == f"qr/{cp.id}.png"
        # PNG signature
        assert captured["data"][:8] == b"\x89PNG\r\n\x1a\n"

    def test_scanner_serial_is_stable_16_hex(self):
        """Serial format the scanner expects: 16 uppercase hex chars."""
        tenant = make_tenant()
        card = make_card(tenant)
        customer = make_customer(tenant)
        cp = make_customer_pass(customer, card)
        assert len(cp.qr_code) == 16
        assert cp.qr_code == cp.qr_code.upper()
        int(cp.qr_code, 16)  # must be hex

    def test_hmac_token_helper_still_works(self):
        """Token helpers stay intact for callers that need signed codes."""
        token = generate_qr_token("ABCDEF0123456789", secret="s3cret")
        ok, serial = verify_qr_token(token, secret="s3cret")
        assert ok is True
        assert serial == "ABCDEF0123456789"

    def test_qr_image_accepts_plain_serial(self):
        png = generate_qr_image("6D90179F708F4C3D")
        assert png[:8] == b"\x89PNG\r\n\x1a\n"


@pytest.mark.django_db
class TestAppleAuthConsistency:
    def test_ensure_token_is_stable(self):
        tenant = make_tenant()
        card = make_card(tenant)
        customer = make_customer(tenant)
        cp = make_customer_pass(customer, card)

        t1 = _ensure_apple_auth_token(cp)
        cp.refresh_from_db()
        t2 = _ensure_apple_auth_token(cp)
        assert t1 == t2
        assert len(t1) >= 16
        assert (cp.pass_data or {}).get("apple_auth_token") == t1

    def test_matches_stored_token(self):
        tenant = make_tenant()
        card = make_card(tenant)
        customer = make_customer(tenant)
        cp = make_customer_pass(customer, card)
        token = _ensure_apple_auth_token(cp)
        assert _apple_token_matches(token, cp) is True

    def test_matches_legacy_uuid_token(self):
        """Passes issued before apple_auth_token existed must keep updating."""
        tenant = make_tenant()
        card = make_card(tenant)
        customer = make_customer(tenant)
        cp = make_customer_pass(customer, card)
        legacy = str(cp.id).replace("-", "")
        assert _apple_token_matches(legacy, cp) is True

    def test_rejects_wrong_token(self):
        tenant = make_tenant()
        card = make_card(tenant)
        customer = make_customer(tenant)
        cp = make_customer_pass(customer, card)
        _ensure_apple_auth_token(cp)
        assert _apple_token_matches("not-the-token", cp) is False

    def test_validate_apple_auth_accepts_legacy(self, rf: RequestFactory):
        tenant = make_tenant()
        card = make_card(tenant)
        customer = make_customer(tenant)
        cp = make_customer_pass(customer, card)
        legacy = str(cp.id).replace("-", "")

        request = rf.get("/wallet/apple/v1/passes/x/y")
        request.META["HTTP_AUTHORIZATION"] = f"ApplePass {legacy}"
        assert _validate_apple_auth(request, str(cp.id)) is True

    def test_validate_apple_auth_rejects_missing_header(self, rf: RequestFactory):
        tenant = make_tenant()
        card = make_card(tenant)
        customer = make_customer(tenant)
        cp = make_customer_pass(customer, card)
        request = rf.get("/wallet/apple/v1/passes/x/y")
        assert _validate_apple_auth(request, str(cp.id)) is False


@pytest.mark.django_db
class TestAppleLogEndpoint:
    def test_log_endpoint_accepts_apple_body(self, client, db):
        # Route is registered under wallet/apple/ (see loyallia.urls)
        url = "/wallet/apple/v1/log"
        payload = {"logs": ["Pass test.com/x/serial1 could not be updated"]}
        resp = client.post(
            url,
            data=json.dumps(payload),
            content_type="application/json",
        )
        assert resp.status_code == 200

    def test_log_endpoint_tolerates_empty_body(self, client, db):
        url = "/wallet/apple/v1/log"
        resp = client.post(url, data=b"", content_type="application/json")
        assert resp.status_code == 200


@pytest.mark.django_db
class TestListUpdatedContract:
    """Apple's list-updated endpoint must honour the PassKit contract.

    GET /v1/devices/{device}/registrations/{passType} may answer only:

    * 200 with ``{"serialNumbers": [...], "lastUpdatedTag": "..."}``
    * 204 when there is nothing to report
    * 401 when an ``ApplePass`` token is supplied and wrong

    A 404 is not in the contract. iOS treats it as a hard failure and stops
    polling, which silently freezes every installed pass on that device.
    """

    PASS_TYPE = "pass.com.loyallia.cards"

    def _setup_pass(self, pass_data=None):
        from django.conf import settings

        tenant = make_tenant()
        card = make_card(tenant)
        customer = make_customer(tenant)
        cp = make_customer_pass(customer, card, pass_data=pass_data or {})
        return tenant, cp, settings

    def _register(self, cp, device_id="testdev"):
        from apps.customers.models import ApplePassRegistration

        return ApplePassRegistration.objects.create(
            customer_pass=cp,
            device_library_id=device_id,
            push_token="push-token-abc",
        )

    def _url(self, device_id="testdev", pass_type=None):
        return (
            f"/wallet/apple/v1/devices/{device_id}/registrations/"
            f"{pass_type or self.PASS_TYPE}"
        )

    def test_unknown_device_returns_204_not_404(self, client, db):
        """The exact regression: unregistered device must be 204."""
        _, _, settings = self._setup_pass()
        with self._override_pass_type(settings):
            resp = client.get(self._url(device_id="no-such-device"))
        assert resp.status_code == 204
        assert resp.status_code != 404

    def test_unknown_pass_type_returns_204(self, client, db):
        _, _, settings = self._setup_pass()
        with self._override_pass_type(settings):
            resp = client.get(self._url(pass_type="pass.other.app"))
        assert resp.status_code == 204

    def test_wrong_applepass_token_returns_401(self, client, db):
        _, cp, settings = self._setup_pass()
        self._register(cp)
        with self._override_pass_type(settings):
            resp = client.get(self._url(), HTTP_AUTHORIZATION="ApplePass wrong-token")
        assert resp.status_code == 401

    def test_legacy_uuid_token_is_accepted(self, client, db):
        """Passes issued with authenticationToken = id-without-dashes still work."""
        _, cp, settings = self._setup_pass()
        self._register(cp)
        legacy = str(cp.id).replace("-", "")
        with self._override_pass_type(settings):
            resp = client.get(self._url(), HTTP_AUTHORIZATION=f"ApplePass {legacy}")
        assert resp.status_code in (200, 204)
        assert resp.status_code != 401

    def test_returns_last_updated_tag_key_apple_reads(self, client, db):
        """Apple reads `lastUpdatedTag`; the old `lastUpdated` key was ignored."""
        _, cp, settings = self._setup_pass()
        self._register(cp)
        with self._override_pass_type(settings):
            resp = client.get(self._url())
        assert resp.status_code == 200
        body = json.loads(resp.content)
        assert "lastUpdatedTag" in body
        assert "lastUpdated" not in body
        assert str(cp.id) in body["serialNumbers"]
        assert body["lastUpdatedTag"]

    def test_no_updates_since_tag_returns_204(self, client, db):
        import datetime as _dt

        from django.utils import timezone as _tz

        _, cp, settings = self._setup_pass()
        self._register(cp)
        future = (_tz.now() + _dt.timedelta(hours=1)).isoformat()
        with self._override_pass_type(settings):
            resp = client.get(self._url() + f"?passesUpdatedSince={future}")
        assert resp.status_code == 204

    def test_inactive_pass_excluded(self, client, db):
        _, cp, settings = self._setup_pass()
        self._register(cp)
        cp.is_active = False
        cp.save(update_fields=["is_active"])
        with self._override_pass_type(settings):
            resp = client.get(self._url())
        assert resp.status_code == 204

    def test_missing_header_is_not_401_when_registered(self, client, db):
        """Some iOS pollers omit the header; registration still gates access."""
        _, cp, settings = self._setup_pass()
        self._register(cp)
        with self._override_pass_type(settings):
            resp = client.get(self._url())
        assert resp.status_code != 401
        assert resp.status_code != 404

    def _override_pass_type(self, settings):
        from django.test import override_settings

        return override_settings(APPLE_PASS_TYPE_IDENTIFIER=self.PASS_TYPE)

    def test_tag_survives_url_transport_round_trip(self, client, db):
        """The emitted tag must parse back even when `+` mangles to a space."""
        from urllib.parse import quote

        _, cp, settings = self._setup_pass()
        self._register(cp)
        with self._override_pass_type(settings):
            first = client.get(self._url())
            assert first.status_code == 200
            tag = json.loads(first.content)["lastUpdatedTag"]
            # URL-safe form we emit
            assert "+" not in tag
            assert tag.endswith("Z")
            # A client that does NOT encode the `+` (space-mangled variant)
            mangled = tag.replace("Z", "+00:00").replace("+", " ")
            again = client.get(
                self._url() + "?passesUpdatedSince=" + quote(mangled, safe="")
            )
            assert again.status_code == 204
            # And the properly encoded literal-plus form
            plus_form = tag.replace("Z", "+00:00")
            again2 = client.get(
                self._url() + "?passesUpdatedSince=" + quote(plus_form, safe="")
            )
            assert again2.status_code == 204
