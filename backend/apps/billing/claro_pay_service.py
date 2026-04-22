"""
Loyallia — Claro Pay Ecuador Payment Gateway Service.
Handles: card tokenization, subscription charges, recurring billing, webhooks.

Claro Pay provides carrier-backed payment processing for Ecuador.
All sensitive card data is tokenized — we never store raw card numbers.

Gateway endpoints:
  UAT:  configured via CLARO_PAY_BASE_URL setting
  PROD: configured via CLARO_PAY_BASE_URL setting
"""
import hashlib
import hmac
import logging
import uuid
from datetime import timedelta
from decimal import Decimal

import httpx
from django.conf import settings
from django.db import transaction
from django.utils import timezone

from apps.billing.models import (
    Invoice,
    PaymentMethod,
    Subscription,
    SubscriptionStatus,
)
from apps.tenants.models import Tenant

logger = logging.getLogger("loyallia.billing")


class ClaroPayError(Exception):
    """Raised when Claro Pay returns an error or the request fails."""

    def __init__(self, message: str, code: str = "", raw_response: dict | None = None):
        self.message = message
        self.code = code
        self.raw_response = raw_response or {}
        super().__init__(self.message)


class ClaroPayService:
    """
    Production-grade Claro Pay gateway client for Ecuador.
    All amounts in USD. Tax rate: 15% IVA (Ecuador 2026).
    """

    def __init__(self):
        self.base_url = settings.CLARO_PAY_BASE_URL
        self.merchant_id = settings.CLARO_PAY_MERCHANT_ID
        self.api_key = settings.CLARO_PAY_API_KEY
        self.api_secret = settings.CLARO_PAY_API_SECRET
        self.webhook_secret = settings.CLARO_PAY_WEBHOOK_SECRET
        self.timeout = 30  # seconds

    # =========================================================================
    # HTTP Client
    # =========================================================================
    def _get_headers(self) -> dict:
        """Standard headers for all Claro Pay API requests."""
        return {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "X-Merchant-Id": self.merchant_id,
            "Authorization": f"Bearer {self.api_key}",
        }

    def _request(self, method: str, endpoint: str, payload: dict | None = None) -> dict:
        """Execute an HTTP request against the Claro Pay API."""
        url = f"{self.base_url}{endpoint}"
        headers = self._get_headers()

        try:
            with httpx.Client(timeout=self.timeout) as client:
                response = client.request(
                    method=method,
                    url=url,
                    headers=headers,
                    json=payload,
                )

            if response.status_code >= 400:
                error_data = response.json() if response.content else {}
                error_msg = error_data.get("message", response.text)
                error_code = error_data.get("code", str(response.status_code))
                logger.error(
                    "Claro Pay API error: %s %s → %s %s",
                    method, endpoint, response.status_code, error_msg,
                )
                raise ClaroPayError(
                    message=error_msg,
                    code=error_code,
                    raw_response=error_data,
                )

            return response.json() if response.content else {}

        except httpx.TimeoutException:
            logger.error("Claro Pay timeout: %s %s", method, endpoint)
            raise ClaroPayError(
                message="Tiempo de espera agotado con Claro Pay",
                code="TIMEOUT",
            )
        except httpx.RequestError as exc:
            logger.error("Claro Pay connection error: %s", str(exc))
            raise ClaroPayError(
                message="Error de conexión con Claro Pay",
                code="CONNECTION_ERROR",
            )

    # =========================================================================
    # Card Tokenization
    # =========================================================================
    def tokenize_card(
        self,
        card_number: str,
        exp_month: int,
        exp_year: int,
        cvv: str,
        cardholder_name: str,
    ) -> dict:
        """
        Tokenize a card through Claro Pay's vault.
        Returns: {"token": "...", "brand": "VISA", "last_four": "1234"}

        In production, frontend uses Claro Pay's JS SDK to tokenize
        client-side. This method is for server-side fallback or testing.
        """
        payload = {
            "card": {
                "number": card_number,
                "expiryMonth": f"{exp_month:02d}",
                "expiryYear": str(exp_year),
                "cvv": cvv,
                "holderName": cardholder_name,
            },
            "merchantId": self.merchant_id,
        }
        result = self._request("POST", "/v1/tokens/card", payload)
        return {
            "token": result.get("token", ""),
            "brand": result.get("cardBrand", ""),
            "last_four": result.get("lastFourDigits", ""),
        }

    # =========================================================================
    # Customer Management
    # =========================================================================
    def create_customer(self, tenant: Tenant) -> str:
        """
        Create a customer profile in Claro Pay for the tenant.
        Returns: Claro Pay customer ID.
        """
        payload = {
            "externalId": str(tenant.id),
            "name": tenant.name,
            "email": tenant.owner_email if hasattr(tenant, "owner_email") else "",
            "country": "EC",
            "currency": "USD",
        }
        result = self._request("POST", "/v1/customers", payload)
        customer_id = result.get("customerId", "")
        logger.info(
            "Created Claro Pay customer %s for tenant %s",
            customer_id, tenant.slug,
        )
        return customer_id

    # =========================================================================
    # Subscription / Recurring Charges
    # =========================================================================
    def create_subscription(
        self,
        customer_id: str,
        card_token: str,
        plan_amount: Decimal,
        tax_amount: Decimal,
        billing_cycle: str = "monthly",
    ) -> dict:
        """
        Create a recurring subscription charge in Claro Pay.
        Returns: {"subscriptionId": "...", "status": "active", "nextChargeDate": "..."}
        """
        period = "MONTHLY" if billing_cycle == "monthly" else "ANNUAL"
        total = plan_amount + tax_amount

        payload = {
            "customerId": customer_id,
            "token": card_token,
            "planAmount": float(plan_amount),
            "taxAmount": float(tax_amount),
            "totalAmount": float(total),
            "currency": "USD",
            "periodicity": period,
            "description": f"Loyallia FULL — Suscripción {period.lower()}",
            "startDate": timezone.now().strftime("%Y-%m-%d"),
            "metadata": {
                "platform": "loyallia",
                "plan": "full",
            },
        }
        result = self._request("POST", "/v1/subscriptions", payload)
        logger.info(
            "Created subscription %s for customer %s",
            result.get("subscriptionId"), customer_id,
        )
        return result

    def cancel_subscription(self, subscription_id: str) -> dict:
        """Cancel a recurring subscription in Claro Pay."""
        result = self._request(
            "POST",
            f"/v1/subscriptions/{subscription_id}/cancel",
        )
        logger.info("Canceled subscription %s", subscription_id)
        return result

    # =========================================================================
    # One-time Charges
    # =========================================================================
    def charge(
        self,
        customer_id: str,
        card_token: str,
        amount: Decimal,
        tax_amount: Decimal,
        description: str,
        idempotency_key: str | None = None,
    ) -> dict:
        """
        Execute a one-time charge against a tokenized card.
        Returns: {"chargeId": "...", "status": "approved", "authorizationCode": "..."}
        """
        total = amount + tax_amount
        payload = {
            "customerId": customer_id,
            "token": card_token,
            "amount": float(amount),
            "taxAmount": float(tax_amount),
            "totalAmount": float(total),
            "currency": "USD",
            "description": description,
            "idempotencyKey": idempotency_key or str(uuid.uuid4()),
        }
        result = self._request("POST", "/v1/charges", payload)
        return result

    # =========================================================================
    # Webhook Verification
    # =========================================================================
    def verify_webhook_signature(self, payload_body: bytes, signature: str) -> bool:
        """
        Verify HMAC-SHA256 signature from Claro Pay webhook.
        """
        expected = hmac.new(
            self.webhook_secret.encode("utf-8"),
            payload_body,
            hashlib.sha256,
        ).hexdigest()
        return hmac.compare_digest(expected, signature)

    # =========================================================================
    # High-Level Business Operations
    # =========================================================================
    @transaction.atomic
    def subscribe_tenant(
        self,
        tenant: Tenant,
        card_token: str,
        card_brand: str = "",
        card_last_four: str = "",
        card_exp_month: int | None = None,
        card_exp_year: int | None = None,
        cardholder_name: str = "",
        billing_cycle: str = "monthly",
    ) -> Subscription:
        """
        Full tenant subscription flow:
        1. Create/get Claro Pay customer
        2. Store payment method
        3. Create recurring subscription
        4. Update local Subscription model
        5. Generate first invoice
        """
        subscription = Subscription.objects.select_for_update().get(tenant=tenant)

        # Step 1: Ensure Claro Pay customer exists
        if not subscription.claro_pay_customer_id:
            customer_id = self.create_customer(tenant)
            subscription.claro_pay_customer_id = customer_id
            subscription.save(update_fields=["claro_pay_customer_id"])
        else:
            customer_id = subscription.claro_pay_customer_id

        # Step 2: Store payment method
        PaymentMethod.objects.filter(
            tenant=tenant, is_default=True
        ).update(is_default=False)

        PaymentMethod.objects.create(
            tenant=tenant,
            claro_pay_token=card_token,
            card_brand=card_brand,
            card_last_four=card_last_four,
            card_exp_month=card_exp_month,
            card_exp_year=card_exp_year,
            cardholder_name=cardholder_name,
            is_default=True,
        )

        # Step 3: Calculate amounts
        subtotal = Decimal(settings.PLAN_FULL_PRICE_USD)
        tax_rate = Decimal(str(settings.TAX_RATE_ECUADOR))
        tax_amount = (subtotal * tax_rate).quantize(Decimal("0.01"))

        if billing_cycle == "annual":
            # Annual discount: 2 months free
            subtotal = (subtotal * 10).quantize(Decimal("0.01"))
            tax_amount = (subtotal * tax_rate).quantize(Decimal("0.01"))

        # Step 4: Create subscription in Claro Pay
        cp_result = self.create_subscription(
            customer_id=customer_id,
            card_token=card_token,
            plan_amount=subtotal,
            tax_amount=tax_amount,
            billing_cycle=billing_cycle,
        )

        # Step 5: Update local subscription
        claro_sub_id = cp_result.get("subscriptionId", "")
        subscription.billing_cycle = billing_cycle
        subscription.activate_paid(claro_sub_id)

        # Step 6: Create first invoice
        invoice = Invoice(
            tenant=tenant,
            subscription=subscription,
            invoice_number=Invoice.generate_invoice_number(tenant),
            subtotal=subtotal,
            tax_rate=tax_rate,
            tax_amount=tax_amount,
            total=subtotal + tax_amount,
            period_start=subscription.current_period_start,
            period_end=subscription.current_period_end,
        )
        invoice.mark_paid(cp_result.get("chargeId", claro_sub_id))

        logger.info(
            "Tenant %s subscribed via Claro Pay: sub_id=%s, invoice=%s",
            tenant.slug, claro_sub_id, invoice.invoice_number,
        )

        return subscription

    def process_webhook_event(self, event_type: str, event_data: dict) -> None:
        """
        Process Claro Pay webhook events:
          - payment.success → mark invoice paid, reset failure count
          - payment.failed → record failure, suspend after 3
          - subscription.canceled → execute cancellation
        """
        subscription_id = event_data.get("subscriptionId", "")
        charge_id = event_data.get("chargeId", "")

        if not subscription_id:
            logger.warning("Webhook missing subscriptionId: %s", event_type)
            return

        try:
            subscription = Subscription.objects.get(
                claro_pay_subscription_id=subscription_id,
            )
        except Subscription.DoesNotExist:
            logger.error(
                "Webhook for unknown subscription: %s", subscription_id,
            )
            return

        if event_type == "payment.success":
            subscription.failed_payment_count = 0
            subscription.last_payment_error = ""
            subscription.last_payment_at = timezone.now()
            subscription.status = SubscriptionStatus.ACTIVE
            subscription.save(update_fields=[
                "failed_payment_count", "last_payment_error",
                "last_payment_at", "status", "updated_at",
            ])

            # Create invoice for this period
            invoice = Invoice(
                tenant=subscription.tenant,
                subscription=subscription,
                invoice_number=Invoice.generate_invoice_number(subscription.tenant),
                subtotal=Decimal(str(event_data.get("amount", "0"))),
                tax_amount=Decimal(str(event_data.get("taxAmount", "0"))),
                total=Decimal(str(event_data.get("totalAmount", "0"))),
                period_start=subscription.current_period_start or timezone.now(),
                period_end=subscription.current_period_end or timezone.now() + timedelta(days=30),
            )
            invoice.calculate_amounts()
            invoice.mark_paid(charge_id)

            logger.info(
                "Payment success for tenant %s: invoice %s",
                subscription.tenant.slug, invoice.invoice_number,
            )

        elif event_type == "payment.failed":
            error_msg = event_data.get("errorMessage", "Pago rechazado por Claro Pay")
            subscription.record_payment_failure(error_msg)
            logger.warning(
                "Payment failed for tenant %s (%d/3): %s",
                subscription.tenant.slug,
                subscription.failed_payment_count,
                error_msg,
            )

        elif event_type == "subscription.canceled":
            subscription.execute_cancellation()
            logger.info(
                "Subscription canceled for tenant %s", subscription.tenant.slug,
            )

        else:
            logger.info("Unhandled webhook event: %s", event_type)


# Singleton service instance
claro_pay_service = ClaroPayService()
