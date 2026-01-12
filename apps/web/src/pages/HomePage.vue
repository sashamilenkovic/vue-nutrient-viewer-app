<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Instance } from '@nutrient-sdk/viewer'
import DocumentViewer from '@/components/DocumentViewer.vue'
import ControlPanel from '@/components/ControlPanel.vue'

const viewerRef = ref<InstanceType<typeof DocumentViewer> | null>(null)
const viewerInstance = ref<Instance | null>(null)
const currentPage = ref(0)
const totalPages = ref(0)

// Document source - documentId for Document Engine
const documentId = ref<string | undefined>(undefined)
const currentDocumentName = ref('No document loaded')

// Instant Layer - annotation container
const currentLayer = ref<string | undefined>(undefined)

// Document Engine URL from environment
const serverUrl = computed(() => import.meta.env.VITE_DE_URL || 'http://localhost:5000')

function handleViewerLoaded(instance: Instance) {
  viewerInstance.value = instance
  totalPages.value = instance.totalPageCount
  currentPage.value = instance.viewState.currentPageIndex
}

function handleViewerError(error: Error) {
  console.error('Viewer error:', error)
}

function handlePageChange(pageIndex: number) {
  currentPage.value = pageIndex
}

function handleAnnotationsChange() {
  console.log('Annotations changed')
}

function handleLoadDocumentId(id: string, name: string) {
  documentId.value = id
  currentDocumentName.value = name
  // Reset to default layer when loading a new document
  currentLayer.value = undefined
}

function handleSwitchLayer(layerName: string) {
  currentLayer.value = layerName
}
</script>

<template>
  <div class="home">
    <aside class="home__sidebar">
      <ControlPanel
        :viewer-instance="viewerInstance"
        :current-page="currentPage"
        :total-pages="totalPages"
        :current-document-name="currentDocumentName"
        :current-document-id="documentId"
        :current-layer="currentLayer"
        @load-document-id="handleLoadDocumentId"
        @switch-layer="handleSwitchLayer"
      />
    </aside>

    <section class="home__viewer">
      <DocumentViewer
        ref="viewerRef"
        :document-id="documentId"
        :layer="currentLayer"
        :server-url="serverUrl"
        @loaded="handleViewerLoaded"
        @error="handleViewerError"
        @page-change="handlePageChange"
        @annotations-change="handleAnnotationsChange"
      />
    </section>
  </div>
</template>

<style scoped>
.home {
  display: flex;
  flex: 1;
  min-height: 0;
}

.home__sidebar {
  width: var(--sidebar-width);
  flex-shrink: 0;
  background: var(--color-surface);
  border-right: 1px solid var(--color-border);
  overflow-y: auto;
}

.home__viewer {
  flex: 1;
  min-width: 0;
  background: var(--color-background);
}
</style>
