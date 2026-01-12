import { ref, watch, onUnmounted, computed, type Ref } from 'vue'
import type { Instance } from '@nutrient-sdk/viewer'

export interface SearchResultWithNavigation {
  totalMatches: number
  goToResult: (index: number) => Promise<void>
}

const ZOOM_STEP = 0.25
const MIN_ZOOM = 0.1
const MAX_ZOOM = 10

export function useViewerActions(options: { instance: Ref<Instance | null> }) {
  const { instance } = options

  const currentPage = ref(0)
  const totalPages = ref(0)
  const currentZoom = ref<number | string>(1)
  const isReady = computed(() => instance.value !== null)

  const eventHandlers = new Map<string, (data: unknown) => void>()

  function extractZoomValue(zoom: unknown): number | string {
    if (typeof zoom === 'number') return zoom
    if (typeof zoom === 'object' && zoom !== null && 'zoomMode' in zoom) {
      return (zoom as { zoomMode: string }).zoomMode
    }
    if (typeof zoom === 'string') return zoom
    return 1
  }

  function setupEventListeners(inst: Instance) {
    currentPage.value = inst.viewState.currentPageIndex
    totalPages.value = inst.totalPageCount
    currentZoom.value = extractZoomValue(inst.viewState.zoom)

    const onPageChange = (pageIndex: unknown) => {
      currentPage.value = pageIndex as number
    }
    eventHandlers.set('viewState.currentPageIndex.change', onPageChange)
    inst.addEventListener('viewState.currentPageIndex.change' as 'viewState.change', onPageChange)

    const onZoomChange = (zoom: unknown) => {
      currentZoom.value = extractZoomValue(zoom)
    }
    eventHandlers.set('viewState.zoom.change', onZoomChange)
    inst.addEventListener('viewState.zoom.change' as 'viewState.change', onZoomChange)
  }

  function cleanupEventListeners(inst: Instance) {
    for (const [event, handler] of eventHandlers) {
      inst.removeEventListener(event as 'viewState.change', handler)
    }
    eventHandlers.clear()
  }

  watch(
    instance,
    (newInstance, oldInstance) => {
      if (oldInstance) cleanupEventListeners(oldInstance)
      if (newInstance) {
        setupEventListeners(newInstance)
      } else {
        currentPage.value = 0
        totalPages.value = 0
        currentZoom.value = 1
      }
    },
    { immediate: true },
  )

  onUnmounted(() => {
    if (instance.value) cleanupEventListeners(instance.value)
  })

  async function goToPage(pageIndex: number) {
    if (!instance.value) return
    const clampedIndex = Math.max(0, Math.min(pageIndex, totalPages.value - 1))
    instance.value.setViewState((viewState) => viewState.set('currentPageIndex', clampedIndex))
  }

  async function goToNextPage() {
    await goToPage(currentPage.value + 1)
  }

  async function goToPreviousPage() {
    await goToPage(currentPage.value - 1)
  }

  async function goToFirstPage() {
    await goToPage(0)
  }

  async function goToLastPage() {
    await goToPage(totalPages.value - 1)
  }

  async function setZoom(zoom: number | string) {
    if (!instance.value) return
    instance.value.setViewState((viewState) => viewState.set('zoom', zoom as 'AUTO'))
  }

  async function zoomIn() {
    if (!instance.value) return
    const current = currentZoom.value
    if (typeof current === 'number') {
      await setZoom(Math.min(current + ZOOM_STEP, MAX_ZOOM))
    } else {
      await setZoom(1.25)
    }
  }

  async function zoomOut() {
    if (!instance.value) return
    const current = currentZoom.value
    if (typeof current === 'number') {
      await setZoom(Math.max(current - ZOOM_STEP, MIN_ZOOM))
    } else {
      await setZoom(0.75)
    }
  }

  async function fitToWidth() {
    await setZoom('FIT_TO_WIDTH')
  }

  async function fitToPage() {
    await setZoom('FIT_TO_VIEWPORT')
  }

  async function search(query: string): Promise<SearchResultWithNavigation> {
    if (!instance.value || !query.trim()) {
      return { totalMatches: 0, goToResult: async () => {} }
    }

    try {
      const immutableResults = await instance.value.search(query)
      const results = immutableResults?.toArray ? immutableResults.toArray() : []

      if (instance.value.setSearchState && immutableResults) {
        instance.value.setSearchState((state) =>
          state.set('results', immutableResults).set('focusedResultIndex', 0)
        )
      }

      const firstResult = results[0]
      if (firstResult && firstResult.pageIndex !== null && firstResult.rectsOnPage?.size > 0) {
        const rect = window.NutrientViewer.Geometry.Rect.union(firstResult.rectsOnPage)
        if (rect && instance.value) {
          instance.value.jumpToRect(firstResult.pageIndex, rect)
        }
      }

      return {
        totalMatches: results.length,
        goToResult: async (index: number) => {
          if (!instance.value || index < 0 || index >= results.length) return

          if (instance.value.setSearchState) {
            instance.value.setSearchState((state) => state.set('focusedResultIndex', index))
          }

          const result = results[index]
          if (!result || result.pageIndex === null) return

          if (result.rectsOnPage?.size > 0) {
            const rect = window.NutrientViewer.Geometry.Rect.union(result.rectsOnPage)
            if (rect) {
              instance.value.jumpToRect(result.pageIndex, rect)
            }
          } else {
            await goToPage(result.pageIndex)
          }
        },
      }
    } catch (error) {
      console.error('Search failed:', error)
      return { totalMatches: 0, goToResult: async () => {} }
    }
  }

  function print() {
    if (!instance.value) return
    instance.value.print()
  }

  async function exportPdf(): Promise<Blob> {
    if (!instance.value) throw new Error('Viewer not initialized')
    const buffer = await instance.value.exportPDF()
    return new Blob([buffer], { type: 'application/pdf' })
  }

  async function exportInstantJson() {
    if (!instance.value) throw new Error('Viewer not initialized')
    return await instance.value.exportInstantJSON()
  }

  return {
    currentPage,
    totalPages,
    currentZoom,
    isReady,
    goToPage,
    goToNextPage,
    goToPreviousPage,
    goToFirstPage,
    goToLastPage,
    setZoom,
    zoomIn,
    zoomOut,
    fitToWidth,
    fitToPage,
    search,
    print,
    exportPdf,
    exportInstantJson,
  }
}
