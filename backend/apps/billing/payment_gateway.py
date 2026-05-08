"""
Loyallia — Payment Gateway Abstraction (LYL-FR-PAY-010)
Pluggable payment gateway interface. Supports multiple providers via factory.
Default provider: Manual (admin-verified payments).

Providers are selected via settings.PAYMENT_GATEWAY_PROVIDER:
  - "manual"   → ManualGateway (admin-verified payments)
  - "disabled" → DisabledGateway (billing collection unavailable)
"""

from __future__ import annotations

import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any, NoReturn

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
# MANUAL GATEWAY (Admin-Verified Payments)
# =============================================================================


class ManualGateway(BasePaymentGateway):
    """
    Manual payment verification gateway.
    Payments are confirmed by Super Admin via the dashboard.
    Used when no external payment provider is configured.
    """

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


class DisabledGateway(BasePaymentGateway):
    """Gateway used when payment collection is explicitly disabled."""

    def _raise_disabled(self) -> NoReturn:
        raise PaymentGatewayError(
            message="Payment gateway is disabled by platform configuration.",
            code="GATEWAY_DISABLED",
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
        self._raise_disabled()

    def check_session(self, session_id: str) -> PaymentStatusResult:
        self._raise_disabled()

    def cancel_subscription(self, subscription_id: str) -> dict:
        return {"status": "disabled", "subscription_id": subscription_id}

    def verify_webhook(self, body: bytes, signature: str) -> bool:
        return False

    def process_webhook(self, event_type: str, data: dict) -> dict:
        return {"status": "disabled"}


# =============================================================================
# FACTORY
# =============================================================================

_GATEWAY_REGISTRY: dict[str, type[BasePaymentGateway]] = {
    "manual": ManualGateway,
    "disabled": DisabledGateway,
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

    if not getattr(settings, "PAYMENT_GATEWAY_ENABLED", False):
        provider = "disabled"
    else:
        provider = getattr(settings, "PAYMENT_GATEWAY_PROVIDER", "manual")
    gateway_class = _GATEWAY_REGISTRY.get(provider)
    if gateway_class is None:
        logger.error("Unknown payment gateway provider: %s", provider)
        raise PaymentGatewayError(
            message=f"Unknown payment provider: '{provider}'. "
            f"Valid providers: {list(_GATEWAY_REGISTRY.keys())}",
            code="INVALID_PROVIDER",
        )

    _gateway_instance = gateway_class()
    logger.info(
        "Payment gateway initialized: %s (%s)", provider, gateway_class.__name__
    )
    return _gateway_instance


def register_gateway(name: str, gateway_class: type[BasePaymentGateway]) -> None:
    """Register a custom payment gateway provider."""
    _GATEWAY_REGISTRY[name] = gateway_class
    logger.info("Custom payment gateway registered: %s", name)
