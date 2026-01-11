import { ref, watch, onUnmounted, type Ref } from 'vue'
import type { NutrientViewerInstance } from './useNutrientViewer'

export interface ViewerEvent {
  id: string
  type: string
  timestamp: Date
  data: unknown
}

export interface UseViewerEventsOptions {
  instance: Ref<NutrientViewerInstance | null>
  maxEvents?: number
}

export interface UseViewerEventsReturn {
  events: Ref<ViewerEvent[]>
  isListening: Ref<boolean>
  clearEvents: () => void
  startListening: () => void
  stopListening: () => void
}

// Events we want to track for demo purposes
const TRACKED_EVENTS = [
  'viewState.change',
  'viewState.currentPageIndex.change',
  'viewState.zoom.change',
  'annotations.change',
  'annotations.create',
  'annotations.update',
  'annotations.delete',
  'annotations.load',
  'document.change',
  'textSelection.change',
] as const

export function useViewerEvents(options: UseViewerEventsOptions): UseViewerEventsReturn {
  const { instance, maxEvents = 50 } = options

  const events = ref<ViewerEvent[]>([])
  const isListening = ref(false)
  const listeners = new Map<string, (data: unknown) => void>()

  let eventCounter = 0

  function createEventHandler(eventType: string) {
    return (data: unknown) => {
      const event: ViewerEvent = {
        id: `event-${++eventCounter}`,
        type: eventType,
        timestamp: new Date(),
        data: sanitizeEventData(data),
      }

      events.value = [event, ...events.value].slice(0, maxEvents)
    }
  }

  function sanitizeEventData(data: unknown): unknown {
    // Convert complex objects to simpler representations
    if (data === null || data === undefined) {
      return null
    }

    if (typeof data === 'object') {
      // Handle Immutable.js objects (common in NutrientViewer)
      if (typeof (data as { toJS?: () => unknown }).toJS === 'function') {
        return (data as { toJS: () => unknown }).toJS()
      }

      // Handle arrays
      if (Array.isArray(data)) {
        return data.map(sanitizeEventData)
      }

      // Handle plain objects - extract key properties
      const sanitized: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(data)) {
        // Skip functions and internal properties
        if (typeof value === 'function' || key.startsWith('_')) continue

        // Limit depth
        if (typeof value === 'object' && value !== null) {
          if (typeof (value as { toJS?: () => unknown }).toJS === 'function') {
            sanitized[key] = (value as { toJS: () => unknown }).toJS()
          } else {
            sanitized[key] = '[Object]'
          }
        } else {
          sanitized[key] = value
        }
      }
      return sanitized
    }

    return data
  }

  function startListening(): void {
    if (!instance.value || isListening.value) return

    for (const eventType of TRACKED_EVENTS) {
      const handler = createEventHandler(eventType)
      listeners.set(eventType, handler)
      instance.value.addEventListener(eventType, handler)
    }

    isListening.value = true
  }

  function stopListening(): void {
    if (!instance.value || !isListening.value) return

    for (const [eventType, handler] of listeners) {
      instance.value.removeEventListener(eventType, handler)
    }

    listeners.clear()
    isListening.value = false
  }

  function clearEvents(): void {
    events.value = []
  }

  // Auto-attach listeners when instance changes
  watch(
    instance,
    (newInstance, oldInstance) => {
      // Clean up old listeners
      if (oldInstance && isListening.value) {
        for (const [eventType, handler] of listeners) {
          oldInstance.removeEventListener(eventType, handler)
        }
        listeners.clear()
        isListening.value = false
      }

      // Auto-start listening on new instance
      if (newInstance) {
        startListening()
      }
    },
    { immediate: true },
  )

  // Cleanup on unmount
  onUnmounted(() => {
    stopListening()
  })

  return {
    events,
    isListening,
    clearEvents,
    startListening,
    stopListening,
  }
}
