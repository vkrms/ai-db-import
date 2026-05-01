<template>
  <div class="mx-auto max-w-2xl px-4 py-10 font-sans">
    <h1 class="mb-6 text-2xl font-semibold text-gray-800">AI DB Import</h1>

    <div class="mb-4 min-h-72 overflow-y-auto rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div v-for="message in chat.messages" :key="message.id" class="mb-3">
        <strong class="text-gray-700">{{ message.role === 'user' ? 'You' : 'AI' }}:</strong>
        <template v-for="(part, i) in message.parts" :key="i">
          <span v-if="part.type === 'text'" class="ml-2 whitespace-pre-wrap text-gray-600">{{ part.text }}</span>
          <div
            v-else-if="part.type === 'data-csv'"
            class="ml-2 mt-2 max-w-full rounded-lg border px-3 py-2"
            :class="part.data.status === 'ready' ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50'"
          >
            <template v-if="part.data.status === 'ready'">
              <div class="flex flex-wrap items-start justify-between gap-3">
                <div class="min-w-0 flex-1">
                  <div class="text-sm font-medium text-emerald-950">{{ part.data.filename }}</div>
                  <div class="text-xs text-emerald-700">
                    {{ part.data.rowCount }} rows · {{ part.data.columns.length }} columns
                  </div>
                  <p v-if="part.data.summary" class="mt-1 text-xs text-emerald-800">{{ part.data.summary }}</p>
                </div>
                <button
                  type="button"
                  class="rounded-md border border-emerald-300 bg-white px-2.5 py-1 text-xs font-medium text-emerald-900 transition-colors hover:bg-emerald-100"
                  @click="downloadCsv(part.data.filename, part.data.csv)"
                >
                  Download CSV
                </button>
              </div>

              <pre class="mt-2 overflow-x-auto rounded-md border border-emerald-200 bg-white p-2 text-xs text-emerald-950">{{ previewCsv(part.data.csv) }}</pre>
            </template>

            <template v-else>
              <div class="text-sm font-medium text-rose-900">{{ part.data.filename }}</div>
              <p v-if="part.data.summary" class="mt-1 text-xs text-rose-800">{{ part.data.summary }}</p>
              <p class="mt-1 text-xs text-rose-700">{{ part.data.error }}</p>
            </template>
          </div>
        </template>
        <div v-if="message.role === 'user'" class="mt-1 ml-2 flex flex-wrap gap-1">
          <template v-for="(part, i) in message.parts" :key="i">
            <span
              v-if="part.type === 'file'"
              class="inline-flex items-center gap-1 rounded border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-xs text-blue-600"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              {{ part.filename }}
            </span>
          </template>
        </div>
      </div>
    </div>

    <form @submit.prevent="handleSubmit" class="flex flex-col gap-2">
      <FileUploadZone v-model="files" />

      <div class="flex items-end gap-2">
        <textarea
          v-model="input"
          rows="1"
          placeholder="Ask about your data or describe what to import…"
          class="max-h-48 min-h-10 flex-1 resize-none overflow-y-auto rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          style="field-sizing: content"
          @keydown="handleInputKeydown"
        />
        <button
          type="submit"
          :disabled="chat.status !== 'ready' || (!input.trim() && files.length === 0)"
          class="whitespace-nowrap rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {{ chat.status !== 'ready' ? '…' : 'Send' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { Chat } from '@ai-sdk/vue'
import { DefaultChatTransport, type FileUIPart } from 'ai'
import { ref } from 'vue'
import { appDataPartSchemas, type AppUIMessage } from './utils/ai'

const chat = new Chat<AppUIMessage>({
  transport: new DefaultChatTransport({ api: '/api/chat' }),
  dataPartSchemas: appDataPartSchemas,
})

const input = ref('')
const files = ref<File[]>([])

function handleInputKeydown(event: KeyboardEvent) {
  if (event.key !== 'Enter' || event.shiftKey || event.altKey || event.ctrlKey || event.metaKey || event.isComposing) return

  event.preventDefault()
  void handleSubmit()
}

function toFileUIParts(fileList: File[]): Promise<FileUIPart[]> {
  return Promise.all(
    fileList.map(
      (file) =>
        new Promise<FileUIPart>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () =>
            resolve({
              type: 'file',
              filename: file.name,
              mediaType: file.type || 'text/plain',
              url: reader.result as string,
            })
          reader.onerror = reject
          reader.readAsDataURL(file)
        }),
    ),
  )
}

function previewCsv(csv: string, maxLines = 8): string {
  const lines = csv.split(/\r?\n/)
  const preview = lines.slice(0, maxLines).join('\n')
  return lines.length > maxLines ? `${preview}\n...` : preview
}

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = filename
  link.click()

  URL.revokeObjectURL(url)
}

async function handleSubmit() {
  if (chat.status !== 'ready') return

  const text = input.value.trim()
  if (!text && files.value.length === 0) return

  const attachments = files.value.length > 0 ? await toFileUIParts(files.value) : undefined

  input.value = ''
  files.value = []
  await chat.sendMessage({ text, files: attachments })
}
</script>


