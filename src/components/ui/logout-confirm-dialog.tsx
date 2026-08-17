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

type LogoutConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void | Promise<void>;
  loading?: boolean;
};

export function LogoutConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  loading = false,
}: LogoutConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="rounded-2xl border-[#E5D5C5] bg-[#FAF7F2] max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-[#1A202C]">Sign out?</AlertDialogTitle>
          <AlertDialogDescription className="text-[#7A6150]">
            Are you sure you want to sign out of Grace Connect?
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
            {loading ? "Signing out…" : "Sign Out"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
