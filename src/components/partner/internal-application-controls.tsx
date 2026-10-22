import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Briefcase, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { APPLICATION_STATUS, money, type ApplicationStatus } from "@/lib/partner";

const STATUS_ORDER: ApplicationStatus[] = [
  "submitted",
  "missing_information",
  "under_review",
  "offer_available",
  "approved",
  "contract_requested",
  "contract_sent",
  "contract_signed",
  "funded",
  "declined",
  "duplicate",
  "offer_expired",
];

export interface InternalControlsApplication {
  id: string;
  status: ApplicationStatus;
  requested_amount: number | null;
  approved_amount: number | null;
  funded_amount: number | null;
  linked_deal_id: string | null;
  legal_business_name: string;
}

/**
 * Magenta-only pipeline controls. Every write goes through a security-definer
 * RPC that re-checks the caller is internal staff, so partner RLS is untouched.
 */
export function InternalApplicationControls({ app }: { app: InternalControlsApplication }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [status, setStatus] = useState<ApplicationStatus>(app.status);
  const [note, setNote] = useState("");
  const [approved, setApproved] = useState(app.approved_amount?.toString() ?? "");
  const [funded, setFunded] = useState(app.funded_amount?.toString() ?? "");
  const [missing, setMissing] = useState("");

  const linkedDeal = useQuery({
    queryKey: ["linked-deal", app.linked_deal_id],
    enabled: Boolean(app.linked_deal_id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deals")
        .select("id, merchant_name, status, min_funded, max_funded, expiration_date")
        .eq("id", app.linked_deal_id!)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    },
  });

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["partner-application", app.id] });
    await queryClient.invalidateQueries({ queryKey: ["partner-applications"] });
  };

  const save = useMutation({
    mutationFn: async () => {
      const items = missing
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      const { error } = await supabase.rpc("partner_set_application_status", {
        _application_id: app.id,
        _status: status,
        ...(note.trim() ? { _note: note.trim() } : {}),
        ...(approved ? { _approved_amount: Number(approved) } : {}),
        ...(funded ? { _funded_amount: Number(funded) } : {}),
        ...(items.length ? { _missing_items: items } : {}),
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: async () => {
      toast.success("Application updated and the partner has been notified.");
      setNote("");
      await refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const createDeal = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("partner_create_deal_from_application", {
        _application_id: app.id,
      });
      if (error) throw new Error(error.message);
      return data as string;
    },
    onSuccess: async (dealId) => {
      toast.success("Deal created from this application.");
      await refresh();
      void navigate({ to: "/deals/$dealId", params: { dealId } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <section
      aria-label="Magenta pipeline controls"
      className="card-elevated mt-6 border-gold/40 p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
          <h2 className="font-display text-lg">Magenta Controls</h2>
        </div>
        {app.linked_deal_id ? (
          <Button
            variant="secondary"
            onClick={() =>
              void navigate({ to: "/deals/$dealId", params: { dealId: app.linked_deal_id! } })
            }
          >
            <Briefcase className="h-4 w-4" aria-hidden="true" /> Open Linked Deal
          </Button>
        ) : (
          <Button disabled={createDeal.isPending} onClick={() => createDeal.mutate()}>
            <Briefcase className="h-4 w-4" aria-hidden="true" />
            {createDeal.isPending ? "Creating…" : "Create Deal"}
          </Button>
        )}
      </div>

      {app.linked_deal_id && linkedDeal.data ? (
        <p className="mt-2 text-sm text-muted-foreground">
          Linked deal for {linkedDeal.data.merchant_name} is{" "}
          <span className="capitalize">{linkedDeal.data.status.replace(/_/g, " ")}</span> ·{" "}
          {money(linkedDeal.data.min_funded)}–{money(linkedDeal.data.max_funded)}
        </p>
      ) : null}

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-sm">
          <span className="text-xs text-muted-foreground">Status</span>
          <select
            className="focus-ring mt-1 h-10 w-full rounded-md border border-input bg-card px-3 text-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value as ApplicationStatus)}
          >
            {STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {APPLICATION_STATUS[s].label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="text-xs text-muted-foreground">Approved Amount</span>
          <Input
            className="mt-1"
            inputMode="numeric"
            value={approved}
            onChange={(e) => setApproved(e.target.value.replace(/[^0-9.]/g, ""))}
            placeholder="e.g. 75000"
          />
        </label>
        <label className="text-sm">
          <span className="text-xs text-muted-foreground">Funded Amount</span>
          <Input
            className="mt-1"
            inputMode="numeric"
            value={funded}
            onChange={(e) => setFunded(e.target.value.replace(/[^0-9.]/g, ""))}
            placeholder="e.g. 70000"
          />
        </label>
        <label className="text-sm">
          <span className="text-xs text-muted-foreground">Note To Partner</span>
          <Input
            className="mt-1"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Shown on the partner timeline"
          />
        </label>
      </div>

      {status === "missing_information" ? (
        <label className="mt-3 block text-sm">
          <span className="text-xs text-muted-foreground">
            Missing items — one per line
          </span>
          <textarea
            className="focus-ring mt-1 min-h-24 w-full rounded-md border border-input bg-card p-3 text-sm"
            value={missing}
            onChange={(e) => setMissing(e.target.value)}
            placeholder={"Last 4 months of bank statements\nVoided business check"}
          />
        </label>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button disabled={save.isPending} onClick={() => save.mutate()}>
          {save.isPending ? "Saving…" : "Update Application"}
        </Button>
        <Button
          variant="outline"
          disabled={save.isPending}
          onClick={() => {
            setStatus("funded");
            setTimeout(() => save.mutate(), 0);
          }}
        >
          Mark Funded &amp; Create Commission
        </Button>
      </div>
    </section>
  );
}
