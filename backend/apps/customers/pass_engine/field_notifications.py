"""
Loyallia Field-Level Wallet Notifications.

When a pass state mutation changes the resolved value of a WalletStudio V2
field, each platform reacts differently:

  - Apple: PassKit compares the old and new `pass.json`. For every field whose
    **value** changed AND whose `changeMessage` is set, iOS shows that message.
    The `changeMessage` itself is written by `_map_v2_field_to_apple` from
    `field["notifications"]["appleChangeMessage"]` — this module never writes
    it and never needs a second Apple call beyond the silent push the caller
    already sent.

  - Google: `addMessage` is the only user-visible channel. When the field's
    `googleMessage` is enabled with `trigger == "onChange"`, we emit a real
    TEXT_AND_NOTIFY message with `%@` / `{value}` substituted to the new value.

Called by: redemption / transaction flows after they mutate pass state.
"""

import logging

from apps.customers.pass_engine.apple_v2_builders import (
    _build_v2_template_context,
    _get_wallet_studio,
    _resolve_v2_dynamic_value,
)
from apps.customers.pass_engine.notify import (
    EVENT_VALUE_CHANGED,
    notify_event,
    resolve_field_notification_settings,
)

logger = logging.getLogger(__name__)

# Trigger values accepted on googleMessage.trigger (protocol values).
TRIGGER_ON_CHANGE = "onChange"
TRIGGER_SCHEDULED = "scheduled"
TRIGGER_BEFORE_EXPIRY = "beforeExpiry"

# Machine-readable skip codes (not user-facing copy).
SKIP_FIELD_NOT_FOUND = "field_not_found"
SKIP_VALUE_UNCHANGED = "value_unchanged"
SKIP_GOOGLE_DISABLED = "google_disabled"
SKIP_TRIGGER_MISMATCH = "trigger_mismatch"


def snapshot_field_values(card, customer_pass) -> dict[str, str]:
    """Resolve every visible studio field to its current display value.

    Used as the "before" half of a change diff: capture this, mutate pass
    state, then call `compute_changed_field_ids` with the snapshot.

    Args:
        card: Card holding `metadata["wallet_studio"]["fields"]`.
        customer_pass: CustomerPass whose state feeds the template context.

    Returns:
        `{field_id: resolved_value}` for every field that resolves to a string.
    """
    wallet_studio = _get_wallet_studio(card)
    fields = wallet_studio.get("fields")
    if not fields or not isinstance(fields, list):
        return {}

    context = _build_v2_template_context(card, customer_pass)
    values: dict[str, str] = {}
    for field in fields:
        if not isinstance(field, dict):
            continue
        field_id = field.get("id")
        if not field_id:
            continue
        raw = field.get("value", "")
        if field.get("isDynamic", False):
            template = field.get("dynamicTemplate") or raw
            resolved = _resolve_v2_dynamic_value(template, context)
        else:
            resolved = _resolve_v2_dynamic_value(raw, context)
        values[str(field_id)] = resolved if isinstance(resolved, str) else str(resolved)
    return values


def compute_changed_field_ids(
    card, customer_pass, previous_values: dict[str, str] | None = None
) -> dict[str, tuple[str, str]]:
    """Diff resolved field values against a pre-mutation snapshot.

    Re-resolves the V2 template context against the **current** pass state and
    compares it with `previous_values`. When no snapshot is supplied, an
    in-memory snapshot stashed on the pass instance
    (`customer_pass._notification_field_snapshot`) is used if present.

    Args:
        card: Card holding the studio field definitions.
        customer_pass: CustomerPass after the state mutation.
        previous_values: `{field_id: old_value}` from `snapshot_field_values`.

    Returns:
        `{field_id: (old_value, new_value)}` for fields whose resolved value
        actually changed. Unchanged and unresolvable fields are omitted.
    """
    current_values = snapshot_field_values(card, customer_pass)

    if previous_values is None:
        previous_values = getattr(
            customer_pass, "_notification_field_snapshot", None
        ) or {}

    changed: dict[str, tuple[str, str]] = {}
    for field_id, new_value in current_values.items():
        old_value = previous_values.get(field_id)
        if old_value is None:
            continue
        if old_value != new_value:
            changed[field_id] = (old_value, new_value)
    return changed


def _substitute_value(template: str, new_value: str) -> str:
    """Replace Apple-style `%@` and schema-style `{value}` with the new value."""
    if not template:
        return ""
    result = template.replace("%@", new_value)
    result = result.replace("{value}", new_value)
    return result


def emit_field_change_notifications(
    pass_obj, changed_field_ids: list[str], previous_values: dict[str, str]
) -> dict:
    """Emit Google addMessage pushes for fields that changed value.

    For each changed field id, when `googleMessage.enabled` is true and
    `trigger == "onChange"`, a `notify_event(..., event="value_changed")` call
    sends the real Google text with `%@` / `{value}` substituted to the new
    value.

    Apple needs NO extra call here: the silent push already sent by the caller
    makes PassKit diff old vs new `pass.json` and fire each field's
    `changeMessage` (configured via `notifications.appleChangeMessage` and
    written into the pass by `_map_v2_field_to_apple`).

    Args:
        pass_obj: CustomerPass whose fields changed.
        changed_field_ids: Studio field ids whose resolved value changed.
        previous_values: `{field_id: old_value}` used to confirm the change and
            for logging; the new value is re-resolved from current state.

    Returns:
        {"emitted": int, "skipped": list[dict], "results": list[dict]}
    """
    card = pass_obj.card
    context = _build_v2_template_context(card, pass_obj)
    wallet_studio = _get_wallet_studio(card)
    fields_by_id = {
        str(f.get("id")): f
        for f in (wallet_studio.get("fields") or [])
        if isinstance(f, dict) and f.get("id")
    }

    emitted = 0
    skipped: list[dict] = []
    results: list[dict] = []

    for field_id in changed_field_ids:
        field = fields_by_id.get(str(field_id))
        if field is None:
            skipped.append({"field_id": field_id, "reason": SKIP_FIELD_NOT_FOUND})
            continue

        old_value = previous_values.get(str(field_id), "")
        raw = field.get("value", "")
        if field.get("isDynamic", False):
            template = field.get("dynamicTemplate") or raw
            new_value = _resolve_v2_dynamic_value(template, context)
        else:
            new_value = _resolve_v2_dynamic_value(raw, context)
        new_value = new_value if isinstance(new_value, str) else str(new_value)

        if old_value == new_value:
            skipped.append({"field_id": field_id, "reason": SKIP_VALUE_UNCHANGED})
            continue

        settings = resolve_field_notification_settings(card, str(field_id))
        google_cfg = settings.get("googleMessage") or {}

        if not google_cfg.get("enabled"):
            skipped.append({"field_id": field_id, "reason": SKIP_GOOGLE_DISABLED})
            continue
        if google_cfg.get("trigger", TRIGGER_ON_CHANGE) != TRIGGER_ON_CHANGE:
            skipped.append(
                {
                    "field_id": field_id,
                    "reason": SKIP_TRIGGER_MISMATCH,
                    "trigger": google_cfg.get("trigger"),
                }
            )
            continue

        header = _substitute_value(google_cfg.get("header", ""), new_value)
        body = _substitute_value(google_cfg.get("body", ""), new_value)
        if not header and not body:
            header = _substitute_value(
                _default_value_changed_header(), new_value
            )
            body = _substitute_value(_default_value_changed_body(), new_value)

        outcome = notify_event(
            pass_obj,
            event=EVENT_VALUE_CHANGED,
            header=header,
            body=body,
            field_keys=(str(field_id),),
        )
        results.append({"field_id": field_id, "result": outcome})
        if outcome.get("google") or outcome.get("apple_devices"):
            emitted += 1
        elif outcome.get("skipped"):
            skipped.extend(outcome["skipped"])

    return {"emitted": emitted, "skipped": skipped, "results": results}


def _default_value_changed_header() -> str:
    from common.messages import get_message

    return get_message("WALLET_NOTIF_VALUE_CHANGED_HEADER")


def _default_value_changed_body() -> str:
    from common.messages import get_message

    return get_message("WALLET_NOTIF_VALUE_CHANGED_BODY")
