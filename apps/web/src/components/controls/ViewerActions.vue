<script setup lang="ts">
import { ref, computed } from 'vue'
import type { NutrientViewerInstance } from '@/composables/useNutrientViewer'
import { useViewerActions, type ZoomMode } from '@/composables/useViewerActions'

// =============================================================================
// PROPS & STATE
// =============================================================================

const props = defineProps<{
  viewerInstance: NutrientViewerInstance | null
}>()

const instanceRef = computed(() => props.viewerInstance)

const {
  // Reactive state (synced via SDK events)
  currentPage,
  totalPages,
  currentZoom,
  isReady,
  // Navigation
  goToPage,
  goToNextPage,
  goToPreviousPage,
  goToFirstPage,
  goToLastPage,
  // Zoom
  setZoom,
  zoomIn,
  zoomOut,
  fitToWidth,
  fitToPage,
  // Search
  search,
  // Export
  print,
  exportPdf,
} = useViewerActions({ instance: instanceRef })

// Local state for inputs
const pageInput = ref('')
const searchQuery = ref('')
const searchResults = ref<{
  totalMatches: number
  currentIndex: number
  goToResult: (index: number) => Promise<void>
} | null>(null)

// =============================================================================
// HANDLERS
// =============================================================================

async function handleGoToPage() {
  const page = parseInt(pageInput.value, 10)
  if (!isNaN(page) && page >= 1 && page <= totalPages.value) {
    await goToPage(page - 1) // Convert to 0-indexed
    pageInput.value = ''
  }
}

async function handleSearch() {
  if (!searchQuery.value.trim()) {
    searchResults.value = null
    return
  }

  const results = await search(searchQuery.value)
  searchResults.value = {
    totalMatches: results.totalMatches,
    currentIndex: results.totalMatches > 0 ? 0 : -1,
    goToResult: results.goToResult,
  }
}

async function handleSearchPrev() {
  if (!searchResults.value || searchResults.value.totalMatches === 0) return

  const newIndex = searchResults.value.currentIndex - 1
  if (newIndex >= 0) {
    searchResults.value.currentIndex = newIndex
    await searchResults.value.goToResult(newIndex)
  }
}

async function handleSearchNext() {
  if (!searchResults.value || searchResults.value.totalMatches === 0) return

  const newIndex = searchResults.value.currentIndex + 1
  if (newIndex < searchResults.value.totalMatches) {
    searchResults.value.currentIndex = newIndex
    await searchResults.value.goToResult(newIndex)
  }
}

async function handleExportPdf() {
  try {
    const blob = await exportPdf()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'document.pdf'
    link.click()
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Export failed:', error)
  }
}

function handleZoomSelect(event: Event) {
  const value = (event.target as HTMLSelectElement).value
  if (value === 'FIT_TO_WIDTH' || value === 'FIT_TO_VIEWPORT' || value === 'AUTO') {
    setZoom(value as ZoomMode)
  } else {
    setZoom(parseFloat(value))
  }
}

// =============================================================================
// COMPUTED
// =============================================================================

const zoomPercentage = computed(() => {
  if (typeof currentZoom.value === 'number') {
    return Math.round(currentZoom.value * 100)
  }
  return currentZoom.value
})

const canGoPrevious = computed(() => currentPage.value > 0)
const canGoNext = computed(() => currentPage.value < totalPages.value - 1)

// Search navigation
const canSearchPrev = computed(() =>
  searchResults.value !== null && searchResults.value.currentIndex > 0
)
const canSearchNext = computed(() =>
  searchResults.value !== null &&
  searchResults.value.currentIndex < searchResults.value.totalMatches - 1
)
</script>

<template>
  <div class="viewer-actions">
    <!-- Navigation -->
    <div class="viewer-actions__group">
      <span class="viewer-actions__label">Navigation</span>
      <div class="viewer-actions__row">
        <button
          class="viewer-actions__btn"
          :disabled="!isReady || !canGoPrevious"
          title="First page"
          @click="goToFirstPage"
        >
          &#x21E4;
        </button>
        <button
          class="viewer-actions__btn"
          :disabled="!isReady || !canGoPrevious"
          title="Previous page"
          @click="goToPreviousPage"
        >
          &#x2190;
        </button>
        <span class="viewer-actions__page-info">
          {{ currentPage + 1 }} / {{ totalPages }}
        </span>
        <button
          class="viewer-actions__btn"
          :disabled="!isReady || !canGoNext"
          title="Next page"
          @click="goToNextPage"
        >
          &#x2192;
        </button>
        <button
          class="viewer-actions__btn"
          :disabled="!isReady || !canGoNext"
          title="Last page"
          @click="goToLastPage"
        >
          &#x21E5;
        </button>
      </div>
      <div class="viewer-actions__row">
        <input
          v-model="pageInput"
          type="number"
          class="viewer-actions__input"
          placeholder="Go to..."
          min="1"
          :max="totalPages"
          :disabled="!isReady"
          @keyup.enter="handleGoToPage"
        />
        <button
          class="viewer-actions__btn viewer-actions__btn--primary"
          :disabled="!isReady || !pageInput"
          @click="handleGoToPage"
        >
          Go
        </button>
      </div>
    </div>

    <!-- Zoom -->
    <div class="viewer-actions__group">
      <span class="viewer-actions__label">Zoom</span>
      <div class="viewer-actions__row">
        <button
          class="viewer-actions__btn"
          :disabled="!isReady"
          title="Zoom out"
          @click="zoomOut"
        >
          &minus;
        </button>
        <span class="viewer-actions__zoom-info">{{ zoomPercentage }}%</span>
        <button
          class="viewer-actions__btn"
          :disabled="!isReady"
          title="Zoom in"
          @click="zoomIn"
        >
          +
        </button>
      </div>
      <div class="viewer-actions__row">
        <select
          class="viewer-actions__select"
          :disabled="!isReady"
          @change="handleZoomSelect"
        >
          <option value="0.5">50%</option>
          <option value="0.75">75%</option>
          <option value="1" selected>100%</option>
          <option value="1.25">125%</option>
          <option value="1.5">150%</option>
          <option value="2">200%</option>
        </select>
      </div>
      <div class="viewer-actions__row">
        <button
          class="viewer-actions__btn viewer-actions__btn--small"
          :disabled="!isReady"
          @click="fitToWidth"
        >
          Fit Width
        </button>
        <button
          class="viewer-actions__btn viewer-actions__btn--small"
          :disabled="!isReady"
          @click="fitToPage"
        >
          Fit Viewport
        </button>
      </div>
    </div>

    <!-- Search -->
    <div class="viewer-actions__group">
      <span class="viewer-actions__label">Search</span>
      <div class="viewer-actions__row">
        <input
          v-model="searchQuery"
          type="text"
          class="viewer-actions__input viewer-actions__input--wide"
          placeholder="Search text..."
          :disabled="!isReady"
          @keyup.enter="handleSearch"
        />
        <button
          class="viewer-actions__btn viewer-actions__btn--primary"
          :disabled="!isReady || !searchQuery.trim()"
          @click="handleSearch"
        >
          Find
        </button>
      </div>
      <div v-if="searchResults && searchResults.totalMatches > 0" class="viewer-actions__row">
        <button
          class="viewer-actions__btn"
          :disabled="!canSearchPrev"
          title="Previous match"
          @click="handleSearchPrev"
        >
          &#x2191;
        </button>
        <span class="viewer-actions__search-info">
          {{ searchResults.currentIndex + 1 }} / {{ searchResults.totalMatches }}
        </span>
        <button
          class="viewer-actions__btn"
          :disabled="!canSearchNext"
          title="Next match"
          @click="handleSearchNext"
        >
          &#x2193;
        </button>
      </div>
      <div v-else-if="searchResults" class="viewer-actions__search-results">
        No matches found
      </div>
    </div>

    <!-- Export -->
    <div class="viewer-actions__group">
      <span class="viewer-actions__label">Export</span>
      <div class="viewer-actions__row">
        <button
          class="viewer-actions__btn"
          :disabled="!isReady"
          @click="print"
        >
          Print
        </button>
        <button
          class="viewer-actions__btn"
          :disabled="!isReady"
          @click="handleExportPdf"
        >
          Download PDF
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.viewer-actions {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.viewer-actions__group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.viewer-actions__label {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.viewer-actions__row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.viewer-actions__page-info,
.viewer-actions__zoom-info,
.viewer-actions__search-info {
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--color-text);
  min-width: 60px;
  text-align: center;
}

.viewer-actions__btn {
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

.viewer-actions__btn:hover:not(:disabled) {
  background: var(--color-border);
  border-color: var(--color-text-secondary);
}

.viewer-actions__btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.viewer-actions__btn--primary {
  color: #fff;
  background: var(--color-primary);
  border-color: var(--color-primary);
}

.viewer-actions__btn--primary:hover:not(:disabled) {
  background: var(--color-primary-hover);
  border-color: var(--color-primary-hover);
}

.viewer-actions__btn--small {
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
}

.viewer-actions__input,
.viewer-actions__select {
  padding: 0.375rem 0.5rem;
  font-size: 0.8125rem;
  color: var(--color-text);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  width: 80px;
}

.viewer-actions__input--wide {
  flex: 1;
  width: auto;
}

.viewer-actions__input:focus,
.viewer-actions__select:focus {
  outline: none;
  border-color: var(--color-primary);
}

.viewer-actions__input:disabled,
.viewer-actions__select:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.viewer-actions__select {
  width: 100%;
}

.viewer-actions__search-results {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  padding: 0.25rem 0;
}
</style>
