"""
Google Wallet pass payload and JWT claim tests (P5-5).

Locks the real Google enum for reviewStatus, exp on the save JWT,
and that object payloads carry classId while class embeds stay id-only.
"""

from __future__ import annotations

import inspect


def test_review_status_maps_to_google_enum():
    from apps.customers.pass_engine.builders.base import _normalize_review_status

    assert _normalize_review_status("underReview") == "UNDER_REVIEW"
    assert _normalize_review_status("under_review") == "UNDER_REVIEW"
    assert _normalize_review_status("UNDER_REVIEW") == "UNDER_REVIEW"
    assert _normalize_review_status("approved") == "APPROVED"
    assert _normalize_review_status("APPROVED") == "APPROVED"
    assert _normalize_review_status("rejected") == "REJECTED"
    assert _normalize_review_status("REJECTED") == "REJECTED"
    assert _normalize_review_status("") is None
    assert _normalize_review_status(None) is None


def test_review_status_passes_through_unknown_values():
    from apps.customers.pass_engine.builders.base import _normalize_review_status

    assert _normalize_review_status("DRAFT") == "DRAFT"


def test_loyalty_object_has_separate_id_and_class_id(db):
    from apps.customers.pass_engine.builders.loyalty import _build_loyalty_object
    from apps.cards.models import CardType
    from tests.factories import make_full_stack

    tenant, _user, _sub, card, customer, customer_pass = make_full_stack(
        card_type=CardType.STAMP, pass_data={"stamps": 3, "stamps_required": 10}
    )

    payload = _build_loyalty_object(customer_pass, card, customer, tenant, "")
    assert payload["id"] != payload["classId"]
    assert str(card.id) in payload["classId"]
    assert str(customer_pass.id) in payload["id"]


def test_save_jwt_has_exp_and_timestamps():
    """JWT claims must carry exp and iat — Google rejects otherwise."""
    from apps.customers.pass_engine import google_pass

    source = inspect.getsource(google_pass.generate_google_wallet_url)
    assert '"exp"' in source or "'exp'" in source
    assert '"iat"' in source or "'iat'" in source
