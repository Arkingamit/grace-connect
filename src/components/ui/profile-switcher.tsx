"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "./avatar";
import { AvatarGroup } from "./avatar-group";
import { QrCode, UserPlus, LogOut, User, Shield } from "lucide-react";
import { AddFamilyMemberDialog } from "./add-family-member-dialog";
import { LogoutConfirmDialog } from "./logout-confirm-dialog";
import { resolveMemberAvatar } from "@/lib/avatar-storage";
import { cn } from "@/lib/utils";

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
  const { session, getSessionMember, linkedProfiles, logout } = useAuth();
  const activeMember = getSessionMember();
  const [isOpen, setIsOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [hasActiveSession, setHasActiveSession] = useState(false);
  const [activePhoto, setActivePhoto] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

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

  const closeMenu = () => setIsOpen(false);

  useEffect(() => {
    if (!isOpen) return;

    const isInside = (target: EventTarget | null) => {
      const node = target instanceof Node ? target : null;
      return Boolean(node && rootRef.current?.contains(node));
    };

    const onPointerDown = (event: PointerEvent) => {
      if (isInside(event.target)) return;
      closeMenu();
    };

    const onScrollOrSwipe = (event: Event) => {
      if (isInside(event.target)) return;
      closeMenu();
    };

    document.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("scroll", onScrollOrSwipe, { capture: true, passive: true });
    window.addEventListener("touchmove", onScrollOrSwipe, { capture: true, passive: true });
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("scroll", onScrollOrSwipe, true);
      window.removeEventListener("touchmove", onScrollOrSwipe, true);
    };
  }, [isOpen]);

  const buttonClasses = cn(
    "outline-none focus-visible:ring-2 focus-visible:ring-[#8B2323]/40 transition-colors",
    variant === "pill"
      ? "flex items-center gap-2 rounded-full border border-[#E5D5C5]/80 bg-[#FAF7F2] px-2 py-1.5 hover:bg-[#F3EAE1]"
      : "rounded-full",
    className,
  );

  return (
    <>
      <div className="relative" ref={rootRef}>
        <div className={cn("invisible", buttonClasses)} aria-hidden="true">
          <Avatar className={cn("border border-[#E5D5C5]/60 shadow-sm", variant === "pill" ? "h-7 w-7" : "h-10 w-10")}>
            {activePhoto ? <AvatarImage src={activePhoto} alt={displayName} className="object-cover" /> : null}
            <AvatarFallback className={cn("font-bold", variant === "pill" ? "bg-[#F3EAE1] text-[10px] text-[#1A202C]" : "bg-[#721515] text-xs text-white")}>
              {getInitials(displayName) || "??"}
            </AvatarFallback>
          </Avatar>
          {variant === "pill" && <span className="max-w-[88px] truncate pr-1 text-sm font-medium text-[#1A202C]">{firstName}</span>}
        </div>

        <LayoutGroup id="profile-switcher">
        <AnimatePresence initial={false}>
          {!isOpen && (
            <motion.button
              key="button"
              layoutId="profile-menu-container"
              type="button"
              onClick={() => setIsOpen(true)}
              className={cn("absolute inset-0 m-0", buttonClasses)}
              aria-label="Open profile menu"
              transition={{ type: "spring", stiffness: 460, damping: 36, mass: 0.7 }}
            >
              <motion.div layoutId="profile-avatar" className="shrink-0">
                <Avatar className={cn("border border-[#E5D5C5]/60 shadow-sm", variant === "pill" ? "h-7 w-7" : "h-10 w-10")}>
                  {activePhoto ? <AvatarImage src={activePhoto} alt={displayName} className="object-cover" /> : null}
                  <AvatarFallback className={cn("font-bold", variant === "pill" ? "bg-[#F3EAE1] text-[10px] text-[#1A202C]" : "bg-[#721515] text-xs text-white")}>
                    {getInitials(displayName) || "??"}
                  </AvatarFallback>
                </Avatar>
              </motion.div>
              {variant === "pill" && (
                <motion.span layoutId="profile-name" className="max-w-[88px] truncate pr-1 text-sm font-medium text-[#1A202C]">
                  {firstName}
                </motion.span>
              )}
            </motion.button>
          )}

          {isOpen && (
              <motion.div
                key="menu"
                layoutId="profile-menu-container"
                style={{ originX: align === "start" ? 0 : 1, originY: 0 }}
                transition={{ type: "spring", stiffness: 460, damping: 36, mass: 0.7 }}
                className={cn(
                  "absolute z-50 w-64 rounded-xl border border-[#E5D5C5] bg-white p-1.5 shadow-xl flex flex-col overflow-hidden",
                  align === "end" ? "right-0" : align === "start" ? "left-0" : "left-1/2 -translate-x-1/2",
                  "top-0"
                )}
              >
                <div className="flex items-center gap-3 px-2 py-2.5">
                  <motion.div layoutId="profile-avatar" className="shrink-0">
                    <Avatar className="h-10 w-10 border border-[#E5D5C5]/60 shadow-sm">
                      {activePhoto ? <AvatarImage src={activePhoto} alt={displayName} className="object-cover" /> : null}
                      <AvatarFallback className="font-bold bg-[#721515] text-xs text-white">
                        {getInitials(displayName) || "??"}
                      </AvatarFallback>
                    </Avatar>
                  </motion.div>
                  <div className="flex flex-col min-w-0">
                    <motion.span layoutId="profile-name" className="truncate text-sm font-bold text-[#1A202C]">
                      {displayName}
                    </motion.span>
                    <p className="truncate text-xs text-[#7A6150]">{session.email}</p>
                  </div>
                </div>

                <div className="h-px bg-[#E5D5C5]/60 my-1" />

                {hasActiveSession && (
                  <Link href="/profile" onClick={closeMenu} className="flex w-full items-center gap-2 cursor-pointer rounded-lg px-2.5 py-2 text-sm font-semibold text-[#8B2323] hover:bg-black/5 outline-none">
                    <QrCode className="h-4 w-4" /> My ePass
                  </Link>
                )}

                {isAdmin && (
                  <Link href="/admin" onClick={closeMenu} className="flex w-full items-center gap-2 px-2.5 py-2 text-sm cursor-pointer rounded-lg text-[#1A202C] hover:bg-black/5 outline-none">
                    <Shield className="h-4 w-4 text-[#7A6150]" /> Admin Panel
                  </Link>
                )}

                <Link href="/profile" onClick={closeMenu} className="flex w-full items-center gap-2 px-2.5 py-2 text-sm cursor-pointer rounded-lg text-[#1A202C] hover:bg-black/5 outline-none">
                  <User className="h-4 w-4 text-[#7A6150]" /> Profile
                </Link>

                <div className="h-px bg-[#E5D5C5]/60 my-1" />

                <button
                  onClick={() => { closeMenu(); router.push("/select-profile"); }}
                  className="flex w-full items-center gap-3 px-2.5 py-2 text-sm cursor-pointer rounded-lg text-[#1A202C] hover:bg-black/5 outline-none"
                >
                  <AvatarGroup
                    items={familyStackItems}
                    max={4}
                    size={28}
                    showOverflowBadge
                    className="pointer-events-none shrink-0"
                  />
                  <span className="font-medium">Switch Profile</span>
                </button>

                <button
                  onClick={() => { closeMenu(); setIsAdding(true); }}
                  className="flex w-full items-center gap-2 px-2.5 py-2 text-sm cursor-pointer rounded-lg text-[#1A202C] hover:bg-black/5 outline-none"
                >
                  <UserPlus className="h-4 w-4 text-[#7A6150]" />
                  <span>Add Member</span>
                </button>

                <div className="h-px bg-[#E5D5C5]/60 my-1" />

                <button
                  onClick={(e) => {
                    e.preventDefault();
                    closeMenu();
                    setLogoutConfirmOpen(true);
                  }}
                  className="flex w-full items-center px-2.5 py-2 text-sm cursor-pointer rounded-lg font-medium text-[#8B2323] hover:bg-[#FBE8E8] focus-visible:bg-[#FBE8E8] outline-none"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </button>
              </motion.div>
          )}
        </AnimatePresence>
        </LayoutGroup>
      </div>

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
    </>
  );
}
