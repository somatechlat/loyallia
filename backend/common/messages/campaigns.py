"""
Campaign messages: campaign, notification, push, SMS, WhatsApp.
"""

_MESSAGES_ES: dict[str, str] = {
    # Push Notifications / Campaigns
    "CAMPAIGN_CREATED": "Campaña '{title}' creada exitosamente.",
    "CAMPAIGN_SENT": "Campaña enviada a {count} clientes.",
    "CAMPAIGN_SCHEDULED": "Campaña programada para {datetime}.",
    "CAMPAIGN_NOT_FOUND": "Campaña no encontrada.",
    "CAMPAIGN_EMAIL_STARTED": "Campaña de EMAIL iniciada para segmento '{segment}'. Los clientes recibirán un correo electrónico.",  # noqa: E501
    "CAMPAIGN_WALLET_STARTED": "Campaña de WALLET iniciada para segmento '{segment}'. Los clientes recibirán una notificación en sus tarjetas.",  # noqa: E501
    "CAMPAIGN_WHATSAPP_STARTED": "Campaña de WhatsApp iniciada para segmento '{segment}'. Los mensajes se enviarán de forma progresiva (~8 por minuto).",  # noqa: E501
    "CAMPAIGN_INVALID_CHANNEL": "Canal no válido. Usa 'email', 'wallet', 'whatsapp' o 'sms'.",
    # Devices / Notifications
    "DEVICE_REGISTERED": "Dispositivo registrado exitosamente.",
    "DEVICE_UNREGISTERED": "Dispositivo desregistrado.",
    "DEVICE_NOT_FOUND": "Dispositivo no encontrado.",
    "NOTIFICATION_SENT": "Notificación enviada exitosamente.",
    "NOTIFICATION_SEND_FAILED": "Error al enviar notificación.",
    "NOTIFICATION_NOT_FOUND": "Notificación no encontrada.",
    "NOTIFICATION_MARKED_READ": "Notificación marcada como leída.",
    "NOTIFICATION_ACTION_RECORDED": "Acción de notificación registrada.",
    "NOTIFICATION_BIRTHDAY_TITLE": "¡Feliz Cumpleaños!",
    "NOTIFICATION_BIRTHDAY_MSG": "Te deseamos un excelente día. ¡Visita {program_name} y reclama tu regalo especial!",
    "NOTIFICATION_REMINDER_TITLE": "¿Nos extranas?",
    "NOTIFICATION_REMINDER_MSG": "Tienes puntos esperando en {program_name}. ¡Ven a visitarnos!",
    # SMS / Twilio
    "SMS_CAMPAIGN_STARTED": "Campaña de SMS iniciada para segmento '{segment}'. Los mensajes se enviarán via Twilio.",
    "SMS_SEND_FAILED": "Error al enviar SMS a {phone}: {detail}",
    "SMS_NOT_CONFIGURED": "El servicio de SMS (Twilio) no está configurado. Configure las credenciales en Vault.",
    "TWILIO_TEST_SENT": "SMS de prueba enviado exitosamente a {phone}.",
    "TWILIO_TEST_FAILED": "Error al enviar SMS de prueba: {detail}",
    # WhatsApp Bridge
    "WHATSAPP_BRIDGE_UNAVAILABLE": "El servicio de WhatsApp no está disponible en este momento. Intente más tarde.",
    "WHATSAPP_SESSION_NOT_CONNECTED": "La sesión de WhatsApp no está conectada. Escanea el código QR primero.",
    "WHATSAPP_BRIDGE_ERROR": "Error al enviar mensaje de WhatsApp: {detail}",
    # SuperAdmin
    "ADMIN_WA_OVERRIDE_REMOVED": "Override removido  usando límite del plan.",
    "ADMIN_WA_OVERRIDE_SET": "Override WA establecido: {limit} msgs/día.",
    "CAMPAIGN_SCHEDULED_SUCCESS": "Campaña programada exitosamente.",
}

_MESSAGES_EN: dict[str, str] = {
    # Push Notifications / Campaigns
    "CAMPAIGN_CREATED": "Campaign '{title}' created successfully.",
    "CAMPAIGN_SENT": "Campaign sent to {count} customers.",
    "CAMPAIGN_SCHEDULED": "Campaign scheduled for {datetime}.",
    "CAMPAIGN_NOT_FOUND": "Campaign not found.",
    "CAMPAIGN_EMAIL_STARTED": "Email campaign started for segment '{segment}'. Customers will receive an email.",
    "CAMPAIGN_WALLET_STARTED": "Wallet campaign started for segment '{segment}'. Customers will receive a card notification.",  # noqa: E501
    "CAMPAIGN_WHATSAPP_STARTED": "WhatsApp campaign started for segment '{segment}'. Messages will be sent progressively (~8 per minute).",  # noqa: E501
    "CAMPAIGN_INVALID_CHANNEL": "Invalid channel. Use 'email', 'wallet', 'whatsapp' or 'sms'.",
    # Devices / Notifications
    "DEVICE_REGISTERED": "Device registered successfully.",
    "DEVICE_UNREGISTERED": "Device unregistered.",
    "DEVICE_NOT_FOUND": "Device not found.",
    "NOTIFICATION_SENT": "Notification sent successfully.",
    "NOTIFICATION_SEND_FAILED": "Failed to send notification.",
    "NOTIFICATION_NOT_FOUND": "Notification not found.",
    "NOTIFICATION_MARKED_READ": "Notification marked as read.",
    "NOTIFICATION_ACTION_RECORDED": "Notification action recorded.",
    "NOTIFICATION_BIRTHDAY_TITLE": "Happy Birthday!",
    "NOTIFICATION_BIRTHDAY_MSG": "We wish you an excellent day. Visit {program_name} and claim your special gift!",
    "NOTIFICATION_REMINDER_TITLE": "Miss us?",
    "NOTIFICATION_REMINDER_MSG": "You have points waiting at {program_name}. Come visit us!",
    # SMS / Twilio
    "SMS_CAMPAIGN_STARTED": "SMS campaign started for segment '{segment}'. Messages will be sent via Twilio.",
    "SMS_SEND_FAILED": "Error sending SMS to {phone}: {detail}",
    "SMS_NOT_CONFIGURED": "SMS service (Twilio) is not configured. Set credentials in Vault.",
    "TWILIO_TEST_SENT": "Test SMS sent successfully to {phone}.",
    "TWILIO_TEST_FAILED": "Error sending test SMS: {detail}",
    # WhatsApp Bridge
    "WHATSAPP_BRIDGE_UNAVAILABLE": "WhatsApp service is not available at this time. Please try later.",
    "WHATSAPP_SESSION_NOT_CONNECTED": "WhatsApp session is not connected. Scan the QR code first.",
    "WHATSAPP_BRIDGE_ERROR": "Error sending WhatsApp message: {detail}",
    # SuperAdmin
    "ADMIN_WA_OVERRIDE_REMOVED": "Override removed  using plan default.",
    "ADMIN_WA_OVERRIDE_SET": "WA override set: {limit} msgs/day.",
    "CAMPAIGN_SCHEDULED_SUCCESS": "Campaign scheduled successfully.",
}

_MESSAGES_FR: dict[str, str] = {
    "ADMIN_WA_OVERRIDE_REMOVED": 'Override removed  using plan default.',
    "ADMIN_WA_OVERRIDE_SET": 'WA override set: {limit} msgs/day.',
    "CAMPAIGN_CREATED": "Campaign '{title}' created successfully.",
    "CAMPAIGN_EMAIL_STARTED": "Email campaign started for segment '{segment}'. Customers will receive an email.",
    "CAMPAIGN_INVALID_CHANNEL": "Invalid channel. Use 'email', 'wallet', 'whatsapp' or 'sms'.",
    "CAMPAIGN_NOT_FOUND": 'Campaign not found.',
    "CAMPAIGN_SCHEDULED": 'Campaign scheduled for {datetime}.',
    "CAMPAIGN_SCHEDULED_SUCCESS": 'Campaign scheduled successfully.',
    "CAMPAIGN_SENT": 'Campaign sent to {count} customers.',
    "CAMPAIGN_WALLET_STARTED": "Wallet campaign started for segment '{segment}'. Customers will receive a card notification.",
    "CAMPAIGN_WHATSAPP_STARTED": "WhatsApp campaign started for segment '{segment}'. Messages will be sent progressively (~8 per minute).",
    "DEVICE_NOT_FOUND": 'Device not found.',
    "DEVICE_REGISTERED": 'Device registered successfully.',
    "DEVICE_UNREGISTERED": 'Device unregistered.',
    "NOTIFICATION_ACTION_RECORDED": 'Notification action recorded.',
    "NOTIFICATION_BIRTHDAY_MSG": 'We wish you an excellent day. Visit {program_name} and claim your special gift!',
    "NOTIFICATION_BIRTHDAY_TITLE": 'Happy Birthday!',
    "NOTIFICATION_MARKED_READ": 'Notification marked as read.',
    "NOTIFICATION_NOT_FOUND": 'Notification not found.',
    "NOTIFICATION_REMINDER_MSG": 'You have points waiting at {program_name}. Come visit us!',
    "NOTIFICATION_REMINDER_TITLE": 'Miss us?',
    "NOTIFICATION_SENT": 'Notification sent successfully.',
    "NOTIFICATION_SEND_FAILED": 'Failed to send notification.',
    "SMS_CAMPAIGN_STARTED": "SMS campaign started for segment '{segment}'. Messages will be sent via Twilio.",
    "SMS_NOT_CONFIGURED": 'SMS service (Twilio) is not configured. Set credentials in Vault.',
    "SMS_SEND_FAILED": 'Error sending SMS to {phone}: {detail}',
    "TWILIO_TEST_FAILED": 'Error sending test SMS: {detail}',
    "TWILIO_TEST_SENT": 'Test SMS sent successfully to {phone}.',
    "WHATSAPP_BRIDGE_ERROR": 'Error sending WhatsApp message: {detail}',
    "WHATSAPP_BRIDGE_UNAVAILABLE": 'WhatsApp service is not available at this time. Please try later.',
    "WHATSAPP_SESSION_NOT_CONNECTED": 'WhatsApp session is not connected. Scan the QR code first.',
}

_MESSAGES_DE: dict[str, str] = {
    "ADMIN_WA_OVERRIDE_REMOVED": 'Override removed  using plan default.',
    "ADMIN_WA_OVERRIDE_SET": 'WA override set: {limit} msgs/day.',
    "CAMPAIGN_CREATED": "Campaign '{title}' created successfully.",
    "CAMPAIGN_EMAIL_STARTED": "Email campaign started for segment '{segment}'. Customers will receive an email.",
    "CAMPAIGN_INVALID_CHANNEL": "Invalid channel. Use 'email', 'wallet', 'whatsapp' or 'sms'.",
    "CAMPAIGN_NOT_FOUND": 'Campaign not found.',
    "CAMPAIGN_SCHEDULED": 'Campaign scheduled for {datetime}.',
    "CAMPAIGN_SCHEDULED_SUCCESS": 'Campaign scheduled successfully.',
    "CAMPAIGN_SENT": 'Campaign sent to {count} customers.',
    "CAMPAIGN_WALLET_STARTED": "Wallet campaign started for segment '{segment}'. Customers will receive a card notification.",
    "CAMPAIGN_WHATSAPP_STARTED": "WhatsApp campaign started for segment '{segment}'. Messages will be sent progressively (~8 per minute).",
    "DEVICE_NOT_FOUND": 'Device not found.',
    "DEVICE_REGISTERED": 'Device registered successfully.',
    "DEVICE_UNREGISTERED": 'Device unregistered.',
    "NOTIFICATION_ACTION_RECORDED": 'Notification action recorded.',
    "NOTIFICATION_BIRTHDAY_MSG": 'We wish you an excellent day. Visit {program_name} and claim your special gift!',
    "NOTIFICATION_BIRTHDAY_TITLE": 'Happy Birthday!',
    "NOTIFICATION_MARKED_READ": 'Notification marked as read.',
    "NOTIFICATION_NOT_FOUND": 'Notification not found.',
    "NOTIFICATION_REMINDER_MSG": 'You have points waiting at {program_name}. Come visit us!',
    "NOTIFICATION_REMINDER_TITLE": 'Miss us?',
    "NOTIFICATION_SENT": 'Notification sent successfully.',
    "NOTIFICATION_SEND_FAILED": 'Failed to send notification.',
    "SMS_CAMPAIGN_STARTED": "SMS campaign started for segment '{segment}'. Messages will be sent via Twilio.",
    "SMS_NOT_CONFIGURED": 'SMS service (Twilio) is not configured. Set credentials in Vault.',
    "SMS_SEND_FAILED": 'Error sending SMS to {phone}: {detail}',
    "TWILIO_TEST_FAILED": 'Error sending test SMS: {detail}',
    "TWILIO_TEST_SENT": 'Test SMS sent successfully to {phone}.',
    "WHATSAPP_BRIDGE_ERROR": 'Error sending WhatsApp message: {detail}',
    "WHATSAPP_BRIDGE_UNAVAILABLE": 'WhatsApp service is not available at this time. Please try later.',
    "WHATSAPP_SESSION_NOT_CONNECTED": 'WhatsApp session is not connected. Scan the QR code first.',
}
