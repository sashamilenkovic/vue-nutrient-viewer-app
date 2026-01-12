<script setup lang="ts">
import { computed, ref } from 'vue'
import type NutrientViewer from '@nutrient-sdk/viewer'
import { useViewerEvents, type ViewerEvent } from '@/composables/useViewerEvents'

type Instance = InstanceType<typeof NutrientViewer.Instance>

// =============================================================================
// PROPS & STATE
// =============================================================================

const props = defineProps<{
  viewerInstance: Instance | null
}>()

const instanceRef = computed(() => props.viewerInstance)

const { events, isListening, clearEvents, startListening, stopListening } = useViewerEvents({
  instance: instanceRef,
  maxEvents: 50,
})

// UI state
const expandedEventId = ref<string | null>(null)
const autoScroll = ref(true)

// =============================================================================
// HANDLERS
// =============================================================================

function toggleEventDetails(eventId: string) {
  expandedEventId.value = expandedEventId.value === eventId ? null : eventId
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3,
  } as Intl.DateTimeFormatOptions)
}

function formatEventData(data: unknown): string {
  if (data === null || data === undefined) return 'null'
  if (typeof data === 'object') {
    return JSON.stringify(data, null, 2)
  }
  return String(data)
}

function getEventColor(type: string): string {
  if (type.includes('annotation')) return 'var(--color-primary)'
  if (type.includes('viewState')) return 'var(--color-success)'
  if (type.includes('document')) return '#9c27b0'
  if (type.includes('text')) return '#ff9800'
  return 'var(--color-text-secondary)'
}
</script>

<template>
  <div class="event-log">
    <!-- Header -->
    <div class="event-log__header">
      <span class="event-log__label">
        Event Log
        <span class="event-log__count">({{ events.length }})</span>
      </span>
      <span
        class="event-log__status"
        :class="{ 'event-log__status--active': isListening }"
      >
        {{ isListening ? 'Listening' : 'Paused' }}
      </span>
    </div>

    <!-- Controls -->
    <div class="event-log__controls">
      <button
        v-if="isListening"
        class="event-log__btn event-log__btn--small"
        @click="stopListening"
      >
        Pause
      </button>
      <button
        v-else
        class="event-log__btn event-log__btn--small event-log__btn--primary"
        :disabled="!viewerInstance"
        @click="startListening"
      >
        Start
      </button>
      <button
        class="event-log__btn event-log__btn--small"
        :disabled="events.length === 0"
        @click="clearEvents"
      >
        Clear
      </button>
      <label class="event-log__checkbox">
        <input v-model="autoScroll" type="checkbox" />
        Auto-scroll
      </label>
    </div>

    <!-- Event list -->
    <div v-if="!viewerInstance" class="event-log__empty">
      No document loaded
    </div>

    <div v-else-if="events.length === 0" class="event-log__empty">
      No events yet. Interact with the viewer to see events.
    </div>

    <ul v-else class="event-log__list">
      <li
        v-for="event in events"
        :key="event.id"
        class="event-log__item"
        :class="{ 'event-log__item--expanded': expandedEventId === event.id }"
        @click="toggleEventDetails(event.id)"
      >
        <div class="event-log__item-header">
          <span
            class="event-log__item-type"
            :style="{ color: getEventColor(event.type) }"
          >
            {{ event.type }}
          </span>
          <span class="event-log__item-time">{{ formatTime(event.timestamp) }}</span>
        </div>
        <div v-if="expandedEventId === event.id" class="event-log__item-data">
          <pre>{{ formatEventData(event.data) }}</pre>
        </div>
      </li>
    </ul>

    <!-- Legend -->
    <div class="event-log__legend">
      <span class="event-log__legend-item">
        <span class="event-log__legend-dot" style="background: var(--color-success)"></span>
        ViewState
      </span>
      <span class="event-log__legend-item">
        <span class="event-log__legend-dot" style="background: var(--color-primary)"></span>
        Annotations
      </span>
      <span class="event-log__legend-item">
        <span class="event-log__legend-dot" style="background: #9c27b0"></span>
        Document
      </span>
    </div>
  </div>
</template>

<style scoped>
.event-log {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.event-log__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.event-log__label {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.03em;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.event-log__count {
  font-weight: 400;
  text-transform: none;
}

.event-log__status {
  font-size: 0.6875rem;
  padding: 0.125rem 0.5rem;
  border-radius: var(--radius-sm);
  background: var(--color-text-secondary);
  color: #fff;
}

.event-log__status--active {
  background: var(--color-success);
}

.event-log__controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.event-log__btn {
  padding: 0.375rem 0.75rem;
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--color-text);
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition:
    background var(--transition-fast),
    border-color var(--transition-fast);
}

.event-log__btn:hover:not(:disabled) {
  background: var(--color-border);
  border-color: var(--color-text-secondary);
}

.event-log__btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.event-log__btn--small {
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
}

.event-log__btn--primary {
  color: #fff;
  background: var(--color-primary);
  border-color: var(--color-primary);
}

.event-log__btn--primary:hover:not(:disabled) {
  background: var(--color-primary-hover);
  border-color: var(--color-primary-hover);
}

.event-log__checkbox {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  cursor: pointer;
  margin-left: auto;
}

.event-log__checkbox input {
  cursor: pointer;
}

.event-log__empty {
  font-size: 0.8125rem;
  color: var(--color-text-secondary);
  padding: 0.5rem 0;
}

.event-log__list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  max-height: 250px;
  overflow-y: auto;
}

.event-log__item {
  padding: 0.375rem 0.5rem;
  background: var(--color-background);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background var(--transition-fast);
}

.event-log__item:hover {
  background: var(--color-border);
}

.event-log__item--expanded {
  background: var(--color-border);
}

.event-log__item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.event-log__item-type {
  font-size: 0.75rem;
  font-weight: 500;
  font-family: monospace;
}

.event-log__item-time {
  font-size: 0.6875rem;
  font-family: monospace;
  color: var(--color-text-secondary);
}

.event-log__item-data {
  margin-top: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px solid var(--color-surface);
}

.event-log__item-data pre {
  margin: 0;
  font-size: 0.6875rem;
  font-family: monospace;
  white-space: pre-wrap;
  word-break: break-all;
  color: var(--color-text-secondary);
}

.event-log__legend {
  display: flex;
  gap: 0.75rem;
  padding-top: 0.5rem;
  border-top: 1px solid var(--color-border);
}

.event-log__legend-item {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.6875rem;
  color: var(--color-text-secondary);
}

.event-log__legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
</style>
