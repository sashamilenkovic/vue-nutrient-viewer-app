import { createRouter, eventHandler, readBody, createError } from 'h3'
import { generateDocumentEngineJWT, generateJWTWithPermissions, generateJWTForLayer } from '../utils/jwt'

export const jwtRoutes = createRouter()

/**
 * POST /api/jwt
 * Generate a JWT for accessing a document in Document Engine
 *
 * Body: { documentId: string, permissions?: string[], layer?: string }
 * Returns: { jwt: string }
 *
 * If layer is provided, the JWT will be scoped to that Instant Layer.
 * Instant Layers are annotation containers - each layer has its own set of annotations.
 */
jwtRoutes.post(
  '/api/jwt',
  eventHandler(async (event) => {
    try {
      const body = await readBody(event)

      if (!body?.documentId || typeof body.documentId !== 'string') {
        throw createError({
          statusCode: 400,
          message: 'documentId is required and must be a string',
        })
      }

      let token: string

      // If layer is specified, generate a layer-scoped JWT
      if (typeof body.layer === 'string') {
        token = generateJWTForLayer(body.documentId, body.layer, body.permissions)
      } else if (body.permissions) {
        token = generateJWTWithPermissions(body.documentId, body.permissions)
      } else {
        token = generateDocumentEngineJWT(body.documentId)
      }

      return { jwt: token }
    } catch (error) {
      if (error instanceof Error && error.message.includes('DE_JWT_PRIVATE_KEY')) {
        throw createError({
          statusCode: 500,
          message: 'Server not configured: JWT private key missing. See README for setup.',
        })
      }
      throw error
    }
  })
)
