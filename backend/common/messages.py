"""
Loyallia  Centralized i18n Message Registry (common/messages.py)

All user-facing text is defined here with translations for ES, EN, FR, DE.
Messages are retrieved via get_message(code, lang=None, **kwargs).

Architecture:
    - Spanish (ES) is the canonical/primary language with full coverage.
    - English (EN) has full coverage. FR and DE have partial coverage.
    - Fallback chain: requested lang → ES canonical catalog → KeyError.
    - Module-level dicts are loaded once at import time (no per-request cost).

Language resolution order (get_message_for_request):
    1. User.preferred_language (explicit per-user preference)
    2. Tenant.default_language (business-wide setting)
    3. Accept-Language HTTP header
    4. Django LANGUAGE_CODE (settings)

Performance (Rule 12):
    - PERF: All catalogs are module-level dicts  O(1) lookup by code.
    - PERF: No database queries. No file I/O. No Django translation machinery.
    - PERF: str.format(**kwargs) used for interpolation (fastest Python option).

Called by: Every API endpoint, every error handler, every notification template.
Rule #11: All user-facing strings MUST go through get_message().
"""

from typing import Any

from django.conf import settings

# SUPPORTED LANGUAGES

SUPPORTED_LANGUAGES = ("es", "en", "fr", "de")
DEFAULT_LANGUAGE = "es"


# MESSAGE CATALOGS
# Each language is a separate dict keyed by message code.
# Spanish (es) is the canonical/primary language.


_MESSAGES_ES: dict[str, str] = {
 # Authentication
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
    "AUTH_UNAUTHORIZED": "No autorizado. Inicia sesión para continuar.",
    "AUTH_INVALID_PASSWORD": "Contraseña incorrecta.",
    "AUTH_RESET_EMAIL_SENT": "Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.",
    "AUTH_RESET_INVALID": "El enlace de restablecimiento es inválido o ha expirado.",
    "AUTH_GOOGLE_SUCCESS": "Inicio de sesión con Google exitoso.",
    "AUTH_GOOGLE_FAILED": "No se pudo verificar la cuenta de Google. Intenta de nuevo.",
    "AUTH_GOOGLE_NOT_CONFIGURED": "El inicio de sesión con Google no está configurado.",
    "AUTH_GOOGLE_EMAIL_EXISTS": "Ya existe una cuenta con este correo. Inicia sesión con tu contraseña.",
    "AUTH_PHONE_OTP_SENT": "Código de verificación enviado al {phone}.",
    "AUTH_PHONE_VERIFIED": "Número telefónico verificado exitosamente.",
    "AUTH_PHONE_OTP_INVALID": "El código de verificación es inválido o ha expirado.",
    "AUTH_USER_NOT_FOUND_REGISTER": "Cuenta no encontrada. Por favor, regístrate primero para acceder o disfrutar del periodo de prueba.",
 # Tenant
    "TENANT_CREATED": "Negocio registrado. Tu prueba gratuita de {days} días ha comenzado.",
    "TENANT_WELCOME_EMAIL_SUBJECT": "Bienvenido a Loyallia",
    "TENANT_WELCOME_EMAIL_BODY": "Hola {name},\n\nTu negocio {tenant} fue creado en Loyallia.\n\nURL de acceso: {login_url}\nEmail: {email}\nContraseña temporal: {password}\nPrueba: {trial_days} días\n\nCambia esta contraseña al iniciar sesión.",
    "TENANT_UPDATED": "Configuración del negocio actualizada.",
    "TENANT_SUSPENDED": "Tu cuenta ha sido suspendida. Por favor actualiza tu suscripción.",
    "TENANT_DELETED": "Negocio eliminado permanentemente.",
    "TENANT_TRIAL_EXPIRING": "Tu prueba gratuita vence en {days} días. Suscríbete para continuar.",
    "TENANT_TRIAL_EXPIRED": "Tu período de prueba ha terminado. Suscríbete para continuar usando Loyallia.",
    "TENANT_MAX_PROGRAMS": "Has alcanzado el límite de {max} programas de fidelización.",
 # Location
    "LOCATION_CREATED": "Ubicación '{name}' creada exitosamente.",
    "LOCATION_UPDATED": "Ubicación actualizada exitosamente.",
    "LOCATION_DELETED": "Ubicación eliminada exitosamente.",
    "LOCATION_NOT_FOUND": "Ubicación no encontrada.",
 # Loyalty Programs
    "PROGRAM_CREATED": "Programa de fidelización '{name}' creado exitosamente.",
    "PROGRAM_UPDATED": "Programa actualizado exitosamente.",
    "PROGRAM_DEACTIVATED": "Programa desactivado. Los pases existentes no se verán afectados.",
    "PROGRAM_NOT_FOUND": "Programa de fidelización no encontrado.",
    "PROGRAM_INVALID_CONFIG": "Configuración inválida para el tipo de tarjeta {card_type}: {detail}",
    "PROGRAM_DUPLICATE_NAME": "Ya existe un programa con este nombre.",
    "PROGRAM_DELETED": "Programa de fidelización eliminado permanentemente.",
    "PROGRAM_SUSPENDED": "Programa de fidelización suspendido exitosamente.",
    "PROGRAM_REACTIVATED": "Programa de fidelización reactivado exitosamente.",
 # Enrollment
    "ENROLLMENT_SUCCESS": "¡Bienvenido a {program_name}! Tu tarjeta está lista.",
    "ENROLLMENT_DUPLICATE": "Ya estás registrado en este programa. ¿Deseas reenviar tu tarjeta a {email}?",
    "ENROLLMENT_PASS_GENERATING": "Generando tu tarjeta de fidelidad...",
    "ENROLLMENT_PASS_READY": "¡Tu tarjeta está lista! Agrégala a tu Wallet.",
 # Pass
    "PASS_NOT_FOUND": "Tarjeta no encontrada.",
    "PASS_NOT_FOUND_INACTIVE": "Pase no encontrado o inactivo.",
    "PASS_EXPIRED": "Esta tarjeta ha expirado.",
    "PASS_REVOKED": "Esta tarjeta ha sido desactivada.",
    "PASS_INVALID_QR": "Código QR inválido.",
    "PASS_QR_REQUIRED": "Código QR requerido.",
    "PASS_RESENT": "Se ha reenviado tu tarjeta a {email}.",
    "EMAIL_SEND_ERROR": "No se pudo enviar el correo. Inténtalo de nuevo más tarde.",
    "PASS_UPDATED": "Tarjeta actualizada en tu Wallet.",
    "PASS_APPLE_GEN_ERROR": "Error al generar el pase de Apple Wallet.",
    "PASS_GOOGLE_GEN_ERROR": "Error al generar la URL de Google Wallet.",
    "PASS_APPLE_NOT_CONFIGURED": "Apple Wallet no está configurado. Se requieren los identificadores y certificados de Apple Developer.",
    "PASS_GOOGLE_NOT_CONFIGURED": "Google Wallet no está configurado. Se requiere la cuenta de servicio de Google Wallet.",
    "PASS_WALLET_PROVIDER_DISABLED": "Esta billetera no está habilitada para la tarjeta.",
    "PASS_DISENROLLED": "Has salido del programa exitosamente.",
    "PASS_QR_INVALID_SIGNATURE": "Firma del código QR inválida.",
    "PASS_QR_EXPIRED": "El código QR ha expirado. Abre tu tarjeta para actualizar el código.",
 # Transactions
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
 # Push Notifications
    "CAMPAIGN_CREATED": "Campaña '{title}' creada exitosamente.",
    "CAMPAIGN_SENT": "Campaña enviada a {count} clientes.",
    "CAMPAIGN_SCHEDULED": "Campaña programada para {datetime}.",
    "CAMPAIGN_NOT_FOUND": "Campaña no encontrada.",
    "CAMPAIGN_EMAIL_STARTED": "Campaña de EMAIL iniciada para segmento '{segment}'. Los clientes recibirán un correo electrónico.",
    "CAMPAIGN_WALLET_STARTED": "Campaña de WALLET iniciada para segmento '{segment}'. Los clientes recibirán una notificación en sus tarjetas.",
    "CAMPAIGN_WHATSAPP_STARTED": "Campaña de WhatsApp iniciada para segmento '{segment}'. Los mensajes se enviarán de forma progresiva (~8 por minuto).",
 # Automation
    "RULE_CREATED": "Regla de automatización '{name}' creada.",
    "RULE_UPDATED": "Regla actualizada.",
    "RULE_ACTIVATED": "Regla '{name}' activada.",
    "RULE_DEACTIVATED": "Regla '{name}' desactivada.",
    "RULE_NOT_FOUND": "Regla de automatización no encontrada.",
 # Billing
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
    "BILLING_PAYMENT_CONFIRMATION_REQUIRED": "No se pudo confirmar el pago. La suscripción no fue activada.",
 # Generic
    "NOT_FOUND": "Recurso no encontrado.",
    "VALIDATION_ERROR": "Error de validación: {detail}",
    "SERVER_ERROR": "Error interno del servidor. Por favor intenta nuevamente.",
    "RATE_LIMITED": "Demasiadas solicitudes. Por favor espera antes de intentar nuevamente.",
 # Devices
    "DEVICE_REGISTERED": "Dispositivo registrado exitosamente.",
    "DEVICE_NOT_FOUND": "Dispositivo no encontrado.",
    "NOTIFICATION_SENT": "Notificación enviada exitosamente.",
    "NOTIFICATION_NOT_FOUND": "Notificación no encontrada.",
    "NOTIFICATION_BIRTHDAY_TITLE": "¡Feliz Cumpleaños!",
    "NOTIFICATION_BIRTHDAY_MSG": "Te deseamos un excelente día. ¡Visita {program_name} y reclama tu regalo especial!",
    "NOTIFICATION_REMINDER_TITLE": "¿Nos extranas?",
    "NOTIFICATION_REMINDER_MSG": "Tienes puntos esperando en {program_name}. ¡Ven a visitarnos!",
 # Customers
    "CUSTOMER_CREATED": "Cliente creado exitosamente.",
    "CUSTOMER_UPDATED": "Cliente actualizado exitosamente.",
    "CUSTOMER_NOT_FOUND": "Cliente no encontrado.",
    "CUSTOMER_REQUIRED": "Perfil de cliente requerido.",
    "CUSTOMER_IMPORT_INVALID_FORMAT": "Formato no soportado. Sube un archivo CSV, XLS o XLSX.",
    "CUSTOMER_IMPORT_FILE_CORRUPT": "El archivo está dañado o tiene un formato inválido.",
    "CUSTOMER_IMPORT_FILE_EMPTY": "El archivo está vacío.",
 # Segments
    "SEGMENT_NOT_FOUND": "Segmento no encontrado.",
 # Automation extended
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
 # Team
    "TEAM_MEMBER_ADDED": "Miembro del equipo agregado exitosamente.",
    "TEAM_MEMBER_UPDATED": "Miembro del equipo actualizado exitosamente.",
    "TEAM_MEMBER_REMOVED": "Miembro del equipo eliminado exitosamente.",
    "TEAM_CANNOT_EDIT_SELF": "No puedes modificar tu propia cuenta desde esta pantalla.",
    "TEAM_CANNOT_DELETE_SELF": "No puedes eliminar tu propia cuenta.",
 # Users
    "USER_NOT_FOUND": "Usuario no encontrado.",
 # Rate Limiting
    "RATE_LIMIT_EXCEEDED": "Demasiadas solicitudes. Intente de nuevo en un momento.",
 # Plan Enforcement
    "PLAN_LIMIT_EXCEEDED": "Has alcanzado el límite de tu plan para {resource} ({limit}). Actualiza tu plan para continuar.",
    "PLAN_FEATURE_UNAVAILABLE": "Esta función no está disponible en tu plan actual. Actualiza para acceder.",
    "PLAN_TRIAL_EXPIRED": "Tu período de prueba ha terminado. Suscríbete para continuar usando Loyallia.",
    "PLAN_UPGRADE_REQUIRED": "Se requiere un plan superior para esta funcionalidad.",
 # Audit
    "AUDIT_ENTRY_CREATED": "Registro de auditoría creado.",
    "AUDIT_IMPERSONATION_REQUIRES_JUSTIFICATION": "Se requiere una justificación para acceder al entorno del negocio.",
    "AUDIT_EXPORT_LOGGED": "Exportación de datos registrada en auditoría.",
 # SuperAdmin
    "ADMIN_PLAN_CREATED": "Plan '{name}' creado exitosamente.",
    "ADMIN_PLAN_UPDATED": "Plan '{name}' actualizado exitosamente.",
    "ADMIN_PLAN_DEACTIVATED": "Plan desactivado exitosamente.",
    "ADMIN_PLAN_REACTIVATED": "Plan '{name}' reactivado exitosamente.",
    "ADMIN_PLAN_HAS_SUBSCRIPTIONS": "No se puede desactivar el plan '{name}' porque tiene {count} suscripción(es) activa(s).",
    "ADMIN_BROADCAST_NO_RECIPIENTS": "No hay propietarios activos para enviar el anuncio.",
    "ADMIN_TENANT_CREATION_FAILED": "Error al crear el negocio: {detail}",
    "ADMIN_WA_OVERRIDE_REMOVED": "Override removido  usando límite del plan.",
    "ADMIN_WA_OVERRIDE_SET": "Override WA establecido: {limit} msgs/día.",
 # SysAdmin Operations (LYL-BOOT-001)
    "ADMIN_DEMO_SEEDED": "Datos de demostración cargados exitosamente.",
    "ADMIN_FACTORY_OTP_SENT": "Código de verificación enviado a su email y teléfono.",
    "ADMIN_FACTORY_OTP_INVALID": "Código inválido o expirado. Intente de nuevo.",
    "ADMIN_FACTORY_NO_CONTACT": "No hay número de teléfono ni email configurado para enviar el código.",
    "ADMIN_FACTORY_RESET_DONE": "Sistema restaurado a estado de fábrica exitosamente.",
    "ADMIN_FACTORY_PRODUCTION_BLOCKED": "Operación bloqueada en modo producción.",
 # Agent API
    "AGENT_KEY_INVALID": "La clave de API del agente es inválida o ha expirado.",
    "AGENT_KEY_CREATED": "Clave de API del agente creada exitosamente.",
    "AGENT_KEY_REVOKED": "Clave de API del agente revocada.",
 # WhatsApp Bridge (LYL-SRS-006)
    "WHATSAPP_BRIDGE_UNAVAILABLE": "El servicio de WhatsApp no está disponible en este momento. Intente más tarde.",
    "WHATSAPP_SESSION_NOT_CONNECTED": "La sesión de WhatsApp no está conectada. Escanea el código QR primero.",
    "WHATSAPP_BRIDGE_ERROR": "Error al enviar mensaje de WhatsApp: {detail}",
 # SMS / Twilio (LYL-SRS-009)
    "SMS_CAMPAIGN_STARTED": "Campaña de SMS iniciada para segmento '{segment}'. Los mensajes se enviarán via Twilio.",
    "SMS_SEND_FAILED": "Error al enviar SMS a {phone}: {detail}",
    "SMS_NOT_CONFIGURED": "El servicio de SMS (Twilio) no está configurado. Configure las credenciales en Vault.",
    "TWILIO_TEST_SENT": "SMS de prueba enviado exitosamente a {phone}.",
    "TWILIO_TEST_FAILED": "Error al enviar SMS de prueba: {detail}",
 # Twilio Verify (LYL-SRS-VERIFY-001)
    "VERIFY_OTP_SENT": "Código de verificación enviado via {channel}.",
    "VERIFY_OTP_FAILED": "Error al enviar código de verificación: {detail}",
    "VERIFY_OTP_INVALID": "Código de verificación inválido o expirado.",
    "VERIFY_OTP_VALID": "Verificación completada exitosamente.",
    "VERIFY_NOT_CONFIGURED": "Twilio Verify no está configurado. Configure el Service SID en la integración.",
    "VERIFY_RATE_LIMITED": "Demasiados intentos de verificación. Espere {minutes} minutos.",
    "FACTORY_RESET_VERIFY_SENT": "Código de verificación para restauración de fábrica enviado via {channel}.",
 # Data Export (LYL-SRS-009 / LOPDP Art.17)
    "DATA_EXPORT_STARTED": "Exportación de datos iniciada. Se descargará un archivo ZIP con toda la información del negocio.",
    "DATA_EXPORT_FAILED": "Error al exportar datos: {detail}",
    "DATA_EXPORT_EMPTY": "No hay datos para exportar.",
    "DATA_EXPORT_EMAIL_SUBJECT": "Tu exportación de datos está lista / Your data export is ready",
    "DATA_EXPORT_EMAIL_BODY": "<p>Hola,</p><p>Tu solicitud de exportación de datos (Art. 17 LOPDP) ha sido completada.</p><p>Puedes descargar el archivo aquí: <a href='{download_url}'>Descargar Datos</a></p><p>Este enlace expirará por razones de seguridad.</p>",
    "DATA_EXPORT_ERROR_SUBJECT": "Error en exportación de datos / Data export error",
    "DATA_EXPORT_ERROR_BODY": "<p>Ocurrió un error al procesar tu solicitud de exportación de datos. Por favor, intenta nuevamente más tarde o contacta a soporte.</p>",
 # AI Assistant (LYL-SRS-009)
    "AI_ASSISTANT_UNAVAILABLE": "El asistente de IA no está disponible en este momento. Intente más tarde.",
    "AI_ASSISTANT_NOT_CONFIGURED": "El asistente de IA no está configurado. Configure la clave API en Vault.",
    "AI_CHAT_ERROR": "Error al procesar mensaje de IA: {detail}",
 # Security PIN (LYL-FR-SEC-030/031)
    "IMPERSONATION_PIN_REQUIRED": "Se requiere el PIN de seguridad del propietario para impersonar.",
    "IMPERSONATION_PIN_INVALID": "PIN de seguridad incorrecto.",
    "IMPERSONATION_PIN_LOCKED": "Impersonación bloqueada por {minutes} minutos tras múltiples intentos fallidos.",
    "SECURITY_PIN_SET": "PIN de seguridad establecido exitosamente.",
    "SECURITY_PIN_INVALID_FORMAT": "El PIN debe ser exactamente 6 dígitos numéricos.",
    "SECURITY_PIN_NOT_SET": "El propietario no tiene un PIN de seguridad configurado. Debe establecerlo primero.",
 # Account Deletion (LYL-FR-DPR-025 / LOPDP Art. 18)
    "ACCOUNT_DELETION_SCHEDULED": "Tu cuenta será eliminada permanentemente en 24 horas. Se ha generado un respaldo de todos tus datos.",
    "ACCOUNT_DELETION_WRONG_PHRASE": "Frase incorrecta. Escriba exactamente: ACEPTO ELIMINACIÓN COMPLETA",
    "ACCOUNT_DELETION_WRONG_PASSWORD": "Contraseña incorrecta. La eliminación no fue procesada.",
    "ACCOUNT_DELETION_COMPLETED": "Cuenta y todos los datos asociados eliminados permanentemente.",
    "ACCOUNT_DELETION_ALREADY_SCHEDULED": "La eliminación de tu cuenta ya fue programada.",
    # Backup & Restore
    "BACKUP_TRIGGERED": "Respaldo iniciado exitosamente.",
    "BACKUP_TRIGGER_FAILED": "Error al iniciar el respaldo: {detail}",
    "BACKUP_VERIFY_INVALID_STATE": "No se puede verificar un respaldo en estado '{status}'. Debe estar completado.",
    "BACKUP_RESTORE_CONFIRM_REQUIRED": "Se requiere confirmación explícita (confirm=true) para restaurar.",
    "BACKUP_RESTORE_NOT_VERIFIED": "Solo se pueden restaurar respaldos verificados.",
    "BACKUP_RESTORE_STARTED": "Restauración iniciada. Este proceso puede tardar varios minutos.",
    "BACKUP_RESTORE_FAILED": "Error al iniciar la restauración: {detail}",
    "BACKUP_CLEANUP_STARTED": "Limpieza de respaldos antiguos iniciada.",
    "BACKUP_CLEANUP_FAILED": "Error al iniciar la limpieza: {detail}",
    "BACKUP_SETTINGS_UPDATED": "Configuración de respaldo actualizada.",
    "BACKUP_FREQUENCY_INVALID": "Frecuencia inválida. Use: hourly, daily, weekly, disabled.",
}


_MESSAGES_EN: dict[str, str] = {
    "AUTH_REGISTER_SUCCESS": "Account created successfully. Please verify your email.",
    "AUTH_LOGIN_SUCCESS": "Login successful.",
    "AUTH_LOGOUT_SUCCESS": "Logged out successfully.",
    "AUTH_INVALID_CREDENTIALS": "Invalid email or password.",
    "AUTH_ACCOUNT_LOCKED": "Account temporarily locked due to multiple failed attempts. Try again in {minutes} minutes.",
    "AUTH_EMAIL_NOT_VERIFIED": "Please verify your email before signing in.",
    "AUTH_EMAIL_VERIFIED": "Email verified successfully.",
    "AUTH_PASSWORD_RESET_SENT": "A reset link has been sent to {email}.",
    "AUTH_PASSWORD_RESET_SUCCESS": "Password reset successfully.",
    "AUTH_PASSWORD_RESET_EXPIRED": "The reset link has expired. Please request a new one.",
    "AUTH_TOKEN_INVALID": "Invalid or expired authentication token.",
    "AUTH_TOKEN_REFRESHED": "Token refreshed successfully.",
    "AUTH_INVITE_SENT": "Invitation sent to {email}.",
    "AUTH_INVITE_INVALID": "The invitation is invalid or has expired.",
    "AUTH_PERMISSION_DENIED": "You do not have permission to perform this action.",
    "AUTH_USER_DEACTIVATED": "User has been deactivated successfully.",
    "AUTH_PROFILE_UPDATED": "Profile updated successfully.",
    "AUTH_PASSWORD_CHANGED": "Password changed successfully.",
    "AUTH_PASSWORD_WRONG": "Current password is incorrect.",
    "AUTH_UNAUTHORIZED": "Unauthorized. Please log in to continue.",
    "AUTH_INVALID_PASSWORD": "Incorrect password.",
    "AUTH_RESET_EMAIL_SENT": "If the email is registered, you will receive a reset link.",
    "AUTH_RESET_INVALID": "The reset link is invalid or has expired.",
    "TENANT_CREATED": "Business registered. Your {days}-day free trial has started.",
    "TENANT_WELCOME_EMAIL_SUBJECT": "Welcome to Loyallia",
    "TENANT_WELCOME_EMAIL_BODY": "Hello {name},\n\nYour business {tenant} was created in Loyallia.\n\nLogin URL: {login_url}\nEmail: {email}\nTemporary password: {password}\nTrial: {trial_days} days\n\nChange this password when you sign in.",
    "TENANT_UPDATED": "Business settings updated.",
    "TENANT_SUSPENDED": "Your account has been suspended. Please update your subscription.",
    "TENANT_DELETED": "Business permanently deleted.",
    "TENANT_TRIAL_EXPIRING": "Your free trial expires in {days} days. Subscribe to continue.",
    "TENANT_TRIAL_EXPIRED": "Your trial period has ended. Subscribe to continue using Loyallia.",
    "TENANT_MAX_PROGRAMS": "You have reached the limit of {max} loyalty programs.",
    "LOCATION_CREATED": "Location '{name}' created successfully.",
    "LOCATION_UPDATED": "Location updated successfully.",
    "LOCATION_DELETED": "Location deleted successfully.",
    "LOCATION_NOT_FOUND": "Location not found.",
    "PROGRAM_CREATED": "Loyalty program '{name}' created successfully.",
    "PROGRAM_UPDATED": "Program updated successfully.",
    "PROGRAM_DEACTIVATED": "Program deactivated. Existing passes will not be affected.",
    "PROGRAM_NOT_FOUND": "Loyalty program not found.",
    "PROGRAM_INVALID_CONFIG": "Invalid configuration for card type {card_type}: {detail}",
    "PROGRAM_DUPLICATE_NAME": "A program with this name already exists.",
    "PROGRAM_DELETED": "Loyalty program permanently deleted.",
    "PROGRAM_SUSPENDED": "Loyalty program suspended successfully.",
    "PROGRAM_REACTIVATED": "Loyalty program reactivated successfully.",
    "ENROLLMENT_SUCCESS": "Welcome to {program_name}! Your card is ready.",
    "ENROLLMENT_DUPLICATE": "You are already enrolled in this program. Resend your card to {email}?",
    "ENROLLMENT_PASS_GENERATING": "Generating your loyalty card...",
    "ENROLLMENT_PASS_READY": "Your card is ready! Add it to your Wallet.",
    "PASS_NOT_FOUND": "Card not found.",
    "PASS_NOT_FOUND_INACTIVE": "Pass not found or inactive.",
    "PASS_EXPIRED": "This card has expired.",
    "PASS_REVOKED": "This card has been deactivated.",
    "PASS_INVALID_QR": "Invalid QR code.",
    "PASS_QR_REQUIRED": "QR code required.",
    "PASS_RESENT": "Your card has been resent to {email}.",
    "EMAIL_SEND_ERROR": "Could not send email. Please try again later.",
    "PASS_UPDATED": "Card updated in your Wallet.",
    "PASS_APPLE_GEN_ERROR": "Error generating Apple Wallet pass.",
    "PASS_GOOGLE_GEN_ERROR": "Error generating Google Wallet URL.",
    "PASS_APPLE_NOT_CONFIGURED": "Apple Wallet is not configured. Apple Developer identifiers and certificates are required.",
    "PASS_GOOGLE_NOT_CONFIGURED": "Google Wallet is not configured. A Google Wallet service account is required.",
    "PASS_WALLET_PROVIDER_DISABLED": "This wallet provider is not enabled for the card.",
    "PASS_QR_INVALID_SIGNATURE": "Invalid QR code signature.",
    "PASS_QR_EXPIRED": "QR code has expired. Open your card to refresh.",
    "TRANSACTION_STAMP_ADDED": "{count} stamp(s) added. Total: {current}/{required}.",
    "TRANSACTION_REWARD_READY": "Congratulations! You have earned your reward: {reward}.",
    "TRANSACTION_REWARD_REDEEMED": "Reward redeemed successfully.",
    "TRANSACTION_CASHBACK_EARNED": "You earned {amount} credit. Total balance: {balance}.",
    "TRANSACTION_CASHBACK_REDEEMED": "{amount} credit applied to your purchase.",
    "TRANSACTION_COUPON_REDEEMED": "Coupon redeemed. {discount} discount applied.",
    "TRANSACTION_COUPON_ALREADY_USED": "This coupon has already been used.",
    "TRANSACTION_GIFT_REDEEMED": "{amount} applied from certificate. Remaining balance: {balance}.",
    "TRANSACTION_GIFT_INSUFFICIENT": "Insufficient balance. Available balance: {balance}.",
    "TRANSACTION_RECORDED": "Transaction recorded successfully.",
    "TRANSACTION_INVALID_AMOUNT": "Transaction amount must be greater than zero.",
    "TRANSACTION_REMOTE_ISSUED": "Reward issued remotely to {customer_name}.",
    "TRANSACTION_SEARCH_MIN_CHARS": "Search must be at least 2 characters.",
    "CAMPAIGN_CREATED": "Campaign '{title}' created successfully.",
    "CAMPAIGN_SENT": "Campaign sent to {count} customers.",
    "CAMPAIGN_SCHEDULED": "Campaign scheduled for {datetime}.",
    "CAMPAIGN_NOT_FOUND": "Campaign not found.",
    "CAMPAIGN_EMAIL_STARTED": "Email campaign started for segment '{segment}'. Customers will receive an email.",
    "CAMPAIGN_WALLET_STARTED": "Wallet campaign started for segment '{segment}'. Customers will receive a card notification.",
    "CAMPAIGN_WHATSAPP_STARTED": "WhatsApp campaign started for segment '{segment}'. Messages will be sent progressively (~8 per minute).",
    "RULE_CREATED": "Automation rule '{name}' created.",
    "RULE_UPDATED": "Rule updated.",
    "RULE_ACTIVATED": "Rule '{name}' activated.",
    "RULE_DEACTIVATED": "Rule '{name}' deactivated.",
    "RULE_NOT_FOUND": "Automation rule not found.",
    "BILLING_SUBSCRIBED": "Subscription activated. Welcome to Loyallia FULL.",
    "BILLING_CANCELLED": "Subscription cancelled. Your access continues until {end_date}.",
    "BILLING_PAYMENT_FAILED": "Payment failed. Please update your payment method.",
    "BILLING_INVOICE_GENERATED": "Invoice generated for {amount}.",
    "BILLING_PLAN_REQUIRED": "An active subscription is required to use this feature.",
    "BILLING_INVALID_CYCLE": "Billing cycle must be 'monthly' or 'annual'.",
    "BILLING_SUBSCRIPTION_CREATED": "Subscription created successfully.",
    "BILLING_SUBSCRIPTION_UPDATED": "Subscription updated successfully.",
    "BILLING_ALREADY_CANCELED": "Subscription is already cancelled.",
    "BILLING_CANCEL_SCHEDULED": "Subscription scheduled for cancellation at period end.",
    "BILLING_NOT_PENDING_CANCEL": "Subscription is not pending cancellation.",
    "BILLING_REACTIVATED": "Subscription reactivated successfully.",
    "BILLING_PAYMENT_METHOD_ADDED": "Payment method added successfully.",
    "BILLING_CANNOT_REMOVE_LAST_PM": "Cannot remove the only payment method while subscription is active.",
    "BILLING_PAYMENT_METHOD_REMOVED": "Payment method removed successfully.",
    "BILLING_DEFAULT_PM_SET": "Default payment method updated successfully.",
    "BILLING_INVALID_SIGNATURE": "Invalid signature.",
    "BILLING_INVALID_PAYLOAD": "Invalid JSON payload.",
    "BILLING_PAYMENT_CONFIRMATION_REQUIRED": "Payment could not be confirmed. Subscription was not activated.",
    "NOT_FOUND": "Resource not found.",
    "VALIDATION_ERROR": "Validation error: {detail}",
    "SERVER_ERROR": "Internal server error. Please try again.",
    "RATE_LIMITED": "Too many requests. Please wait before trying again.",
    "DEVICE_REGISTERED": "Device registered successfully.",
    "DEVICE_NOT_FOUND": "Device not found.",
    "NOTIFICATION_SENT": "Notification sent successfully.",
    "NOTIFICATION_NOT_FOUND": "Notification not found.",
    "NOTIFICATION_BIRTHDAY_TITLE": "Happy Birthday!",
    "NOTIFICATION_BIRTHDAY_MSG": "We wish you an excellent day. Visit {program_name} and claim your special gift!",
    "NOTIFICATION_REMINDER_TITLE": "Miss us?",
    "NOTIFICATION_REMINDER_MSG": "You have points waiting at {program_name}. Come visit us!",
    "CUSTOMER_CREATED": "Customer created successfully.",
    "CUSTOMER_UPDATED": "Customer updated successfully.",
    "CUSTOMER_NOT_FOUND": "Customer not found.",
    "CUSTOMER_REQUIRED": "Customer profile required.",
    "CUSTOMER_IMPORT_INVALID_FORMAT": "Unsupported format. Upload a CSV, XLS or XLSX file.",
    "CUSTOMER_IMPORT_FILE_CORRUPT": "File is corrupted or has an invalid format.",
    "CUSTOMER_IMPORT_FILE_EMPTY": "File is empty.",
    "SEGMENT_NOT_FOUND": "Segment not found.",
    "AUTOMATION_CREATED": "Automation '{name}' created successfully.",
    "AUTOMATION_UPDATED": "Automation updated successfully.",
    "AUTOMATION_DELETED": "Automation deleted successfully.",
    "AUTOMATION_ENABLED": "Automation '{name}' enabled.",
    "AUTOMATION_DISABLED": "Automation '{name}' disabled.",
    "AUTOMATION_EXECUTED": "Automation executed successfully.",
    "AUTOMATION_FAILED": "Automation execution failed.",
    "AUTOMATION_INVALID_TRIGGER": "Invalid trigger: {trigger}",
    "AUTOMATION_INVALID_ACTION": "Invalid action: {action}",
    "AUTOMATION_NOT_FOUND": "Automation not found.",
    "TEAM_MEMBER_ADDED": "Team member added successfully.",
    "TEAM_MEMBER_UPDATED": "Team member updated successfully.",
    "TEAM_MEMBER_REMOVED": "Team member removed successfully.",
    "TEAM_CANNOT_EDIT_SELF": "You cannot modify your own account from this screen.",
    "TEAM_CANNOT_DELETE_SELF": "You cannot delete your own account.",
    "USER_NOT_FOUND": "User not found.",
    "RATE_LIMIT_EXCEEDED": "Too many requests. Please try again in a moment.",
    "PLAN_LIMIT_EXCEEDED": "You have reached the limit for {resource} ({limit}). Upgrade your plan to continue.",
    "PLAN_FEATURE_UNAVAILABLE": "This feature is not available in your current plan. Upgrade to access.",
    "PLAN_TRIAL_EXPIRED": "Your trial period has ended. Subscribe to continue using Loyallia.",
    "PLAN_UPGRADE_REQUIRED": "A higher plan is required for this functionality.",
    "AUDIT_ENTRY_CREATED": "Audit entry created.",
    "AUDIT_IMPERSONATION_REQUIRES_JUSTIFICATION": "A justification is required to access the tenant environment.",
    "AUDIT_EXPORT_LOGGED": "Data export logged in audit trail.",
    "ADMIN_PLAN_CREATED": "Plan '{name}' created successfully.",
    "ADMIN_PLAN_UPDATED": "Plan '{name}' updated successfully.",
    "ADMIN_PLAN_DEACTIVATED": "Plan deactivated successfully.",
    "ADMIN_PLAN_REACTIVATED": "Plan '{name}' reactivated successfully.",
    "ADMIN_PLAN_HAS_SUBSCRIPTIONS": "Cannot deactivate plan '{name}' because it has {count} active subscription(s).",
    "ADMIN_BROADCAST_NO_RECIPIENTS": "No active owners to broadcast to.",
    "ADMIN_TENANT_CREATION_FAILED": "Error creating tenant: {detail}",
    "ADMIN_WA_OVERRIDE_REMOVED": "Override removed  using plan default.",
    "ADMIN_WA_OVERRIDE_SET": "WA override set: {limit} msgs/day.",
 # SysAdmin Operations (LYL-BOOT-001)
    "ADMIN_DEMO_SEEDED": "Demo data loaded successfully.",
    "ADMIN_FACTORY_OTP_SENT": "Verification code sent to your email and phone.",
    "ADMIN_FACTORY_OTP_INVALID": "Invalid or expired code. Try again.",
    "ADMIN_FACTORY_NO_CONTACT": "No phone number or email configured to send the code.",
    "ADMIN_FACTORY_RESET_DONE": "System restored to factory state successfully.",
    "ADMIN_FACTORY_PRODUCTION_BLOCKED": "Operation blocked in production mode.",
    "AGENT_KEY_INVALID": "Agent API key is invalid or has expired.",
    "AGENT_KEY_CREATED": "Agent API key created successfully.",
    "AGENT_KEY_REVOKED": "Agent API key revoked.",
 # WhatsApp Bridge (LYL-SRS-006)
    "WHATSAPP_BRIDGE_UNAVAILABLE": "WhatsApp service is not available at this time. Please try later.",
    "WHATSAPP_SESSION_NOT_CONNECTED": "WhatsApp session is not connected. Scan the QR code first.",
    "WHATSAPP_BRIDGE_ERROR": "Error sending WhatsApp message: {detail}",
 # SMS / Twilio (LYL-SRS-009)
    "SMS_CAMPAIGN_STARTED": "SMS campaign started for segment '{segment}'. Messages will be sent via Twilio.",
    "SMS_SEND_FAILED": "Error sending SMS to {phone}: {detail}",
    "SMS_NOT_CONFIGURED": "SMS service (Twilio) is not configured. Set credentials in Vault.",
    "TWILIO_TEST_SENT": "Test SMS sent successfully to {phone}.",
    "TWILIO_TEST_FAILED": "Error sending test SMS: {detail}",
 # Twilio Verify (LYL-SRS-VERIFY-001)
    "VERIFY_OTP_SENT": "Verification code sent via {channel}.",
    "VERIFY_OTP_FAILED": "Error sending verification code: {detail}",
    "VERIFY_OTP_INVALID": "Invalid or expired verification code.",
    "VERIFY_OTP_VALID": "Verification completed successfully.",
    "VERIFY_NOT_CONFIGURED": "Twilio Verify is not configured. Set the Service SID in the integration.",
    "VERIFY_RATE_LIMITED": "Too many verification attempts. Wait {minutes} minutes.",
    "FACTORY_RESET_VERIFY_SENT": "Factory reset verification code sent via {channel}.",
 # Data Export (LYL-SRS-009 / LOPDP Art.17)
    "DATA_EXPORT_STARTED": "Data export started. A ZIP file with all business data will be downloaded.",
    "DATA_EXPORT_FAILED": "Error exporting data: {detail}",
    "DATA_EXPORT_EMPTY": "No data to export.",
    "DATA_EXPORT_EMAIL_SUBJECT": "Your data export is ready / Tu exportación de datos está lista",
    "DATA_EXPORT_EMAIL_BODY": "<p>Hello,</p><p>Your data export request (Art. 17 LOPDP) has been completed.</p><p>You can download the file here: <a href='{download_url}'>Download Data</a></p><p>This link will expire for security reasons.</p>",
    "DATA_EXPORT_ERROR_SUBJECT": "Data export error / Error en exportación de datos",
    "DATA_EXPORT_ERROR_BODY": "<p>An error occurred while processing your data export request. Please try again later or contact support.</p>",
 # AI Assistant (LYL-SRS-009)
    "AI_ASSISTANT_UNAVAILABLE": "AI assistant is not available at this time. Please try later.",
    "AI_ASSISTANT_NOT_CONFIGURED": "AI assistant is not configured. Set the API key in Vault.",
    "AI_CHAT_ERROR": "Error processing AI message: {detail}",
 # Security PIN (LYL-FR-SEC-030/031)
    "IMPERSONATION_PIN_REQUIRED": "Owner security PIN is required for impersonation.",
    "IMPERSONATION_PIN_INVALID": "Invalid security PIN.",
    "IMPERSONATION_PIN_LOCKED": "Impersonation locked for {minutes} minutes after multiple failed attempts.",
    "SECURITY_PIN_SET": "Security PIN set successfully.",
    "SECURITY_PIN_INVALID_FORMAT": "PIN must be exactly 6 numeric digits.",
    "SECURITY_PIN_NOT_SET": "Owner has no security PIN configured. They must set it first.",
 # Account Deletion (LYL-FR-DPR-025 / LOPDP Art. 18)
    "ACCOUNT_DELETION_SCHEDULED": "Your account will be permanently deleted in 24 hours. A backup of all your data has been generated.",
    "ACCOUNT_DELETION_WRONG_PHRASE": "Incorrect phrase. Type exactly: ACEPTO ELIMINACIÓN COMPLETA",
    "ACCOUNT_DELETION_WRONG_PASSWORD": "Incorrect password. Deletion was not processed.",
    "ACCOUNT_DELETION_COMPLETED": "Account and all associated data permanently deleted.",
    "ACCOUNT_DELETION_ALREADY_SCHEDULED": "Account deletion has already been scheduled.",
    # Backup & Restore
    "BACKUP_TRIGGERED": "Backup started successfully.",
    "BACKUP_TRIGGER_FAILED": "Failed to start backup: {detail}",
    "BACKUP_VERIFY_INVALID_STATE": "Cannot verify a backup in status '{status}'. Must be completed.",
    "BACKUP_RESTORE_CONFIRM_REQUIRED": "Explicit confirmation (confirm=true) is required to restore.",
    "BACKUP_RESTORE_NOT_VERIFIED": "Only verified backups can be restored.",
    "BACKUP_RESTORE_STARTED": "Restore started. This process may take several minutes.",
    "BACKUP_RESTORE_FAILED": "Failed to start restore: {detail}",
    "BACKUP_CLEANUP_STARTED": "Old backup cleanup started.",
    "BACKUP_CLEANUP_FAILED": "Failed to start cleanup: {detail}",
    "BACKUP_SETTINGS_UPDATED": "Backup settings updated.",
    "BACKUP_FREQUENCY_INVALID": "Invalid frequency. Use: hourly, daily, weekly, disabled.",
}


_MESSAGES_FR: dict[str, str] = {
    "AUTH_REGISTER_SUCCESS": "Compte créé avec succès. Veuillez vérifier votre e-mail.",
    "AUTH_LOGIN_SUCCESS": "Connexion réussie.",
    "AUTH_LOGOUT_SUCCESS": "Déconnexion réussie.",
    "AUTH_INVALID_CREDENTIALS": "E-mail ou mot de passe incorrect.",
    "AUTH_PERMISSION_DENIED": "Vous n'avez pas la permission d'effectuer cette action.",
    "AUTH_UNAUTHORIZED": "Non autorisé. Veuillez vous connecter pour continuer.",
    "AUTH_INVALID_PASSWORD": "Mot de passe incorrect.",
    "NOT_FOUND": "Ressource introuvable.",
    "BILLING_PLAN_REQUIRED": "Un abonnement actif est requis pour utiliser cette fonctionnalité.",
    "PLAN_LIMIT_EXCEEDED": "Vous avez atteint la limite pour {resource} ({limit}). Améliorez votre plan.",
    "PLAN_FEATURE_UNAVAILABLE": "Cette fonctionnalité n'est pas disponible dans votre plan actuel.",
    "PASS_DISENROLLED": "Vous avez quitté le programme avec succès.",
}


_MESSAGES_DE: dict[str, str] = {
    "AUTH_REGISTER_SUCCESS": "Konto erfolgreich erstellt. Bitte bestätigen Sie Ihre E-Mail.",
    "AUTH_LOGIN_SUCCESS": "Anmeldung erfolgreich.",
    "AUTH_LOGOUT_SUCCESS": "Erfolgreich abgemeldet.",
    "AUTH_INVALID_CREDENTIALS": "Ungültige E-Mail oder Passwort.",
    "AUTH_PERMISSION_DENIED": "Sie haben keine Berechtigung für diese Aktion.",
    "AUTH_UNAUTHORIZED": "Nicht autorisiert. Bitte melden Sie sich an.",
    "AUTH_INVALID_PASSWORD": "Falsches Passwort.",
    "NOT_FOUND": "Ressource nicht gefunden.",
    "BILLING_PLAN_REQUIRED": "Ein aktives Abonnement ist erforderlich.",
    "ADMIN_PLAN_HAS_SUBSCRIPTIONS": "Plan '{name}' kann nicht deaktiviert werden, da er {count} aktive Abonnement(s) hat.",
    "PLAN_LIMIT_EXCEEDED": "Limit für {resource} ({limit}) erreicht. Upgraden Sie Ihren Plan.",
    "PLAN_FEATURE_UNAVAILABLE": "Diese Funktion ist in Ihrem aktuellen Plan nicht verfügbar.",
    "PASS_DISENROLLED": "Sie haben das Programm erfolgreich verlassen.",
}


# CATALOG REGISTRY

_CATALOGS: dict[str, dict[str, str]] = {
    "es": _MESSAGES_ES,
    "en": _MESSAGES_EN,
    "fr": _MESSAGES_FR,
    "de": _MESSAGES_DE,
}


# PUBLIC API


def get_message(code: str, lang: str | None = None, **kwargs: Any) -> str:
    """
    Retrieve a user-facing message by code with i18n support.

    Args:
        code: Message code key (e.g. "AUTH_LOGIN_SUCCESS")
        lang: ISO 639-1 language code (es, en, fr, de). None = default.
        **kwargs: Values to interpolate into the message template

    Returns:
        Formatted message string in the requested language.
        Falls back to Spanish if translation is missing.
    """
    if lang is None:
        configured_lang = getattr(settings, "LANGUAGE_CODE", DEFAULT_LANGUAGE)
        lang = str(configured_lang) if configured_lang is not None else DEFAULT_LANGUAGE

 # Normalize: "es-ec" → "es"
    lang = lang[:2].lower()

 # Try requested language, then fall back to Spanish
    catalog = _CATALOGS.get(lang, _MESSAGES_ES)
    template = catalog.get(code)
    if template is None:
 # Fallback to Spanish canonical catalog
        template = _MESSAGES_ES.get(code)
    if template is None:
        raise KeyError(f"Unknown message code: '{code}'")

    if kwargs:
        return template.format(**kwargs)
    return template


def get_message_for_request(code: str, request=None, **kwargs: Any) -> str:
    """
    Retrieve a message using the language from the request context.
    Resolution: User.preferred_language → Tenant.default_language → settings.

    Args:
        code: Message code key
        request: Django HttpRequest (optional)
        **kwargs: Interpolation values
    """
    lang = None

    if request is not None:
 # 1. User preference
        user = getattr(request, "user", None)
        if user and hasattr(user, "preferred_language") and user.preferred_language:
            lang = user.preferred_language

 # 2. Tenant default
        if not lang:
            tenant = getattr(request, "tenant", None)
            if tenant and hasattr(tenant, "default_language") and tenant.default_language:
                lang = tenant.default_language

 # 3. Accept-Language header
        if not lang:
            accept_lang = request.META.get("HTTP_ACCEPT_LANGUAGE", "")
            if accept_lang:
                lang = accept_lang[:2].lower()

    return get_message(code, lang=lang, **kwargs)


def register_message(code: str, template: str, lang: str = "es") -> None:
    """
    Register a new message code (for use by individual apps).
    Raises ValueError if code conflicts with existing registration in that language.
    """
    catalog = _CATALOGS.get(lang, _MESSAGES_ES)
    if code in catalog:
        raise ValueError(f"Message code '{code}' is already registered for '{lang}'.")
    catalog[code] = template
