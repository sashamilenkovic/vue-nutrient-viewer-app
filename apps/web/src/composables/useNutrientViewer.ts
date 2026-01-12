import { ref, onUnmounted } from 'vue'
import type { Instance } from '@nutrient-sdk/viewer'

export function useNutrientViewer(options: {
  serverUrl?: string
  theme?: 'LIGHT' | 'DARK'
  jwtEndpoint?: string
} = {}) {
  const instance = ref<Instance | null>(null)
  const isLoading = ref(false)
  const error = ref<Error | null>(null)
  const containerRef = ref<HTMLElement | null>(null)
  const currentDocumentId = ref<string | null>(null)
  const currentLayer = ref<string | null>(null)

  const {
    serverUrl: rawServerUrl,
    theme = 'LIGHT',
    jwtEndpoint = '/api/jwt',
  } = options

  const baseUrl = rawServerUrl || import.meta.env.VITE_DE_URL || 'http://localhost:5000'
  const serverUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`

  /**
   * Fetch a JWT for a document, optionally scoped to an Instant Layer
   */
  async function fetchJWT(documentId: string, layer?: string): Promise<string> {
    const body: Record<string, unknown> = { documentId }

    // Include layer in JWT only if it's a non-empty string
    // Empty string "" means "default layer" which is the same as no layer claim
    if (layer) {
      body.layer = layer
    }

    const response = await fetch(jwtEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `Failed to fetch JWT: ${response.status}`)
    }

    const data = await response.json()
    return data.jwt
  }

  /**
   * Load a document, optionally on a specific Instant Layer
   * @param container - The HTML element to render the viewer in
   * @param documentId - The Document Engine document ID
   * @param layer - Optional Instant Layer name (empty string for default layer)
   */
  async function load(container: HTMLElement, documentId: string, layer?: string) {
    if (instance.value) {
      await unload()
    }

    isLoading.value = true
    error.value = null
    containerRef.value = container
    currentDocumentId.value = documentId
    currentLayer.value = layer ?? null

    try {
      const jwt = await fetchJWT(documentId, layer)

      instance.value = await window.NutrientViewer.load({
        container,
        serverUrl,
        theme: window.NutrientViewer.Theme[theme],
        documentId,
        authPayload: { jwt },
        instant: true,
      })
    } catch (err) {
      error.value = err instanceof Error ? err : new Error(String(err))
      throw error.value
    } finally {
      isLoading.value = false
    }
  }

  async function unload() {
    if (containerRef.value && instance.value) {
      try {
        window.NutrientViewer.unload(containerRef.value)
      } catch {
        // Ignore unload errors
      }
      instance.value = null
      containerRef.value = null
    }
  }

  onUnmounted(() => {
    unload()
  })

  return {
    instance,
    isLoading,
    error,
    currentDocumentId,
    currentLayer,
    load,
    unload,
  }
}
