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
    from apps.cards.models import CardType
    from apps.customers.pass_engine.builders.loyalty import _build_loyalty_object
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


def _decode_save_jwt(save_url: str) -> dict:
    import base64
    import json

    token = save_url.rsplit("/", 1)[-1]
    payload_b64 = token.split(".")[1]
    payload_b64 += "=" * (-len(payload_b64) % 4)
    return json.loads(base64.urlsafe_b64decode(payload_b64))


def test_save_jwt_embeds_class_on_create(db):
    from unittest import mock

    from apps.cards.models import CardType
    from apps.customers.pass_engine import google_pass
    from tests.factories import make_full_stack

    tenant, _user, _sub, card, customer, customer_pass = make_full_stack(
        card_type=CardType.STAMP, pass_data={"stamps": 1, "stamps_required": 5}
    )
    sa = {
        "client_email": "svc@test.iam.gserviceaccount.com",
        "private_key": _test_rsa_key(),
    }

    with mock.patch.object(
        google_pass, "_load_service_account", return_value=sa
    ), mock.patch.object(google_pass, "_get_issuer_id", return_value="issuer-1"):
        url = google_pass.generate_google_wallet_url(
            customer_pass, base_url="https://app.test"
        )

    claims = _decode_save_jwt(url)
    payload = claims["payload"]
    assert any(k.endswith("Classes") for k in payload)
    assert any(k.endswith("Objects") for k in payload)


def test_save_jwt_omits_class_on_update(db):
    """Once google_pass_id exists the class is already in Google — JWT embeds only the object."""
    from unittest import mock

    from apps.cards.models import CardType
    from apps.customers.pass_engine import google_pass
    from tests.factories import make_full_stack

    tenant, _user, _sub, card, customer, customer_pass = make_full_stack(
        card_type=CardType.STAMP, pass_data={"stamps": 2, "stamps_required": 5}
    )
    customer_pass.google_pass_id = "issuer-1.loyallia-pass-existing"
    customer_pass.save(update_fields=["google_pass_id"])
    sa = {
        "client_email": "svc@test.iam.gserviceaccount.com",
        "private_key": _test_rsa_key(),
    }

    with mock.patch.object(
        google_pass, "_load_service_account", return_value=sa
    ), mock.patch.object(google_pass, "_get_issuer_id", return_value="issuer-1"):
        url = google_pass.generate_google_wallet_url(
            customer_pass, base_url="https://app.test"
        )

    payload = _decode_save_jwt(url)["payload"]
    assert any(k.endswith("Objects") for k in payload)
    assert not any(k.endswith("Classes") for k in payload)


def _test_rsa_key() -> str:
    from cryptography.hazmat.primitives import serialization
    from cryptography.hazmat.primitives.asymmetric import rsa

    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    return key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    ).decode()
