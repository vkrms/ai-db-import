<template>
  <div class="mx-auto max-w-2xl px-4 py-10 font-sans">
    <h1 class="mb-6 text-2xl font-semibold text-gray-800">AI DB Import</h1>

    <div class="mb-4 min-h-72 overflow-y-auto rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div v-for="message in chat.messages" :key="message.id" class="mb-3">
        <strong class="text-gray-700">{{ message.role === 'user' ? 'You' : 'AI' }}:</strong>
        <span v-for="part in message.parts" :key="part.type">
          <span v-if="part.type === 'text'" class="ml-2 whitespace-pre-wrap text-gray-600">{{ message.role === 'user' ? parseUserMessage(part.text).text : part.text }}</span>
        </span>
        <div v-if="message.role === 'user'" class="mt-1 ml-2 flex flex-wrap gap-1">
          <span
            v-for="name in parseUserMessage(message.parts.find(p => p.type === 'text')?.text ?? '').fileNames"
            :key="name"
            class="inline-flex items-center gap-1 rounded bg-blue-50 border border-blue-200 px-1.5 py-0.5 text-xs text-blue-600"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            {{ name }}
          </span>
        </div>
      </div>
    </div>

    <form @submit.prevent="handleSubmit" class="flex flex-col gap-2">
      <FileUploadZone v-model="files" />

      <div class="flex gap-2">
        <input
          v-model="input"
          placeholder="Ask about your data or describe what to import…"
          class="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
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
import { DefaultChatTransport } from 'ai'
import { ref } from 'vue'

const chat = new Chat({
  transport: new DefaultChatTransport({ api: '/api/chat' }),
})

const input = ref('')
const files = ref<File[]>([])

/** Split a sent message into the visible prompt and the list of attached file names. */
function parseUserMessage(text: string): { text: string; fileNames: string[] } {
  const sep = '\n\n---\nFile: '
  const idx = text.indexOf(sep)
  if (idx === -1) return { text, fileNames: [] }
  const prompt = text.slice(0, idx)
  const fileNames = [...text.matchAll(/^---\nFile: (.+)$/gm)].map((m) => m[1]!)
  return { text: prompt, fileNames }
}

async function handleSubmit() {
  const text = input.value.trim()
  if (!text && files.value.length === 0) return

  let messageText = text

  if (files.value.length > 0) {
    const fileContents = await Promise.all(
      files.value.map(async (file) => {
        const content = await file.text()
        return `\n\n---\nFile: ${file.name}\n\`\`\`\n${content}\n\`\`\``
      }),
    )
    messageText = text + fileContents.join('')
    files.value = []
  }

  input.value = ''
  await chat.sendMessage({ text: messageText })
}
</script>


