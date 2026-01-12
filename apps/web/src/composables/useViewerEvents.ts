import { ref, watch, onUnmounted, type Ref } from 'vue'
import type { Instance } from '@nutrient-sdk/viewer'

export interface ViewerEvent {
  id: string
  type: string
  timestamp: Date
  data: unknown
}

const TRACKED_EVENTS = [
  'viewState.change',
  'viewState.currentPageIndex.change',
  'viewState.zoom.change',
  'annotations.change',
  'document.change',
] as const

type TrackedEvent = (typeof TRACKED_EVENTS)[number]

export function useViewerEvents(options: { instance: Ref<Instance | null>; maxEvents?: number }) {
  const { instance, maxEvents = 50 } = options

  const events = ref<ViewerEvent[]>([])
  const isListening = ref(false)
  const listeners = new Map<TrackedEvent, () => void>()

  let eventCounter = 0

  function startListening() {
    if (!instance.value || isListening.value) return

    for (const eventType of TRACKED_EVENTS) {
      const handler = () => {
        events.value = [
          { id: `${++eventCounter}`, type: eventType, timestamp: new Date(), data: null },
          ...events.value,
        ].slice(0, maxEvents)
      }
      listeners.set(eventType, handler)
      instance.value.addEventListener(eventType, handler)
    }

    isListening.value = true
  }

  function stopListening() {
    if (!instance.value || !isListening.value) return

    for (const [eventType, handler] of listeners) {
      instance.value.removeEventListener(eventType, handler)
    }
    listeners.clear()
    isListening.value = false
  }

  function clearEvents() {
    events.value = []
  }

  watch(
    instance,
    (newInstance, oldInstance) => {
      if (oldInstance && isListening.value) {
        for (const [eventType, handler] of listeners) {
          oldInstance.removeEventListener(eventType, handler)
        }
        listeners.clear()
        isListening.value = false
      }

      if (newInstance) {
        startListening()
      }
    },
    { immediate: true },
  )

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
