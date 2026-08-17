"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkles } from "lucide-react";
import { HIGHLIGHT_DURATION_OPTIONS } from "@/lib/highlight-utils";

type HighlightPublishOptionsProps = {
  showOnHighlight: boolean;
  highlightDurationHours: number;
  onShowChange: (show: boolean) => void;
  onDurationChange: (hours: number) => void;
  className?: string;
};

export function HighlightPublishOptions({
  showOnHighlight,
  highlightDurationHours,
  onShowChange,
  onDurationChange,
  className = "",
}: HighlightPublishOptionsProps) {
  return (
    <div
      className={`rounded-2xl border border-[#E5D5C5]/60 bg-white p-4 space-y-4 shadow-sm ${className}`}
    >
      <div className="flex items-start gap-3">
        <Checkbox
          id="show-on-highlight"
          checked={showOnHighlight}
          onCheckedChange={(checked) => onShowChange(checked === true)}
          className="mt-0.5"
        />
        <div className="space-y-0.5 min-w-0 flex-1">
          <Label
            htmlFor="show-on-highlight"
            className="text-sm font-bold text-[#1A202C] flex items-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-[#8B2323]" />
            Show on Highlights
          </Label>
          <p className="text-xs text-[#7A6150]">
            Optional — feature this on the home Highlights card stack for a limited time.
          </p>
        </div>
      </div>

      {showOnHighlight && (
        <div className="pl-7 space-y-2">
          <Label className="text-xs text-muted-foreground">How long should it stay?</Label>
          <Select
            value={String(highlightDurationHours)}
            onValueChange={(v) => {
              const parsed = parseInt(v, 10);
              onDurationChange(Number.isFinite(parsed) ? parsed : 24);
            }}
          >
            <SelectTrigger className="h-10 rounded-xl bg-[#FAF7F2] border-[#E5D5C5]/60">
              <SelectValue placeholder="Select duration" />
            </SelectTrigger>
            <SelectContent>
              {HIGHLIGHT_DURATION_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={String(opt.value)}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[10px] text-[#7A6150]">
            {highlightDurationHours === 0
              ? 'This item will stay on Highlights until you turn it off or unpublish it.'
              : 'Timer starts when you publish or save. After it ends, the item leaves Highlights automatically.'}
          </p>
        </div>
      )}
    </div>
  );
}
