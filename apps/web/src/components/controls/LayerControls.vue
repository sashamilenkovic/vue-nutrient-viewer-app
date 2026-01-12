<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useInstantLayers } from '@/composables/useViewerLayers'

// =============================================================================
// PROPS & EMITS
// =============================================================================

const props = defineProps<{
  documentId: string | null
  currentLayer?: string
}>()

const emit = defineEmits<{
  switchLayer: [layerName: string]
}>()

// =============================================================================
// STATE
// =============================================================================

const {
  layers,
  isLoading,
  error,
  hasLayers,
  fetchLayers,
  createLayer,
  reset,
} = useInstantLayers({
  documentId: () => props.documentId,
})

const newLayerName = ref('')
const isCreating = ref(false)

// =============================================================================
// HANDLERS
// =============================================================================

function handleSelectLayer(layerName: string) {
  emit('switchLayer', layerName)
}

async function handleCreateLayer() {
  if (!newLayerName.value.trim()) return

  isCreating.value = true
  try {
    const jwt = await createLayer(newLayerName.value.trim())
    if (jwt) {
      // Switch to the new layer
      emit('switchLayer', newLayerName.value.trim())
      newLayerName.value = ''
    }
  } finally {
    isCreating.value = false
  }
}

// =============================================================================
// LIFECYCLE
// =============================================================================

onMounted(() => {
  if (props.documentId) {
    fetchLayers()
  }
})

watch(
  () => props.documentId,
  (newId) => {
    if (newId) {
      fetchLayers()
    } else {
      reset()
    }
  }
)
</script>

<template>
  <div class="layer-controls">
    <div class="layer-controls__header">
      <span class="layer-controls__label">
        Instant Layers
        <span v-if="hasLayers" class="layer-controls__count">
          ({{ layers.length }})
        </span>
      </span>
    </div>

    <p class="layer-controls__description">
      Annotation containers for multi-user workflows. Each layer has its own set of annotations.
    </p>

    <div v-if="isLoading" class="layer-controls__loading">Loading layers...</div>

    <div v-else-if="!documentId" class="layer-controls__empty">
      No document loaded
    </div>

    <div v-else-if="error" class="layer-controls__error">
      {{ error.message }}
    </div>

    <template v-else>
      <!-- Layer list -->
      <ul class="layer-controls__list">
        <li
          v-for="layer in layers"
          :key="layer.name"
          class="layer-controls__item"
          :class="{ 'layer-controls__item--active': currentLayer === layer.name }"
        >
          <button
            class="layer-controls__layer-btn"
            :class="{ 'layer-controls__layer-btn--active': currentLayer === layer.name }"
            @click="handleSelectLayer(layer.name)"
          >
            <span class="layer-controls__layer-name">
              {{ layer.displayName }}
            </span>
            <span v-if="layer.isDefault" class="layer-controls__badge">Default</span>
            <span v-if="currentLayer === layer.name" class="layer-controls__active-indicator">●</span>
          </button>
        </li>
      </ul>

      <!-- Create new layer -->
      <div class="layer-controls__create">
        <span class="layer-controls__create-label">Create New Layer</span>
        <div class="layer-controls__create-row">
          <input
            v-model="newLayerName"
            type="text"
            class="layer-controls__input"
            placeholder="Layer name..."
            :disabled="isCreating"
            @keyup.enter="handleCreateLayer"
          />
          <button
            class="layer-controls__btn layer-controls__btn--primary"
            :disabled="!newLayerName.trim() || isCreating"
            @click="handleCreateLayer"
          >
            {{ isCreating ? '...' : 'Create' }}
          </button>
        </div>
      </div>

      <!-- Refresh button -->
      <button
        class="layer-controls__btn layer-controls__btn--small"
        @click="fetchLayers"
      >
        Refresh Layers
      </button>
    </template>
  </div>
</template>

<style scoped>
.layer-controls {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.layer-controls__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.layer-controls__label {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.03em;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.layer-controls__count {
  font-weight: 400;
  text-transform: none;
}

.layer-controls__description {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  margin: 0;
  line-height: 1.4;
}

.layer-controls__loading,
.layer-controls__empty,
.layer-controls__error {
  font-size: 0.8125rem;
  color: var(--color-text-secondary);
  padding: 0.5rem 0;
}

.layer-controls__error {
  color: var(--color-error, #d32f2f);
}

.layer-controls__list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  max-height: 200px;
  overflow-y: auto;
  padding: 0;
  margin: 0;
}

.layer-controls__item {
  display: flex;
}

.layer-controls__layer-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.5rem 0.75rem;
  font-size: 0.8125rem;
  color: var(--color-text);
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition:
    background var(--transition-fast),
    border-color var(--transition-fast);
  text-align: left;
}

.layer-controls__layer-btn:hover {
  background: var(--color-border);
  border-color: var(--color-text-secondary);
}

.layer-controls__layer-btn--active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: #fff;
}

.layer-controls__layer-btn--active:hover {
  background: var(--color-primary-hover);
  border-color: var(--color-primary-hover);
}

.layer-controls__layer-name {
  flex: 1;
}

.layer-controls__badge {
  font-size: 0.6875rem;
  padding: 0.125rem 0.375rem;
  background: var(--color-text-secondary);
  color: #fff;
  border-radius: var(--radius-sm);
}

.layer-controls__layer-btn--active .layer-controls__badge {
  background: rgba(255, 255, 255, 0.3);
}

.layer-controls__active-indicator {
  font-size: 0.5rem;
}

.layer-controls__create {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--color-border);
}

.layer-controls__create-label {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--color-text-secondary);
}

.layer-controls__create-row {
  display: flex;
  gap: 0.5rem;
}

.layer-controls__input {
  flex: 1;
  padding: 0.375rem 0.5rem;
  font-size: 0.8125rem;
  color: var(--color-text);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
}

.layer-controls__input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.layer-controls__input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.layer-controls__btn {
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

.layer-controls__btn:hover:not(:disabled) {
  background: var(--color-border);
  border-color: var(--color-text-secondary);
}

.layer-controls__btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.layer-controls__btn--primary {
  color: #fff;
  background: var(--color-primary);
  border-color: var(--color-primary);
}

.layer-controls__btn--primary:hover:not(:disabled) {
  background: var(--color-primary-hover);
  border-color: var(--color-primary-hover);
}

.layer-controls__btn--small {
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
}
</style>
