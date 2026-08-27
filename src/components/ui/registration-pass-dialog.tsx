"use client";

import * as React from "react";
import { QrCode } from "lucide-react";
import { AnimatedTicket } from "@/components/ui/ticket-confirmation-card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  loadRegistrationPass,
  registrationDisplayName,
  type RegistrationPass,
} from "@/lib/registration-pass";
import { cn } from "@/lib/utils";

function ticketFromPass(pass: RegistrationPass) {
  return {
    ticketId: `GR-${pass.userId.slice(-8).toUpperCase()}`,
    date: new Date(pass.submittedAt),
    cardHolder: registrationDisplayName(pass),
    barcodeValue: pass.qrCode,
    campusName: pass.campusName,
    phone: pass.phone,
    whatsapp: pass.whatsapp,
    gender: pass.gender,
    birthday: pass.birthday,
    maritalStatus: pass.maritalStatus,
    email: pass.email,
    statusLabel: "Registered",
  };
}

export function RegistrationPassDialog({
  pass,
  open,
  onOpenChange,
  celebrate = false,
}: {
  pass: RegistrationPass;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  celebrate?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal={false}>
      <DialogContent
        className="pointer-events-auto max-h-[90dvh] max-w-md overflow-y-auto border-0 bg-transparent p-0 shadow-none sm:rounded-2xl"
        overlayClassName="pointer-events-none"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Registration confirmation</DialogTitle>
        </DialogHeader>
        <div className="flex justify-center px-2 py-4">
          <AnimatedTicket {...ticketFromPass(pass)} celebrate={celebrate} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ViewRegistrationPassButton({
  className,
  variant = "outline",
}: {
  className?: string;
  variant?: "outline" | "default";
}) {
  const [pass, setPass] = React.useState<RegistrationPass | null>(null);
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    setPass(loadRegistrationPass());
  }, []);

  if (!pass) return null;

  return (
    <>
      <Button
        type="button"
        variant={variant}
        className={cn("gap-2", className)}
        onClick={() => setOpen(true)}
      >
        <QrCode className="h-4 w-4" />
        View confirmation card
      </Button>
      <RegistrationPassDialog pass={pass} open={open} onOpenChange={setOpen} />
    </>
  );
}

export { ticketFromPass };
