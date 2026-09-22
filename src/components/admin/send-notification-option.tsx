"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Bell } from "lucide-react";

type SendNotificationOptionProps = {
  checked: boolean;
  onChange: (send: boolean) => void;
  description?: string;
  className?: string;
  id?: string;
};

export function SendNotificationOption({
  checked,
  onChange,
  description = "Members will get a push and in-app alert. Leave unchecked to publish quietly.",
  className = "",
  id = "send-notification",
}: SendNotificationOptionProps) {
  return (
    <div
      className={`rounded-2xl border border-[#E5D5C5]/60 bg-white p-4 shadow-sm ${className}`}
    >
      <div className="flex items-start gap-3">
        <Checkbox
          id={id}
          checked={checked}
          onCheckedChange={(value) => onChange(value === true)}
          className="mt-0.5"
        />
        <div className="space-y-0.5 min-w-0 flex-1">
          <Label
            htmlFor={id}
            className="text-sm font-bold text-[#1A202C] flex items-center gap-2 cursor-pointer"
          >
            <Bell className="w-4 h-4 text-[#8B2323]" />
            Send notification
          </Label>
          <p className="text-xs text-[#7A6150]">{description}</p>
        </div>
      </div>
    </div>
  );
}
