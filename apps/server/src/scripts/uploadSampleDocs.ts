#!/usr/bin/env tsx
/**
 * Upload sample documents to Document Engine.
 *
 * This script uploads all PDFs from apps/server/samples/ to Document Engine
 * with predictable document IDs for easy reference.
 *
 * Documents are uploaded with IDs: nutrient_poc_{filename}
 *
 * Usage:
 *   pnpm --filter server upload-samples
 *
 * Environment variables:
 *   - DE_URL: Document Engine URL (default: http://localhost:5000)
 *   - DE_API_AUTH_TOKEN: API authentication token
 */

import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { config } from 'dotenv'

// ES module __dirname equivalent
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables from monorepo root
config({ path: path.resolve(__dirname, '../../../../.env') })

const DE_URL = process.env.DE_URL || 'http://localhost:5000'
const AUTH_TOKEN = process.env.DE_API_AUTH_TOKEN

// Document ID prefix for predictable IDs
const DOCUMENT_PREFIX = 'nutrient_poc_'

// Supported file extensions
const SUPPORTED_EXTENSIONS = ['.pdf', '.docx', '.xlsx', '.pptx', '.doc', '.xls', '.ppt']

interface DocumentToUpload {
  filePath: string
  fileName: string
  documentId: string
}

/**
 * Get MIME type from file extension
 */
function getMimeType(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase()
  const mimeTypes: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.ppt': 'application/vnd.ms-powerpoint',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  }
  return mimeTypes[ext] || 'application/octet-stream'
}

/**
 * Generate predictable document ID from filename
 */
function getDocumentId(fileName: string): string {
  const baseName = path.basename(fileName, path.extname(fileName))
  // Sanitize: lowercase, replace spaces/special chars with underscores
  const sanitized = baseName.toLowerCase().replace(/[^a-z0-9]/g, '_')
  return `${DOCUMENT_PREFIX}${sanitized}`
}

/**
 * Check if a document already exists on Document Engine
 */
async function documentExists(documentId: string): Promise<boolean> {
  try {
    const response = await fetch(`${DE_URL}/api/documents/${documentId}/properties`, {
      method: 'GET',
      headers: {
        Authorization: `Token token=${AUTH_TOKEN}`,
      },
    })
    return response.ok
  } catch {
    return false
  }
}

type UploadResult = 'uploaded' | 'skipped' | 'failed'

/**
 * Upload a document to Document Engine
 */
async function uploadDocument(doc: DocumentToUpload): Promise<UploadResult> {
  try {
    // Check if document already exists
    if (await documentExists(doc.documentId)) {
      console.log(`  ⏭ ${doc.fileName} (already exists as ${doc.documentId})`)
      return 'skipped'
    }

    const fileBuffer = fs.readFileSync(doc.filePath)
    const blob = new Blob([fileBuffer], { type: getMimeType(doc.fileName) })

    const formData = new FormData()
    formData.append('file', blob, doc.fileName)
    formData.append('document_id', doc.documentId)

    const response = await fetch(`${DE_URL}/api/documents`, {
      method: 'POST',
      headers: {
        Authorization: `Token token=${AUTH_TOKEN}`,
      },
      body: formData,
    })

    if (response.ok) {
      console.log(`  ✓ ${doc.fileName} → ${doc.documentId}`)
      return 'uploaded'
    } else {
      const text = await response.text()
      console.error(`  ✗ ${doc.fileName}: ${response.status} - ${text}`)
      return 'failed'
    }
  } catch (error) {
    console.error(`  ✗ ${doc.fileName}:`, error instanceof Error ? error.message : error)
    return 'failed'
  }
}

/**
 * Discover sample documents from samples directory
 */
function discoverSampleDocuments(): DocumentToUpload[] {
  const samplesDir = path.resolve(__dirname, '../../samples')
  const documents: DocumentToUpload[] = []

  if (!fs.existsSync(samplesDir)) {
    console.warn(`Warning: No samples directory found at ${samplesDir}`)
    return documents
  }

  const files = fs.readdirSync(samplesDir)

  for (const file of files) {
    const ext = path.extname(file).toLowerCase()
    if (SUPPORTED_EXTENSIONS.includes(ext)) {
      documents.push({
        filePath: path.join(samplesDir, file),
        fileName: file,
        documentId: getDocumentId(file),
      })
    }
  }

  return documents
}

/**
 * Main function
 */
async function main() {
  console.log('\n=== Uploading Sample Documents to Document Engine ===\n')

  // Check configuration
  if (!AUTH_TOKEN) {
    console.log('⏭ Skipping - DE_API_AUTH_TOKEN not set')
    console.log('Set DE_API_AUTH_TOKEN in .env to enable document upload.\n')
    return
  }

  console.log(`Document Engine URL: ${DE_URL}\n`)

  // Discover documents
  const documents = discoverSampleDocuments()
  console.log(`Found ${documents.length} sample documents\n`)

  if (documents.length === 0) {
    console.log('No documents to upload')
    return
  }

  // Upload documents
  let uploaded = 0
  let skipped = 0
  let failed = 0

  for (const doc of documents) {
    const result = await uploadDocument(doc)
    if (result === 'uploaded') uploaded++
    else if (result === 'skipped') skipped++
    else failed++
  }

  console.log(`\nComplete: ${uploaded} uploaded, ${skipped} skipped, ${failed} failed\n`)

  if (failed > 0) {
    process.exit(1)
  }
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
