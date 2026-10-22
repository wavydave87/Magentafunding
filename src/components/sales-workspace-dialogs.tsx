import { useEffect, useState } from "react";
import { CalendarClock, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface SaveViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (name: string) => void;
}

export function SaveViewDialog({ open, onOpenChange, onSave }: SaveViewDialogProps) {
  const [name, setName] = useState("");

  useEffect(() => {
    if (!open) setName("");
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save This View</DialogTitle>
          <DialogDescription>Save the current filters and sorting for quick access later.</DialogDescription>
        </DialogHeader>
        <div>
          <label htmlFor="saved-view-name" className="text-sm font-medium text-foreground">View Name</label>
          <Input
            id="saved-view-name"
            value={name}
            onChange={(event) => setName(event.target.value.slice(0, 40))}
            placeholder="Closing This Week"
            className="mt-2"
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={!name.trim()} onClick={() => { onSave(name.trim()); onOpenChange(false); }}>
            <Save className="size-4" /> Save View
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface FollowUpDialogProps {
  open: boolean;
  merchantName: string;
  existing?: { dueAt: string; note: string | null } | null;
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (dueAt: string, note: string) => void;
}

function defaultDueAt() {
  const value = new Date(Date.now() + 86400000);
  value.setHours(9, 0, 0, 0);
  const local = new Date(value.getTime() - value.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

export function FollowUpDialog({ open, merchantName, existing, saving, onOpenChange, onSave }: FollowUpDialogProps) {
  const [dueAt, setDueAt] = useState(defaultDueAt);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!open) return;
    if (existing) {
      const date = new Date(existing.dueAt);
      const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
      setDueAt(local.toISOString().slice(0, 16));
      setNote(existing.note ?? "");
    } else {
      setDueAt(defaultDueAt());
      setNote("");
    }
  }, [existing, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{existing ? "Update" : "Set"} Follow-Up</DialogTitle>
          <DialogDescription>Keep {merchantName} visible until the next action is complete.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div>
            <label htmlFor="follow-up-due" className="text-sm font-medium text-foreground">Due Date And Time</label>
            <Input id="follow-up-due" type="datetime-local" value={dueAt} min={new Date().toISOString().slice(0, 16)} onChange={(event) => setDueAt(event.target.value)} className="mt-2" />
          </div>
          <div>
            <label htmlFor="follow-up-note" className="text-sm font-medium text-foreground">Note</label>
            <Textarea id="follow-up-note" value={note} maxLength={500} onChange={(event) => setNote(event.target.value)} placeholder="Call to review the requested funding date" className="mt-2 min-h-24" />
            <p className="mt-1 text-right text-xs text-muted-foreground">{note.length}/500</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={!dueAt || saving} onClick={() => onSave(new Date(dueAt).toISOString(), note.trim())}>
            <CalendarClock className="size-4" /> {saving ? "Saving…" : "Save Follow-Up"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}