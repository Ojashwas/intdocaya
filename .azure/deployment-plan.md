# Docaya Development/Test Deployment Plan

## Status

Production adapter hardening implemented locally; Azure target-scope validation and reviewed what-if remain required

## Scope

Publish the Docaya container image to the existing Azure Container Registry and update the existing internal Azure Container App to use that image. Preserve all existing resources and use incremental, non-destructive changes only.

## Azure Context

- Subscription: `9edf6525-9335-47a5-b124-6e451c05561f`
- Resource group: `int-doca-hai-001`
- Region: `uaenorth`
- Environment: development/test

## Existing Resources

- Container App: `int-doca-api-fkdjitgh5jkkk`
- Container Registry: `intdocaacrfkdjitgh5jkkk.azurecr.io`
- Container App managed identity: `6a5a2032-68dd-4c30-83a6-af879df46a4d`
- Required registry role: `AcrPull` at the registry scope
- SharePoint authority: `InformationManagementDataInitiatives` / `Shared Documents`

## Deployment Recipe

- Tool: Azure CLI
- Image build: Azure Container Registry build (`az acr build`)
- Image tag: `docaya:devtest`
- Container App ingress: internal-only
- Change mode: incremental, no deletion

## Validation Steps

- `az bicep build --file infra/main.bicep`
- `npm run build`
- `az role assignment list --scope <registry-resource-id> --assignee-object-id <container-app-principal-id>`
- `az containerapp show --name int-doca-api-fkdjitgh5jkkk --resource-group int-doca-hai-001`
- `curl http://localhost:8787/health/live`
- authenticated `GET /api/v1/documents`
- authenticated resumable upload, workflow, notification, audit, and admin smoke tests

## Validation Proof

- Modular Bicep compilation passed locally. This is not Azure target-scope validation.
- Frontend build passed (`tsc -b && vite build`).
- Live RBAC verification passed: `AcrPull` is assigned to principal `6a5a2032-68dd-4c30-83a6-af879df46a4d` at the ACR resource scope.
- Container App provisioning state is `Succeeded`; active revision is `int-doca-api-fkdjitgh5jkkk--0000002`.
- Published application image: `intdocaacrfkdjitgh5jkkk.azurecr.io/docaya:devtest`.
- Local API smoke checks passed for authentication rejection, health, cursor pagination, upload/hash/scan/commit, audit chaining, and validation errors.
- Graph requests use managed identity bearer authentication when Graph application permissions and admin consent are available.
- Production gates still requiring environment evidence: authorized Azure validation/what-if, Policy/RBAC review, Graph tenant consent and drive verification, approved malware/DLP adapter, PostgreSQL migration rehearsal, private DNS proof, image scan, WORM export, backup/restore, and release approvals. The status MUST NOT be changed to Validated until `.azure/release-gates.md` is complete.

## Optional production adapters and limitations

- `DATABASE_URL` is preferred for PostgreSQL; `POSTGRES_URL` remains a compatibility alias. SQLite is intended only for development/test and is rejected by production configuration.
- Azure AI Search is enabled only when endpoint, index, and either `AZURE_SEARCH_API_KEY` or `AZURE_SEARCH_USE_MANAGED_IDENTITY=true` are supplied. Index/query failures are surfaced; there is no fake success fallback.
- Redis caching uses a Redis-compatible HTTP(S) REST endpoint in `REDIS_URL` (for example, a REST gateway). Native `redis://`/`rediss://` URLs require adding and operating a Redis SDK and are not silently treated as available.
- Service Bus publishing uses the REST API with managed identity and requires `SERVICE_BUS_NAMESPACE` and `SERVICE_BUS_TOPIC`. SAS connection strings are not consumed by this adapter; events must be validated in the target namespace before release.

## Latest local validation

- Unit tests: 16 passed.
- Integration tests: 9 passed.
- Frontend production build: passed.
- Node syntax checks passed for the application entry point, PostgreSQL migration runner, Search, Redis, and Service Bus adapters.
- PostgreSQL migration runner accepts either `DATABASE_URL` or the compatibility alias `POSTGRES_URL`.
