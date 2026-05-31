# API (Root Router)

NinjaAPI root router and shared upload endpoints.

## Router

- `router.py` — Mounts all app routers under `/api/v1/`

## Upload

- `upload_api.py` — File upload to MinIO with MIME type validation and size limits

## Dependencies

- MinIO (S3-compatible storage)

## Called By

- All file upload flows (logo, strip image, customer CSV)
