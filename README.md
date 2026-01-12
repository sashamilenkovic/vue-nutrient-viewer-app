# Nutrient Viewer POC

A proof-of-concept demonstrating Nutrient Web SDK integration with Vue.js and Document Engine for document viewing, annotation, and processing capabilities.

## Features

### Client-Side (Vue App)
- Document viewing with Nutrient Web SDK
- Streaming (automatic with Document Engine)
- Navigation, zoom, search with highlighting
- Annotations (create, delete, export with custom data)
- Instant Layers (annotation grouping for multi-user workflows)
- Document upload (local files)
- Event logging

### Server-Side (Document Engine)
- PDF linearization for fast streaming
- Office document conversion (docx, xlsx, pptx to PDF)
- JWT-based authentication
- PostgreSQL storage

## Quick Start

### Prerequisites
- Node.js 20+
- pnpm
- Docker & Docker Compose

### 1. Clone and Install

```bash
git clone <repository-url>
cd nutrient-viewer-poc
pnpm install
```

### 2. Generate JWT Keys

Document Engine uses JWT for client authentication. Generate an RSA key pair:

```bash
# Generate private key
openssl genrsa -out private.pem 2048

# Generate public key from private key
openssl rsa -in private.pem -pubout -out public.pem
```

### 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and add your JWT keys:

```bash
# For DE_JWT_PRIVATE_KEY, use the contents of private.pem
# Replace newlines with \n or use multiline syntax

# For DE_JWT_PUBLIC_KEY, use the contents of public.pem
```

**Tip:** To format the key for .env:
```bash
# Linux/Mac
awk 'NF {sub(/\r/, ""); printf "%s\\n",$0;}' private.pem
```

### 4. Start Document Engine

```bash
docker-compose up -d
```

Wait for the services to be healthy:
```bash
docker-compose ps
```

### 5. Start Development Servers

```bash
pnpm dev
```

This starts:
- Vue app: http://localhost:5173
- API server: http://localhost:3001

### 6. Access Document Engine Dashboard

- URL: http://localhost:5000/dashboard
- Username: `dashboard`
- Password: `secret`

## Project Structure

```
nutrient-viewer-poc/
├── apps/
│   ├── web/                    # Vue 3 frontend
│   │   ├── src/
│   │   │   ├── composables/    # Vue composables for SDK
│   │   │   ├── components/     # UI components
│   │   │   └── App.vue
│   │   └── public/samples/     # Sample PDFs
│   │
│   └── server/                 # h3 API server
│       └── src/
│           ├── routes/         # API endpoints
│           └── utils/          # JWT utilities
│
├── docker-compose.yml          # Document Engine setup
├── .env.example                # Environment template
└── pnpm-workspace.yaml         # Monorepo config
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/jwt` | Generate JWT for document access (supports `layer` param) |
| GET | `/api/documents` | List all documents |
| POST | `/api/documents` | Upload PDF (auto-linearized) |
| POST | `/api/convert` | Upload & convert Office file to PDF |
| GET | `/api/documents/:id/layers` | List Instant Layers for a document |
| DELETE | `/api/documents/:id` | Delete a document |

## Key Concepts

### Streaming & Linearization

When a PDF is uploaded to Document Engine, it's automatically linearized. This enables:
- **Progressive loading**: First page renders before full download
- **Byte-range requests**: Client requests only needed data
- **Optimized for large documents**: Essential for 100+ MB files

### Document Conversion

Document Engine converts Office formats to PDF server-side:
- Word (.docx, .doc)
- Excel (.xlsx, .xls)
- PowerPoint (.pptx, .ppt)

The conversion preserves fonts, layouts, and formatting.

### Instant Layers

Instant Layers are annotation containers managed by Document Engine. Each layer has its own set of annotations, enabling multi-user workflows:

- Multiple reviewers can annotate independently
- Switch between layers to see different annotation sets
- Layers are created lazily when first annotation is made

```typescript
// Generate JWT for a specific layer
const token = jwt.sign({
  document_id: documentId,
  layer: 'reviewer-a',  // Optional: omit for default layer
  permissions: ['read-document', 'write', 'download'],
}, privateKey)
```

### JWT Authentication

```typescript
// Server generates JWT
const token = jwt.sign(
  {
    document_id: documentId,
    permissions: ['read-document', 'write', 'download'],
  },
  privateKey,
  { algorithm: 'RS256', expiresIn: '1h' }
)

// Client uses JWT to load document
NutrientViewer.load({
  documentId: documentId,
  authPayload: { jwt: token },
  instant: true,
})
```

## Vue Composables

The SDK is wrapped in Vue composables for clean integration:

- `useNutrientViewer` - Core viewer lifecycle (supports layer param)
- `useViewerActions` - Navigation, zoom, search
- `useAnnotations` - Annotation CRUD with custom data
- `useInstantLayers` - Instant Layers for annotation grouping
- `useViewerEvents` - Event subscriptions

## Development

### Run Only Web App (Standalone Mode)
```bash
pnpm dev:web
```

### Run Only API Server
```bash
pnpm dev:server
```

### Type Check
```bash
pnpm type-check
```

## Troubleshooting

### Document Engine Not Starting
```bash
# Check logs
docker-compose logs document-engine

# Ensure PostgreSQL is healthy first
docker-compose logs db
```

### JWT Errors
- Ensure private key is correctly formatted in `.env`
- Check that public key in docker-compose matches the private key

### CORS Issues
- The Vite dev server proxies `/api` to the h3 server
- Ensure both servers are running

## Resources

- [Nutrient Web SDK Documentation](https://www.nutrient.io/sdk/web/)
- [Document Engine Documentation](https://www.nutrient.io/sdk/document-engine/)
- [Vue.js Documentation](https://vuejs.org/)
