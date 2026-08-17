"use client";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export interface AvatarGroupItem {
  id: string;
  name: string;
  image?: string;
}

interface AvatarGroupProps {
  items: AvatarGroupItem[];
  max?: number;
  size?: number;
  className?: string;
  onClick?: () => void;
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

/** Overlapping avatar stack (Origin UI style). */
export function AvatarGroup({
  items,
  max = 4,
  size = 40,
  className,
  onClick,
  showOverflowBadge = true,
}: AvatarGroupProps & { showOverflowBadge?: boolean }) {
  const visibleCount = showOverflowBadge && items.length > max ? max - 1 : max;
  const visible = items.slice(0, Math.max(1, visibleCount));
  const overflow = Math.max(0, items.length - visible.length);

  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={cn("flex -space-x-2 outline-none", onClick && "cursor-pointer", className)}
      aria-label="Profiles"
    >
      {visible.map((item, index) => (
        <Avatar
          key={item.id}
          className="ring-2 ring-white border border-[#E5D5C5]/80"
          style={{ width: size, height: size, zIndex: index + 1 }}
        >
          {item.image ? (
            <AvatarImage src={item.image} alt={item.name} />
          ) : null}
          <AvatarFallback
            className="bg-[#721515] text-[10px] font-bold text-white"
            style={{ fontSize: Math.max(9, size * 0.28) }}
          >
            {getInitials(item.name) || "??"}
          </AvatarFallback>
        </Avatar>
      ))}
      {(overflow > 0 || (showOverflowBadge && items.length === 0)) && (
        <Avatar
          className="ring-2 ring-white border border-[#E5D5C5]/80"
          style={{ width: size, height: size, zIndex: visible.length + 1 }}
        >
          <AvatarFallback className="bg-white text-[10px] font-semibold text-neutral-900">
            +{overflow > 0 ? (overflow > 99 ? 99 : overflow) : 0}
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}

/** Demo stack with Unsplash portraits. */
export function AvatarGroupDemo() {
  return (
    <div className="flex -space-x-3">
      <img
        className="rounded-full ring-2 ring-background"
        src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=80&q=80"
        width={40}
        height={40}
        alt="Avatar 01"
      />
      <img
        className="rounded-full ring-2 ring-background"
        src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=80&q=80"
        width={40}
        height={40}
        alt="Avatar 02"
      />
      <img
        className="rounded-full ring-2 ring-background"
        src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=80&q=80"
        width={40}
        height={40}
        alt="Avatar 03"
      />
      <img
        className="rounded-full ring-2 ring-background"
        src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=80&q=80"
        width={40}
        height={40}
        alt="Avatar 04"
      />
    </div>
  );
}

export { AvatarGroupDemo as Component };
