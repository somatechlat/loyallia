"""
Loyallia — Audit API Response Schemas (Django Ninja / Pydantic)
Typed response models for audit log endpoints.
"""

from ninja import Schema


class AuditEntrySchema(Schema):
    """Single audit log entry."""
    id: str
    actor_email: str
    actor_role: str
    action: str
    resource_type: str
    resource_id: str
    tenant_id: str | None = None
    ip_address: str | None = None
    justification: str = ""
    status: str
    details: dict = {}
    created_at: str


class AuditEntryDetailSchema(AuditEntrySchema):
    """Full audit entry with user agent."""
    actor_id: str
    user_agent: str = ""


class AuditListResponseSchema(Schema):
    """Paginated audit log response."""
    total: int
    count: int
    entries: list[AuditEntrySchema]


class ActionBreakdownSchema(Schema):
    """Action type with count."""
    action: str
    count: int


class ActorBreakdownSchema(Schema):
    """Actor email with activity count."""
    actor_email: str
    count: int


class AuditStatsSchema(Schema):
    """Aggregated audit statistics."""
    total_entries: int
    today_entries: int
    actions: list[ActionBreakdownSchema]
    top_actors: list[ActorBreakdownSchema]
