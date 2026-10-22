import { createServerFn } from "@tanstack/react-start";
import { getCookie, setCookie, deleteCookie } from "@tanstack/react-start/server";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  MAGENTA_ONLY_MESSAGE,
  PARTNER_VIEW_TTL_MINUTES,
  type PartnerViewMode,
  type PartnerViewSession,
} from "@/lib/partner-view";

/**
 * Server-side effective-identity layer for Magenta Admin Partner View.
 *
 * Every portal read and write made while a Partner View session is active
 * comes through here. The admin's own Supabase session is used ONLY to prove
 * they are a Magenta administrator — it never answers a portal query. The rows
 * that come back are decided here, from the effective partner member's
 * entitlements, using the same rule the database enforces for a real partner:
 * their organization, and within it their own records unless they are an
 * organization admin or hold the organization-link entitlement.
 */

const COOKIE = "mg_partner_view";

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function assertMagentaAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Only Magenta administrators can use Partner View.");
}

interface AuditEntry {
  action: string;
  entityType: string;
  entityId?: string | null;
  previous?: unknown;
  next?: unknown;
  reason?: string | null;
}

/**
 * Audit trail. Everything Partner View does is written to the existing
 * `partner_admin_audit_log`, always naming the real administrator as the actor
 * and the effective partner as the person the work was done on behalf of.
 */
async function audit(session: PartnerViewSessionRow, entry: AuditEntry) {
  const db = await admin();
  const { error } = await db.from("partner_admin_audit_log").insert({
    actor_user_id: session.admin_user_id,
    entity_type: entry.entityType,
    entity_id: entry.entityId ?? null,
    action: entry.action,
    previous_value: (entry.previous ?? null) as never,
    new_value: {
      partner_view: {
        session_id: session.id,
        mode: session.mode,
        performed_by: "Magenta on behalf of the partner",
        real_admin_user_id: session.admin_user_id,
        effective_member_id: session.effective_member_id,
        effective_role: session.effective_role,
        organization_id: session.organization_id,
        at: new Date().toISOString(),
      },
      value: entry.next ?? null,
    } as never,
    reason: entry.reason ?? null,
  });
  if (error) throw new Error("Could not record Partner View audit: " + error.message);
}

interface PartnerViewSessionRow {
  id: string;
  admin_user_id: string;
  effective_member_id: string;
  organization_id: string;
  effective_role: string;
  mode: PartnerViewMode;
  return_path: string;
  expires_at: string;
  ended_at: string | null;
}

interface ResolvedSession {
  row: PartnerViewSessionRow;
  member: {
    id: string;
    full_name: string;
    email: string;
    role: string;
    status: string;
    code: string | null;
    user_id: string;
    can_view_org_referrals: boolean;
    organization_id: string;
  };
  organization: {
    id: string;
    name: string;
    slug: string;
    code: string | null;
    status: string;
    partner_type: string;
  };
  /** True when this partner may see every record in the organization. */
  entitledToOrganization: boolean;
}

/** Reads and validates the session cookie. Returns null when there is none. */
async function resolve(userId: string): Promise<ResolvedSession | null> {
  const token = getCookie(COOKIE);
  if (!token) return null;
  const db = await admin();
  const { data: row } = await db
    .from("partner_view_sessions")
    .select(
      "id, admin_user_id, effective_member_id, organization_id, effective_role, mode, return_path, expires_at, ended_at",
    )
    .eq("token_hash", await sha256(token))
    .maybeSingle();

  if (row && row.admin_user_id !== userId) throw new Error("Partner View belongs to another administrator.");
  if (!row || row.ended_at) {
    deleteCookie(COOKIE, { path: "/" });
    return null;
  }

  if (new Date(row.expires_at).getTime() <= Date.now()) {
    await db
      .from("partner_view_sessions")
      .update({ ended_at: new Date().toISOString() })
      .eq("id", row.id);
    await audit(row as PartnerViewSessionRow, {
      action: "partner_view.expired",
      entityType: "partner_view_session",
      entityId: row.id,
    });
    deleteCookie(COOKIE, { path: "/" });
    return null;
  }

  const [{ data: member }, { data: organization }] = await Promise.all([
    db
      .from("partner_members")
      .select(
        "id, full_name, email, role, status, code, user_id, can_view_org_referrals, organization_id",
      )
      .eq("id", row.effective_member_id)
      .maybeSingle(),
    db
      .from("partner_organizations")
      .select("id, name, slug, code, status, partner_type")
      .eq("id", row.organization_id)
      .maybeSingle(),
  ]);

  if (!member || !organization || member.organization_id !== row.organization_id ||
      member.status !== "active" || organization.status !== "active" || member.role !== row.effective_role)
    throw new Error("Partner View access is no longer available.");

  await db
    .from("partner_view_sessions")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", row.id);

  return {
    row: row as PartnerViewSessionRow,
    member: member as ResolvedSession["member"],
    organization: organization as ResolvedSession["organization"],
    entitledToOrganization:
      member.role === "organization_admin",
  };
}

function toSession(resolved: ResolvedSession, adminEmail: string | null): PartnerViewSession {
  return {
    sessionId: resolved.row.id,
    mode: resolved.row.mode,
    adminUserId: resolved.row.admin_user_id,
    adminEmail,
    memberId: resolved.member.id,
    memberUserId: resolved.member.user_id,
    memberName: resolved.member.full_name,
    memberEmail: resolved.member.email,
    memberCode: resolved.member.code,
    role: resolved.member.role,
    canViewOrgReferrals: Boolean(resolved.member.can_view_org_referrals),
    organizationId: resolved.organization.id,
    organizationName: resolved.organization.name,
    organizationSlug: resolved.organization.slug,
    organizationCode: resolved.organization.code,
    organizationStatus: resolved.organization.status,
    organizationType: resolved.organization.partner_type,
    returnPath: resolved.row.return_path,
    expiresAt: resolved.row.expires_at,
  };
}

/* ------------------------------------------------------------------ */
/* Read allowlist                                                      */
/* ------------------------------------------------------------------ */

type Scope =
  | { kind: "organization"; column: string }
  /** Organization-scoped, narrowed to the member unless entitled org-wide. */
  | { kind: "entitled"; orgColumn: string; memberColumn: string }
  /** Narrowed to the effective partner's own auth user. */
  | { kind: "user"; column: string }
  /** Narrowed to the effective member unless entitled org-wide. */
  | { kind: "member"; column: string }
  /** Published catalogue content, identical for every partner. */
  | { kind: "public" };

interface TableRule {
  columns: string[];
  scope: Scope;
  /**
   * The partner-facing views filter themselves by the signed-in partner's own
   * database context, which does not exist here — the effective partner is
   * resolved in this layer instead. So read the underlying table and apply the
   * same safe columns and entitlement filter ourselves.
   */
  source?: string;
  /** Organization admins only (matches the portal's own rule). */
  orgAdminOnly?: boolean;
}

const READABLE: Record<string, TableRule> = {
  partner_application_summary: {
    columns: [
      "id",
      "reference",
      "legal_business_name",
      "dba",
      "partner_status",
      "completion_percent",
      "started_at",
      "last_activity_at",
      "submitted_at",
      "funded_amount",
      "funded_at",
      "created_at",
      "attributed_member_id",
      "organization_id",
      "referral_id",
      "city",
      "state",
      "contact_first_name",
      "contact_last_name",
      "updated_at",
    ],
    source: "partner_applications",
    scope: { kind: "entitled", orgColumn: "organization_id", memberColumn: "attributed_member_id" },
  },
  partner_referrals: {
    columns: [
      "id",
      "merchant_business_name",
      "merchant_contact_name",
      "merchant_email",
      "merchant_phone",
      "member_id",
      "organization_id",
      "application_id",
      "note",
      "origin",
      "referral_code_used",
      "member_code_used",
      "created_at",
      "updated_at",
    ],
    scope: { kind: "entitled", orgColumn: "organization_id", memberColumn: "member_id" },
  },
  partner_commissions: {
    columns: [
      "id",
      "application_id",
      "deal_id",
      "organization_id",
      "amount",
      "rate_percent",
      "funded_amount",
      "status",
      "paid_at",
      "scheduled_payment_date",
      "payment_reference",
      "created_at",
    ],
    scope: { kind: "organization", column: "organization_id" },
  },
  partner_members: {
    columns: [
      "id",
      "full_name",
      "email",
      "role",
      "status",
      "code",
      "phone",
      "user_id",
      "organization_id",
      "created_at",
    ],
    scope: { kind: "organization", column: "organization_id" },
  },
  partner_member_stats: {
    columns: [
      "member_id",
      "organization_id",
      "referral_count",
      "submitted_count",
      "funded_count",
      "funded_volume",
      "commission_earned",
      "full_name",
      "email",
      "role",
      "status",
      "code",
      "can_view_org_referrals",
    ],
    scope: { kind: "member", column: "member_id" },
  },
  partner_organizations: {
    columns: [
      "id",
      "name",
      "legal_name",
      "slug",
      "code",
      "status",
      "partner_type",
      "primary_contact_name",
      "primary_contact_email",
      "phone",
      "website",
      "commission_rate_percent",
      "referral_link_enabled",
    ],
    scope: { kind: "organization", column: "id" },
  },
  partner_invitations: {
    columns: [
      "id",
      "invited_email",
      "full_name",
      "intended_role",
      "status",
      "expires_at",
      "created_at",
      "organization_id",
    ],
    scope: { kind: "organization", column: "organization_id" },
    orgAdminOnly: true,
  },
  partner_application_events: {
    columns: [
      "id",
      "application_id",
      "event_type",
      "title",
      "description",
      "visibility",
      "created_at",
    ],
    scope: { kind: "public" },
  },
  partner_notifications: {
    columns: ["id", "kind", "title", "body", "link_path", "read_at", "created_at", "user_id"],
    scope: { kind: "user", column: "user_id" },
  },
  partner_notification_preferences: {
    columns: [
      "id",
      "user_id",
      "organization_id",
      "application_updates",
      "commission_updates",
      "missing_information",
      "training_updates",
    ],
    scope: { kind: "user", column: "user_id" },
  },
  partner_support_tickets: {
    columns: [
      "id",
      "reference",
      "subject",
      "category",
      "status",
      "organization_id",
      "created_by_member_id",
      "last_message_at",
      "created_at",
    ],
    scope: { kind: "organization", column: "organization_id" },
  },
  partner_support_messages: {
    columns: [
      "id",
      "ticket_id",
      "organization_id",
      "author_name",
      "author_kind",
      "body",
      "created_at",
    ],
    scope: { kind: "organization", column: "organization_id" },
  },
  partner_trainings: {
    columns: [
      "id",
      "title",
      "description",
      "category",
      "audience",
      "published",
      "sort_order",
      "created_at",
    ],
    scope: { kind: "public" },
  },
  partner_training_modules: {
    columns: [
      "id",
      "training_id",
      "title",
      "description",
      "kind",
      "content_url",
      "duration_minutes",
      "sort_order",
    ],
    scope: { kind: "public" },
  },
  partner_training_progress: {
    columns: ["id", "module_id", "member_id", "organization_id", "completed_at"],
    scope: { kind: "member", column: "member_id" },
  },
  partner_resources: {
    columns: [
      "id",
      "title",
      "description",
      "category",
      "kind",
      "link_url",
      "storage_path",
      "file_name",
      "file_size",
      "audience",
      "published",
      "sort_order",
    ],
    scope: { kind: "public" },
  },
  partner_faqs: {
    columns: ["id", "question", "answer", "category", "published", "sort_order"],
    scope: { kind: "public" },
  },
};

export type PartnerViewFilter = {
  op: "eq" | "neq" | "in" | "is" | "gte" | "lte" | "ilike";
  column: string;
  value: unknown;
};

export interface PartnerViewQueryInput {
  table: string;
  columns: string;
  filters?: PartnerViewFilter[];
  order?: { column: string; ascending?: boolean };
  limit?: number;
  single?: boolean;
}

/**
 * Read partner data as the effective partner. Column and table allowlists mean
 * a Partner View page cannot request a field a partner may not see, and the
 * entitlement filters below are applied after anything the caller asked for.
 */
export const partnerViewQuery = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: PartnerViewQueryInput) => {
    if (!input?.table || !READABLE[input.table]) throw new Error("That data is not available in Partner View.");
    return input;
  })
  .handler(async ({ data, context }) => {
    await assertMagentaAdmin(context);
    const session = await resolve(context.userId);
    if (!session) throw new Error("Partner View session has ended.");

    const rule = READABLE[data.table];
    if (!rule) throw new Error("Unavailable partner data.");
    if (rule.orgAdminOnly && session.member.role !== "organization_admin") {
      return { data: [], error: null };
    }

    const requested = (data.columns || "*")
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);
    const columns = requested.includes("*")
      ? rule.columns
      : requested.filter((c) => rule.columns.includes(c));
    if (!columns.length) throw new Error("No partner-safe columns were requested.");

    const db = await admin();
    if (data.table === "partner_member_stats") {
      return { data: await memberStats(session), error: null };
    }

    let query = db.from((rule.source ?? data.table) as never).select(columns.join(", ")) as any;

    for (const filter of data.filters ?? []) {
      if (!rule.columns.includes(filter.column)) continue;
      if (filter.op === "in" && Array.isArray(filter.value)) {
        query = query.in(filter.column, filter.value);
      } else if (filter.op === "is") {
        query = query.is(filter.column, filter.value as null);
      } else {
        query = query[filter.op](filter.column, filter.value);
      }
    }

    // Mandatory scoping — applied last so a caller cannot widen it.
    switch (rule.scope.kind) {
      case "organization":
        query = query.eq(rule.scope.column, session.organization.id);
        break;
      case "entitled":
        query = query.eq(rule.scope.orgColumn, session.organization.id);
        if (!session.entitledToOrganization) {
          query = session.member.can_view_org_referrals
            ? query.or(`${rule.scope.memberColumn}.eq.${session.member.id},${rule.scope.memberColumn}.is.null`)
            : query.eq(rule.scope.memberColumn, session.member.id);
        }
        break;
      case "member":
        query = query.eq("organization_id", session.organization.id);
        if (!session.entitledToOrganization) {
          query = query.eq(rule.scope.column, session.member.id);
        }
        break;
      case "user":
        query = query.eq(rule.scope.column, session.member.user_id);
        break;
      case "public":
        break;
    }

    // Application events belong to an application the partner may see.
    if (data.table === "partner_application_events") {
      let apps = db
        .from("partner_applications")
        .select("id")
        .eq("organization_id", session.organization.id);
      if (!session.entitledToOrganization) {
        apps = session.member.can_view_org_referrals
          ? apps.or(`attributed_member_id.eq.${session.member.id},attributed_member_id.is.null`)
          : apps.eq("attributed_member_id", session.member.id);
      }
      const { data: visible } = await apps;
      query = query
        .in("application_id", (visible ?? []).map((a: { id: string | null }) => a.id).filter(Boolean) as string[])
        .eq("visibility", "partner");
    }

    // Commissions follow the applications the partner may see.
    if (data.table === "partner_commissions" && !session.entitledToOrganization) {
      let visibleQuery = db
        .from("partner_applications")
        .select("id")
        .eq("organization_id", session.organization.id);
      visibleQuery = session.member.can_view_org_referrals
        ? visibleQuery.or(`attributed_member_id.eq.${session.member.id},attributed_member_id.is.null`)
        : visibleQuery.eq("attributed_member_id", session.member.id);
      const { data: visible } = await visibleQuery;
      query = query.in("application_id", (visible ?? []).map((a: { id: string | null }) => a.id).filter(Boolean) as string[]);
    }

    if (["partner_trainings", "partner_resources", "partner_faqs"].includes(data.table)) query = query.eq("published", true);
    if (data.table === "partner_training_progress") query = query.eq("member_id", session.member.id);
    if (data.table === "partner_training_modules") {
      const { data: trainings } = await db.from("partner_trainings").select("id").eq("published", true);
      query = query.in("training_id", (trainings ?? []).map(t => t.id));
    }
    if (data.order && rule.columns.includes(data.order.column)) {
      query = query.order(data.order.column, { ascending: data.order.ascending !== false });
    }
    if (data.limit) query = query.limit(Math.max(1, Math.min(10000, data.limit)));

    const { data: rows, error } = await query;
    if (error) return { data: null, error: { message: error.message } };
    if (data.single) return { data: (rows ?? [])[0] ?? null, error: null };
    return { data: rows ?? [], error: null };
  });

/**
 * Per-person referral, submitted, funded and commission totals — the same
 * numbers the partner's own Team page shows, computed here for the effective
 * partner because the database view relies on a partner session.
 */
async function memberStats(session: ResolvedSession) {
  const db = await admin();
  const [{ data: members }, { data: apps }, { data: commissions }] = await Promise.all([
    db
      .from("partner_members")
      .select("id, full_name, email, role, status, code, can_view_org_referrals, organization_id")
      .eq("organization_id", session.organization.id),
    db
      .from("partner_applications")
      .select("id, attributed_member_id, submitted_at, funding_state, funded_amount")
      .eq("organization_id", session.organization.id),
    db
      .from("partner_commissions")
      .select("amount, status, application_id")
      .eq("organization_id", session.organization.id),
  ]);

  const visible = (members ?? []).filter(
    (m) => session.entitledToOrganization || m.id === session.member.id,
  );
  const memberOfApp = new Map((apps ?? []).map((a) => [a.id, a.attributed_member_id]));

  return visible.map((m) => {
    const mine = (apps ?? []).filter((a) => a.attributed_member_id === m.id);
    const earned = (commissions ?? [])
      .filter(
        (c) =>
          c.application_id &&
          memberOfApp.get(c.application_id) === m.id &&
          ["approved", "paid", "scheduled"].includes(String(c.status)),
      )
      .reduce((sum, c) => sum + Number(c.amount ?? 0), 0);
    return {
      member_id: m.id,
      organization_id: m.organization_id,
      full_name: m.full_name,
      email: m.email,
      role: m.role,
      status: m.status,
      code: m.code,
      can_view_org_referrals: m.can_view_org_referrals,
      referral_count: mine.length,
      submitted_count: mine.filter((a) => a.submitted_at).length,
      funded_count: mine.filter((a) => a.funding_state === "funded").length,
      funded_volume: mine
        .filter((a) => a.funding_state === "funded")
        .reduce((sum, a) => sum + Number(a.funded_amount ?? 0), 0),
      commission_earned: earned,
    };
  });
}

/* ------------------------------------------------------------------ */
/* Session lifecycle                                                   */
/* ------------------------------------------------------------------ */

export const startPartnerView = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { memberId: string; returnPath?: string; reason?: string }) => {
    if (!input?.memberId) throw new Error("Choose a partner person to view as.");
    return input;
  })
  .handler(async ({ data, context }) => {
    await assertMagentaAdmin(context);
    const db = await admin();

    const { data: member } = await db
      .from("partner_members")
      .select("id, full_name, role, status, organization_id")
      .eq("id", data.memberId)
      .maybeSingle();
    if (!member) throw new Error("That partner person no longer exists.");
    if (member.status !== "active") throw new Error("That partner account is not active.");

    const { data: organization } = await db
      .from("partner_organizations")
      .select("id, name, status")
      .eq("id", member.organization_id)
      .maybeSingle();
    if (!organization || organization.status !== "active") throw new Error("That partner organization is not active.");

    // End any session this admin already had open.
    await db
      .from("partner_view_sessions")
      .update({ ended_at: new Date().toISOString() })
      .eq("admin_user_id", context.userId)
      .is("ended_at", null);

    const token = crypto.randomUUID() + crypto.randomUUID();
    const expiresAt = new Date(Date.now() + PARTNER_VIEW_TTL_MINUTES * 60_000).toISOString();
    const returnPath =
      data.returnPath && data.returnPath.startsWith("/") && !data.returnPath.startsWith("//")
        ? data.returnPath
        : "/partners";

    const { data: row, error } = await db
      .from("partner_view_sessions")
      .insert({
        token_hash: await sha256(token),
        admin_user_id: context.userId,
        effective_member_id: member.id,
        organization_id: organization.id,
        effective_role: member.role,
        mode: "view",
        return_path: returnPath,
        reason: data.reason ?? null,
        expires_at: expiresAt,
      })
      .select("id, admin_user_id, effective_member_id, organization_id, effective_role, mode, return_path, expires_at, ended_at")
      .single();
    if (error) throw new Error(error.message);

    setCookie(COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/",
      maxAge: PARTNER_VIEW_TTL_MINUTES * 60,
    });

    await audit(row as PartnerViewSessionRow, {
      action: "partner_view.started",
      entityType: "partner_view_session",
      entityId: row.id,
      next: {
        effective_member: member.full_name,
        organization: organization.name,
        role: member.role,
        mode: "view",
        expires_at: expiresAt,
        return_path: returnPath,
      },
      reason: data.reason ?? null,
    });

    return { ok: true as const, expiresAt };
  });

/** Current Partner View session, or null. Admin-only, like everything here. */
export const getPartnerView = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) return null;
    const session = await resolve(context.userId);
    if (!session) return null;
    if (session.row.admin_user_id !== context.userId) return null;
    const email = (context.claims as { email?: string } | null)?.email ?? null;
    return toSession(session, email);
  });

export const setPartnerViewMode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { mode: PartnerViewMode; reason?: string }) => {
    if (input?.mode !== "view" && input?.mode !== "work") throw new Error("Unknown Partner View mode.");
    if (input.mode === "work" && !input.reason?.trim())
      throw new Error("Give a reason before working as this partner.");
    return input;
  })
  .handler(async ({ data, context }) => {
    await assertMagentaAdmin(context);
    const session = await resolve(context.userId);
    if (!session || session.row.admin_user_id !== context.userId)
      throw new Error("Partner View session has ended.");

    const db = await admin();
    await db
      .from("partner_view_sessions")
      .update({ mode: data.mode, reason: data.reason ?? null })
      .eq("id", session.row.id);

    await audit(session.row, {
      action: "partner_view.mode_changed",
      entityType: "partner_view_session",
      entityId: session.row.id,
      previous: { mode: session.row.mode },
      next: { mode: data.mode },
      reason: data.reason ?? null,
    });

    return { ok: true as const, mode: data.mode };
  });

export const exitPartnerView = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertMagentaAdmin(context);
    const session = await resolve(context.userId);
    deleteCookie(COOKIE, { path: "/" });
    if (!session) return { ok: true as const, returnPath: "/partners" };

    const db = await admin();
    await db
      .from("partner_view_sessions")
      .update({ ended_at: new Date().toISOString() })
      .eq("id", session.row.id);
    await audit(session.row, {
      action: "partner_view.exited",
      entityType: "partner_view_session",
      entityId: session.row.id,
    });
    return { ok: true as const, returnPath: session.row.return_path };
  });

/* ------------------------------------------------------------------ */
/* Writes                                                              */
/* ------------------------------------------------------------------ */

export type PartnerViewAction =
  | { action: "update_team_member"; payload: Record<string, string> }
  | { action: "update_profile"; payload: Record<string, string> }
  | { action: "unmark_training_complete"; payload: Record<string, string> }
  | { action: "record_manual_referral"; payload: Record<string, string | null> }
  | { action: "create_support_ticket"; payload: Record<string, string> }
  | { action: "post_support_message"; payload: Record<string, string> }
  | { action: "mark_training_complete"; payload: Record<string, string> }
  | { action: "mark_notification_read"; payload: Record<string, string> }
  | { action: "save_notification_preferences"; payload: Record<string, boolean> }
  | { action: "update_organization_contact"; payload: Record<string, string | null> };

/** Actions only an organization admin could take themselves. */
const ORG_ADMIN_ACTIONS = new Set(["update_organization_contact", "update_team_member"]);

/** Roles that may record a referral or open a ticket on their own behalf. */
const CONTRIBUTOR_ROLES = new Set(["organization_admin", "manager", "broker", "referral_rep"]);

/**
 * Every Partner View mutation. In read-only mode this refuses unconditionally —
 * including a direct API call — because the refusal lives on the server, not in
 * the interface.
 */
export const partnerViewMutate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: PartnerViewAction & { reason?: string }) => {
    if (!input?.action) throw new Error("Unknown Partner View action.");
    return input;
  })
  .handler(async ({ data, context }) => {
    await assertMagentaAdmin(context);
    const session = await resolve(context.userId);
    if (!session || session.row.admin_user_id !== context.userId)
      throw new Error("Partner View session has ended.");

    if (session.row.mode !== "work") {
      await audit(session.row, {
        action: "partner_view.write_rejected",
        entityType: "partner_view_session",
        entityId: session.row.id,
        next: { attempted: data.action, mode: session.row.mode },
      });
      throw new Error("Partner View is read-only. Switch to Work as Partner to make changes.");
    }

    try {
    if (data.payload && "organization_id" in data.payload && data.payload["organization_id"] !== session.organization.id)
      throw new Error("Cross-organization actions are not permitted.");
    if (data.action !== "update_team_member" && data.payload && "member_id" in data.payload && data.payload["member_id"] !== session.member.id)
      throw new Error("Actions for another partner are not permitted.");
    if (data.payload && "user_id" in data.payload && data.payload["user_id"] !== session.member.user_id)
      throw new Error("Actions for another user are not permitted.");
    if (ORG_ADMIN_ACTIONS.has(data.action) && session.member.role !== "organization_admin") {
      throw new Error("This partner role cannot take that action.");
    }
    if (!CONTRIBUTOR_ROLES.has(session.member.role) && data.action === "record_manual_referral") {
      throw new Error("This partner role cannot record referrals.");
    }

    const db = await admin();
    const orgId = session.organization.id;
    let entityType: string = data.action;
    let entityId: string | null = null;
    let previous: unknown = null;
    let next: unknown = data.payload;

    switch (data.action) {
      case "update_team_member": {
        const { data: before } = await db.from("partner_members").select("id, role, status").eq("id", data.payload["member_id"] ?? "").eq("organization_id", orgId).maybeSingle();
        if (!before || before.id === session.member.id || before.role === "organization_admin") throw new Error("That seat cannot be changed by this partner.");
        const patch: Record<string, string> = {};
        if (data.payload["role"]) {
          if (!["manager", "broker", "referral_rep", "viewer"].includes(data.payload["role"])) throw new Error("Only Magenta can assign that role.");
          patch["role"] = data.payload["role"];
        }
        if (data.payload["status"]) {
          if (!["active", "inactive"].includes(data.payload["status"])) throw new Error("Invalid seat status.");
          patch["status"] = data.payload["status"];
        }
        previous = before; next = patch; entityId = before.id; entityType = "partner_members";
        const { error } = await db.from("partner_members").update(patch as never).eq("id", before.id).eq("organization_id", orgId);
        if (error) throw new Error(error.message);
        break;
      }
      case "update_profile": {
        if (data.payload["id"] !== session.member.id) throw new Error("Only your own profile may be changed.");
        const patch = { full_name: String(data.payload["full_name"] ?? "").trim(), phone: data.payload["phone"] || null };
        if (!patch.full_name) throw new Error("A name is required.");
        const { data: before } = await db.from("partner_members").select("full_name, phone").eq("id", session.member.id).single();
        previous = before;
        const { error } = await db.from("partner_members").update(patch).eq("id", session.member.id);
        if (error) throw new Error(error.message);
        entityType = "partner_members"; entityId = session.member.id; next = patch;
        break;
      }
      case "unmark_training_complete": {
        const { data: before, error } = await db.from("partner_training_progress").delete().eq("member_id", session.member.id).eq("module_id", data.payload["module_id"] ?? "").select();
        if (error) throw new Error(error.message);
        previous = before; next = null; entityType = "partner_training_progress"; entityId = data.payload["module_id"] ?? null;
        break;
      }
      case "record_manual_referral": {
        const { data: row, error } = await db
          .from("partner_referrals")
          .insert({
            organization_id: orgId,
            member_id: session.member.id,
            merchant_business_name: String(data.payload["merchant_business_name"] ?? "").trim(),
            merchant_contact_name: data.payload["merchant_contact_name"] ?? null,
            merchant_email: data.payload["merchant_email"] ?? null,
            merchant_phone: data.payload["merchant_phone"] ?? null,
            note: data.payload["note"] ?? null,
            origin: "manual",
          })
          .select("id")
          .single();
        if (error) throw new Error(error.message);
        entityType = "partner_referrals";
        entityId = row.id;
        break;
      }
      case "create_support_ticket": {
        const reference = `PS-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
        const { data: row, error } = await db
          .from("partner_support_tickets")
          .insert({
            organization_id: orgId,
            created_by_member_id: session.member.id,
            reference,
            subject: data.payload["subject"] ?? "",
            category: data.payload["category"] ?? "general",
          })
          .select("id")
          .single();
        if (error) throw new Error(error.message);

        entityType = "partner_support_tickets";
        entityId = row.id;
        break;
      }
      case "post_support_message": {
        const { data: ticket } = await db
          .from("partner_support_tickets")
          .select("id, organization_id")
          .eq("id", data.payload["ticket_id"] ?? "")
          .maybeSingle();
        if (!ticket || ticket.organization_id !== orgId)
          throw new Error("That conversation belongs to another organization.");
        const { data: row, error } = await db
          .from("partner_support_messages")
          .insert({
            ticket_id: ticket.id,
            organization_id: orgId,
            author_name: session.member.full_name,
            author_kind: "partner",
            body: data.payload["body"] ?? "",
          })
          .select("id")
          .single();
        if (error) throw new Error(error.message);
        entityType = "partner_support_messages";
        entityId = row.id;
        break;
      }
      case "mark_training_complete": {
        const { data: module } = await db.from("partner_training_modules").select("id, training_id").eq("id", data.payload["module_id"] ?? "").maybeSingle();
        const { data: training } = await db.from("partner_trainings").select("id").eq("id", module?.training_id ?? "").eq("published", true).maybeSingle();
        if (!training) throw new Error("Training is not available.");
        const { error } = await db.from("partner_training_progress").insert({
          module_id: data.payload["module_id"] ?? "",
          member_id: session.member.id,
          organization_id: orgId,
        });
        if (error && !error.message.includes("duplicate")) throw new Error(error.message);
        entityType = "partner_training_progress";
        entityId = data.payload["module_id"] ?? null;
        break;
      }
      case "mark_notification_read": {
        const { error } = await db
          .from("partner_notifications")
          .update({ read_at: new Date().toISOString() })
          .eq("id", data.payload["id"] ?? "")
          .eq("user_id", session.member.user_id);
        if (error) throw new Error(error.message);
        entityType = "partner_notifications";
        entityId = data.payload["id"] ?? null;
        break;
      }
      case "save_notification_preferences": {
        const { data: before } = await db
          .from("partner_notification_preferences")
          .select("*")
          .eq("user_id", session.member.user_id)
          .maybeSingle();
        previous = before;
        const { error } = await db.from("partner_notification_preferences").upsert(
          {
            user_id: session.member.user_id,
            organization_id: orgId,
            application_updates: Boolean(data.payload["application_updates"]),
            commission_updates: Boolean(data.payload["commission_updates"]),
            missing_information: Boolean(data.payload["missing_information"]),
            training_updates: Boolean(data.payload["training_updates"]),
          },
          { onConflict: "user_id" },
        );
        if (error) throw new Error(error.message);
        entityType = "partner_notification_preferences";
        break;
      }
      case "update_organization_contact": {
        const { data: before } = await db
          .from("partner_organizations")
          .select("primary_contact_name, primary_contact_email, phone, website")
          .eq("id", orgId)
          .maybeSingle();
        previous = before;
        const patch = {
          primary_contact_name: data.payload["primary_contact_name"] ?? null,
          primary_contact_email: data.payload["primary_contact_email"] ?? null,
          phone: data.payload["phone"] ?? null,
          website: data.payload["website"] ?? null,
        };
        const { error } = await db.from("partner_organizations").update(patch).eq("id", orgId);
        if (error) throw new Error(error.message);
        next = patch;
        entityType = "partner_organizations";
        entityId = orgId;
        break;
      }
      default:
        throw new Error(MAGENTA_ONLY_MESSAGE);
    }

    await audit(session.row, {
      action: `partner_view.${data.action}`,
      entityType,
      entityId,
      previous,
      next,
      reason: (data as { reason?: string }).reason ?? null,
    });

    return { ok: true as const, id: entityId };
    } catch (error) {
      await audit(session.row, {
        action: "partner_view.write_rejected", entityType: "partner_view_session", entityId: session.row.id,
        next: { attempted: data.action, outcome: "rejected", message: (error as Error).message },
        reason: data.reason ?? null,
      });
      throw error;
    }
  });
