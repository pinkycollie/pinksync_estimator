# High-level architecture (pinksync_estimator)

Components:
- API Gateway (Express/Fastify)
  - Auth, rate-limits, request validation
- Module Manager
  - Plugin registry for AI modules (init/health/analyze/handle)
- Job Queue & Workers
  - Redis + BullMQ for background tasks (project generation, heavy analysis)
- Retrieval Layer
  - Vector DB + embedding service
  - Ingestion pipeline: parse -> chunk -> embed -> index
- Model Router
  - Routing rules to choose model per task
  - Cost estimator & quota enforcer
- Storage
  - User data, generated files, snapshots, audit logs (Postgres or Drizzle ORM)
- Observability & Security
  - Prometheus metrics, traces, Sentry, audit logs, secrets vault

Data flows:
1. User requests a project generation from chat.
2. API validates and puts a job on queue.
3. Worker ingests any attachments, indexes into vector DB.
4. Worker runs generation pipeline (templates + RAG + LLM calls) using Model Router.
5. Outputs are stored and snapshoted; audit log entry created.
6. Notification to user with project link & analysis report.

Security & privacy notes:
- PII scanner before external model calls.
- Audit logs with response hash for reproducibility.
