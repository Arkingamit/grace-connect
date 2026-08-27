"use client";

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useNavigationHistory } from '@/components/ui/navigation-history-provider';
import { useAuth } from '@/lib/auth-context';
import { useAdminData } from '@/lib/admin-data-context';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AvatarUploader } from '@/components/ui/avatar-uploader';
import { AvatarGroup } from '@/components/ui/avatar-group';
import {
  Church, User, Mail, Phone, Calendar, Building2, Heart, Users,
  ArrowLeft, QrCode, Shield, LogOut, Cake, MessageSquare, Pencil, ChevronRight, Camera, Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import { setStoredAvatar, fileToDataUrl, resolveMemberAvatar } from '@/lib/avatar-storage';
import { LogoutConfirmDialog } from '@/components/ui/logout-confirm-dialog';
import { DeleteAccountDialog } from '@/components/ui/delete-account-dialog';

export default function ProfilePage() {
  const router = useRouter();
  const { goBack } = useNavigationHistory();
  const { session, logout, deleteAccount, getSessionMember, linkedProfiles } = useAuth();
  const { campuses } = useAdminData();
  const [photo, setPhoto] = useState<string>("");
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const member = getSessionMember();

  const familyStackItems = useMemo(() => {
    if (!session) return [];
    const primary = {
      id: session.memberId,
      name: session.name || 'You',
      image: resolveMemberAvatar(session.memberId, session.avatar) || undefined,
    };
    const linked = linkedProfiles.map((profile) => ({
      id: profile.id,
      name:
        profile.name ||
        `${profile.firstName} ${profile.lastName}`.trim() ||
        'Family Member',
      image: resolveMemberAvatar(profile.id, profile.avatar) || undefined,
    }));
    const all = [primary, ...linked];
    return all.filter(
      (item, index, arr) => arr.findIndex((x) => x.id === item.id) === index,
    );
  }, [session, linkedProfiles, photo]);

  useEffect(() => {
    if (!member?.id || typeof window === "undefined") return;
    setPhoto(resolveMemberAvatar(member.id, member.avatar));
  }, [member?.id, member?.avatar]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      toast.success('Signed out successfully');
      router.push('/login');
    } catch {
      toast.error('Failed to sign out');
      setLoggingOut(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      const result = await deleteAccount();
      if (!result.success) {
        toast.error(result.error || 'Failed to delete account');
        setDeleting(false);
        return;
      }
      window.location.href = '/';
    } catch {
      toast.error('Failed to delete account');
      setDeleting(false);
    }
  };

  const handleAvatarUpload = async (file: File) => {
    if (!member?.id) return { success: false };
    const dataUrl = await fileToDataUrl(file);
    setStoredAvatar(member.id, dataUrl);
    setPhoto(dataUrl);
    return { success: true };
  };

  if (!session || !member) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-border/50 shadow-lg rounded-3xl">
          <CardContent className="p-8 text-center space-y-4">
            <Shield className="w-12 h-12 text-muted-foreground mx-auto" />
            <h2 className="text-xl font-bold">Not Signed In</h2>
            <p className="text-muted-foreground text-sm">
              Please sign in to view your profile and access your official ePass.
            </p>
            <Link href="/login">
              <Button className="bg-[#8B2323] hover:bg-[#721515] text-white rounded-xl px-6">Sign In</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const campus = campuses.find(c => c.id === member.campusId);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(member.qrCode)}&bgcolor=ffffff&color=000000`;

  const initials = `${member.firstName?.[0] || ''}${member.lastName?.[0] || ''}`.toUpperCase() || 'SG';

  return (
    <div className="min-h-screen bg-[#FAF7F2] dark:bg-background text-foreground antialiased pb-4">
      {/* Top App Bar / Glass Header */}
      <header className="sticky top-0 z-50 bg-[#FAF7F2]/80 dark:bg-background/80 backdrop-blur-md border-b border-border/40 pt-[env(safe-area-inset-top)]">
        <div className="flex items-center px-4 h-16 w-full max-w-xl mx-auto">
          <button
            onClick={() => goBack("/")}
            className="flex items-center justify-center w-10 h-10 -ml-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-all active:scale-95 text-[#8B2323] dark:text-primary"
            title="Go Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="ml-2 font-serif text-xl font-bold text-[#1A202C] dark:text-foreground">Profile</h1>
          <button
            onClick={() => setLogoutConfirmOpen(true)}
            className="flex items-center justify-center w-10 h-10 ml-auto rounded-full hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 transition-all active:scale-95"
            title="Sign Out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 mt-4 space-y-6">
        {/* Profile Bento Grid Section */}
        <section className="bg-white dark:bg-card border border-border/50 shadow-[0px_4px_20px_rgba(0,0,0,0.04)] rounded-3xl p-8 flex flex-col items-center">
          {/* Avatar — tap to upload / crop */}
          <div className="relative mb-4">
            <AvatarUploader onUpload={handleAvatarUpload}>
              <button
                type="button"
                className="group relative rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[#8B2323]/40"
                aria-label="Update profile photo"
              >
                <Avatar className="h-24 w-24 ring-4 ring-[#8B2323]/15">
                  {photo ? <AvatarImage src={photo} alt="Profile photo" className="object-cover" /> : null}
                  <AvatarFallback className="bg-[#8B2323]/10 text-[#8B2323] font-serif text-3xl font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 transition-colors group-hover:bg-black/35">
                  <Pencil className="h-5 w-5 text-white opacity-0 transition-opacity group-hover:opacity-100" strokeWidth={2.25} />
                </span>
                <span className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-[#8B2323] text-white shadow-md dark:border-card">
                  <Pencil className="h-3.5 w-3.5" strokeWidth={2.5} />
                </span>
              </button>
            </AvatarUploader>
          </div>

          {/* Name & Tags */}
          <div className="text-center mb-6">
            <h2 className="text-2xl font-serif font-bold text-[#1A202C] dark:text-foreground mb-2">
              {member.firstName} {member.middleName ? `${member.middleName} ` : ''}{member.lastName}
            </h2>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {member.gender ? (
                <span className="px-3 py-1 bg-muted/60 text-muted-foreground text-xs font-semibold rounded-full capitalize">
                  {member.gender}
                </span>
              ) : null}
              <span className="px-3 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold rounded-full border border-emerald-500/20">
                Active Member
              </span>
            </div>
          </div>

          {/* Official ePass Canvas */}
          <div className="w-full bg-[#FAF7F2] dark:bg-muted/30 rounded-3xl p-6 flex flex-col items-center border border-border/40">
            {/* QR Code Container */}
            <div className="bg-white p-4 rounded-2xl shadow-sm mb-3 border border-border/30">
              <div className="w-44 h-44 bg-white flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrUrl}
                  alt="Official Member ePass QR Code"
                  width={176}
                  height={176}
                  className="object-contain"
                />
              </div>
            </div>
            <code className="text-[11px] font-mono text-muted-foreground mb-4 tracking-tight opacity-80 bg-white/60 dark:bg-background/60 px-3 py-1 rounded-md border border-border/30">
              {member.qrCode}
            </code>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#8B2323]/10 text-[#8B2323] dark:bg-primary/20 dark:text-primary rounded-xl border border-[#8B2323]/20 mb-2">
              <QrCode className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-widest">Official ePass</span>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Show this to your leader for attendance check-in
            </p>
          </div>
        </section>

        <section className="bg-white dark:bg-card border border-border/50 shadow-[0px_4px_20px_rgba(0,0,0,0.04)] rounded-3xl p-4">
          <button
            type="button"
            onClick={() => router.push('/epass-scan')}
            className="w-full flex items-center gap-3 rounded-2xl px-2 py-2 text-left transition-colors hover:bg-[#FAF7F2] dark:hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B2323]/30"
            aria-label="Open ePass scanner"
          >
            <div className="h-10 w-10 rounded-full bg-[#FBE8E8] text-[#8B2323] flex items-center justify-center shrink-0">
              <Camera className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[#1A202C]">Scan ePasses</p>
              <p className="text-[11px] text-muted-foreground truncate">
                For sessions you are assigned to check in
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-[#7A6150] shrink-0" />
          </button>
        </section>

        {/* Switch profile → multi-user selector */}
        <section className="bg-white dark:bg-card border border-border/50 shadow-[0px_4px_20px_rgba(0,0,0,0.04)] rounded-3xl p-4">
          <button
            type="button"
            onClick={() => router.push('/select-profile')}
            className="w-full flex items-center gap-3 rounded-2xl px-2 py-2 text-left transition-colors hover:bg-[#FAF7F2] dark:hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B2323]/30"
            aria-label="Switch profile"
          >
            <AvatarGroup
              items={familyStackItems}
              max={4}
              size={36}
              showOverflowBadge
              className="shrink-0 pointer-events-none"
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[#8B2323]">Switch Profile</p>
              <p className="text-[11px] text-muted-foreground truncate">
                Choose who is using the app
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-[#7A6150] shrink-0" />
          </button>
        </section>

        {/* Personal Details Section */}
        <section className="bg-white dark:bg-card border border-border/50 shadow-[0px_4px_20px_rgba(0,0,0,0.04)] rounded-3xl p-6 space-y-5">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#FAF7F2] dark:bg-muted/50 flex items-center justify-center text-[#8B2323] shrink-0">
              <Mail className="w-5 h-5" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-medium text-muted-foreground">Email</span>
              <span className="text-sm font-semibold text-[#1A202C] dark:text-foreground truncate">{member.email}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#FAF7F2] dark:bg-muted/50 flex items-center justify-center text-[#8B2323] shrink-0">
              <Phone className="w-5 h-5" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-medium text-muted-foreground">Phone</span>
              <span className="text-sm font-semibold text-[#1A202C] dark:text-foreground truncate">{member.phone || 'N/A'}</span>
            </div>
          </div>

          {member.whatsapp && member.whatsapp !== member.phone && (
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-[#FAF7F2] dark:bg-muted/50 flex items-center justify-center text-emerald-600 shrink-0">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-medium text-muted-foreground">WhatsApp</span>
                <span className="text-sm font-semibold text-[#1A202C] dark:text-foreground truncate">{member.whatsapp}</span>
              </div>
            </div>
          )}

          {member.birthday && (
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-[#FAF7F2] dark:bg-muted/50 flex items-center justify-center text-[#8B2323] shrink-0">
                <Cake className="w-5 h-5" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-medium text-muted-foreground">Birthday</span>
                <span className="text-sm font-semibold text-[#1A202C] dark:text-foreground truncate">
                  {new Date(member.birthday).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
            </div>
          )}

          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#FAF7F2] dark:bg-muted/50 flex items-center justify-center text-[#8B2323] shrink-0">
              <Church className="w-5 h-5" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-medium text-muted-foreground">Church Campus</span>
              <span className="text-sm font-semibold text-[#1A202C] dark:text-foreground truncate">{campus?.name || member.campusId || 'Not set'}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#FAF7F2] dark:bg-muted/50 flex items-center justify-center text-[#8B2323] shrink-0">
              <Heart className="w-5 h-5" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-medium text-muted-foreground">Status</span>
              <span className="text-sm font-semibold text-[#1A202C] dark:text-foreground capitalize truncate">
                {member.maritalStatus === 'married' ? `Married${member.marriageDate ? ` (${new Date(member.marriageDate).toLocaleDateString()})` : ''}` : 'Single'}
              </span>
            </div>
          </div>

          {member.groups && member.groups.length > 0 && (
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-[#FAF7F2] dark:bg-muted/50 flex items-center justify-center text-[#8B2323] shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div className="flex flex-col min-w-0 pt-0.5">
                <span className="text-xs font-medium text-muted-foreground mb-1">Groups</span>
                <div className="flex flex-wrap gap-1">
                  {member.groups.map(g => (
                    <Badge key={g} variant="outline" className="text-xs font-semibold bg-[#FAF7F2] dark:bg-muted/40 border-border/40">
                      {g}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="bg-white dark:bg-card border border-red-100 dark:border-red-900/40 shadow-[0px_4px_20px_rgba(0,0,0,0.04)] rounded-3xl p-6 space-y-3">
          <h2 className="text-sm font-semibold text-red-700 dark:text-red-400">Delete account</h2>
          <p className="text-sm text-muted-foreground">
            Permanently delete your Grace Connect account and any family profiles linked to it. This cannot be undone.
          </p>
          <Button
            type="button"
            variant="outline"
            className="w-full rounded-xl border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900/50 dark:hover:bg-red-950/30"
            onClick={() => setDeleteConfirmOpen(true)}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete account
          </Button>
        </section>
      </main>

      <LogoutConfirmDialog
        open={logoutConfirmOpen}
        onOpenChange={setLogoutConfirmOpen}
        loading={loggingOut}
        onConfirm={handleLogout}
      />
      <DeleteAccountDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        loading={deleting}
        onConfirm={handleDeleteAccount}
      />
    </div>
  );
}

