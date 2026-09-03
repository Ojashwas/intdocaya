import { DefaultAzureCredential } from '@azure/identity'

export class AzureSearchAdapter {
  constructor({ endpoint, index, apiKey = '', managedIdentity = false }) {
    if (!endpoint || !index) throw new Error('Azure AI Search requires endpoint and index.')
    if (!apiKey && !managedIdentity) throw new Error('Azure AI Search requires an API key or managed identity.')
    this.endpoint = endpoint.replace(/\/$/, '')
    this.index = index
    this.apiKey = apiKey
    this.credential = managedIdentity && !apiKey ? new DefaultAzureCredential() : null
  }

  async headers() {
    return {
      'content-type': 'application/json',
      ...(this.apiKey
        ? { 'api-key': this.apiKey }
        : { authorization: `Bearer ${(await this.credential.getToken('https://search.azure.com/.default')).token}` }),
    }
  }
  async request(path, body) {
    const response = await fetch(`${this.endpoint}${path}`, {
      method: 'POST',
      headers: await this.headers(),
      body: JSON.stringify(body),
    })
    if (!response.ok) throw new Error(`Azure AI Search returned HTTP ${response.status}.`)
    return response.json()
  }

  async indexDocument(document) {
    return this.request('/indexes/' + encodeURIComponent(this.index) + '/docs/index?api-version=2023-11-01', {
      value: [{ '@search.action': 'mergeOrUpload', ...document }],
    })
  }

  async healthCheck() {
    const response = await fetch(
      `${this.endpoint}/indexes/${encodeURIComponent(this.index)}?api-version=2023-11-01`,
      { headers: await this.headers() },
    )
    if (!response.ok) throw new Error(`Azure AI Search returned HTTP ${response.status}.`)
    return true
  }

  async search(searchText, { top = 25, filter } = {}) {
    const result = await this.request('/indexes/' + encodeURIComponent(this.index) + '/docs/search?api-version=2023-11-01', {
      search: searchText || '*',
      top,
      count: true,
      ...(filter ? { filter } : {}),
    })
    return { items: result.value || [], total: result['@odata.count'] ?? 0 }
  }
}
