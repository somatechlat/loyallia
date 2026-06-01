"""
Billing messages: plan, subscription, invoice, payment.
"""

_MESSAGES_ES: dict[str, str] = {
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
    "BILLING_CANNOT_REMOVE_LAST_PM": "No se puede eliminar el único método de pago mientras la suscripción esté activa.",# noqa: E501
    "BILLING_PAYMENT_METHOD_REMOVED": "Método de pago eliminado exitosamente.",
    "BILLING_DEFAULT_PM_SET": "Método de pago predeterminado actualizado exitosamente.",
    "BILLING_INVALID_SIGNATURE": "Firma inválida.",
    "BILLING_INVALID_PAYLOAD": "Payload JSON inválido.",
    "BILLING_PAYMENT_CONFIRMATION_REQUIRED": "No se pudo confirmar el pago. La suscripción no fue activada.",
    # Plan Enforcement
    "PLAN_LIMIT_EXCEEDED": "Has alcanzado el límite de tu plan para {resource} ({limit}). Actualiza tu plan para continuar.",# noqa: E501
    "PLAN_FEATURE_UNAVAILABLE": "Esta función no está disponible en tu plan actual. Actualiza para acceder.",
    "PLAN_TRIAL_EXPIRED": "Tu período de prueba ha terminado. Suscríbete para continuar usando Loyallia.",
    "PLAN_UPGRADE_REQUIRED": "Se requiere un plan superior para esta funcionalidad.",
    # SuperAdmin
    "ADMIN_PLAN_CREATED": "Plan '{name}' creado exitosamente.",
    "ADMIN_PLAN_UPDATED": "Plan '{name}' actualizado exitosamente.",
    "ADMIN_PLAN_DEACTIVATED": "Plan desactivado exitosamente.",
    "ADMIN_PLAN_REACTIVATED": "Plan '{name}' reactivado exitosamente.",
    "ADMIN_PLAN_HAS_SUBSCRIPTIONS": "No se puede desactivar el plan '{name}' porque tiene {count} suscripción(es) activa(s).",# noqa: E501
}

_MESSAGES_EN: dict[str, str] = {
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
    # Plan Enforcement
    "PLAN_LIMIT_EXCEEDED": "You have reached the limit for {resource} ({limit}). Upgrade your plan to continue.",
    "PLAN_FEATURE_UNAVAILABLE": "This feature is not available in your current plan. Upgrade to access.",
    "PLAN_TRIAL_EXPIRED": "Your trial period has ended. Subscribe to continue using Loyallia.",
    "PLAN_UPGRADE_REQUIRED": "A higher plan is required for this functionality.",
    # SuperAdmin
    "ADMIN_PLAN_CREATED": "Plan '{name}' created successfully.",
    "ADMIN_PLAN_UPDATED": "Plan '{name}' updated successfully.",
    "ADMIN_PLAN_DEACTIVATED": "Plan deactivated successfully.",
    "ADMIN_PLAN_REACTIVATED": "Plan '{name}' reactivated successfully.",
    "ADMIN_PLAN_HAS_SUBSCRIPTIONS": "Cannot deactivate plan '{name}' because it has {count} active subscription(s).",
}

_MESSAGES_FR: dict[str, str] = {
    "BILLING_PLAN_REQUIRED": "Un abonnement actif est requis pour utiliser cette fonctionnalité.",
    "PLAN_LIMIT_EXCEEDED": "Vous avez atteint la limite pour {resource} ({limit}). Améliorez votre plan.",
    "PLAN_FEATURE_UNAVAILABLE": "Cette fonctionnalité n'est pas disponible dans votre plan actuel.",
}

_MESSAGES_DE: dict[str, str] = {
    "BILLING_PLAN_REQUIRED": "Ein aktives Abonnement ist erforderlich.",
    "ADMIN_PLAN_HAS_SUBSCRIPTIONS": "Plan '{name}' kann nicht deaktiviert werden, da er {count} aktive Abonnement(s) hat.",# noqa: E501
    "PLAN_LIMIT_EXCEEDED": "Limit für {resource} ({limit}) erreicht. Upgraden Sie Ihren Plan.",
    "PLAN_FEATURE_UNAVAILABLE": "Diese Funktion ist in Ihrem aktuellen Plan nicht verfügbar.",
}
