"""
Loyallia Apple campaign message writer (pass_engine/campaign_message.py)

Wallet campaigns must mutate ``pass_data["last_message"]`` before waking the
Apple device. PassKit only fires a field's ``changeMessage`` when that field's
value differs between the previously downloaded pass.json and the new one, and
the Apple web service only serves a new pass.json when ``last_updated`` moved.
An APNs wake without a field mutation therefore produces no visible alert —
this module owns the mutation half of that contract.
"""

from common.messages import get_message

CAMPAIGN_MESSAGE_MAX_LEN = 120


def apply_campaign_message(customer_pass, message: str) -> dict:
    """Pin a campaign message onto the pass as ``pass_data["last_message"]``.

    The value is written through ``CustomerPass.update_pass_data`` so the
    transaction is atomic and ``last_updated`` advances (web service then
    answers 200 with the new pass.json instead of 204). Text longer than
    ``CAMPAIGN_MESSAGE_MAX_LEN`` characters is truncated and suffixed with the
    i18n truncation mark (``WALLET_MESSAGE_TRUNCATED_MARK``).

    Pin behavior: when the computed value equals the current ``last_message``
    nothing is written and ``{"changed": False}`` is returned. PassKit compares
    field values across pass revisions, so an identical value never re-fires the
    field's ``changeMessage`` — re-sending the same campaign message must not
    expect a new Apple alert, and callers skip the APNs wake on ``changed=False``.

    Args:
        customer_pass: CustomerPass instance to mutate (tenant-scoped by caller).
        message: Free-text campaign body to pin on the pass.

    Returns:
        {"changed": bool, "value": str, "truncated": bool} — ``value`` is the
        text actually stored (after truncation), ``truncated`` reports whether
        truncation occurred.
    """
    text = str(message) if message is not None else ""
    truncated = False
    if len(text) > CAMPAIGN_MESSAGE_MAX_LEN:
        mark = get_message("WALLET_MESSAGE_TRUNCATED_MARK")
        text = text[: CAMPAIGN_MESSAGE_MAX_LEN - len(mark)] + mark
        truncated = True

    current = str(customer_pass.get_pass_field("last_message", "") or "")
    if text == current:
        return {"changed": False, "value": current, "truncated": truncated}

    customer_pass.update_pass_data({"last_message": text})
    return {"changed": True, "value": text, "truncated": truncated}
