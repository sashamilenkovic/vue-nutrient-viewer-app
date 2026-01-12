<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import type NutrientViewer from '@nutrient-sdk/viewer'
import { useNutrientViewer } from '@/composables/useNutrientViewer'

type Instance = InstanceType<typeof NutrientViewer.Instance>

const props = withDefaults(
  defineProps<{
    documentId?: string
    serverUrl?: string
    theme?: 'LIGHT' | 'DARK'
  }>(),
  {
    theme: 'LIGHT',
  },
)

const emit = defineEmits<{
  loaded: [instance: Instance]
  error: [error: Error]
  pageChange: [pageIndex: number]
  annotationsChange: []
}>()

const containerRef = ref<HTMLElement | null>(null)

const { instance, isLoading, error, load, unload } = useNutrientViewer({
  serverUrl: props.serverUrl,
  theme: props.theme,
})

async function loadDocument() {
  if (!containerRef.value || !props.documentId) return

  try {
    await load(containerRef.value, props.documentId)

    if (instance.value) {
      emit('loaded', instance.value)

      // Set up event listeners
      instance.value.addEventListener('viewState.currentPageIndex.change', (pageIndex: number) => {
        emit('pageChange', pageIndex)
      })

      instance.value.addEventListener('annotations.change', () => {
        emit('annotationsChange')
      })
    }
  } catch (err) {
    if (err instanceof Error) {
      emit('error', err)
    }
  }
}

// Load document when component mounts or documentId changes
onMounted(() => {
  if (props.documentId) {
    loadDocument()
  }
})

watch(
  () => props.documentId,
  () => {
    loadDocument()
  },
)

// Expose instance and methods for parent component access
defineExpose({
  instance,
  isLoading,
  error,
  reload: loadDocument,
  unload,
})
</script>

<template>
  <div class="document-viewer">
    <div v-if="isLoading" class="document-viewer__loading">
      <div class="document-viewer__spinner"></div>
      <span>Loading document...</span>
    </div>

    <div v-if="error" class="document-viewer__error">
      <span>Failed to load document: {{ error.message }}</span>
    </div>

    <div ref="containerRef" class="document-viewer__container"></div>
  </div>
</template>

<style scoped>
.document-viewer {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 400px;
}

.document-viewer__container {
  position: relative;
  width: 100%;
  height: 100%;
}

.document-viewer__loading {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  background: var(--color-background, #fff);
  z-index: 10;
}

.document-viewer__spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--color-border, #e0e0e0);
  border-top-color: var(--color-primary, #4a90d9);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.document-viewer__error {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-background, #fff);
  color: var(--color-error, #d32f2f);
  z-index: 10;
}
</style>
