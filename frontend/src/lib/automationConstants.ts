export const TRIGGER_LABELS: Record<string, string> = {
  customer_enrolled: "Cliente inscrito",
  transaction_completed: "Transacción completada",
  reward_earned: "Recompensa ganada",
  reward_ready: "Recompensa lista",
  birthday_coming: "Cumpleaños próximo",
  inactive_reminder: "Recordatorio de inactividad",
  milestone_reached: "Hito alcanzado",
  scheduled_time: "Hora programada",
};

export const TRIGGER_DESCRIPTIONS: Record<string, string> = {
  customer_enrolled: "Se ejecuta cuando un cliente se inscribe por primera vez.",
  transaction_completed: "Se ejecuta cada vez que un cliente completa una transacción (sello, puntos, etc).",
  reward_earned: "Se ejecuta cuando un cliente gana una recompensa.",
  reward_ready: "Se ejecuta cuando la recompensa está lista para canjear.",
  birthday_coming: "Se ejecuta X días antes del cumpleaños del cliente.",
  inactive_reminder: "Se ejecuta si el cliente no visita en X días.",
  milestone_reached: "Se ejecuta cuando el cliente alcanza un hito (N visitas, N puntos).",
  scheduled_time: "Se ejecuta a una hora / día programado.",
};

export const ACTION_LABELS: Record<string, string> = {
  send_notification: "Notificación (Push/Email)",
  send_email: "Solo Email",
  send_sms: "Enviar SMS",
  issue_reward: "Emitir recompensa",
  update_segment: "Actualizar segmento",
  create_campaign: "Crear campaña",
  send_wallet: "Notificación Wallet",
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

export const PRESET_TEMPLATES = [
  {
    id: "welcome",
    name: "Bienvenida a nuevos clientes",
    description: "Envia un mensaje de bienvenida cuando alguien seinscribe",
    trigger: "customer_enrolled",
    action: "send_email",
    action_config: {
      title: "¡Bienvenido a nuestro programa!",
      message: "Gracias por unirte. Ahora puedes ganar recompensas con cada visita.",
    },
  },
  {
    id: "birthday",
    name: "Felicidades de cumpleaños",
    description: "Envia una promoción especial en el cumpleaños del cliente",
    trigger: "birthday_coming",
    action: "send_email",
    action_config: {
      title: "¡Feliz cumpleaños!",
      message: "¡Tenemos un regalo especial para ti! Visita nuestro local y muestra este mensaje.",
    },
  },
  {
    id: "inactive",
    name: "Recordatorio de inactividad",
    description: "Recuerda a los clientes que no han visitado en mucho tiempo",
    trigger: "inactive_reminder",
    action: "send_email",
    action_config: {
      title: "¡Te extrañamos!",
      message: "Ha pasado un tiempo desde tu última visita. Tenemos una oferta especial esperándote.",
    },
  },
  {
    id: "milestone",
    name: "Cliente fiel - Hitos",
    description: "Celebra cuando el cliente alcanza un número de visitas/puntos",
    trigger: "milestone_reached",
    action: "send_email",
    action_config: {
      title: "¡Felicidades! Has alcanzado un hito",
      message: "Gracias por ser un cliente fiel. Has ganado una recompensa especial.",
    },
  },
  {
    id: "reward_ready",
    name: "Recompensa lista para canjear",
    description: "Notifica cuando el cliente tiene una recompensa lista",
    trigger: "reward_ready",
    action: "send_email",
    action_config: {
      title: "¡Tu recompensa está lista!",
      message: "Ya puedes canjear tu recompensa. Visita nuestro local y muestra tu código.",
    },
  },
  {
    id: "transaction",
    name: "Confirmación de transacción",
    description: "Confirma cada transacción con Sellos/Puntos",
    trigger: "transaction_completed",
    action: "send_email",
    action_config: {
      title: "Transacción registrada",
      message: "¡Has ganado sellos/puntos! Sigue acumulando para obtener tu próxima recompensa.",
    },
  },
  {
    id: "wallet_welcome",
    name: "Bienvenida Wallet",
    description: "Envía notificación en wallet cuando alguien se inscribe",
    trigger: "customer_enrolled",
    action: "send_wallet",
    action_config: {
      title: "¡Bienvenido!",
      message: "Gracias por unirte. Tu tarjeta digital está lista. Acumula sellos y gana recompensas.",
      wallet_platform: "both",
    },
  },
  {
    id: "wallet_reward",
    name: "Recompensa en Wallet",
    description: "Notifica en wallet cuando el cliente gana una recompensa",
    trigger: "reward_earned",
    action: "send_wallet",
    action_config: {
      title: "¡Recompensa ganada!",
      message: "Has alcanzado una recompensa. ¡Canjéala en tu próxima visita!",
      wallet_platform: "both",
    },
  },
  {
    id: "wallet_transaction",
    name: "Confirmación Wallet",
    description: "Confirma transacciones directamente en la tarjeta digital",
    trigger: "transaction_completed",
    action: "send_wallet",
    action_config: {
      title: "Transacción registrada",
      message: "¡Has ganado sellos/puntos! Sigue acumulando para tu próxima recompensa.",
      wallet_platform: "both",
    },
  },
];
