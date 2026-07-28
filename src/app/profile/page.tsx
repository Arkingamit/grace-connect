"use client";

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useAdminData } from '@/lib/admin-data-context';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Church, User, Mail, Phone, Calendar, Building2, Heart, Users,
  ArrowLeft, QrCode, Shield, LogOut, Cake, MessageSquare, UserCheck
} from 'lucide-react';
import { toast } from 'sonner';

export default function ProfilePage() {
  const router = useRouter();
  const { session, logout, getSessionMember, linkedProfiles, activeProfileId, switchProfile } = useAuth();
  const { campuses } = useAdminData();

  const member = getSessionMember();

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Signed out successfully');
      router.push('/login');
    } catch {
      toast.error('Failed to sign out');
    }
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
      <header className="sticky top-0 z-50 bg-[#FAF7F2]/80 dark:bg-background/80 backdrop-blur-md border-b border-border/40">
        <div className="flex items-center px-4 h-16 w-full max-w-xl mx-auto">
          <button
            onClick={() => router.back()}
            className="flex items-center justify-center w-10 h-10 -ml-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-all active:scale-95 text-[#8B2323] dark:text-primary"
            title="Go Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="ml-2 font-serif text-xl font-bold text-[#1A202C] dark:text-foreground">Profile</h1>
          <button
            onClick={handleLogout}
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
          {/* Avatar */}
          <div className="relative mb-4">
            <div className="w-24 h-24 rounded-full bg-[#8B2323]/10 text-[#8B2323] dark:bg-primary/20 dark:text-primary flex items-center justify-center ring-4 ring-[#8B2323]/15 font-serif text-3xl font-bold">
              {initials}
            </div>
            <div className="absolute bottom-0 right-0 w-6 h-6 bg-emerald-500 rounded-full border-2 border-white dark:border-card" />
          </div>

          {/* Name & Tags */}
          <div className="text-center mb-6">
            <h2 className="text-2xl font-serif font-bold text-[#1A202C] dark:text-foreground mb-2">
              {member.firstName} {member.middleName ? `${member.middleName} ` : ''}{member.lastName}
            </h2>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <span className="px-3 py-1 bg-muted/60 text-muted-foreground text-xs font-semibold rounded-full capitalize">
                {member.gender}
              </span>
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

        {/* Linked Profiles Switcher (If any family members are linked) */}
        {linkedProfiles && linkedProfiles.length > 0 && (
          <section className="bg-white dark:bg-card border border-border/50 shadow-[0px_4px_20px_rgba(0,0,0,0.04)] rounded-3xl p-6 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-[#8B2323]" /> Active Profile Switcher
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => switchProfile(null)}
                className={`p-3 rounded-2xl border text-left transition-all flex items-center gap-3 ${
                  activeProfileId === null
                    ? 'bg-[#8B2323] text-white border-[#8B2323]'
                    : 'bg-[#FAF7F2] dark:bg-muted/30 border-border/40 hover:border-[#8B2323]/40'
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                  activeProfileId === null ? 'bg-white/20 text-white' : 'bg-[#8B2323]/10 text-[#8B2323]'
                }`}>
                  {(session.name ? session.name.split(' ')[0] : 'Primary')[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">{session.name ? session.name.split(' ')[0] : 'Primary'} (Primary)</p>
                  <p className={`text-[10px] truncate ${activeProfileId === null ? 'text-white/70' : 'text-muted-foreground'}`}>{session.email}</p>
                </div>
              </button>
              {linkedProfiles.map((lp) => (
                <button
                  key={lp.id}
                  onClick={() => switchProfile(lp.id)}
                  className={`p-3 rounded-2xl border text-left transition-all flex items-center gap-3 ${
                    activeProfileId === lp.id
                      ? 'bg-[#8B2323] text-white border-[#8B2323]'
                      : 'bg-[#FAF7F2] dark:bg-muted/30 border-border/40 hover:border-[#8B2323]/40'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                    activeProfileId === lp.id ? 'bg-white/20 text-white' : 'bg-[#8B2323]/10 text-[#8B2323]'
                  }`}>
                    {lp.firstName[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{lp.firstName} {lp.lastName}</p>
                    <p className={`text-[10px] truncate ${activeProfileId === lp.id ? 'text-white/70' : 'text-muted-foreground'}`}>Linked Profile</p>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

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
              <span className="text-sm font-semibold text-[#1A202C] dark:text-foreground truncate">{campus?.name || member.campusId}</span>
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
      </main>
    </div>
  );
}

