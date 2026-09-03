# Threat model

| Threat                         | Primary control                                                          | Verification                                   |
| ------------------------------ | ------------------------------------------------------------------------ | ---------------------------------------------- |
| Token forgery/replay           | Entra signature, issuer, audience, expiry validation; short-lived tokens | Auth unit and API negative tests               |
| Cross-tenant data access       | Tenant claim scoping plus resource ABAC                                  | Authorization and contract tests               |
| Privilege escalation           | Deny-by-default role capability map                                      | Viewer write/approval negative tests           |
| Malicious or oversized upload  | Extension/MIME/size rules, bounded streaming, quarantine, scan/DLP, hash | Upload integration and interruption/load tests |
| Duplicate side effects         | Required idempotency keys and session uniqueness                         | Contract tests                                 |
| Audit tampering                | Append-only access model, previous-hash chain, WORM export               | Chain verification and storage policy evidence |
| Secret disclosure              | Key Vault/secret references; normalized errors; minimal health           | Secret scan and response tests                 |
| Private service exposure       | Disabled public access, private endpoints/DNS, VNet egress               | Bicep checks and runtime DNS probes            |
| Browser injection/clickjacking | CSP, no-sniff, frame deny, validation, React escaping                    | Header tests and DAST                          |
| Availability abuse             | Request/chunk limits, per-source rate limiting, bounded retries          | Throttling and load tests                      |

Residual production risks are the external scanner/DLP provider, Graph tenant consent, cross-region recovery, WORM export, and edge WAF/bot configuration; release ownership must attach evidence for each.
