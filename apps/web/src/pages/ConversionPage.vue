<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Instance } from '@nutrient-sdk/viewer'
import DocumentViewer from '@/components/DocumentViewer.vue'

const fileInput = ref<HTMLInputElement | null>(null)
const selectedFile = ref<File | null>(null)
const isConverting = ref(false)
const error = ref<string | null>(null)
const conversionResult = ref<{ documentId: string; originalFilename: string; message: string } | null>(null)

// Viewer state
const viewerInstance = ref<Instance | null>(null)
const serverUrl = computed(() => import.meta.env.VITE_DE_URL || 'http://localhost:5000')

const supportedFormats = [
  { ext: '.docx', name: 'Word Document' },
  { ext: '.xlsx', name: 'Excel Spreadsheet' },
  { ext: '.pptx', name: 'PowerPoint Presentation' },
  { ext: '.doc', name: 'Word Document (Legacy)' },
  { ext: '.xls', name: 'Excel Spreadsheet (Legacy)' },
  { ext: '.ppt', name: 'PowerPoint (Legacy)' },
]

const acceptedExtensions = supportedFormats.map(f => f.ext).join(',')

function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) {
    selectedFile.value = file
    error.value = null
    conversionResult.value = null
  }
}

function triggerFileInput() {
  fileInput.value?.click()
}

async function convertDocument() {
  if (!selectedFile.value) return

  isConverting.value = true
  error.value = null

  try {
    const formData = new FormData()
    formData.append('file', selectedFile.value)

    const response = await fetch('/api/convert', {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `Conversion failed: ${response.status}`)
    }

    conversionResult.value = await response.json()
    console.log('Conversion result:', conversionResult.value)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Conversion failed'
  } finally {
    isConverting.value = false
  }
}

function handleViewerLoaded(instance: Instance) {
  console.log('Viewer loaded successfully')
  viewerInstance.value = instance
}

function handleViewerError(err: Error) {
  console.error('Viewer error:', err)
  error.value = err.message
}

function reset() {
  selectedFile.value = null
  conversionResult.value = null
  error.value = null
  viewerInstance.value = null
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}
</script>

<template>
  <div class="conversion">
    <aside class="conversion__sidebar">
      <div class="panel">
        <h2 class="panel__title">Document Conversion</h2>
        <p class="panel__description">
          Upload an Office document and Document Engine will convert it to PDF server-side.
        </p>

        <div class="formats">
          <h3 class="formats__title">Supported Formats</h3>
          <ul class="formats__list">
            <li v-for="format in supportedFormats" :key="format.ext" class="formats__item">
              <code>{{ format.ext }}</code> {{ format.name }}
            </li>
          </ul>
        </div>

        <div class="upload">
          <input
            ref="fileInput"
            type="file"
            :accept="acceptedExtensions"
            class="upload__input"
            @change="handleFileSelect"
          />

          <button
            v-if="!selectedFile"
            class="btn btn--primary btn--full"
            @click="triggerFileInput"
          >
            Select File
          </button>

          <template v-else>
            <div class="upload__selected">
              <span class="upload__filename">{{ selectedFile.name }}</span>
              <span class="upload__size">({{ (selectedFile.size / 1024).toFixed(1) }} KB)</span>
            </div>

            <div class="upload__actions">
              <button
                class="btn btn--primary"
                :disabled="isConverting"
                @click="convertDocument"
              >
                {{ isConverting ? 'Converting...' : 'Convert to PDF' }}
              </button>
              <button
                class="btn btn--secondary"
                :disabled="isConverting"
                @click="reset"
              >
                Clear
              </button>
            </div>
          </template>
        </div>

        <div v-if="error" class="message message--error">
          {{ error }}
        </div>

        <div v-if="conversionResult" class="message message--success">
          <strong>Conversion successful!</strong><br />
          {{ conversionResult.message }}
        </div>
      </div>
    </aside>

    <section class="conversion__viewer">
      <DocumentViewer
        v-if="conversionResult?.documentId"
        :document-id="conversionResult.documentId"
        :server-url="serverUrl"
        @loaded="handleViewerLoaded"
        @error="handleViewerError"
      />
      <div v-else class="placeholder">
        <p>Upload and convert a document to view it here</p>
      </div>
    </section>
  </div>
</template>

<style scoped>
.conversion {
  display: flex;
  flex: 1;
  min-height: 0;
}

.conversion__sidebar {
  width: var(--sidebar-width);
  flex-shrink: 0;
  background: var(--color-surface);
  border-right: 1px solid var(--color-border);
  overflow-y: auto;
  padding: 1.5rem;
}

.conversion__viewer {
  flex: 1;
  min-width: 0;
  background: var(--color-background);
}

.panel__title {
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.panel__description {
  color: var(--color-text-secondary);
  margin-bottom: 1.5rem;
}

.formats {
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: var(--color-background);
  border-radius: var(--radius-md);
}

.formats__title {
  font-size: 0.875rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.formats__list {
  list-style: none;
  font-size: 0.875rem;
}

.formats__item {
  padding: 0.25rem 0;
  color: var(--color-text-secondary);
}

.formats__item code {
  background: var(--color-surface);
  padding: 0.125rem 0.375rem;
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  margin-right: 0.5rem;
}

.upload__input {
  display: none;
}

.upload__selected {
  padding: 0.75rem;
  background: var(--color-background);
  border-radius: var(--radius-md);
  margin-bottom: 0.75rem;
}

.upload__filename {
  font-weight: 500;
  word-break: break-all;
}

.upload__size {
  color: var(--color-text-secondary);
  font-size: 0.875rem;
}

.upload__actions {
  display: flex;
  gap: 0.5rem;
}

.btn {
  padding: 0.625rem 1rem;
  border: none;
  border-radius: var(--radius-md);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color var(--transition-fast);
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn--primary {
  background: var(--color-primary);
  color: white;
}

.btn--primary:hover:not(:disabled) {
  background: var(--color-primary-hover);
}

.btn--secondary {
  background: var(--color-background);
  color: var(--color-text);
}

.btn--secondary:hover:not(:disabled) {
  background: var(--color-border);
}

.btn--full {
  width: 100%;
}

.message {
  margin-top: 1rem;
  padding: 0.75rem;
  border-radius: var(--radius-md);
  font-size: 0.875rem;
}

.message--error {
  background: #ffeaea;
  color: var(--color-error);
}

.message--success {
  background: #e8f5e9;
  color: var(--color-success);
}

.placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--color-text-secondary);
}
</style>
