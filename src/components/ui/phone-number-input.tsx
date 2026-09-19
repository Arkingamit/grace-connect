"use client";

import { useEffect, useState } from "react";
import { ContactRound, Phone } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  contactsPickerAvailable,
  formatPhoneNumber,
  selectPhoneFromContacts,
} from "@/lib/phone";

type PhoneNumberInputProps = {
  id: string;
  name?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
  autoComplete?: string;
};

export function PhoneNumberInput({
  id,
  name = "tel",
  value,
  onChange,
  placeholder = "+91 99999 99999",
  className,
  required,
  autoComplete = "tel",
}: PhoneNumberInputProps) {
  const [canPickContact, setCanPickContact] = useState(false);

  useEffect(() => {
    void contactsPickerAvailable().then(setCanPickContact);
  }, []);

  return (
    <div className="relative">
      <Input
        id={id}
        name={name}
        type="tel"
        inputMode="tel"
        autoComplete={autoComplete}
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        enterKeyHint="next"
        required={required}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(formatPhoneNumber(e.target.value))}
        onBlur={(e) => onChange(formatPhoneNumber(e.target.value))}
        className={cn("pl-9", canPickContact && "pr-11", className)}
      />
      <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      {canPickContact ? (
        <button
          type="button"
          className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-[#8B2323] hover:bg-[#FBE8E8]"
          aria-label="Fill from contacts"
          onClick={async () => {
            try {
              const picked = await selectPhoneFromContacts();
              if (picked) onChange(picked);
            } catch {
              // User canceled the picker
            }
          }}
        >
          <ContactRound className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}
