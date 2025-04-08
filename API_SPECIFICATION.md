# Pinky's AI OS - API Specification

## Authentication Endpoints

### GET /api/auth/user
Returns the currently authenticated user or null if not authenticated.

**Response:**
```json
{
  "sub": "927070657",
  "email": "user@example.com",
  "username": "username",
  "first_name": "First",
  "last_name": "Last",
  "profile_image_url": "https://example.com/profile.png"
}
```

### GET /api/login
Redirects to Replit login for authentication.

### GET /api/logout
Logs out the current user and redirects to the home page.

## Platform Connection Endpoints

### GET /api/sync/connections
Returns all platform connections for the current user.

**Response:**
```json
[
  {
    "id": "conn_123",
    "name": "My Ubuntu Server",
    "platform": "UBUNTU",
    "rootPath": "/home/user/documents",
    "credentials": {
      "host": "example.com",
      "username": "user",
      "authType": "key"
    },
    "isEnabled": true,
    "syncOnStartup": true,
    "syncOnSchedule": true,
    "syncDirection": "BIDIRECTIONAL",
    "syncInterval": 3600,
    "lastSyncDate": "2025-04-08T12:00:00Z",
    "status": "CONNECTED",
    "createdAt": "2025-03-01T00:00:00Z",
    "updatedAt": "2025-04-08T12:00:00Z"
  }
]
```

### GET /api/sync/connections/:id
Returns a specific platform connection.

**Response:**
Same as single connection object from above.

### POST /api/sync/connections
Creates a new platform connection.

**Request:**
```json
{
  "name": "My Windows PC",
  "platform": "WINDOWS",
  "rootPath": "C:\\Documents",
  "credentials": {
    "host": "192.168.1.2",
    "username": "user",
    "authType": "password",
    "password": "password123"
  },
  "isEnabled": true,
  "syncOnStartup": true,
  "syncOnSchedule": false,
  "syncDirection": "UPLOAD",
  "metadata": {
    "description": "My main work computer"
  }
}
```

**Response:**
Created connection object.

### PUT /api/sync/connections/:id
Updates an existing platform connection.

**Request:**
```json
{
  "name": "Updated Name",
  "isEnabled": false
}
```

**Response:**
Updated connection object.

### DELETE /api/sync/connections/:id
Deletes a platform connection.

**Response:**
```json
{
  "success": true
}
```

## Sync Operations Endpoints

### GET /api/sync/operations/:connectionId
Returns sync operations for a specific connection.

**Response:**
```json
[
  {
    "id": "op_123",
    "connectionId": "conn_123",
    "status": "COMPLETED",
    "startTime": "2025-04-08T12:00:00Z",
    "endTime": "2025-04-08T12:05:00Z",
    "itemsProcessed": 150,
    "itemsTotal": 150,
    "bytesTransferred": 1024000,
    "errors": null,
    "conflictItems": null
  }
]
```

### POST /api/sync/operations/:connectionId
Starts a new sync operation.

**Request:**
```json
{
  "direction": "BIDIRECTIONAL",
  "paths": ["/documents", "/images"]
}
```

**Response:**
Created operation object.

### GET /api/sync/operations/:id/status
Gets the status of a specific sync operation.

**Response:**
```json
{
  "id": "op_123",
  "status": "IN_PROGRESS",
  "itemsProcessed": 75,
  "itemsTotal": 150,
  "bytesTransferred": 512000,
  "currentFile": "/documents/important.pdf",
  "startTime": "2025-04-08T12:00:00Z",
  "endTime": null,
  "errors": []
}
```

## Sync Items Endpoints

### GET /api/sync/items/:connectionId
Returns sync items for a specific connection.

**Response:**
```json
[
  {
    "id": "item_123",
    "connectionId": "conn_123",
    "path": "/documents/important.pdf",
    "isDirectory": false,
    "size": 1024000,
    "mimeType": "application/pdf",
    "hash": "a1b2c3d4",
    "localModified": "2025-04-08T10:00:00Z",
    "remoteModified": "2025-04-08T09:00:00Z",
    "syncStatus": "SYNCED",
    "lastSynced": "2025-04-08T12:00:00Z",
    "hasConflict": false,
    "conflictResolution": null,
    "createdAt": "2025-03-01T00:00:00Z",
    "updatedAt": "2025-04-08T12:00:00Z"
  }
]
```

### POST /api/sync/items/:connectionId/resolve-conflict
Resolves a sync conflict.

**Request:**
```json
{
  "itemIds": ["item_123", "item_124"],
  "resolution": "REMOTE"
}
```

**Response:**
```json
{
  "success": true,
  "resolvedItems": 2
}
```

## Document Management Endpoints

### GET /api/documents
Returns all documents across all platforms.

**Response:**
```json
[
  {
    "id": "doc_123",
    "title": "Important Contract",
    "category": "LEGAL",
    "tags": ["contract", "client"],
    "path": "/documents/legal/contract.pdf",
    "platform": "UBUNTU",
    "connectionId": "conn_123",
    "size": 1024000,
    "mimeType": "application/pdf",
    "version": 2,
    "createdAt": "2025-03-01T00:00:00Z",
    "updatedAt": "2025-04-08T12:00:00Z"
  }
]
```

### POST /api/documents/search
Searches for documents with advanced filters.

**Request:**
```json
{
  "query": "contract",
  "categories": ["LEGAL", "BUSINESS"],
  "tags": ["client"],
  "dateRange": {
    "start": "2025-01-01T00:00:00Z",
    "end": "2025-04-08T23:59:59Z"
  },
  "platforms": ["UBUNTU", "DROPBOX"],
  "limit": 10,
  "offset": 0
}
```

**Response:**
```json
{
  "total": 5,
  "results": [
    {
      "id": "doc_123",
      "title": "Important Contract",
      "category": "LEGAL",
      "tags": ["contract", "client"],
      "path": "/documents/legal/contract.pdf",
      "platform": "UBUNTU",
      "connectionId": "conn_123",
      "size": 1024000,
      "mimeType": "application/pdf",
      "version": 2,
      "createdAt": "2025-03-01T00:00:00Z",
      "updatedAt": "2025-04-08T12:00:00Z",
      "relevance": 0.92
    }
  ]
}
```

## Workflow Endpoints

### GET /api/workflows
Returns all workflows.

**Response:**
```json
[
  {
    "id": "wf_123",
    "name": "Contract Processing",
    "description": "Process new client contracts",
    "steps": [
      {
        "id": "step_1",
        "type": "CATEGORIZE",
        "config": {
          "category": "LEGAL"
        }
      },
      {
        "id": "step_2",
        "type": "TAG",
        "config": {
          "tags": ["contract", "client"]
        }
      }
    ],
    "isActive": true,
    "triggers": {
      "filePatterns": ["**/*.pdf", "**/*.docx"],
      "platforms": ["UBUNTU", "DROPBOX"]
    },
    "createdAt": "2025-03-01T00:00:00Z",
    "updatedAt": "2025-04-08T12:00:00Z"
  }
]
```

### POST /api/workflows/:id/run
Manually runs a workflow on specific documents.

**Request:**
```json
{
  "documentIds": ["doc_123", "doc_124"]
}
```

**Response:**
```json
{
  "jobId": "job_123",
  "status": "QUEUED",
  "documentCount": 2
}
```

## System Endpoints

### GET /api/system/status
Returns system status information.

**Response:**
```json
{
  "status": "healthy",
  "components": {
    "database": "connected",
    "fileStorage": "connected",
    "aiServices": "connected"
  },
  "platformConnections": {
    "total": 5,
    "connected": 4,
    "disconnected": 1
  },
  "syncStatus": {
    "lastSync": "2025-04-08T12:00:00Z",
    "itemsPending": 0,
    "itemsTotal": 1500
  },
  "version": "1.2.3"
}
```

### GET /api/system/ngrok-status
Returns ngrok tunnel status.

**Response:**
```json
{
  "active": true,
  "url": "https://example.ngrok.io",
  "webInterface": "http://localhost:4040",
  "message": "Tunnel active"
}
```
