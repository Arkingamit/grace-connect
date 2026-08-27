"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "./avatar";
import { AvatarGroup } from "./avatar-group";
import { QrCode, UserPlus, LogOut, User, Trash2 } from "lucide-react";
import { AddFamilyMemberDialog } from "./add-family-member-dialog";
import { LogoutConfirmDialog } from "./logout-confirm-dialog";
import { DeleteAccountDialog } from "./delete-account-dialog";
import { resolveMemberAvatar } from "@/lib/avatar-storage";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

type ProfileSwitcherProps = {
  /** `pill` = avatar + first name (desktop nav). `avatar` = circle only (mobile header). */
  variant?: "pill" | "avatar";
  className?: string;
  align?: "start" | "center" | "end";
};

export function ProfileSwitcher({
  variant = "pill",
  className,
  align = "end",
}: ProfileSwitcherProps) {
  const router = useRouter();
  const { session, getSessionMember, linkedProfiles, logout, deleteAccount } = useAuth();
  const activeMember = getSessionMember();
  const [isAdding, setIsAdding] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [hasActiveSession, setHasActiveSession] = useState(false);
  const [activePhoto, setActivePhoto] = useState<string | null>(null);

  useEffect(() => {
    if (session) {
      fetch("/api/attendance/active?all=true")
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data) && data.length > 0) {
            setHasActiveSession(true);
          }
        })
        .catch(() => {});
    }
  }, [session]);

  useEffect(() => {
    if (!activeMember?.id) {
      setActivePhoto(null);
      return;
    }
    setActivePhoto(resolveMemberAvatar(activeMember.id, activeMember.avatar) || null);
  }, [activeMember?.id, activeMember?.avatar]);

  const familyStackItems = useMemo(() => {
    if (!session) return [];

    const primary = {
      id: session.memberId,
      name: session.name || "You",
      image: resolveMemberAvatar(session.memberId, session.avatar) || undefined,
    };

    const linked = linkedProfiles.map((profile) => ({
      id: profile.id,
      name:
        profile.name ||
        `${profile.firstName} ${profile.lastName}`.trim() ||
        "Family Member",
      image: resolveMemberAvatar(profile.id, profile.avatar) || undefined,
    }));

    const all = [primary, ...linked];
    return all.filter(
      (item, index, arr) => arr.findIndex((x) => x.id === item.id) === index,
    );
  }, [session, linkedProfiles, activePhoto]);

  if (!session || !activeMember) return null;

  const displayName =
    (activeMember as { name?: string }).name ||
    `${activeMember.firstName} ${activeMember.lastName}`;
  const firstName = displayName.split(/\s+/)[0] || "You";

  const isAdmin = [
    "admin",
    "superadmin",
    "super_admin",
    "staff",
    "group_leader",
    "campus_leader",
  ].includes(session.role?.toLowerCase() || "");

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              "outline-none focus-visible:ring-2 focus-visible:ring-[#8B2323]/40 transition-colors",
              variant === "pill"
                ? "flex items-center gap-2 rounded-full border border-[#E5D5C5]/80 bg-[#FAF7F2] px-2 py-1.5 hover:bg-[#F3EAE1]"
                : "rounded-full",
              className,
            )}
            aria-label="Open profile menu"
          >
            <Avatar
              className={cn(
                "border border-[#E5D5C5]/60 shadow-sm",
                variant === "pill" ? "h-7 w-7" : "h-10 w-10",
              )}
            >
              {activePhoto ? (
                <AvatarImage src={activePhoto} alt={displayName} className="object-cover" />
              ) : null}
              <AvatarFallback
                className={cn(
                  "font-bold",
                  variant === "pill"
                    ? "bg-[#F3EAE1] text-[10px] text-[#1A202C]"
                    : "bg-[#721515] text-xs text-white",
                )}
              >
                {getInitials(displayName) || "??"}
              </AvatarFallback>
            </Avatar>
            {variant === "pill" && (
              <span className="max-w-[88px] truncate pr-1 text-sm font-medium text-[#1A202C]">
                {firstName}
              </span>
            )}
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align={align}
          className="w-64 rounded-xl border-[#E5D5C5] bg-white p-1.5 shadow-xl"
        >
          <DropdownMenuLabel className="px-2.5 py-2 font-normal">
            <p className="truncate text-xs text-[#7A6150]">{session.email}</p>
          </DropdownMenuLabel>

          <DropdownMenuSeparator className="bg-[#E5D5C5]/60" />

          {hasActiveSession && (
            <DropdownMenuItem asChild className="cursor-pointer rounded-lg font-semibold text-[#8B2323]">
              <Link href="/profile" className="flex w-full items-center gap-2">
                <QrCode className="h-4 w-4" /> My ePass
              </Link>
            </DropdownMenuItem>
          )}

          {isAdmin && (
            <DropdownMenuItem asChild className="cursor-pointer rounded-lg text-[#1A202C]">
              <Link href="/admin" className="flex w-full items-center">
                Admin Panel
              </Link>
            </DropdownMenuItem>
          )}

          <DropdownMenuItem asChild className="cursor-pointer rounded-lg text-[#1A202C]">
            <Link href="/profile" className="flex w-full items-center gap-2">
              <User className="h-4 w-4 text-[#7A6150]" /> Profile
            </Link>
          </DropdownMenuItem>

          <DropdownMenuSeparator className="bg-[#E5D5C5]/60" />

          <DropdownMenuItem
            onClick={() => router.push("/select-profile")}
            className="cursor-pointer gap-3 rounded-lg py-2.5 text-[#1A202C]"
          >
            <AvatarGroup
              items={familyStackItems}
              max={4}
              size={28}
              showOverflowBadge
              className="pointer-events-none shrink-0"
            />
            <span className="text-sm font-medium">Switch Profile</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => setIsAdding(true)}
            className="cursor-pointer gap-2 rounded-lg text-[#1A202C]"
          >
            <UserPlus className="h-4 w-4 text-[#7A6150]" />
            <span className="text-sm">Add Member</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator className="bg-[#E5D5C5]/60" />

          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              setLogoutConfirmOpen(true);
            }}
            className="cursor-pointer rounded-lg font-medium text-[#8B2323] focus:bg-[#FBE8E8] focus:text-[#8B2323]"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              setDeleteConfirmOpen(true);
            }}
            className="cursor-pointer rounded-lg font-medium text-red-600 focus:bg-red-50 focus:text-red-700"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Account
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AddFamilyMemberDialog open={isAdding} onOpenChange={setIsAdding} />
      <LogoutConfirmDialog
        open={logoutConfirmOpen}
        onOpenChange={setLogoutConfirmOpen}
        loading={loggingOut}
        onConfirm={async () => {
          setLoggingOut(true);
          try {
            await logout();
            window.location.href = "/";
          } finally {
            setLoggingOut(false);
          }
        }}
      />
      <DeleteAccountDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        loading={deleting}
        onConfirm={async () => {
          setDeleting(true);
          try {
            const result = await deleteAccount();
            if (!result.success) {
              setDeleting(false);
              toast.error(result.error || "Failed to delete account");
              return;
            }
            window.location.href = "/";
          } catch {
            setDeleting(false);
          }
        }}
      />
    </>
  );
}
