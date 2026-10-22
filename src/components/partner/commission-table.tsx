import { useMutation } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Download, PencilLine } from "lucide-react";
import { toast } from "sonner";

import { ToneBadge } from "@/components/partner/tone-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { shortDate } from "@/lib/partner";
import { COMMISSION_STATUS, currency, percent, type CommissionStatus } from "@/lib/partner-portal";
import { csvStamp, downloadCsv, toCsv } from "@/lib/csv";
import { titleCaseName } from "@/lib/text";

export interface CommissionRow {
  id: string;
  amount: number;
  rate_percent: number;
  funded_amount: number;
  status: CommissionStatus;
  paid_at: string | null;
  payment_reference: string | null;
  note: string | null;
  organization_id: string;
  application_id: string;
  application: { reference: string; legal_business_name: string } | null;
}

/** CSV export shared by the network-wide list and a single partner's tab. */
export function exportCommissionsCsv(
  rows: CommissionRow[],
  label: string,
  orgName: (id: string) => string,
) {
  downloadCsv(
    `magenta-${label}-${csvStamp()}.csv`,
    toCsv(
      [
        "Organization",
        "Application",
        "Business",
        "Funded",
        "Rate",
        "Commission",
        "Status",
        "Paid On",
        "Reference",
      ],
      rows.map((r) => [
        orgName(r.organization_id),
        r.application?.reference ?? "",
        r.application?.legal_business_name ?? "",
        Number(r.funded_amount ?? 0),
        `${r.rate_percent}%`,
        Number(r.amount ?? 0),
        COMMISSION_STATUS[r.status].label,
        r.paid_at ?? "",
        r.payment_reference ?? "",
      ]),
    ),
  );
}

interface CommissionListProps {
  rows: CommissionRow[];
  loading?: boolean;
  isAdmin: boolean;
  /** Resolves an organization id to a display name. */
  orgName: (id: string) => string;
  /** Link the organization name through to the partner page. */
  linkOrganization?: boolean;
  /** Show bulk approve / mark paid / payout-run export controls. */
  enableBulk?: boolean;
  emptyMessage?: string;
  onRefresh: () => Promise<void>;
}

/** Internal commission statement with admin overrides and optional bulk actions. */
export function CommissionList({
  rows,
  loading = false,
  isAdmin,
  orgName,
  linkOrganization = false,
  enableBulk = false,
  emptyMessage = "No commissions match this filter.",
  onRefresh,
}: CommissionListProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkReference, setBulkReference] = useState("");
  const [editing, setEditing] = useState<CommissionRow | null>(null);

  const visibleIds = rows.map((r) => r.id);
  const selectedRows = rows.filter((r) => selected.includes(r.id));
  const sum = (list: CommissionRow[]) => list.reduce((s, r) => s + Number(r.amount ?? 0), 0);

  const bulk = useMutation({
    mutationFn: async (status: CommissionStatus) => {
      const { error } = await supabase.rpc("partner_bulk_commission_status", {
        _ids: selectedRows.map((r) => r.id),
        _status: status,
        ...(bulkReference.trim() ? { _payment_reference: bulkReference.trim() } : {}),
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: async () => {
      toast.success(
        `${selectedRows.length} commission${selectedRows.length === 1 ? "" : "s"} updated.`,
      );
      setSelected([]);
      setBulkReference("");
      await onRefresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  if (loading) {
    return (
      <div className="card-elevated divide-y divide-border">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-16 animate-pulse bg-muted/40" />
        ))}
      </div>
    );
  }

  return (
    <>
      {isAdmin && enableBulk && rows.length > 0 ? (
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              setSelected(selected.length === visibleIds.length ? [] : visibleIds)
            }
          >
            {selected.length === visibleIds.length ? "Clear Selection" : "Select All"}
          </Button>
          {selected.length > 0 ? (
            <div className="card-elevated bg-brand-wash flex flex-wrap items-center gap-3 p-3">
              <p className="text-sm font-medium">
                {selected.length} selected · {currency(sum(selectedRows))}
              </p>
              <Input
                value={bulkReference}
                onChange={(e) => setBulkReference(e.target.value)}
                placeholder="Payment run reference"
                aria-label="Payment run reference"
                className="h-9 w-52"
              />
              <Button size="sm" disabled={bulk.isPending} onClick={() => bulk.mutate("approved")}>
                Approve
              </Button>
              <Button size="sm" disabled={bulk.isPending} onClick={() => bulk.mutate("paid")}>
                Mark Paid
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  exportCommissionsCsv(selectedRows, "commission-payout-run", orgName)
                }
              >
                <Download className="h-4 w-4" aria-hidden="true" /> Export Payout Run
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      {rows.length === 0 ? (
        <div className="card-elevated p-10 text-center">
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        </div>
      ) : (
        <ul className="grid gap-3">
          {rows.map((r) => (
            <li key={r.id} className="card-elevated flex flex-wrap items-center gap-3 p-4">
              {isAdmin && enableBulk ? (
                <input
                  type="checkbox"
                  className="focus-ring h-4 w-4 rounded border-input"
                  checked={selected.includes(r.id)}
                  onChange={() => toggle(r.id)}
                  aria-label={`Select commission ${r.application?.reference ?? r.id}`}
                />
              ) : null}
              <div className="min-w-[14rem] flex-1">
                <p className="font-medium">
                  {linkOrganization ? (
                    <Link
                      to="/partners/$organizationId"
                      params={{ organizationId: r.organization_id }}
                      className="focus-ring rounded underline-offset-4 hover:underline"
                    >
                      {titleCaseName(orgName(r.organization_id) || "Unknown Organization")}
                    </Link>
                  ) : (
                    titleCaseName(orgName(r.organization_id) || "Unknown Organization")
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  {titleCaseName(r.application?.legal_business_name ?? "—")} ·{" "}
                  <span className="font-mono">{r.application?.reference}</span> ·{" "}
                  {currency(r.funded_amount)} @ {percent(r.rate_percent)}
                </p>
                {r.note ? (
                  <p className="mt-1 text-xs text-muted-foreground italic">{r.note}</p>
                ) : null}
              </div>
              <p className="font-display text-xl">{currency(r.amount)}</p>
              <ToneBadge
                label={COMMISSION_STATUS[r.status].label}
                tone={COMMISSION_STATUS[r.status].tone}
              />
              {r.paid_at ? (
                <span className="text-xs text-muted-foreground">Paid {shortDate(r.paid_at)}</span>
              ) : null}
              {r.payment_reference ? (
                <span className="font-mono text-xs text-muted-foreground">
                  {r.payment_reference}
                </span>
              ) : null}
              {isAdmin ? (
                <Button size="sm" variant="outline" onClick={() => setEditing(r)}>
                  <PencilLine className="h-4 w-4" aria-hidden="true" /> Adjust
                </Button>
              ) : null}
              {r.application_id ? (
                <Button asChild size="sm" variant="secondary">
                  <Link
                    to="/partners/applications/$applicationId"
                    params={{ applicationId: r.application_id }}
                    aria-label={`Open application ${r.application?.reference ?? ""}`}
                  >
                    Open <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <OverrideDialog row={editing} onClose={() => setEditing(null)} onSaved={onRefresh} />
    </>
  );
}

/** Every manual change to a commission requires a note for the audit trail. */
function OverrideDialog({
  row,
  onClose,
  onSaved,
}: {
  row: CommissionRow | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [amount, setAmount] = useState("");
  const [rate, setRate] = useState("");
  const [status, setStatus] = useState<CommissionStatus>("pending");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [key, setKey] = useState<string | null>(null);

  if (row && key !== row.id) {
    setKey(row.id);
    setAmount(String(row.amount ?? ""));
    setRate(String(row.rate_percent ?? ""));
    setStatus(row.status);
    setReference(row.payment_reference ?? "");
    setNote("");
  }

  const save = useMutation({
    mutationFn: async () => {
      if (!row) return;
      if (!note.trim()) throw new Error("A note is required for any manual adjustment.");
      const { error } = await supabase.rpc("partner_override_commission", {
        _commission_id: row.id,
        _note: note.trim(),
        ...(amount ? { _amount: Number(amount) } : {}),
        ...(rate ? { _rate_percent: Number(rate) } : {}),
        _status: status,
        ...(reference.trim() ? { _payment_reference: reference.trim() } : {}),
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: async () => {
      toast.success("Commission adjusted.");
      await onSaved();
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={Boolean(row)} onOpenChange={(open) => (open ? null : onClose())}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Adjust Commission</DialogTitle>
          <DialogDescription>
            {row?.application?.legal_business_name
              ? titleCaseName(row.application.legal_business_name)
              : "Commission"}{" "}
            · funded {currency(row?.funded_amount ?? 0)}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            <span className="text-xs text-muted-foreground">Commission Amount</span>
            <Input
              className="mt-1"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
            />
          </label>
          <label className="text-sm">
            <span className="text-xs text-muted-foreground">Rate %</span>
            <Input
              className="mt-1"
              inputMode="decimal"
              value={rate}
              onChange={(e) => setRate(e.target.value.replace(/[^0-9.]/g, ""))}
            />
          </label>
          <label className="text-sm">
            <span className="text-xs text-muted-foreground">Status</span>
            <select
              className="focus-ring mt-1 h-10 w-full rounded-md border border-input bg-card px-3 text-sm"
              value={status}
              onChange={(e) => setStatus(e.target.value as CommissionStatus)}
            >
              {(Object.keys(COMMISSION_STATUS) as CommissionStatus[]).map((s) => (
                <option key={s} value={s}>
                  {COMMISSION_STATUS[s].label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="text-xs text-muted-foreground">Payment Reference</span>
            <Input
              className="mt-1"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
          </label>
        </div>

        <label className="text-sm">
          <span className="text-xs text-muted-foreground">Reason (required)</span>
          <Input
            className="mt-1"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Why is this commission being adjusted?"
          />
        </label>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={save.isPending} onClick={() => save.mutate()}>
            {save.isPending ? "Saving…" : "Save Adjustment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
