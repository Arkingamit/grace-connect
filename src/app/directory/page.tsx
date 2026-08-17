"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import StackedList, {
  type Member,
  type MemberRoleType,
} from "@/components/ui/stacked-list";
import { useAuth } from "@/lib/auth-context";
import { getRoleLabel } from "@/lib/admin-data-context";
import { getStoredAvatar } from "@/lib/avatar-storage";
import type { UserRole } from "@/lib/types";

function mapRoleType(role?: string): MemberRoleType {
  const r = (role || "member").toLowerCase();
  if (r === "super_admin" || r === "admin") return "admin";
  if (r === "campus_leader" || r === "group_leader") return "leader";
  return "member";
}

export default function DirectoryPage() {
  const router = useRouter();
  const { session, members, isLoading } = useAuth();

  const listMembers: Member[] = useMemo(() => {
    const approved = (members || []).filter(
      (m) => !m.status || m.status === "approved",
    );

    return approved.map((m, index) => {
      const name =
        m.name ||
        `${m.firstName} ${m.lastName}`.trim() ||
        m.email ||
        "Member";
      // Treat first few as "online" for visual demo of active section;
      // real presence can replace this later.
      const online = index < 3;

      return {
        id: m.id,
        name,
        status: online ? "Online" : "Member",
        online,
        role: getRoleLabel((m.role as UserRole) || "member"),
        roleType: mapRoleType(m.role),
        avatar: getStoredAvatar(m.id) || undefined,
      };
    });
  }, [members]);

  if (isLoading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#FAF7F2] text-[#7A6150]">
        Loading directory…
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-[#FAF7F2] px-6 text-center">
        <p className="text-[#7A6150]">Sign in to view the member directory.</p>
        <Link
          href="/login"
          className="rounded-xl bg-[#8B2323] px-5 py-2.5 text-sm font-semibold text-white"
        >
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="relative min-h-[100dvh] bg-[#FAF7F2] pb-24">
      <div className="sticky top-0 z-40 flex items-center gap-2 border-b border-[#E5D5C5]/60 bg-[#FAF7F2]/90 px-4 py-3 backdrop-blur-md">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex h-10 w-10 items-center justify-center rounded-full text-[#8B2323] hover:bg-[#F3EAE1]"
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="font-serif text-xl font-bold text-[#1A202C]">
          Member Directory
        </h1>
      </div>

      <StackedList
        members={listMembers}
        title="Active Members"
        directoryTitle="All Members"
        onAdd={() => router.push("/register")}
        framed
      />
    </div>
  );
}
