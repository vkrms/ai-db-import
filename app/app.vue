<template>
  <div style="max-width: 640px; margin: 40px auto; font-family: sans-serif; padding: 0 16px">
    <h1>AI Chat</h1>
    <div style="border: 1px solid #ddd; border-radius: 8px; padding: 16px; min-height: 300px; margin-bottom: 16px; overflow-y: auto">
      <div v-for="message in chat.messages" :key="message.id" style="margin-bottom: 12px">
        <strong>{{ message.role === 'user' ? 'You' : 'AI' }}:</strong>
        <span v-for="part in message.parts" :key="part.type">
          <span v-if="part.type === 'text'" style="margin-left: 8px">{{ part.text }}</span>
        </span>
      </div>
    </div>
    <form @submit.prevent="handleSubmit" style="display: flex; gap: 8px">
      <input
        v-model="input"
        placeholder="Type a message…"
        style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 4px"
      />
      <button type="submit" :disabled="chat.status !== 'ready'" style="padding: 8px 16px; border-radius: 4px; background: #0070f3; color: white; border: none; cursor: pointer">
        {{ chat.status !== 'ready' ? '…' : 'Send' }}
      </button>
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

async function handleSubmit() {
  const text = input.value.trim()
  if (!text) return
  input.value = ''
  await chat.sendMessage({ text })
}
</script>


