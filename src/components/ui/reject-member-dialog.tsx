"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { REJECTION_REASONS } from "@/lib/rejection-reasons";

export interface RejectMemberPayload {
  rejectionReason: string;
  rejectionNote?: string;
}

interface RejectMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberName?: string;
  loading?: boolean;
  onConfirm: (payload: RejectMemberPayload) => void | Promise<void>;
}

export function RejectMemberDialog({
  open,
  onOpenChange,
  memberName,
  loading = false,
  onConfirm,
}: RejectMemberDialogProps) {
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!open) {
      setReason("");
      setNote("");
    }
  }, [open]);

  const canSubmit =
    !!reason && (reason !== "other" || note.trim().length > 0) && !loading;

  const handleConfirm = async () => {
    if (!canSubmit) return;
    await onConfirm({
      rejectionReason: reason,
      rejectionNote: reason === "other" ? note.trim() : undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle>Reject registration</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-1">
          <p className="text-sm text-muted-foreground">
            {memberName
              ? `Choose why you’re rejecting ${memberName}. They’ll see this reason if they try to sign in.`
              : "Choose why this registration is being rejected. The person will see this reason if they try to sign in."}
          </p>

          <div className="space-y-2">
            <Label>Reason *</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {REJECTION_REASONS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {reason === "other" && (
            <div className="space-y-2">
              <Label>Please specify *</Label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Type the reason…"
                className="min-h-[80px] rounded-xl text-sm"
              />
            </div>
          )}
        </div>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            className="rounded-full"
            disabled={loading}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="rounded-full"
            disabled={!canSubmit}
            onClick={handleConfirm}
          >
            {loading ? "Rejecting…" : "Reject"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
