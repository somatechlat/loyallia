export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950 text-surface-900 dark:text-surface-100 py-12 px-4">
      <div className="max-w-4xl mx-auto bg-white dark:bg-surface-900 p-8 rounded-2xl shadow-sm border border-surface-200 dark:border-surface-800">
        <h1 className="text-3xl font-bold mb-8 text-brand-600 dark:text-brand-400">
          Términos de Servicio
        </h1>

        <div className="space-y-6 text-sm leading-relaxed text-surface-600 dark:text-surface-300">
          <p>
            <strong>Última actualización:</strong> Enero 2026
          </p>

          <h2 className="text-xl font-bold text-surface-900 dark:text-white mt-8 mb-4">
            1. Aceptación de los Términos
          </h2>
          <p>
            Al acceder y utilizar la plataforma Loyallia, usted (el "Usuario" o
            "Tenant") acepta someterse a estos Términos de Servicio y a nuestra
            Política de Privacidad. Estos términos rigen su acceso a la
            plataforma SaaS multi-tenancy para la gestión de programas de
            fidelización.
          </p>

          <h2 className="text-xl font-bold text-surface-900 dark:text-white mt-8 mb-4">
            2. Cumplimiento Legal (LOPDP Ecuador)
          </h2>
          <p>
            El Usuario es responsable de garantizar que toda la información de
            terceros (clientes finales) ingresada o importada a la plataforma
            haya sido recopilada con el consentimiento expreso e inequívoco de
            los titulares de los datos, en estricto cumplimiento con la Ley
            Orgánica de Protección de Datos Personales (LOPDP) de la República
            del Ecuador.
          </p>
          <p>
            Loyallia actúa únicamente como{" "}
            <strong>Encargado del Tratamiento</strong> de los datos ingresados
            en la plataforma, siendo el Usuario el{" "}
            <strong>Responsable del Tratamiento</strong> frente a sus clientes
            finales.
          </p>

          <h2 className="text-xl font-bold text-surface-900 dark:text-white mt-8 mb-4">
            3. Registro y Auditoría Forense
          </h2>
          <p>
            Con el fin de asegurar la integridad del sistema y el cumplimiento
            normativo, Loyallia mantiene un registro inmutable de auditoría
            (Audit Trail). Todas las acciones de lectura, modificación, creación
            y exportación de datos quedan registradas permanentemente con
            identificadores de usuario y direcciones IP por un período de 7
            años. Estos registros no pueden ser alterados o eliminados bajo
            ninguna circunstancia.
          </p>

          <h2 className="text-xl font-bold text-surface-900 dark:text-white mt-8 mb-4">
            4. Propiedad Intelectual
          </h2>
          <p>
            La plataforma, sus componentes, código fuente, diseño, bases de
            datos y algoritmos son propiedad exclusiva de Loyallia. El uso de la
            plataforma no otorga ningún derecho de propiedad intelectual sobre
            la misma.
          </p>

          <h2 className="text-xl font-bold text-surface-900 dark:text-white mt-8 mb-4">
            5. Limitación de Responsabilidad
          </h2>
          <p>
            Loyallia no será responsable de ningún daño indirecto, incidental,
            especial, consecuente o punitivo, incluyendo sin limitación la
            pérdida de beneficios, datos, uso o de fondo de comercio, o
            cualquier otra pérdida intangible, que resulte de su acceso o uso de
            la plataforma.
          </p>
        </div>
      </div>
    </div>
  );
}
