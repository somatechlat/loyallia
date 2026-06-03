"""
Common messages: generic validation, error, success, system, tenant, location,
programs, enrollment, pass, transactions, redemption, customers, segments,
automation, team, users, audit, admin operations, data export, AI assistant,
account deletion, backup & restore.
"""

_MESSAGES_ES: dict[str, str] = {
    # Generic
    "NOT_FOUND": "Recurso no encontrado.",
    "VALIDATION_ERROR": "Error de validación: {detail}",
    "SERVER_ERROR": "Error interno del servidor. Por favor intenta nuevamente.",
    "RATE_LIMITED": "Demasiadas solicitudes. Por favor espera antes de intentar nuevamente.",
    # Tenant
    "TENANT_CREATED": "Negocio registrado. Tu prueba gratuita de {days} días ha comenzado.",
    "TENANT_WELCOME_EMAIL_SUBJECT": "Bienvenido a Loyallia",
    "TENANT_WELCOME_EMAIL_BODY": "Hola {name},\n\nTu negocio {tenant} fue creado en Loyallia.\n\nURL de acceso: {login_url}\nEmail: {email}\nContraseña temporal: {password}\nPrueba: {trial_days} días\n\nCambia esta contraseña al iniciar sesión.",  # noqa: E501
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
    "PASS_APPLE_NOT_CONFIGURED": "Apple Wallet no está configurado. Se requieren los identificadores y certificados de Apple Developer.",  # noqa: E501
    "PASS_GOOGLE_NOT_CONFIGURED": "Google Wallet no está configurado. Se requiere la cuenta de servicio de Google Wallet.",  # noqa: E501
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
    # Redemption Rules
    "REDEMPTION_USAGE_LIMIT_PER_CUSTOMER_EXCEEDED": "Has alcanzado el límite de {limit} uso(s) por cliente ({used} usado(s)).",  # noqa: E501
    "REDEMPTION_USAGE_LIMIT_GLOBAL_EXCEEDED": "Este beneficio ha alcanzado su límite global de {limit} redenciones ({used} usada(s)).",  # noqa: E501
    "REDEMPTION_NOT_STARTED_YET": "Este beneficio aún no está activo. Válido desde {valid_from}.",
    "REDEMPTION_EXPIRED": "Este beneficio ha expirado. Válido hasta {valid_until}.",
    "REDEMPTION_DAY_NOT_ALLOWED": "Este beneficio no puede canjearse hoy ({day}).",
    "REDEMPTION_HOURS_NOT_ALLOWED": "Este beneficio solo puede canjearse entre {start} y {end}.",
    "REDEMPTION_COOLDOWN_ACTIVE": "Debes esperar {cooldown_hours} hora(s) entre canjes. Tiempo restante: {remaining_minutes} minuto(s).",  # noqa: E501
    "REDEMPTION_LOCATION_NOT_ALLOWED": "Esta ubicación no está autorizada para canjear este beneficio.",
    "REDEMPTION_MIN_PURCHASE_NOT_MET": "La compra mínima requerida es {min_purchase}. Monto actual: {amount}.",
    "REDEMPTION_MAX_PURCHASE_EXCEEDED": "La compra máxima permitida es {max_purchase}. Monto actual: {amount}.",
    "REDEMPTION_STAFF_ROLE_NOT_ALLOWED": "Tu rol no tiene permiso para canjear este beneficio.",
    # Automation
    "RULE_CREATED": "Regla de automatización '{name}' creada.",
    "RULE_UPDATED": "Regla actualizada.",
    "RULE_ACTIVATED": "Regla '{name}' activada.",
    "RULE_DEACTIVATED": "Regla '{name}' desactivada.",
    "RULE_NOT_FOUND": "Regla de automatización no encontrada.",
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
    # Audit
    "AUDIT_ENTRY_CREATED": "Registro de auditoría creado.",
    "AUDIT_IMPERSONATION_REQUIRES_JUSTIFICATION": "Se requiere una justificación para acceder al entorno del negocio.",
    "AUDIT_EXPORT_LOGGED": "Exportación de datos registrada en auditoría.",
    # SuperAdmin
    "ADMIN_BROADCAST_NO_RECIPIENTS": "No hay propietarios activos para enviar el anuncio.",
    "ADMIN_TENANT_CREATION_FAILED": "Error al crear el negocio: {detail}",
    # SysAdmin Operations
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
    # Data Export (LOPDP Art.17)
    "DATA_EXPORT_STARTED": "Exportación de datos iniciada. Se descargará un archivo ZIP con toda la información del negocio.",  # noqa: E501
    "DATA_EXPORT_FAILED": "Error al exportar datos: {detail}",
    "DATA_EXPORT_EMPTY": "No hay datos para exportar.",
    "DATA_EXPORT_EMAIL_SUBJECT": "Tu exportación de datos está lista / Your data export is ready",
    "DATA_EXPORT_EMAIL_BODY": "<p>Hola,</p><p>Tu solicitud de exportación de datos (Art. 17 LOPDP) ha sido completada.</p><p>Puedes descargar el archivo aquí: <a href='{download_url}'>Descargar Datos</a></p><p>Este enlace expirará por razones de seguridad.</p>",  # noqa: E501
    "DATA_EXPORT_ERROR_SUBJECT": "Error en exportación de datos / Data export error",
    "DATA_EXPORT_ERROR_BODY": "<p>Ocurrió un error al procesar tu solicitud de exportación de datos. Por favor, intenta nuevamente más tarde o contacta a soporte.</p>",  # noqa: E501
    # AI Assistant
    "AI_ASSISTANT_UNAVAILABLE": "El asistente de IA no está disponible en este momento. Intente más tarde.",
    "AI_ASSISTANT_NOT_CONFIGURED": "El asistente de IA no está configurado. Configure la clave API en Vault.",
    "AI_CHAT_ERROR": "Error al procesar mensaje de IA: {detail}",
    # Account Deletion (LOPDP Art. 18)
    "ACCOUNT_DELETION_SCHEDULED": "Tu cuenta será eliminada permanentemente en 24 horas. Se ha generado un respaldo de todos tus datos.",  # noqa: E501
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
    # Generic
    "NOT_FOUND": "Resource not found.",
    "VALIDATION_ERROR": "Validation error: {detail}",
    "SERVER_ERROR": "Internal server error. Please try again.",
    "RATE_LIMITED": "Too many requests. Please wait before trying again.",
    # Tenant
    "TENANT_CREATED": "Business registered. Your {days}-day free trial has started.",
    "TENANT_WELCOME_EMAIL_SUBJECT": "Welcome to Loyallia",
    "TENANT_WELCOME_EMAIL_BODY": "Hello {name},\n\nYour business {tenant} was created in Loyallia.\n\nLogin URL: {login_url}\nEmail: {email}\nTemporary password: {password}\nTrial: {trial_days} days\n\nChange this password when you sign in.",  # noqa: E501
    "TENANT_UPDATED": "Business settings updated.",
    "TENANT_SUSPENDED": "Your account has been suspended. Please update your subscription.",
    "TENANT_DELETED": "Business permanently deleted.",
    "TENANT_TRIAL_EXPIRING": "Your free trial expires in {days} days. Subscribe to continue.",
    "TENANT_TRIAL_EXPIRED": "Your trial period has ended. Subscribe to continue using Loyallia.",
    "TENANT_MAX_PROGRAMS": "You have reached the limit of {max} loyalty programs.",
    # Location
    "LOCATION_CREATED": "Location '{name}' created successfully.",
    "LOCATION_UPDATED": "Location updated successfully.",
    "LOCATION_DELETED": "Location deleted successfully.",
    "LOCATION_NOT_FOUND": "Location not found.",
    # Loyalty Programs
    "PROGRAM_CREATED": "Loyalty program '{name}' created successfully.",
    "PROGRAM_UPDATED": "Program updated successfully.",
    "PROGRAM_DEACTIVATED": "Program deactivated. Existing passes will not be affected.",
    "PROGRAM_NOT_FOUND": "Loyalty program not found.",
    "PROGRAM_INVALID_CONFIG": "Invalid configuration for card type {card_type}: {detail}",
    "PROGRAM_DUPLICATE_NAME": "A program with this name already exists.",
    "PROGRAM_DELETED": "Loyalty program permanently deleted.",
    "PROGRAM_SUSPENDED": "Loyalty program suspended successfully.",
    "PROGRAM_REACTIVATED": "Loyalty program reactivated successfully.",
    # Enrollment
    "ENROLLMENT_SUCCESS": "Welcome to {program_name}! Your card is ready.",
    "ENROLLMENT_DUPLICATE": "You are already enrolled in this program. Resend your card to {email}?",
    "ENROLLMENT_PASS_GENERATING": "Generating your loyalty card...",
    "ENROLLMENT_PASS_READY": "Your card is ready! Add it to your Wallet.",
    # Pass
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
    "PASS_APPLE_NOT_CONFIGURED": "Apple Wallet is not configured. Apple Developer identifiers and certificates are required.",  # noqa: E501
    "PASS_GOOGLE_NOT_CONFIGURED": "Google Wallet is not configured. A Google Wallet service account is required.",
    "PASS_WALLET_PROVIDER_DISABLED": "This wallet provider is not enabled for the card.",
    "PASS_QR_INVALID_SIGNATURE": "Invalid QR code signature.",
    "PASS_QR_EXPIRED": "QR code has expired. Open your card to refresh.",
    # Transactions
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
    # Redemption Rules
    "REDEMPTION_USAGE_LIMIT_PER_CUSTOMER_EXCEEDED": "You have reached the limit of {limit} use(s) per customer ({used} used).",  # noqa: E501
    "REDEMPTION_USAGE_LIMIT_GLOBAL_EXCEEDED": "This benefit has reached its global limit of {limit} redemptions ({used} used).",  # noqa: E501
    "REDEMPTION_NOT_STARTED_YET": "This benefit is not yet active. Valid from {valid_from}.",
    "REDEMPTION_EXPIRED": "This benefit has expired. Valid until {valid_until}.",
    "REDEMPTION_DAY_NOT_ALLOWED": "This benefit cannot be redeemed today ({day}).",
    "REDEMPTION_HOURS_NOT_ALLOWED": "This benefit can only be redeemed between {start} and {end}.",
    "REDEMPTION_COOLDOWN_ACTIVE": "You must wait {cooldown_hours} hour(s) between redemptions. Remaining time: {remaining_minutes} minute(s).",  # noqa: E501
    "REDEMPTION_LOCATION_NOT_ALLOWED": "This location is not authorized to redeem this benefit.",
    "REDEMPTION_MIN_PURCHASE_NOT_MET": "Minimum purchase required is {min_purchase}. Current amount: {amount}.",
    "REDEMPTION_MAX_PURCHASE_EXCEEDED": "Maximum purchase allowed is {max_purchase}. Current amount: {amount}.",
    "REDEMPTION_STAFF_ROLE_NOT_ALLOWED": "Your role is not permitted to redeem this benefit.",
    # Automation
    "RULE_CREATED": "Automation rule '{name}' created.",
    "RULE_UPDATED": "Rule updated.",
    "RULE_ACTIVATED": "Rule '{name}' activated.",
    "RULE_DEACTIVATED": "Rule '{name}' deactivated.",
    "RULE_NOT_FOUND": "Automation rule not found.",
    # Customers
    "CUSTOMER_CREATED": "Customer created successfully.",
    "CUSTOMER_UPDATED": "Customer updated successfully.",
    "CUSTOMER_NOT_FOUND": "Customer not found.",
    "CUSTOMER_REQUIRED": "Customer profile required.",
    "CUSTOMER_IMPORT_INVALID_FORMAT": "Unsupported format. Upload a CSV, XLS or XLSX file.",
    "CUSTOMER_IMPORT_FILE_CORRUPT": "File is corrupted or has an invalid format.",
    "CUSTOMER_IMPORT_FILE_EMPTY": "File is empty.",
    # Segments
    "SEGMENT_NOT_FOUND": "Segment not found.",
    # Automation extended
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
    # Team
    "TEAM_MEMBER_ADDED": "Team member added successfully.",
    "TEAM_MEMBER_UPDATED": "Team member updated successfully.",
    "TEAM_MEMBER_REMOVED": "Team member removed successfully.",
    "TEAM_CANNOT_EDIT_SELF": "You cannot modify your own account from this screen.",
    "TEAM_CANNOT_DELETE_SELF": "You cannot delete your own account.",
    # Users
    "USER_NOT_FOUND": "User not found.",
    # Rate Limiting
    "RATE_LIMIT_EXCEEDED": "Too many requests. Please try again in a moment.",
    # Audit
    "AUDIT_ENTRY_CREATED": "Audit entry created.",
    "AUDIT_IMPERSONATION_REQUIRES_JUSTIFICATION": "A justification is required to access the tenant environment.",
    "AUDIT_EXPORT_LOGGED": "Data export logged in audit trail.",
    # SuperAdmin
    "ADMIN_BROADCAST_NO_RECIPIENTS": "No active owners to broadcast to.",
    "ADMIN_TENANT_CREATION_FAILED": "Error creating tenant: {detail}",
    # SysAdmin Operations
    "ADMIN_DEMO_SEEDED": "Demo data loaded successfully.",
    "ADMIN_FACTORY_OTP_SENT": "Verification code sent to your email and phone.",
    "ADMIN_FACTORY_OTP_INVALID": "Invalid or expired code. Try again.",
    "ADMIN_FACTORY_NO_CONTACT": "No phone number or email configured to send the code.",
    "ADMIN_FACTORY_RESET_DONE": "System restored to factory state successfully.",
    "ADMIN_FACTORY_PRODUCTION_BLOCKED": "Operation blocked in production mode.",
    # Agent API
    "AGENT_KEY_INVALID": "Agent API key is invalid or has expired.",
    "AGENT_KEY_CREATED": "Agent API key created successfully.",
    "AGENT_KEY_REVOKED": "Agent API key revoked.",
    # Data Export (LOPDP Art.17)
    "DATA_EXPORT_STARTED": "Data export started. A ZIP file with all business data will be downloaded.",
    "DATA_EXPORT_FAILED": "Error exporting data: {detail}",
    "DATA_EXPORT_EMPTY": "No data to export.",
    "DATA_EXPORT_EMAIL_SUBJECT": "Your data export is ready / Tu exportación de datos está lista",
    "DATA_EXPORT_EMAIL_BODY": "<p>Hello,</p><p>Your data export request (Art. 17 LOPDP) has been completed.</p><p>You can download the file here: <a href='{download_url}'>Download Data</a></p><p>This link will expire for security reasons.</p>",  # noqa: E501
    "DATA_EXPORT_ERROR_SUBJECT": "Data export error / Error en exportación de datos",
    "DATA_EXPORT_ERROR_BODY": "<p>An error occurred while processing your data export request. Please try again later or contact support.</p>",  # noqa: E501
    # AI Assistant
    "AI_ASSISTANT_UNAVAILABLE": "AI assistant is not available at this time. Please try later.",
    "AI_ASSISTANT_NOT_CONFIGURED": "AI assistant is not configured. Set the API key in Vault.",
    "AI_CHAT_ERROR": "Error processing AI message: {detail}",
    # Account Deletion (LOPDP Art. 18)
    "ACCOUNT_DELETION_SCHEDULED": "Your account will be permanently deleted in 24 hours. A backup of all your data has been generated.",  # noqa: E501
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
    "NOT_FOUND": "Ressource introuvable.",
    "PASS_DISENROLLED": "Vous avez quitté le programme avec succès.",
}

_MESSAGES_DE: dict[str, str] = {
    "NOT_FOUND": "Ressource nicht gefunden.",
    "PASS_DISENROLLED": "Sie haben das Programm erfolgreich verlassen.",
}
