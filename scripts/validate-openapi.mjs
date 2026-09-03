import { readFile } from 'node:fs/promises'

const document = JSON.parse(await readFile(new URL('../docs/api/openapi.json', import.meta.url), 'utf8'))
const failures = []
if (document.openapi !== '3.1.0') failures.push('OpenAPI version must be 3.1.0')
if (!document.components?.securitySchemes?.entraBearer) failures.push('Bearer security scheme is missing')
for (const [path, methods] of Object.entries(document.paths || {})) {
  for (const [method, operation] of Object.entries(methods)) {
    if (!['get', 'post', 'put', 'patch', 'delete'].includes(method)) continue
    if (!operation.responses?.default)
      failures.push(`${method.toUpperCase()} ${path} is missing the standard error response`)
    if (path.startsWith('/api/v1/') && !path.includes('/auth/development-token') && !operation.security)
      failures.push(`${method.toUpperCase()} ${path} is missing bearer security`)
  }
}
if (failures.length) {
  console.error(failures.join('\n'))
  process.exit(1)
}
console.log(`OpenAPI 3.1 contract valid: ${Object.keys(document.paths).length} paths`)
