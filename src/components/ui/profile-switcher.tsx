"use client";

import { useAuth } from '@/lib/auth-context';
import { useAdminData } from '@/lib/admin-data-context';
import { Button } from './button';
import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './dropdown-menu';
import { Avatar, AvatarFallback } from './avatar';
import { Check, UserPlus, QrCode } from 'lucide-react';
import { useState, useEffect } from 'react';
import { AddFamilyMemberDialog } from './add-family-member-dialog';

export function ProfileSwitcher() {
  const { session, getSessionMember, linkedProfiles, switchProfile, addLinkedProfile, logout } = useAuth();
  const { campuses } = useAdminData();
  const activeMember = getSessionMember();
  const [isAdding, setIsAdding] = useState(false);
  const [hasActiveSession, setHasActiveSession] = useState(false);

  useEffect(() => {
    if (session) {
      fetch('/api/attendance/active?all=true')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data) && data.length > 0) {
            setHasActiveSession(true);
          }
        })
        .catch(() => {});
    }
  }, [session]);

  if (!session || !activeMember) return null;

  const getInitials = (name: string) => name.substring(0, 2).toUpperCase();

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="w-10 h-10 rounded-full bg-[#721515] flex items-center justify-center border border-[#E5D5C5]/60 shadow-sm outline-none">
            <span className="text-xs font-bold text-white uppercase">{getInitials((activeMember as any).name || activeMember.firstName)}</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64 rounded-2xl p-2 border-[#E5D5C5]">
          <DropdownMenuLabel className="font-bold text-[#1A202C]">{(activeMember as any).name || `${activeMember.firstName} ${activeMember.lastName}`}</DropdownMenuLabel>
          <DropdownMenuSeparator />

          {hasActiveSession && (
            <DropdownMenuItem asChild className="rounded-xl cursor-pointer text-[#8B2323] font-bold">
              <Link href="/profile" className="flex items-center gap-2 w-full">
                <QrCode className="w-4 h-4" /> My ePass
              </Link>
            </DropdownMenuItem>
          )}

          <DropdownMenuItem asChild className="rounded-xl cursor-pointer">
            <Link href="/profile">My Profile</Link>
          </DropdownMenuItem>
          {['admin', 'superadmin', 'super_admin', 'staff', 'group_leader', 'campus_leader'].includes(session.role?.toLowerCase() || '') && (
            <DropdownMenuItem asChild className="rounded-xl cursor-pointer text-[#8B2323] font-bold">
              <Link href="/admin">Admin Panel</Link>
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />
          
          <DropdownMenuLabel className="text-[10px] text-muted-foreground uppercase tracking-wider px-2 pt-2">Switch Profile</DropdownMenuLabel>
          
          <DropdownMenuItem onClick={() => switchProfile(null)} className="rounded-xl flex items-center gap-2 cursor-pointer">
            <Avatar className="w-6 h-6">
              <AvatarFallback className="text-[10px]">{getInitials(session.name)}</AvatarFallback>
            </Avatar>
            <span className="flex-1 truncate text-sm">{session.name} <span className="text-xs text-muted-foreground">(You)</span></span>
            {!linkedProfiles.find(p => p.id === activeMember.id) && <Check className="w-4 h-4 text-primary" />}
          </DropdownMenuItem>

          {linkedProfiles.map((profile) => (
            <DropdownMenuItem key={profile.id} onClick={() => switchProfile(profile.id)} className="rounded-xl flex items-center gap-2 cursor-pointer">
              <Avatar className="w-6 h-6">
                <AvatarFallback className="text-[10px] bg-muted">{getInitials(profile.name)}</AvatarFallback>
              </Avatar>
              <span className="flex-1 truncate text-sm">{profile.name}</span>
              {activeMember.id === profile.id && <Check className="w-4 h-4 text-primary" />}
            </DropdownMenuItem>
          ))}

          <DropdownMenuItem onClick={() => setIsAdding(true)} className="rounded-xl gap-2 cursor-pointer text-primary mt-1">
            <UserPlus className="w-4 h-4" />
            <span className="text-sm">Add Family Member</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={async () => {
              await logout();
              window.location.href = '/';
            }}
            className="rounded-xl cursor-pointer text-red-600 font-bold focus:text-red-600"
          >
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AddFamilyMemberDialog open={isAdding} onOpenChange={setIsAdding} />
    </>
  );
}
