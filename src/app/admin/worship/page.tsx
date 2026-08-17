"use client";

import React, { useState } from 'react';
import { useAdminData, type WorshipVideo } from '@/lib/admin-data-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Music,
  Plus,
  Trash2,
  Pencil,
  Youtube,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Search,
  History,
  Star,
} from 'lucide-react';
import { toast } from 'sonner';
import { HighlightPublishOptions } from '@/components/admin/highlight-publish-options';
import { DEFAULT_HIGHLIGHT_FIELDS, withHighlightExpiry } from '@/lib/highlight-utils';



export default function WorshipManagementPage() {
  const { worshipVideos, addWorshipVideo, updateWorshipVideo, deleteWorshipVideo, currentUser } = useAdminData();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  if (currentUser.role !== 'admin' && currentUser.role !== 'super_admin') {
    return (
      <div className="text-center py-16">
        <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
        <p className="text-lg font-semibold">Admin Access Required</p>
        <p className="text-muted-foreground mt-1">Only Administrators can manage the carousel videos.</p>
      </div>
    );
  }

  const initialForm = {
    title: '',
    videoId: '',
    youtubeUrl: '',
    ...DEFAULT_HIGHLIGHT_FIELDS,
  };

  const [form, setForm] = useState(initialForm);

  const extractVideoId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const handleOpenCreate = () => {
    setForm(initialForm);
    setEditingId(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (video: WorshipVideo) => {
    setForm({
      ...video,
      youtubeUrl: `https://youtube.com/watch?v=${video.videoId}`,
      showOnHighlight: !!video.showOnHighlight,
      highlightDurationHours: video.highlightDurationHours || 24,
      highlightExpiresAt: video.highlightExpiresAt || null,
    });
    setEditingId(video.id);
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const videoId = extractVideoId(form.youtubeUrl);
    if (!videoId) {
      alert("Invalid YouTube URL");
      return;
    }

    const videoData = withHighlightExpiry({
      title: form.title,
      videoId: videoId,
      showOnHighlight: form.showOnHighlight,
      highlightDurationHours: form.highlightDurationHours,
      highlightExpiresAt: form.highlightExpiresAt,
    });

    if (editingId !== null) {
      updateWorshipVideo(editingId, videoData);
    } else {
      addWorshipVideo(videoData);
    }

    setDialogOpen(false);
  };

  const filtered = worshipVideos.filter(v => 
    v.title.toLowerCase().includes(search.toLowerCase())
  );

  const featuredCount = worshipVideos.filter(v => v.isFeatured).length;
  const isMinRequirementMet = featuredCount >= 10;

  const handleToggleFeatured = (video: WorshipVideo) => {
    if (!video.isFeatured && featuredCount >= 15) {
      toast.error('Maximum 15 videos can be featured. Unfeature one first.');
      return;
    }
    updateWorshipVideo(video.id, { isFeatured: !video.isFeatured });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Worship Music</h1>
          <p className="text-muted-foreground mt-1">Manage YouTube videos for the home page carousel</p>
        </div>
        <Button onClick={handleOpenCreate} className="gap-2 shrink-0">
          <Plus className="w-4 h-4" /> Add Video
        </Button>
      </div>

      {/* Requirement Bar */}
      <Card className={`border-none ${isMinRequirementMet ? 'bg-emerald-500/10' : 'bg-amber-500/10'}`}>
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isMinRequirementMet ? (
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            ) : (
              <AlertCircle className="w-6 h-6 text-amber-500" />
            )}
            <div>
              <p className={`font-semibold ${isMinRequirementMet ? 'text-emerald-700' : 'text-amber-700'}`}>
                {isMinRequirementMet ? 'Requirement Met' : 'Requirement Not Met'}
              </p>
              <p className="text-sm text-muted-foreground">
                Minimum <strong>10 videos</strong> required for the home page carousel (Max 15). Current featured: <strong>{featuredCount}</strong> / 15
              </p>
            </div>
          </div>
          <div className="hidden md:block">
            <div className="w-48 h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ${isMinRequirementMet ? 'bg-emerald-500' : 'bg-amber-500'}`}
                style={{ width: `${Math.min((featuredCount / 15) * 100, 100)}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search & Actions */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input 
          placeholder="Search by title..." 
          value={search} 
          onChange={(e) => setSearch(e.target.value)} 
          className="pl-9"
        />
      </div>

      {/* Video Grid */}
      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
        {filtered.map((video) => (
          <Card key={video.id} className="group overflow-hidden border-border/50 hover:shadow-md transition-all">
            <div className="aspect-video relative overflow-hidden bg-muted">
              <img 
                src={`https://img.youtube.com/vi/${video.videoId}/mqdefault.jpg`}
                alt={video.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Button size="icon" variant="secondary" className="h-9 w-9" onClick={() => handleOpenEdit(video)}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button size="icon" variant="destructive" className="h-9 w-9" onClick={() => setDeleteConfirmId(video.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <CardContent className="p-3 space-y-3">
              <h3 className="font-semibold text-sm line-clamp-1">{video.title}</h3>
              
              <Button 
                variant={video.isFeatured ? "default" : "outline"}
                className={`w-full text-xs h-8 ${video.isFeatured ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-500' : ''}`}
                onClick={() => handleToggleFeatured(video)}
              >
                <Star className={`w-3 h-3 mr-2 ${video.isFeatured ? 'fill-current' : ''}`} />
                {video.isFeatured ? 'In Carousel' : 'Add to Carousel'}
              </Button>

              <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
                <a href={`https://youtube.com/watch?v=${video.videoId}`} target="_blank" rel="noopener noreferrer">
                  <Youtube className="w-4 h-4 text-red-500 hover:scale-110 transition-transform" />
                </a>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-20 border-2 border-dashed border-border/50 rounded-2xl">
          <Music className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-medium">No videos found</h3>
          <p className="text-muted-foreground mb-6">Start by adding your favorite worship videos</p>
          <Button onClick={handleOpenCreate}>Add New Video</Button>
        </div>
      )}

      {/* Editor Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Video' : 'Add New Worship Video'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="youtubeUrl">YouTube URL *</Label>
              <Input 
                id="youtubeUrl" 
                placeholder="https://www.youtube.com/watch?v=..." 
                value={form.youtubeUrl}
                onChange={(e) => setForm({ ...form, youtubeUrl: e.target.value })}
                required
              />
              <p className="text-[10px] text-muted-foreground">Supported: youtube.com, youtu.be, embed links</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input 
                id="title" 
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
            </div>

            <HighlightPublishOptions
              showOnHighlight={form.showOnHighlight}
              highlightDurationHours={form.highlightDurationHours}
              onShowChange={(show) => setForm({ ...form, showOnHighlight: show })}
              onDurationChange={(hours) => setForm({ ...form, highlightDurationHours: hours })}
            />

            <DialogFooter className="pt-4">
              <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit">{editingId ? 'Save Changes' : 'Add Video'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteConfirmId !== null} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Delete video?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">This action cannot be undone.</p>
          <DialogFooter className="flex gap-2">
            <Button variant="ghost" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => {
              if (deleteConfirmId) deleteWorshipVideo(deleteConfirmId);
              setDeleteConfirmId(null);
            }}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
