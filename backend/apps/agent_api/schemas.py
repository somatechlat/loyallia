"""
Loyallia — Agent API Response Schemas (Django Ninja / Pydantic)
Typed response models for serialization performance at scale.
"""

from ninja import Schema


class TenantContextSchema(Schema):
    """Tenant identification."""
    id: str
    name: str
    slug: str
    industry: str
    country: str


class PlanContextSchema(Schema):
    """Active plan details."""
    name: str
    slug: str
    features: list[str]
    is_active: bool


class CapabilitiesSchema(Schema):
    """Agent capabilities."""
    can_read_customers_summary: bool = True
    can_read_programs: bool = True
    can_read_analytics: bool = True
    can_read_transactions: bool = True
    can_write: bool = False


class ContextResponseSchema(Schema):
    """Full agent context response."""
    tenant: TenantContextSchema
    plan: PlanContextSchema
    capabilities: CapabilitiesSchema


class CustomersSummarySchema(Schema):
    """Aggregated customer summary — no PII."""
    total_customers: int
    active_customers: int
    inactive_customers: int
    vip_customers: int
    data_privacy: str = "No PII exposed — aggregated counts only."


class ProgramSchema(Schema):
    """Single program with stats."""
    id: str
    name: str
    card_type: str
    is_active: bool
    enrollments: int
    active_passes: int
    total_transactions: int
    created_at: str


class ProgramsResponseSchema(Schema):
    """All programs response."""
    total_programs: int
    programs: list[ProgramSchema]


class AnalyticsOverviewSchema(Schema):
    """Revenue and retention metrics."""
    total_customers: int
    monthly_transactions: int
    returning_customers: int
    retention_rate_pct: float
    month: str


class TransactionSchema(Schema):
    """Single anonymized transaction."""
    id: str
    type: str
    program: str | None = None
    metadata: dict = {}
    created_at: str


class TransactionsResponseSchema(Schema):
    """Recent transactions response."""
    count: int
    transactions: list[TransactionSchema]
    data_privacy: str = "Customer PII redacted — transaction metadata only."
