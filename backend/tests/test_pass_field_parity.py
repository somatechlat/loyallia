"""
Pass field parity tests (Apple ↔ Google) and back-field merge de-duplication.

Locks that a WalletStudio V2 pass configured with custom (non well-known)
fields produces those fields in BOTH the Apple payload and the Google
payload, and that merging the two parallel back-field stores never
duplicates a field by label + value.
"""

from __future__ import annotations


def _v2_wallet_studio(fields: list, back_fields: list | None = None) -> dict:
    """Minimal realistic WalletStudio V2 metadata dict."""
    return {
        "version": 2,
        "id": "ws-parity-test",
        "name": "Parity Card",
        "cardType": "stamp",
        "industry": "retail",
        "colors": {
            "background": "#123456",
            "foreground": "#FFFFFF",
            "label": "#CCCCCC",
            "accent": "#FF5733",
        },
        "images": {},
        "fields": fields,
        "cardTypeConfig": {},
        "barcode": {"type": "qr_code", "altText": "Escanea"},
        "backContent": {"fields": back_fields or []},
        "apple": {"passType": "storeCard"},
        "google": {"passType": "loyalty", "programName": "Parity Card"},
        "ui": {},
    }


CUSTOM_FIELDS = [
    {
        "id": "custom_favorite",
        "label": "Color favorito",
        "value": "Azul",
        "fieldGroup": "secondaryFields",
        "order": 0,
        "showOnApple": True,
        "showOnGoogle": True,
        "isDynamic": False,
    },
    {
        "id": "custom_since",
        "label": "Cliente desde",
        "value": "2024",
        "fieldGroup": "auxiliaryFields",
        "order": 0,
        "showOnApple": True,
        "showOnGoogle": True,
        "isDynamic": False,
    },
]


def test_custom_fields_appear_in_apple_and_google_payloads(db):
    """Two custom fields must reach BOTH platforms — never silently dropped."""
    from apps.cards.models import CardType
    from apps.customers.pass_engine.apple_v2_builders import _build_v2_apple_fields
    from apps.customers.pass_engine.builders.loyalty import (
        _build_loyalty_class,
        _build_loyalty_object,
    )
    from tests.factories import make_full_stack

    tenant, _user, _sub, card, customer, customer_pass = make_full_stack(
        card_type=CardType.STAMP
    )
    card.metadata = {"wallet_studio": _v2_wallet_studio(CUSTOM_FIELDS)}
    card.save(update_fields=["metadata"])

    # ── Apple payload: every configured group is emitted ──
    apple_fields = _build_v2_apple_fields(card, customer_pass)
    secondary = {f["label"]: f["value"] for f in apple_fields["secondaryFields"]}
    auxiliary = {f["label"]: f["value"] for f in apple_fields["auxiliaryFields"]}
    assert secondary.get("Color favorito") == "Azul"
    assert auxiliary.get("Cliente desde") == "2024"

    # ── Google payload: values reach the object as text modules ──
    obj = _build_loyalty_object(customer_pass, card, customer, tenant, "")
    modules = {m.get("header"): m.get("body") for m in obj.get("textModulesData", [])}
    assert modules.get("Color favorito") == "Azul"
    assert modules.get("Cliente desde") == "2024"

    # ── Google payload: the fields are mapped to card rows as well ──
    klass = _build_loyalty_class(card, tenant, "")
    row_paths = _collect_field_paths(klass)
    assert "object.textModulesData['custom_favorite']" in row_paths
    assert "object.textModulesData['custom_since']" in row_paths


def _collect_field_paths(payload) -> set:
    """Collect every fieldPath referenced anywhere in a Google payload."""
    paths: set = set()
    if isinstance(payload, dict):
        if payload.get("fieldPath"):
            paths.add(payload["fieldPath"])
        for value in payload.values():
            paths |= _collect_field_paths(value)
    elif isinstance(payload, list):
        for item in payload:
            paths |= _collect_field_paths(item)
    return paths


def test_well_known_field_ids_keep_their_google_paths(db):
    """The hardcoded id → path map must keep working exactly as before."""
    from apps.customers.pass_engine.builders.base import (
        _derive_google_rows_from_fields,
    )

    fields = [
        {
            "id": "customer_name",
            "label": "Cliente",
            "value": "Jane Doe",
            "fieldGroup": "headerFields",
            "order": 0,
        },
        {
            "id": "custom_extra",
            "label": "Extra",
            "value": "Valor",
            "fieldGroup": "secondaryFields",
            "order": 0,
        },
    ]
    rows = _derive_google_rows_from_fields(fields)
    by_id = {row["id"]: row["items"][0] for row in rows}
    assert by_id["customer_name"]["fieldPath"] == "object.accountName"
    assert "value" not in by_id["customer_name"]
    assert by_id["custom_extra"]["fieldPath"] == "object.textModulesData['custom_extra']"
    assert by_id["custom_extra"]["value"] == "Valor"
    assert by_id["custom_extra"]["label"] == "Extra"


def test_custom_fields_hidden_on_google_stay_hidden(db):
    """showOnGoogle=False custom fields must not leak into the Google rows."""
    from apps.customers.pass_engine.builders.base import (
        _derive_google_rows_from_fields,
    )

    fields = [
        {
            "id": "custom_hidden",
            "label": "Oculto",
            "value": "x",
            "fieldGroup": "secondaryFields",
            "order": 0,
            "showOnApple": True,
            "showOnGoogle": False,
        },
    ]
    assert _derive_google_rows_from_fields(fields) == []


def test_back_field_merge_deduplicates_by_label_and_value(db):
    """The two parallel back-field stores must merge without duplicates."""
    from apps.cards.models import CardType
    from apps.customers.pass_engine.apple_v2_builders import _build_v2_apple_fields
    from tests.factories import make_full_stack

    fields = [
        {
            "id": "back_terms",
            "label": "Términos",
            "value": "Texto legal del programa.",
            "fieldGroup": "back",
            "order": 0,
            "showOnApple": True,
            "showOnGoogle": True,
            "isDynamic": False,
        }
    ]
    back_fields = [
        {
            "id": "terms_dup",
            "label": "Términos",
            "value": "Texto legal del programa.",
            "isLink": False,
        },
        {
            "id": "rules",
            "label": "Reglas",
            "value": "Otras reglas del programa.",
            "isLink": False,
        },
    ]

    tenant, _user, _sub, card, customer, customer_pass = make_full_stack(
        card_type=CardType.STAMP
    )
    card.metadata = {
        "wallet_studio": _v2_wallet_studio(fields, back_fields=back_fields)
    }
    card.save(update_fields=["metadata"])

    apple_fields = _build_v2_apple_fields(card, customer_pass)
    back = apple_fields["backFields"]
    labels_values = [(f["label"], f["value"]) for f in back]
    assert labels_values.count(("Términos", "Texto legal del programa.")) == 1
    assert ("Reglas", "Otras reglas del programa.") in labels_values
    assert len(back) == 2
