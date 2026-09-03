import { DefaultAzureCredential } from '@azure/identity'

export class ServiceBusRestPublisher {
  constructor({ namespace, topic }) {
    if (!namespace || !topic) throw new Error('Service Bus requires namespace and topic.')
    this.namespace = namespace.replace(/^https?:\/\//, '').replace(/\/$/, '')
    if (!this.namespace.includes('.')) this.namespace += '.servicebus.windows.net'
    this.topic = topic
    this.credential = new DefaultAzureCredential()
  }

  async publish(event) {
    const token = await this.credential.getToken('https://servicebus.azure.net/.default')
    const response = await fetch(`https://${this.namespace}/${encodeURIComponent(this.topic)}/messages`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token.token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ body: event, contentType: 'application/json' }),
    })
    if (!response.ok) throw new Error(`Service Bus returned HTTP ${response.status}.`)
  }
}
