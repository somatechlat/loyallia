"""
Loyallia Redemption Engine Models

Currently uses additive fields on existing models (Transaction, CustomerPass, Card).
Future versions may introduce standalone RedemptionRule models.
"""

# This app does not define standalone models.
# All model changes are additive fields on existing models:
#   - Transaction.idempotency_key
#   - Transaction.denial_reason
#   - Transaction.rules_evaluated
#   - CustomerPass.lifecycle_state
#   - CustomerPass.coupon_redemption_count
#   - CustomerPass.last_redemption_at
#   - CustomerPass.pending_rewards
#   - Card.redemption_rules
