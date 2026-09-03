import http from 'k6/http'
import { check, sleep } from 'k6'

export const options = {
  stages: [
    { duration: '15s', target: 10 },
    { duration: '30s', target: 50 },
    { duration: '15s', target: 0 },
  ],
  thresholds: { http_req_duration: ['p(95)<400'], http_req_failed: ['rate<0.01'] },
}
export function setup() {
  const response = http.post(`${__ENV.BASE_URL || 'http://127.0.0.1:8787'}/api/v1/auth/development-token`)
  return { token: response.json('accessToken') }
}
export default function (data) {
  const response = http.get(`${__ENV.BASE_URL || 'http://127.0.0.1:8787'}/api/v1/documents?limit=25`, {
    headers: { Authorization: `Bearer ${data.token}` },
  })
  check(response, { 'documents returned': (result) => result.status === 200 })
  sleep(0.2)
}
