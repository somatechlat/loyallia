"""
Permission tests for the image upload endpoint (POST /api/v1/upload/).

Verifies which roles are allowed past the permission gate without depending on
a live MinIO: a disallowed role is rejected with 403 before storage, while an
allowed role passes the gate and reaches file validation (400 for an invalid
file) rather than 403.
"""

import io
import json

from django.test import TestCase

from apps.authentication.models import UserRole
from tests.factories import make_user


class UploadPermissionTest(TestCase):
    """/api/v1/upload/ role-based access control."""

    def _auth_header(self, user):
        resp = self.client.post(
            "/api/v1/auth/login/",
            data=json.dumps({"email": user.email, "password": user._test_password}),
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 200)
        return f"Bearer {resp.json()['access_token']}"

    def _post_upload(self, user):
        return self.client.post(
            "/api/v1/upload/",
            HTTP_AUTHORIZATION=self._auth_header(user),
            data={"file": io.BytesIO(b"not-an-image").getvalue()},
        )

    def test_staff_denied(self):
        staff = make_user(role=UserRole.STAFF)
        self.assertEqual(self._post_upload(staff).status_code, 403)

    def test_owner_allowed(self):
        owner = make_user(role=UserRole.OWNER)
        # Passes the permission gate; invalid file reaches validation (400), not 403.
        self.assertNotEqual(self._post_upload(owner).status_code, 403)

    def test_manager_allowed(self):
        manager = make_user(role=UserRole.MANAGER)
        self.assertNotEqual(self._post_upload(manager).status_code, 403)

    def test_super_admin_allowed(self):
        admin = make_user(role=UserRole.SUPER_ADMIN)
        self.assertNotEqual(self._post_upload(admin).status_code, 403)
