"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Plus, Pencil, Trash2, RefreshCw, Link2, X, SquareArrowOutUpRight } from 'lucide-react';
import { useAdminData, getAllowedCampuses, hasGlobalScope } from '@/lib/admin-data-context';
import { toast } from 'sonner';

export default function AdminBroadcastsPage() {
  const { campuses, currentUser } = useAdminData();
  const [broadcasts, setBroadcasts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [form, setForm] = useState({
    title: '',
    description: '',
    targetCampuses: ['all'],
    materialLinks: [{ label: '', url: '' }],
  });

  const fetchBroadcasts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/broadcasts');
      if (res.ok) setBroadcasts(await res.json());
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchBroadcasts();
  }, []);

  const addLink = () => {
    setForm({ ...form, materialLinks: [...form.materialLinks, { label: '', url: '' }] });
  };

  const removeLink = (idx: number) => {
    setForm({ ...form, materialLinks: form.materialLinks.filter((_, i) => i !== idx) });
  };

  const updateLink = (idx: number, field: 'label' | 'url', value: string) => {
    const updated = [...form.materialLinks];
    updated[idx] = { ...updated[idx], [field]: value };
    setForm({ ...form, materialLinks: updated });
  };

  const openCreate = () => {
    setEditingId(null);
    setForm({ title: '', description: '', targetCampuses: ['all'], materialLinks: [{ label: '', url: '' }] });
    setDialogOpen(true);
  };

  const openEdit = (b: any) => {
    setEditingId(b._id);
    setForm({
      title: b.title || '',
      description: b.description || '',
      targetCampuses: b.targetCampuses || ['all'],
      materialLinks: b.materialLinks?.length ? b.materialLinks : [{ label: '', url: '' }],
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.description.trim()) {
      toast.error('Title and description are required');
      return;
    }
    // Filter out empty links
    const validLinks = form.materialLinks.filter(l => l.label.trim() && l.url.trim());

    try {
      const url = editingId ? `/api/admin/broadcasts/${editingId}` : '/api/admin/broadcasts';
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, materialLinks: validLinks }),
      });
      if (res.ok) {
        toast.success(editingId ? 'Note share updated!' : 'Note share published!');
        setDialogOpen(false);
        setEditingId(null);
        setForm({ title: '', description: '', targetCampuses: ['all'], materialLinks: [{ label: '', url: '' }] });
        fetchBroadcasts();
      } else {
        toast.error(editingId ? 'Failed to update note share' : 'Failed to create note share');
      }
    } catch {
      toast.error('An error occurred');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this note share?')) return;
    try {
      const res = await fetch(`/api/admin/broadcasts/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Note share deleted');
        fetchBroadcasts();
      } else {
        toast.error('Failed to delete');
      }
    } catch {
      toast.error('An error occurred');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold font-serif text-[#1A202C]">Note Share</h1>
          <p className="text-[#7A6150] mt-1 font-medium">
            Share notes, materials, and resources with your community
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="gap-2 bg-[#8B2323] hover:bg-[#721515] text-white rounded-xl shrink-0 w-full sm:w-auto"
        >
          <Plus className="w-4 h-4" />
          New Note Share
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <RefreshCw className="w-8 h-8 animate-spin text-[#7A6150]" />
        </div>
      ) : broadcasts.length === 0 ? (
        <Card className="border border-dashed border-[#E5D5C5] bg-[#FAF7F2]/60 rounded-2xl">
          <CardContent className="p-10 sm:p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#E5D5C5]/40 flex items-center justify-center mx-auto mb-4">
              <FileText className="w-7 h-7 text-[#8B2323]/70" />
            </div>
            <h3 className="text-lg font-serif font-bold text-[#1A202C] mb-1.5">No Notes Shared Yet</h3>
            <p className="text-sm text-[#7A6150] mb-5 max-w-sm mx-auto">
              Publish your first note to share notes and materials with the community.
            </p>
            <Button
              onClick={openCreate}
              className="gap-2 bg-[#8B2323] hover:bg-[#721515] text-white rounded-xl"
            >
              <Plus className="w-4 h-4" />
              Create Note Share
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {broadcasts.map(b => (
            <Card key={b._id} className="overflow-hidden group hover:shadow-md transition-shadow border-[#E5D5C5]/60 bg-white rounded-2xl">
              <CardHeader className="bg-gradient-to-br from-[#8B2323]/5 to-transparent pb-3">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg text-[#1A202C] truncate">{b.title}</h3>
                    <p className="text-xs text-[#7A6150] mt-0.5">
                      By {b.createdByName || 'Unknown'} • {new Date(b.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-[#7A6150] hover:text-[#3A2D27] hover:bg-[#F3EAE1]"
                      onClick={() => openEdit(b)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleDelete(b._id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <p className="text-sm text-[#7A6150] line-clamp-3">{b.description}</p>
                {b.materialLinks && b.materialLinks.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-[#E5D5C5]/50">
                    <p className="text-[10px] font-bold text-[#7A6150] uppercase tracking-wider">Materials</p>
                    {b.materialLinks.map((link: any, idx: number) => {
                      const href = (() => {
                        const trimmed = (link.url || '').trim();
                        if (!trimmed) return null;
                        if (/^https?:\/\//i.test(trimmed)) return trimmed;
                        if (/^\/\//.test(trimmed)) return `https:${trimmed}`;
                        return `https://${trimmed.replace(/^\/+/, '')}`;
                      })();
                      if (!href) {
                        return (
                          <div key={idx} className="flex items-center gap-2 text-sm text-[#7A6150] p-2 rounded-xl bg-[#F3EAE1]/50">
                            <FileText className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{link.label}</span>
                          </div>
                        );
                      }
                      return (
                        <div key={idx} className="inline-flex w-full -space-x-px rounded-xl shadow-sm shadow-black/5">
                          <Button
                            asChild
                            variant="outline"
                            className="flex-1 min-w-0 justify-start rounded-none shadow-none first:rounded-s-xl last:rounded-e-xl focus-visible:z-10 h-9 px-3 text-sm font-medium text-[#8B2323] border-[#E5D5C5]/60 bg-[#F3EAE1]/50 hover:bg-[#F3EAE1]"
                          >
                            <a href={href} target="_blank" rel="noopener noreferrer">
                              <FileText className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                              <span className="truncate">{link.label}</span>
                            </a>
                          </Button>
                          <Button
                            asChild
                            variant="outline"
                            size="icon"
                            className="rounded-none shadow-none first:rounded-s-xl last:rounded-e-xl focus-visible:z-10 h-9 w-9 shrink-0 border-[#E5D5C5]/60 bg-[#F3EAE1]/50 hover:bg-[#F3EAE1] text-[#8B2323]"
                            aria-label={`Open ${link.label || 'material'}`}
                          >
                            <a href={href} target="_blank" rel="noopener noreferrer">
                              <SquareArrowOutUpRight size={16} strokeWidth={2} aria-hidden="true" />
                            </a>
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-[#1A202C]">
              {editingId ? 'Edit Note Share' : 'New Note Share'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Sunday Service Notes" className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <textarea
                className="w-full border border-[#E5D5C5]/60 rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#8B2323]/30 min-h-[100px] bg-background"
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="Write your notes, message summary, or any instructions here..."
                rows={4}
              />
            </div>

            {currentUser?.role !== 'group_leader' && (
              <div className="space-y-2">
                <Label>Target Campus</Label>
                <Select value={form.targetCampuses[0] || 'all'} onValueChange={(val) => setForm({ ...form, targetCampuses: [val] })}>
                  <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select campus" /></SelectTrigger>
                  <SelectContent>
                    {hasGlobalScope(currentUser?.role, currentUser?.campusId) && <SelectItem value="all">All Campuses</SelectItem>}
                    {getAllowedCampuses(currentUser?.role, currentUser?.campusId, campuses).map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Material Links */}
            <div className="space-y-3">
              <div className="flex justify-between items-center gap-2">
                <Label className="font-bold flex items-center gap-2"><Link2 className="w-4 h-4" /> Material Links</Label>
                <Button type="button" variant="ghost" size="sm" onClick={addLink} className="text-xs text-[#8B2323] hover:text-[#721515] hover:bg-[#FBE8E8]">
                  <Plus className="w-3 h-3 mr-1" /> Add Link
                </Button>
              </div>
              {form.materialLinks.map((link, idx) => (
                <div key={idx} className="flex gap-2 items-start bg-[#FAF7F2] border border-[#E5D5C5]/50 p-3 rounded-xl">
                  <div className="flex-1 space-y-2">
                    <Input
                      placeholder="Label (e.g. Canva Slides)"
                      value={link.label}
                      onChange={e => updateLink(idx, 'label', e.target.value)}
                      className="h-8 text-xs rounded-lg"
                    />
                    <Input
                      placeholder="https://..."
                      value={link.url}
                      onChange={e => updateLink(idx, 'url', e.target.value)}
                      className="h-8 text-xs rounded-lg"
                    />
                  </div>
                  {form.materialLinks.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" className="shrink-0 text-red-500 hover:text-red-700 mt-1" onClick={() => removeLink(idx)}>
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={handleSave} className="bg-[#8B2323] hover:bg-[#721515] rounded-xl">
              {editingId ? 'Save Changes' : 'Publish'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
