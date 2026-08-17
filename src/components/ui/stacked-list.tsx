"use client";

import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ProfileIcon,
  Search01Icon,
  Cancel01Icon,
  Add01Icon,
  Briefcase01Icon,
  PaintBoardIcon,
  Database01Icon,
  QuillWrite01Icon,
} from "@hugeicons/core-free-icons";
import { getStoredAvatar } from "@/lib/avatar-storage";

export type MemberRoleType = "pm" | "designer" | "data" | "creator" | "member" | "leader" | "admin";

export interface Member {
  id: string;
  name: string;
  status: string;
  online: boolean;
  role: string;
  roleType: MemberRoleType;
  avatar?: string;
}

const FALLBACK_AVATARS = [
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=96&q=80",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=96&q=80",
  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=96&q=80",
  "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=96&q=80",
  "https://images.unsplash.com/photo-1544005313-94cfbc94f60b?auto=format&fit=crop&w=96&q=80",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=96&q=80",
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=96&q=80",
];

const DEMO_MEMBERS: Member[] = [
  {
    id: "01",
    name: "Oliver Smith",
    status: "Online",
    online: true,
    role: "Project Manager",
    roleType: "pm",
    avatar: FALLBACK_AVATARS[0],
  },
  {
    id: "02",
    name: "Sophie Chen",
    status: "17m ago",
    online: false,
    role: "Designer",
    roleType: "designer",
    avatar: FALLBACK_AVATARS[1],
  },
  {
    id: "03",
    name: "Noah Wilson",
    status: "29m ago",
    online: false,
    role: "Data Specialist",
    roleType: "data",
    avatar: FALLBACK_AVATARS[2],
  },
  {
    id: "04",
    name: "Emma Davis",
    status: "48m ago",
    online: false,
    role: "Creator",
    roleType: "creator",
    avatar: FALLBACK_AVATARS[3],
  },
  {
    id: "05",
    name: "Leo Garcia",
    status: "Online",
    online: true,
    role: "Designer",
    roleType: "designer",
    avatar: FALLBACK_AVATARS[4],
  },
  {
    id: "06",
    name: "Mia Thompson",
    status: "Online",
    online: true,
    role: "Project Manager",
    roleType: "pm",
    avatar: FALLBACK_AVATARS[5],
  },
  {
    id: "07",
    name: "Ethan Wright",
    status: "5h ago",
    online: false,
    role: "Data Specialist",
    roleType: "data",
    avatar: FALLBACK_AVATARS[6],
  },
];

const sweepSpring = {
  type: "spring" as const,
  stiffness: 400,
  damping: 35,
  mass: 0.5,
};

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function avatarFor(member: Member, _index?: number): string | null {
  // Prefer photo uploaded by the user (local storage)
  const uploaded = getStoredAvatar(member.id);
  if (uploaded) return uploaded;
  if (member.avatar) return member.avatar;
  return null;
}

const RoleBadge = ({
  type,
  label,
}: {
  type: Member["roleType"];
  label: string;
}) => {
  const styles = {
    pm: {
      bg: "bg-[#FFFCEB]",
      text: "text-[#856404]",
      border: "border-[#FFEBA5]",
      icon: Briefcase01Icon,
    },
    designer: {
      bg: "bg-[#F0F7FF]",
      text: "text-[#004085]",
      border: "border-[#B8DAFF]",
      icon: PaintBoardIcon,
    },
    data: {
      bg: "bg-[#F3FAF4]",
      text: "text-[#155724]",
      border: "border-[#C3E6CB]",
      icon: Database01Icon,
    },
    creator: {
      bg: "bg-[#FCF5FF]",
      text: "text-[#522785]",
      border: "border-[#E8D1FF]",
      icon: QuillWrite01Icon,
    },
    member: {
      bg: "bg-[#F3EAE1]",
      text: "text-[#7A6150]",
      border: "border-[#E5D5C5]",
      icon: ProfileIcon,
    },
    leader: {
      bg: "bg-[#FBE8E8]",
      text: "text-[#8B2323]",
      border: "border-[#E5C5C5]",
      icon: Briefcase01Icon,
    },
    admin: {
      bg: "bg-[#721515]/10",
      text: "text-[#721515]",
      border: "border-[#721515]/20",
      icon: Database01Icon,
    },
  };

  const style = styles[type] ?? styles.member;
  const Icon = style.icon;

  return (
    <div
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${style.bg} ${style.text} ${style.border} shrink-0`}
    >
      <HugeiconsIcon icon={Icon} size={12} strokeWidth={1.8} />
      <span className="text-xs font-normal tracking-tight uppercase whitespace-nowrap truncate max-w-[72px] sm:max-w-none">
        {label}
      </span>
    </div>
  );
};

const MemberItem = ({
  member,
  index,
  compact = false,
}: {
  member: Member;
  index: number;
  compact?: boolean;
}) => {
  const photoSrc = avatarFor(member, index);

  return (
  <motion.div
    variants={{
      hidden: { opacity: 0, x: 10, y: 15, rotate: 1 },
      visible: { opacity: 1, x: 0, y: 0, rotate: 0 },
    }}
    transition={sweepSpring}
    style={{ originX: 1, originY: 1 }}
    className={cn(
      "flex items-center group border-b border-[#E5D5C5]/50 last:border-0",
      compact ? "py-2.5 first:pt-0" : "py-4 first:pt-0",
    )}
  >
    <div className={cn("relative shrink-0", compact ? "mr-3" : "mr-4")}>
      <div
        className={cn(
          "flex items-center justify-center rounded-full bg-[#721515] font-bold text-white overflow-hidden ring-2 ring-[#FAF7F2] shadow-sm",
          compact ? "w-9 h-9 text-[9px]" : "w-12 h-12 text-[10px]",
        )}
      >
        {photoSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoSrc}
            alt={member.name}
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          getInitials(member.name)
        )}
      </div>
      {member.online && (
        <div className="absolute bottom-0 right-0 w-3 h-3 bg-[#FAF7F2] rounded-full flex items-center justify-center shadow-sm">
          <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
        </div>
      )}
    </div>
    <div className="flex-1 min-w-0">
      <h3
        className={cn(
          "font-semibold text-[#1A202C] tracking-tight leading-none truncate",
          compact ? "text-sm mb-1" : "text-base mb-1.5",
        )}
      >
        {member.name}
      </h3>
      <div className="flex items-center gap-1.5 opacity-80">
        {member.online && (
          <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
        )}
        <p
          className={cn(
            "font-medium leading-none truncate",
            compact ? "text-xs" : "text-sm",
            member.online ? "text-green-600" : "text-[#7A6150]",
          )}
        >
          {member.status}
        </p>
      </div>
    </div>
    <div className="shrink-0">
      <RoleBadge type={member.roleType} label={member.role} />
    </div>
  </motion.div>
  );
};

export interface StackedListProps {
  members?: Member[];
  title?: string;
  directoryTitle?: string;
  onAdd?: () => void;
  className?: string;
  /** When false, renders without the full-screen muted wrapper */
  framed?: boolean;
}

export function StackedList({
  members = DEMO_MEMBERS,
  title = "Active Members",
  directoryTitle = "Member Directory",
  onAdd,
  className,
  framed = true,
}: StackedListProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const activeMembers = useMemo(
    () => members.filter((m) => m.online),
    [members],
  );

  const filteredAllMembers = useMemo(
    () =>
      members.filter(
        (m) =>
          m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.role.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [searchQuery, members],
  );

  const listBody = (
    <div
      className={cn(
        "relative w-full max-w-[440px] pb-6 bg-white rounded-[40px] border border-[#E5D5C5]/60 flex flex-col overflow-hidden shadow-xl",
        className,
      )}
    >
      <div className="flex flex-col h-full bg-white min-h-[520px]">
        <div className="p-8 pb-3">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-[#1A202C] tracking-tight flex items-center gap-2 font-serif">
              {title}
              <span className="text-xs bg-[#F3EAE1] px-2 py-1 mt-0.5 rounded-full text-[#7A6150] leading-none font-normal">
                {activeMembers.length}
              </span>
            </h2>
            <Button
              variant="outline"
              size="icon"
              onClick={onAdd}
              className="h-9 w-9 rounded-full border-[#E5D5C5] text-[#7A6150] hover:bg-[#F3EAE1] hover:text-[#8B2323]"
            >
              <HugeiconsIcon icon={Add01Icon} size={18} strokeWidth={2.5} />
            </Button>
          </div>

          <div className="relative mb-4">
            <HugeiconsIcon
              icon={Search01Icon}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-[#7A6150]/60 z-10"
              size={16}
            />
            <Input
              placeholder="Search teammates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-11 pl-11 pr-4 bg-[#FAF7F2] border-none focus-visible:ring-1 focus-visible:ring-[#8B2323]/30 rounded-2xl text-base text-[#1A202C] placeholder:text-[#7A6150]/50 transition-all w-full box-border"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-8 pb-24">
          <motion.div
            initial={false}
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.04 } } }}
            className="space-y-0.5"
          >
            {(activeMembers.length > 0 ? activeMembers : members.slice(0, 5)).map(
              (member, index) => (
                <MemberItem
                  key={`active-${member.id}`}
                  member={member}
                  index={index}
                />
              ),
            )}
          </motion.div>
        </div>
      </div>

      <motion.div
        layout
        initial={false}
        animate={{
          height: isExpanded ? "calc(100% - 20px)" : "68px",
          width: isExpanded ? "calc(100% - 20px)" : "calc(100% - 40px)",
          bottom: isExpanded ? "10px" : "20px",
          left: isExpanded ? "10px" : "20px",
          borderRadius: isExpanded ? "32px" : "24px",
        }}
        transition={{
          type: "spring",
          stiffness: 240,
          damping: 30,
          mass: 0.8,
        }}
        className="absolute z-50 overflow-hidden border border-[#E5D5C5]/70 shadow-lg flex flex-col group/bar bg-[#FAF7F2]"
        style={{ cursor: isExpanded ? "default" : "pointer" }}
        onClick={() => !isExpanded && setIsExpanded(true)}
      >
        <div
          className={`flex items-center justify-between px-3 h-[68px] shrink-0 transition-colors ${
            isExpanded
              ? "border-b border-[#E5D5C5]/50"
              : "hover:bg-[#F3EAE1]/50"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white border border-[#E5D5C5] flex items-center justify-center text-[#8B2323] shadow-sm transition-transform group-hover/bar:scale-105">
              <HugeiconsIcon icon={ProfileIcon} size={20} strokeWidth={2} />
            </div>
            <motion.div layout="position">
              <h4 className="text-base font-medium text-[#1A202C] tracking-tight leading-none">
                {directoryTitle}
              </h4>
              <p className="text-xs font-normal leading-none text-[#7A6150] mt-1">
                {members.length} Members Registered
              </p>
            </motion.div>
          </div>

          <div className="flex items-center gap-3">
            {!isExpanded && (
              <div className="flex items-center gap-0">
                <div className="flex -space-x-3">
                  {members.slice(0, 3).map((m, i) => {
                    const src = avatarFor(m, i);
                    return src ? (
                      <motion.img
                        key={`sum-${m.id}`}
                        layoutId={`avatar-${m.id}`}
                        src={src}
                        className="w-10 h-10 rounded-full object-cover ring-1 ring-[#FAF7F2] shadow-sm z-[1]"
                        alt={m.name}
                      />
                    ) : (
                      <div
                        key={`sum-${m.id}`}
                        className="w-10 h-10 rounded-full ring-1 ring-[#FAF7F2] bg-[#721515] text-white flex items-center justify-center text-[10px] font-bold shadow-sm z-[1]"
                      >
                        {getInitials(m.name)}
                      </div>
                    );
                  })}
                  {members.length > 3 && (
                    <div className="w-10 h-10 rounded-full ring-1 ring-[#FAF7F2] bg-[#F3EAE1] flex items-center justify-center shadow-sm relative z-0">
                      <span className="text-sm font-normal leading-none text-[#7A6150]">
                        +{members.length - 3}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {isExpanded && (
              <button
                type="button"
                className="h-9 w-9 rounded-xl text-[#7A6150] hover:text-[#8B2323] transition-all flex items-center justify-center bg-[#F3EAE1] active:scale-90"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(false);
                }}
              >
                <HugeiconsIcon
                  icon={Cancel01Icon}
                  size={18}
                  strokeWidth={2.5}
                />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col">
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="px-6 py-4"
              >
                <div className="relative">
                  <HugeiconsIcon
                    icon={Search01Icon}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-[#7A6150]/50 z-10"
                    size={15}
                  />
                  <Input
                    placeholder="Search members..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-10 bg-white border-none focus-visible:ring-1 focus-visible:ring-[#8B2323]/30 rounded-xl text-sm text-[#1A202C] placeholder:text-[#7A6150]/40 transition-all w-full box-border pl-10"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex-1 overflow-y-auto px-6 py-2">
            <motion.div
              initial="hidden"
              animate={isExpanded ? "visible" : "hidden"}
              variants={{
                visible: {
                  transition: { staggerChildren: 0.03, delayChildren: 0.1 },
                },
                hidden: {
                  transition: {
                    staggerChildren: 0.02,
                    staggerDirection: -1,
                  },
                },
              }}
              className="space-y-0.5"
            >
              {filteredAllMembers.map((member, index) => (
                <MemberItem
                  key={`list-${member.id}`}
                  member={member}
                  index={index}
                />
              ))}
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );

  if (!framed) return listBody;

  return (
    <div className="flex items-center justify-center min-h-[100dvh] w-full bg-[#FAF7F2] p-6 font-sans not-prose pb-28">
      {listBody}
    </div>
  );
}

/** Compact searchable stacked list for admin broadcast previews */
export function CompactStackedList({
  members,
  className,
  maxHeightClass = "max-h-56",
}: {
  members: Member[];
  className?: string;
  maxHeightClass?: string;
}) {
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = useMemo(
    () =>
      members.filter(
        (m) =>
          m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.status.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [members, searchQuery],
  );

  return (
    <div
      className={cn(
        "mt-2 rounded-2xl border border-[#E5D5C5]/60 bg-white overflow-hidden",
        className,
      )}
    >
      <div className="px-3 pt-3 pb-2">
        <div className="relative">
          <HugeiconsIcon
            icon={Search01Icon}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7A6150]/50 z-10"
            size={14}
          />
          <Input
            placeholder="Search members..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 pl-9 pr-3 bg-[#FAF7F2] border-none focus-visible:ring-1 focus-visible:ring-[#8B2323]/25 rounded-xl text-sm text-[#1A202C] placeholder:text-[#7A6150]/45"
          />
        </div>
      </div>
      <div className={cn("overflow-y-auto px-3 pb-2 custom-scrollbar", maxHeightClass)}>
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{
            visible: { transition: { staggerChildren: 0.03 } },
            hidden: {},
          }}
          className="space-y-0"
        >
          {filtered.length === 0 ? (
            <p className="py-4 text-center text-xs text-[#7A6150]">No members found</p>
          ) : (
            filtered.map((member, index) => (
              <MemberItem
                key={member.id}
                member={member}
                index={index}
                compact
              />
            ))
          )}
        </motion.div>
      </div>
    </div>
  );
}

export function mapUsersToStackedMembers(
  users: Array<{
    id: string;
    name: string;
    role?: string;
    campusId?: string;
    campusName?: string;
    avatar?: string;
  }>,
): Member[] {
  return users.map((u) => {
    const role = (u.role || "member").toLowerCase();
    let roleType: MemberRoleType = "member";
    if (role === "super_admin" || role === "admin") roleType = "admin";
    else if (role === "campus_leader" || role === "group_leader") roleType = "leader";

    const roleLabel =
      role === "super_admin"
        ? "Super Admin"
        : role === "admin"
          ? "Admin"
          : role === "campus_leader"
            ? "Campus Leader"
            : role === "group_leader"
              ? "Group Leader"
              : "Member";

    return {
      id: u.id,
      name: u.name,
      status: u.campusName || "Unknown Campus",
      online: false,
      role: roleLabel,
      roleType,
      avatar: getStoredAvatar(u.id) || u.avatar || undefined,
    };
  });
}

export default StackedList;
