import type { UIMessage } from 'ai'
import { z } from 'zod'

export const csvCellSchema = z.union([z.string(), z.number(), z.boolean(), z.null()])

export const emitCsvInputSchema = z.object({
  filename: z.string().min(1).describe('Filename for the generated CSV, for example customers.csv'),
  columns: z.array(z.string().min(1)).min(1).describe('Ordered CSV column names'),
  rows: z.array(z.array(csvCellSchema)).describe('CSV rows, where each item maps to the columns by index'),
  summary: z.string().optional().describe('Optional short explanation of what the CSV contains'),
})

export type EmitCsvInput = z.infer<typeof emitCsvInputSchema>

export const csvReadyDataSchema = z.object({
  id: z.string(),
  filename: z.string(),
  status: z.literal('ready'),
  csv: z.string(),
  columns: z.array(z.string()),
  rowCount: z.number().int().nonnegative(),
  summary: z.string().optional(),
})

export const csvErrorDataSchema = z.object({
  id: z.string(),
  filename: z.string(),
  status: z.literal('error'),
  error: z.string(),
  summary: z.string().optional(),
})

export const csvDataSchema = z.discriminatedUnion('status', [csvReadyDataSchema, csvErrorDataSchema])

export type CsvData = z.infer<typeof csvDataSchema>

export const notificationDataSchema = z.object({
  message: z.string(),
  level: z.enum(['info', 'warning', 'error']),
})

export type NotificationData = z.infer<typeof notificationDataSchema>

export const appDataPartSchemas = {
  csv: csvDataSchema,
  notification: notificationDataSchema,
}

export type AppUIMessage = UIMessage<
  never,
  {
    csv: CsvData
    notification: NotificationData
  }
>
