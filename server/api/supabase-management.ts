/**
 * /api/supabase/* — Management API proxy routes
 * All routes require sessionAuthMiddleware on the parent router.
 *
 * Mount with:
 *   app.use("/api/supabase", sessionAuthMiddleware, supabaseManagementRouter);
 */

import { Router, Request, Response } from "express";
import {
  SupabaseManagementClient,
  SupabaseManagementError,
  type CreateProjectBody,
  type UpdateProjectBody,
  type UpdateNetworkRestrictionsBody,
  type CreateBranchBody,
  type PostgRESTConfig,
  type PostgresConfig,
  type ProjectSecret,
  type CreateApiKeyBody,
  type PgsodiumConfig,
} from "./supabase-management";

const router = Router();

// ─── Client factory (PAT per request or org-level env) ───────────────────────

function getClient(req: Request): SupabaseManagementClient {
  // Allow per-request token override via header (for multi-tenant), else env
  const token =
    (req.headers["x-supabase-token"] as string | undefined) ??
    process.env.SUPABASE_ACCESS_TOKEN;

  if (!token) throw new Error("No Supabase access token available");
  return new SupabaseManagementClient({ accessToken: token });
}

// ─── Error handler ────────────────────────────────────────────────────────────

function handleError(err: unknown, res: Response): void {
  if (err instanceof SupabaseManagementError) {
    res.status(err.status).json({ error: err.message, body: err.body });
    return;
  }
  console.error("[supabase-management]", err);
  res.status(500).json({ error: "Internal error" });
}

// ═════════════════════════════════════════════════════════════════════════════
// ORGANIZATIONS
// ═════════════════════════════════════════════════════════════════════════════

router.get("/organizations", async (req, res) => {
  try {
    res.json(await getClient(req).listOrganizations());
  } catch (e) { handleError(e, res); }
});

router.get("/organizations/:slug", async (req, res) => {
  try {
    res.json(await getClient(req).getOrganization(req.params.slug));
  } catch (e) { handleError(e, res); }
});

router.post("/organizations", async (req, res) => {
  try {
    res.status(201).json(await getClient(req).createOrganization(req.body));
  } catch (e) { handleError(e, res); }
});

router.get("/organizations/:slug/members", async (req, res) => {
  try {
    res.json(await getClient(req).listOrganizationMembers(req.params.slug));
  } catch (e) { handleError(e, res); }
});

// ═════════════════════════════════════════════════════════════════════════════
// PROJECTS (CRUD + metadata + health)
// ═════════════════════════════════════════════════════════════════════════════

router.get("/projects", async (req, res) => {
  try {
    res.json(await getClient(req).listProjects());
  } catch (e) { handleError(e, res); }
});

router.get("/projects/:ref", async (req, res) => {
  try {
    res.json(await getClient(req).getProject(req.params.ref));
  } catch (e) { handleError(e, res); }
});

router.post("/projects", async (req, res) => {
  try {
    const project = await getClient(req).createProject(req.body as CreateProjectBody);
    res.status(201).json(project);
  } catch (e) { handleError(e, res); }
});

router.patch("/projects/:ref", async (req, res) => {
  try {
    res.json(await getClient(req).updateProject(req.params.ref, req.body as UpdateProjectBody));
  } catch (e) { handleError(e, res); }
});

router.delete("/projects/:ref", async (req, res) => {
  try {
    await getClient(req).deleteProject(req.params.ref);
    res.status(204).send();
  } catch (e) { handleError(e, res); }
});

router.post("/projects/:ref/pause", async (req, res) => {
  try {
    res.json(await getClient(req).pauseProject(req.params.ref));
  } catch (e) { handleError(e, res); }
});

router.post("/projects/:ref/restore", async (req, res) => {
  try {
    res.json(await getClient(req).restoreProject(req.params.ref));
  } catch (e) { handleError(e, res); }
});

router.get("/projects/:ref/health", async (req, res) => {
  try {
    res.json(await getClient(req).getServicesHealth(req.params.ref));
  } catch (e) { handleError(e, res); }
});

// ── Postgres Upgrade ──────────────────────────────────────────────────────────

router.get("/projects/:ref/upgrade/eligibility", async (req, res) => {
  try {
    res.json(await getClient(req).getUpgradeEligibility(req.params.ref));
  } catch (e) { handleError(e, res); }
});

router.get("/projects/:ref/upgrade/status", async (req, res) => {
  try {
    res.json(await getClient(req).getUpgradeStatus(req.params.ref));
  } catch (e) { handleError(e, res); }
});

router.post("/projects/:ref/upgrade", async (req, res) => {
  try {
    res.json(await getClient(req).upgradePostgres(req.params.ref, req.body));
  } catch (e) { handleError(e, res); }
});

// ═════════════════════════════════════════════════════════════════════════════
// NETWORK RESTRICTIONS & BANS
// ═════════════════════════════════════════════════════════════════════════════

router.get("/projects/:ref/network-restrictions", async (req, res) => {
  try {
    res.json(await getClient(req).getNetworkRestrictions(req.params.ref));
  } catch (e) { handleError(e, res); }
});

router.put("/projects/:ref/network-restrictions", async (req, res) => {
  try {
    res.json(
      await getClient(req).updateNetworkRestrictions(
        req.params.ref,
        req.body as UpdateNetworkRestrictionsBody
      )
    );
  } catch (e) { handleError(e, res); }
});

router.patch("/projects/:ref/network-restrictions", async (req, res) => {
  try {
    res.json(await getClient(req).patchNetworkRestrictions(req.params.ref, req.body));
  } catch (e) { handleError(e, res); }
});

router.get("/projects/:ref/network-bans", async (req, res) => {
  try {
    const enriched = req.query.enriched === "true";
    const client = getClient(req);
    res.json(
      enriched
        ? await client.listNetworkBansEnriched(req.params.ref)
        : await client.listNetworkBans(req.params.ref)
    );
  } catch (e) { handleError(e, res); }
});

router.delete("/projects/:ref/network-bans", async (req, res) => {
  try {
    const { ipAddresses } = req.body as { ipAddresses: string[] };
    await getClient(req).deleteNetworkBans(req.params.ref, ipAddresses);
    res.status(204).send();
  } catch (e) { handleError(e, res); }
});

// ═════════════════════════════════════════════════════════════════════════════
// POSTGRES CONFIG + SSL
// ═════════════════════════════════════════════════════════════════════════════

router.get("/projects/:ref/config/postgres", async (req, res) => {
  try {
    res.json(await getClient(req).getPostgresConfig(req.params.ref));
  } catch (e) { handleError(e, res); }
});

router.put("/projects/:ref/config/postgres", async (req, res) => {
  try {
    res.json(
      await getClient(req).updatePostgresConfig(req.params.ref, req.body as Partial<PostgresConfig>)
    );
  } catch (e) { handleError(e, res); }
});

router.get("/projects/:ref/ssl-enforcement", async (req, res) => {
  try {
    res.json(await getClient(req).getSslEnforcement(req.params.ref));
  } catch (e) { handleError(e, res); }
});

router.put("/projects/:ref/ssl-enforcement", async (req, res) => {
  try {
    res.json(await getClient(req).updateSslEnforcement(req.params.ref, req.body));
  } catch (e) { handleError(e, res); }
});

// ─── Convenience: enforce SSL in one call ────────────────────────────────────
router.post("/projects/:ref/ssl-enforcement/enforce", async (req, res) => {
  try {
    res.json(await getClient(req).enforceSSL(req.params.ref));
  } catch (e) { handleError(e, res); }
});

// ═════════════════════════════════════════════════════════════════════════════
// SQL SNIPPETS & QUERIES
// ═════════════════════════════════════════════════════════════════════════════

router.get("/projects/:ref/snippets", async (req, res) => {
  try {
    res.json(await getClient(req).listSnippets(req.params.ref));
  } catch (e) { handleError(e, res); }
});

router.get("/projects/:ref/snippets/:id", async (req, res) => {
  try {
    res.json(await getClient(req).getSnippet(req.params.ref, req.params.id));
  } catch (e) { handleError(e, res); }
});

router.post("/projects/:ref/query", async (req, res) => {
  try {
    const { query, readonly } = req.body as { query: string; readonly?: boolean };
    const client = getClient(req);
    res.json(
      readonly
        ? await client.readOnlyQuery(req.params.ref, query)
        : await client.runQuery(req.params.ref, query)
    );
  } catch (e) { handleError(e, res); }
});

// ═════════════════════════════════════════════════════════════════════════════
// TYPESCRIPT TYPES
// ═════════════════════════════════════════════════════════════════════════════

router.get("/projects/:ref/types/typescript", async (req, res) => {
  try {
    res.json(
      await getClient(req).generateTypescriptTypes(req.params.ref, {
        included_schemas: req.query.included_schemas as string | undefined,
        exclude_schemas: req.query.exclude_schemas as string | undefined,
      })
    );
  } catch (e) { handleError(e, res); }
});

// ═════════════════════════════════════════════════════════════════════════════
// ENVIRONMENTS / BRANCHES
// ═════════════════════════════════════════════════════════════════════════════

router.get("/projects/:ref/branches", async (req, res) => {
  try {
    res.json(await getClient(req).listBranches(req.params.ref));
  } catch (e) { handleError(e, res); }
});

router.post("/projects/:ref/branches", async (req, res) => {
  try {
    res.status(201).json(
      await getClient(req).createBranch(req.params.ref, req.body as CreateBranchBody)
    );
  } catch (e) { handleError(e, res); }
});

router.get("/branches/:branchId", async (req, res) => {
  try {
    res.json(await getClient(req).getBranch(req.params.branchId));
  } catch (e) { handleError(e, res); }
});

router.delete("/branches/:branchId", async (req, res) => {
  try {
    await getClient(req).deleteBranch(req.params.branchId);
    res.status(204).send();
  } catch (e) { handleError(e, res); }
});

router.get("/branches/:branchId/config", async (req, res) => {
  try {
    res.json(await getClient(req).getBranchConfig(req.params.branchId));
  } catch (e) { handleError(e, res); }
});

router.patch("/branches/:branchId/config", async (req, res) => {
  try {
    res.json(await getClient(req).updateBranchConfig(req.params.branchId, req.body));
  } catch (e) { handleError(e, res); }
});

router.post("/branches/:branchId/merge", async (req, res) => {
  try {
    res.json(await getClient(req).mergeBranch(req.params.branchId));
  } catch (e) { handleError(e, res); }
});

router.post("/branches/:branchId/reset", async (req, res) => {
  try {
    res.json(await getClient(req).resetBranch(req.params.branchId, req.body));
  } catch (e) { handleError(e, res); }
});

router.get("/branches/:branchId/actions/runs", async (req, res) => {
  try {
    res.json(await getClient(req).listActionRuns(req.params.branchId));
  } catch (e) { handleError(e, res); }
});

// ═════════════════════════════════════════════════════════════════════════════
// POSTGREST CONFIG
// ═════════════════════════════════════════════════════════════════════════════

router.get("/projects/:ref/config/postgrest", async (req, res) => {
  try {
    res.json(await getClient(req).getPostgRESTConfig(req.params.ref));
  } catch (e) { handleError(e, res); }
});

router.patch("/projects/:ref/config/postgrest", async (req, res) => {
  try {
    res.json(
      await getClient(req).updatePostgRESTConfig(
        req.params.ref,
        req.body as Partial<PostgRESTConfig>
      )
    );
  } catch (e) { handleError(e, res); }
});

// ═════════════════════════════════════════════════════════════════════════════
// API KEYS
// ═════════════════════════════════════════════════════════════════════════════

router.get("/projects/:ref/api-keys", async (req, res) => {
  try {
    res.json(await getClient(req).listApiKeys(req.params.ref));
  } catch (e) { handleError(e, res); }
});

router.get("/projects/:ref/api-keys/:id", async (req, res) => {
  try {
    res.json(await getClient(req).getApiKey(req.params.ref, req.params.id));
  } catch (e) { handleError(e, res); }
});

router.post("/projects/:ref/api-keys", async (req, res) => {
  try {
    res.status(201).json(
      await getClient(req).createApiKey(req.params.ref, req.body as CreateApiKeyBody)
    );
  } catch (e) { handleError(e, res); }
});

router.delete("/projects/:ref/api-keys/:id", async (req, res) => {
  try {
    await getClient(req).deleteApiKey(req.params.ref, req.params.id);
    res.status(204).send();
  } catch (e) { handleError(e, res); }
});

// ═════════════════════════════════════════════════════════════════════════════
// SECRETS
// ═════════════════════════════════════════════════════════════════════════════

router.get("/projects/:ref/secrets", async (req, res) => {
  try {
    res.json(await getClient(req).listSecrets(req.params.ref));
  } catch (e) { handleError(e, res); }
});

router.post("/projects/:ref/secrets", async (req, res) => {
  try {
    const { secrets } = req.body as { secrets: ProjectSecret[] };
    await getClient(req).bulkUpsertSecrets(req.params.ref, secrets);
    res.status(201).json({ upserted: secrets.length });
  } catch (e) { handleError(e, res); }
});

router.delete("/projects/:ref/secrets", async (req, res) => {
  try {
    const { names } = req.body as { names: string[] };
    await getClient(req).bulkDeleteSecrets(req.params.ref, names);
    res.status(204).send();
  } catch (e) { handleError(e, res); }
});

// ═════════════════════════════════════════════════════════════════════════════
// PGSODIUM
// ═════════════════════════════════════════════════════════════════════════════

router.get("/projects/:ref/pgsodium", async (req, res) => {
  try {
    res.json(await getClient(req).getPgsodiumConfig(req.params.ref));
  } catch (e) { handleError(e, res); }
});

router.put("/projects/:ref/pgsodium", async (req, res) => {
  try {
    res.json(
      await getClient(req).updatePgsodiumConfig(req.params.ref, req.body as PgsodiumConfig)
    );
  } catch (e) { handleError(e, res); }
});

export default router