import { ref, watch, type Ref } from 'vue'
import type { Instance } from '@nutrient-sdk/viewer'

export interface LayerWithVisibility {
  ocgId: number
  name: string
  locked?: boolean
  visible: boolean
}

export function useViewerLayers(options: { instance: Ref<Instance | null> }) {
  const { instance } = options

  const layers = ref<LayerWithVisibility[]>([])
  const isLoading = ref(false)
  const error = ref<Error | null>(null)
  const hasLayers = ref(false)

  async function refreshLayers() {
    if (!instance.value) {
      layers.value = []
      hasLayers.value = false
      return
    }

    isLoading.value = true
    error.value = null

    try {
      const ocgLayers = await instance.value.getLayers()
      const visibilityState = await instance.value.getLayersVisibilityState()
      const visibleIds = new Set(visibilityState.visibleLayerIds)

      layers.value = ocgLayers.map((layer: { ocgId: number; name: string; locked?: boolean }) => ({
        ocgId: layer.ocgId,
        name: layer.name,
        locked: layer.locked,
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

  async function setLayerVisibility(ocgId: number, visible: boolean) {
    if (!instance.value) return

    try {
      const currentState = await instance.value.getLayersVisibilityState()
      const visibleIds = new Set(currentState.visibleLayerIds)

      if (visible) {
        visibleIds.add(ocgId)
      } else {
        visibleIds.delete(ocgId)
      }

      await instance.value.setLayersVisibilityState({
        visibleLayerIds: Array.from(visibleIds),
      })

      const layerIndex = layers.value.findIndex((l) => l.ocgId === ocgId)
      const existingLayer = layers.value[layerIndex]
      if (layerIndex !== -1 && existingLayer) {
        layers.value[layerIndex] = { ...existingLayer, visible }
      }
    } catch (err) {
      error.value = err instanceof Error ? err : new Error(String(err))
      throw error.value
    }
  }

  async function toggleLayerVisibility(ocgId: number) {
    const layer = layers.value.find((l) => l.ocgId === ocgId)
    if (layer) {
      await setLayerVisibility(ocgId, !layer.visible)
    }
  }

  async function showAllLayers() {
    if (!instance.value || layers.value.length === 0) return

    try {
      const allIds = layers.value.map((l) => l.ocgId)
      await instance.value.setLayersVisibilityState({ visibleLayerIds: allIds })
      layers.value = layers.value.map((layer) => ({ ...layer, visible: true }))
    } catch (err) {
      error.value = err instanceof Error ? err : new Error(String(err))
      throw error.value
    }
  }

  async function hideAllLayers() {
    if (!instance.value) return

    try {
      await instance.value.setLayersVisibilityState({ visibleLayerIds: [] })
      layers.value = layers.value.map((layer) => ({ ...layer, visible: false }))
    } catch (err) {
      error.value = err instanceof Error ? err : new Error(String(err))
      throw error.value
    }
  }

  async function showOnlyLayer(ocgId: number) {
    if (!instance.value) return

    try {
      await instance.value.setLayersVisibilityState({ visibleLayerIds: [ocgId] })
      layers.value = layers.value.map((layer) => ({
        ...layer,
        visible: layer.ocgId === ocgId,
      }))
    } catch (err) {
      error.value = err instanceof Error ? err : new Error(String(err))
      throw error.value
    }
  }

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

  return {
    layers,
    isLoading,
    error,
    hasLayers,
    refreshLayers,
    setLayerVisibility,
    toggleLayerVisibility,
    showAllLayers,
    hideAllLayers,
    showOnlyLayer,
  }
}
