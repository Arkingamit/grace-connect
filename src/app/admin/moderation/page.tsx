"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle, CheckCircle, Clock, Flag, Loader2, ShieldOff, Trash2, UserX,
} from 'lucide-react';
import { toast } from 'sonner';

interface ContentReport {
  id: string;
  contentId: string;
  contentSnapshot: string;
  contentAuthorId?: string;
  contentAuthorName?: string;
  reporterName?: string;
  reason: string;
  details?: string;
  source: 'report' | 'block';
  status: 'open' | 'content_removed' | 'user_ejected' | 'dismissed';
  resolutionNote?: string;
  createdAt: string;
  resolvedAt?: string;
}

const REASON_LABELS: Record<string, string> = {
  offensive: 'Offensive or hateful language',
  harassment: 'Harassment or bullying',
  sexual: 'Sexually explicit content',
  violence: 'Violence or threats',
  spam: 'Spam or scam',
  other: 'Other',
};

const STATUS_LABELS: Record<string, string> = {
  open: 'Awaiting action',
  content_removed: 'Content removed',
  user_ejected: 'Member ejected',
  dismissed: 'Dismissed',
};

/** Hours remaining in the 24-hour action window promised in the Terms of Use. */
function hoursLeft(createdAt: string): number {
  const elapsed = Date.now() - new Date(createdAt).getTime();
  return Math.max(0, Math.round((24 * 60 * 60 * 1000 - elapsed) / (60 * 60 * 1000)));
}

export default function ModerationPage() {
  const [reports, setReports] = useState<ContentReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/reports', { cache: 'no-store' });
      if (res.ok) setReports(await res.json());
      else toast.error('Could not load reports');
    } catch {
      toast.error('Could not load reports');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const act = async (id: string, action: 'remove_content' | 'eject_user' | 'dismiss') => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/reports/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || 'Action failed');
        return;
      }
      toast.success(
        action === 'eject_user'
          ? 'Content removed and member ejected'
          : action === 'remove_content'
            ? 'Content removed'
            : 'Report dismissed',
      );
      await load();
    } catch {
      toast.error('Action failed');
    } finally {
      setBusyId(null);
    }
  };

  const open = reports.filter(r => r.status === 'open');
  const resolved = reports.filter(r => r.status !== 'open');

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Content Moderation</h1>
        <p className="text-muted-foreground mt-1">
          Reported content and blocked members. Every report must be actioned within 24 hours
          by removing the content and ejecting the member who posted it.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-2xl">
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{open.length}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Open</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{resolved.length}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Resolved</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-8">
          <section className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border/50">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Flag className="w-5 h-5 text-amber-500" /> Needs action
              </h2>
              <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20">
                {open.length}
              </Badge>
            </div>

            {open.length === 0 ? (
              <div className="text-center py-16 bg-card/30 rounded-xl border border-dashed border-border/50">
                <CheckCircle className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground">Nothing waiting for review</p>
              </div>
            ) : (
              open.map(report => {
                const remaining = hoursLeft(report.createdAt);
                return (
                  <Card key={report.id} className="border-amber-500/20 bg-amber-500/5">
                    <CardContent className="p-5 space-y-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="gap-1 border-amber-500/20 bg-amber-500/10 text-amber-600">
                          {report.source === 'block' ? <ShieldOff className="w-3 h-3" /> : <Flag className="w-3 h-3" />}
                          {report.source === 'block' ? 'Member blocked' : 'Reported'}
                        </Badge>
                        <Badge variant="outline">{REASON_LABELS[report.reason] || report.reason}</Badge>
                        <Badge
                          variant="outline"
                          className={
                            remaining <= 4
                              ? 'border-destructive/30 bg-destructive/10 text-destructive'
                              : 'text-muted-foreground'
                          }
                        >
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          {remaining}h left in SLA
                        </Badge>
                      </div>

                      <div className="text-sm text-muted-foreground">
                        Posted by <span className="font-medium text-foreground">{report.contentAuthorName || 'Unknown'}</span>
                        {report.reporterName && <> · flagged by {report.reporterName}</>}
                        {' · '}
                        {new Date(report.createdAt).toLocaleString()}
                      </div>

                      {report.contentSnapshot && (
                        <div className="bg-background/60 rounded-lg p-3 text-sm whitespace-pre-wrap border border-border/50">
                          {report.contentSnapshot}
                        </div>
                      )}

                      {report.details && (
                        <p className="text-sm text-muted-foreground italic">&ldquo;{report.details}&rdquo;</p>
                      )}

                      <div className="flex flex-wrap gap-2 pt-1">
                        <Button
                          variant="destructive"
                          className="gap-2"
                          disabled={busyId === report.id}
                          onClick={() => void act(report.id, 'eject_user')}
                        >
                          <UserX className="w-4 h-4" /> Remove &amp; eject member
                        </Button>
                        <Button
                          variant="outline"
                          className="gap-2"
                          disabled={busyId === report.id}
                          onClick={() => void act(report.id, 'remove_content')}
                        >
                          <Trash2 className="w-4 h-4" /> Remove content only
                        </Button>
                        <Button
                          variant="ghost"
                          disabled={busyId === report.id}
                          onClick={() => void act(report.id, 'dismiss')}
                        >
                          Dismiss
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </section>

          {resolved.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-xl font-bold flex items-center gap-2 pb-2 border-b border-border/50">
                <CheckCircle className="w-5 h-5 text-emerald-500" /> Resolved
              </h2>
              {resolved.map(report => (
                <Card key={report.id} className="border-border/50 bg-card/30">
                  <CardContent className="p-4 flex flex-wrap items-center gap-3 text-sm">
                    <Badge variant="outline">{STATUS_LABELS[report.status]}</Badge>
                    <span className="text-muted-foreground">
                      {report.contentAuthorName || 'Unknown'} · {REASON_LABELS[report.reason] || report.reason}
                    </span>
                    <span className="text-muted-foreground ml-auto">
                      {report.resolvedAt ? new Date(report.resolvedAt).toLocaleString() : ''}
                    </span>
                  </CardContent>
                </Card>
              ))}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
