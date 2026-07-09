"use client";

import React, { useState, useMemo } from 'react';
import {
  useAdminData,
  canManageCampusesAndGroups,
  type Campus,
  type UserProfile,
} from '@/lib/admin-data-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

export default function SettingsPage() {
  const { campuses, groupScopes, groups, currentUser, addCampus, updateCampus, deleteCampus, addGroup, deleteGroup, users, updateUser, systemSettings, updateSystemSettings } = useAdminData();

  // Campus form state
  const [campusDialogOpen, setCampusDialogOpen] = useState(false);
  const [editingCampusId, setEditingCampusId] = useState<string | null>(null);
  const [campusForm, setCampusForm] = useState<Partial<Campus>>({ name: '', pastor: '', address: '', city: '', zipCode: '', phone: '', email: '', latitude: undefined, longitude: undefined, serviceTimes: [{ day: 'Sunday', times: [''] }] });
  const [deleteCampusConfirm, setDeleteCampusConfirm] = useState<string | null>(null);

  // Group form state
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [newGroup, setNewGroup] = useState('');
  const [newGroupScope, setNewGroupScope] = useState('global');
  const [deleteGroupConfirm, setDeleteGroupConfirm] = useState<string | null>(null);

  // Group member management state
  const [managingGroup, setManagingGroup] = useState<string | null>(null);
  const [memberSearch, setMemberSearch] = useState('');
  const [savingMembers, setSavingMembers] = useState(false);
  const [minAppVersion, setMinAppVersion] = useState(systemSettings?.minAppVersion || '0.1.0');
  const [statsMembers, setStatsMembers] = useState(systemSettings?.statsMembers || 2500);
  const [statsGroups, setStatsGroups] = useState(systemSettings?.statsGroups || 25);
  const [statsYears, setStatsYears] = useState(systemSettings?.statsYears || 15);
  const [savingSettings, setSavingSettings] = useState(false);

  React.useEffect(() => {
    if (systemSettings) {
      setMinAppVersion(systemSettings.minAppVersion || '0.1.0');
      setStatsMembers(systemSettings.statsMembers || 2500);
      setStatsGroups(systemSettings.statsGroups || 25);
      setStatsYears(systemSettings.statsYears || 15);
    }
  }, [systemSettings]);

  if (!canManageCampusesAndGroups(currentUser.role)) {
    return (
      <div className="text-center py-16">
        <Shield className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
        <p className="text-lg font-semibold">Super Admin Access Required</p>
        <p className="text-muted-foreground mt-1">Only Super Admins can manage campuses and groups.</p>
      </div>
    );
  }

  // Campus handlers
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

  const handleAddGroup = () => {
    if (!newGroup.trim()) return;
    addGroup(newGroup.trim(), newGroupScope);
    setNewGroup('');
    setNewGroupScope('global');
    setGroupDialogOpen(false);
  };

  const handleDeleteGroup = (name: string) => {
    deleteGroup(name, managingGroupScope);
    setDeleteGroupConfirm(null);
  };

  // Group member management
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
    await updateSystemSettings({ minAppVersion, statsMembers, statsGroups, statsYears });
    setSavingSettings(false);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage campuses and groups</p>
      </div>

      
      {/* System Settings (Super Admin Only) */}
      <Card className="border-border/50">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            System Configuration
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">Manage global application settings</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-6">
            
            <div className="space-y-2">
              <Label>Minimum Required App Version</Label>
              <Input 
                value={minAppVersion} 
                onChange={(e) => setMinAppVersion(e.target.value)} 
                placeholder="e.g. 1.0.0" 
              />
              <p className="text-[10px] text-muted-foreground">
                Users with an app version lower than this will be forced to update.
              </p>
            </div>
            
            <div className="space-y-2">
              <Label>Total Members</Label>
              <Input 
                type="number"
                value={statsMembers} 
                onChange={(e) => setStatsMembers(Number(e.target.value))} 
                placeholder="2500" 
              />
              <p className="text-[10px] text-muted-foreground">Displayed on the home screen as "X MEMBERS"</p>
            </div>
            
            <div className="space-y-2">
              <Label>Total Groups</Label>
              <Input 
                type="number"
                value={statsGroups} 
                onChange={(e) => setStatsGroups(Number(e.target.value))} 
                placeholder="25" 
              />
              <p className="text-[10px] text-muted-foreground">Displayed on the home screen as "X+ GROUPS"</p>
            </div>
            
            <div className="space-y-2">
              <Label>Years Serving</Label>
              <Input 
                type="number"
                value={statsYears} 
                onChange={(e) => setStatsYears(Number(e.target.value))} 
                placeholder="15" 
              />
              <p className="text-[10px] text-muted-foreground">Displayed on the home screen as "X YRS SERVING"</p>
            </div>
            
          </div>
          <div className="flex justify-end pt-4">
            <Button 
              onClick={handleSaveSettings} 
              disabled={savingSettings || (minAppVersion === (systemSettings?.minAppVersion || '0.1.0') && statsMembers === (systemSettings?.statsMembers || 2500) && statsGroups === (systemSettings?.statsGroups || 25) && statsYears === (systemSettings?.statsYears || 15))}
            >
              {savingSettings ? 'Saving...' : 'Save Configuration'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Campus Management */}
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

      {/* Group Management */}
      <Card className="border-border/50">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0 pb-4">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Group Management
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{groupScopes.length} groups</p>
          </div>
          <Button onClick={() => setGroupDialogOpen(true)} size="sm" className="gap-2 w-full sm:w-auto">
            <Plus className="w-4 h-4" /> Add Group
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {groupScopes.map(group => {
              const memberCount = users.filter(u => u.groups.includes(group.name)).length;
              return (
                <div
                  key={group.name}
                  className="flex items-center flex-wrap gap-2 px-3 py-2 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors group/item cursor-pointer"
                  onClick={() => { setManagingGroup(group.name); setMemberSearch(''); }}
                >
                  <Tag className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="text-sm font-medium">{group.name}</span>
                  <Badge variant="outline" className="text-[10px] ml-1 border-primary/20 bg-primary/5 text-primary truncate max-w-[100px] sm:max-w-none">
                    {group.scope === 'global' ? 'Global' : campuses.find(c => c.id === group.scope)?.name || group.scope}
                  </Badge>
                  <Badge variant="outline" className="text-[9px] gap-1 shrink-0">
                    <Users className="w-2.5 h-2.5" />{memberCount}
                  </Badge>
                  <Button
                    variant="ghost" size="icon"
                    className="h-6 w-6 opacity-100 sm:opacity-0 sm:group-hover/item:opacity-100 transition-opacity text-destructive hover:text-destructive ml-auto"
                    onClick={(e) => { e.stopPropagation(); setDeleteGroupConfirm(group.name); }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

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
          <DialogFooter>
            <Button variant="outline" onClick={() => setCampusDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCampusSubmit} disabled={!campusForm.name}>
              {editingCampusId ? 'Save' : 'Create Campus'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Group Create Dialog */}
      <Dialog open={groupDialogOpen} onOpenChange={setGroupDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>New Group</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Group Name *</Label>
              <Input value={newGroup} onChange={(e) => setNewGroup(e.target.value)} placeholder="e.g. College Students"
                onKeyDown={(e) => e.key === 'Enter' && handleAddGroup()}
              />
            </div>
            <div className="space-y-2">
              <Label>Scope</Label>
              <Select value={newGroupScope} onValueChange={setNewGroupScope}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="global">Global (All Campuses)</SelectItem>
                  {campuses.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGroupDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddGroup} disabled={!newGroup.trim()}>Create Group</Button>
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
          <p className="text-sm text-muted-foreground">Members will be removed from this group.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteGroupConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteGroupConfirm && handleDeleteGroup(deleteGroupConfirm)}>Delete</Button>
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
