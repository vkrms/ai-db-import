<template>
  <div>
    <Label
      for="file-upload-input"
      :class="[
        'flex flex-col items-center justify-center gap-1.5',
        'rounded-lg border-2 border-dashed px-4 py-5 text-center cursor-pointer select-none',
        'transition-colors duration-150',
        isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-gray-50 hover:border-gray-300',
      ]"
      @dragover.prevent="isDragging = true"
      @dragleave.prevent="isDragging = false"
      @drop.prevent="handleDrop"
    >
      <svg
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="text-gray-400"
      >
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
      </svg>
      <span class="text-sm text-gray-500">
        Drop files here or <span class="text-blue-600 font-medium">browse</span>
      </span>
      <span class="text-xs text-gray-400">CSV, JSON, SQL, TXT</span>
    </Label>

    <input
      id="file-upload-input"
      type="file"
      multiple
      accept=".csv,.json,.sql,.txt,.tsv,.md"
      class="sr-only"
      @change="handleFileChange"
    />

    <div v-if="modelValue.length > 0" class="mt-2 flex flex-col gap-1">
      <div
        v-for="file in modelValue"
        :key="file.name + file.size"
        class="flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-sm"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="shrink-0 text-blue-500"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
        <span class="min-w-0 flex-1 truncate text-gray-700">{{ file.name }}</span>
        <span class="shrink-0 text-xs text-gray-400">{{ formatSize(file.size) }}</span>
        <button
          type="button"
          :aria-label="`Remove ${file.name}`"
          class="shrink-0 cursor-pointer border-none bg-transparent text-base leading-none text-gray-400 hover:text-gray-600 px-0.5"
          @click="removeFile(file)"
        >
          ×
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Label } from 'reka-ui'
import { ref } from 'vue'

const props = defineProps<{
  modelValue: File[]
}>()

const emit = defineEmits<{
  'update:modelValue': [files: File[]]
}>()

const isDragging = ref(false)

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function addFiles(incoming: FileList | File[]) {
  const arr = Array.from(incoming)
  const existingKeys = new Set(props.modelValue.map((f) => f.name + f.size))
  const newFiles = arr.filter((f) => !existingKeys.has(f.name + f.size))
  emit('update:modelValue', [...props.modelValue, ...newFiles])
}

function handleDrop(e: DragEvent) {
  isDragging.value = false
  if (e.dataTransfer?.files) addFiles(e.dataTransfer.files)
}

function handleFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files) addFiles(input.files)
  // reset so the same file can be re-selected
  input.value = ''
}

function removeFile(file: File) {
  emit('update:modelValue', props.modelValue.filter((f) => f !== file))
}
</script>
