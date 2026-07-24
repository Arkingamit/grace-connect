"use client";

import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, ExternalLink } from 'lucide-react';
import { useAdminData } from '@/lib/admin-data-context';

export function NoteShareSection({ variant = 'default' }: { variant?: 'default' | 'page' }) {
  const { broadcasts: contextBroadcasts } = useAdminData();
  const [broadcasts, setBroadcasts] = React.useState<any[]>(contextBroadcasts || []);
  const [loading, setLoading] = React.useState(!contextBroadcasts || contextBroadcasts.length === 0);

  React.useEffect(() => {
    // If context didn't have the data (e.g., loaded before login), fetch it directly
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

  if (loading) {
    return <div className="w-full flex justify-center p-8"><span className="animate-pulse text-muted-foreground">Loading notes...</span></div>;
  }

  if (!broadcasts || broadcasts.length === 0) {
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
          <span className="section-heading">Resources</span>
          <h2 className="section-title">Note Share</h2>
          <p className="section-subtitle">
            Access sermon notes, study guides, and community announcements
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {broadcasts.map(b => (
          <Card key={b._id} className="overflow-hidden group hover:shadow-md transition-shadow bg-card border-border">
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
                    <a
                      key={idx}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-primary hover:underline p-1.5 rounded-md bg-muted/50 hover:bg-muted border border-border/40 shadow-sm transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{link.label}</span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
