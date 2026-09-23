"""
Pass-schema mirror parity tests.

The frontend owns the canonical schema (limits + namespaced token dictionary).
This module proves the backend mirror agrees with the committed golden fixture
exported from the frontend, and that token resolution behaves identically.
"""

import json
import re
from pathlib import Path

# <root>/backend/tests/test_pass_schema.py -> <root>
GOLDEN = (
    Path(__file__).resolve().parents[2]
    / "frontend"
    / "src"
    / "components"
    / "wallet"
    / "types"
    / "__tests__"
    / "golden"
    / "pass-schema.json"
)

TOKEN_KEY_PATTERN = re.compile(r"^\{\{[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*\}\}$")


def test_schema_matches_frontend_golden():
    from apps.customers.pass_engine.schema import LIMITS, TOKENS

    fixture = json.loads(GOLDEN.read_text(encoding="utf-8"))
    assert LIMITS == fixture["limits"]
    assert TOKENS == fixture["tokens"]


def test_token_keys_are_namespaced_double_brace():
    from apps.customers.pass_engine.schema import TOKENS

    for key in TOKENS:
        assert key.startswith("{{") and key.endswith("}}")
        assert TOKEN_KEY_PATTERN.match(key), key
        body = key[2:-2]
        namespace, _, leaf = body.partition(".")
        assert namespace and leaf and "." not in leaf


def test_limits_expose_canonical_apple_counts():
    from apps.customers.pass_engine.schema import LIMITS

    assert LIMITS == {
        "headerFields": 3,
        "primaryFields": 1,
        "secondaryFields": 4,
        "auxiliaryFields": 4,
        "backFields": 8,
    }


def test_resolve_token_nested_and_flat():
    from apps.customers.pass_engine.schema import resolve_token

    assert resolve_token("{{customer.first_name}}", {"firstName": "Ana"}) == "Ana"
    assert (
        resolve_token("{{customer.first_name}}", {"customer": {"firstName": "Ana"}})
        == "Ana"
    )
    assert (
        resolve_token("{{customer.first_name}}", {"customer": {"first_name": "Ana"}})
        == "Ana"
    )
    assert resolve_token("{{customer.first_name}}", {"first_name": "Ana"}) == "Ana"
    assert resolve_token("{{nope.x}}", {}) == "{{nope.x}}"
    assert resolve_token("{{stamp.count}}", {"stamp": {"count": 7}}) == "7"


def test_resolve_token_prefers_nested_camel_then_snake():
    from apps.customers.pass_engine.schema import resolve_token

    ctx = {
        "customer": {"firstName": "NestedCamel", "first_name": "NestedSnake"},
        "firstName": "FlatCamel",
        "first_name": "FlatSnake",
    }
    assert resolve_token("{{customer.first_name}}", ctx) == "NestedCamel"

    ctx = {
        "customer": {"first_name": "NestedSnake"},
        "firstName": "FlatCamel",
        "first_name": "FlatSnake",
    }
    assert resolve_token("{{customer.first_name}}", ctx) == "NestedSnake"

    ctx = {"firstName": "FlatCamel", "first_name": "FlatSnake"}
    assert resolve_token("{{customer.first_name}}", ctx) == "FlatCamel"

    ctx = {"first_name": "FlatSnake"}
    assert resolve_token("{{customer.first_name}}", ctx) == "FlatSnake"


def test_resolve_token_ignores_inherited_and_non_dict_lookups():
    from apps.customers.pass_engine.schema import resolve_token

    assert resolve_token("{{customer.constructor}}", {}) == "{{customer.constructor}}"
    assert resolve_token("{{x.constructor}}", {}) == "{{x.constructor}}"
    assert resolve_token("{{customer.constructor}}", {"customer": {}}) == (
        "{{customer.constructor}}"
    )
    assert resolve_token("{{customer.toString}}", {"customer": {}}) == (
        "{{customer.toString}}"
    )


def test_resolve_token_coercion_matches_frontend_rule():
    from apps.customers.pass_engine.schema import resolve_token

    assert resolve_token("{{x.ok}}", {"ok": True}) == "true"
    assert resolve_token("{{x.ok}}", {"ok": False}) == "false"
    assert resolve_token("{{x.n}}", {"n": 1.0}) == "1"
    assert resolve_token("{{x.z}}", {"z": 0}) == "0"
    assert resolve_token("{{x.z}}", {"z": False}) == "false"
    assert resolve_token("{{x.half}}", {"half": 1.5}) == "1.5"
    assert resolve_token("{{x.neg0}}", {"neg0": -0.0}) == "0"
    assert resolve_token("{{x.neghalf}}", {"neghalf": -1.5}) == "-1.5"
    assert resolve_token("{{x.third}}", {"third": 1.0 / 3.0}) == "0.3333333333333333"
    assert resolve_token("{{x.s}}", {"s": ""}) == ""


def test_resolve_token_integer_valued_numbers_use_plain_digits():
    from apps.customers.pass_engine.schema import resolve_token

    assert resolve_token("{{x.e15}}", {"e15": 1e15}) == "1000000000000000"
    assert resolve_token("{{x.e16}}", {"e16": 1e16}) == "10000000000000000"
    assert resolve_token("{{x.e21}}", {"e21": 1e21}) == "1000000000000000000000"
    assert resolve_token("{{x.negE21}}", {"negE21": -1e21}) == "-1000000000000000000000"
    assert resolve_token("{{x.e20}}", {"e20": 1.5e20}) == "150000000000000000000"
    # Same IEEE double on both sides (JS Number is not an exact 64-bit int).
    assert resolve_token("{{x.big}}", {"big": 12345678901234567890.0}) == str(
        int(12345678901234567890.0)
    )


def test_resolve_token_plain_decimal_window_matches_frontend():
    from apps.customers.pass_engine.schema import resolve_token

    assert resolve_token("{{x.win4}}", {"win4": 0.0001}) == "0.0001"
    assert resolve_token("{{x.e5}}", {"e5": 0.00001}) == "{{x.e5}}"
    assert resolve_token("{{x.e6}}", {"e6": 0.000001}) == "{{x.e6}}"
    assert resolve_token("{{x.e7}}", {"e7": 1e-7}) == "{{x.e7}}"


def test_resolve_token_unresolved_leaf_types():
    from apps.customers.pass_engine.schema import resolve_token

    assert resolve_token("{{x.nil}}", {"nil": None}) == "{{x.nil}}"
    assert resolve_token("{{x.arr}}", {"arr": [1, 2]}) == "{{x.arr}}"
    assert resolve_token("{{x.obj}}", {"obj": {"a": 1}}) == "{{x.obj}}"
    assert resolve_token("{{x.nested}}", {"nested": {"a": {"b": 1}}}) == "{{x.nested}}"
    assert resolve_token("{{x.fn}}", {"fn": lambda: 1}) == "{{x.fn}}"
    assert resolve_token("{{x.nan}}", {"nan": float("nan")}) == "{{x.nan}}"
    assert resolve_token("{{x.inf}}", {"inf": float("inf")}) == "{{x.inf}}"
    assert resolve_token("{{x.ninf}}", {"ninf": float("-inf")}) == "{{x.ninf}}"


def test_resolve_token_rejects_malformed_braces():
    from apps.customers.pass_engine.schema import resolve_token

    assert resolve_token("{{customer.first_name}", {"firstName": "Ana"}) == (
        "{{customer.first_name}"
    )
    assert resolve_token("{customer.first_name}}", {"firstName": "Ana"}) == (
        "{customer.first_name}}"
    )
    assert resolve_token("customer.first_name", {"firstName": "Ana"}) == (
        "customer.first_name"
    )
    assert resolve_token("{{first_name}}", {"first_name": "Ana"}) == "{{first_name}}"


def test_resolve_template_substitutes_namespaced_tokens_only():
    from apps.customers.pass_engine.schema import resolve_template

    out = resolve_template(
        "Hi {{customer.first_name}}, you have {{stamp.count}} stamps",
        {"firstName": "Ana", "stamp": {"count": 7}},
    )
    assert out == "Hi Ana, you have 7 stamps"
    assert resolve_template("{{nope.nothing}}", {}) == "{{nope.nothing}}"
    assert resolve_template("Hello {name}", {"name": "Ana"}) == "Hello {name}"
    assert resolve_template("{{customer.name}} / {{customer.name}}", {"name": "Ana Smith"}) == (
        "Ana Smith / Ana Smith"
    )


def test_apple_v2_resolve_does_not_mangle_namespaced_tokens():
    from apps.customers.pass_engine.apple_v2_builders import _resolve_v2_dynamic_value

    ctx = {
        "customer_name": "Ana",
        "customer": {"name": "Ana Smith", "first_name": "Ana"},
        "stamp": {"count": 7},
    }
    assert _resolve_v2_dynamic_value("Hi {{customer.first_name}}!", ctx) == "Hi Ana!"
    assert _resolve_v2_dynamic_value("{{customer.name}}", ctx) == "Ana Smith"
    assert _resolve_v2_dynamic_value("You have {{stamp.count}} stamps", ctx) == (
        "You have 7 stamps"
    )
    assert _resolve_v2_dynamic_value("Hi {customer_name}!", ctx) == "Hi Ana!"
    assert _resolve_v2_dynamic_value("{{unknown.token}}", ctx) == "{{unknown.token}}"
    assert _resolve_v2_dynamic_value("{{customer.constructor}}", {}) == (
        "{{customer.constructor}}"
    )


def test_apple_v2_map_field_uses_namespaced_vocabulary():
    from apps.customers.pass_engine.apple_v2_builders import _map_v2_field_to_apple

    ctx = {"customer": {"name": "Ana Smith"}}
    field = {
        "id": "welcome",
        "label": "Hi",
        "value": "Hi {{customer.name}}!",
        "fieldGroup": "primary",
        "isDynamic": True,
        "dynamicTemplate": "{{customer.name}}",
    }
    mapped = _map_v2_field_to_apple(field, ctx)
    assert mapped["value"] == "Ana Smith"
    assert mapped["value"] != "}"
    assert mapped["value"] != ""
    assert mapped["value"] != "Hi }!"

    field2 = dict(field, isDynamic=False, dynamicTemplate=None)
    mapped2 = _map_v2_field_to_apple(field2, ctx)
    assert mapped2["value"] == "Hi Ana Smith!"


def test_google_v2_resolve_passes_unknown_tokens_through():
    from apps.customers.pass_engine.builders.base import _resolve_v2_dynamic_value

    class _Obj:
        pass

    card, customer_pass, customer, tenant = _Obj(), _Obj(), _Obj(), _Obj()
    card.name = "Round Trip"
    card.metadata = {}
    customer.first_name = "Ana"
    customer.last_name = "Smith"
    customer.email = "ana@example.com"
    customer.phone = ""
    customer.id = "12345678-xxxx"
    customer_pass.pass_data = {}
    customer_pass.stamp_count_val = 7
    customer_pass.cashback_balance_val = 0
    customer_pass.gift_balance_val = 0
    customer_pass.qr_code = "LOY-1"
    tenant.name = "Cafe Central"

    out = _resolve_v2_dynamic_value(
        "Hi {{customer.first_name}}! {{unknown.token}} {customer_name}",
        card,
        customer_pass,
        customer,
        tenant,
    )
    assert out == "Hi Ana! {{unknown.token}} Ana Smith"
    assert "Hi }!" not in out
    assert "{{unknown.token}}" in out
