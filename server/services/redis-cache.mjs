export class RedisCacheAdapter {
  constructor(url, token = '') {
    if (!/^https?:\/\//i.test(url)) throw new Error('REDIS_URL must be an HTTP(S) REST endpoint; native redis URLs are not supported without a Redis SDK.')
    this.url = url.replace(/\/$/, '')
    this.token = token
  }

  async command(command) {
    const response = await fetch(this.url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(this.token ? { authorization: `Bearer ${this.token}` } : {}) },
      body: JSON.stringify(command),
    })
    if (!response.ok) throw new Error(`Redis returned HTTP ${response.status}.`)
    return response.json()
  }

  async get(key) {
    const result = await this.command(['GET', key])
    return result.result ?? result[1] ?? null
  }

  async set(key, value, ttlSeconds = 60) {
    return this.command(['SET', key, value, 'EX', String(ttlSeconds)])
  }
}
