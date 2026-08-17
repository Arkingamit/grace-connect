"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ProfileSelect, {
  type Profile,
} from "@/components/ui/3d-profile-selector";
import { useAuth } from "@/lib/auth-context";
import { AddFamilyMemberDialog } from "@/components/ui/add-family-member-dialog";
import { resolveMemberAvatar } from "@/lib/avatar-storage";

export default function SelectProfilePage() {
  const router = useRouter();
  const { session, linkedProfiles, switchProfile, isLoading } = useAuth();
  const [isAdding, setIsAdding] = useState(false);
  const [avatarTick, setAvatarTick] = useState(0);

  useEffect(() => {
    if (!isLoading && !session) {
      router.replace("/login");
    }
  }, [isLoading, session, router]);

  // Re-read avatars when returning to this page
  useEffect(() => {
    const refresh = () => setAvatarTick((t) => t + 1);
    refresh();
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, []);

  const profiles: Profile[] = useMemo(() => {
    if (!session) return [];

    const primary: Profile = {
      id: session.memberId,
      name: session.name || "You",
      image: resolveMemberAvatar(session.memberId, session.avatar) || undefined,
    };

    const linked = linkedProfiles.map((member) => ({
      id: member.id,
      name:
        member.name ||
        `${member.firstName} ${member.lastName}`.trim() ||
        "Family Member",
      image: resolveMemberAvatar(member.id, member.avatar) || undefined,
    }));

    return [primary, ...linked];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, linkedProfiles, avatarTick]);

  const handleSelect = (profile: Profile) => {
    if (!session) return;

    if (profile.id === session.memberId) {
      switchProfile(null);
    } else {
      switchProfile(profile.id);
    }

    router.push("/");
  };

  if (isLoading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAF7F2] text-[#7A6150]">
        Loading profiles…
      </div>
    );
  }

  return (
    <>
      <ProfileSelect
        profiles={profiles}
        title="Choose your profile"
        onSelect={handleSelect}
        onAdd={() => setIsAdding(true)}
        onEdit={(profile) => {
          if (profile.id === session.memberId) {
            switchProfile(null);
          } else {
            switchProfile(profile.id);
          }
          router.push("/profile");
        }}
        onManage={() => router.push("/profile")}
      />
      <AddFamilyMemberDialog open={isAdding} onOpenChange={setIsAdding} />
    </>
  );
}
