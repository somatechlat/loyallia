"""
Loyallia — Billing API Schemas (Pydantic models)
"""

from pydantic import BaseModel


class SubscribeSchema(BaseModel):
    """Input for subscribing a tenant to the FULL plan."""

    card_token: str
    card_brand: str = ""
    card_last_four: str = ""
    card_exp_month: int | None = None
    card_exp_year: int | None = None
    cardholder_name: str = ""
    billing_cycle: str = "monthly"


class UpdateSubscriptionSchema(BaseModel):
    billing_cycle: str | None = None
    cancel_at_period_end: bool | None = None


class AddPaymentMethodSchema(BaseModel):
    claro_pay_token: str
    card_brand: str = ""
    card_last_four: str = ""
    card_exp_month: int | None = None
    card_exp_year: int | None = None
    cardholder_name: str = ""
    is_default: bool = False
