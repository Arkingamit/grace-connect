"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';

import {
  UserRole,
  Group,
  Campus,
  FormFieldType,
  FormFieldOption,
  FormField,
  EventScheduleDay,
  Event,
  EventRegistration,
  Announcement,
  WorshipVideo,
  Sermon,
  SystemSettings,
  SermonSeries,
  FlipCardItem,
  FlipCardConfig,
  GalleryAlbum,
  PrayerRequest,
  LiveStream,
  UserProfile,
} from '@/lib/types';

export type {
  UserRole,
  Group,
  Campus,
  FormFieldType,
  FormFieldOption,
  FormField,
  EventScheduleDay,
  Event,
  EventRegistration,
  Announcement,
  WorshipVideo,
  Sermon,
  SystemSettings,
  SermonSeries,
  FlipCardItem,
  FlipCardConfig,
  GalleryAlbum,
  PrayerRequest,
  LiveStream,
  UserProfile,
};

import { useEvents } from './hooks/use-events';
import { useAnnouncements } from './hooks/use-announcements';
import { useGallery } from './hooks/use-gallery';
import { useSermons } from './hooks/use-sermons';
import { usePrayers } from './hooks/use-prayers';
import { useCampuses } from './hooks/use-campuses';
import { useUsers } from './hooks/use-users';
import { useMedia } from './hooks/use-media';
import { useSystem } from './hooks/use-system';
import { mapId } from './hooks/utils';

// ── Permissions ────────────────────────────────────────────────────────
export const ROLE_LABELS: Record<UserRole, string> = {
  member: 'Member',
  group_leader: 'FASL Leader',
  campus_leader: 'Campus Leader',
  admin: 'Admin',
  super_admin: 'IT Team',
};

/** Core Team Leader = group_leader with campusId === 'global' (cross-campus for their groups) */
export function isCoreTeamLeader(role: UserRole | string, campusId?: string): boolean {
  return role === 'group_leader' && campusId === 'global';
}

/** FASL Leader = group_leader assigned to a specific campus */
export function isFasLeader(role: UserRole | string, campusId?: string): boolean {
  return role === 'group_leader' && campusId !== 'global';
}

/**
 * Returns the context-aware display label for a role.
 * group_leader + campusId === 'global' → 'Core Team Leader'
 * group_leader + specific campus       → 'FASL Leader'
 * All other roles use the standard ROLE_LABELS entry.
 */
export function getRoleLabel(role: UserRole, campusId?: string): string {
  if (role === 'group_leader') {
    return isCoreTeamLeader(role, campusId) ? 'Core Team Leader' : 'FASL Leader';
  }
  return ROLE_LABELS[role];
}

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  member: 0,
  group_leader: 1,
  campus_leader: 2,
  admin: 3,
  super_admin: 4,
};

export function canAccessAdmin(role: UserRole): boolean {
  return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY.group_leader;
}

export function canPublish(role: UserRole): boolean {
  return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY.group_leader;
}

export function canPublishAllCampuses(role: UserRole): boolean {
  return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY.admin;
}

export function canViewUsers(role: UserRole): boolean {
  return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY.group_leader;
}

export function canManageUsers(role: UserRole): boolean {
  return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY.campus_leader;
}

/** FASL / Core can edit members inside their group (and campus) scope */
export function canEditScopedMembers(role: UserRole): boolean {
  return role === 'group_leader' || canManageUsers(role);
}

/** Campuses + system settings: Admin / IT Team */
export function canManageCampusesAndGroups(role: UserRole): boolean {
  return role === 'super_admin' || role === 'admin';
}

/** Create/manage groups + appoint FASL / Core leaders: Campus Leader and above */
export function canManageGroups(role: UserRole): boolean {
  return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY.campus_leader;
}

export function canAppointRole(appointerRole: UserRole, targetRole: UserRole): boolean {
  if (appointerRole === 'super_admin') return true;
  if (appointerRole === 'admin' && ROLE_HIERARCHY[targetRole] <= ROLE_HIERARCHY.campus_leader) return true;
  if (appointerRole === 'campus_leader' && (targetRole === 'group_leader' || targetRole === 'member')) return true;
  return false;
}

export function getAssignableRoles(role: UserRole): UserRole[] {
  if (role === 'super_admin') return ['member', 'group_leader', 'campus_leader', 'admin', 'super_admin'];
  if (role === 'admin') return ['member', 'group_leader', 'campus_leader'];
  if (role === 'campus_leader') return ['member', 'group_leader'];
  return [];
}

/** Get group names visible for a given campus (global + campus-specific) */
export function getGroupsForCampus(groupScopes: Group[], campusId: string): string[] {
  if (campusId === 'global') {
    return groupScopes.map(g => g.name);
  }
  return groupScopes
    .filter(g => g.scope === 'global' || g.scope === campusId)
    .map(g => g.name);
}

/**
 * Returns the campuses a user is allowed to target based on their role.
 * - admin/super_admin: all campuses
 * - Core Team Leader (group_leader + global): all campuses
 * - campus_leader / FASL Leader: only their own campus
 */
export function getAllowedCampuses(role: UserRole, campusId: string, campuses: Campus[]): Campus[] {
  if (role === 'admin' || role === 'super_admin' || isCoreTeamLeader(role, campusId)) {
    return campuses;
  }
  return campuses.filter(c => c.id === campusId);
}

/**
 * Returns the group names a user is allowed to target.
 * - admin/super_admin: all groups
 * - campus_leader: all groups within their campus
 * - group_leader (FASL or Core): only their own assigned groups
 */
export function getAllowedGroups(
  role: UserRole,
  userGroups: string[],
  groupScopes: Group[],
  campusId: string
): string[] {
  if (role === 'admin' || role === 'super_admin') {
    return groupScopes.map(g => g.name);
  }
  if (role === 'campus_leader') {
    return getGroupsForCampus(groupScopes, campusId);
  }
  // group_leader: only their own groups
  return userGroups;
}

/**
 * Whether the user has global (all-campus) broadcast scope.
 * Core Team Leaders can target all campuses (groups still restricted).
 */
export function hasGlobalScope(role: UserRole, campusId?: string): boolean {
  return role === 'admin' || role === 'super_admin' || isCoreTeamLeader(role, campusId);
}

// ── Default Groups (kept client-side for now) ──────────────────────────
const defaultGroups: string[] = [
  'Young Adults', 'Families', 'Men', 'Women',
  'Seniors', 'New Members', 'Couples', 'Youth',
];

const defaultGroupScopes: Group[] = defaultGroups.map(name => ({ name, scope: 'global' }));

const defaultCurrentUser: UserProfile = {
  id: '1', name: 'Super Admin', email: 'superadmin@grace.org',
  role: 'super_admin', campusId: 'main', groups: [],
};

// ── Context ────────────────────────────────────────────────────────────
interface AdminDataContextType {
  // Loading
  isLoading: boolean;

  // Data
  campuses: Campus[];
  groups: string[];
  groupScopes: Group[];
  events: Event[];
  eventRegistrations: EventRegistration[];
  announcements: Announcement[];
  users: UserProfile[];
  worshipVideos: WorshipVideo[];
  sermons: Sermon[];
  sermonSeries: SermonSeries[];
  currentUser: UserProfile;
  galleryAlbumUrl: string;
  galleryAlbums: GalleryAlbum[];
  liveStreams: LiveStream[];
  prayerRequests: PrayerRequest[];
  broadcasts: any[];
  flipCardConfig: FlipCardConfig;
  systemSettings: SystemSettings | null;

  // Setters
  setCurrentUser: (user: UserProfile) => void;
  setGalleryAlbumUrl: (url: string) => void;

  // Live Streams CRUD
  updateLiveStream: (campusId: string, updates: Partial<LiveStream>) => void;

  // Gallery CRUD
  addGalleryAlbum: (album: Omit<GalleryAlbum, 'id'>) => void;
  updateGalleryAlbum: (id: string, album: Partial<GalleryAlbum>) => void;
  deleteGalleryAlbum: (id: string) => void;
  reorderGalleryAlbums: (albums: GalleryAlbum[]) => void;

  // Events CRUD
  addEvent: (event: Omit<Event, 'id' | 'createdAt'>) => void;
  updateEvent: (id: string, event: Partial<Event>, updateSeries?: boolean) => void;
  deleteEvent: (id: string, deleteSeries?: boolean) => void;
  addEventRegistration: (reg: Omit<EventRegistration, 'id' | 'registeredAt'>) => void;
  updateEventRegistration: (id: string, reg: Partial<EventRegistration>) => void;
  getEventRegistrations: (eventId: string) => EventRegistration[];

  // Announcements CRUD
  addAnnouncement: (a: Omit<Announcement, 'id' | 'createdAt'>) => void;
  updateAnnouncement: (id: string, a: Partial<Announcement>) => void;
  deleteAnnouncement: (id: string) => void;

  // Users CRUD
  addUser: (user: Omit<UserProfile, 'id'>) => void;
  updateUser: (id: string, updates: Partial<UserProfile>) => void;
  deleteUser: (id: string) => void;

  // Worship Videos CRUD
  addWorshipVideo: (video: Omit<WorshipVideo, 'id'>) => void;
  updateWorshipVideo: (id: string, video: Partial<WorshipVideo>) => void;
  deleteWorshipVideo: (id: string) => void;

  // Sermons CRUD
  addSermon: (sermon: Omit<Sermon, 'id' | 'views' | 'likes'>) => void;
  updateSermon: (id: string, sermon: Partial<Sermon>) => void;
  deleteSermon: (id: string) => void;
  reorderSermons: (sermons: Sermon[]) => void;

  // Sermon Series CRUD
  addSermonSeries: (series: Omit<SermonSeries, 'id'>) => void;
  updateSermonSeries: (id: string, series: Partial<SermonSeries>) => void;
  deleteSermonSeries: (id: string) => void;

  // Campuses & Groups CRUD
  addCampus: (campus: Omit<Campus, 'id'>) => void;
  updateCampus: (id: string, updates: Partial<Campus>) => void;
  deleteCampus: (id: string) => void;
  addGroup: (name: string, scope?: string, leaderId?: string, coreGroupId?: string) => Promise<{ success: boolean; error?: string; group?: any; leader?: any } | void>;
  updateGroup: (id: string, updates: { name?: string; scope?: string }) => Promise<{ success: boolean; error?: string; group?: any }>;
  deleteGroup: (name: string, scope: string, id?: string) => Promise<{ success: boolean; error?: string } | void>;
  updateGroupScope: (name: string, scope: string) => void;
  updateFlipCardConfig: (config: FlipCardConfig) => void;

  // Prayer Requests
  approvePrayerRequest: (id: string) => void;
  deletePrayerRequest: (id: string) => void;
  getPendingPrayerRequests: (campusId?: string) => PrayerRequest[];

  // Filtering
  getVisibleAnnouncements: (campusId: string, groups: string[], role?: string) => Announcement[];
  getVisibleEvents: (campusId: string, groups: string[], role?: string) => Event[];
  getVisibleGalleryAlbums: (campusId: string, groups: string[], role?: string) => GalleryAlbum[];
  getVisibleSermons: (campusId: string, groups: string[], role?: string) => Sermon[];

  // System Settings
  updateSystemSettings: (settings: Partial<SystemSettings>) => Promise<void>;
}

const AdminDataContext = createContext<AdminDataContextType | null>(null);

export function AdminDataProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUserState] = useState<UserProfile>(defaultCurrentUser);
  const [broadcasts, setBroadcasts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Use the extracted hooks
  const { events, setEvents, eventRegistrations, setEventRegistrations, addEvent, updateEvent, deleteEvent, addEventRegistration, updateEventRegistration, getEventRegistrations } = useEvents();
  const { announcements, setAnnouncements, addAnnouncement, updateAnnouncement, deleteAnnouncement } = useAnnouncements();
  const { galleryAlbums, setGalleryAlbums, galleryAlbumUrl, setGalleryAlbumUrl, addGalleryAlbum, updateGalleryAlbum, deleteGalleryAlbum, reorderGalleryAlbums } = useGallery();
  const { sermons, setSermons, sermonSeries, setSermonSeries, addSermon, updateSermon, deleteSermon, reorderSermons, addSermonSeries, updateSermonSeries, deleteSermonSeries } = useSermons();
  const { prayerRequests, setPrayerRequests, updatePrayerStatus, deletePrayerRequest } = usePrayers();
  const { campuses, setCampuses, groups, setGroups, groupScopes, setGroupScopes, addCampus, updateCampus, deleteCampus, addGroup, deleteGroup } = useCampuses();
  const { users, setUsers, addUser, updateUser, deleteUser } = useUsers();
  const { worshipVideos, setWorshipVideos, liveStreams, setLiveStreams, addWorshipVideo, updateWorshipVideo, deleteWorshipVideo, updateLiveStream } = useMedia();
  const { systemSettings, setSystemSettings, flipCardConfig, updateFlipCardConfig } = useSystem();

  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith('/admin');

  // ── Fetch Initial Data ────────────────────────────────────────────────
  useEffect(() => {
    const fetchPublicData = async () => {
      try {
        const [
          eventsRes,
          announcementsRes,
          campusesRes,
          galleryRes,
          sermonsRes,
          sermonSeriesRes,
          worshipVideosRes,
          liveStreamsRes,
          settingsRes,
          broadcastsRes,
        ] = await Promise.all([
          fetch('/api/admin/events').catch(() => null),
          fetch('/api/admin/announcements').catch(() => null),
          fetch('/api/admin/campuses').catch(() => null),
          fetch('/api/admin/media/gallery').catch(() => null),
          fetch('/api/admin/media/sermons').catch(() => null),
          fetch('/api/admin/media/sermon-series').catch(() => null),
          fetch('/api/admin/media/worship-videos').catch(() => null),
          fetch('/api/admin/media/livestreams').catch(() => null),
          fetch('/api/system/settings').catch(() => null),
          fetch('/api/broadcasts').catch(() => null),
        ]);

        if (eventsRes?.ok) {
          const rawEvents = await eventsRes.json();
          setEvents(rawEvents.map((e: any) => ({
            ...mapId(e),
            date: e.date || e.startTime?.split('T')[0] || '',
            time: e.time || e.startTime?.split('T')[1]?.substring(0, 5) || '',
            endTime: e.endTime || e.endTime?.split('T')[1]?.substring(0, 5) || '',
          })));
        }
        if (announcementsRes?.ok) setAnnouncements(rawToMapped(await announcementsRes.json()));
        if (campusesRes?.ok) setCampuses(rawToMapped(await campusesRes.json()));
        if (galleryRes?.ok) setGalleryAlbums(rawToMapped(await galleryRes.json()));
        if (sermonsRes?.ok) setSermons(rawToMapped(await sermonsRes.json()));
        if (sermonSeriesRes?.ok) setSermonSeries(rawToMapped(await sermonSeriesRes.json()));
        if (worshipVideosRes?.ok) setWorshipVideos(rawToMapped(await worshipVideosRes.json()));
        if (liveStreamsRes?.ok) setLiveStreams(rawToMapped(await liveStreamsRes.json()));
        if (settingsRes?.ok) setSystemSettings(await settingsRes.json());
        if (broadcastsRes?.ok) setBroadcasts(rawToMapped(await broadcastsRes.json()));
      } catch (err) {
        console.error('Failed to fetch public data:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPublicData();
  }, []);

  useEffect(() => {
    if (!isAdminRoute) return;
    const fetchAdminData = async () => {
      try {
        const [usersRes, eventRegistrationsRes, groupsRes, prayersRes] = await Promise.all([
          fetch('/api/admin/users').catch(() => null),
          fetch('/api/admin/event-registrations').catch(() => null),
          fetch('/api/admin/groups').catch(() => null),
          fetch('/api/admin/prayers').catch(() => null),
        ]);

        if (usersRes?.ok) {
          const rawUsers = await usersRes.json();
          setUsers(rawUsers.map((u: any) => ({
            id: u._id || u.id,
            _id: u._id || u.id,
            name: u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim(),
            firstName: u.firstName,
            middleName: u.middleName,
            lastName: u.lastName,
            email: u.email,
            role: u.role,
            campusId: u.campusId,
            groups: u.groups || [],
            gender: u.gender,
            birthday: u.birthday,
            maritalStatus: u.maritalStatus,
            marriageDate: u.marriageDate,
            phone: u.phone,
            whatsapp: u.whatsapp,
            parentAccountId: u.parentAccountId ? String(u.parentAccountId) : undefined,
            parentName: u.parentName || undefined,
            isLinkedProfile: !!u.isLinkedProfile || (typeof u.email === 'string' && (u.email.startsWith('linked_') || u.email.endsWith('@family.internal'))),
            status: u.status,
            createdBy: u.createdBy ? String(u.createdBy) : undefined,
          })));
        }
        if (eventRegistrationsRes?.ok) setEventRegistrations(rawToMapped(await eventRegistrationsRes.json()));
        if (prayersRes?.ok) setPrayerRequests(rawToMapped(await prayersRes.json()));
        if (groupsRes?.ok) {
          const rawGroups = await groupsRes.json();
          const mappedGroups = rawToMapped(rawGroups);
          setGroupScopes(mappedGroups.map((g: any) => ({
            name: g.name,
            scope: g.scope,
            id: g.id || g._id,
            coreGroupId: g.coreGroupId ? String(g.coreGroupId) : null,
          })));
          setGroups(mappedGroups.map((g: any) => g.name));
        }
      } catch (err) {
        console.error('Failed to fetch admin data:', err);
      }
    };
    fetchAdminData();
  }, [isAdminRoute]);

  const rawToMapped = (arr: any[]) => arr.map(mapId);

  const setCurrentUser = useCallback((u: UserProfile) => setCurrentUserState(u), []);

  const approvePrayerRequest = useCallback((id: string) => updatePrayerStatus(id, 'approved'), [updatePrayerStatus]);

  const getPendingPrayerRequests = useCallback((campusId?: string) => {
    return prayerRequests.filter(p => p.status === 'pending' && (!campusId || campusId === 'all' || p.campusId === campusId));
  }, [prayerRequests]);

  const updateGroupScope = useCallback(async (name: string, scope: string) => {
    const group = groupScopes.find(g => g.name === name);
    if (group && (group as any).id) {
      const id = (group as any).id;
      const res = await fetch(`/api/admin/groups/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope }),
      });
      if (res.ok) {
        setGroupScopes(prev => prev.map(g => g.name === name ? { ...g, scope } : g));
      }
    }
  }, [groupScopes]);

  const updateGroup = useCallback(async (id: string, updates: { name?: string; scope?: string }) => {
    const res = await fetch(`/api/admin/groups/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { success: false, error: data.error || 'Failed to update group' };
    }
    const updated = await res.json();
    setGroupScopes(prev => prev.map(g => (g as any).id === id ? { ...g, name: updated.name, scope: updated.scope } : g));
    if (updates.name) {
      setGroups(prev => prev.map(n => {
        const oldGroup = groupScopes.find(g => (g as any).id === id);
        return oldGroup && n === oldGroup.name ? updated.name : n;
      }));
      setUsers(prev => prev.map(u => ({
        ...u,
        groups: u.groups.map(gName => {
          const oldGroup = groupScopes.find(g => (g as any).id === id);
          return oldGroup && gName === oldGroup.name ? updated.name : gName;
        })
      })));
    }
    return { success: true, group: updated };
  }, [groupScopes]);

  const updateSystemSettings = useCallback(async (s: Partial<SystemSettings>) => {
    const res = await fetch('/api/admin/settings', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(s),
    });
    if (res.ok) {
      setSystemSettings(await res.json());
    }
  }, []);

  const checkVisibility = (item: any, campusId: string, userGroups: string[], role?: string) => {
    if (role === 'super_admin' || role === 'admin') return true;
    const campusMatch = !item.targetCampuses || item.targetCampuses.length === 0 || item.targetCampuses.includes('all') || item.targetCampuses.includes(campusId);
    if (!campusMatch) return false;
    if (item.excludeCampuses && item.excludeCampuses.includes(campusId)) return false;
    const groupMatch = !item.targetGroups || item.targetGroups.length === 0 || item.targetGroups.includes('all') || item.targetGroups.some((g: string) => userGroups.includes(g));
    if (!groupMatch) return false;
    if (item.excludeGroups && item.excludeGroups.some((g: string) => userGroups.includes(g))) return false;
    return true;
  };

  const getVisibleAnnouncements = useCallback((cId: string, grps: string[], r?: string) => announcements.filter(a => checkVisibility(a, cId, grps, r)), [announcements]);
  const getVisibleEvents = useCallback((cId: string, grps: string[], r?: string) => events.filter(e => checkVisibility(e, cId, grps, r)), [events]);
  const getVisibleGalleryAlbums = useCallback((cId: string, grps: string[], r?: string) => galleryAlbums.filter(a => checkVisibility(a, cId, grps, r)), [galleryAlbums]);
  const getVisibleSermons = useCallback((cId: string, grps: string[], r?: string) => sermons.filter(s => checkVisibility(s, cId, grps, r)), [sermons]);

  return (
    <AdminDataContext.Provider
      value={{
        isLoading,
        campuses, groups, groupScopes, events, eventRegistrations, announcements, users, worshipVideos,
        sermons, sermonSeries, currentUser, galleryAlbumUrl, galleryAlbums, liveStreams, prayerRequests, broadcasts,
        flipCardConfig, systemSettings,
        setCurrentUser, setGalleryAlbumUrl,
        updateLiveStream,
        addGalleryAlbum, updateGalleryAlbum, deleteGalleryAlbum, reorderGalleryAlbums,
        addEvent, updateEvent, deleteEvent, addEventRegistration, updateEventRegistration, getEventRegistrations,
        addAnnouncement, updateAnnouncement, deleteAnnouncement,
        addUser, updateUser, deleteUser,
        addWorshipVideo, updateWorshipVideo, deleteWorshipVideo,
        addSermon, updateSermon, deleteSermon, reorderSermons,
        addSermonSeries, updateSermonSeries, deleteSermonSeries,
        addCampus, updateCampus, deleteCampus, addGroup, updateGroup, deleteGroup, updateGroupScope, updateFlipCardConfig,
        approvePrayerRequest, deletePrayerRequest, getPendingPrayerRequests,
        getVisibleAnnouncements, getVisibleEvents, getVisibleGalleryAlbums, getVisibleSermons,
        updateSystemSettings,
      }}
    >
      {children}
    </AdminDataContext.Provider>
  );
}

export function useAdminData() {
  const context = useContext(AdminDataContext);
  if (!context) {
    throw new Error('useAdminData must be used within an AdminDataProvider');
  }
  return context;
}
