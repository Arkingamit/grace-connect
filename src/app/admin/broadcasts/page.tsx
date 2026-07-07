"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Plus, Trash2, RefreshCw, ExternalLink, Link2, X } from 'lucide-react';
import { useAdminData, getAllowedCampuses, hasGlobalScope } from '@/lib/admin-data-context';
import { toast } from 'sonner';

export default function AdminBroadcastsPage() {
  const { campuses, currentUser } = useAdminData();
  const [broadcasts, setBroadcasts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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

  const handleSave = async () => {
    if (!form.title.trim() || !form.description.trim()) {
      toast.error('Title and description are required');
      return;
    }
    // Filter out empty links
    const validLinks = form.materialLinks.filter(l => l.label.trim() && l.url.trim());

    try {
      const res = await fetch('/api/admin/broadcasts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, materialLinks: validLinks }),
      });
      if (res.ok) {
        toast.success('Note share published!');
        setDialogOpen(false);
        setForm({ title: '', description: '', targetCampuses: ['all'], materialLinks: [{ label: '', url: '' }] });
        fetchBroadcasts();
      } else {
        toast.error('Failed to create note share');
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
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-[#1A202C]">Note Share</h1>
          <p className="text-muted-foreground mt-1">Share notes, materials, and resources with your community</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="bg-[#8B2323] hover:bg-[#721515]">
          <Plus className="w-4 h-4 mr-2" />
          New Note Share
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center p-12"><RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" /></div>
      ) : broadcasts.length === 0 ? (
        <Card className="p-12 text-center border-dashed">
          <FileText className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Notes Shared Yet</h3>
          <p className="text-muted-foreground mb-4">Publish your first note to share notes and materials.</p>
          <Button onClick={() => setDialogOpen(true)} variant="outline">Create Note Share</Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {broadcasts.map(b => (
            <Card key={b._id} className="overflow-hidden group hover:shadow-lg transition-shadow">
              <CardHeader className="bg-gradient-to-br from-[#8B2323]/5 to-transparent pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg truncate">{b.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      By {b.createdByName || 'Unknown'} • {new Date(b.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    onClick={() => handleDelete(b._id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <p className="text-sm text-muted-foreground line-clamp-3">{b.description}</p>
                {b.materialLinks && b.materialLinks.length > 0 && (
                  <div className="space-y-2 pt-2 border-t">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Materials</p>
                    {b.materialLinks.map((link: any, idx: number) => (
                      <a
                        key={idx}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-[#8B2323] hover:underline p-2 rounded-lg bg-[#F3EAE1]/50 hover:bg-[#F3EAE1]"
                      >
                        <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{link.label}</span>
                      </a>
                    ))}
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
            <DialogTitle>New Note Share</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Sunday Service Notes" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <textarea
                className="w-full border rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#8B2323]/30 min-h-[100px]"
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
                  <SelectTrigger><SelectValue placeholder="Select campus" /></SelectTrigger>
                  <SelectContent>
                    {hasGlobalScope(currentUser?.role) && <SelectItem value="all">All Campuses</SelectItem>}
                    {getAllowedCampuses(currentUser?.role, currentUser?.campusId, campuses).map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Material Links */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label className="font-bold flex items-center gap-2"><Link2 className="w-4 h-4" /> Material Links</Label>
                <Button type="button" variant="ghost" size="sm" onClick={addLink} className="text-xs">
                  <Plus className="w-3 h-3 mr-1" /> Add Link
                </Button>
              </div>
              {form.materialLinks.map((link, idx) => (
                <div key={idx} className="flex gap-2 items-start bg-muted/30 p-3 rounded-lg">
                  <div className="flex-1 space-y-2">
                    <Input
                      placeholder="Label (e.g. Canva Slides)"
                      value={link.label}
                      onChange={e => updateLink(idx, 'label', e.target.value)}
                      className="h-8 text-xs"
                    />
                    <Input
                      placeholder="https://..."
                      value={link.url}
                      onChange={e => updateLink(idx, 'url', e.target.value)}
                      className="h-8 text-xs"
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
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} className="bg-[#8B2323] hover:bg-[#721515]">Publish</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
