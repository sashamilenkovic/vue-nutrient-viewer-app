import { ref, watch, type Ref } from 'vue'
import type { NutrientViewerInstance, OCGLayer } from './useNutrientViewer'

// =============================================================================
// TYPES
// =============================================================================

export interface LayerWithVisibility extends OCGLayer {
  visible: boolean
}

export interface UseViewerLayersOptions {
  instance: Ref<NutrientViewerInstance | null>
}

export interface UseViewerLayersReturn {
  // State
  layers: Ref<LayerWithVisibility[]>
  isLoading: Ref<boolean>
  error: Ref<Error | null>
  hasLayers: Ref<boolean>

  // Actions
  refreshLayers: () => Promise<void>
  setLayerVisibility: (ocgId: number, visible: boolean) => Promise<void>
  toggleLayerVisibility: (ocgId: number) => Promise<void>
  showAllLayers: () => Promise<void>
  hideAllLayers: () => Promise<void>
  showOnlyLayer: (ocgId: number) => Promise<void>
}

// =============================================================================
// COMPOSABLE
// =============================================================================

export function useViewerLayers(options: UseViewerLayersOptions): UseViewerLayersReturn {
  const { instance } = options

  const layers = ref<LayerWithVisibility[]>([])
  const isLoading = ref(false)
  const error = ref<Error | null>(null)
  const hasLayers = ref(false)

  // ---------------------------------------------------------------------------
  // Core Operations
  // ---------------------------------------------------------------------------

  async function refreshLayers(): Promise<void> {
    if (!instance.value) {
      layers.value = []
      hasLayers.value = false
      return
    }

    isLoading.value = true
    error.value = null

    try {
      // Get all layers in the document
      const ocgLayers = await instance.value.getLayers()

      // Get current visibility state
      const visibilityState = await instance.value.getLayersVisibilityState()
      const visibleIds = new Set(visibilityState.visibleLayerIds)

      // Combine layers with visibility info
      layers.value = ocgLayers.map((layer) => ({
        ...layer,
        visible: visibleIds.has(layer.ocgId),
      }))

      hasLayers.value = ocgLayers.length > 0
    } catch (err) {
      error.value = err instanceof Error ? err : new Error(String(err))
      layers.value = []
      hasLayers.value = false
    } finally {
      isLoading.value = false
    }
  }

  async function setLayerVisibility(ocgId: number, visible: boolean): Promise<void> {
    if (!instance.value) return

    try {
      // Get current visibility state
      const currentState = await instance.value.getLayersVisibilityState()
      const visibleIds = new Set(currentState.visibleLayerIds)

      // Update visibility
      if (visible) {
        visibleIds.add(ocgId)
      } else {
        visibleIds.delete(ocgId)
      }

      // Apply new visibility state
      await instance.value.setLayersVisibilityState({
        visibleLayerIds: Array.from(visibleIds),
      })

      // Update local state
      const layerIndex = layers.value.findIndex((l) => l.ocgId === ocgId)
      const existingLayer = layers.value[layerIndex]
      if (layerIndex !== -1 && existingLayer) {
        layers.value[layerIndex] = {
          ...existingLayer,
          visible,
        }
      }
    } catch (err) {
      error.value = err instanceof Error ? err : new Error(String(err))
      throw error.value
    }
  }

  async function toggleLayerVisibility(ocgId: number): Promise<void> {
    const layer = layers.value.find((l) => l.ocgId === ocgId)
    if (layer) {
      await setLayerVisibility(ocgId, !layer.visible)
    }
  }

  async function showAllLayers(): Promise<void> {
    if (!instance.value || layers.value.length === 0) return

    try {
      const allIds = layers.value.map((l) => l.ocgId)
      await instance.value.setLayersVisibilityState({
        visibleLayerIds: allIds,
      })

      // Update local state
      layers.value = layers.value.map((layer) => ({
        ...layer,
        visible: true,
      }))
    } catch (err) {
      error.value = err instanceof Error ? err : new Error(String(err))
      throw error.value
    }
  }

  async function hideAllLayers(): Promise<void> {
    if (!instance.value) return

    try {
      await instance.value.setLayersVisibilityState({
        visibleLayerIds: [],
      })

      // Update local state
      layers.value = layers.value.map((layer) => ({
        ...layer,
        visible: false,
      }))
    } catch (err) {
      error.value = err instanceof Error ? err : new Error(String(err))
      throw error.value
    }
  }

  async function showOnlyLayer(ocgId: number): Promise<void> {
    if (!instance.value) return

    try {
      await instance.value.setLayersVisibilityState({
        visibleLayerIds: [ocgId],
      })

      // Update local state
      layers.value = layers.value.map((layer) => ({
        ...layer,
        visible: layer.ocgId === ocgId,
      }))
    } catch (err) {
      error.value = err instanceof Error ? err : new Error(String(err))
      throw error.value
    }
  }

  // ---------------------------------------------------------------------------
  // Auto-refresh when instance changes
  // ---------------------------------------------------------------------------

  watch(
    instance,
    async (newInstance) => {
      if (newInstance) {
        await refreshLayers()
      } else {
        layers.value = []
        hasLayers.value = false
      }
    },
    { immediate: true },
  )

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------

  return {
    // State
    layers,
    isLoading,
    error,
    hasLayers,

    // Actions
    refreshLayers,
    setLayerVisibility,
    toggleLayerVisibility,
    showAllLayers,
    hideAllLayers,
    showOnlyLayer,
  }
}
