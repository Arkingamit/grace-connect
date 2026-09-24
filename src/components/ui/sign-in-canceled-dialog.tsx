"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function SignInCanceledDialog({
  open,
  onOpenChange,
  provider = "Google",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  provider?: string;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="rounded-2xl border-[#E5D5C5] bg-[#FAF7F2] max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-[#1A202C]">{provider} sign-in canceled</AlertDialogTitle>
          <AlertDialogDescription className="text-[#7A6150]">
            You canceled {provider} sign-in. You can try again whenever you are ready.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction
            className="rounded-full bg-[#810008] hover:bg-[#721515]"
            onClick={() => onOpenChange(false)}
          >
            OK
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
