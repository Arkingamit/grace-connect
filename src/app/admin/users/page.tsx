"use client";

import React, { useState } from 'react';
import {
  useAdminData,
  canManageUsers,
  canAppointRole,
  getAssignableRoles,
  getGroupsForCampus,
  getAllowedCampuses,
  hasGlobalScope,
  ROLE_LABELS,
  type UserProfile,
  type UserRole,
} from '@/lib/admin-data-context';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Users,
  Plus,
  Pencil,
  Trash2,
  Search,
  Shield,
  ShieldCheck,
  User,
  Crown,
  Building2,
  UserPlus,
  UserCheck,
} from 'lucide-react';

const roleIcons: Record<UserRole, React.ElementType> = {
  member: User,
  group_leader: UserCheck,
  campus_leader: Shield,
  admin: ShieldCheck,
  super_admin: Crown,
};

const roleColors: Record<UserRole, string> = {
  member: 'bg-[#F3EAE1] text-[#7A6150]',
  group_leader: 'bg-[#E5D5C5] text-[#5C4535]',
  campus_leader: 'bg-[#FBE8E8] text-[#8B2323]',
  admin: 'bg-[#721515]/10 text-[#721515]',
  super_admin: 'bg-[#5C1111]/10 text-[#5C1111]',
};

const emptyForm = {
  name: '',
  firstName: '',
  middleName: '',
  lastName: '',
  email: '',
  role: 'member' as UserRole,
  campusId: 'main',
  groups: [] as string[],
  gender: 'male' as 'male' | 'female',
  birthday: '',
  maritalStatus: 'single' as 'single' | 'married',
  marriageDate: '',
  phone: '',
  whatsapp: '',
};

export default function UsersPage() {
  const { users, campuses, groupScopes, currentUser, addUser, updateUser, deleteUser } = useAdminData();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<string>('all');

  if (!canManageUsers(currentUser.role)) {
    return (
      <div className="text-center py-16 text-[#3A2D27]">
        <Shield className="w-12 h-12 mx-auto text-[#8B2323]/50 mb-3" />
        <p className="text-lg font-serif font-bold">Access Restricted</p>
        <p className="text-[#7A6150] mt-1 font-medium">You need Campus Leader access to manage users.</p>
      </div>
    );
  }

  const isCampusLeader = currentUser.role === 'campus_leader';
  const assignableRoles = getAssignableRoles(currentUser.role);

  const filtered = users.filter(u => {
    // Campus leaders only see users in their campus + global users
    if (isCampusLeader && u.campusId !== currentUser.campusId && u.campusId !== 'global') {
      return false;
    }
    const matchesSearch = u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const openCreate = () => {
    setEditingId(null);
    setForm({ 
      ...emptyForm, 
      role: assignableRoles[0] || 'member',
      campusId: isCampusLeader ? currentUser.campusId : 'main',
    });
    setDialogOpen(true);
  };

  const openEdit = (user: UserProfile) => {
    const parts = user.name.trim().split(' ');
    const fallbackFirst = parts[0] || '';
    const fallbackLast = parts.slice(1).join(' ') || '';

    setEditingId(user.id);
    setForm({
      ...emptyForm,
      ...user,
      firstName: user.firstName || fallbackFirst,
      lastName: user.lastName || fallbackLast,
      name: user.name,
      email: user.email,
      role: user.role,
      campusId: user.campusId,
      groups: user.groups,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    const updatedForm = { ...form };
    
    // Automatically generate full name if first and last names are provided
    if (updatedForm.firstName && updatedForm.lastName) {
      updatedForm.name = `${updatedForm.firstName} ${updatedForm.middleName ? updatedForm.middleName + ' ' : ''}${updatedForm.lastName}`.trim();
    }
    
    if (!updatedForm.name || !updatedForm.email) return;
    
    if (editingId !== null) {
      const res = await updateUser(editingId, updatedForm) as any;
      if (res && !res.success) {
        alert(res.error);
        return;
      }
    } else {
      const res = await addUser(updatedForm) as any;
      if (res && !res.success) {
        alert(res.error);
        return;
      }
    }
    setDialogOpen(false);
    setForm(emptyForm);
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    if (id === currentUser.id) return; // Can't delete yourself
    deleteUser(id);
    setDeleteConfirmId(null);
  };

  const toggleGroup = (group: string) => {
    setForm(f => ({
      ...f,
      groups: f.groups.includes(group) ? f.groups.filter(g => g !== group) : [...f.groups, group],
    }));
  };


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-serif text-[#1A202C]">User Management</h1>
          <p className="text-[#7A6150] mt-1 font-medium">Manage users and assign roles</p>
        </div>
        <Button onClick={openCreate} className="gap-2 shrink-0 bg-[#8B2323] hover:bg-[#721515] text-white rounded-xl">
          <UserPlus className="w-4 h-4" />
          Add User
        </Button>
      </div>


      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7A6150]" />
          <Input placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-[#FAF7F2] border-[#E5D5C5]/60 focus-visible:ring-[#8B2323] text-[#3A2D27] rounded-xl h-11" />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[180px] bg-[#FAF7F2] border-[#E5D5C5]/60 text-[#3A2D27] rounded-xl h-11 font-medium">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            {(['super_admin', 'admin', 'campus_leader', 'group_leader', 'member'] as UserRole[]).map(r => (
              <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* User List */}
      <div className="space-y-3">
        {filtered.map(user => {
          const Icon = roleIcons[user.role];
          const campus = campuses.find(c => c.id === user.campusId);
          const canEdit = canAppointRole(currentUser.role, user.role) || user.id === currentUser.id;
          const canDelete = user.id !== currentUser.id && canAppointRole(currentUser.role, user.role);

          return (
            <Card key={user.id} className="border-[#E5D5C5]/60 bg-white hover:shadow-md transition-shadow group rounded-2xl">
              <CardContent className="p-4 flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${roleColors[user.role]}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-[#1A202C] truncate">{user.name}</p>
                    <Badge variant="outline" className={`text-[10px] border-[#E5D5C5]/60 font-semibold ${roleColors[user.role]}`}>
                      {ROLE_LABELS[user.role]}
                    </Badge>
                    {user.id === currentUser.id && (
                      <Badge variant="outline" className="text-[10px] border-[#8B2323]/30 text-[#8B2323] font-semibold bg-[#FBE8E8]/50">You</Badge>
                    )}
                    {(user as any).isLinkedProfile && (
                      <Badge variant="outline" className="text-[10px] border-blue-200 text-blue-700 font-semibold bg-blue-50">Linked Profile</Badge>
                    )}
                  </div>
                  <p className="text-sm text-[#7A6150] truncate">{(user as any).isLinkedProfile ? `Family of ${users.find(u => u.id === (user as any).parentAccountId)?.name || 'Unknown'}` : user.email}</p>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <span className="text-xs text-[#7A6150] font-medium flex items-center gap-1">
                      <Building2 className="w-3 h-3" /> {user.campusId === 'global' ? 'Global' : (campus?.name || user.campusId)}
                    </span>
                    {user.groups.length > 0 && (
                      <span className="text-xs text-[#7A6150] font-medium flex items-center gap-1">
                        <Users className="w-3 h-3" /> {user.groups.join(', ')}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  {canEdit && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-[#7A6150] hover:text-[#3A2D27] hover:bg-[#F3EAE1]" onClick={() => openEdit(user)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                  )}
                  {canDelete && (
                    <Button
                      variant="ghost" size="icon"
                      className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => setDeleteConfirmId(user.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <Users className="w-12 h-12 mx-auto text-[#E5D5C5] mb-3" />
          <p className="text-[#7A6150] font-medium">No users found</p>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit User' : 'Add User'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-2">
                <Label>First Name *</Label>
                <Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} placeholder="First" />
              </div>
              <div className="space-y-2">
                <Label>Middle Name</Label>
                <Input value={form.middleName} onChange={(e) => setForm({ ...form, middleName: e.target.value })} placeholder="Middle" />
              </div>
              <div className="space-y-2">
                <Label>Last Name *</Label>
                <Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} placeholder="Last" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@grace.org" />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+1..." />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-2">
                <Label>WhatsApp</Label>
                <Input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} placeholder="+1..." />
              </div>
              <div className="space-y-2">
                <Label>Gender</Label>
                <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v as 'male' | 'female' })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Birthday</Label>
                <Input type="date" value={form.birthday} onChange={(e) => setForm({ ...form, birthday: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Marital Status</Label>
                <Select value={form.maritalStatus} onValueChange={(v) => setForm({ ...form, maritalStatus: v as 'single' | 'married' })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">Single</SelectItem>
                    <SelectItem value="married">Married</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.maritalStatus === 'married' && (
                <div className="space-y-2">
                  <Label>Marriage Date</Label>
                  <Input type="date" value={form.marriageDate} onChange={(e) => setForm({ ...form, marriageDate: e.target.value })} />
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as UserRole })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {assignableRoles.map(r => (
                      <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Campus</Label>
                <Select 
                  value={form.campusId} 
                  onValueChange={(v) => setForm({ ...form, campusId: v, groups: [] })} // Reset groups when campus changes
                  disabled={isCampusLeader}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {hasGlobalScope(currentUser.role) && <SelectItem value="global">Global (All Campuses)</SelectItem>}
                    {getAllowedCampuses(currentUser.role, currentUser.campusId, campuses).map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Groups</Label>
              {getGroupsForCampus(groupScopes, form.campusId).length === 0 ? (
                <p className="text-sm text-muted-foreground">No groups available for this campus.</p>
              ) : (
                <div className="grid grid-cols-2 gap-1.5">
                  {getGroupsForCampus(groupScopes, form.campusId).map(g => (
                    <label key={g} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.groups.includes(g)}
                        onChange={() => toggleGroup(g)}
                        className="rounded"
                      />
                      {g}
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!form.name || !form.email}>
              {editingId ? 'Save Changes' : 'Add User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={deleteConfirmId !== null} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete User?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This will remove the user from the system.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
