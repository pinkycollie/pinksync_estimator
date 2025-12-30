# PinkSync Estimator - Database Schema Specification

## User Management

### Users Table
Stores user information and preferences.
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) NOT NULL UNIQUE,
  email VARCHAR(255) UNIQUE,
  profile_image_url TEXT,
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### User Preferences Table
Stores user-specific preferences and settings.
```sql
CREATE TABLE user_preferences (
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  preference_key VARCHAR(255) NOT NULL,
  preference_value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (user_id, preference_key)
);
```

## Platform Synchronization

### Platform Connections Table
Stores information about connected platforms.
```sql
CREATE TABLE platform_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  platform VARCHAR(50) NOT NULL CHECK (platform IN ('UBUNTU', 'WINDOWS', 'IOS', 'DROPBOX', 'WEB')),
  root_path TEXT NOT NULL,
  credentials JSONB NOT NULL,
  is_enabled BOOLEAN DEFAULT TRUE,
  sync_on_startup BOOLEAN DEFAULT FALSE,
  sync_on_schedule BOOLEAN DEFAULT FALSE,
  sync_direction VARCHAR(20) CHECK (sync_direction IN ('UPLOAD', 'DOWNLOAD', 'BIDIRECTIONAL')),
  sync_interval INTEGER,
  metadata JSONB,
  last_sync_date TIMESTAMP WITH TIME ZONE,
  status VARCHAR(50) DEFAULT 'DISCONNECTED',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Sync Operations Table
Tracks platform synchronization operations.
```sql
CREATE TABLE sync_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID REFERENCES platform_connections(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'CONFLICT')),
  start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  end_time TIMESTAMP WITH TIME ZONE,
  items_processed INTEGER DEFAULT 0,
  items_total INTEGER,
  bytes_transferred BIGINT DEFAULT 0,
  errors JSONB,
  conflict_items JSONB
);
```

### Sync Items Table
Tracks individual files and directories being synchronized.
```sql
CREATE TABLE sync_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID REFERENCES platform_connections(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  is_directory BOOLEAN NOT NULL,
  size BIGINT,
  mime_type VARCHAR(255),
  hash VARCHAR(255),
  local_modified TIMESTAMP WITH TIME ZONE,
  remote_modified TIMESTAMP WITH TIME ZONE,
  sync_status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (sync_status IN ('PENDING', 'SYNCING', 'SYNCED', 'FAILED', 'CONFLICT')),
  last_synced TIMESTAMP WITH TIME ZONE,
  has_conflict BOOLEAN DEFAULT FALSE,
  conflict_resolution VARCHAR(20) CHECK (conflict_resolution IN ('LOCAL', 'REMOTE', 'BOTH', 'SKIP')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (connection_id, path)
);
```

## Document Management

### Documents Table
Stores document metadata across all platforms.
```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  category VARCHAR(50) CHECK (category IN ('PERSONAL', 'LEGAL', 'TAX', 'INSURANCE', 'BUSINESS', 'OTHER')),
  path TEXT NOT NULL,
  platform VARCHAR(50) NOT NULL,
  connection_id UUID REFERENCES platform_connections(id) ON DELETE CASCADE,
  size BIGINT,
  mime_type VARCHAR(255),
  version INTEGER DEFAULT 1,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Document Versions Table
Tracks version history of documents.
```sql
CREATE TABLE document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  path TEXT NOT NULL,
  size BIGINT,
  hash VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by INTEGER REFERENCES users(id),
  comment TEXT,
  UNIQUE (document_id, version_number)
);
```

### Document Tags Table
Tracks tags associated with documents.
```sql
CREATE TABLE document_tags (
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  tag VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (document_id, tag)
);
```

## Workflow Management

### Workflows Table
Stores workflow definitions.
```sql
CREATE TABLE workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  steps JSONB NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  triggers JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Workflow Executions Table
Tracks workflow executions.
```sql
CREATE TABLE workflow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED')),
  start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  end_time TIMESTAMP WITH TIME ZONE,
  documents JSONB,
  results JSONB,
  errors JSONB
);
```

## Communication Management

### Communications Table
Stores communication entries from various sources.
```sql
CREATE TABLE communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  source VARCHAR(50) NOT NULL,
  source_id VARCHAR(255),
  communication_date TIMESTAMP WITH TIME ZONE NOT NULL,
  sender VARCHAR(255),
  recipients JSONB,
  subject TEXT,
  content TEXT,
  content_vector vector(1536),
  attachments JSONB,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Communication Tags Table
Tracks tags associated with communications.
```sql
CREATE TABLE communication_tags (
  communication_id UUID REFERENCES communications(id) ON DELETE CASCADE,
  tag VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (communication_id, tag)
);
```

## Real Estate Management

### Properties Table
Tracks real estate properties.
```sql
CREATE TABLE properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  address JSONB NOT NULL,
  property_type VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL,
  listing_price DECIMAL(15, 2),
  size_sqft DECIMAL(10, 2),
  bedrooms INTEGER,
  bathrooms DECIMAL(3, 1),
  year_built INTEGER,
  features JSONB,
  documents JSONB,
  contacts JSONB,
  timeline JSONB,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Property Transactions Table
Tracks real estate transactions.
```sql
CREATE TABLE property_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  transaction_type VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL,
  amount DECIMAL(15, 2),
  transaction_date TIMESTAMP WITH TIME ZONE,
  parties JSONB,
  documents JSONB,
  timeline JSONB,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## System Tables

### API Keys Table
Stores API keys for external services.
```sql
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  service VARCHAR(100) NOT NULL,
  key_name VARCHAR(255) NOT NULL,
  key_value TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  last_used TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user_id, service, key_name)
);
```

### System Settings Table
Stores global system settings.
```sql
CREATE TABLE system_settings (
  setting_key VARCHAR(255) PRIMARY KEY,
  setting_value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Audit Logs Table
Tracks system activity for auditing.
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(255) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id TEXT,
  details JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```
