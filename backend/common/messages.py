"""
Loyallia — Centralized Message Registry (Rule #11: No Hardcoded Strings)
All user-facing text is defined here and retrieved via get_message().
Supports future i18n translation.
"""
from typing import Any


# =============================================================================
# MESSAGE REGISTRY
# Format: "CODE": "Message string {placeholder}"
# =============================================================================
_MESSAGES: dict[str, str] = {
    # --- Authentication ---
    "AUTH_REGISTER_SUCCESS": "Cuenta creada exitosamente. Por favor verifica tu correo electrónico.",
    "AUTH_LOGIN_SUCCESS": "Inicio de sesión exitoso.",
    "AUTH_LOGOUT_SUCCESS": "Sesión cerrada exitosamente.",
    "AUTH_INVALID_CREDENTIALS": "Correo electrónico o contraseña incorrectos.",
    "AUTH_ACCOUNT_LOCKED": "Cuenta bloqueada temporalmente por múltiples intentos fallidos. Intenta en {minutes} minutos.",
    "AUTH_EMAIL_NOT_VERIFIED": "Por favor verifica tu correo electrónico antes de iniciar sesión.",
    "AUTH_EMAIL_VERIFIED": "Correo electrónico verificado exitosamente.",
    "AUTH_PASSWORD_RESET_SENT": "Se ha enviado un enlace de restablecimiento a {email}.",
    "AUTH_PASSWORD_RESET_SUCCESS": "Contraseña restablecida exitosamente.",
    "AUTH_PASSWORD_RESET_EXPIRED": "El enlace de restablecimiento ha expirado. Solicita uno nuevo.",
    "AUTH_TOKEN_INVALID": "Token de autenticación inválido o expirado.",
    "AUTH_TOKEN_REFRESHED": "Token renovado exitosamente.",
    "AUTH_INVITE_SENT": "Invitación enviada a {email}.",
    "AUTH_INVITE_INVALID": "La invitación es inválida o ha expirado.",
    "AUTH_PERMISSION_DENIED": "No tienes permisos para realizar esta acción.",
    "AUTH_USER_DEACTIVATED": "El usuario ha sido desactivado exitosamente.",
    "AUTH_PROFILE_UPDATED": "Perfil actualizado exitosamente.",
    "AUTH_PASSWORD_CHANGED": "Contraseña actualizada exitosamente.",
    "AUTH_PASSWORD_WRONG": "La contraseña actual es incorrecta.",
    "AUTH_RESET_EMAIL_SENT": "Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.",
    "AUTH_RESET_INVALID": "El enlace de restablecimiento es inválido o ha expirado.",

    # --- Tenant ---
    "TENANT_CREATED": "Negocio registrado. Tu prueba gratuita de {days} días ha comenzado.",
    "TENANT_UPDATED": "Configuración del negocio actualizada.",
    "TENANT_SUSPENDED": "Tu cuenta ha sido suspendida. Por favor actualiza tu suscripción.",
    "TENANT_TRIAL_EXPIRING": "Tu prueba gratuita vence en {days} días. Suscríbete para continuar.",
    "TENANT_TRIAL_EXPIRED": "Tu período de prueba ha terminado. Suscríbete para continuar usando Loyallia.",
    "TENANT_MAX_PROGRAMS": "Has alcanzado el límite de {max} programas de fidelización.",

    # --- Location ---
    "LOCATION_CREATED": "Ubicación '{name}' creada exitosamente.",
    "LOCATION_UPDATED": "Ubicación actualizada exitosamente.",
    "LOCATION_DELETED": "Ubicación eliminada exitosamente.",
    "LOCATION_NOT_FOUND": "Ubicación no encontrada.",

    # --- Loyalty Programs / Cards ---
    "PROGRAM_CREATED": "Programa de fidelización '{name}' creado exitosamente.",
    "PROGRAM_UPDATED": "Programa actualizado exitosamente.",
    "PROGRAM_DEACTIVATED": "Programa desactivado. Los pases existentes no se verán afectados.",
    "PROGRAM_NOT_FOUND": "Programa de fidelización no encontrado.",
    "PROGRAM_INVALID_CONFIG": "Configuración inválida para el tipo de tarjeta {card_type}: {detail}",

    # --- Customer Enrollment ---
    "ENROLLMENT_SUCCESS": "¡Bienvenido a {program_name}! Tu tarjeta está lista.",
    "ENROLLMENT_DUPLICATE": "Ya estás registrado en este programa. ¿Deseas reenviar tu tarjeta a {email}?",
    "ENROLLMENT_PASS_GENERATING": "Generando tu tarjeta de fidelidad...",
    "ENROLLMENT_PASS_READY": "¡Tu tarjeta está lista! Agrégala a tu Wallet.",

    # --- Pass ---
    "PASS_NOT_FOUND": "Tarjeta no encontrada.",
    "PASS_NOT_FOUND_INACTIVE": "Pase no encontrado o inactivo.",
    "PASS_EXPIRED": "Esta tarjeta ha expirado.",
    "PASS_REVOKED": "Esta tarjeta ha sido desactivada.",
    "PASS_INVALID_QR": "Código QR inválido.",
    "PASS_QR_REQUIRED": "Código QR requerido.",
    "PASS_RESENT": "Se ha reenviado tu tarjeta a {email}.",
    "PASS_UPDATED": "Tarjeta actualizada en tu Wallet.",
    "PASS_APPLE_GEN_ERROR": "Error al generar el pase de Apple Wallet.",
    "PASS_GOOGLE_GEN_ERROR": "Error al generar la URL de Google Wallet.",

    # --- Transactions ---
    "TRANSACTION_STAMP_ADDED": "{count} sello(s) agregado(s). Total: {current}/{required}.",
    "TRANSACTION_REWARD_READY": "¡Felicidades! Has ganado tu recompensa: {reward}.",
    "TRANSACTION_REWARD_REDEEMED": "Recompensa canjeada exitosamente.",
    "TRANSACTION_CASHBACK_EARNED": "Has ganado {amount} de crédito. Saldo total: {balance}.",
    "TRANSACTION_CASHBACK_REDEEMED": "Se han aplicado {amount} de crédito a tu compra.",
    "TRANSACTION_COUPON_REDEEMED": "Cupón canjeado. Descuento de {discount} aplicado.",
    "TRANSACTION_COUPON_ALREADY_USED": "Este cupón ya fue utilizado.",
    "TRANSACTION_GIFT_REDEEMED": "Se han aplicado {amount} del certificado. Saldo restante: {balance}.",
    "TRANSACTION_GIFT_INSUFFICIENT": "Saldo insuficiente. Saldo disponible: {balance}.",
    "TRANSACTION_RECORDED": "Transacción registrada exitosamente.",
    "TRANSACTION_INVALID_AMOUNT": "El monto de la transacción debe ser mayor a cero.",
    "TRANSACTION_REMOTE_ISSUED": "Recompensa emitida remotamente a {customer_name}.",
    "TRANSACTION_SEARCH_MIN_CHARS": "Búsqueda debe tener al menos 2 caracteres.",

    # --- Push Notifications ---
    "CAMPAIGN_CREATED": "Campaña '{title}' creada exitosamente.",
    "CAMPAIGN_SENT": "Campaña enviada a {count} clientes.",
    "CAMPAIGN_SCHEDULED": "Campaña programada para {datetime}.",
    "CAMPAIGN_NOT_FOUND": "Campaña no encontrada.",

    # --- Automation ---
    "RULE_CREATED": "Regla de automatización '{name}' creada.",
    "RULE_UPDATED": "Regla actualizada.",
    "RULE_ACTIVATED": "Regla '{name}' activada.",
    "RULE_DEACTIVATED": "Regla '{name}' desactivada.",
    "RULE_NOT_FOUND": "Regla de automatización no encontrada.",

    # --- Billing ---
    "BILLING_SUBSCRIBED": "Suscripción activada. Bienvenido a Loyallia FULL.",
    "BILLING_CANCELLED": "Suscripción cancelada. Tu acceso continúa hasta el {end_date}.",
    "BILLING_PAYMENT_FAILED": "El pago falló. Por favor actualiza tu método de pago.",
    "BILLING_INVOICE_GENERATED": "Factura generada por {amount}.",
    "BILLING_PLAN_REQUIRED": "Se requiere una suscripción activa para usar esta función.",
    "BILLING_INVALID_CYCLE": "El ciclo de facturación debe ser 'monthly' o 'annual'.",
    "BILLING_SUBSCRIPTION_CREATED": "Suscripción creada exitosamente.",
    "BILLING_SUBSCRIPTION_UPDATED": "Suscripción actualizada exitosamente.",
    "BILLING_ALREADY_CANCELED": "La suscripción ya se encuentra cancelada.",
    "BILLING_CANCEL_SCHEDULED": "Suscripción programada para cancelación al final del período.",
    "BILLING_NOT_PENDING_CANCEL": "La suscripción no está pendiente de cancelación.",
    "BILLING_REACTIVATED": "Suscripción reactivada exitosamente.",
    "BILLING_PAYMENT_METHOD_ADDED": "Método de pago agregado exitosamente.",
    "BILLING_CANNOT_REMOVE_LAST_PM": "No se puede eliminar el único método de pago mientras la suscripción esté activa.",
    "BILLING_PAYMENT_METHOD_REMOVED": "Método de pago eliminado exitosamente.",
    "BILLING_DEFAULT_PM_SET": "Método de pago predeterminado actualizado exitosamente.",
    "BILLING_INVALID_SIGNATURE": "Firma inválida.",
    "BILLING_INVALID_PAYLOAD": "Payload JSON inválido.",

    # --- Generic ---
    "NOT_FOUND": "Recurso no encontrado.",
    "VALIDATION_ERROR": "Error de validación: {detail}",
    "SERVER_ERROR": "Error interno del servidor. Por favor intenta nuevamente.",
    "RATE_LIMITED": "Demasiadas solicitudes. Por favor espera antes de intentar nuevamente.",

    # --- Devices & Notifications ---
    "DEVICE_REGISTERED": "Dispositivo registrado exitosamente.",
    "DEVICE_NOT_FOUND": "Dispositivo no encontrado.",
    "NOTIFICATION_SENT": "Notificación enviada exitosamente.",
    "NOTIFICATION_NOT_FOUND": "Notificación no encontrada.",

    # --- Pass QR ---
    "PASS_QR_INVALID_SIGNATURE": "Firma del código QR inválida.",
    "PASS_QR_EXPIRED": "El código QR ha expirado. Abre tu tarjeta para actualizar el código.",

    # --- Customers ---
    "CUSTOMER_CREATED": "Cliente creado exitosamente.",
    "CUSTOMER_UPDATED": "Cliente actualizado exitosamente.",
    "CUSTOMER_NOT_FOUND": "Cliente no encontrado.",
    "CUSTOMER_REQUIRED": "Perfil de cliente requerido.",
    "CUSTOMER_IMPORT_INVALID_FORMAT": "Formato no soportado. Sube un archivo CSV, XLS o XLSX.",
    "CUSTOMER_IMPORT_FILE_CORRUPT": "El archivo está dañado o tiene un formato inválido.",
    "CUSTOMER_IMPORT_FILE_EMPTY": "El archivo está vacío.",

    # --- Programs ---
    "PROGRAM_DUPLICATE_NAME": "Ya existe un programa con este nombre.",
    "PROGRAM_DELETED": "Programa de fidelización eliminado permanentemente.",
    "PROGRAM_SUSPENDED": "Programa de fidelización suspendido exitosamente.",
    "PROGRAM_REACTIVATED": "Programa de fidelización reactivado exitosamente.",

    # --- Segments ---
    "SEGMENT_NOT_FOUND": "Segmento no encontrado.",

    # --- Birthday & Reminder Notifications ---
    "NOTIFICATION_BIRTHDAY_TITLE": "¡Feliz Cumpleaños!",
    "NOTIFICATION_BIRTHDAY_MSG": "Te deseamos un excelente día. ¡Visita {program_name} y reclama tu regalo especial!",
    "NOTIFICATION_REMINDER_TITLE": "¿Nos extranas?",
    "NOTIFICATION_REMINDER_MSG": "Tienes puntos esperando en {program_name}. ¡Ven a visitarnos!",

    # --- Automation ---
    "AUTOMATION_CREATED": "Automatización '{name}' creada exitosamente.",
    "AUTOMATION_UPDATED": "Automatización actualizada exitosamente.",
    "AUTOMATION_DELETED": "Automatización eliminada exitosamente.",
    "AUTOMATION_ENABLED": "Automatización '{name}' activada.",
    "AUTOMATION_DISABLED": "Automatización '{name}' desactivada.",
    "AUTOMATION_EXECUTED": "Automatización ejecutada exitosamente.",
    "AUTOMATION_FAILED": "La ejecución de la automatización falló.",
    "AUTOMATION_INVALID_TRIGGER": "Disparador inválido: {trigger}",
    "AUTOMATION_INVALID_ACTION": "Acción inválida: {action}",
    "AUTOMATION_NOT_FOUND": "Automatización no encontrada.",

    # --- Team ---
    "TEAM_MEMBER_ADDED": "Miembro del equipo agregado exitosamente.",
    "TEAM_MEMBER_REMOVED": "Miembro del equipo eliminado exitosamente.",
}


def get_message(code: str, **kwargs: Any) -> str:
    """
    Retrieve a user-facing message by code with optional interpolation.

    Args:
        code: Message code key (e.g. "AUTH_LOGIN_SUCCESS")
        **kwargs: Values to interpolate into the message template

    Returns:
        Formatted message string

    Raises:
        KeyError: If code is not registered (catches development mistakes early)
    """
    template = _MESSAGES[code]
    if kwargs:
        return template.format(**kwargs)
    return template


def register_message(code: str, template: str) -> None:
    """
    Register a new message code (for use by individual apps).
    Raises ValueError if code conflicts with existing registration.
    """
    if code in _MESSAGES:
        raise ValueError(f"Message code '{code}' is already registered.")
    _MESSAGES[code] = template
