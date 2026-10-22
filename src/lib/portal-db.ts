import { supabase } from "@/integrations/supabase/client";
import {
  partnerViewQuery,
  partnerViewMutate,
  type PartnerViewFilter,
  type PartnerViewAction,
} from "@/lib/partner-view.functions";
import type { PartnerViewSession } from "@/lib/partner-view";

/**
 * The portal's data door.
 *
 * For a real partner this is just the Supabase client — row level security is
 * the boundary. While a Magenta Admin is in Partner View, the same calls are
 * routed to a server function that answers with the effective partner's
 * entitlements and partner-safe columns only; the admin's own broader Supabase
 * permissions never answer a portal query.
 */

/**
 * Held on globalThis so every chunk that imports this module — the route gate,
 * the hooks and the pages — reads one shared answer to "are we in Partner
 * View?", even across development reloads.
 */
const store = globalThis as typeof globalThis & {
  __magentaPartnerView?: { active: boolean; session: PartnerViewSession | null };
};
store.__magentaPartnerView ??= { active: false, session: null };
const state = store.__magentaPartnerView;

/** Set once the Partner View session is resolved, so reads route correctly. */
export function setPartnerViewActive(active: boolean) {
  state.active = active;
}

/** The effective partner, when a Magenta Admin is in Partner View. */
export function setPartnerViewSession(session: PartnerViewSession | null) {
  state.session = session;
  state.active = Boolean(session);
}

export function getPartnerViewSession() {
  return state.session;
}

export function isPartnerViewActive() {
  return state.active;
}

interface Result<T> {
  data: T;
  error: { message: string } | null;
}

class PartnerViewBuilder implements PromiseLike<Result<unknown>> {
  private filters: PartnerViewFilter[] = [];
  private orderBy: { column: string; ascending?: boolean } | undefined;
  private rowLimit: number | undefined;
  private wantsSingle = false;

  constructor(
    private table: string,
    private columns: string,
  ) {}

  eq(column: string, value: unknown) {
    this.filters.push({ op: "eq", column, value });
    return this;
  }
  neq(column: string, value: unknown) {
    this.filters.push({ op: "neq", column, value });
    return this;
  }
  in(column: string, value: unknown[]) {
    this.filters.push({ op: "in", column, value });
    return this;
  }
  is(column: string, value: unknown) {
    this.filters.push({ op: "is", column, value });
    return this;
  }
  gte(column: string, value: unknown) {
    this.filters.push({ op: "gte", column, value });
    return this;
  }
  lte(column: string, value: unknown) {
    this.filters.push({ op: "lte", column, value });
    return this;
  }
  ilike(column: string, value: unknown) {
    this.filters.push({ op: "ilike", column, value });
    return this;
  }
  order(column: string, options?: { ascending?: boolean }) {
    this.orderBy = { column, ascending: options?.ascending !== false };
    return this;
  }
  limit(count: number) {
    this.rowLimit = count;
    return this;
  }
  single() {
    this.wantsSingle = true;
    return this;
  }
  maybeSingle() {
    this.wantsSingle = true;
    return this;
  }

  async run(): Promise<Result<unknown>> {
    try {
      const result = await partnerViewQuery({
        data: {
          table: this.table,
          columns: this.columns,
          filters: this.filters,
          ...(this.orderBy ? { order: this.orderBy } : {}),
          ...(this.rowLimit ? { limit: this.rowLimit } : {}),
          single: this.wantsSingle,
        },
      });
      return result as Result<unknown>;
    } catch (error) {
      return { data: this.wantsSingle ? null : [], error: { message: (error as Error).message } };
    }
  }

  then<R1 = Result<unknown>, R2 = never>(
    onfulfilled?: ((value: Result<unknown>) => R1 | PromiseLike<R1>) | null,
    onrejected?: ((reason: unknown) => R2 | PromiseLike<R2>) | null,
  ): PromiseLike<R1 | R2> {
    return this.run().then(onfulfilled, onrejected);
  }
}


/**
 * Writes made while Partner View is active. They never touch the database
 * directly: each is translated into a named partner action that the server
 * refuses in read-only mode, checks against the effective partner's role, and
 * records in the audit trail.
 */
class PartnerViewWrite implements PromiseLike<Result<unknown>> {
  private eqs: Record<string, unknown> = {};

  constructor(
    private table: string,
    private kind: "insert" | "update" | "upsert" | "delete",
    private payload: Record<string, unknown>,
  ) {}

  eq(column: string, value: unknown) {
    this.eqs[column] = value;
    return this;
  }
  select() {
    return this;
  }
  single() {
    return this;
  }
  maybeSingle() {
    return this;
  }

  private action(): (PartnerViewAction & { reason?: string }) | null {
    const p = this.payload as Record<string, string>;
    if (this.table === "partner_members" && this.kind === "update")
      return { action: "update_profile", payload: { ...p, id: String(this.eqs["id"] ?? "") } };
    if (this.table === "partner_training_progress" && this.kind === "delete")
      return { action: "unmark_training_complete", payload: { module_id: String(this.eqs["module_id"] ?? "") } };
    if (this.table === "partner_referrals" && this.kind === "insert")
      return { action: "record_manual_referral", payload: p };
    if (this.table === "partner_support_tickets" && this.kind === "insert")
      return { action: "create_support_ticket", payload: p };
    if (this.table === "partner_support_messages" && this.kind === "insert")
      return { action: "post_support_message", payload: p };
    if (this.table === "partner_training_progress" && this.kind === "insert")
      return { action: "mark_training_complete", payload: p };
    if (this.table === "partner_notifications" && this.kind === "update")
      return {
        action: "mark_notification_read",
        payload: { id: String(this.eqs["id"] ?? "") },
      };
    if (this.table === "partner_notification_preferences")
      return {
        action: "save_notification_preferences",
        payload: this.payload as Record<string, boolean>,
      };
    if (this.table === "partner_organizations" && this.kind === "update")
      return { action: "update_organization_contact", payload: p };
    return null;
  }

  private async run(): Promise<Result<unknown>> {
    const action = this.action();
    if (!action)
      return {
        data: null,
        error: { message: "That change isn't available in Partner View." },
      };
    try {
      const result = (await partnerViewMutate({ data: action })) as { id: string | null };
      return { data: { id: result.id }, error: null };
    } catch (error) {
      return { data: null, error: { message: (error as Error).message } };
    }
  }

  then<R1 = Result<unknown>, R2 = never>(
    onfulfilled?: ((value: Result<unknown>) => R1 | PromiseLike<R1>) | null,
    onrejected?: ((reason: unknown) => R2 | PromiseLike<R2>) | null,
  ): PromiseLike<R1 | R2> {
    return this.run().then(onfulfilled, onrejected);
  }
}

/**
 * Drop-in replacement for `supabase.from(...).select(...)` inside the partner
 * portal. Only the builder methods the portal uses are supported, which is
 * deliberate: anything else would have to be reviewed for partner safety.
 */
export const portalDb = {
  // Typed as the Supabase client's own `from` so the portal's queries keep
  // their generated row types; the Partner View path is checked at runtime.
  from: ((table: string) => {
    if (!state.active) return supabase.from(table as never) as never;
    return {
      select: (columns = "*") => new PartnerViewBuilder(table, columns),
      insert: (payload: Record<string, unknown>) =>
        new PartnerViewWrite(table, "insert", payload),
      upsert: (payload: Record<string, unknown>) =>
        new PartnerViewWrite(table, "upsert", payload),
      update: (payload: Record<string, unknown>) =>
        new PartnerViewWrite(table, "update", payload),
      delete: () => new PartnerViewWrite(table, "delete", {}),
    } as never;
  }) as typeof supabase.from,
};

/**
 * Perform a partner action. Outside Partner View the caller's own handler runs
 * as usual; inside it, the action goes to the server, which refuses everything
 * in read-only mode and audits every accepted write.
 */
export async function portalAction<T>(
  action: PartnerViewAction & { reason?: string },
  fallback: () => Promise<T>,
): Promise<T | { ok: true; id: string | null }> {
  if (!state.active) return fallback();
  return partnerViewMutate({ data: action });
}
