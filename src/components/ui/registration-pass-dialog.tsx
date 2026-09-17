"use client";

import * as React from "react";
import { Clock, QrCode } from "lucide-react";
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
import { useAuth } from "@/lib/auth-context";
import { useAdminData } from "@/lib/admin-data-context";
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

export function PendingApprovalCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "w-full rounded-2xl border border-[#E5D5C5]/80 bg-white px-4 py-4 text-center shadow-sm",
        className,
      )}
    >
      <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-[#FBE8E8] text-[#8B2323]">
        <Clock className="h-5 w-5" />
      </div>
      <h3 className="text-sm font-semibold text-[#1A202C]">Approval pending</h3>
      <p className="mt-1 text-xs leading-relaxed text-[#7A6150]">
        Your campus leader hasn&apos;t approved your registration yet. Community features
        will unlock after they review your request.
      </p>
    </div>
  );
}

export function PendingMemberEpass({ className }: { className?: string }) {
  const { session, getSessionMember, isLoading } = useAuth();
  const { campuses } = useAdminData();
  const member = getSessionMember();
  const [pass, setPass] = React.useState<RegistrationPass | null>(null);

  React.useEffect(() => {
    if (!session || !member || member.status !== "pending") {
      setPass(null);
      return;
    }

    const stored = loadRegistrationPass();
    if (stored && stored.userId === session.memberId) {
      setPass(stored);
      return;
    }

    const campusName =
      campuses.find((campus) => campus.id === member.campusId)?.name ||
      member.campusId ||
      "Grace Community";

    setPass({
      userId: session.memberId,
      qrCode: member.qrCode || session.memberId,
      firstName: member.firstName,
      middleName: member.middleName,
      lastName: member.lastName,
      campusId: member.campusId,
      campusName,
      phone: member.phone || "",
      whatsapp: member.whatsapp,
      gender: member.gender,
      birthday: member.birthday,
      maritalStatus: member.maritalStatus,
      email: member.email,
      submittedAt: member.createdAt || new Date().toISOString(),
    });
  }, [
    session,
    member?.status,
    member?.qrCode,
    member?.firstName,
    member?.lastName,
    member?.campusId,
    member?.email,
    campuses,
  ]);

  if (isLoading || !pass) return null;

  return (
    <div className={cn("flex justify-center", className)}>
      <AnimatedTicket {...ticketFromPass(pass)} celebrate={false} showQr={false} />
    </div>
  );
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
        <div className="flex flex-col items-center gap-3 px-2 py-4">
          <AnimatedTicket {...ticketFromPass(pass)} celebrate={celebrate} />
          <Button
            type="button"
            onClick={() => onOpenChange(false)}
            className="w-full max-w-sm bg-[#8B2323] hover:bg-[#721515] text-white"
          >
            Close
          </Button>
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
  const { session, getSessionMember, isLoading } = useAuth();
  const member = getSessionMember();
  const [pass, setPass] = React.useState<RegistrationPass | null>(null);
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    setPass(loadRegistrationPass());
  }, [session?.memberId]);

  if (isLoading || !session) return null;

  if (member?.status === "pending") {
    return <PendingApprovalCard />;
  }

  if (member?.status === "rejected" || !pass) return null;
  if (pass.userId && pass.userId !== session.memberId) return null;

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
