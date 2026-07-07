"use client";

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useAdminData } from '@/lib/admin-data-context';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Church, User, Mail, Phone, Calendar, Building2, Heart, Users,
  ArrowLeft, QrCode, Shield,
} from 'lucide-react';

export default function ProfilePage() {
  const { session, getSessionMember } = useAuth();
  const { campuses } = useAdminData();

  const member = getSessionMember();

  if (!session || !member) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-border/50 shadow-elevated">
          <CardContent className="p-8 text-center space-y-4">
            <Shield className="w-12 h-12 text-muted-foreground mx-auto" />
            <h2 className="text-xl font-bold">Not Signed In</h2>
            <p className="text-muted-foreground text-sm">
              Please sign in to view your profile.
            </p>
            <Link href="/login">
              <Button>Sign In</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const campus = campuses.find(c => c.id === member.campusId);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(member.qrCode)}&bgcolor=0a0a0a&color=ffffff`;

  return (
    <div className="min-h-screen bg-transparent flex items-center justify-center p-4">
      {/* Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/3 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/3 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Back */}
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>

        {/* Profile Card */}
        <Card className="border-border/50 shadow-elevated">
          <CardContent className="p-6 space-y-6">
            {/* Avatar + Name */}
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto">
                <span className="text-xl font-bold text-white">
                  {member.firstName[0]}{member.lastName[0]}
                </span>
              </div>
              <h2 className="text-xl font-bold">
                {member.firstName} {member.middleName ? `${member.middleName} ` : ''}{member.lastName}
              </h2>
              <div className="flex items-center justify-center gap-2">
                <Badge variant="outline" className="text-xs">{member.gender === 'male' ? 'Male' : 'Female'}</Badge>
                <Badge className="bg-emerald-500/10 text-emerald-600 text-xs">Active Member</Badge>
              </div>
            </div>

            {/* Enhanced ePass QR Code */}
            <div className="relative pt-4 pb-2">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 rounded-2xl transform -skew-y-2"></div>
              <div className="relative text-center space-y-3">
                <div className="inline-flex flex-col items-center p-5 bg-white rounded-2xl shadow-sm border border-primary/10 relative overflow-hidden group">
                  {/* Subtle pulsing background for attention during events */}
                  <div className="absolute inset-0 bg-primary/5 animate-pulse opacity-50"></div>
                  
                  <div className="relative z-10">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={qrUrl}
                      alt="Member ePass QR Code"
                      width={180}
                      height={180}
                      className="mix-blend-multiply"
                    />
                  </div>
                  
                  <div className="mt-3 relative z-10 w-full text-center">
                    <p className="text-[10px] text-muted-foreground font-mono bg-muted/30 py-1 rounded-md">
                      {member.qrCode}
                    </p>
                  </div>
                </div>
                
                <div className="flex flex-col items-center gap-1">
                  <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                    <QrCode className="w-3 h-3 mr-1" /> Official ePass
                  </Badge>
                  <p className="text-xs text-muted-foreground">
                    Show this to your leader for attendance check-in
                  </p>
                </div>
              </div>
            </div>

            {/* Details */}
            <div className="space-y-3 border-t border-border/50 pt-4">
              <div className="flex items-center gap-3 text-sm">
                <Mail className="w-4 h-4 text-primary shrink-0" />
                <span>{member.email}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Phone className="w-4 h-4 text-primary shrink-0" />
                <span>{member.phone}</span>
              </div>
              {member.whatsapp && member.whatsapp !== member.phone && (
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>WhatsApp: {member.whatsapp}</span>
                </div>
              )}
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="w-4 h-4 text-primary shrink-0" />
                <span>{new Date(member.birthday).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Building2 className="w-4 h-4 text-primary shrink-0" />
                <span>{campus?.name || member.campusId}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Heart className="w-4 h-4 text-primary shrink-0" />
                <span>{member.maritalStatus === 'married' ? `Married${member.marriageDate ? ` (${new Date(member.marriageDate).toLocaleDateString()})` : ''}` : 'Single'}</span>
              </div>
              {member.groups.length > 0 && (
                <div className="flex items-start gap-3 text-sm">
                  <Users className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <div className="flex flex-wrap gap-1">
                    {member.groups.map(g => (
                      <Badge key={g} variant="outline" className="text-[10px]">{g}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
