import { ref, onUnmounted, type Ref } from 'vue'

// =============================================================================
// SDK TYPE DECLARATIONS
// =============================================================================

// SDK interface for window.NutrientViewer (loaded via CDN)
export interface NutrientViewerSDK {
  load: (config: ViewerConfig) => Promise<NutrientViewerInstance>
  unload: (container: HTMLElement) => Promise<void>

  // Namespaces
  Toolbars: {
    defaultToolbarItems: ToolbarItem[]
  }
  Annotations: {
    toSerializableObject: (annotation: Annotation) => SerializedAnnotation
    TextAnnotation: new (options: TextAnnotationOptions) => Annotation
    HighlightAnnotation: new (options: HighlightAnnotationOptions) => Annotation
    InkAnnotation: new (options: InkAnnotationOptions) => Annotation
    NoteAnnotation: new (options: NoteAnnotationOptions) => Annotation
    StampAnnotation: new (options: StampAnnotationOptions) => Annotation
    ImageAnnotation: new (options: ImageAnnotationOptions) => Annotation
  }
  Geometry: {
    Rect: RectConstructor
    DrawingPoint: new (options: { x: number; y: number }) => DrawingPoint
  }
  Color: ColorNamespace & {
    new (options: { r: number; g: number; b: number; a?: number }): Color
  }
  Immutable: {
    List: <T>(items: T[]) => ImmutableList<T>
  }
  ViewState: new (options: ViewStateOptions) => ViewState
  Theme: {
    LIGHT: 'LIGHT'
    DARK: 'DARK'
  }
}

declare global {
  interface Window {
    NutrientViewer: NutrientViewerSDK
  }
}

/**
 * Get the NutrientViewer SDK from window.
 * Throws if SDK is not loaded (CDN script not included).
 */
export function getNutrientViewer(): NutrientViewerSDK {
  if (!window.NutrientViewer) {
    throw new Error('NutrientViewer SDK not loaded. Make sure the CDN script is included.')
  }
  return window.NutrientViewer
}

// Color namespace with predefined colors
interface ColorNamespace {
  WHITE: Color
  BLACK: Color
  BLUE: Color
  RED: Color
  GREEN: Color
  YELLOW: Color
}

interface Color {
  r: number
  g: number
  b: number
  a?: number
}

interface Rect {
  left: number
  top: number
  width: number
  height: number
}

interface RectOptions {
  left: number
  top: number
  width: number
  height: number
}

interface RectConstructor {
  new (options: RectOptions): Rect
  union(rects: Rect[]): Rect | null
}

interface DrawingPoint {
  x: number
  y: number
}

interface ImmutableList<T> {
  toArray: () => T[]
  get: (index: number) => T | undefined
  size: number
}

// Annotation option types
interface BaseAnnotationOptions {
  pageIndex: number
  boundingBox?: Rect
  customData?: Record<string, unknown>
}

interface TextAnnotationOptions extends BaseAnnotationOptions {
  text: { format: 'plain' | 'xhtml'; value: string }
  fontSize?: number
  fontColor?: Color
  backgroundColor?: Color
  font?: string
  isBold?: boolean
  horizontalAlign?: 'left' | 'center' | 'right'
  verticalAlign?: 'top' | 'center' | 'bottom'
}

interface HighlightAnnotationOptions extends BaseAnnotationOptions {
  rects?: ImmutableList<Rect>
  color?: Color
}

interface InkAnnotationOptions extends BaseAnnotationOptions {
  lines: ImmutableList<ImmutableList<DrawingPoint>>
  strokeColor?: Color
  lineWidth?: number
}

interface NoteAnnotationOptions extends BaseAnnotationOptions {
  text: { format: 'plain' | 'xhtml'; value: string }
  icon?: string
}

interface StampAnnotationOptions extends BaseAnnotationOptions {
  stampType?: string
  title?: string
  subtitle?: string
}

interface ImageAnnotationOptions extends BaseAnnotationOptions {
  imageAttachmentId: string
  contentType: string
}

export interface ViewerConfig {
  container: HTMLElement | string
  document?: string | ArrayBuffer
  serverUrl?: string
  authPayload?: { jwt: string }
  instant?: boolean
  documentId?: string
  toolbarItems?: ToolbarItem[]
  initialViewState?: ViewState
  theme?: 'LIGHT' | 'DARK'
  useCDN?: boolean
}

export interface ToolbarItem {
  type: string
  [key: string]: unknown
}

export interface ViewState {
  currentPageIndex: number
  zoom: number | 'FIT_TO_WIDTH' | 'FIT_TO_VIEWPORT' | 'AUTO'
  // Immutable.js set method - returns a new ViewState with the updated property
  set: <K extends keyof ViewState>(key: K, value: ViewState[K]) => ViewState
}

export interface ViewStateOptions {
  currentPageIndex?: number
  zoom?: number | 'FIT_TO_WIDTH' | 'FIT_TO_VIEWPORT' | 'AUTO'
}

export interface Annotation {
  id: string
  type: string
  pageIndex: number
  [key: string]: unknown
}

export interface SerializedAnnotation {
  id: string
  type: string
  pageIndex: number
  [key: string]: unknown
}

export interface OCGLayer {
  ocgId: number
  name: string
  locked?: boolean
}

export interface OCGLayersVisibilityState {
  visibleLayerIds: number[]
}

export interface SearchState {
  results: ImmutableList<SearchResult>
  focusedResultIndex: number
  set: <K extends keyof SearchState>(key: K, value: SearchState[K]) => SearchState
}

export interface ImmutableSearchResults {
  toArray: () => SearchResult[]
}

export interface NutrientViewerInstance {
  totalPageCount: number
  viewState: ViewState
  setViewState: (viewState: Partial<ViewState> | ((state: ViewState) => ViewState)) => Promise<void>
  getAnnotations: (pageIndex: number) => Promise<{ toArray: () => Annotation[] }>
  create: (annotation: Partial<Annotation>) => Promise<Annotation[]>
  delete: (annotationIds: string | string[]) => Promise<void>
  exportInstantJSON: () => Promise<{ annotations: SerializedAnnotation[] }>
  exportPDF: () => Promise<ArrayBuffer>
  exportXFDF: () => Promise<string>
  search: (query: string, options?: SearchOptions) => Promise<ImmutableSearchResults>
  setSearchState: (updater: (state: SearchState) => SearchState) => void
  jumpToRect: (pageIndex: number, rect: { left: number; top: number; width: number; height: number }) => Promise<void>
  print: () => void
  addEventListener: <T = unknown>(event: string, callback: (data: T) => void) => void
  removeEventListener: (event: string, callback: (data: unknown) => void) => void
  contentDocument: Document
  contentWindow: Window
  createAttachment: (blob: Blob) => Promise<string>

  // OCG Layer methods
  getLayers: () => Promise<OCGLayer[]>
  getLayersVisibilityState: () => Promise<OCGLayersVisibilityState>
  setLayersVisibilityState: (state: OCGLayersVisibilityState) => Promise<void>
}

export interface SearchOptions {
  caseSensitive?: boolean
  searchType?: 'TEXT' | 'REGEX'
  searchInAnnotations?: boolean
}

// Alias for backwards compatibility
export type PSPDFKitInstance = NutrientViewerInstance

export interface SearchResult {
  pageIndex: number
  rectsOnPage: { left: number; top: number; width: number; height: number }[]
}

export interface UseNutrientViewerOptions {
  serverUrl?: string
  authToken?: string
  theme?: 'LIGHT' | 'DARK'
  toolbarItems?: ToolbarItem[]
  /** API endpoint to fetch JWT for Document Engine documents */
  jwtEndpoint?: string
}

export type DocumentSource = string | ArrayBuffer | { documentId: string }

export interface UseNutrientViewerReturn {
  instance: Ref<NutrientViewerInstance | null>
  isLoading: Ref<boolean>
  error: Ref<Error | null>
  load: (container: HTMLElement, documentSource: DocumentSource) => Promise<void>
  unload: () => Promise<void>
}

export function useNutrientViewer(options: UseNutrientViewerOptions = {}): UseNutrientViewerReturn {
  const instance = ref<NutrientViewerInstance | null>(null)
  const isLoading = ref(false)
  const error = ref<Error | null>(null)
  const containerRef = ref<HTMLElement | null>(null)

  const {
    serverUrl = import.meta.env.VITE_DE_URL || 'http://localhost:5000',
    authToken = import.meta.env.VITE_API_AUTH_TOKEN || '',
    theme = 'LIGHT',
    toolbarItems,
    jwtEndpoint = '/api/jwt',
  } = options

  /**
   * Fetch JWT from the server for a given document ID
   */
  async function fetchJWT(documentId: string): Promise<string> {
    const response = await fetch(jwtEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentId }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `Failed to fetch JWT: ${response.status}`)
    }

    const data = await response.json()
    return data.jwt
  }

  async function load(
    container: HTMLElement,
    documentSource: DocumentSource,
  ): Promise<void> {
    if (instance.value) {
      await unload()
    }

    isLoading.value = true
    error.value = null
    containerRef.value = container

    try {
      const config: ViewerConfig = {
        container,
        serverUrl,
        theme,
        useCDN: true,
      }

      // Configure document source
      if (typeof documentSource === 'string') {
        // URL-based loading (standalone mode)
        config.document = documentSource
        if (authToken) {
          config.authPayload = { jwt: authToken }
        }
      } else if (documentSource instanceof ArrayBuffer) {
        // ArrayBuffer loading (standalone mode)
        config.document = documentSource
        if (authToken) {
          config.authPayload = { jwt: authToken }
        }
      } else {
        // Document Engine mode - fetch JWT from server
        const jwt = await fetchJWT(documentSource.documentId)
        config.documentId = documentSource.documentId
        config.authPayload = { jwt }
        config.instant = true
      }

      // Configure toolbar
      if (toolbarItems) {
        config.toolbarItems = toolbarItems
      }

      instance.value = await getNutrientViewer().load(config)
    } catch (err) {
      error.value = err instanceof Error ? err : new Error(String(err))
      throw error.value
    } finally {
      isLoading.value = false
    }
  }

  async function unload(): Promise<void> {
    if (containerRef.value && instance.value) {
      try {
        await getNutrientViewer().unload(containerRef.value)
      } catch {
        // Ignore unload errors
      }
      instance.value = null
      containerRef.value = null
    }
  }

  // Cleanup on component unmount
  onUnmounted(() => {
    unload()
  })

  return {
    instance,
    isLoading,
    error,
    load,
    unload,
  }
}
