"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, ShieldOff } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface BlockedUser {
  id: string;
  name: string;
  avatar?: string;
}

/** Lets members review and undo the accounts they blocked (App Store guideline 1.2). */
export function BlockedAccountsSection() {
  const [blocked, setBlocked] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/users/block', { cache: 'no-store' });
      if (res.ok) setBlocked(await res.json());
    } catch {
      // Non-critical — the section simply stays empty.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const unblock = async (userId: string) => {
    setBusyId(userId);
    try {
      const res = await fetch('/api/users/block', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) {
        toast.error('Could not unblock this member');
        return;
      }
      setBlocked(prev => prev.filter(b => b.id !== userId));
      toast.success('Member unblocked');
    } catch {
      toast.error('Could not unblock this member');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="bg-white dark:bg-card border border-border/50 shadow-[0px_4px_20px_rgba(0,0,0,0.04)] rounded-3xl p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#FAF7F2] dark:bg-muted/50 flex items-center justify-center text-[#8B2323] shrink-0">
          <ShieldOff className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-[#1A202C] dark:text-foreground">Blocked accounts</h2>
          <p className="text-[11px] text-muted-foreground">
            You will not see content from anyone you block.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        </div>
      ) : blocked.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          You have not blocked anyone. You can block a member from the menu on any prayer request.
        </p>
      ) : (
        <ul className="space-y-2">
          {blocked.map(user => (
            <li
              key={user.id}
              className="flex items-center gap-3 rounded-2xl border border-border/40 bg-[#FAF7F2] dark:bg-muted/30 px-3 py-2"
            >
              <Avatar className="h-8 w-8">
                {user.avatar ? <AvatarImage src={user.avatar} alt={user.name} /> : null}
                <AvatarFallback className="bg-[#8B2323]/10 text-[#8B2323] text-xs font-semibold">
                  {user.name?.[0]?.toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
              <span className="flex-1 min-w-0 truncate text-sm font-medium">{user.name}</span>
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl"
                disabled={busyId === user.id}
                onClick={() => void unblock(user.id)}
              >
                {busyId === user.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Unblock'}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
