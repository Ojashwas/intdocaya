# ADR 0001: React 18 baseline and minimal Node HTTP service

Status: accepted — 2026-09-03

The specification names React 18, so dependencies are pinned to React 18.3.1 rather than silently retaining React 19. The API uses the Node HTTP server with small, explicit middleware modules to keep the security boundary auditable. PostgreSQL remains authoritative in shared environments; SQLite is an explicit local/test adapter only.
