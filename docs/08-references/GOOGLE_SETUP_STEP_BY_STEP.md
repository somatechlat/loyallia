# Google OAuth + Google Wallet — Setup Paso a Paso

> **Este documento te dice EXACTAMENTE qué botones apretar, en qué orden, y qué datos copiarme para que yo configure el sistema.**

Necesitas hacer **dos cosas separadas** en Google Cloud:
1. **Google OAuth 2.0** → Para que los usuarios puedan iniciar sesión con Google.
2. **Google Wallet API** → Para crear y enviar tarjetas de fidelización digitales.

Ambas usan la misma cuenta de Google Cloud, pero son configuraciones diferentes.

---

## PARTE 1: Crear un Proyecto en Google Cloud

Si ya tenés un proyecto, saltá al Paso 2.

1. Andá a: **https://console.cloud.google.com/**
2. Arriba a la izquierda, hacé click en el selector de proyecto (dice algo como "My First Project" o "Seleccionar proyecto")
3. Hacé click en **"NUEVO PROYECTO"**
4. **Nombre del proyecto:** `loyallia-prod` (o el que prefieras)
5. Hacé click en **"CREAR"**
6. Esperá unos segundos y seleccioná ese proyecto del dropdown.

📸 *Lo que tenés que ver:* Arriba a la izquierda debería decir `loyallia-prod`.

---

## PARTE 2: Configurar la Pantalla de Consentimiento OAuth (OBLIGATORIO)

Esto es necesario para que Google te deje usar Login con Google.

1. En el menú de la izquierda (hamburguesa ☰), andá a: **"APIs y servicios"** → **"Pantalla de consentimiento de OAuth"**
2. Seleccioná **"Externo"** (a menos que tengas Google Workspace)
3. Hacé click en **"CREAR"**
4. Completá estos campos:

| Campo | Qué poner |
|-------|-----------|
| **Nombre de la app** | `Loyallia` |
| **Correo electrónico de soporte** | Tu email real (ej: `soporte@tudominio.com`) |
| **Logo de la app** | Subí el logo de Loyallia (opcional pero recomendado) |
| **Dominio de la app** | `rewards.loyallia.com` (o tu dominio real) |
| **Página de inicio** | `https://rewards.loyallia.com` |
| **Política de privacidad** | `https://rewards.loyallia.com/privacy` |
| **Términos de servicio** | `https://rewards.loyallia.com/terms` |
| **Correos electrónicos de contacto** | Tu email de nuevo |

5. Hacé click en **"GUARDAR Y CONTINUAR"**
6. En la pantalla de **"Alcances"**, hacé click en **"AGREGAR O QUITAR ALCANCES"**
7. Marcá estos dos:
   - ✅ `.../auth/userinfo.email`
   - ✅ `.../auth/userinfo.profile`
8. Hacé click en **"ACTUALIZAR"** → **"GUARDAR Y CONTINUAR"**
9. En **"Usuarios de prueba"**, agregá tu propio email de Gmail y hacé click en **"GUARDAR Y CONTINUAR"**
10. Hacé click en **"VOLVER AL PANEL"**

📸 *Verificación:* En el panel de consentimiento debería decir **"Testing"** o **"En prueba"**.

---

## PARTE 3: Crear Credenciales OAuth 2.0 (Login con Google)

Esto da al sistema el `Client ID` y `Client Secret` para el login.

1. En el menú de la izquierda, andá a: **"APIs y servicios"** → **"Credenciales"**
2. Hacé click en **"CREAR CREDENCIALES"** → **"ID de cliente de OAuth"**
3. Seleccioná **"Aplicación web"**
4. Completá:

| Campo | Qué poner |
|-------|-----------|
| **Nombre** | `Loyallia Web App` |

5. En **"Orígenes de JavaScript autorizados"**, hacé click en **"AGREGAR URI"** y agregá:
   - `http://localhost` (para desarrollo local — frontend por Nginx en puerto 80)
   - `https://rewards.loyallia.com` (tu dominio real de producción)
   - Si tenés otro dominio, agregalo también.

6. En **"URI de redireccionamiento autorizados"**, hacé click en **"AGREGAR URI"** y agregá:
   - `http://localhost/api/v1/auth/google/callback/` (desarrollo local — va por Nginx en puerto 80)
   - `https://rewards.loyallia.com/api/v1/auth/google/callback/` (producción)

   > ⚠️ **IMPORTANTE:** La URL DEBE terminar en `/` (slash al final). Si no, falla.

7. Hacé click en **"CREAR"**

📸 *Lo que aparece ahora:* Un cuadro de diálogo con tu **Client ID** y **Client Secret**.

8. **Copiá esos dos valores y pasámelos a mí.**

---

## PARTE 4: Activar la Google Wallet API

Ahora configuramos las tarjetas digitales de fidelización.

1. En el menú de la izquierda, andá a: **"APIs y servicios"** → **"Biblioteca"**
2. En la barra de búsqueda, escribí: **`Wallet API`**
3. Hacé click en **"Google Wallet API"**
4. Hacé click en el botón **"HABILITAR"**

📸 *Verificación:* Debería decir **"API habilitada"** o similar.

---

## PARTE 5: Crear Cuenta de Emisor en Google Wallet

Esto te da el **Issuer ID** que necesito.

1. Andá a: **https://pay.google.com/gp/w/homepage**
2. Iniciá sesión con la misma cuenta de Google Cloud.
3. Hacé click en **"Get Started"** o **"Empezar"**
4. Completá los datos de tu negocio:
   - Nombre del negocio
   - País
   - Categoría: seleccioná **"Loyalty"** o **"Fidelización"**
5. Aceptá los términos y hacé click en **"Continuar"**

📸 *Lo que aparece:* Una pantalla con tu **Issuer ID**. Guárdalo en Vault como `google_wallet_issuer_id`.

6. **Copiá ese número y pasámelo a mí.**

---

## PARTE 6: Crear una Cuenta de Servicio (Service Account)

Esto genera el archivo JSON que le da al sistema permiso para crear tarjetas.

1. Volvé a Google Cloud Console: **https://console.cloud.google.com/**
2. Menú de la izquierda: **"IAM y administración"** → **"Cuentas de servicio"**
3. Hacé click en **"CREAR CUENTA DE SERVICIO"**
4. Completá:

| Campo | Qué poner |
|-------|-----------|
| **Nombre de la cuenta de servicio** | `loyallia-wallet` |
| **ID de la cuenta de servicio** | Se autocompleta, dejalo así |
| **Descripción** | `Servicio para crear tarjetas Google Wallet desde Loyallia` |

5. Hacé click en **"CREAR Y CONTINUAR"**
6. En **"Otorgar acceso a este proyecto"**, seleccioná el rol:
   - **"Desarrollador de Wallet"** (o buscá `wallet` y elegí el que tenga permisos de Wallet API)
7. Hacé click en **"CONTINUAR"**
8. En **"Otorgar acceso a usuarios"**, dejalo vacío y hacé click en **"LISTO"**

📸 *Verificación:* Tu cuenta `loyallia-wallet` debería aparecer en la lista.

---

## PARTE 7: Descargar la Clave JSON de la Cuenta de Servicio

Este archivo JSON es lo más importante. **NO LO COMPARTAS PÚBLICAMENTE.**

1. En la lista de cuentas de servicio, hacé click en `loyallia-wallet`
2. Andá a la pestaña **"Claves"**
3. Hacé click en **"AGREGAR CLAVE"** → **"Crear clave nueva"**
4. Seleccioná **"JSON"**
5. Hacé click en **"CREAR"**

📸 *Lo que pasa:* Se descarga un archivo `.json` a tu computadora. El nombre será generado por Google.

6. **No abras ese archivo todavía.** Primero pasame el nombre del archivo para confirmar que se descargó.

---

## PARTE 8: Compartirme los Datos

Una vez que terminaste los 7 pasos anteriores, mandame estos datos EXACTOS:

### Para Google OAuth (Login):
```
1. google_oauth_client_id =
   (pega aquí el Client ID del Paso 3)

2. google_oauth_client_secret =
   (pega aquí el Client Secret del Paso 3)
```

### Para Google Wallet (Tarjetas):
```
3. google_wallet_issuer_id =
   (pega aquí el Issuer ID del Paso 5)

4. google_service_account_json =
   (abre el archivo .json descargado en el Paso 7 con un editor de texto,
    seleccioná TODO el contenido, copialo, y pegalo aquí)
```

> ⚠️ **IMPORTANTE de seguridad:** El archivo JSON contiene una clave privada. Solo pasamelo por este chat privado. No lo subas a GitHub ni lo mandes por email público.

---

## PARTE 9: Yo Inyecto Todo en Vault

Una vez que me pases los 4 datos de arriba, yo:

1. ✅ Valido que el JSON del service account sea correcto
2. ✅ Inyecto todo en HashiCorp Vault
3. ✅ Habilito `google_wallet_enabled = true`
4. ✅ Verifico que las integraciones reporten estado **"Conectado"**
5. ✅ Te confirmo que el sistema está listo

---

## Tabla de Verificación Final

Después de que yo configure todo, podés verificar en:

**URL:** `http://localhost/superadmin/settings` (logueado como SuperAdmin)

| Integración | Estado Esperado | Significado |
|-------------|-----------------|-------------|
| Google Wallet | 🟢 **Conectado** | Todo funciona |
| Google Wallet | 🔴 **Faltan credenciales** | Falta algún dato |
| Google OAuth | 🟢 Funcionando | Los usuarios pueden loguear con Google |

---

## ¿Y Apple Wallet?

Si también querés tarjetas para iPhone, necesitás:

1. Una cuenta de **Apple Developer Program** ($99 USD/año)
2. Seguir los pasos de: [`docs/WALLET_CREDENTIALS_SETUP.md`](./WALLET_CREDENTIALS_SETUP.md)

Apple Wallet es **independiente** de Google Wallet. Podés tener uno, el otro, o ambos.

---

## Ayuda y Errores Comunes

| Problema | Solución |
|----------|----------|
| "Error 400: redirect_uri_mismatch" | Revisá que la URI de redireccionamiento en Google Cloud coincida EXACTAMENTE con la que usa el sistema (incluyendo el `/` al final) |
| "Issuer ID no encontrado" | Asegurate de haber completado el registro en `pay.google.com` |
| "Permission denied" al crear tarjetas | La cuenta de servicio necesita el rol "Wallet Developer". Revisá el Paso 6 |
| "API no habilitada" | Revisá el Paso 4, asegurate de haber hecho click en "Habilitar" |
| Los cambios no se ven | Google dice que puede tardar de 5 minutos a algunas horas. Esperá un rato y recargá |

---

## Diagrama de Flujo

```
┌─────────────────────────────────────────────────────────────┐
│                    TU COMPUTADORA                           │
│                                                             │
│  1. Crear proyecto Google Cloud                             │
│  2. Configurar Pantalla de Consentimiento OAuth             │
│  3. Crear credenciales OAuth → Client ID + Secret           │
│  4. Habilitar Wallet API                                    │
│  5. Crear cuenta emisor → Issuer ID                         │
│  6. Crear service account + descargar JSON                  │
│                                                             │
│  ↓ Pasás los 4 datos a mí                                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      MI SISTEMA                             │
│                                                             │
│  7. Valido el JSON del service account                      │
│  8. Inyecto todo en Vault                                   │
│  9. Verifico conectividad                                   │
│                                                             │
│  ↓ Confirmo que está listo                                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     RESULTADO                               │
│                                                             │
│  ✅ Login con Google funcionando                            │
│  ✅ Tarjetas digitales Google Wallet funcionando            │
│  ✅ Todo seguro en Vault, nada en Git                       │
└─────────────────────────────────────────────────────────────┘
```
