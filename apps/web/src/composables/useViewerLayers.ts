import { ref, computed } from 'vue'

/**
 * Instant Layers are annotation containers managed by Document Engine.
 * Each layer has its own set of annotations, allowing multiple users/roles
 * to annotate the same document independently.
 *
 * Note: This is different from OCG (PDF content) layers, which are not
 * supported when using Document Engine.
 */

export interface InstantLayer {
  name: string
  displayName: string
  isDefault: boolean
}

export function useInstantLayers(options: { documentId: () => string | null }) {
  const { documentId } = options

  const layers = ref<InstantLayer[]>([])
  const currentLayerName = ref<string | null>(null)
  const isLoading = ref(false)
  const error = ref<Error | null>(null)

  const hasLayers = computed(() => layers.value.length > 0)
  const currentLayer = computed(() =>
    layers.value.find((l) => l.name === currentLayerName.value) || null
  )

  /**
   * Fetch all layers for the current document from Document Engine
   */
  async function fetchLayers(): Promise<void> {
    const docId = documentId()
    if (!docId) {
      layers.value = []
      return
    }

    isLoading.value = true
    error.value = null

    try {
      const response = await fetch(`/api/documents/${docId}/layers`)

      if (!response.ok) {
        throw new Error(`Failed to fetch layers: ${response.statusText}`)
      }

      const data = await response.json()
      const layerNames: string[] = data.layers || []

      layers.value = layerNames.map((name) => ({
        name,
        displayName: name === '' ? 'Default' : name,
        isDefault: name === '',
      }))

      // Set current layer to default if not set
      if (currentLayerName.value === null && layers.value.length > 0) {
        currentLayerName.value = ''
      }
    } catch (err) {
      error.value = err instanceof Error ? err : new Error(String(err))
      layers.value = []
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Set the current layer. The caller is responsible for reloading the viewer
   * with the new layer's JWT.
   */
  function setCurrentLayer(layerName: string): void {
    currentLayerName.value = layerName
  }

  /**
   * Get a JWT for loading a specific layer.
   * Returns null if documentId is not set.
   */
  async function getLayerJWT(layerName: string): Promise<string | null> {
    const docId = documentId()
    if (!docId) return null

    try {
      const response = await fetch('/api/jwt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: docId,
          layer: layerName,
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to get layer JWT: ${response.statusText}`)
      }

      const data = await response.json()
      return data.jwt
    } catch (err) {
      error.value = err instanceof Error ? err : new Error(String(err))
      return null
    }
  }

  /**
   * Create a new layer by name.
   * Layers are created lazily in Document Engine when the first annotation is made.
   * This function just adds the layer to our local list and returns a JWT for it.
   */
  async function createLayer(layerName: string): Promise<string | null> {
    if (!layerName.trim()) {
      error.value = new Error('Layer name cannot be empty')
      return null
    }

    // Check if layer already exists
    if (layers.value.some((l) => l.name === layerName)) {
      error.value = new Error(`Layer "${layerName}" already exists`)
      return null
    }

    // Add to local list (will be created in DE when first annotation is made)
    layers.value.push({
      name: layerName,
      displayName: layerName,
      isDefault: false,
    })

    // Return JWT for the new layer
    return getLayerJWT(layerName)
  }

  /**
   * Reset state (call when document changes)
   */
  function reset(): void {
    layers.value = []
    currentLayerName.value = null
    error.value = null
  }

  return {
    // State
    layers,
    currentLayerName,
    currentLayer,
    isLoading,
    error,
    hasLayers,

    // Actions
    fetchLayers,
    setCurrentLayer,
    getLayerJWT,
    createLayer,
    reset,
  }
}

// Re-export for backwards compatibility, but this is now deprecated
export const useViewerLayers = useInstantLayers
