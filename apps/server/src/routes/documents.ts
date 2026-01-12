import { createRouter, eventHandler, readMultipartFormData, createError } from 'h3'

const DE_URL = () => process.env.DE_URL || 'http://localhost:5000'
const DE_AUTH_TOKEN = () => process.env.DE_API_AUTH_TOKEN || 'secret'

export const documentRoutes = createRouter()

/**
 * GET /api/documents
 * List all documents in Document Engine
 */
documentRoutes.get(
  '/api/documents',
  eventHandler(async () => {
    try {
      const response = await fetch(`${DE_URL()}/api/documents`, {
        headers: {
          Authorization: `Token token=${DE_AUTH_TOKEN()}`,
        },
      })

      if (!response.ok) {
        throw createError({
          statusCode: response.status,
          message: `Document Engine error: ${response.statusText}`,
        })
      }

      const data = await response.json()
      return data
    } catch (error) {
      if (error instanceof Error && error.message.includes('fetch')) {
        throw createError({
          statusCode: 503,
          message: 'Document Engine not available. Is Docker running?',
        })
      }
      throw error
    }
  })
)

/**
 * POST /api/documents
 * Upload a PDF document to Document Engine
 * Document Engine will automatically linearize the PDF for streaming
 *
 * Body: multipart form with 'file' field
 * Returns: { documentId: string }
 */
documentRoutes.post(
  '/api/documents',
  eventHandler(async (event) => {
    const formData = await readMultipartFormData(event)

    if (!formData || formData.length === 0) {
      throw createError({
        statusCode: 400,
        message: 'No file uploaded',
      })
    }

    const fileField = formData.find((f) => f.name === 'file')

    if (!fileField || !fileField.data) {
      throw createError({
        statusCode: 400,
        message: 'File field is required',
      })
    }

    const contentType = fileField.type || 'application/pdf'
    const filename = fileField.filename || 'document.pdf'

    try {
      // Convert Buffer to Uint8Array for fetch compatibility
      const bodyData = new Uint8Array(fileField.data)

      const response = await fetch(`${DE_URL()}/api/documents`, {
        method: 'POST',
        headers: {
          Authorization: `Token token=${DE_AUTH_TOKEN()}`,
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
        body: bodyData,
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw createError({
          statusCode: response.status,
          message: `Document Engine error: ${errorText}`,
        })
      }

      const data = await response.json()
      return {
        documentId: data.document_id || data.documentId,
        message: 'Document uploaded and linearized successfully',
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('fetch')) {
        throw createError({
          statusCode: 503,
          message: 'Document Engine not available. Is Docker running?',
        })
      }
      throw error
    }
  })
)

/**
 * POST /api/convert
 * Upload an Office document (docx, xlsx, pptx) and convert to PDF
 * Document Engine handles the conversion automatically
 *
 * Body: multipart form with 'file' field
 * Returns: { documentId: string }
 */
documentRoutes.post(
  '/api/convert',
  eventHandler(async (event) => {
    const formData = await readMultipartFormData(event)

    if (!formData || formData.length === 0) {
      throw createError({
        statusCode: 400,
        message: 'No file uploaded',
      })
    }

    const fileField = formData.find((f) => f.name === 'file')

    if (!fileField || !fileField.data) {
      throw createError({
        statusCode: 400,
        message: 'File field is required',
      })
    }

    const filename = fileField.filename || 'document'
    const ext = filename.split('.').pop()?.toLowerCase()

    // Map extensions to content types
    const contentTypeMap: Record<string, string> = {
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      doc: 'application/msword',
      xls: 'application/vnd.ms-excel',
      ppt: 'application/vnd.ms-powerpoint',
      pdf: 'application/pdf',
    }

    const contentType = fileField.type || contentTypeMap[ext || ''] || 'application/octet-stream'

    try {
      // Convert Buffer to Uint8Array for fetch compatibility
      const bodyData = new Uint8Array(fileField.data)

      // Document Engine automatically converts Office documents to PDF
      const response = await fetch(`${DE_URL()}/api/documents`, {
        method: 'POST',
        headers: {
          Authorization: `Token token=${DE_AUTH_TOKEN()}`,
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
        body: bodyData,
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw createError({
          statusCode: response.status,
          message: `Document Engine conversion error: ${errorText}`,
        })
      }

      const data = await response.json()
      console.log('Document Engine response:', JSON.stringify(data, null, 2))
      return {
        documentId: data.data?.document_id || data.document_id || data.documentId,
        originalFilename: filename,
        message: `Document converted from ${ext?.toUpperCase() || 'unknown'} to PDF successfully`,
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('fetch')) {
        throw createError({
          statusCode: 503,
          message: 'Document Engine not available. Is Docker running?',
        })
      }
      throw error
    }
  })
)

/**
 * GET /api/documents/:id/layers
 * List all Instant Layers for a document
 * Instant Layers are annotation containers - each layer has its own set of annotations
 *
 * Returns: { layers: string[] }
 */
documentRoutes.get(
  '/api/documents/:id/layers',
  eventHandler(async (event) => {
    const documentId = event.context.params?.id

    if (!documentId) {
      throw createError({
        statusCode: 400,
        message: 'Document ID is required',
      })
    }

    try {
      const response = await fetch(`${DE_URL()}/api/documents/${documentId}/layers/`, {
        headers: {
          Authorization: `Token token=${DE_AUTH_TOKEN()}`,
        },
      })

      if (!response.ok) {
        throw createError({
          statusCode: response.status,
          message: `Document Engine error: ${response.statusText}`,
        })
      }

      const data = await response.json()
      // Document Engine returns { data: ["layer1", "layer2", ...] }
      // Layers are created lazily, so a new document may have no layers
      // The default layer is an empty string ""
      const layers = data.data || []

      // Always include the default layer if not present
      if (!layers.includes('')) {
        layers.unshift('')
      }

      return { layers }
    } catch (error) {
      if (error instanceof Error && error.message.includes('fetch')) {
        throw createError({
          statusCode: 503,
          message: 'Document Engine not available. Is Docker running?',
        })
      }
      throw error
    }
  })
)

/**
 * DELETE /api/documents/:id
 * Delete a document from Document Engine
 */
documentRoutes.delete(
  '/api/documents/:id',
  eventHandler(async (event) => {
    const documentId = event.context.params?.id

    if (!documentId) {
      throw createError({
        statusCode: 400,
        message: 'Document ID is required',
      })
    }

    try {
      const response = await fetch(`${DE_URL()}/api/documents/${documentId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Token token=${DE_AUTH_TOKEN()}`,
        },
      })

      if (!response.ok) {
        throw createError({
          statusCode: response.status,
          message: `Document Engine error: ${response.statusText}`,
        })
      }

      return { message: 'Document deleted successfully' }
    } catch (error) {
      if (error instanceof Error && error.message.includes('fetch')) {
        throw createError({
          statusCode: 503,
          message: 'Document Engine not available. Is Docker running?',
        })
      }
      throw error
    }
  })
)
