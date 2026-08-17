"use client";

import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileText, SquareArrowOutUpRight, Search } from 'lucide-react';
import { useAdminData } from '@/lib/admin-data-context';
import { useAuth } from '@/lib/auth-context';

function normalizeExternalUrl(url: string): string | null {
  const trimmed = (url || '').trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^\/\//.test(trimmed)) return `https:${trimmed}`;
  // Treat bare domains / paths as https links
  return `https://${trimmed.replace(/^\/+/, '')}`;
}

function MaterialLinkRow({ label, url }: { label: string; url: string }) {
  const href = normalizeExternalUrl(url);
  if (!href) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground p-1.5 rounded-md bg-muted/50 border border-border/40">
        <FileText className="w-3.5 h-3.5 shrink-0 text-primary" />
        <span className="truncate">{label || 'Material'}</span>
      </div>
    );
  }

  return (
    <div className="inline-flex w-full -space-x-px rounded-lg shadow-sm shadow-black/5 rtl:space-x-reverse">
      <Button
        asChild
        variant="outline"
        className="flex-1 min-w-0 justify-start rounded-none shadow-none first:rounded-s-lg last:rounded-e-lg focus-visible:z-10 h-9 px-3 text-xs font-medium text-primary border-border/60 bg-muted/40 hover:bg-muted"
      >
        <a href={href} target="_blank" rel="noopener noreferrer" title={label || 'Open material'}>
          <FileText className="w-3.5 h-3.5 shrink-0 text-primary" aria-hidden="true" />
          <span className="truncate">{label || 'Open material'}</span>
        </a>
      </Button>
      <Button
        asChild
        variant="outline"
        size="icon"
        className="rounded-none shadow-none first:rounded-s-lg last:rounded-e-lg focus-visible:z-10 h-9 w-9 shrink-0 border-border/60 bg-muted/40 hover:bg-muted text-primary"
        aria-label={`Open ${label || 'material'} in new tab`}
      >
        <a href={href} target="_blank" rel="noopener noreferrer">
          <SquareArrowOutUpRight size={16} strokeWidth={2} aria-hidden="true" />
        </a>
      </Button>
    </div>
  );
}

export function NoteShareSection({ variant = 'default' }: { variant?: 'default' | 'page' }) {
  const { broadcasts: contextBroadcasts, getVisibleBroadcasts } = useAdminData();
  const { getSessionMember, getEffectiveGroups } = useAuth();
  const [broadcasts, setBroadcasts] = React.useState<any[]>(contextBroadcasts || []);
  const [loading, setLoading] = React.useState(!contextBroadcasts || contextBroadcasts.length === 0);
  const [searchQuery, setSearchQuery] = React.useState('');

  React.useEffect(() => {
    // Sync when context updates; fetch if context is empty (e.g. loaded before login)
    if (!contextBroadcasts || contextBroadcasts.length === 0) {
      fetch('/api/broadcasts')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setBroadcasts(data);
          }
        })
        .finally(() => setLoading(false));
    } else {
      setBroadcasts(contextBroadcasts);
      setLoading(false);
    }
  }, [contextBroadcasts]);

  const visibleBroadcasts = React.useMemo(() => {
    const sessionMember = getSessionMember();
    const effectiveGroups = sessionMember ? getEffectiveGroups(sessionMember) : [];
    const isAdminOrLeader =
      sessionMember?.role === 'admin' ||
      sessionMember?.role === 'super_admin' ||
      sessionMember?.role === 'campus_leader';
    const userGroups = !sessionMember
      ? []
      : isAdminOrLeader
        ? ['all']
        : Array.from(new Set([...effectiveGroups, 'all']));
    const campusId = sessionMember?.campusId || (sessionMember ? 'all' : 'global');
    const role = sessionMember?.role;

    // Prefer context helper when context already has broadcasts
    if (getVisibleBroadcasts && contextBroadcasts && contextBroadcasts.length > 0) {
      return getVisibleBroadcasts(campusId, userGroups, role);
    }

    // Inline checkVisibility for locally fetched notes (or if helper unavailable)
    return broadcasts.filter((item: any) => {
      if (role === 'super_admin' || role === 'admin') return true;
      const campusMatch = !item.targetCampuses || item.targetCampuses.length === 0 || item.targetCampuses.includes('all') || item.targetCampuses.includes(campusId);
      if (!campusMatch) return false;
      if (item.excludeCampuses && item.excludeCampuses.includes(campusId)) return false;
      const groupMatch = !item.targetGroups || item.targetGroups.length === 0 || item.targetGroups.includes('all') || item.targetGroups.some((g: string) => userGroups.includes(g));
      if (!groupMatch) return false;
      if (item.excludeGroups && item.excludeGroups.some((g: string) => userGroups.includes(g))) return false;
      return true;
    });
  }, [broadcasts, contextBroadcasts, getVisibleBroadcasts, getSessionMember, getEffectiveGroups]);

  const filteredBroadcasts = React.useMemo(() => {
    if (!searchQuery.trim()) return visibleBroadcasts;
    const q = searchQuery.toLowerCase();
    return visibleBroadcasts.filter(b =>
      (b.title?.toLowerCase().includes(q)) ||
      (b.description?.toLowerCase().includes(q))
    );
  }, [visibleBroadcasts, searchQuery]);

  if (loading) {
    return <div className="w-full flex justify-center p-8"><span className="animate-pulse text-muted-foreground">Loading notes...</span></div>;
  }

  if (!visibleBroadcasts || visibleBroadcasts.length === 0) {
    return (
      <div className="w-full text-center p-10 bg-muted/30 rounded-3xl border border-border/60">
        <FileText className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
        <h3 className="text-lg font-serif font-bold text-foreground mb-1.5">No Notes Yet</h3>
        <p className="text-muted-foreground text-sm">There are no published notes available at this time.</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {variant === 'default' && (
        <div className="text-center space-y-4 mb-12">
          <h2 className="section-title">Note Share</h2>
          <p className="section-subtitle">
            Access sermon notes, study guides, and community announcements
          </p>
        </div>
      )}

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search notes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 bg-card border-border/60"
        />
      </div>

      {filteredBroadcasts.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground text-sm bg-muted/20 rounded-xl border border-border/40">
          No notes match your search.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBroadcasts.map(b => (
          <Card key={b._id || b.id} className="overflow-hidden group hover:shadow-md transition-shadow bg-card border-border">
            <div className="p-3 pb-2 border-b border-border/50 bg-muted/20">
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-base text-card-foreground truncate">{b.title}</h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {b.createdByName || 'Admin'} • {new Date(b.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
            <div className="p-3 pt-2 space-y-2">
              <p className="text-sm text-card-foreground/90 line-clamp-2 whitespace-pre-wrap">{b.description}</p>
              {b.materialLinks && b.materialLinks.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-border/50">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Materials</p>
                  {b.materialLinks.map((link: any, idx: number) => (
                    <MaterialLinkRow key={idx} label={link.label} url={link.url} />
                  ))}
                </div>
              )}
            </div>
          </Card>
          ))}
        </div>
      )}
    </div>
  );
}
