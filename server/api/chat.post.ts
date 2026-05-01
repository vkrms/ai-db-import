import { createOpenAI } from '@ai-sdk/openai'
import { convertToModelMessages, streamText } from 'ai'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  if (!config.openrouterApiKey) {
    throw createError({ statusCode: 500, statusMessage: 'OPENROUTER_API_KEY is not configured' })
  }

  const body = await readBody(event)
  if (!body?.messages || !Array.isArray(body.messages)) {
    throw createError({ statusCode: 400, statusMessage: 'messages must be an array' })
  }

  const openrouter = createOpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: config.openrouterApiKey,
  })

  const result = streamText({
    model: openrouter(config.openrouterModel || 'qwen/qwen3-235b-a22b'),
    messages: await convertToModelMessages(body.messages),
  })

  return result.toUIMessageStreamResponse()
})
