"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type DeleteAccountDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void | Promise<void>;
  loading?: boolean;
};

export function DeleteAccountDialog({
  open,
  onOpenChange,
  onConfirm,
  loading = false,
}: DeleteAccountDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="rounded-2xl border-[#E5D5C5] bg-[#FAF7F2] max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-[#1A202C]">Delete account?</AlertDialogTitle>
          <AlertDialogDescription className="text-[#7A6150]">
            This permanently deletes your Grace Connect account and family profiles
            linked to it. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-2">
          <AlertDialogCancel
            disabled={loading}
            className="rounded-xl border-[#E5D5C5] mt-0"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={loading}
            className="rounded-xl bg-red-600 hover:bg-red-700 text-white"
            onClick={(e) => {
              e.preventDefault();
              void onConfirm();
            }}
          >
            {loading ? "Deleting…" : "Delete Account"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
