"""
Loyallia Common Messages
"""

_MESSAGES_ES: dict[str, str] = {
    "NOT_FOUND": "Recurso no encontrado.",
    "VALIDATION_ERROR": "Error de validación: {detail}",
    "VALIDATION_NAME_REQUIRED": "El nombre no puede estar vacío.",
    "VALIDATION_INVALID_GENDER": "El género debe ser M, F u O.",
    "VALIDATION_FILE_TOO_LARGE": "El archivo es demasiado grande (máx {max_mb}MB).",
    "SERVER_ERROR": "Error interno del servidor. Por favor intenta nuevamente.",
    "RATE_LIMITED": "Demasiadas solicitudes. Por favor espera antes de intentar nuevamente.",
    # Tenant
    "RATE_LIMIT_EXCEEDED": "Demasiadas solicitudes. Intente de nuevo en un momento.",
    # Audit
    "VALIDATION_INVALID_DATETIME": "Formato de fecha inválido. Use ISO 8601.",
    "VALIDATION_FUTURE_DATETIME": "La fecha debe ser en el futuro.",
    "TENANT_NOT_FOUND": "Negocio no encontrado.",
    "WEBHOOK_UNAUTHORIZED": "No autorizado.",
    "WEBHOOK_NOT_CONFIGURED": "La verificación del webhook no está configurada.",
    # Email template
    "EMAIL_TEMPLATE_CODE_LABEL": "Tu código",
    "EMAIL_TEMPLATE_CODE_VERIFY_LABEL": "Código de verificación",
    "EMAIL_TEMPLATE_EMAIL_LABEL": "Correo",
    "EMAIL_TEMPLATE_PASSWORD_LABEL": "Contraseña",
    "EMAIL_TEMPLATE_FOOTER_TAGLINE": "Recompensas inteligentes",
    "EMAIL_TEMPLATE_OPEN_LINK": "Si el botón no funciona, copia este enlace en tu navegador:",
    "EMAIL_TEMPLATE_NO_SHARE": "No compartas este código con nadie.",
    "EMAIL_TEMPLATE_IGNORE": "Si no solicitaste este correo, ignóralo.",
}

_MESSAGES_EN: dict[str, str] = {
    "NOT_FOUND": "Resource not found.",
    "VALIDATION_ERROR": "Validation error: {detail}",
    "VALIDATION_NAME_REQUIRED": "Name cannot be empty.",
    "VALIDATION_INVALID_GENDER": "Gender must be M, F, or O.",
    "VALIDATION_FILE_TOO_LARGE": "File is too large (max {max_mb}MB).",
    "SERVER_ERROR": "Internal server error. Please try again.",
    "RATE_LIMITED": "Too many requests. Please wait before trying again.",
    # Tenant
    "RATE_LIMIT_EXCEEDED": "Too many requests. Please try again in a moment.",
    # Audit
    "VALIDATION_INVALID_DATETIME": "Invalid datetime format. Use ISO 8601.",
    "VALIDATION_FUTURE_DATETIME": "Date must be in the future.",
    "TENANT_NOT_FOUND": "Business not found.",
    "WEBHOOK_UNAUTHORIZED": "Unauthorized.",
    "WEBHOOK_NOT_CONFIGURED": "Webhook verification is not configured.",
    "EMAIL_TEMPLATE_CODE_LABEL": "Your code",
    "EMAIL_TEMPLATE_CODE_VERIFY_LABEL": "Verification code",
    "EMAIL_TEMPLATE_EMAIL_LABEL": "Email",
    "EMAIL_TEMPLATE_PASSWORD_LABEL": "Password",
    "EMAIL_TEMPLATE_FOOTER_TAGLINE": "Intelligent rewards",
    "EMAIL_TEMPLATE_OPEN_LINK": "If the button does not work, copy this link into your browser:",
    "EMAIL_TEMPLATE_NO_SHARE": "Do not share this code with anyone.",
    "EMAIL_TEMPLATE_IGNORE": "If you did not request this email, ignore it.",
}

_MESSAGES_FR: dict[str, str] = {
    "NOT_FOUND": "Ressource introuvable.",
    "RATE_LIMITED": "Too many requests. Please wait before trying again.",
    "RATE_LIMIT_EXCEEDED": "Too many requests. Please try again in a moment.",
    "SERVER_ERROR": "Internal server error. Please try again.",
    "VALIDATION_ERROR": "Validation error: {detail}",
    "VALIDATION_NAME_REQUIRED": "Name cannot be empty.",
    "VALIDATION_INVALID_GENDER": "Gender must be M, F, or O.",
    "VALIDATION_FILE_TOO_LARGE": "File is too large (max {max_mb}MB).",
    "VALIDATION_FUTURE_DATETIME": "Date must be in the future.",
    "VALIDATION_INVALID_DATETIME": "Invalid datetime format. Use ISO 8601.",
    "TENANT_NOT_FOUND": "Business not found.",
    "WEBHOOK_UNAUTHORIZED": "Unauthorized.",
    "WEBHOOK_NOT_CONFIGURED": "Webhook verification is not configured.",
    "EMAIL_TEMPLATE_CODE_LABEL": "Your code",
    "EMAIL_TEMPLATE_CODE_VERIFY_LABEL": "Verification code",
    "EMAIL_TEMPLATE_EMAIL_LABEL": "Email",
    "EMAIL_TEMPLATE_PASSWORD_LABEL": "Password",
    "EMAIL_TEMPLATE_FOOTER_TAGLINE": "Intelligent rewards",
    "EMAIL_TEMPLATE_OPEN_LINK": "If the button does not work, copy this link into your browser:",
    "EMAIL_TEMPLATE_NO_SHARE": "Do not share this code with anyone.",
    "EMAIL_TEMPLATE_IGNORE": "If you did not request this email, ignore it.",
}

_MESSAGES_DE: dict[str, str] = {
    "NOT_FOUND": "Ressource nicht gefunden.",
    "RATE_LIMITED": "Too many requests. Please wait before trying again.",
    "RATE_LIMIT_EXCEEDED": "Too many requests. Please try again in a moment.",
    "SERVER_ERROR": "Internal server error. Please try again.",
    "VALIDATION_ERROR": "Validation error: {detail}",
    "VALIDATION_NAME_REQUIRED": "Name cannot be empty.",
    "VALIDATION_INVALID_GENDER": "Gender must be M, F, or O.",
    "VALIDATION_FILE_TOO_LARGE": "File is too large (max {max_mb}MB).",
    "VALIDATION_FUTURE_DATETIME": "Date must be in the future.",
    "VALIDATION_INVALID_DATETIME": "Invalid datetime format. Use ISO 8601.",
    "TENANT_NOT_FOUND": "Business not found.",
    "WEBHOOK_UNAUTHORIZED": "Unauthorized.",
    "WEBHOOK_NOT_CONFIGURED": "Webhook verification is not configured.",
    "EMAIL_TEMPLATE_CODE_LABEL": "Your code",
    "EMAIL_TEMPLATE_CODE_VERIFY_LABEL": "Verification code",
    "EMAIL_TEMPLATE_EMAIL_LABEL": "Email",
    "EMAIL_TEMPLATE_PASSWORD_LABEL": "Password",
    "EMAIL_TEMPLATE_FOOTER_TAGLINE": "Intelligent rewards",
    "EMAIL_TEMPLATE_OPEN_LINK": "If the button does not work, copy this link into your browser:",
    "EMAIL_TEMPLATE_NO_SHARE": "Do not share this code with anyone.",
    "EMAIL_TEMPLATE_IGNORE": "If you did not request this email, ignore it.",
}
