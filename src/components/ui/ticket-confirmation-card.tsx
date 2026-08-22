"use client";

import * as React from "react";
import { CheckCircle2, Church, QrCode } from "lucide-react";
import { cn } from "@/lib/utils";

const DashedLine = () => (
  <div
    className="w-full border-t-2 border-dashed border-border"
    aria-hidden="true"
  />
);

const QrPass = ({ value }: { value: string }) => {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(value)}&bgcolor=ffffff&color=000000`;

  return (
    <div className="flex flex-col items-center py-2">
      <div className="rounded-xl border border-border/50 bg-white p-3 shadow-sm">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={qrUrl}
          alt={`QR pass ${value}`}
          width={168}
          height={168}
          className="h-[168px] w-[168px] object-contain"
        />
      </div>
      <p className="mt-2 max-w-full truncate px-2 font-mono text-[11px] tracking-wide text-muted-foreground">
        {value}
      </p>
    </div>
  );
};

const ConfettiExplosion = () => {
  const confettiCount = 100;
  const colors = ["#8B2323", "#3b82f6", "#22c55e", "#eab308", "#8b5cf6", "#f97316"];

  return (
    <>
      <style>
        {`
          @keyframes fall {
            0% {
                transform: translateY(-10vh) rotate(0deg);
                opacity: 1;
            }
            100% {
              transform: translateY(110vh) rotate(720deg);
              opacity: 0;
            }
          }
        `}
      </style>
      <div className="pointer-events-none fixed inset-0 z-[60]" aria-hidden="true">
        {Array.from({ length: confettiCount }).map((_, i) => (
          <div
            key={i}
            className="absolute h-4 w-2"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${-20 + Math.random() * 10}%`,
              backgroundColor: colors[i % colors.length],
              transform: `rotate(${Math.random() * 360}deg)`,
              animation: `fall ${2.5 + Math.random() * 2.5}s ${Math.random() * 2}s linear forwards`,
            }}
          />
        ))}
      </div>
    </>
  );
};

export interface TicketProps extends React.HTMLAttributes<HTMLDivElement> {
  ticketId: string;
  amount?: number;
  date: Date;
  cardHolder: string;
  last4Digits?: string;
  barcodeValue: string;
  icon?: React.ReactNode;
  campusName?: string;
  phone?: string;
  whatsapp?: string;
  gender?: string;
  birthday?: string;
  maritalStatus?: string;
  email?: string;
  statusLabel?: string;
  celebrate?: boolean;
  eventTitle?: string;
  extraFields?: { label: string; value: string }[];
}

const AnimatedTicket = React.forwardRef<HTMLDivElement, TicketProps>(
  (
    {
      className,
      ticketId: _ticketId,
      amount,
      date,
      cardHolder,
      last4Digits,
      barcodeValue,
      campusName,
      phone,
      whatsapp,
      gender,
      birthday,
      maritalStatus,
      email,
      statusLabel = "Pending approval",
      celebrate = true,
      eventTitle,
      extraFields,
      ...props
    },
    ref
  ) => {
    const [showConfetti, setShowConfetti] = React.useState(false);

    React.useEffect(() => {
      if (!celebrate) return;
      const mountTimer = setTimeout(() => setShowConfetti(true), 100);
      const unmountTimer = setTimeout(() => setShowConfetti(false), 6000);
      return () => {
        clearTimeout(mountTimer);
        clearTimeout(unmountTimer);
      };
    }, [celebrate]);

    const formattedAmount =
      typeof amount === "number"
        ? new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
          }).format(amount)
        : null;

    const formattedDate = new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
      .format(date)
      .replace(",", " •");

    const formattedBirthday = birthday
      ? new Intl.DateTimeFormat("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }).format(new Date(`${birthday}T00:00:00`))
      : null;

    return (
      <>
        {showConfetti && <ConfettiExplosion />}
        <div
          ref={ref}
          className={cn(
            "relative z-10 w-full max-w-sm rounded-2xl bg-card font-sans text-card-foreground shadow-lg",
            "animate-in fade-in-0 zoom-in-95 duration-500",
            className
          )}
          {...props}
        >
          <div className="absolute -left-4 top-1/2 h-8 w-8 -translate-y-1/2 rounded-full bg-background" />
          <div className="absolute -right-4 top-1/2 h-8 w-8 -translate-y-1/2 rounded-full bg-background" />

          <div className="flex flex-col items-center p-8 text-center">
            <div className="animate-in zoom-in-50 rounded-full bg-primary/10 p-3 delay-300 duration-500">
              <CheckCircle2 className="h-10 w-10 text-primary animate-in zoom-in-75 delay-500 duration-500" />
            </div>
            <h1 className="mt-4 text-2xl font-semibold">Thank you!</h1>
            <p className="mt-1 text-muted-foreground">
              {eventTitle
                ? `Your registration for ${eventTitle} has been issued successfully`
                : "Your registration has been submitted successfully"}
            </p>
          </div>

          <div className="space-y-6 px-8 pb-8">
            <DashedLine />

            <div className="text-center">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {formattedAmount ? "Amount" : "Status"}
              </p>
              <p className="text-lg font-semibold">
                {formattedAmount || statusLabel}
              </p>
            </div>

            <div>
              <p className="text-xs uppercase text-muted-foreground">Date & Time</p>
              <p className="font-medium">{formattedDate}</p>
            </div>

            <div className="flex items-center space-x-4 rounded-lg bg-muted/50 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Church className="h-5 w-5" />
              </div>
              <div className="min-w-0 text-left">
                <p className="font-semibold">{cardHolder}</p>
                <p className="truncate text-sm text-muted-foreground">
                  {campusName || (last4Digits ? `•••• ${last4Digits}` : "Grace Community")}
                </p>
                {phone ? (
                  <p className="font-mono text-sm tracking-wider text-muted-foreground">
                    {phone}
                    {whatsapp && whatsapp !== phone ? ` · WA ${whatsapp}` : ""}
                  </p>
                ) : null}
              </div>
            </div>

            {(email || gender || formattedBirthday || maritalStatus || (extraFields && extraFields.length > 0)) && (
              <div className="grid grid-cols-2 gap-3 text-left text-sm">
                {email ? (
                  <div className="col-span-2">
                    <p className="text-xs uppercase text-muted-foreground">Email</p>
                    <p className="break-all font-medium">{email}</p>
                  </div>
                ) : null}
                {gender ? (
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Gender</p>
                    <p className="font-medium capitalize">{gender}</p>
                  </div>
                ) : null}
                {formattedBirthday ? (
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Birthday</p>
                    <p className="font-medium">{formattedBirthday}</p>
                  </div>
                ) : null}
                {maritalStatus ? (
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Marital status</p>
                    <p className="font-medium capitalize">{maritalStatus}</p>
                  </div>
                ) : null}
                {extraFields?.map((field) => (
                  <div key={field.label} className="col-span-2">
                    <p className="text-xs uppercase text-muted-foreground">{field.label}</p>
                    <p className="font-medium">{field.value}</p>
                  </div>
                ))}
              </div>
            )}

            <DashedLine />

            <div className="flex items-center justify-center gap-2 text-primary">
              <QrCode className="h-4 w-4" />
              <span className="text-xs font-bold uppercase tracking-widest">ePass QR</span>
            </div>
            <QrPass value={barcodeValue} />
          </div>
        </div>
      </>
    );
  }
);

AnimatedTicket.displayName = "AnimatedTicket";

export { AnimatedTicket };
