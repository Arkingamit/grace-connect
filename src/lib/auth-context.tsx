"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

import { ChurchMember, AuthSession, MemberStatus } from '@/lib/types';

export type { ChurchMember, AuthSession, MemberStatus };

interface AuthContextType {
  session: AuthSession | null;
  members: ChurchMember[];
  isLoading: boolean;
  register: (data: Partial<ChurchMember> & { credential?: string; appleState?: string; provider?: 'google' | 'apple' }) => Promise<{ success: boolean; error?: string; userId?: string; qrCode?: string; email?: string }>;
  login: (credential: string, provider?: 'google' | 'apple', picture?: string, profile?: { givenName?: string; familyName?: string }) => Promise<{
    success: boolean;
    error?: string;
    needsRegistration?: boolean;
    firstName?: string;
    lastName?: string;
    email?: string;
    picture?: string;
  }>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<{ success: boolean; error?: string }>;
  getMember: (id: string) => ChurchMember | undefined;
  getSessionMember: () => ChurchMember | undefined;
  getPendingRequests: (campusId?: string) => ChurchMember[];
  approveMember: (id: string, groups: string[]) => Promise<void>;
  rejectMember: (id: string, data: { rejectionReason: string; rejectionNote?: string }) => Promise<{ success: boolean; error?: string }>;
  getApprovedMembers: () => ChurchMember[];
  getEffectiveGroups: (member: ChurchMember) => string[];
  refreshMembers: () => Promise<void>;
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

  const fetchSession = useCallback(async () => {
    try {
      // Only fetch session — no longer fetching /api/admin/users here.
      // Users list is managed by AdminDataContext (scoped to /admin routes).
      const sessionRes = await fetch('/api/auth/me').catch(() => null);

      if (sessionRes?.ok) {
        const data = await sessionRes.json();
        if (data.user) {
          const formattedMember = {
            ...data.user,
            id: data.user._id
          };
          setSessionMember(formattedMember);
          setSession({
            memberId: data.user._id,
            email: data.user.email,
            name: data.user.name || `${data.user.firstName} ${data.user.lastName}`,
            role: data.user.role || 'member',
            avatar: data.user.avatar || undefined,
          });
          
          if (data.linkedProfiles) {
            setLinkedProfiles(data.linkedProfiles);
          }

          // Restore active profile from localStorage if valid
          if (typeof window !== 'undefined') {
            const savedProfileId = localStorage.getItem('activeProfileId');
            if (savedProfileId && (savedProfileId === data.user._id || data.linkedProfiles?.some((p: any) => p.id === savedProfileId))) {
              setActiveProfileId(savedProfileId);
            } else {
              setActiveProfileId(null);
            }
          }
        } else {
          setSession(null);
          setSessionMember(null);
          setLinkedProfiles([]);
          setActiveProfileId(null);
        }
      } else {
        setSession(null);
        setSessionMember(null);
        setLinkedProfiles([]);
        setActiveProfileId(null);
      }
    } catch (error) {
      console.error('Failed to fetch auth state', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

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
    // Members are only loaded lazily when needed (admin routes)
  }, [fetchSession]);

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

  const login = useCallback(async (
    credential: string,
    provider: 'google' | 'apple' = 'google',
    picture?: string,
    profile?: { givenName?: string; familyName?: string },
  ) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credential,
          provider,
          picture,
          givenName: profile?.givenName,
          familyName: profile?.familyName,
        }),
      });
      const result = await res.json();
      if (result?.needsRegistration) {
        return {
          success: false,
          needsRegistration: true,
          firstName: result.firstName ? String(result.firstName) : undefined,
          lastName: result.lastName ? String(result.lastName) : undefined,
          email: result.email ? String(result.email) : undefined,
          picture: result.picture ? String(result.picture) : undefined,
        };
      }
      if (!res.ok) return { success: false, error: result.error || 'Login failed' };

      await fetchSession();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: 'Network error during login' };
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

  const deleteAccount = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/account', { method: 'DELETE' });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { success: false, error: result.error || 'Failed to delete account' };
      }
      setSession(null);
      setSessionMember(null);
      setLinkedProfiles([]);
      setActiveProfileId(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('activeProfileId');
      }
      return { success: true };
    } catch {
      return { success: false, error: 'Network error while deleting account' };
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
      register, login, logout, deleteAccount,
      getMember, getSessionMember,
      getPendingRequests, approveMember, rejectMember,
      getApprovedMembers, getEffectiveGroups,
      refreshMembers,
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
