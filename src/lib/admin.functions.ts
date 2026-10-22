import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

interface NewRepInput {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
  is_admin?: boolean;
}

function validateNewRep(input: NewRepInput): NewRepInput {
  if (!input?.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email))
    throw new Error("A valid email address is required.");
  if (!input.password || input.password.length < 8)
    throw new Error("Password must be at least 8 characters.");
  if (!input.full_name?.trim()) throw new Error("Full name is required.");
  return input;
}

/** Bootstrap: the very first signed-in user can claim the admin role once. */
export const claimFirstAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { count, error: countError } = await supabaseAdmin
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");
    if (countError) throw new Error(countError.message);
    if ((count ?? 0) > 0) throw new Error("An administrator already exists.");

    const email = (context.claims as { email?: string })?.email ?? "";
    const { error: profileError } = await supabaseAdmin
      .from("rep_profiles")
      .upsert({ id: context.userId, full_name: email.split("@")[0] ?? "Admin", email });
    if (profileError) throw new Error(profileError.message);

    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert([
        { user_id: context.userId, role: "admin" },
        { user_id: context.userId, role: "rep" },
      ]);
    if (roleError) throw new Error(roleError.message);

    return { ok: true };
  });

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

export const createRepAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(validateNewRep)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
    });
    if (error || !created?.user) throw new Error(error?.message ?? "Could not create the account.");

    const userId = created.user.id;
    const { error: profileError } = await supabaseAdmin.from("rep_profiles").upsert({
      id: userId,
      full_name: data.full_name.trim(),
      email: data.email,
      phone: data.phone?.trim() || null,
    });
    if (profileError) throw new Error(profileError.message);

    const roles: { user_id: string; role: "admin" | "rep" }[] = [
      { user_id: userId, role: "rep" },
    ];
    if (data.is_admin) roles.push({ user_id: userId, role: "admin" });
    const { error: roleError } = await supabaseAdmin.from("user_roles").insert(roles);
    if (roleError) throw new Error(roleError.message);

    return { id: userId };
  });

export const listRepAccounts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: reps, error }, { data: roles }] = await Promise.all([
      supabaseAdmin
        .from("rep_profiles")
        .select("id, full_name, email, phone, created_at")
        .order("created_at", { ascending: true }),
      supabaseAdmin.from("user_roles").select("user_id, role"),
    ]);
    if (error) throw new Error(error.message);

    return (reps ?? []).map((rep) => ({
      ...rep,
      roles: (roles ?? [])
        .filter((r) => r.user_id === rep.id)
        .map((r) => r.role as string),
    }));
  });
