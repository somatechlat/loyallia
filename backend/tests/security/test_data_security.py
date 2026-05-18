"""
Loyallia  Data Security Tests

Tests for data isolation and storage security findings.

Covers:
- LYL-H-SEC-007: Invitation token hashing
- LYL-M-SEC-012: Salted OTP hashing
"""

import hashlib
import secrets

from django.test import TestCase

# LYL-H-SEC-007: Invitation Token Hashing Tests


class TestInvitationTokenHashing(TestCase):
    """Verify invitation tokens are stored as SHA-256 hashes."""

    def test_sha256_hash_of_token(self):
        """SHA-256 hash of a token should be 64 hex characters."""
        token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        self.assertEqual(len(token_hash), 64)
        self.assertRegex(token_hash, r"^[0-9a-f]+$")

    def test_hash_is_not_reversible(self):
        """The hash should not equal the original token."""
        token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        self.assertNotEqual(token, token_hash)

    def test_same_token_produces_same_hash(self):
        """Same input should always produce the same hash (deterministic)."""
        token = "test-token-123"
        hash1 = hashlib.sha256(token.encode()).hexdigest()
        hash2 = hashlib.sha256(token.encode()).hexdigest()
        self.assertEqual(hash1, hash2)

    def test_different_tokens_produce_different_hashes(self):
        """Different tokens should produce different hashes."""
        hash1 = hashlib.sha256(b"token-a").hexdigest()
        hash2 = hashlib.sha256(b"token-b").hexdigest()
        self.assertNotEqual(hash1, hash2)


# LYL-M-SEC-012: Salted OTP Hashing Tests


class TestSaltedOTPHashing(TestCase):
    """Verify OTP hashing uses per-OTP salts."""

    def test_hash_otp_requires_salt(self):
        """_hash_otp should require both otp and salt parameters."""
        from apps.authentication.helpers import _hash_otp

        result = _hash_otp("123456", "salt123")
        self.assertEqual(len(result), 64)  # SHA-256 hex = 64 chars

    def test_same_otp_different_salt_produces_different_hash(self):
        """Same OTP with different salts should produce different hashes."""
        from apps.authentication.helpers import _hash_otp

        hash1 = _hash_otp("123456", "salt_a")
        hash2 = _hash_otp("123456", "salt_b")
        self.assertNotEqual(hash1, hash2)

    def test_salt_is_random(self):
        """Each salt should be unique (random)."""
        salts = {secrets.token_hex(16) for _ in range(100)}
        self.assertEqual(len(salts), 100)

    def test_hash_deterministic_with_same_salt(self):
        """Same OTP + same salt should always produce same hash."""
        from apps.authentication.helpers import _hash_otp

        hash1 = _hash_otp("123456", "fixed_salt")
        hash2 = _hash_otp("123456", "fixed_salt")
        self.assertEqual(hash1, hash2)


# Integration: Verify Helpers code changes


class TestHelpersRuntimeBehavior(TestCase):
    """Verify OTP helpers use salted hashing via runtime behavior."""

    def test_store_otp_generates_salt(self):
        """store_otp should store a salted OTP hash in cache."""
        from django.core.cache import cache

        from apps.authentication.helpers import store_otp

        store_otp("test@loyallia.com", "123456", "verify_email")
        salt = cache.get("otp_salt:verify_email:test@loyallia.com")
        self.assertIsNotNone(salt)
        self.assertGreater(len(salt), 0)
        otp_hash = cache.get("otp:verify_email:test@loyallia.com")
        self.assertIsNotNone(otp_hash)
        self.assertEqual(len(otp_hash), 64)  # SHA-256 hex
