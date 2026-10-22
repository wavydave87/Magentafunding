import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Eye, PenLine, LogOut } from "lucide-react";
import { toast } from "sonner";

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
import { usePartnerView } from "@/hooks/use-partner-view";
import { exitPartnerView, setPartnerViewMode } from "@/lib/partner-view.functions";
import { MEMBER_ROLE_LABEL, type PartnerMemberRole } from "@/lib/partner";

/**
 * Unmistakable, always-visible reminder that this portal is being viewed by
 * Magenta on behalf of a partner — who the partner is, which organization,
 * which role, whether changes are possible, and which administrator is here.
 */
export function PartnerViewBanner() {
  const { data: session } = usePartnerView();
  const queryClient = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  if (!session) return null;

  const working = session.mode === "work";

  async function switchMode(mode: "view" | "work", why?: string) {
    setBusy(true);
    try {
      await setPartnerViewMode({ data: why ? { mode, reason: why } : { mode } });
      queryClient.clear();
      window.location.reload();
      setConfirmOpen(false);
      setReason("");
      toast.success(mode === "work" ? "Working as this partner." : "Back to read-only.");
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function exit() {
    setBusy(true);
    try {
      const result = (await exitPartnerView()) as { returnPath: string };
      queryClient.clear();
      window.location.href = result.returnPath || "/partners";
    } catch (error) {
      toast.error((error as Error).message);
      setBusy(false);
    }
  }

  return (
    <>
      <div
        role="status"
        className={
          working
            ? "border-b border-destructive/40 bg-destructive text-destructive-foreground"
            : "border-b border-amber-500/40 bg-amber-500/15 text-foreground"
        }
      >
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2 text-xs sm:px-6 sm:text-sm">
          <span className="inline-flex items-center gap-1.5 font-semibold">
            {working ? (
              <PenLine className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Eye className="h-4 w-4" aria-hidden="true" />
            )}
            {working ? "Working as partner" : "Viewing as partner (read-only)"}
          </span>
          <span className="min-w-0 truncate">
            {session.memberName} · {session.organizationName} ·{" "}
            {MEMBER_ROLE_LABEL[session.role as PartnerMemberRole] ?? session.role}
          </span>
          <span className="truncate opacity-80">
            Magenta admin: {session.adminEmail ?? "signed-in administrator"}
          </span>
          <div className="ml-auto flex items-center gap-2">
            {working ? (
              <Button
                size="sm"
                variant="secondary"
                disabled={busy}
                onClick={() => void switchMode("view")}
              >
                Back To Read-Only
              </Button>
            ) : (
              <Button size="sm" variant="secondary" onClick={() => setConfirmOpen(true)}>
                Work As Partner
              </Button>
            )}
            <Button size="sm" variant="outline" disabled={busy} onClick={() => void exit()}>
              <LogOut className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
              Exit
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Work as {session.memberName}?</DialogTitle>
            <DialogDescription>
              Changes you make will be saved to {session.organizationName} and recorded as made by
              Magenta on behalf of this partner. You can only do what this partner role could do
              themselves.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="partner-view-reason">
              Reason
            </label>
            <Input
              id="partner-view-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Recording a referral the partner phoned in"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={busy || reason.trim().length < 3}
              onClick={() => void switchMode("work", reason.trim())}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
