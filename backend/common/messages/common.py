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
}
