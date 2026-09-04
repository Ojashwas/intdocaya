export class AzureOpenAiAdapter {
  constructor({ openaiEndpoint, openaiDeployment, openaiApiKey, openaiApiVersion = '2025-01-01-preview' }) {
    if (!openaiEndpoint || !openaiDeployment || !openaiApiKey)
      throw new Error('Azure OpenAI requires an endpoint, deployment name, and API key.')
    this.endpoint = openaiEndpoint.replace(/\/$/, '')
    this.deployment = openaiDeployment
    this.apiKey = openaiApiKey
    this.apiVersion = openaiApiVersion
  }

  async chat(messages, { maxTokens = 700, temperature = 0.2 } = {}) {
    const response = await fetch(
      `${this.endpoint}/openai/deployments/${encodeURIComponent(this.deployment)}/chat/completions?api-version=${this.apiVersion}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'api-key': this.apiKey },
        body: JSON.stringify({ messages, max_tokens: maxTokens, temperature }),
      },
    )
    if (!response.ok) throw new Error(`Azure OpenAI returned HTTP ${response.status}.`)
    const payload = await response.json()
    const answer = payload.choices?.[0]?.message?.content?.trim()
    if (!answer) throw new Error('Azure OpenAI returned an empty response.')
    return answer
  }
}
