<script setup lang="ts">
import { computed } from 'vue'
import type NutrientViewer from '@nutrient-sdk/viewer'
import { useViewerLayers } from '@/composables/useViewerLayers'

type Instance = InstanceType<typeof NutrientViewer.Instance>

// =============================================================================
// PROPS & STATE
// =============================================================================

const props = defineProps<{
  viewerInstance: Instance | null
}>()

const instanceRef = computed(() => props.viewerInstance)

const {
  layers,
  isLoading,
  hasLayers,
  toggleLayerVisibility,
  showAllLayers,
  hideAllLayers,
  refreshLayers,
} = useViewerLayers({ instance: instanceRef })

// =============================================================================
// COMPUTED
// =============================================================================

const visibleCount = computed(() => layers.value.filter((l) => l.visible).length)
const totalCount = computed(() => layers.value.length)
</script>

<template>
  <div class="layer-controls">
    <div class="layer-controls__header">
      <span class="layer-controls__label">
        OCG Layers
        <span v-if="hasLayers" class="layer-controls__count">
          ({{ visibleCount }}/{{ totalCount }} visible)
        </span>
      </span>
    </div>

    <div v-if="isLoading" class="layer-controls__loading">Loading layers...</div>

    <div v-else-if="!viewerInstance" class="layer-controls__empty">
      No document loaded
    </div>

    <div v-else-if="!hasLayers" class="layer-controls__empty">
      This document has no OCG layers
    </div>

    <template v-else>
      <!-- Bulk actions -->
      <div class="layer-controls__actions">
        <button
          class="layer-controls__btn layer-controls__btn--small"
          @click="showAllLayers"
        >
          Show All
        </button>
        <button
          class="layer-controls__btn layer-controls__btn--small"
          @click="hideAllLayers"
        >
          Hide All
        </button>
        <button
          class="layer-controls__btn layer-controls__btn--small"
          @click="refreshLayers"
        >
          Refresh
        </button>
      </div>

      <!-- Layer list -->
      <ul class="layer-controls__list">
        <li
          v-for="layer in layers"
          :key="layer.ocgId"
          class="layer-controls__item"
        >
          <label class="layer-controls__toggle">
            <input
              type="checkbox"
              :checked="layer.visible"
              :disabled="layer.locked"
              @change="toggleLayerVisibility(layer.ocgId)"
            />
            <span class="layer-controls__toggle-label">
              {{ layer.name || `Layer ${layer.ocgId}` }}
            </span>
          </label>
          <span v-if="layer.locked" class="layer-controls__locked">Locked</span>
        </li>
      </ul>
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

.layer-controls__loading,
.layer-controls__empty {
  font-size: 0.8125rem;
  color: var(--color-text-secondary);
  padding: 0.5rem 0;
}

.layer-controls__actions {
  display: flex;
  gap: 0.5rem;
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

.layer-controls__btn--small {
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
}

.layer-controls__list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  max-height: 200px;
  overflow-y: auto;
}

.layer-controls__item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  background: var(--color-background);
  border-radius: var(--radius-sm);
}

.layer-controls__toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.layer-controls__toggle input[type='checkbox'] {
  width: 1rem;
  height: 1rem;
  cursor: pointer;
}

.layer-controls__toggle input[type='checkbox']:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.layer-controls__toggle-label {
  font-size: 0.8125rem;
  color: var(--color-text);
}

.layer-controls__locked {
  font-size: 0.6875rem;
  padding: 0.125rem 0.375rem;
  background: var(--color-text-secondary);
  color: #fff;
  border-radius: var(--radius-sm);
}
</style>
