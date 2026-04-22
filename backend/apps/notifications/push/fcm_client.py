"""
Loyallia — FCM Client (Firebase Cloud Messaging HTTP v1 API)

Uses the FCM HTTP v1 API (not the legacy FCM API which was deprecated Jun 2024).
Documentation: https://firebase.google.com/docs/cloud-messaging/http-server-ref

Authentication: Service Account JSON → OAuth2 access token via google-auth library.
Endpoint: https://fcm.googleapis.com/v1/projects/{project_id}/messages:send

Dependencies: google-auth, google-auth-httplib2 (already in requirements.txt)
"""

import json
import logging
import os

import httpx
from django.conf import settings

logger = logging.getLogger(__name__)

FCM_API_BASE = "https://fcm.googleapis.com/v1/projects/{project_id}/messages:send"
FCM_SCOPES = ["https://www.googleapis.com/auth/firebase.messaging"]


def _get_access_token() -> tuple[str | None, str | None]:
    """
    Obtain a short-lived OAuth2 access token from the Firebase service account JSON.

    Returns:
        (access_token, project_id) or (None, None) on failure.
    """
    credential_file = getattr(settings, "FIREBASE_CREDENTIAL_FILE", "")

    if not credential_file or not os.path.exists(credential_file):
        logger.warning(
            "FCM credential file not found at '%s'. Push notifications to Android are disabled.",
            credential_file,
        )
        return None, None

    try:
        from google.auth.transport.requests import Request as GoogleRequest
        from google.oauth2 import service_account

        credentials = service_account.Credentials.from_service_account_file(
            credential_file,
            scopes=FCM_SCOPES,
        )

        # Read the project_id from the SA file
        with open(credential_file) as f:
            sa_data = json.load(f)
        project_id = sa_data.get("project_id")

        # Refresh the token
        credentials.refresh(GoogleRequest())
        return credentials.token, project_id

    except Exception as exc:
        logger.error("Failed to obtain FCM access token: %s", exc)
        return None, None


def send_fcm_message(
    fcm_token: str,
    title: str,
    body: str,
    data: dict | None = None,
    image_url: str | None = None,
) -> bool:
    """
    Send a push notification to a single Android device via FCM HTTP v1 API.

    Args:
        fcm_token:  Firebase device registration token
        title:      Notification title
        body:       Notification body text
        data:       Optional key-value data payload (all values must be strings)
        image_url:  Optional image URL for rich notifications

    Returns:
        True if the message was accepted by FCM, False otherwise.
    """
    access_token, project_id = _get_access_token()
    if not access_token or not project_id:
        logger.warning("FCM not configured. Skipping push to token %s…%s", fcm_token[:8], fcm_token[-4:])
        return False

    notification_payload: dict = {
        "title": title,
        "body": body,
    }
    if image_url:
        notification_payload["image"] = image_url

    # All data payload values must be strings per FCM spec
    str_data = {k: str(v) for k, v in (data or {}).items()}

    message = {
        "message": {
            "token": fcm_token,
            "notification": notification_payload,
            "android": {
                "priority": "HIGH",
                "notification": {
                    "click_action": "FLUTTER_NOTIFICATION_CLICK",
                    "channel_id": "loyallia_main",
                },
            },
            "data": str_data,
        }
    }

    url = FCM_API_BASE.format(project_id=project_id)

    try:
        with httpx.Client(timeout=10.0) as client:
            response = client.post(
                url,
                json=message,
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json",
                },
            )

        if response.status_code == 200:
            logger.debug("FCM message sent successfully to …%s", fcm_token[-4:])
            return True

        # FCM returns 404 if the token is stale/unregistered
        if response.status_code == 404:
            logger.warning("FCM token unregistered (404): …%s", fcm_token[-4:])
            return False

        logger.error(
            "FCM HTTP error %s for token …%s: %s",
            response.status_code,
            fcm_token[-4:],
            response.text[:300],
        )
        return False

    except httpx.TimeoutException:
        logger.error("FCM request timed out for token …%s", fcm_token[-4:])
        return False
    except Exception as exc:
        logger.error("FCM send error for token …%s: %s", fcm_token[-4:], exc)
        return False
