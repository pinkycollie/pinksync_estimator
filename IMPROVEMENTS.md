# Improvements roadmap for pinksync_estimator

## Goal
Evolve the repository into a production-grade AI Project Hub: modular AI plugins, robust retrieval & RAG, model orchestration, governance, and production-ready ops.

## Priority phases
- Phase 0 — Groundwork
  - Add CONTRIBUTING.md, ROADMAP.md, CI skeleton, tests.
  - Define AI module interface and register mechanism.
  - Add automated linting, TypeScript strictness, and unit-test skeletons.
- Phase 1 — Retrieval & RAG
  - Vector DB + embeddings ingestion pipeline.
  - Caching & provenance for ingested documents.
- Phase 2 — Model orchestration & safety
  - ModelRouter with cost controls and routing policies.
  - PII detection, content filters, audit logs.
- Phase 3 — Ops & observability
  - GitHub Actions, Docker/K8s manifests, Prometheus metrics, Sentry.
- Phase 4 — Productization
  - Admin dashboard, plugin marketplace, CLI & SDK.

## Quick wins (first 1–2 weeks)
- Add AI module interface (TypeScript).
- Add CONTRIBUTING.md and simple onboarding README.
- Wire up a local vector store example (FAISS) and sample ingestion for a PDF.
- Add unit tests for key utils and CI.

## Integrations recommendation
- Embeddings: OpenAI / local instruction-tuned embedder
- Vector DB: Pinecone or Milvus/Weaviate (self-host option: FAISS + S3)
- Orchestration: BullMQ (Redis) or Celery-like workers
- Observability: Prometheus + Grafana, Sentry for error tracking

## Metrics
- Latency (API and model calls)
- Token usage & cost per user
- Project generation success (human-rated)
- Error/failure rates in generated projects

## Next steps
1. Choose vector DB and embedding provider.
2. Implement AIModule interface and a simple local "echo" module.
3. Add job queue and worker for long-running generation tasks.
