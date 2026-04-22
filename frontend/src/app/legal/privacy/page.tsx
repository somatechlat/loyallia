export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950 text-surface-900 dark:text-surface-100 py-12 px-4">
      <div className="max-w-4xl mx-auto bg-white dark:bg-surface-900 p-8 rounded-2xl shadow-sm border border-surface-200 dark:border-surface-800">
        <h1 className="text-3xl font-bold mb-8 text-brand-600 dark:text-brand-400">
          Política de Privacidad
        </h1>

        <div className="space-y-6 text-sm leading-relaxed text-surface-600 dark:text-surface-300">
          <p>
            <strong>Última actualización:</strong> Enero 2026
          </p>

          <h2 className="text-xl font-bold text-surface-900 dark:text-white mt-8 mb-4">
            1. Identidad y Domicilio del Responsable
          </h2>
          <p>
            En el contexto de la Ley Orgánica de Protección de Datos Personales
            (LOPDP), Loyallia actúa como{" "}
            <strong>Encargado del Tratamiento</strong> de los datos que usted
            (el "Tenant" o "Responsable del Tratamiento") procesa mediante la
            plataforma para gestionar programas de fidelización para sus
            clientes finales.
          </p>

          <h2 className="text-xl font-bold text-surface-900 dark:text-white mt-8 mb-4">
            2. Finalidad del Tratamiento de Datos
          </h2>
          <p>
            Los datos ingresados a la plataforma se utilizan estrictamente para
            el diseño, despliegue y análisis de campañas de fidelización y
            recompensas. Loyallia no vende, comercializa ni cede los datos
            personales de sus clientes finales a terceros bajo ninguna
            circunstancia.
          </p>

          <h2 className="text-xl font-bold text-surface-900 dark:text-white mt-8 mb-4">
            3. Derechos ARCO y Consentimiento
          </h2>
          <p>
            De acuerdo con la LOPDP, los titulares de los datos tienen derecho a
            acceder, rectificar, actualizar, eliminar, oponerse y anular el
            consentimiento sobre sus datos (Derechos ARCO). Al importar bases de
            datos a Loyallia, el Usuario declara bajo juramento haber obtenido
            el consentimiento expreso, libre e inequívoco de los titulares.
          </p>

          <h2 className="text-xl font-bold text-surface-900 dark:text-white mt-8 mb-4">
            4. Seguridad y Auditoría Forense
          </h2>
          <p>
            Implementamos medidas técnicas y organizativas rigurosas para
            garantizar la seguridad de los datos. La plataforma cuenta con un
            registro inmutable de auditoría (Forensic Audit Trail) que documenta
            cada importación, exportación, modificación y visualización de
            registros, manteniendo un rastro transparente del ciclo de vida de
            los datos por 7 años.
          </p>

          <h2 className="text-xl font-bold text-surface-900 dark:text-white mt-8 mb-4">
            5. Uso de Cookies
          </h2>
          <p>
            Utilizamos "Cookies" de sesión estrictamente necesarias para la
            autenticación y la seguridad de su cuenta dentro del sistema. Al
            registrarse en Loyallia, consiente el uso de estas cookies de
            carácter técnico.
          </p>
        </div>
      </div>
    </div>
  );
}
