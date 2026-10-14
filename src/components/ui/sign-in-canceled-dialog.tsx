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
  sha1,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  provider?: string;
  sha1?: string;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="rounded-2xl border-[#E5D5C5] bg-[#FAF7F2] max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-[#1A202C]">{provider} sign-in canceled</AlertDialogTitle>
          <AlertDialogDescription className="text-[#7A6150] space-y-2">
            <span>You canceled {provider} sign-in. You can try again whenever you are ready.</span>
            {sha1 && (
              <span className="block text-[11px] text-[#7A6150] mt-2 p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-left">
                <span className="font-semibold block text-[#8B2323]">Didn't cancel?</span>
                Add this app's SHA-1 fingerprint to Firebase Console:
                <code className="block font-mono text-[10px] text-[#1A202C] mt-1 p-1 bg-white/70 rounded select-all break-all font-bold">
                  {sha1}
                </code>
              </span>
            )}
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
