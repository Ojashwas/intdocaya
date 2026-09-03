import { DefaultAzureCredential } from '@azure/identity'

export class ServiceBusRestPublisher {
  constructor({ namespace, topic }) {
    if (!namespace || !topic) throw new Error('Service Bus requires namespace and topic.')
    this.namespace = namespace.replace(/^https?:\/\//, '').replace(/\/$/, '')
    if (!this.namespace.includes('.')) this.namespace += '.servicebus.windows.net'
    this.topic = topic
    this.credential = new DefaultAzureCredential()
  }

  async token() {
    const token = await this.credential.getToken('https://servicebus.azure.net/.default')
    if (!token?.token) throw new Error('Service Bus authentication did not return an access token.')
    return token
  }

  async publish(event) {
    const token = await this.token()
    const response = await fetch(`https://${this.namespace}/${encodeURIComponent(this.topic)}/messages`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token.token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ body: event, contentType: 'application/json' }),
    })
    if (!response.ok) throw new Error(`Service Bus returned HTTP ${response.status}.`)
  }

  async healthCheck() {
    const token = await this.token()
    const response = await fetch(
      `https://${this.namespace}/${encodeURIComponent(this.topic)}?api-version=2014-01`,
      { headers: { authorization: `Bearer ${token.token}` } },
    )
    if (!response.ok) throw new Error(`Service Bus returned HTTP ${response.status}.`)
    return { status: 'ok', provider: 'service-bus' }
  }
}
