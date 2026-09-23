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
    assert resolve_token("{{x.nil}}", {"nil": None}) == "{{x.nil}}"
    assert resolve_token("{{x.arr}}", {"arr": [1, 2]}) == "{{x.arr}}"
    assert resolve_token("{{x.obj}}", {"obj": {"a": 1}}) == "{{x.obj}}"


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


