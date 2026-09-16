/** Translation keys for trigger labels — resolve with t() in components. */
export const TRIGGER_LABELS: Record<string, string> = {
  customer_enrolled: "automation.triggers.customer_enrolled",
  transaction_completed: "automation.triggers.transaction_completed",
  reward_earned: "automation.triggers.reward_earned",
  reward_ready: "automation.triggers.reward_ready",
  birthday_coming: "automation.triggers.birthday_coming",
  inactive_reminder: "automation.triggers.inactive_reminder",
  milestone_reached: "automation.triggers.milestone_reached",
  scheduled_time: "automation.triggers.scheduled_time",
};

/** Translation keys for trigger descriptions — resolve with t() in components. */
export const TRIGGER_DESCRIPTIONS: Record<string, string> = {
  customer_enrolled: "automation.triggerDescs.customer_enrolled",
  transaction_completed: "automation.triggerDescs.transaction_completed",
  reward_earned: "automation.triggerDescs.reward_earned",
  reward_ready: "automation.triggerDescs.reward_ready",
  birthday_coming: "automation.triggerDescs.birthday_coming",
  inactive_reminder: "automation.triggerDescs.inactive_reminder",
  milestone_reached: "automation.triggerDescs.milestone_reached",
  scheduled_time: "automation.triggerDescs.scheduled_time",
};

/** Translation keys for action labels — resolve with t() in components. */
export const ACTION_LABELS: Record<string, string> = {
  send_notification: "automation.actions.send_notification",
  send_email: "automation.actions.send_email",
  send_sms: "automation.actions.send_sms",
  issue_reward: "automation.actions.issue_reward",
  update_segment: "automation.actions.update_segment",
  create_campaign: "automation.actions.create_campaign",
  send_wallet: "automation.actions.send_wallet",
};

export const ACTION_ICON_PATHS: Record<string, string> = {
  send_notification:
    "M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0",
  send_email:
    "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6",
  send_sms: "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z",
  issue_reward:
    "M20 12v10H4V12M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 110-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 100-5C13 2 12 7 12 7z",
  update_segment: "M18 20V10M12 20V4M6 20v-6",
  create_campaign: "M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z",
};

/**
 * Preset templates for automation quick-start.
 * `name`/`description`/`action_config.title`/`action_config.message` are the
 * original locale strings sent to the API.
 * `nameKey`/`descriptionKey`/`action_config.titleKey`/`action_config.messageKey`
 * are translation keys for UI display — resolve with t().
 */
export const PRESET_TEMPLATES = [
  {
    id: "welcome",
    name: "Bienvenida a nuevos clientes",
    nameKey: "automation.presets.welcome.name",
    description: "Envia un mensaje de bienvenida cuando alguien se inscribe",
    descriptionKey: "automation.presets.welcome.description",
    trigger: "customer_enrolled",
    action: "send_email",
    action_config: {
      title: "¡Bienvenido a nuestro programa!",
      titleKey: "automation.presets.welcome.title",
      message: "Gracias por unirte. Ahora puedes ganar recompensas con cada visita.",
      messageKey: "automation.presets.welcome.message",
    },
  },
  {
    id: "birthday",
    name: "Felicidades de cumpleaños",
    nameKey: "automation.presets.birthday.name",
    description: "Envia una promoción especial en el cumpleaños del cliente",
    descriptionKey: "automation.presets.birthday.description",
    trigger: "birthday_coming",
    action: "send_email",
    action_config: {
      title: "¡Feliz cumpleaños!",
      titleKey: "automation.presets.birthday.title",
      message: "¡Tenemos un regalo especial para ti! Visita nuestro local y muestra este mensaje.",
      messageKey: "automation.presets.birthday.message",
    },
  },
  {
    id: "inactive",
    name: "Recordatorio de inactividad",
    nameKey: "automation.presets.inactive.name",
    description: "Recuerda a los clientes que no han visitado en mucho tiempo",
    descriptionKey: "automation.presets.inactive.description",
    trigger: "inactive_reminder",
    action: "send_email",
    action_config: {
      title: "¡Te extrañamos!",
      titleKey: "automation.presets.inactive.title",
      message: "Ha pasado un tiempo desde tu última visita. Tenemos una oferta especial esperándote.",
      messageKey: "automation.presets.inactive.message",
    },
  },
  {
    id: "milestone",
    name: "Cliente fiel - Hitos",
    nameKey: "automation.presets.milestone.name",
    description: "Celebra cuando el cliente alcanza un número de visitas/puntos",
    descriptionKey: "automation.presets.milestone.description",
    trigger: "milestone_reached",
    action: "send_email",
    action_config: {
      title: "¡Felicidades! Has alcanzado un hito",
      titleKey: "automation.presets.milestone.title",
      message: "Gracias por ser un cliente fiel. Has ganado una recompensa especial.",
      messageKey: "automation.presets.milestone.message",
    },
  },
  {
    id: "reward_ready",
    name: "Recompensa lista para canjear",
    nameKey: "automation.presets.rewardReady.name",
    description: "Notifica cuando el cliente tiene una recompensa lista",
    descriptionKey: "automation.presets.rewardReady.description",
    trigger: "reward_ready",
    action: "send_email",
    action_config: {
      title: "¡Tu recompensa está lista!",
      titleKey: "automation.presets.rewardReady.title",
      message: "Ya puedes canjear tu recompensa. Visita nuestro local y muestra tu código.",
      messageKey: "automation.presets.rewardReady.message",
    },
  },
  {
    id: "transaction",
    name: "Confirmación de transacción",
    nameKey: "automation.presets.transaction.name",
    description: "Confirma cada transacción con Sellos/Puntos",
    descriptionKey: "automation.presets.transaction.description",
    trigger: "transaction_completed",
    action: "send_email",
    action_config: {
      title: "Transacción registrada",
      titleKey: "automation.presets.transaction.title",
      message: "¡Has ganado sellos/puntos! Sigue acumulando para obtener tu próxima recompensa.",
      messageKey: "automation.presets.transaction.message",
    },
  },
  {
    id: "wallet_welcome",
    name: "Bienvenida Wallet",
    nameKey: "automation.presets.walletWelcome.name",
    description: "Envía notificación en wallet cuando alguien se inscribe",
    descriptionKey: "automation.presets.walletWelcome.description",
    trigger: "customer_enrolled",
    action: "send_wallet",
    action_config: {
      title: "¡Bienvenido!",
      titleKey: "automation.presets.walletWelcome.title",
      message: "Gracias por unirte. Tu tarjeta digital está lista. Acumula sellos y gana recompensas.",
      messageKey: "automation.presets.walletWelcome.message",
      wallet_platform: "both",
    },
  },
  {
    id: "wallet_reward",
    name: "Recompensa en Wallet",
    nameKey: "automation.presets.walletReward.name",
    description: "Notifica en wallet cuando el cliente gana una recompensa",
    descriptionKey: "automation.presets.walletReward.description",
    trigger: "reward_earned",
    action: "send_wallet",
    action_config: {
      title: "¡Recompensa ganada!",
      titleKey: "automation.presets.walletReward.title",
      message: "Has alcanzado una recompensa. ¡Canjéala en tu próxima visita!",
      messageKey: "automation.presets.walletReward.message",
      wallet_platform: "both",
    },
  },
  {
    id: "wallet_transaction",
    name: "Confirmación Wallet",
    nameKey: "automation.presets.walletTransaction.name",
    description: "Confirma transacciones directamente en la tarjeta digital",
    descriptionKey: "automation.presets.walletTransaction.description",
    trigger: "transaction_completed",
    action: "send_wallet",
    action_config: {
      title: "Transacción registrada",
      titleKey: "automation.presets.walletTransaction.title",
      message: "¡Has ganado sellos/puntos! Sigue acumulando para tu próxima recompensa.",
      messageKey: "automation.presets.walletTransaction.message",
      wallet_platform: "both",
    },
  },
];
