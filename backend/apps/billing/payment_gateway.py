"""
Loyallia — Payment Gateway Abstraction (REQ-PAY-002)
Pluggable payment gateway interface. Supports multiple providers via factory.
Default provider: Bendo (PlacetoPay infrastructure).

Providers are selected via settings.PAYMENT_GATEWAY_PROVIDER:
  - "bendo"  → BendoGateway (PlacetoPay API)
  - "manual" → ManualGateway (admin-verified payments)
"""

import hashlib
import hmac
import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from django.conf import settings

logger = logging.getLogger("loyallia.billing.gateway")


# =============================================================================
# DATA CLASSES
# =============================================================================


@dataclass
class PaymentSessionResult:
    """Result from creating a payment session."""

    session_id: str
    redirect_url: str
    status: str  # "pending", "approved", "rejected"


@dataclass
class PaymentStatusResult:
    """Result from checking a payment session."""

    session_id: str
    status: str  # "pending", "approved", "rejected", "expired"
    amount: str
    reference: str
    gateway_data: dict


# =============================================================================
# EXCEPTIONS
# =============================================================================


class PaymentGatewayError(Exception):
    """Raised when a payment gateway operation fails."""

    def __init__(self, message: str, code: str = "", gateway_response: Any = None):
        self.message = message
        self.code = code
        self.gateway_response = gateway_response
        super().__init__(message)


# =============================================================================
# ABSTRACT INTERFACE
# =============================================================================


class BasePaymentGateway(ABC):
    """
    Abstract payment gateway interface.
    All payment providers must implement these methods.
    """

    @abstractmethod
    def create_session(
        self,
        tenant_id: str,
        amount: str,
        currency: str,
        description: str,
        return_url: str,
        cancel_url: str,
        reference: str,
        buyer_email: str = "",
        buyer_name: str = "",
    ) -> PaymentSessionResult:
        """Create a payment session and return redirect URL."""

    @abstractmethod
    def check_session(self, session_id: str) -> PaymentStatusResult:
        """Check the status of an existing payment session."""

    @abstractmethod
    def cancel_subscription(self, subscription_id: str) -> dict:
        """Cancel a recurring subscription."""

    @abstractmethod
    def verify_webhook(self, body: bytes, signature: str) -> bool:
        """Verify webhook signature authenticity."""

    @abstractmethod
    def process_webhook(self, event_type: str, data: dict) -> dict:
        """Process a webhook event from the payment provider."""


# =============================================================================
# BENDO GATEWAY (PlacetoPay Infrastructure)
# =============================================================================


class BendoGateway(BasePaymentGateway):
    """
    Bendo.ec payment gateway — powered by PlacetoPay.
    API docs: https://placetopay.dev/
    Handles payment sessions, webhook verification, and subscription management.
    """

    def __init__(self):
        self.base_url = getattr(
            settings,
            "PAYMENT_GATEWAY_BASE_URL",
            "https://checkout.placetopay.com",
        )
        self.login = getattr(settings, "PAYMENT_GATEWAY_LOGIN", "")
        self.tran_key = getattr(settings, "PAYMENT_GATEWAY_TRAN_KEY", "")
        self.webhook_secret = getattr(
            settings, "PAYMENT_GATEWAY_WEBHOOK_SECRET", ""
        )

    def _check_credentials(self) -> None:
        """Verify gateway credentials are configured."""
        if not self.login or not self.tran_key:
            raise PaymentGatewayError(
                message="Payment gateway credentials not configured. "
                "Set PAYMENT_GATEWAY_LOGIN and PAYMENT_GATEWAY_TRAN_KEY.",
                code="GATEWAY_NOT_CONFIGURED",
            )

    def create_session(
        self,
        tenant_id: str,
        amount: str,
        currency: str,
        description: str,
        return_url: str,
        cancel_url: str,
        reference: str,
        buyer_email: str = "",
        buyer_name: str = "",
    ) -> PaymentSessionResult:
        """Create a PlacetoPay payment session."""
        self._check_credentials()
        # PlacetoPay API integration will be wired when credentials are obtained.
        # Structure follows: POST {base_url}/api/session
        logger.info(
            "BendoGateway.create_session: tenant=%s amount=%s ref=%s",
            tenant_id,
            amount,
            reference,
        )
        raise PaymentGatewayError(
            message="Bendo/PlacetoPay integration pending API credentials.",
            code="GATEWAY_PENDING_CREDENTIALS",
        )

    def check_session(self, session_id: str) -> PaymentStatusResult:
        """Check PlacetoPay session status."""
        self._check_credentials()
        logger.info("BendoGateway.check_session: session=%s", session_id)
        raise PaymentGatewayError(
            message="Bendo/PlacetoPay integration pending API credentials.",
            code="GATEWAY_PENDING_CREDENTIALS",
        )

    def cancel_subscription(self, subscription_id: str) -> dict:
        """Cancel a PlacetoPay recurring subscription."""
        self._check_credentials()
        logger.info(
            "BendoGateway.cancel_subscription: sub=%s", subscription_id
        )
        raise PaymentGatewayError(
            message="Bendo/PlacetoPay integration pending API credentials.",
            code="GATEWAY_PENDING_CREDENTIALS",
        )

    def verify_webhook(self, body: bytes, signature: str) -> bool:
        """Verify PlacetoPay webhook HMAC-SHA256 signature."""
        if not self.webhook_secret:
            logger.warning("Webhook secret not configured, rejecting.")
            return False
        expected = hmac.new(
            self.webhook_secret.encode(),
            body,
            hashlib.sha256,
        ).hexdigest()
        return hmac.compare_digest(expected, signature)

    def process_webhook(self, event_type: str, data: dict) -> dict:
        """Process a PlacetoPay webhook event."""
        logger.info("BendoGateway.process_webhook: event=%s", event_type)
        return {"status": "received", "event": event_type}


# =============================================================================
# MANUAL GATEWAY (Admin-Verified Payments)
# =============================================================================


class ManualGateway(BasePaymentGateway):
    """
    Manual payment verification gateway.
    Payments are confirmed by Super Admin via the dashboard.
    Used when no external payment provider is configured.
    """

    def create_session(self, **kwargs) -> PaymentSessionResult:
        """Manual payments do not create external sessions."""
        return PaymentSessionResult(
            session_id="manual",
            redirect_url="",
            status="pending_verification",
        )

    def check_session(self, session_id: str) -> PaymentStatusResult:
        """Manual sessions are always pending until admin confirms."""
        return PaymentStatusResult(
            session_id=session_id,
            status="pending_verification",
            amount="0.00",
            reference="",
            gateway_data={},
        )

    def cancel_subscription(self, subscription_id: str) -> dict:
        """Manual cancellation — just logs."""
        logger.info(
            "ManualGateway: subscription %s marked for cancellation",
            subscription_id,
        )
        return {"status": "canceled", "subscription_id": subscription_id}

    def verify_webhook(self, body: bytes, signature: str) -> bool:
        """Manual gateway does not use webhooks."""
        return False

    def process_webhook(self, event_type: str, data: dict) -> dict:
        """Manual gateway does not process webhooks."""
        return {"status": "not_applicable"}


# =============================================================================
# FACTORY
# =============================================================================

_GATEWAY_REGISTRY: dict[str, type[BasePaymentGateway]] = {
    "bendo": BendoGateway,
    "placetopay": BendoGateway,
    "manual": ManualGateway,
}

_gateway_instance: BasePaymentGateway | None = None


def get_payment_gateway() -> BasePaymentGateway:
    """
    Factory: return the configured payment gateway singleton.
    Provider is determined by settings.PAYMENT_GATEWAY_PROVIDER.
    """
    global _gateway_instance  # noqa: PLW0603
    if _gateway_instance is not None:
        return _gateway_instance

    provider = getattr(settings, "PAYMENT_GATEWAY_PROVIDER", "bendo")
    gateway_class = _GATEWAY_REGISTRY.get(provider)
    if gateway_class is None:
        logger.error("Unknown payment gateway provider: %s", provider)
        raise PaymentGatewayError(
            message=f"Unknown payment provider: '{provider}'. "
            f"Valid providers: {list(_GATEWAY_REGISTRY.keys())}",
            code="INVALID_PROVIDER",
        )

    _gateway_instance = gateway_class()
    logger.info("Payment gateway initialized: %s (%s)", provider, gateway_class.__name__)
    return _gateway_instance


def register_gateway(name: str, gateway_class: type[BasePaymentGateway]) -> None:
    """Register a custom payment gateway provider."""
    _GATEWAY_REGISTRY[name] = gateway_class
    logger.info("Custom payment gateway registered: %s", name)
