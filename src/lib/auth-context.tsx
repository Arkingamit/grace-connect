"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { toast } from 'sonner';

import { ChurchMember, AuthSession, MemberStatus } from '@/lib/types';

export type { ChurchMember, AuthSession, MemberStatus };

export interface VerifyOrLoginResult {
  status: 'existing' | 'new' | 'pending' | 'rejected' | 'error';
  success?: boolean;
  email?: string;
  error?: string;
  rejectionReason?: string;
  rejectionNote?: string;
}

interface AuthContextType {
  session: AuthSession | null;
  members: ChurchMember[];
  isLoading: boolean;
  register: (data: Partial<ChurchMember> & { credential?: string; appleState?: string; provider?: 'google' | 'apple' }) => Promise<{ success: boolean; error?: string; userId?: string; qrCode?: string; email?: string }>;
  login: (credential: string, provider?: 'google' | 'apple', picture?: string) => Promise<{ success: boolean; error?: string }>;
  /** Unified verify endpoint: checks if user exists, logs in if so, returns 'new' if not */
  verifyOrLogin: (credential: string, provider?: 'google' | 'apple', picture?: string) => Promise<VerifyOrLoginResult>;
  /** App Store / Play reviewer bypass — requires DEMO_LOGIN_ENABLED + matching secret */
  demoLogin: (code: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  getMember: (id: string) => ChurchMember | undefined;
  getSessionMember: () => ChurchMember | undefined;
  getPendingRequests: (campusId?: string) => ChurchMember[];
  approveMember: (id: string, groups: string[]) => Promise<void>;
  rejectMember: (id: string, data: { rejectionReason: string; rejectionNote?: string }) => Promise<{ success: boolean; error?: string }>;
  getApprovedMembers: () => ChurchMember[];
  getEffectiveGroups: (member: ChurchMember) => string[];
  refreshMembers: () => Promise<void>;
  refreshSession: () => Promise<void>;
  linkedProfiles: ChurchMember[];
  activeProfileId: string | null;
  switchProfile: (profileId: string | null) => void;
  addLinkedProfile: (data: any) => Promise<{ success: boolean; error?: string; id?: string }>;
  removeLinkedProfile: (id: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [members, setMembers] = useState<ChurchMember[]>([]);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [sessionMember, setSessionMember] = useState<ChurchMember | null>(null);
  const [linkedProfiles, setLinkedProfiles] = useState<ChurchMember[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const prevMemberStatusRef = useRef<string | null>(null);
  const prevLinkedStatusRef = useRef<Record<string, string>>({});

  const applySessionFromApi = useCallback((data: any) => {
    if (!data?.user) {
      prevMemberStatusRef.current = null;
      prevLinkedStatusRef.current = {};
      setSession(null);
      setSessionMember(null);
      setLinkedProfiles([]);
      setActiveProfileId(null);
      return;
    }

    const formattedMember = {
      ...data.user,
      id: data.user._id || data.user.id,
    };
    const nextStatus = formattedMember.status || 'approved';
    const wasPending = prevMemberStatusRef.current === 'pending';
    prevMemberStatusRef.current = nextStatus;

    const nextLinked: ChurchMember[] = (data.linkedProfiles || []).map((p: any) => ({
      ...p,
      id: p.id || p._id,
    }));
    const prevLinked = prevLinkedStatusRef.current;
    const linkedBecameApproved = nextLinked.some(
      (p) => prevLinked[p.id] === 'pending' && p.status === 'approved',
    );
    prevLinkedStatusRef.current = Object.fromEntries(
      nextLinked.map((p) => [p.id, p.status || 'approved']),
    );

    setSessionMember(formattedMember);
    setSession({
      memberId: formattedMember.id,
      email: formattedMember.email,
      name: formattedMember.name || `${formattedMember.firstName} ${formattedMember.lastName}`,
      role: formattedMember.role || 'member',
      avatar: formattedMember.avatar || undefined,
    });
    setLinkedProfiles(nextLinked);

    if (typeof window !== 'undefined') {
      const savedProfileId = localStorage.getItem('activeProfileId');
      if (savedProfileId && (savedProfileId === formattedMember.id || nextLinked.some((p) => p.id === savedProfileId))) {
        setActiveProfileId(savedProfileId);
      } else {
        setActiveProfileId(null);
      }
    }

    if ((wasPending && nextStatus === 'approved') || linkedBecameApproved) {
      toast.success('Your registration was approved', {
        description: 'Welcome to Grace Community — member sections are now unlocked.',
      });
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('grace-membership-updated', {
          detail: { status: 'approved' },
        }));
      }
    }
  }, []);

  const fetchSession = useCallback(async (silent = false) => {
    try {
      const sessionRes = await fetch('/api/auth/me', { cache: 'no-store' }).catch(() => null);

      if (sessionRes?.ok) {
        const data = await sessionRes.json();
        applySessionFromApi(data);
      } else if (sessionRes && (sessionRes.status === 401 || sessionRes.status === 404)) {
        applySessionFromApi(null);
      } else if (!silent) {
        applySessionFromApi(null);
      }
    } catch (error) {
      console.error('Failed to fetch auth state', error);
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [applySessionFromApi]);

  // Separate members fetch — only called when explicitly needed (e.g., admin approval flow)
  const refreshMembers = useCallback(async () => {
    try {
      const membersRes = await fetch('/api/admin/users').catch(() => null);
      if (membersRes?.ok) {
        const users = await membersRes.json();
        setMembers(users.map((u: any) => ({ ...u, id: u._id })));
      }
    } catch (error) {
      console.error('Failed to fetch members', error);
    }
  }, []);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  const awaitingApproval =
    !!session &&
    (sessionMember?.status === 'pending' ||
      linkedProfiles.some((p) => p.status === 'pending'));

  useEffect(() => {
    if (!awaitingApproval) return;

    const poll = () => {
      void fetchSession(true);
    };

    const interval = window.setInterval(poll, 8000);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') poll();
    };
    document.addEventListener('visibilitychange', onVisibility);

    let cancelled = false;
    const removals: Array<() => void> = [];
    if (Capacitor.isNativePlatform()) {
      App.addListener('appStateChange', ({ isActive }) => {
        if (isActive) poll();
      }).then((handle) => {
        if (cancelled) handle.remove();
        else removals.push(() => handle.remove());
      });
    }

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
      removals.forEach((remove) => remove());
    };
  }, [awaitingApproval, fetchSession]);

  const register = useCallback(async (data: Partial<ChurchMember> & { credential?: string; appleState?: string; provider?: 'google' | 'apple' }) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) return { success: false, error: result.error || 'Failed to register' };

      await fetchSession();
      return {
        success: true,
        userId: result.userId ? String(result.userId) : undefined,
        qrCode: result.qrCode ? String(result.qrCode) : undefined,
        email: result.email ? String(result.email) : undefined,
      };
    } catch (error: any) {
      return { success: false, error: 'Network error during registration' };
    }
  }, []);

  const login = useCallback(async (credential: string, provider: 'google' | 'apple' = 'google', picture?: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential, provider, picture }),
      });
      const result = await res.json();
      if (!res.ok) return { success: false, error: result.error || 'Login failed' };

      await fetchSession();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: 'Network error during login' };
    }
  }, []);

  const verifyOrLogin = useCallback(async (credential: string, provider: 'google' | 'apple' = 'google', picture?: string): Promise<VerifyOrLoginResult> => {
    try {
      const res = await fetch('/api/auth/verify-or-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential, provider, picture }),
      });
      const result = await res.json();

      if ((result.status === 'existing' || result.status === 'pending') && result.success) {
        await fetchSession();
      }

      return {
        status: result.status || 'error',
        success: result.success,
        email: result.email,
        error: result.error,
        rejectionReason: result.rejectionReason,
        rejectionNote: result.rejectionNote,
      };
    } catch {
      return { status: 'error', error: 'Network error during verification' };
    }
  }, []);

  const demoLogin = useCallback(async (code: string) => {
    try {
      const res = await fetch('/api/auth/demo-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const result = await res.json();
      if (!res.ok) return { success: false, error: result.error || 'Demo login failed' };

      await fetchSession();
      return { success: true };
    } catch {
      return { success: false, error: 'Network error during demo login' };
    }
  }, []);

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setSession(null);
    setSessionMember(null);
    setLinkedProfiles([]);
    setActiveProfileId(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('activeProfileId');
    }
  }, []);

  const getMember = useCallback((id: string) => members.find(m => m.id === id || m._id === id), [members]);

  const getApprovedMembers = useCallback(() => {
    return members.filter(m => m.status === 'approved');
  }, [members]);

  const getEffectiveGroups = useCallback((member: ChurchMember): string[] => {
    const ownGroups = member.groups || [];
    if (!member.familyMemberId) return ownGroups;
    const familyMember = members.find(m => m.id === member.familyMemberId);
    if (!familyMember) return ownGroups;
    const familyGroups = familyMember.groups || [];
    return Array.from(new Set([...ownGroups, ...familyGroups]));
  }, [members]);

  const getSessionMember = useCallback(() => {
    if (!session) return undefined;
    if (activeProfileId && activeProfileId !== session.memberId) {
      const linked = linkedProfiles.find(p => p.id === activeProfileId);
      if (linked) return linked;
    }
    return sessionMember || members.find(m => m.id === session.memberId);
  }, [session, sessionMember, members, activeProfileId, linkedProfiles]);

  const getPendingRequests = useCallback((campusId?: string) => {
    return members.filter(m =>
      m.status === 'pending' && (!campusId || m.campusId === campusId)
    );
  }, [members]);

  const approveMember = useCallback(async (id: string, groups: string[]) => {
    try {
      const qrCode = crypto.randomUUID();
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved', groups, qrCode }),
      });
      if (res.ok) {
        const updatedUser = await res.json();
        setMembers(prev => prev.map(m => m.id === id ? { ...m, ...updatedUser, id: updatedUser._id } : m));
      }
    } catch (e) {
      console.error('Failed to approve member', e);
    }
  }, []);

  const rejectMember = useCallback(async (id: string, data: { rejectionReason: string; rejectionNote?: string }) => {
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'rejected',
          rejectionReason: data.rejectionReason,
          rejectionNote: data.rejectionNote || '',
        }),
      });
      if (!res.ok) {
        const result = await res.json().catch(() => ({}));
        return { success: false, error: result.error || 'Failed to reject member' };
      }
      const updatedUser = await res.json();
      setMembers(prev => prev.map(m => m.id === id ? { ...m, ...updatedUser, id: updatedUser._id } : m));
      return { success: true };
    } catch (e) {
      console.error('Failed to reject member', e);
      return { success: false, error: 'Failed to reject member' };
    }
  }, []);

  const switchProfile = useCallback((profileId: string | null) => {
    setActiveProfileId(profileId);
    if (typeof window !== 'undefined') {
      if (profileId) {
        localStorage.setItem('activeProfileId', profileId);
      } else {
        localStorage.removeItem('activeProfileId');
      }
    }
  }, []);

  const addLinkedProfile = useCallback(async (data: any) => {
    try {
      const res = await fetch('/api/auth/linked-profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) return { success: false, error: result.error || 'Failed to add profile' };
      
      setLinkedProfiles(prev => [...prev, result]);
      return { success: true, id: result.id || result._id };
    } catch (e) {
      return { success: false, error: 'Network error' };
    }
  }, []);

  const removeLinkedProfile = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/auth/linked-profiles/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const result = await res.json();
        return { success: false, error: result.error || 'Failed to remove profile' };
      }
      setLinkedProfiles(prev => prev.filter(p => p.id !== id));
      if (activeProfileId === id) {
        switchProfile(null); // Revert to primary account
      }
      return { success: true };
    } catch (e) {
      return { success: false, error: 'Network error' };
    }
  }, [activeProfileId, switchProfile]);

  return (
    <AuthContext.Provider value={{
      session, members, isLoading,
      register, login, verifyOrLogin, demoLogin, logout,
      getMember, getSessionMember,
      getPendingRequests, approveMember, rejectMember,
      getApprovedMembers, getEffectiveGroups,
      refreshMembers,
      refreshSession: () => fetchSession(true),
      linkedProfiles, activeProfileId, switchProfile, addLinkedProfile, removeLinkedProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
