import { ref, watch, onUnmounted, computed, type Ref } from 'vue'
import { getNutrientViewer, type NutrientViewerInstance, type ImmutableSearchResults } from './useNutrientViewer'

// =============================================================================
// TYPES
// =============================================================================

// Valid zoom modes from NutrientViewer.ZoomMode
export type ZoomMode = 'FIT_TO_WIDTH' | 'FIT_TO_VIEWPORT' | 'AUTO' | number

export interface UseViewerActionsOptions {
  instance: Ref<NutrientViewerInstance | null>
}

export interface UseViewerActionsReturn {
  // Reactive state (synced via SDK events)
  currentPage: Ref<number>
  totalPages: Ref<number>
  currentZoom: Ref<number | string>
  isReady: Ref<boolean>

  // Navigation
  goToPage: (pageIndex: number) => Promise<void>
  goToNextPage: () => Promise<void>
  goToPreviousPage: () => Promise<void>
  goToFirstPage: () => Promise<void>
  goToLastPage: () => Promise<void>

  // Zoom
  setZoom: (zoom: ZoomMode) => Promise<void>
  zoomIn: () => Promise<void>
  zoomOut: () => Promise<void>
  fitToWidth: () => Promise<void>
  fitToPage: () => Promise<void>

  // Search
  search: (query: string) => Promise<SearchResultWithNavigation>

  // Export
  print: () => void
  exportPdf: () => Promise<Blob>
  exportInstantJson: () => Promise<unknown>
}

export interface SearchResultWithNavigation {
  results: Array<{
    pageIndex: number
    rectsOnPage: Array<{ left: number; top: number; width: number; height: number }>
  }>
  totalMatches: number
  goToResult: (index: number) => Promise<void>
}

// =============================================================================
// CONSTANTS
// =============================================================================

const ZOOM_STEP = 0.25
const MIN_ZOOM = 0.1
const MAX_ZOOM = 10

// =============================================================================
// COMPOSABLE
// =============================================================================

export function useViewerActions(options: UseViewerActionsOptions): UseViewerActionsReturn {
  const { instance } = options

  // ---------------------------------------------------------------------------
  // Reactive State (synced via SDK events)
  // ---------------------------------------------------------------------------

  const currentPage = ref(0)
  const totalPages = ref(0)
  const currentZoom = ref<number | string>(1)
  const isReady = computed(() => instance.value !== null)

  // Store event handlers for cleanup
  const eventHandlers = new Map<string, (data: unknown) => void>()

  // ---------------------------------------------------------------------------
  // Event Sync Setup
  // ---------------------------------------------------------------------------

  // Extract numeric zoom or mode string from SDK zoom value
  function extractZoomValue(zoom: unknown): number | string {
    if (typeof zoom === 'number') {
      return zoom
    }
    if (typeof zoom === 'object' && zoom !== null && 'zoomMode' in zoom) {
      return (zoom as { zoomMode: string }).zoomMode
    }
    if (typeof zoom === 'string') {
      return zoom
    }
    return 1
  }

  function setupEventListeners(inst: NutrientViewerInstance) {
    // Initialize state from current instance values
    currentPage.value = inst.viewState.currentPageIndex
    totalPages.value = inst.totalPageCount
    currentZoom.value = extractZoomValue(inst.viewState.zoom)

    // Page change handler
    const onPageChange = (pageIndex: unknown) => {
      currentPage.value = pageIndex as number
    }
    eventHandlers.set('viewState.currentPageIndex.change', onPageChange)
    inst.addEventListener('viewState.currentPageIndex.change', onPageChange)

    // Zoom change handler
    const onZoomChange = (zoom: unknown) => {
      currentZoom.value = extractZoomValue(zoom)
    }
    eventHandlers.set('viewState.zoom.change', onZoomChange)
    inst.addEventListener('viewState.zoom.change', onZoomChange)
  }

  function cleanupEventListeners(inst: NutrientViewerInstance) {
    for (const [event, handler] of eventHandlers) {
      inst.removeEventListener(event, handler)
    }
    eventHandlers.clear()
  }

  // Watch for instance changes
  watch(
    instance,
    (newInstance, oldInstance) => {
      // Cleanup old listeners
      if (oldInstance) {
        cleanupEventListeners(oldInstance)
      }

      // Setup new listeners
      if (newInstance) {
        setupEventListeners(newInstance)
      } else {
        // Reset state when instance is cleared
        currentPage.value = 0
        totalPages.value = 0
        currentZoom.value = 1
      }
    },
    { immediate: true },
  )

  // Cleanup on unmount
  onUnmounted(() => {
    if (instance.value) {
      cleanupEventListeners(instance.value)
    }
  })

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------

  async function goToPage(pageIndex: number): Promise<void> {
    if (!instance.value) return

    const clampedIndex = Math.max(0, Math.min(pageIndex, totalPages.value - 1))
    await instance.value.setViewState((viewState) =>
      viewState.set('currentPageIndex', clampedIndex),
    )
  }

  async function goToNextPage(): Promise<void> {
    await goToPage(currentPage.value + 1)
  }

  async function goToPreviousPage(): Promise<void> {
    await goToPage(currentPage.value - 1)
  }

  async function goToFirstPage(): Promise<void> {
    await goToPage(0)
  }

  async function goToLastPage(): Promise<void> {
    await goToPage(totalPages.value - 1)
  }

  // ---------------------------------------------------------------------------
  // Zoom
  // ---------------------------------------------------------------------------

  async function setZoom(zoom: ZoomMode): Promise<void> {
    if (!instance.value) return

    await instance.value.setViewState((viewState) => viewState.set('zoom', zoom))
  }

  async function zoomIn(): Promise<void> {
    if (!instance.value) return

    const current = currentZoom.value
    if (typeof current === 'number') {
      const newZoom = Math.min(current + ZOOM_STEP, MAX_ZOOM)
      await setZoom(newZoom)
    } else {
      // If using fit mode, switch to numeric zoom at 125%
      await setZoom(1.25)
    }
  }

  async function zoomOut(): Promise<void> {
    if (!instance.value) return

    const current = currentZoom.value
    if (typeof current === 'number') {
      const newZoom = Math.max(current - ZOOM_STEP, MIN_ZOOM)
      await setZoom(newZoom)
    } else {
      // If using fit mode, switch to numeric zoom at 75%
      await setZoom(0.75)
    }
  }

  async function fitToWidth(): Promise<void> {
    await setZoom('FIT_TO_WIDTH')
  }

  async function fitToPage(): Promise<void> {
    await setZoom('FIT_TO_VIEWPORT')
  }

  // ---------------------------------------------------------------------------
  // Search
  // ---------------------------------------------------------------------------

  async function search(query: string): Promise<SearchResultWithNavigation> {
    if (!instance.value || !query.trim()) {
      return {
        results: [],
        totalMatches: 0,
        goToResult: async () => {},
      }
    }

    try {
      const NutrientViewer = getNutrientViewer()

      // Search returns an Immutable list
      const immutableResults = await instance.value.search(query)
      const results = immutableResults?.toArray ? immutableResults.toArray() : []

      // Set search state to enable SDK highlighting
      if (instance.value.setSearchState && immutableResults) {
        instance.value.setSearchState((state) =>
          state.set('results', immutableResults as unknown as typeof state.results).set('focusedResultIndex', 0)
        )
      }

      // Navigate to first result if found
      const firstResult = results[0]
      if (firstResult && firstResult.rectsOnPage?.length > 0) {
        const rect = NutrientViewer.Geometry.Rect.union(firstResult.rectsOnPage)
        if (rect && instance.value) {
          await instance.value.jumpToRect(firstResult.pageIndex, rect)
        }
      }

      return {
        results,
        totalMatches: results.length,
        goToResult: async (index: number) => {
          if (!instance.value || index < 0 || index >= results.length) return

          // Update focused result index for highlighting
          if (instance.value.setSearchState) {
            instance.value.setSearchState((state) =>
              state.set('focusedResultIndex', index)
            )
          }

          const result = results[index]
          if (!result) return

          if (result.rectsOnPage?.length > 0) {
            // Union all rects and jump to the combined rect
            const rect = NutrientViewer.Geometry.Rect.union(result.rectsOnPage)
            if (rect) {
              await instance.value.jumpToRect(result.pageIndex, rect)
            }
          } else {
            // Fallback to just going to the page
            await goToPage(result.pageIndex)
          }
        },
      }
    } catch (error) {
      console.error('Search failed:', error)
      return {
        results: [],
        totalMatches: 0,
        goToResult: async () => {},
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Export
  // ---------------------------------------------------------------------------

  function print(): void {
    if (!instance.value) return
    instance.value.print()
  }

  async function exportPdf(): Promise<Blob> {
    if (!instance.value) {
      throw new Error('Viewer not initialized')
    }

    const buffer = await instance.value.exportPDF()
    return new Blob([buffer], { type: 'application/pdf' })
  }

  async function exportInstantJson(): Promise<unknown> {
    if (!instance.value) {
      throw new Error('Viewer not initialized')
    }

    return await instance.value.exportInstantJSON()
  }

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------

  return {
    // Reactive state
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
    exportInstantJson,
  }
}
