<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'

// =============================================================================
// TYPES
// =============================================================================

export interface PredefinedDocument {
  id: string
  name: string
  url: string
}

export interface ServerDocument {
  document_id: string
  title?: string
  created_at?: string
}

export type ViewerMode = 'standalone' | 'document-engine'

// =============================================================================
// PROPS & EMITS
// =============================================================================

const props = withDefaults(
  defineProps<{
    predefinedDocuments?: PredefinedDocument[]
    currentDocumentName?: string
    mode?: ViewerMode
  }>(),
  {
    predefinedDocuments: () => [],
    mode: 'standalone',
  },
)

const emit = defineEmits<{
  selectUrl: [url: string, name: string]
  selectFile: [data: ArrayBuffer, name: string]
  selectDocumentId: [documentId: string, name: string]
  'update:mode': [mode: ViewerMode]
}>()

// =============================================================================
// STATE
// =============================================================================

const selectedDocumentId = ref('')
const uploadedFileName = ref<string | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)
const isUploading = ref(false)

// Document Engine state
const serverDocuments = ref<ServerDocument[]>([])
const isLoadingDocuments = ref(false)
const serverError = ref<string | null>(null)
const selectedServerDocId = ref('')

// =============================================================================
// COMPUTED
// =============================================================================

const displayName = computed(() => {
  if (uploadedFileName.value) {
    return uploadedFileName.value
  }
  if (props.currentDocumentName) {
    return props.currentDocumentName
  }
  return 'No document loaded'
})

const isDocumentEngineMode = computed(() => props.mode === 'document-engine')

// =============================================================================
// DOCUMENT ENGINE API
// =============================================================================

async function fetchServerDocuments() {
  isLoadingDocuments.value = true
  serverError.value = null

  try {
    const response = await fetch('/api/documents')
    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.message || 'Failed to fetch documents')
    }
    const data = await response.json()
    serverDocuments.value = data.data || data || []
  } catch (error) {
    serverError.value = error instanceof Error ? error.message : 'Failed to fetch documents'
    console.error('Failed to fetch documents:', error)
  } finally {
    isLoadingDocuments.value = false
  }
}

async function uploadToServer(file: File): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)

  const isPdf = file.type === 'application/pdf' || file.name.endsWith('.pdf')
  const endpoint = isPdf ? '/api/documents' : '/api/convert'

  const response = await fetch(endpoint, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.message || 'Failed to upload document')
  }

  const data = await response.json()
  return data.documentId
}

async function deleteFromServer(documentId: string): Promise<void> {
  const response = await fetch(`/api/documents/${documentId}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.message || 'Failed to delete document')
  }
}

// =============================================================================
// HANDLERS
// =============================================================================

function handleModeChange(event: Event) {
  const select = event.target as HTMLSelectElement
  emit('update:mode', select.value as ViewerMode)
}

function handleSelectDocument(event: Event) {
  const select = event.target as HTMLSelectElement
  const documentId = select.value

  if (!documentId) return

  const document = props.predefinedDocuments.find((d) => d.id === documentId)
  if (document) {
    selectedDocumentId.value = documentId
    uploadedFileName.value = null
    emit('selectUrl', document.url, document.name)
  }
}

function handleSelectServerDocument(event: Event) {
  const select = event.target as HTMLSelectElement
  const documentId = select.value

  if (!documentId) return

  const doc = serverDocuments.value.find((d) => d.document_id === documentId)
  if (doc) {
    selectedServerDocId.value = documentId
    uploadedFileName.value = null
    emit('selectDocumentId', documentId, doc.title || documentId)
  }
}

function handleUploadClick() {
  fileInputRef.value?.click()
}

async function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]

  if (!file) return

  isUploading.value = true

  try {
    if (isDocumentEngineMode.value) {
      // Upload to Document Engine
      const documentId = await uploadToServer(file)
      uploadedFileName.value = file.name
      selectedDocumentId.value = ''
      selectedServerDocId.value = documentId
      emit('selectDocumentId', documentId, file.name)
      // Refresh document list
      await fetchServerDocuments()
    } else {
      // Standalone mode - validate PDF and load locally
      if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
        alert('Please select a PDF file (or use Document Engine mode for Office files)')
        input.value = ''
        return
      }
      const arrayBuffer = await file.arrayBuffer()
      uploadedFileName.value = file.name
      selectedDocumentId.value = ''
      emit('selectFile', arrayBuffer, file.name)
    }
  } catch (error) {
    console.error('Failed to handle file:', error)
    alert(error instanceof Error ? error.message : 'Failed to handle file')
  } finally {
    isUploading.value = false
    input.value = '' // Reset input for re-upload of same file
  }
}

function handleClearUpload() {
  uploadedFileName.value = null
  if (fileInputRef.value) {
    fileInputRef.value.value = ''
  }

  if (isDocumentEngineMode.value) {
    // In DE mode, select first server document
    const firstDoc = serverDocuments.value[0]
    if (firstDoc) {
      selectedServerDocId.value = firstDoc.document_id
      emit('selectDocumentId', firstDoc.document_id, firstDoc.title || firstDoc.document_id)
    }
  } else {
    // Reload the first predefined document as default
    const defaultDoc = props.predefinedDocuments[0]
    if (defaultDoc) {
      selectedDocumentId.value = defaultDoc.id
      emit('selectUrl', defaultDoc.url, defaultDoc.name)
    }
  }
}

async function handleDeleteDocument(documentId: string) {
  if (!confirm('Are you sure you want to delete this document?')) return

  try {
    await deleteFromServer(documentId)
    await fetchServerDocuments()
    // If we deleted the currently selected document, clear selection
    if (selectedServerDocId.value === documentId) {
      selectedServerDocId.value = ''
      uploadedFileName.value = null
    }
  } catch (error) {
    alert(error instanceof Error ? error.message : 'Failed to delete document')
  }
}

function handleRefreshDocuments() {
  fetchServerDocuments()
}

// =============================================================================
// LIFECYCLE
// =============================================================================

// Fetch documents when switching to DE mode
watch(
  () => props.mode,
  (newMode) => {
    if (newMode === 'document-engine') {
      fetchServerDocuments()
    }
  },
)

onMounted(() => {
  if (props.mode === 'document-engine') {
    fetchServerDocuments()
  }
})

// Accept file types based on mode
const acceptedFileTypes = computed(() => {
  if (isDocumentEngineMode.value) {
    return '.pdf,.docx,.xlsx,.pptx,.doc,.xls,.ppt'
  }
  return '.pdf'
})
</script>

<template>
  <div class="document-selector">
    <!-- Mode Toggle -->
    <div class="document-selector__group">
      <label class="document-selector__label" for="mode-select">Mode</label>
      <select
        id="mode-select"
        class="document-selector__select"
        :value="mode"
        @change="handleModeChange"
      >
        <option value="standalone">Standalone (Local PDFs)</option>
        <option value="document-engine">Document Engine (Server)</option>
      </select>
    </div>

    <!-- Current Document Display -->
    <div class="document-selector__current">
      <span class="document-selector__current-label">Current:</span>
      <span class="document-selector__current-name" :title="displayName">
        {{ displayName }}
      </span>
    </div>

    <!-- Standalone Mode: Predefined Documents -->
    <div v-if="!isDocumentEngineMode && predefinedDocuments.length > 0" class="document-selector__group">
      <label class="document-selector__label" for="predefined-select">
        Sample Documents
      </label>
      <select
        id="predefined-select"
        class="document-selector__select"
        :value="selectedDocumentId"
        @change="handleSelectDocument"
      >
        <option value="">Select a document...</option>
        <option
          v-for="doc in predefinedDocuments"
          :key="doc.id"
          :value="doc.id"
        >
          {{ doc.name }}
        </option>
      </select>
    </div>

    <!-- Document Engine Mode: Server Documents -->
    <div v-if="isDocumentEngineMode" class="document-selector__group">
      <div class="document-selector__label-row">
        <label class="document-selector__label" for="server-select">
          Server Documents
        </label>
        <button
          class="document-selector__icon-btn"
          title="Refresh"
          :disabled="isLoadingDocuments"
          @click="handleRefreshDocuments"
        >
          &#x21bb;
        </button>
      </div>

      <div v-if="serverError" class="document-selector__error">
        {{ serverError }}
      </div>

      <select
        v-else
        id="server-select"
        class="document-selector__select"
        :value="selectedServerDocId"
        :disabled="isLoadingDocuments"
        @change="handleSelectServerDocument"
      >
        <option value="">
          {{ isLoadingDocuments ? 'Loading...' : 'Select a document...' }}
        </option>
        <option
          v-for="doc in serverDocuments"
          :key="doc.document_id"
          :value="doc.document_id"
        >
          {{ doc.title || doc.document_id }}
        </option>
      </select>

      <!-- Delete button for selected document -->
      <button
        v-if="selectedServerDocId"
        class="document-selector__delete-btn"
        @click="handleDeleteDocument(selectedServerDocId)"
      >
        Delete Selected Document
      </button>
    </div>

    <!-- File Upload -->
    <div class="document-selector__group">
      <span class="document-selector__label">
        {{ isDocumentEngineMode ? 'Upload File' : 'Upload PDF' }}
      </span>
      <div class="document-selector__hint" v-if="isDocumentEngineMode">
        Supports PDF, Word, Excel, PowerPoint
      </div>
      <div class="document-selector__upload-row">
        <button
          class="document-selector__btn"
          :disabled="isUploading"
          @click="handleUploadClick"
        >
          {{ isUploading ? 'Uploading...' : 'Choose File' }}
        </button>
        <span v-if="uploadedFileName" class="document-selector__filename">
          {{ uploadedFileName }}
          <button
            class="document-selector__clear-btn"
            title="Clear"
            @click="handleClearUpload"
          >
            &times;
          </button>
        </span>
      </div>
      <input
        ref="fileInputRef"
        type="file"
        :accept="acceptedFileTypes"
        class="document-selector__file-input"
        @change="handleFileChange"
      />
    </div>
  </div>
</template>

<style scoped>
.document-selector {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.document-selector__current {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  background: var(--color-background);
  border-radius: var(--radius-sm);
}

.document-selector__current-label {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--color-text-secondary);
}

.document-selector__current-name {
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--color-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.document-selector__group {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.document-selector__label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.document-selector__label {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--color-text-secondary);
}

.document-selector__hint {
  font-size: 0.6875rem;
  color: var(--color-text-secondary);
  font-style: italic;
}

.document-selector__select {
  padding: 0.5rem;
  font-size: 0.8125rem;
  color: var(--color-text);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  cursor: pointer;
}

.document-selector__select:focus {
  outline: none;
  border-color: var(--color-primary);
}

.document-selector__select:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.document-selector__upload-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.document-selector__btn {
  padding: 0.5rem 0.75rem;
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--color-text);
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition:
    background var(--transition-fast),
    border-color var(--transition-fast);
}

.document-selector__btn:hover:not(:disabled) {
  background: var(--color-border);
  border-color: var(--color-text-secondary);
}

.document-selector__btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.document-selector__filename {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.document-selector__clear-btn {
  padding: 0;
  width: 1.25rem;
  height: 1.25rem;
  font-size: 1rem;
  line-height: 1;
  color: var(--color-text-secondary);
  background: transparent;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  flex-shrink: 0;
}

.document-selector__clear-btn:hover {
  color: var(--color-error);
  background: var(--color-background);
}

.document-selector__icon-btn {
  padding: 0.25rem;
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
}

.document-selector__icon-btn:hover:not(:disabled) {
  color: var(--color-primary);
  background: var(--color-background);
}

.document-selector__icon-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.document-selector__delete-btn {
  margin-top: 0.25rem;
  padding: 0.375rem 0.5rem;
  font-size: 0.75rem;
  color: var(--color-error);
  background: transparent;
  border: 1px solid var(--color-error);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background var(--transition-fast);
}

.document-selector__delete-btn:hover {
  background: rgba(211, 47, 47, 0.1);
}

.document-selector__error {
  font-size: 0.75rem;
  color: var(--color-error);
  padding: 0.5rem;
  background: rgba(211, 47, 47, 0.1);
  border-radius: var(--radius-sm);
}

.document-selector__file-input {
  display: none;
}
</style>
