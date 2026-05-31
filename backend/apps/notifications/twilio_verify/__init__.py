"""Twilio Verify v2 Integration Package.

  Real production Twilio Verify client.
NO MOCKS. NO BYPASSES. REAL API CALLS.
"""

from .client import VerifyClient, VerifyServiceError

__all__ = ["VerifyClient", "VerifyServiceError"]
