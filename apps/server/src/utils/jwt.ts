import jwt from 'jsonwebtoken'
import crypto from 'crypto'

/**
 * Generate a JWT for Document Engine access
 */
export function generateDocumentEngineJWT(documentId: string): string {
  const privateKey = process.env.DE_JWT_PRIVATE_KEY

  if (!privateKey) {
    throw new Error('DE_JWT_PRIVATE_KEY environment variable is not set')
  }

  return jwt.sign(
    {
      document_id: documentId,
      permissions: ['read-document', 'write', 'download'],
    },
    privateKey,
    {
      algorithm: 'RS256',
      expiresIn: '1h',
      jwtid: crypto.randomUUID(),
    }
  )
}

/**
 * Generate JWT with custom permissions
 */
export function generateJWTWithPermissions(
  documentId: string,
  permissions: string[] = ['read-document', 'write', 'download']
): string {
  const privateKey = process.env.DE_JWT_PRIVATE_KEY

  if (!privateKey) {
    throw new Error('DE_JWT_PRIVATE_KEY environment variable is not set')
  }

  return jwt.sign(
    {
      document_id: documentId,
      permissions,
    },
    privateKey,
    {
      algorithm: 'RS256',
      expiresIn: '1h',
      jwtid: crypto.randomUUID(),
    }
  )
}
