<script setup lang="ts">
import { ref, computed } from 'vue'
import DocumentViewer from '@/components/DocumentViewer.vue'
import ControlPanel from '@/components/ControlPanel.vue'
import type { NutrientViewerInstance } from '@/composables/useNutrientViewer'
import type { ViewerMode } from '@/components/controls/DocumentSelector.vue'

const viewerRef = ref<InstanceType<typeof DocumentViewer> | null>(null)
const viewerInstance = ref<NutrientViewerInstance | null>(null)
const currentPage = ref(0)
const totalPages = ref(0)

// Viewer mode: standalone (local PDFs) or document-engine (server)
const viewerMode = ref<ViewerMode>('standalone')

// Document source - can be URL string, ArrayBuffer, or documentId
const documentUrl = ref<string | undefined>('/samples/example.pdf')
const documentData = ref<ArrayBuffer | undefined>(undefined)
const documentId = ref<string | undefined>(undefined)
const currentDocumentName = ref('example.pdf')

// Document Engine URL from environment
const serverUrl = computed(() => import.meta.env.VITE_DE_URL || 'http://localhost:5000')

function handleViewerLoaded(instance: NutrientViewerInstance) {
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

function handleLoadDocumentUrl(url: string, name: string) {
  // Clear other sources, set URL
  documentData.value = undefined
  documentId.value = undefined
  documentUrl.value = url
  currentDocumentName.value = name
}

function handleLoadDocumentData(data: ArrayBuffer, name: string) {
  // Clear other sources, set file data
  documentUrl.value = undefined
  documentId.value = undefined
  documentData.value = data
  currentDocumentName.value = name
}

function handleLoadDocumentId(id: string, name: string) {
  // Clear other sources, set documentId for Document Engine mode
  documentUrl.value = undefined
  documentData.value = undefined
  documentId.value = id
  currentDocumentName.value = name
}

function handleModeChange(mode: ViewerMode) {
  viewerMode.value = mode
  // Clear current document when switching modes
  if (mode === 'standalone') {
    documentId.value = undefined
    documentUrl.value = '/samples/example.pdf'
    currentDocumentName.value = 'example.pdf'
  } else {
    documentUrl.value = undefined
    documentData.value = undefined
    documentId.value = undefined
    currentDocumentName.value = 'No document loaded'
  }
}
</script>

<template>
  <div class="app">
    <header class="app__header">
      <h1 class="app__title">Nutrient Viewer Demo</h1>
      <span class="app__subtitle">Vue Integration POC</span>
    </header>

    <main class="app__main">
      <aside class="app__sidebar">
        <ControlPanel
          :viewer-instance="viewerInstance"
          :current-page="currentPage"
          :total-pages="totalPages"
          :current-document-name="currentDocumentName"
          :viewer-mode="viewerMode"
          @load-document-url="handleLoadDocumentUrl"
          @load-document-data="handleLoadDocumentData"
          @load-document-id="handleLoadDocumentId"
          @update:viewer-mode="handleModeChange"
        />
      </aside>

      <section class="app__viewer">
        <DocumentViewer
          ref="viewerRef"
          :document-url="documentUrl"
          :document-data="documentData"
          :document-id="documentId"
          :server-url="serverUrl"
          @loaded="handleViewerLoaded"
          @error="handleViewerError"
          @page-change="handlePageChange"
          @annotations-change="handleAnnotationsChange"
        />
      </section>
    </main>
  </div>
</template>

<style>
/* Reset and base styles */
*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html,
body,
#app {
  height: 100%;
  width: 100%;
}

body {
  font-family:
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    Roboto,
    Oxygen,
    Ubuntu,
    Cantarell,
    sans-serif;
  font-size: 14px;
  line-height: 1.5;
  color: var(--color-text);
  background: var(--color-background);
}

:root {
  --color-background: #f5f7fa;
  --color-surface: #ffffff;
  --color-primary: #4a90d9;
  --color-primary-hover: #3a7bc8;
  --color-text: #1a1a1a;
  --color-text-secondary: #666666;
  --color-border: #e0e4e8;
  --color-error: #d32f2f;
  --color-success: #388e3c;

  --sidebar-width: 320px;
  --header-height: 56px;

  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;

  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.07);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);

  --transition-fast: 150ms ease;
  --transition-normal: 250ms ease;
}
</style>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
}

.app__header {
  display: flex;
  align-items: center;
  gap: 1rem;
  height: var(--header-height);
  padding: 0 1.5rem;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.app__title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text);
}

.app__subtitle {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  padding: 0.25rem 0.75rem;
  background: var(--color-background);
  border-radius: var(--radius-sm);
}

.app__main {
  display: flex;
  flex: 1;
  min-height: 0;
}

.app__sidebar {
  width: var(--sidebar-width);
  flex-shrink: 0;
  background: var(--color-surface);
  border-right: 1px solid var(--color-border);
  overflow-y: auto;
}

.app__viewer {
  flex: 1;
  min-width: 0;
  background: var(--color-background);
}
</style>
