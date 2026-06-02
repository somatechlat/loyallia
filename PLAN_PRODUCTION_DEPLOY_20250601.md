# Plan de Deploy a Producción — Wallet Preview Fixes
**Fecha:** 2026-06-01  
**Commit a deployar:** `855c738` (main)  
**Scope:** Solo frontend (3 archivos React/TS) — cero cambios de backend, DB, API o infraestructura  
**Servidor:** 140.82.15.48 (Ubuntu 24.04, /opt/loyallia)

---

## 0. Pre-flight (local)
- [ ] Verificar commit `855c738` está en main y push fue exitoso
- [ ] Verificar TypeScript local pasó limpio (`npx tsc --noEmit`)
- [ ] Confirmar que el único cambio es frontend (no toca backend ni DB)

---

## 1. Acceso SSH al servidor de producción
- [ ] Conectar vía SSH al servidor (necesito confirmar credenciales/clave contigo)
- [ ] Verificar que el stack Docker está healthy (`docker compose ps`)
- [ ] Verificar que la app responde (`curl -s https://rewards.loyallia.com/api/health`)

---

## 2. Backup Pre-Deploy (completo)
Antes de tocar NADA, ejecutar en el servidor:

### 2A. Rescue files (desastre total)
```bash
/opt/loyallia/deploy/disaster_recovery/create_rescue_files.sh
```
Genera 6 archivos de rescate en `.agents/`:
- Vault init + secrets
- PostgreSQL dump
- Redis RDB
- Runtime files tar
- SSL certs tar

### 2B. Snapshot PostgreSQL (lógico)
```bash
cd /opt/loyallia && deploy/backups/pg_dump_backup.sh --env=production
```

### 2C. Snapshot Redis
```bash
cd /opt/loyallia && deploy/backups/redis_backup.sh --env=production
```

### 2D. Backup de Docker volumes (infraestructura)
```bash
# Etiquetar imagen web actual por si necesitamos rollback rápido
docker tag loyallia-web:latest loyallia-web:pre-wallet-fix-$(date +%Y%m%d-%H%M%S)
```

---

## 3. Verificación del Backup
- [ ] Confirmar que los archivos de rescue existen y tienen tamaño > 0
- [ ] Verificar que el pg_dump se generó correctamente
- [ ] Verificar que el Redis dump se generó correctamente
- [ ] Verificar que la imagen Docker taggeada existe

---

## 4. Deploy (muy simple — solo frontend)
```bash
# 4A. Pull del código
cd /opt/loyallia && git fetch origin && git checkout main && git pull origin main

# 4B. Solo rebuild del contenedor web (NO toca api, db, redis, etc.)
cd /opt/loyallia && docker compose -f docker-compose.yml -f docker-compose.prod.yml build web

# 4C. Restart rolling del web (cero downtime para API/backend)
cd /opt/loyallia && docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d web

# 4D. Limpiar imagen vieja (opcional, post-verificación)
```

**Riesgo:** Mínimo. El contenedor `web` es stateless (Next.js standalone). No toca datos.

---

## 5. Post-deploy Verification
- [ ] `docker compose ps web` → Status `healthy`
- [ ] `docker logs loyallia-web --tail 50` → Sin errores de build
- [ ] `curl -s https://rewards.loyallia.com` → HTTP 200
- [ ] Probar login básico
- [ ] Probar la vista de wallet designer (Google + Apple preview)

---

## 6. Rollback Plan (si algo falla)
```bash
# Opción A: Rollback Docker image (instantáneo)
docker compose stop web
docker tag loyallia-web:PREVIOUS_TAG loyallia-web:latest
docker compose up -d web

# Opción B: Rollback Git (1 minuto)
cd /opt/loyallia && git reset --hard 8f971cd
docker compose build web && docker compose up -d web

# Opción C: Restauración completa desde rescue (desastre total)
/opt/loyallia/deploy/disaster_recovery/recover_from_rescue.sh
```

---

## Resumen de Riesgo
| Aspecto | Riesgo | Mitigación |
|---------|--------|------------|
| Cambio de código | Bajo | Solo 3 archivos frontend, TS validado |
| Base de datos | Ninguno | No hay migraciones ni queries nuevos |
| API/backend | Ninguno | No se toca el contenedor `api` |
| Downtime | ~30-60s | Solo restart del contenedor `web` |
| Rollback | < 2 min | Git reset + rebuild, o imagen taggeada |

---

## Próximo paso
**Necesito tu aprobación de este plan antes de ejecutar nada.**

También necesito que me confirmes:
1. ¿Cómo me conecto por SSH al servidor? (¿clave? ¿usuario?)
2. ¿Hay alguna ventana de mantenimiento preferida? (aunque el downtime es mínimo)
