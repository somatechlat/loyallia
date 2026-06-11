"""
Loyallia Transactions Messages
"""

_MESSAGES_ES: dict[str, str] = {
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
}

_MESSAGES_EN: dict[str, str] = {
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
}

_MESSAGES_FR: dict[str, str] = {
    "REDEMPTION_COOLDOWN_ACTIVE": "You must wait {cooldown_hours} hour(s) between redemptions. Remaining time: {remaining_minutes} minute(s).",
    "REDEMPTION_DAY_NOT_ALLOWED": "This benefit cannot be redeemed today ({day}).",
    "REDEMPTION_EXPIRED": "This benefit has expired. Valid until {valid_until}.",
    "REDEMPTION_HOURS_NOT_ALLOWED": "This benefit can only be redeemed between {start} and {end}.",
    "REDEMPTION_LOCATION_NOT_ALLOWED": "This location is not authorized to redeem this benefit.",
    "REDEMPTION_MAX_PURCHASE_EXCEEDED": "Maximum purchase allowed is {max_purchase}. Current amount: {amount}.",
    "REDEMPTION_MIN_PURCHASE_NOT_MET": "Minimum purchase required is {min_purchase}. Current amount: {amount}.",
    "REDEMPTION_NOT_STARTED_YET": "This benefit is not yet active. Valid from {valid_from}.",
    "REDEMPTION_STAFF_ROLE_NOT_ALLOWED": "Your role is not permitted to redeem this benefit.",
    "REDEMPTION_USAGE_LIMIT_GLOBAL_EXCEEDED": "This benefit has reached its global limit of {limit} redemptions ({used} used).",
    "REDEMPTION_USAGE_LIMIT_PER_CUSTOMER_EXCEEDED": "You have reached the limit of {limit} use(s) per customer ({used} used).",
    "TRANSACTION_CASHBACK_EARNED": "You earned {amount} credit. Total balance: {balance}.",
    "TRANSACTION_CASHBACK_REDEEMED": "{amount} credit applied to your purchase.",
    "TRANSACTION_COUPON_ALREADY_USED": "This coupon has already been used.",
    "TRANSACTION_COUPON_REDEEMED": "Coupon redeemed. {discount} discount applied.",
    "TRANSACTION_GIFT_INSUFFICIENT": "Insufficient balance. Available balance: {balance}.",
    "TRANSACTION_GIFT_REDEEMED": "{amount} applied from certificate. Remaining balance: {balance}.",
    "TRANSACTION_INVALID_AMOUNT": "Transaction amount must be greater than zero.",
    "TRANSACTION_RECORDED": "Transaction recorded successfully.",
    "TRANSACTION_REMOTE_ISSUED": "Reward issued remotely to {customer_name}.",
    "TRANSACTION_REWARD_READY": "Congratulations! You have earned your reward: {reward}.",
    "TRANSACTION_REWARD_REDEEMED": "Reward redeemed successfully.",
    "TRANSACTION_SEARCH_MIN_CHARS": "Search must be at least 2 characters.",
    "TRANSACTION_STAMP_ADDED": "{count} stamp(s) added. Total: {current}/{required}.",
}

_MESSAGES_DE: dict[str, str] = {
    "REDEMPTION_COOLDOWN_ACTIVE": "You must wait {cooldown_hours} hour(s) between redemptions. Remaining time: {remaining_minutes} minute(s).",
    "REDEMPTION_DAY_NOT_ALLOWED": "This benefit cannot be redeemed today ({day}).",
    "REDEMPTION_EXPIRED": "This benefit has expired. Valid until {valid_until}.",
    "REDEMPTION_HOURS_NOT_ALLOWED": "This benefit can only be redeemed between {start} and {end}.",
    "REDEMPTION_LOCATION_NOT_ALLOWED": "This location is not authorized to redeem this benefit.",
    "REDEMPTION_MAX_PURCHASE_EXCEEDED": "Maximum purchase allowed is {max_purchase}. Current amount: {amount}.",
    "REDEMPTION_MIN_PURCHASE_NOT_MET": "Minimum purchase required is {min_purchase}. Current amount: {amount}.",
    "REDEMPTION_NOT_STARTED_YET": "This benefit is not yet active. Valid from {valid_from}.",
    "REDEMPTION_STAFF_ROLE_NOT_ALLOWED": "Your role is not permitted to redeem this benefit.",
    "REDEMPTION_USAGE_LIMIT_GLOBAL_EXCEEDED": "This benefit has reached its global limit of {limit} redemptions ({used} used).",
    "REDEMPTION_USAGE_LIMIT_PER_CUSTOMER_EXCEEDED": "You have reached the limit of {limit} use(s) per customer ({used} used).",
    "TRANSACTION_CASHBACK_EARNED": "You earned {amount} credit. Total balance: {balance}.",
    "TRANSACTION_CASHBACK_REDEEMED": "{amount} credit applied to your purchase.",
    "TRANSACTION_COUPON_ALREADY_USED": "This coupon has already been used.",
    "TRANSACTION_COUPON_REDEEMED": "Coupon redeemed. {discount} discount applied.",
    "TRANSACTION_GIFT_INSUFFICIENT": "Insufficient balance. Available balance: {balance}.",
    "TRANSACTION_GIFT_REDEEMED": "{amount} applied from certificate. Remaining balance: {balance}.",
    "TRANSACTION_INVALID_AMOUNT": "Transaction amount must be greater than zero.",
    "TRANSACTION_RECORDED": "Transaction recorded successfully.",
    "TRANSACTION_REMOTE_ISSUED": "Reward issued remotely to {customer_name}.",
    "TRANSACTION_REWARD_READY": "Congratulations! You have earned your reward: {reward}.",
    "TRANSACTION_REWARD_REDEEMED": "Reward redeemed successfully.",
    "TRANSACTION_SEARCH_MIN_CHARS": "Search must be at least 2 characters.",
    "TRANSACTION_STAMP_ADDED": "{count} stamp(s) added. Total: {current}/{required}.",
}
