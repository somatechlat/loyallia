"""
Loyallia Billing Constants (apps/billing/constants.py)

Plan feature flags and trial limit defaults.
"""

# SEC: Trial tenants get generous but finite limits — not infinity (C4/H4).
TRIAL_LIMITS = {
    "customers": 500,
    "programs": 50,
    "locations": 10,
    "users": 10,
    "notifications_month": 1000,
    "transactions_month": 5000,
    "whatsapp_day": 100,
    "emails_month": 500,
    "sms_day": 50,
    "wallet_pushes_month": 200,
    "automations": 10,
    "automation_executions_day": 100,
    "ai_queries_month": 500,
    "api_calls_day": 1000,
    "exports_month": 10,
    "wallet_templates": 5,
    "wallet_pass_updates_month": 50,
    "wallet_ai_designs_month": 20,
}


class PlanFeature:
    """Feature flags for plan-based gating.
    Stored in SubscriptionPlan.features JSONField as a list of strings.
    """

    GEO_FENCING = "geo_fencing"
    AUTOMATION = "automation"
    ADVANCED_ANALYTICS = "advanced_analytics"
    AI_ASSISTANT = "ai_assistant"
    AGENT_API = "agent_api"
    PRIORITY_SUPPORT = "priority_support"
    CUSTOM_BRANDING = "custom_branding"
    DATA_EXPORT = "data_export"
    WHATSAPP_CAMPAIGNS = "whatsapp_campaigns"
    EMAIL_CAMPAIGNS = "email_campaigns"
    WALLET_CAMPAIGNS = "wallet_campaigns"
    SMS_CAMPAIGNS = "sms_campaigns"
    WALLET_PASS_STUDIO = "wallet_pass_studio"
    WALLET_CUSTOM_TEMPLATES = "wallet_custom_templates"
    WALLET_ADVANCED_FIELDS = "wallet_advanced_fields"

    ALL_FEATURES = [
        GEO_FENCING,
        AUTOMATION,
        ADVANCED_ANALYTICS,
        AI_ASSISTANT,
        AGENT_API,
        PRIORITY_SUPPORT,
        CUSTOM_BRANDING,
        DATA_EXPORT,
        WHATSAPP_CAMPAIGNS,
        EMAIL_CAMPAIGNS,
        WALLET_CAMPAIGNS,
        SMS_CAMPAIGNS,
        WALLET_PASS_STUDIO,
        WALLET_CUSTOM_TEMPLATES,
        WALLET_ADVANCED_FIELDS,
    ]
