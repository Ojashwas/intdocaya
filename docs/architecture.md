# Architecture

Docaya uses a React 18 browser client and a versioned Node API. The API authenticates Microsoft Entra ID access tokens, derives actor and tenant identity exclusively from verified claims, authorizes capabilities before resource access, and scopes repository queries by tenant. PostgreSQL 16 is authoritative outside local development. SharePoint Online or an approved object store is authoritative for binaries.

State changes flow through validation, authorization, a transaction boundary, and a hash-chained audit append. Uploads are session-based: negotiate, stream ordered chunks, quarantine, integrity hash, malware/DLP scan, storage commit, metadata commit, and event/audit publication. Failed scans never create a document record.

Azure Container Apps uses VNet integration and private DNS for PostgreSQL, Search, Redis, Service Bus, and ACR. Managed identity is used for image pull and Azure/Graph data-plane access. Observability is routed to Application Insights and Log Analytics with correlation IDs preserved end to end.
