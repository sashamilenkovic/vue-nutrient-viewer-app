<script setup lang="ts">
import { ref } from 'vue'
import type NutrientViewer from '@nutrient-sdk/viewer'
import DocumentSelector from '@/components/controls/DocumentSelector.vue'
import ViewerActions from '@/components/controls/ViewerActions.vue'
import AnnotationTools from '@/components/controls/AnnotationTools.vue'
import LayerControls from '@/components/controls/LayerControls.vue'
import EventLog from '@/components/controls/EventLog.vue'

type Instance = InstanceType<typeof NutrientViewer.Instance>

// =============================================================================
// PROPS
// =============================================================================

defineProps<{
  viewerInstance: Instance | null
  currentPage: number
  totalPages: number
  currentDocumentName?: string
}>()

const emit = defineEmits<{
  loadDocumentId: [documentId: string, name: string]
}>()

// =============================================================================
// STATE
// =============================================================================

// Collapsible sections
const sections = ref({
  document: true,
  actions: true,
  annotations: false,
  layers: false,
  events: false,
})

// =============================================================================
// HANDLERS
// =============================================================================

function handleSelectDocumentId(documentId: string, name: string) {
  emit('loadDocumentId', documentId, name)
}

function toggleSection(section: keyof typeof sections.value) {
  sections.value[section] = !sections.value[section]
}
</script>

<template>
  <div class="control-panel">
    <!-- Document Section -->
    <section class="control-panel__section">
      <button
        class="control-panel__heading"
        :class="{ 'control-panel__heading--collapsed': !sections.document }"
        @click="toggleSection('document')"
      >
        <span>Document</span>
        <span class="control-panel__toggle">{{ sections.document ? '−' : '+' }}</span>
      </button>

      <div v-show="sections.document" class="control-panel__content">
        <DocumentSelector
          :current-document-name="currentDocumentName"
          @select-document-id="handleSelectDocumentId"
        />

        <div class="control-panel__group control-panel__group--spaced">
          <label class="control-panel__label">Page Info</label>
          <div class="control-panel__info">Page {{ currentPage + 1 }} of {{ totalPages || '—' }}</div>
        </div>
      </div>
    </section>

    <!-- Viewer Actions Section -->
    <section class="control-panel__section">
      <button
        class="control-panel__heading"
        :class="{ 'control-panel__heading--collapsed': !sections.actions }"
        @click="toggleSection('actions')"
      >
        <span>Viewer Actions</span>
        <span class="control-panel__toggle">{{ sections.actions ? '−' : '+' }}</span>
      </button>

      <div v-show="sections.actions" class="control-panel__content">
        <ViewerActions :viewer-instance="viewerInstance" />
      </div>
    </section>

    <!-- Annotations Section -->
    <section class="control-panel__section">
      <button
        class="control-panel__heading"
        :class="{ 'control-panel__heading--collapsed': !sections.annotations }"
        @click="toggleSection('annotations')"
      >
        <span>Annotations</span>
        <span class="control-panel__toggle">{{ sections.annotations ? '−' : '+' }}</span>
      </button>

      <div v-show="sections.annotations" class="control-panel__content">
        <AnnotationTools :viewer-instance="viewerInstance" />
      </div>
    </section>

    <!-- Layers Section -->
    <section class="control-panel__section">
      <button
        class="control-panel__heading"
        :class="{ 'control-panel__heading--collapsed': !sections.layers }"
        @click="toggleSection('layers')"
      >
        <span>Layers (OCG)</span>
        <span class="control-panel__toggle">{{ sections.layers ? '−' : '+' }}</span>
      </button>

      <div v-show="sections.layers" class="control-panel__content">
        <LayerControls :viewer-instance="viewerInstance" />
      </div>
    </section>

    <!-- Events Section -->
    <section class="control-panel__section">
      <button
        class="control-panel__heading"
        :class="{ 'control-panel__heading--collapsed': !sections.events }"
        @click="toggleSection('events')"
      >
        <span>Events</span>
        <span class="control-panel__toggle">{{ sections.events ? '−' : '+' }}</span>
      </button>

      <div v-show="sections.events" class="control-panel__content">
        <EventLog :viewer-instance="viewerInstance" />
      </div>
    </section>
  </div>
</template>

<style scoped>
.control-panel {
  padding: 0;
  display: flex;
  flex-direction: column;
}

.control-panel__section {
  border-bottom: 1px solid var(--color-border);
}

.control-panel__section:last-child {
  border-bottom: none;
}

.control-panel__heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding: 0.75rem 1rem;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text);
  background: var(--color-surface);
  border: none;
  cursor: pointer;
  transition: background var(--transition-fast);
}

.control-panel__heading:hover {
  background: var(--color-background);
}

.control-panel__heading--collapsed {
  color: var(--color-text-secondary);
}

.control-panel__toggle {
  font-size: 1rem;
  font-weight: 400;
  color: var(--color-text-secondary);
}

.control-panel__content {
  padding: 0.75rem 1rem 1rem;
}

.control-panel__group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.control-panel__group:last-child {
  margin-bottom: 0;
}

.control-panel__group--spaced {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--color-border);
}

.control-panel__label {
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--color-text);
}

.control-panel__buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.control-panel__button {
  padding: 0.5rem 1rem;
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

.control-panel__button:hover {
  background: var(--color-border);
  border-color: var(--color-text-secondary);
}

.control-panel__info {
  font-size: 0.875rem;
  color: var(--color-text);
  padding: 0.5rem 0.75rem;
  background: var(--color-background);
  border-radius: var(--radius-sm);
}
</style>
