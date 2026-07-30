"use client";

import React, { useState, useMemo } from 'react';
import {
  useAdminData,
  canManageCampusesAndGroups,
  canManageGroups,
  getRoleLabel,
  type Campus,
  type UserProfile,
} from '@/lib/admin-data-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Building2,
  Users,
  Plus,
  Pencil,
  Trash2,
  Shield,
  Church,
  Tag,
  Search,
  UserPlus,
  UserMinus,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAdminActionLoading } from '@/components/admin/admin-action-loading';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const router = useRouter();
  const { campuses, groupScopes, groups, currentUser, addCampus, updateCampus, deleteCampus, addGroup, deleteGroup, users, updateUser, systemSettings, updateSystemSettings } = useAdminData();
  const { withActionLoading } = useAdminActionLoading();

  const canManageCampuses = canManageCampusesAndGroups(currentUser.role);
  const canManageGroupList = canManageGroups(currentUser.role);
  const isCampusLeaderOnly = currentUser.role === 'campus_leader';
  const isIT = currentUser.role === 'super_admin';

  // Campus form state
  const [campusDialogOpen, setCampusDialogOpen] = useState(false);
  const [editingCampusId, setEditingCampusId] = useState<string | null>(null);
  const [campusForm, setCampusForm] = useState<Partial<Campus>>({ name: '', pastor: '', address: '', city: '', zipCode: '', phone: '', email: '', latitude: undefined, longitude: undefined, serviceTimes: [{ day: 'Sunday', times: [''] }] });
  const [deleteCampusConfirm, setDeleteCampusConfirm] = useState<string | null>(null);

  // Group form state
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [newGroup, setNewGroup] = useState('');
  const [newGroupScope, setNewGroupScope] = useState(
    isCampusLeaderOnly ? (currentUser.campusId || 'main') : 'global'
  );
  const [newGroupLeaderId, setNewGroupLeaderId] = useState<string>('');
  const [creatingGroup, setCreatingGroup] = useState(false);
  /** Campus FASL create mode: link to an existing Core group, or standalone campus group */
  const [campusGroupMode, setCampusGroupMode] = useState<'link_core' | 'standalone'>('link_core');
  const [linkedCoreGroupId, setLinkedCoreGroupId] = useState<string>('');
  const [deleteGroupConfirm, setDeleteGroupConfirm] = useState<{ name: string; scope: string; id?: string } | null>(null);

  // Group member management state
  const [managingGroup, setManagingGroup] = useState<string | null>(null);
  const [memberSearch, setMemberSearch] = useState('');
  const [savingMembers, setSavingMembers] = useState(false);
  const [minAppVersionAndroid, setMinAppVersionAndroid] = useState(systemSettings?.minAppVersionAndroid || systemSettings?.minAppVersion || '0.1.0');
  const [minAppVersionIos, setMinAppVersionIos] = useState(systemSettings?.minAppVersionIos || systemSettings?.minAppVersion || '0.1.0');
  const [latestAppVersionAndroid, setLatestAppVersionAndroid] = useState(systemSettings?.latestAppVersionAndroid || systemSettings?.minAppVersionAndroid || systemSettings?.minAppVersion || '0.1.0');
  const [latestAppVersionIos, setLatestAppVersionIos] = useState(systemSettings?.latestAppVersionIos || systemSettings?.minAppVersionIos || systemSettings?.minAppVersion || '0.1.0');
  const [androidStoreUrl, setAndroidStoreUrl] = useState(systemSettings?.androidStoreUrl || '');
  const [iosStoreUrl, setIosStoreUrl] = useState(systemSettings?.iosStoreUrl || '');
  const [forceUpdateMessage, setForceUpdateMessage] = useState(
    systemSettings?.forceUpdateMessage ||
      'A critical update is required to continue using Grace Connect. Please update to the latest version.'
  );
  const [statsMembers, setStatsMembers] = useState(systemSettings?.statsMembers || 2500);
  const [statsGroups, setStatsGroups] = useState(systemSettings?.statsGroups || 25);
  const [statsYears, setStatsYears] = useState(systemSettings?.statsYears || 15);
  const [savingSettings, setSavingSettings] = useState(false);

  React.useEffect(() => {
    if (systemSettings) {
      const legacy = systemSettings.minAppVersion || '0.1.0';
      setMinAppVersionAndroid(systemSettings.minAppVersionAndroid || legacy);
      setMinAppVersionIos(systemSettings.minAppVersionIos || legacy);
      setLatestAppVersionAndroid(systemSettings.latestAppVersionAndroid || systemSettings.minAppVersionAndroid || legacy);
      setLatestAppVersionIos(systemSettings.latestAppVersionIos || systemSettings.minAppVersionIos || legacy);
      setAndroidStoreUrl(systemSettings.androidStoreUrl || '');
      setIosStoreUrl(systemSettings.iosStoreUrl || '');
      setForceUpdateMessage(
        systemSettings.forceUpdateMessage ||
          'A critical update is required to continue using Grace Connect. Please update to the latest version.'
      );
      setStatsMembers(systemSettings.statsMembers || 2500);
      setStatsGroups(systemSettings.statsGroups || 25);
      setStatsYears(systemSettings.statsYears || 15);
    }
  }, [systemSettings]);

  const effectiveGroupScope = isCampusLeaderOnly
    ? (currentUser.campusId || 'main')
    : newGroupScope;

  const leaderRoleLabel =
    effectiveGroupScope === 'global' ? 'Core Team Leader' : 'FASL Leader';

  const leaderCandidates = useMemo(() => {
    const scope = effectiveGroupScope;
    return users
      .filter((u) => {
        // Linked profiles (children) cannot log in, so they cannot be leaders.
        if (u.isLinkedProfile || (u.email && (u.email.startsWith('linked_') || u.email.endsWith('@family.internal'))) || u.parentAccountId) return false;
        
        if (scope === 'global') return true;
        return u.campusId === scope || u.campusId === 'global';
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [users, effectiveGroupScope]);

  const isCampusScopedCreate = effectiveGroupScope !== 'global';

  const coreGroups = useMemo(
    () => groupScopes.filter((g) => g.scope === 'global'),
    [groupScopes]
  );

  const availableCoreGroups = useMemo(() => {
    if (!isCampusScopedCreate) return coreGroups;
    const campusId = effectiveGroupScope;
    const linkedIds = new Set(
      groupScopes
        .filter((g) => g.scope === campusId && g.coreGroupId)
        .map((g) => String(g.coreGroupId))
    );
    return coreGroups.filter((g) => g.id && !linkedIds.has(String(g.id)));
  }, [coreGroups, groupScopes, isCampusScopedCreate, effectiveGroupScope]);

  const managingGroupScope = useMemo(() => {
    if (!managingGroup) return 'global';
    return groupScopes.find(g => g.name === managingGroup)?.scope || 'global';
  }, [managingGroup, groupScopes]);

  const scopeFilteredUsers = useMemo(() => {
    if (managingGroupScope === 'global') return users;
    return users.filter(u => u.campusId === managingGroupScope);
  }, [users, managingGroupScope]);

  const groupMembers = useMemo(() => {
    if (!managingGroup) return { members: [] as UserProfile[], nonMembers: [] as UserProfile[] };
    const members = scopeFilteredUsers.filter(u => u.groups.includes(managingGroup));
    const nonMembers = scopeFilteredUsers.filter(u => !u.groups.includes(managingGroup));
    return { members, nonMembers };
  }, [managingGroup, scopeFilteredUsers]);

  const filteredUsers = useMemo(() => {
    if (!managingGroup) return [];
    const all = [...groupMembers.members, ...groupMembers.nonMembers];
    if (!memberSearch.trim()) return all;
    const q = memberSearch.toLowerCase();
    return all.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  }, [managingGroup, groupMembers, memberSearch]);

  const getGroupNamePrefix = (scope: string) => {
    if (scope === 'global') return 'All Campus';
    return campuses.find((c) => c.id === scope)?.name || scope;
  };

  /** Strip a known prefix so we don't double-apply when saving. */
  const stripGroupNamePrefix = (name: string, scope: string) => {
    const prefix = getGroupNamePrefix(scope);
    const trimmed = name.trim();
    const re = new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+`, 'i');
    // Also strip Core "All Campus" when deriving campus name from a linked core group
    const allCampusRe = /^All Campus\s+/i;
    return trimmed.replace(re, '').replace(allCampusRe, '').trim() || trimmed;
  };

  const buildPrefixedGroupName = (baseName: string, scope: string) => {
    const base = stripGroupNamePrefix(baseName, scope);
    if (!base) return '';
    return `${getGroupNamePrefix(scope)} ${base}`;
  };

  const groupNamePreview = useMemo(() => {
    const scope = effectiveGroupScope;
    if (scope !== 'global' && campusGroupMode === 'link_core') {
      const coreName = coreGroups.find((g) => g.id === linkedCoreGroupId)?.name || '';
      if (!coreName) return '';
      return buildPrefixedGroupName(coreName, scope);
    }
    if (!newGroup.trim()) return '';
    return buildPrefixedGroupName(newGroup, scope);
  }, [
    effectiveGroupScope,
    campusGroupMode,
    linkedCoreGroupId,
    coreGroups,
    newGroup,
    campuses,
  ]);

  if (!canManageGroupList && !canManageCampuses) {
    return (
      <div className="text-center py-16">
        <Shield className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
        <p className="text-lg font-semibold">Access Restricted</p>
        <p className="text-muted-foreground mt-1">
          Only Campus Leaders, Admins, and IT Team can manage groups.
        </p>
      </div>
    );
  }

  const openCreateCampus = () => {
    setEditingCampusId(null);
    setCampusForm({ name: '', pastor: '', address: '', city: '', zipCode: '', phone: '', email: '', latitude: undefined, longitude: undefined, serviceTimes: [{ day: 'Sunday', times: [''] }] });
    setCampusDialogOpen(true);
  };

  const openEditCampus = (campus: Campus) => {
    setEditingCampusId(campus.id);
    setCampusForm({ ...campus, serviceTimes: campus.serviceTimes?.length ? campus.serviceTimes : [{ day: 'Sunday', times: [''] }] });
    setCampusDialogOpen(true);
  };

  const handleCampusSubmit = () => {
    if (!campusForm.name) return;
    if (editingCampusId) {
      updateCampus(editingCampusId, campusForm as Campus);
    } else {
      addCampus(campusForm as Campus);
    }
    setCampusDialogOpen(false);
    setCampusForm({ name: '', pastor: '', address: '', city: '', zipCode: '', phone: '', email: '', latitude: undefined, longitude: undefined, serviceTimes: [{ day: 'Sunday', times: [''] }] });
    setEditingCampusId(null);
  };

  const handleDeleteCampus = (id: string) => {
    deleteCampus(id);
    setDeleteCampusConfirm(null);
  };

  const openCreateGroup = () => {
    setNewGroup('');
    setNewGroupScope(isCampusLeaderOnly ? (currentUser.campusId || 'main') : 'global');
    setNewGroupLeaderId('');
    setCampusGroupMode('link_core');
    setLinkedCoreGroupId('');
    setGroupDialogOpen(true);
  };

  const handleAddGroup = async () => {
    const scope = effectiveGroupScope;
    const linkingCore = scope !== 'global' && campusGroupMode === 'link_core';

    if (linkingCore) {
      if (!linkedCoreGroupId) {
        toast.warning('Select a core group to link');
        return;
      }
    } else if (!newGroup.trim()) {
      toast.warning('Group name is required');
      return;
    }

    setCreatingGroup(true);
    const rawName = linkingCore
      ? (coreGroups.find((g) => g.id === linkedCoreGroupId)?.name || newGroup.trim())
      : newGroup.trim();
    const name = buildPrefixedGroupName(rawName, scope);

    const result = await addGroup(
      name,
      scope,
      newGroupLeaderId || undefined,
      linkingCore ? linkedCoreGroupId : undefined
    );
    setCreatingGroup(false);

    if (!result || result.success === false) {
      toast.error((result as any)?.error || 'Failed to create group');
      return;
    }

    if (newGroupLeaderId) {
      const leader = users.find((u) => u.id === newGroupLeaderId);
      const nextGroups = Array.from(new Set([...(leader?.groups || []), name]));
      const updates: Partial<UserProfile> = { groups: nextGroups };
      
      // Only upgrade to group_leader if they are currently just a regular member
      if (leader?.role === 'member') {
        updates.role = 'group_leader';
      }
      
      // Only change their campus scope if they are a member or group leader.
      // We don't want to accidentally change an Admin's campus scope just because they lead a local group.
      if (leader?.role === 'member' || leader?.role === 'group_leader') {
        updates.campusId = scope === 'global' ? 'global' : scope;
      }

      await updateUser(newGroupLeaderId, updates);
    }

    toast.success(
      newGroupLeaderId
        ? `Group created and ${leaderRoleLabel} assigned`
        : linkingCore
          ? `FASL group linked to Core "${name}"`
          : 'Group created'
    );
    setNewGroup('');
    setNewGroupScope(isCampusLeaderOnly ? (currentUser.campusId || 'main') : 'global');
    setNewGroupLeaderId('');
    setCampusGroupMode('link_core');
    setLinkedCoreGroupId('');
    setGroupDialogOpen(false);
  };

  const handleDeleteGroup = async () => {
    if (!deleteGroupConfirm) return;
    const { name, scope, id } = deleteGroupConfirm;
    setDeleteGroupConfirm(null);
    await withActionLoading(async () => {
      const result = await deleteGroup(name, scope, id);
      if (result && !result.success) {
        toast.error(result.error || 'Failed to delete group');
        return;
      }
      toast.success(`Group "${name}" deleted`);
    });
  };

  const toggleUserInGroup = async (user: UserProfile) => {
    if (!managingGroup) return;
    setSavingMembers(true);
    const isMember = user.groups.includes(managingGroup);
    const newGroups = isMember
      ? user.groups.filter(g => g !== managingGroup)
      : [...user.groups, managingGroup];
    await updateUser(user.id, { groups: newGroups });
    setSavingMembers(false);
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    // Keep legacy minAppVersion in sync with the stricter of the two platform mins
    const parse = (v: string) => v.split('.').map((n) => Number(n) || 0);
    const a = parse(minAppVersionAndroid);
    const i = parse(minAppVersionIos);
    let androidIsStricter = false;
    for (let idx = 0; idx < Math.max(a.length, i.length); idx++) {
      const av = a[idx] || 0;
      const iv = i[idx] || 0;
      if (av !== iv) {
        androidIsStricter = av > iv;
        break;
      }
    }
    await updateSystemSettings({
      minAppVersion: androidIsStricter ? minAppVersionAndroid : minAppVersionIos,
      minAppVersionAndroid,
      minAppVersionIos,
      latestAppVersionAndroid,
      latestAppVersionIos,
      androidStoreUrl,
      iosStoreUrl,
      forceUpdateMessage,
      statsMembers,
      statsGroups,
      statsYears,
    });
    setSavingSettings(false);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage campuses and groups</p>
      </div>

      {/* Campus Management */}
      {canManageCampuses && (
      <Card className="border-border/50">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0 pb-4">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              Campus Management
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{campuses.length} campuses</p>
          </div>
          <Button onClick={openCreateCampus} size="sm" className="gap-2 w-full sm:w-auto">
            <Plus className="w-4 h-4" /> Add Campus
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {campuses.map(campus => {
            const memberCount = users.filter(u => u.campusId === campus.id).length;
            const leaderCount = users.filter(u => u.campusId === campus.id && (u.role === 'campus_leader' || u.role === 'admin')).length;
            return (
              <div
                key={campus.id}
                className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors group"
              >
                <div className="flex items-start sm:items-center gap-4 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Church className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold">{campus.name}</p>
                      <Badge variant="outline" className="text-[10px] hidden md:inline-flex">{campus.id}</Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1">
                      <span>Led by {campus.pastor}</span>
                      <span className="hidden sm:inline">·</span>
                      <span>{memberCount} users</span>
                      <span className="hidden sm:inline">·</span>
                      <span>{leaderCount} leaders</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity self-end sm:self-auto">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditCampus(campus)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost" size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => setDeleteCampusConfirm(campus.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
      )}

      {/* Group Management */}
      {canManageGroupList && (
      <Card className="border-border/50">
        <CardHeader className="flex flex-col items-stretch space-y-4 pb-4">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Group Management
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {groupScopes.length} groups · Assign FASL / Core Team Leaders when creating
            </p>
          </div>
          <Button onClick={openCreateGroup} size="sm" className="gap-2 w-full">
            <Plus className="w-4 h-4" /> Add Group
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {groupScopes
              .filter((group) =>
                !isCampusLeaderOnly ||
                group.scope === 'global' ||
                group.scope === currentUser.campusId
              )
              .map(group => {
              const memberCount = users.filter(u => u.groups.includes(group.name)).length;
              const leaders = users.filter(
                (u) => u.role === 'group_leader' && u.groups.includes(group.name)
              );
              return (
                <div
                  key={`${group.name}-${group.scope}`}
                  className="flex items-center flex-wrap gap-2 px-3 py-2 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors group/item cursor-pointer"
                  onClick={() => { setManagingGroup(group.name); setMemberSearch(''); }}
                >
                  <Tag className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="text-sm font-medium">{group.name}</span>
                  <Badge variant="outline" className="text-[10px] ml-1 border-primary/20 bg-primary/5 text-primary truncate max-w-[120px] sm:max-w-none">
                    {group.scope === 'global'
                      ? 'Core (All Campuses)'
                      : campuses.find(c => c.id === group.scope)?.name || group.scope}
                  </Badge>
                  {group.scope !== 'global' && (
                    <Badge
                      variant="outline"
                      className={`text-[9px] ${
                        group.coreGroupId
                          ? 'border-emerald-500/30 text-emerald-700 bg-emerald-50'
                          : 'border-amber-500/30 text-amber-700 bg-amber-50'
                      }`}
                    >
                      {group.coreGroupId ? 'Linked to Core' : 'No Core link'}
                    </Badge>
                  )}
                  {leaders.slice(0, 1).map((l) => (
                    <Badge key={l.id} variant="outline" className="text-[9px] border-[#8B2323]/25 text-[#8B2323] bg-[#FBE8E8]/50">
                      {getRoleLabel(l.role, l.campusId)}: {l.name}
                    </Badge>
                  ))}
                  <Badge variant="outline" className="text-[9px] gap-1 shrink-0">
                    <Users className="w-2.5 h-2.5" />{memberCount}
                  </Badge>
                  <Button
                    variant="ghost" size="icon"
                    className="h-6 w-6 opacity-100 sm:opacity-0 sm:group-hover/item:opacity-100 transition-opacity text-destructive hover:text-destructive ml-auto"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteGroupConfirm({
                        name: group.name,
                        scope: group.scope,
                        id: (group as any).id,
                      });
                    }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
      )}

      {/* System Settings (IT Team Only) — last on page */}
      {isIT && (
      <Card className="border-border/50">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            System Configuration
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">Manage global application settings</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-[#1A202C]">App Version Control</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Force mobile users to update when a new version is released. Set Android and Apple separately.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-4">
                <p className="text-xs font-bold uppercase tracking-wide text-[#7A6150]">Android</p>
                <div className="space-y-2">
                  <Label>Minimum Version</Label>
                  <Input
                    value={minAppVersionAndroid}
                    onChange={(e) => setMinAppVersionAndroid(e.target.value)}
                    placeholder="e.g. 0.1.0"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Users below this version will be <span className="font-semibold text-destructive">forced to update</span>.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Latest Version</Label>
                  <Input
                    value={latestAppVersionAndroid}
                    onChange={(e) => setLatestAppVersionAndroid(e.target.value)}
                    placeholder="e.g. 0.1.0"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Shown as the current Play Store release target.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Android Store URL</Label>
                  <Input
                    value={androidStoreUrl}
                    onChange={(e) => setAndroidStoreUrl(e.target.value)}
                    placeholder="https://play.google.com/store/apps/details?id=..."
                  />
                  <p className="text-[10px] text-muted-foreground">Google Play Store link for the app.</p>
                </div>
              </div>

              <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-4">
                <p className="text-xs font-bold uppercase tracking-wide text-[#7A6150]">Apple (iOS)</p>
                <div className="space-y-2">
                  <Label>Minimum Version</Label>
                  <Input
                    value={minAppVersionIos}
                    onChange={(e) => setMinAppVersionIos(e.target.value)}
                    placeholder="e.g. 0.1.0"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Users below this version will be <span className="font-semibold text-destructive">forced to update</span>.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Latest Version</Label>
                  <Input
                    value={latestAppVersionIos}
                    onChange={(e) => setLatestAppVersionIos(e.target.value)}
                    placeholder="e.g. 0.1.0"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Shown as the current App Store release target.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>iOS Store URL</Label>
                  <Input
                    value={iosStoreUrl}
                    onChange={(e) => setIosStoreUrl(e.target.value)}
                    placeholder="https://apps.apple.com/app/id..."
                  />
                  <p className="text-[10px] text-muted-foreground">Apple App Store link for the app.</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Force Update Message</Label>
              <Textarea
                value={forceUpdateMessage}
                onChange={(e) => setForceUpdateMessage(e.target.value)}
                rows={3}
                placeholder="Message shown when a force update is required"
                className="resize-none"
              />
              <p className="text-[10px] text-muted-foreground">Custom message shown when a force update is required.</p>
            </div>
          </div>

          <div className="border-t border-border/50 pt-4">
            <h3 className="text-sm font-semibold text-[#1A202C] mb-3">Home Screen Stats</h3>
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Total Members</Label>
                <Input
                  type="number"
                  value={statsMembers}
                  onChange={(e) => setStatsMembers(Number(e.target.value))}
                  placeholder="2500"
                />
                <p className="text-[10px] text-muted-foreground">Displayed on the home screen as &quot;X MEMBERS&quot;</p>
              </div>

              <div className="space-y-2">
                <Label>Total Groups</Label>
                <Input
                  type="number"
                  value={statsGroups}
                  onChange={(e) => setStatsGroups(Number(e.target.value))}
                  placeholder="25"
                />
                <p className="text-[10px] text-muted-foreground">Displayed on the home screen as &quot;X+ GROUPS&quot;</p>
              </div>

              <div className="space-y-2">
                <Label>Years Serving</Label>
                <Input
                  type="number"
                  value={statsYears}
                  onChange={(e) => setStatsYears(Number(e.target.value))}
                  placeholder="15"
                />
                <p className="text-[10px] text-muted-foreground">Displayed on the home screen as &quot;X YRS SERVING&quot;</p>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={handleSaveSettings} disabled={savingSettings}>
              {savingSettings ? 'Saving...' : 'Save Configuration'}
            </Button>
          </div>
        </CardContent>
      </Card>
      )}

      {/* Campus Create/Edit Dialog */}
      <Dialog open={campusDialogOpen} onOpenChange={setCampusDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCampusId ? 'Edit Campus' : 'New Campus'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Campus Name *</Label>
              <Input value={campusForm.name} onChange={(e) => setCampusForm({ ...campusForm, name: e.target.value })} placeholder="e.g. South Campus" />
            </div>
            <div className="space-y-2">
              <Label>Pastor / Leader</Label>
              <Input value={campusForm.pastor} onChange={(e) => setCampusForm({ ...campusForm, pastor: e.target.value })} placeholder="e.g. Pastor David" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={campusForm.phone || ''} onChange={(e) => setCampusForm({ ...campusForm, phone: e.target.value })} placeholder="+1..." />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={campusForm.email || ''} onChange={(e) => setCampusForm({ ...campusForm, email: e.target.value })} placeholder="hello@..." />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Address</Label>
              <Input value={campusForm.address || ''} onChange={(e) => setCampusForm({ ...campusForm, address: e.target.value })} placeholder="123 Church St" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>City</Label>
                <Input value={campusForm.city || ''} onChange={(e) => setCampusForm({ ...campusForm, city: e.target.value })} placeholder="City" />
              </div>
              <div className="space-y-2">
                <Label>Zip Code</Label>
                <Input value={campusForm.zipCode || ''} onChange={(e) => setCampusForm({ ...campusForm, zipCode: e.target.value })} placeholder="Zip" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Latitude (for Maps)</Label>
                <Input type="number" step="any" value={campusForm.latitude || ''} onChange={(e) => setCampusForm({ ...campusForm, latitude: parseFloat(e.target.value) })} placeholder="e.g. 23.0238" />
              </div>
              <div className="space-y-2">
                <Label>Longitude (for Maps)</Label>
                <Input type="number" step="any" value={campusForm.longitude || ''} onChange={(e) => setCampusForm({ ...campusForm, longitude: parseFloat(e.target.value) })} placeholder="e.g. 72.5664" />
              </div>
            </div>

            <div className="space-y-2 border-t pt-4">
              <Label>Service Times</Label>
              {campusForm.serviceTimes?.map((st, idx) => (
                <div key={idx} className="flex gap-2 mb-2">
                  <Input 
                    placeholder="Day (e.g. Sunday)" 
                    value={st.day}
                    onChange={(e) => {
                      const newST = [...(campusForm.serviceTimes || [])];
                      newST[idx].day = e.target.value;
                      setCampusForm({ ...campusForm, serviceTimes: newST });
                    }} 
                  />
                  <Input 
                    placeholder="Times (e.g. 9:00 AM, 11:00 AM)" 
                    value={st.times.join(', ')}
                    onChange={(e) => {
                      const newST = [...(campusForm.serviceTimes || [])];
                      newST[idx].times = e.target.value.split(',').map(t => t.trim());
                      setCampusForm({ ...campusForm, serviceTimes: newST });
                    }} 
                  />
                </div>
              ))}
            </div>

          </div>
          <DialogFooter className="flex justify-between w-full sm:justify-between items-center mt-4">
            {editingCampusId ? (
              <Button
                variant="secondary"
                onClick={() => {
                  setCampusDialogOpen(false);
                  router.push(`/admin/users?campus=${editingCampusId}&action=add`);
                }}
                className="gap-2 bg-muted text-muted-foreground hover:bg-muted/80"
              >
                <UserPlus className="w-4 h-4" /> Add Members
              </Button>
            ) : <div />}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setCampusDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCampusSubmit} disabled={!campusForm.name}>
                {editingCampusId ? 'Save' : 'Create Campus'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Group Create Dialog */}
      <Dialog open={groupDialogOpen} onOpenChange={setGroupDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Group</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Scope</Label>
              {isCampusLeaderOnly ? (
                <div className="rounded-xl border border-border/60 bg-muted/30 px-3 py-2 text-sm">
                  {campuses.find((c) => c.id === currentUser.campusId)?.name || currentUser.campusId}
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Campus Leaders create FASL groups for their campus only.
                  </p>
                </div>
              ) : (
                <Select
                  value={newGroupScope}
                  onValueChange={(val) => {
                    setNewGroupScope(val);
                    setNewGroupLeaderId('');
                    setLinkedCoreGroupId('');
                    setCampusGroupMode(val === 'global' ? 'standalone' : 'link_core');
                    if (val === 'global') setNewGroup('');
                  }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="global">Core (All Campuses)</SelectItem>
                    {campuses.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name} · FASL</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <p className="text-[10px] text-muted-foreground">
                {effectiveGroupScope === 'global'
                  ? 'Core scope → appointed leader becomes a Core Team Leader.'
                  : 'Campus scope → appointed leader becomes a FASL Leader.'}
              </p>
            </div>

            {isCampusScopedCreate && (
              <div className="space-y-2">
                <Label>Core group link</Label>
                <div className="grid grid-cols-1 gap-2">
                  <label className="flex items-start gap-2 rounded-xl border border-border/60 p-3 cursor-pointer hover:bg-muted/30 has-[:checked]:border-[#8B2323]/40 has-[:checked]:bg-[#FBE8E8]/40">
                    <input
                      type="radio"
                      name="campusGroupMode"
                      className="mt-1"
                      checked={campusGroupMode === 'link_core'}
                      onChange={() => {
                        setCampusGroupMode('link_core');
                        setNewGroup('');
                      }}
                    />
                    <span>
                      <span className="text-sm font-medium block">Link to core group</span>
                      <span className="text-[10px] text-muted-foreground">
                        Create a campus FASL group under an existing Core (All Campuses) group.
                      </span>
                    </span>
                  </label>
                  <label className="flex items-start gap-2 rounded-xl border border-border/60 p-3 cursor-pointer hover:bg-muted/30 has-[:checked]:border-[#8B2323]/40 has-[:checked]:bg-[#FBE8E8]/40">
                    <input
                      type="radio"
                      name="campusGroupMode"
                      className="mt-1"
                      checked={campusGroupMode === 'standalone'}
                      onChange={() => {
                        setCampusGroupMode('standalone');
                        setLinkedCoreGroupId('');
                      }}
                    />
                    <span>
                      <span className="text-sm font-medium block">Create without core group</span>
                      <span className="text-[10px] text-muted-foreground">
                        Campus-only group with no Core group association.
                      </span>
                    </span>
                  </label>
                </div>
              </div>
            )}

            {isCampusScopedCreate && campusGroupMode === 'link_core' ? (
              <div className="space-y-2">
                <Label>Core group *</Label>
                {availableCoreGroups.length === 0 ? (
                  <p className="text-sm text-muted-foreground rounded-xl border border-dashed border-border/60 p-3">
                    {coreGroups.length === 0
                      ? 'No Core groups exist yet. Ask Admin / IT to create a Core group first, or choose “Create without core group”.'
                      : 'All Core groups are already linked on this campus. Choose “Create without core group” instead.'}
                  </p>
                ) : (
                  <Select value={linkedCoreGroupId || 'none'} onValueChange={(v) => setLinkedCoreGroupId(v === 'none' ? '' : v)}>
                    <SelectTrigger><SelectValue placeholder="Select a Core group" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Select a Core group</SelectItem>
                      {availableCoreGroups.map((g) => (
                        <SelectItem key={g.id} value={g.id!}>{g.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {groupNamePreview && (
                  <p className="text-[10px] text-muted-foreground">
                    Saved as: <span className="font-semibold text-foreground">{groupNamePreview}</span>
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Group Name *</Label>
                <Input
                  value={newGroup}
                  onChange={(e) => setNewGroup(e.target.value)}
                  placeholder="e.g. youth"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddGroup()}
                />
                <p className="text-[10px] text-muted-foreground">
                  {groupNamePreview
                    ? <>Saved as: <span className="font-semibold text-foreground">{groupNamePreview}</span></>
                    : effectiveGroupScope === 'global'
                      ? 'Will be prefixed with “All Campus”.'
                      : `Will be prefixed with “${getGroupNamePrefix(effectiveGroupScope)}”.`}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Assign {leaderRoleLabel}</Label>
              <Select value={newGroupLeaderId || 'none'} onValueChange={(v) => setNewGroupLeaderId(v === 'none' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Select a leader (optional)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No leader yet</SelectItem>
                  {leaderCandidates.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                      {u.role === 'group_leader'
                        ? ` · ${getRoleLabel(u.role, u.campusId)}`
                        : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">
                Admin, Campus Leader, or IT Team can appoint who will lead this group.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGroupDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleAddGroup}
              disabled={
                creatingGroup ||
                (isCampusScopedCreate && campusGroupMode === 'link_core'
                  ? !linkedCoreGroupId
                  : !newGroup.trim())
              }
            >
              {creatingGroup ? 'Creating...' : 'Create Group'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Campus Confirm */}
      <Dialog open={deleteCampusConfirm !== null} onOpenChange={() => setDeleteCampusConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete Campus?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Users assigned to this campus won&#39;t be deleted but will need reassignment.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteCampusConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteCampusConfirm && handleDeleteCampus(deleteCampusConfirm)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Group Confirm */}
      <Dialog open={deleteGroupConfirm !== null} onOpenChange={() => setDeleteGroupConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete Group?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Delete <span className="font-semibold text-foreground">{deleteGroupConfirm?.name}</span>? Members will be removed from this group.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteGroupConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => handleDeleteGroup()}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Manage Group Members Dialog ── */}
      <Dialog open={managingGroup !== null} onOpenChange={() => setManagingGroup(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              {managingGroup} — Members
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              {groupMembers.members.length} member{groupMembers.members.length !== 1 ? 's' : ''}
              {managingGroupScope !== 'global'
                ? ` · Showing only ${campuses.find(c => c.id === managingGroupScope)?.name || managingGroupScope} members`
                : ' · Showing all campuses'}
              {' · '}Click to add or remove
            </p>
          </DialogHeader>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search members by name or email..."
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Member List */}
          <div className="flex-1 overflow-y-auto space-y-1 min-h-0 max-h-[50vh] pr-1">
            {filteredUsers.map(user => {
              const isMember = user.groups.includes(managingGroup || '');
              const userCampus = campuses.find(c => c.id === user.campusId);
              return (
                <div
                  key={user.id}
                  onClick={() => toggleUserInGroup(user)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
                    isMember
                      ? 'bg-primary/10 border border-primary/20 hover:bg-primary/15'
                      : 'bg-muted/20 border border-transparent hover:bg-muted/40'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    isMember ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  }`}>
                    {user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{user.name}</p>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span className="truncate">{user.email}</span>
                      {userCampus && (
                        <Badge variant="outline" className="text-[9px] shrink-0">
                          {userCampus.name}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                    isMember
                      ? 'bg-primary text-primary-foreground'
                      : 'border-2 border-muted-foreground/30'
                  }`}>
                    {isMember && <Check className="w-3.5 h-3.5" />}
                  </div>
                </div>
              );
            })}
            {filteredUsers.length === 0 && (
              <div className="text-center py-8">
                <Users className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">No members found</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setManagingGroup(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
