<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type NutrientViewer from '@nutrient-sdk/viewer'
import { useAnnotations, type AnnotationData } from '@/composables/useAnnotations'
import { useViewerActions } from '@/composables/useViewerActions'

type Instance = InstanceType<typeof NutrientViewer.Instance>

// =============================================================================
// PROPS & STATE
// =============================================================================

const props = defineProps<{
  viewerInstance: Instance | null
}>()

const instanceRef = computed(() => props.viewerInstance)

const {
  annotations,
  isLoading,
  createTextAnnotation,
  deleteAnnotation,
  refreshAnnotations,
  exportInstantJson,
} = useAnnotations({ instance: instanceRef })

const { currentPage } = useViewerActions({ instance: instanceRef })

// Form state
const annotationText = ref('')
const customDataKey = ref('')
const customDataValue = ref('')

// Export state
const exportedJson = ref<string | null>(null)

// =============================================================================
// HANDLERS
// =============================================================================

async function handleCreateAnnotation() {
  if (!annotationText.value.trim()) return

  // Build custom data if provided
  const customData: Record<string, unknown> = {}
  if (customDataKey.value.trim() && customDataValue.value.trim()) {
    customData[customDataKey.value.trim()] = customDataValue.value.trim()
  }

  try {
    await createTextAnnotation({
      pageIndex: currentPage.value,
      text: annotationText.value,
      position: { left: 50, top: 50 },
      size: { width: 200, height: 100 },
      customData: Object.keys(customData).length > 0 ? customData : undefined,
    })

    // Reset form
    annotationText.value = ''
    customDataKey.value = ''
    customDataValue.value = ''
  } catch (error) {
    console.error('Failed to create annotation:', error)
  }
}

async function handleDeleteAnnotation(id: string) {
  try {
    await deleteAnnotation(id)
  } catch (error) {
    console.error('Failed to delete annotation:', error)
  }
}

async function handleExportJson() {
  try {
    const json = await exportInstantJson()
    exportedJson.value = JSON.stringify(json, null, 2)
  } catch (error) {
    console.error('Failed to export JSON:', error)
  }
}

function handleCopyJson() {
  if (exportedJson.value) {
    navigator.clipboard.writeText(exportedJson.value)
  }
}

function handleCloseExport() {
  exportedJson.value = null
}

// =============================================================================
// COMPUTED
// =============================================================================

const currentPageAnnotations = computed(() =>
  annotations.value.filter((a) => a.pageIndex === currentPage.value),
)

const annotationCount = computed(() => annotations.value.length)

// Refresh when instance changes
watch(instanceRef, async (newInstance) => {
  if (newInstance) {
    await refreshAnnotations()
  }
})
</script>

<template>
  <div class="annotation-tools">
    <!-- Create Annotation -->
    <div class="annotation-tools__group">
      <span class="annotation-tools__label">Create Text Annotation</span>
      <div class="annotation-tools__form">
        <textarea
          v-model="annotationText"
          class="annotation-tools__textarea"
          placeholder="Annotation text..."
          rows="2"
          :disabled="!viewerInstance"
        />
        <div class="annotation-tools__row">
          <input
            v-model="customDataKey"
            type="text"
            class="annotation-tools__input"
            placeholder="Custom key"
            :disabled="!viewerInstance"
          />
          <input
            v-model="customDataValue"
            type="text"
            class="annotation-tools__input"
            placeholder="Custom value"
            :disabled="!viewerInstance"
          />
        </div>
        <button
          class="annotation-tools__btn annotation-tools__btn--primary"
          :disabled="!viewerInstance || !annotationText.trim()"
          @click="handleCreateAnnotation"
        >
          Add to Page {{ currentPage + 1 }}
        </button>
      </div>
    </div>

    <!-- Current Page Annotations -->
    <div class="annotation-tools__group">
      <span class="annotation-tools__label">
        Page {{ currentPage + 1 }} Annotations
        <span class="annotation-tools__count">({{ currentPageAnnotations.length }})</span>
      </span>

      <div v-if="isLoading" class="annotation-tools__loading">Loading...</div>

      <div v-else-if="currentPageAnnotations.length === 0" class="annotation-tools__empty">
        No annotations on this page
      </div>

      <ul v-else class="annotation-tools__list">
        <li
          v-for="annotation in currentPageAnnotations"
          :key="annotation.id"
          class="annotation-tools__item"
        >
          <div class="annotation-tools__item-info">
            <span class="annotation-tools__item-type">{{ annotation.type }}</span>
            <span class="annotation-tools__item-id">{{ annotation.id.slice(0, 8) }}...</span>
          </div>
          <div v-if="annotation.customData" class="annotation-tools__item-custom">
            <span
              v-for="(value, key) in annotation.customData"
              :key="key"
              class="annotation-tools__item-tag"
            >
              {{ key }}: {{ value }}
            </span>
          </div>
          <button
            class="annotation-tools__btn annotation-tools__btn--danger annotation-tools__btn--small"
            @click="handleDeleteAnnotation(annotation.id)"
          >
            Delete
          </button>
        </li>
      </ul>
    </div>

    <!-- Export -->
    <div class="annotation-tools__group">
      <span class="annotation-tools__label">
        Export
        <span class="annotation-tools__count">({{ annotationCount }} total)</span>
      </span>
      <div class="annotation-tools__row">
        <button
          class="annotation-tools__btn"
          :disabled="!viewerInstance"
          @click="handleExportJson"
        >
          Export Instant JSON
        </button>
        <button
          class="annotation-tools__btn"
          :disabled="!viewerInstance"
          @click="refreshAnnotations"
        >
          Refresh
        </button>
      </div>
    </div>

    <!-- Export Preview Modal -->
    <div v-if="exportedJson" class="annotation-tools__modal-overlay" @click.self="handleCloseExport">
      <div class="annotation-tools__modal">
        <div class="annotation-tools__modal-header">
          <span class="annotation-tools__modal-title">Instant JSON Export</span>
          <button class="annotation-tools__modal-close" @click="handleCloseExport">&times;</button>
        </div>
        <pre class="annotation-tools__modal-content">{{ exportedJson }}</pre>
        <div class="annotation-tools__modal-footer">
          <button class="annotation-tools__btn annotation-tools__btn--primary" @click="handleCopyJson">
            Copy to Clipboard
          </button>
          <button class="annotation-tools__btn" @click="handleCloseExport">Close</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.annotation-tools {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.annotation-tools__group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.annotation-tools__label {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.03em;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.annotation-tools__count {
  font-weight: 400;
  text-transform: none;
}

.annotation-tools__form {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.annotation-tools__row {
  display: flex;
  gap: 0.5rem;
}

.annotation-tools__textarea,
.annotation-tools__input {
  padding: 0.5rem;
  font-size: 0.8125rem;
  font-family: inherit;
  color: var(--color-text);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  resize: vertical;
}

.annotation-tools__textarea {
  width: 100%;
  min-height: 60px;
}

.annotation-tools__input {
  flex: 1;
}

.annotation-tools__textarea:focus,
.annotation-tools__input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.annotation-tools__textarea:disabled,
.annotation-tools__input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.annotation-tools__btn {
  padding: 0.375rem 0.75rem;
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

.annotation-tools__btn:hover:not(:disabled) {
  background: var(--color-border);
  border-color: var(--color-text-secondary);
}

.annotation-tools__btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.annotation-tools__btn--primary {
  color: #fff;
  background: var(--color-primary);
  border-color: var(--color-primary);
}

.annotation-tools__btn--primary:hover:not(:disabled) {
  background: var(--color-primary-hover);
  border-color: var(--color-primary-hover);
}

.annotation-tools__btn--danger {
  color: var(--color-error);
  border-color: var(--color-error);
}

.annotation-tools__btn--danger:hover:not(:disabled) {
  color: #fff;
  background: var(--color-error);
}

.annotation-tools__btn--small {
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
}

.annotation-tools__loading,
.annotation-tools__empty {
  font-size: 0.8125rem;
  color: var(--color-text-secondary);
  padding: 0.5rem 0;
}

.annotation-tools__list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 200px;
  overflow-y: auto;
}

.annotation-tools__item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.5rem;
  background: var(--color-background);
  border-radius: var(--radius-sm);
}

.annotation-tools__item-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.annotation-tools__item-type {
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--color-text);
  text-transform: capitalize;
}

.annotation-tools__item-id {
  font-size: 0.75rem;
  font-family: monospace;
  color: var(--color-text-secondary);
}

.annotation-tools__item-custom {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.annotation-tools__item-tag {
  font-size: 0.6875rem;
  padding: 0.125rem 0.375rem;
  background: var(--color-primary);
  color: #fff;
  border-radius: var(--radius-sm);
}

/* Modal styles */
.annotation-tools__modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.annotation-tools__modal {
  background: var(--color-surface);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}

.annotation-tools__modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid var(--color-border);
}

.annotation-tools__modal-title {
  font-size: 1rem;
  font-weight: 600;
}

.annotation-tools__modal-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: var(--color-text-secondary);
  line-height: 1;
}

.annotation-tools__modal-close:hover {
  color: var(--color-text);
}

.annotation-tools__modal-content {
  flex: 1;
  overflow: auto;
  padding: 1rem;
  margin: 0;
  font-size: 0.75rem;
  font-family: monospace;
  background: var(--color-background);
  white-space: pre-wrap;
  word-break: break-all;
}

.annotation-tools__modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: 1rem;
  border-top: 1px solid var(--color-border);
}
</style>
