"use client";

import React, { useState } from 'react';
import { Flag, MoreVertical, ShieldOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const REASONS = [
  { value: 'offensive', label: 'Offensive or hateful language' },
  { value: 'harassment', label: 'Harassment or bullying' },
  { value: 'sexual', label: 'Sexually explicit content' },
  { value: 'violence', label: 'Violence or threats' },
  { value: 'spam', label: 'Spam or a scam' },
  { value: 'other', label: 'Something else' },
] as const;

interface ContentModerationMenuProps {
  contentId: string;
  authorId?: string;
  authorName?: string;
  /** Removes the item from the caller's list as soon as it is reported or blocked. */
  onHidden?: (contentId: string) => void;
  className?: string;
}

/**
 * Report objectionable content and block abusive members (App Store guideline 1.2).
 * Both actions are available on every piece of member-submitted content.
 */
export function ContentModerationMenu({
  contentId,
  authorId,
  authorName,
  onHidden,
  className,
}: ContentModerationMenuProps) {
  const [reportOpen, setReportOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const [reason, setReason] = useState<string>('offensive');
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);

  const canBlock = Boolean(authorId);
  const displayName = authorName && authorName !== 'Anonymous' ? authorName : 'this member';

  const submitReport = async () => {
    setBusy(true);
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentType: 'prayer', contentId, reason, details }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast.error(data.error || 'Could not send your report. Please try again.');
        return;
      }

      toast.success(
        data.alreadyReported
          ? 'You have already reported this. Our moderators are reviewing it.'
          : 'Thank you. Our moderators review every report within 24 hours.',
      );
      setReportOpen(false);
      setDetails('');
      onHidden?.(contentId);
    } catch {
      toast.error('Could not send your report. Please check your connection.');
    } finally {
      setBusy(false);
    }
  };

  const submitBlock = async () => {
    setBusy(true);
    try {
      const res = await fetch('/api/users/block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: authorId, contentId }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast.error(data.error || 'Could not block this member. Please try again.');
        return;
      }

      toast.success('Blocked. You will no longer see content from this member.');
      setBlockOpen(false);
      onHidden?.(contentId);
    } catch {
      toast.error('Could not block this member. Please check your connection.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={`h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground ${className || ''}`}
            aria-label="Report or block"
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onSelect={() => setReportOpen(true)}>
            <Flag className="mr-2 h-4 w-4" />
            Report content
          </DropdownMenuItem>
          {canBlock && (
            <DropdownMenuItem className="text-destructive" onSelect={() => setBlockOpen(true)}>
              <ShieldOff className="mr-2 h-4 w-4" />
              Block this member
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Report this content</DialogTitle>
            <DialogDescription>
              Grace Connect has zero tolerance for objectionable content. Our moderators
              review every report and act within 24 hours.
            </DialogDescription>
          </DialogHeader>

          <RadioGroup value={reason} onValueChange={setReason} className="space-y-2">
            {REASONS.map((r) => (
              <div key={r.value} className="flex items-center gap-3">
                <RadioGroupItem value={r.value} id={`reason-${contentId}-${r.value}`} />
                <Label
                  htmlFor={`reason-${contentId}-${r.value}`}
                  className="cursor-pointer text-sm font-normal"
                >
                  {r.label}
                </Label>
              </div>
            ))}
          </RadioGroup>

          <Textarea
            rows={3}
            placeholder="Add any details (optional)"
            value={details}
            maxLength={1000}
            onChange={(e) => setDetails(e.target.value)}
          />

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setReportOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={() => void submitReport()} disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={blockOpen} onOpenChange={setBlockOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Block {displayName}?</DialogTitle>
            <DialogDescription>
              You will immediately stop seeing anything posted by {displayName}, and our
              moderators will be alerted to review the account. You can unblock from
              Profile &rarr; Blocked accounts.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setBlockOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => void submitBlock()} disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Block member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
