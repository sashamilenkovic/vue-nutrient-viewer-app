import { ref, computed, type Ref } from 'vue'
import {
  getNutrientViewer,
  type NutrientViewerInstance,
  type Annotation,
  type SerializedAnnotation,
} from './useNutrientViewer'

// =============================================================================
// TYPES
// =============================================================================

export interface AnnotationData {
  id: string
  type: string
  pageIndex: number
  customData?: Record<string, unknown>
}

export interface CreateTextAnnotationOptions {
  pageIndex: number
  text: string
  position: { left: number; top: number }
  size?: { width: number; height: number }
  customData?: Record<string, unknown>
}

export interface UseAnnotationsOptions {
  instance: Ref<NutrientViewerInstance | null>
}

export interface UseAnnotationsReturn {
  // State
  annotations: Ref<AnnotationData[]>
  isLoading: Ref<boolean>
  error: Ref<Error | null>

  // Read operations
  getAnnotations: (pageIndex: number) => Promise<AnnotationData[]>
  getAllAnnotations: () => Promise<AnnotationData[]>
  refreshAnnotations: () => Promise<void>

  // Write operations
  createTextAnnotation: (options: CreateTextAnnotationOptions) => Promise<AnnotationData | null>
  deleteAnnotation: (annotationId: string) => Promise<void>

  // Export operations
  exportInstantJson: () => Promise<{ annotations: SerializedAnnotation[] }>
  exportXfdf: () => Promise<string>
}

// =============================================================================
// COMPOSABLE
// =============================================================================

export function useAnnotations(options: UseAnnotationsOptions): UseAnnotationsReturn {
  const { instance } = options

  const annotations = ref<AnnotationData[]>([])
  const isLoading = ref(false)
  const error = ref<Error | null>(null)

  const isReady = computed(() => instance.value !== null)

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  function mapAnnotation(annotation: Annotation): AnnotationData {
    return {
      id: annotation.id,
      type: annotation.type,
      pageIndex: annotation.pageIndex,
      customData: annotation.customData as Record<string, unknown> | undefined,
    }
  }

  // ---------------------------------------------------------------------------
  // Read Operations
  // ---------------------------------------------------------------------------

  async function getAnnotations(pageIndex: number): Promise<AnnotationData[]> {
    if (!instance.value) return []

    try {
      const result = await instance.value.getAnnotations(pageIndex)
      const annotationArray = result.toArray ? result.toArray() : []
      return annotationArray.map(mapAnnotation)
    } catch (err) {
      console.error('Failed to get annotations:', err)
      return []
    }
  }

  async function getAllAnnotations(): Promise<AnnotationData[]> {
    if (!instance.value) return []

    const totalPages = instance.value.totalPageCount
    const allAnnotations: AnnotationData[] = []

    for (let i = 0; i < totalPages; i++) {
      const pageAnnotations = await getAnnotations(i)
      allAnnotations.push(...pageAnnotations)
    }

    return allAnnotations
  }

  async function refreshAnnotations(): Promise<void> {
    if (!isReady.value) return

    isLoading.value = true
    error.value = null

    try {
      annotations.value = await getAllAnnotations()
    } catch (err) {
      error.value = err instanceof Error ? err : new Error(String(err))
    } finally {
      isLoading.value = false
    }
  }

  // ---------------------------------------------------------------------------
  // Write Operations
  // ---------------------------------------------------------------------------

  async function createTextAnnotation(
    options: CreateTextAnnotationOptions,
  ): Promise<AnnotationData | null> {
    if (!instance.value) {
      throw new Error('Viewer not initialized')
    }

    const NutrientViewer = getNutrientViewer()

    const { pageIndex, text, position, size = { width: 200, height: 100 }, customData } = options

    try {
      const textAnnotation = new NutrientViewer.Annotations.TextAnnotation({
        pageIndex,
        boundingBox: new NutrientViewer.Geometry.Rect({
          left: position.left,
          top: position.top,
          width: size.width,
          height: size.height,
        }),
        text: { format: 'plain', value: text },
        fontSize: 14,
        fontColor: NutrientViewer.Color.BLACK,
        backgroundColor: new NutrientViewer.Color({ r: 255, g: 255, b: 200 }), // Light yellow
        customData,
      })

      const created = await instance.value.create(textAnnotation)

      const annotation = created?.[0]
      if (annotation) {
        await refreshAnnotations()
        return mapAnnotation(annotation)
      }

      return null
    } catch (err) {
      error.value = err instanceof Error ? err : new Error(String(err))
      throw error.value
    }
  }

  async function deleteAnnotation(annotationId: string): Promise<void> {
    if (!instance.value) {
      throw new Error('Viewer not initialized')
    }

    try {
      await instance.value.delete(annotationId)
      await refreshAnnotations()
    } catch (err) {
      error.value = err instanceof Error ? err : new Error(String(err))
      throw error.value
    }
  }

  // ---------------------------------------------------------------------------
  // Export Operations
  // ---------------------------------------------------------------------------

  async function exportInstantJson(): Promise<{ annotations: SerializedAnnotation[] }> {
    if (!instance.value) {
      throw new Error('Viewer not initialized')
    }

    return await instance.value.exportInstantJSON()
  }

  async function exportXfdf(): Promise<string> {
    if (!instance.value) {
      throw new Error('Viewer not initialized')
    }

    return await instance.value.exportXFDF()
  }

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------

  return {
    // State
    annotations,
    isLoading,
    error,

    // Read operations
    getAnnotations,
    getAllAnnotations,
    refreshAnnotations,

    // Write operations
    createTextAnnotation,
    deleteAnnotation,

    // Export operations
    exportInstantJson,
    exportXfdf,
  }
}
