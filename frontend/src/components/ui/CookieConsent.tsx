"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

export default function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // LOPDP Compliance: Check if user already accepted cookies
    const consent = localStorage.getItem("loyallia_cookie_consent");
    if (!consent) {
      setShow(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem("loyallia_cookie_consent", "true");
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[99999] bg-white dark:bg-surface-900 border-t border-surface-200 dark:border-surface-800 shadow-2xl p-4 md:p-6 animate-slide-up">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="text-sm text-surface-600 dark:text-surface-300 leading-relaxed max-w-4xl">
          <p className="font-bold text-surface-900 dark:text-white mb-1">
            Políticas de Privacidad y Cookies
          </p>
          Utilizamos cookies esenciales y tecnologías similares para garantizar
          el funcionamiento de la plataforma, gestionar sesiones de usuario y
          analizar tráfico anónimo. Al continuar utilizando Loyallia, usted
          otorga su <strong>consentimiento expreso e inequívoco</strong> bajo la
          Ley Orgánica de Protección de Datos Personales (LOPDP) de Ecuador.
          Puede revisar nuestra{" "}
          <Link
            href="/legal/privacy"
            className="text-brand-600 dark:text-brand-400 hover:underline"
          >
            Política de Privacidad
          </Link>{" "}
          y nuestros{" "}
          <Link
            href="/legal/terms"
            className="text-brand-600 dark:text-brand-400 hover:underline"
          >
            Términos de Servicio
          </Link>{" "}
          para más información sobre cómo manejamos sus datos.
        </div>
        <div className="flex-shrink-0 w-full md:w-auto">
          <button
            onClick={handleAccept}
            className="w-full md:w-auto px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-lg shadow-md transition-colors"
          >
            Aceptar Todo
          </button>
        </div>
      </div>
    </div>
  );
}
