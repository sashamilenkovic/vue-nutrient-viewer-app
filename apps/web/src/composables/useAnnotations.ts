import { ref, computed, type Ref } from 'vue'
import type { Instance } from '@nutrient-sdk/viewer'

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

export function useAnnotations(options: { instance: Ref<Instance | null> }) {
  const { instance } = options

  const annotations = ref<AnnotationData[]>([])
  const isLoading = ref(false)
  const error = ref<Error | null>(null)

  const isReady = computed(() => instance.value !== null)

  async function getAnnotations(pageIndex: number): Promise<AnnotationData[]> {
    if (!instance.value) return []

    try {
      const result = await instance.value.getAnnotations(pageIndex)
      const annotationArray = result.toArray ? result.toArray() : []
      return annotationArray.map((a) => ({
        id: a.id,
        type: a.constructor.name,
        pageIndex: a.pageIndex,
        customData: a.customData as Record<string, unknown> | undefined,
      }))
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

  async function createTextAnnotation(
    opts: CreateTextAnnotationOptions,
  ): Promise<AnnotationData | null> {
    if (!instance.value) {
      throw new Error('Viewer not initialized')
    }

    const { pageIndex, text, position, size = { width: 200, height: 100 }, customData } = opts

    try {
      const textAnnotation = new window.NutrientViewer.Annotations.TextAnnotation({
        pageIndex,
        boundingBox: new window.NutrientViewer.Geometry.Rect({
          left: position.left,
          top: position.top,
          width: size.width,
          height: size.height,
        }),
        text: { format: 'plain', value: text },
        fontSize: 14,
        fontColor: window.NutrientViewer.Color.BLACK,
        backgroundColor: new window.NutrientViewer.Color({ r: 255, g: 255, b: 200 }),
        customData,
      })

      await instance.value.create(textAnnotation)
      await refreshAnnotations()
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

  async function exportInstantJson() {
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

  return {
    annotations,
    isLoading,
    error,
    getAnnotations,
    getAllAnnotations,
    refreshAnnotations,
    createTextAnnotation,
    deleteAnnotation,
    exportInstantJson,
    exportXfdf,
  }
}
