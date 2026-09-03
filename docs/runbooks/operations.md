# Operations runbook

## Triage

1. Check Container App revision health and `/health/live` plus `/health/ready` without exposing topology.
2. Search Application Insights by `x-request-id`; correlate authentication, dependency, and audit outcomes.
3. Verify private DNS from the running revision for PostgreSQL, Search, Redis, Service Bus, ACR, and storage.
4. For upload failures, inspect session state, received bytes, scan outcome, storage correlation ID, and quota. Never bypass quarantine.
5. For Graph throttling or 5xx responses, honor `Retry-After`, use bounded exponential backoff, and retain the request ID.

## Rollback

Shift traffic to the last healthy immutable revision. Do not roll back a destructive migration; use the rehearsed forward-compatible migration or restore procedure. Confirm synthetic login, search, upload, view, workflow, and audit flows before closing the incident.

## Recovery

Restore PostgreSQL to an isolated server, verify audit-chain continuity and binary references, then promote under change approval. Production targets are RPO ≤5 minutes and RTO ≤1 hour; quarterly restore evidence is mandatory.

## Alerts

Page on sustained 5xx rate, p95 API latency breach, unhealthy revisions, database/storage dependency failure, scan backlog, audit append failure, and security anomalies. Ticket on capacity, retention, certificate, and quota forecasts.
