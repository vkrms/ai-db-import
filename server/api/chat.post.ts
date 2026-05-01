import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  stepCountIs,
  streamText,
  tool,
} from 'ai'
import { csvDataSchema, emitCsvInputSchema, type AppUIMessage, type CsvData, type EmitCsvInput } from '../../app/utils/ai'

function escapeCsvCell(value: unknown): string {
  const text = String(value ?? '').replace(/\r\n/g, '\n')
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

function toCsv(columns: string[], rows: string[][]): string {
  return [columns, ...rows]
    .map((row) => row.map(escapeCsvCell).join(','))
    .join('\r\n')
}

function normalizeCsvRows(input: EmitCsvInput['rows']): string[][] {
  return input.map((row: EmitCsvInput['rows'][number]) => row.map((cell: EmitCsvInput['rows'][number][number]) => (cell == null ? '' : String(cell))))
}

function csvDataPartToPromptText(data: CsvData): string {
  if (data.status === 'error') {
    return `Previous CSV generation for ${data.filename} failed: ${data.error}`
  }

  return [
    `Previously generated CSV file ${data.filename}.`,
    `Columns: ${data.columns.join(', ')}`,
    `Row count: ${data.rowCount}`,
    data.summary ? `Summary: ${data.summary}` : null,
    '```csv',
    data.csv,
    '```',
  ]
    .filter(Boolean)
    .join('\n')
}

const csvSystemPrompt = [
  'You help transform uploaded data into import-ready CSV files.',
  'When the user asks for tabular output, transformed records, or an import file, call the emitCsv tool instead of pasting raw CSV into assistant text.',
  'Use stable column names and make every row match the column count exactly.',
  'After the tool succeeds, provide a brief explanation of what was generated.',
].join('\n')

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  if (!config.openrouterApiKey) {
    throw createError({ statusCode: 500, statusMessage: 'OPENROUTER_API_KEY is not configured' })
  }

  const body = await readBody(event)
  if (!body?.messages || !Array.isArray(body.messages)) {
    throw createError({ statusCode: 400, statusMessage: 'messages must be an array' })
  }

  const openrouter = createOpenRouter({ apiKey: config.openrouterApiKey })
  const messages = body.messages as AppUIMessage[]

  const stream = createUIMessageStream<AppUIMessage>({
    execute: async ({ writer }) => {
      const result = streamText({
        model: openrouter(config.openrouterModel || 'qwen/qwen3.6-plus'),
        system: csvSystemPrompt,
        messages: await convertToModelMessages(messages, {
          convertDataPart: (part) => {
            if (part.type !== 'data-csv') return undefined

            const parsed = csvDataSchema.safeParse(part.data)
            if (!parsed.success) return undefined

            return {
              type: 'text' as const,
              text: csvDataPartToPromptText(parsed.data),
            }
          },
        }),
        stopWhen: stepCountIs(3),
        tools: {
          emitCsv: tool({
            description: 'Create an import-ready CSV file from structured tabular data',
            inputSchema: emitCsvInputSchema,
            execute: async ({ filename, columns, rows, summary }) => {
              const id = crypto.randomUUID()
              const normalizedRows = normalizeCsvRows(rows)
              const invalidRowIndex = normalizedRows.findIndex((row) => row.length !== columns.length)

              if (invalidRowIndex >= 0) {
                const error = `Row ${invalidRowIndex + 1} has ${normalizedRows[invalidRowIndex]?.length ?? 0} values but expected ${columns.length}.`

                writer.write({
                  type: 'data-csv',
                  id,
                  data: {
                    id,
                    filename,
                    status: 'error',
                    error,
                    ...(summary ? { summary } : {}),
                  },
                })

                return {
                  emitted: false,
                  filename,
                  error,
                }
              }

              const csv = toCsv(columns, normalizedRows)

              writer.write({
                type: 'data-csv',
                id,
                data: {
                  id,
                  filename,
                  status: 'ready',
                  csv,
                  columns,
                  rowCount: normalizedRows.length,
                  ...(summary ? { summary } : {}),
                },
              })

              return {
                emitted: true,
                filename,
                columns,
                rowCount: normalizedRows.length,
                ...(summary ? { summary } : {}),
              }
            },
          }),
        },
        providerOptions: {
          openrouter: {
            reasoning: { effort: 'high' },
          },
        },
      })

      writer.merge(result.toUIMessageStream())
    },
  })

  return createUIMessageStreamResponse({ stream })
})
