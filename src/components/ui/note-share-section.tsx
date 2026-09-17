"use client";

import React from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileText, SquareArrowOutUpRight, Search, ArrowUpDown, X, ChevronRight, Calendar, ChevronDown } from 'lucide-react';
import { useAdminData } from '@/lib/admin-data-context';
import { useAuth } from '@/lib/auth-context';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { formatDDMMYYYY } from '@/lib/date-utils';

function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return 'Filter by date';
  return formatDDMMYYYY(dateStr) || dateStr;
}

function normalizeExternalUrl(url: string): string | null {
  const trimmed = (url || '').trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^\/\//.test(trimmed)) return `https:${trimmed}`;
  // Treat bare domains / paths as https links
  return `https://${trimmed.replace(/^\/+/, '')}`;
}

function formatNoteDate(dateInput: string | Date): string {
  return formatDDMMYYYY(dateInput);
}

function MaterialLinkRow({ label, url }: { label: string; url: string }) {
  const href = normalizeExternalUrl(url);
  if (!href) {
    return (
      <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-[#FAF7F2] border border-[#E5D5C5]/60 text-xs text-[#7A6150]">
        <div className="w-6 h-6 rounded-lg bg-[#FBE8E8] text-[#8B2323] flex items-center justify-center shrink-0">
          <FileText className="w-3.5 h-3.5" />
        </div>
        <span className="truncate">{label || 'Material'}</span>
      </div>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group/link flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl bg-[#FAF7F2] hover:bg-[#FBE8E8]/40 active:scale-[0.99] border border-[#E5D5C5]/60 hover:border-[#8B2323]/30 transition-all text-[#3A2D27]"
      title={label || 'Open material'}
    >
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-6 h-6 rounded-lg bg-[#FBE8E8] text-[#8B2323] flex items-center justify-center shrink-0 group-hover/link:bg-[#8B2323] group-hover/link:text-white transition-colors">
          <FileText className="w-3.5 h-3.5" />
        </div>
        <span className="text-xs font-medium text-[#1A202C] group-hover/link:text-[#8B2323] truncate transition-colors">
          {label || 'Open note document'}
        </span>
      </div>
      <div className="flex items-center gap-1 text-[#8B2323] shrink-0 text-xs font-semibold">
        <span className="text-[10px] font-medium text-[#7A6150] group-hover/link:text-[#8B2323] hidden xs:inline transition-colors">Open</span>
        <SquareArrowOutUpRight className="w-3 h-3 text-[#8B2323]/80 group-hover/link:text-[#8B2323] group-hover/link:translate-x-0.5 transition-transform" />
      </div>
    </a>
  );
}

export function NoteShareSection({
  variant = 'default',
  limit,
}: {
  variant?: 'default' | 'page';
  limit?: number;
}) {
  const { broadcasts: contextBroadcasts, getVisibleBroadcasts } = useAdminData();
  const { getSessionMember, getEffectiveGroups } = useAuth();
  const [broadcasts, setBroadcasts] = React.useState<any[]>(contextBroadcasts || []);
  const [loading, setLoading] = React.useState(!contextBroadcasts || contextBroadcasts.length === 0);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [sortOrder, setSortOrder] = React.useState<'newest' | 'oldest'>('newest');
  const [dateFilter, setDateFilter] = React.useState<string>('');

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
    let list = visibleBroadcasts;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(b =>
        (b.title?.toLowerCase().includes(q)) ||
        (b.description?.toLowerCase().includes(q))
      );
    }

    if (dateFilter) {
      list = list.filter(b => {
        const itemDate = new Date(b.createdAt);
        const y = itemDate.getFullYear();
        const m = String(itemDate.getMonth() + 1).padStart(2, '0');
        const d = String(itemDate.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}` === dateFilter;
      });
    }

    return [...list].sort((a, b) => {
      const timeA = new Date(a.createdAt || 0).getTime();
      const timeB = new Date(b.createdAt || 0).getTime();
      return sortOrder === 'newest' ? timeB - timeA : timeA - timeB;
    });
  }, [visibleBroadcasts, searchQuery, dateFilter, sortOrder]);

  const effectiveLimit = limit !== undefined ? limit : (variant === 'default' ? 2 : undefined);
  const displayedBroadcasts = effectiveLimit ? filteredBroadcasts.slice(0, effectiveLimit) : filteredBroadcasts;

  if (loading) {
    return <div className="w-full flex justify-center p-8"><span className="animate-pulse text-muted-foreground">Loading notes...</span></div>;
  }

  if (!visibleBroadcasts || visibleBroadcasts.length === 0) {
    return (
      <div className="w-full text-center p-8 bg-white/70 backdrop-blur-sm rounded-2xl border border-[#E5D5C5]/60 shadow-sm">
        <div className="w-10 h-10 rounded-xl bg-[#FBE8E8] text-[#8B2323] flex items-center justify-center mx-auto mb-2.5">
          <FileText className="w-5 h-5" />
        </div>
        <h3 className="text-base font-serif font-bold text-[#1A202C] mb-1">No Notes Yet</h3>
        <p className="text-xs text-[#7A6150]">There are no published notes available at this time.</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {variant === 'default' && (
        <div className="mb-3">
          <h2 className="text-2xl font-serif font-bold text-[#1A202C] border-l-4 border-[#8B2323] pl-3 py-0.5 leading-none">
            Note Share
          </h2>
        </div>
      )}

      {/* Search & Date Filter / Sort Toolbar (Dedicated page only) */}
      {variant === 'page' && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7A6150]" />
            <Input
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-white/85 border-[#E5D5C5]/60 rounded-xl h-10 text-xs sm:text-sm text-[#1A202C] placeholder:text-[#7A6150]/60 focus-visible:ring-[#8B2323]/20 shadow-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5 w-full sm:w-auto sm:flex sm:items-center">
            {/* Specific date filter */}
            <div className="relative w-full sm:w-44">
              <div className="flex h-10 w-full items-center justify-between rounded-xl border border-[#E5D5C5]/60 bg-white/85 px-3 py-2 text-xs sm:text-sm text-[#3A2D27] shadow-xs pointer-events-none">
                <div className="flex items-center gap-1.5 min-w-0 pr-1">
                  <Calendar className="w-3.5 h-3.5 text-[#8B2323] shrink-0" />
                  <span className={`truncate ${dateFilter ? 'font-medium text-[#1A202C]' : 'text-[#7A6150]'}`}>
                    {dateFilter ? formatDisplayDate(dateFilter) : 'Filter by date'}
                  </span>
                </div>
                {!dateFilter && <ChevronDown className="h-4 w-4 opacity-60 shrink-0 text-[#7A6150]" />}
              </div>
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-0"
                title="Filter by date"
              />
              {dateFilter && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDateFilter('');
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#7A6150] hover:text-[#8B2323] p-1 z-10 rounded-full hover:bg-[#FBE8E8] transition-colors"
                  title="Clear date filter"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Sort order: Newest / Oldest */}
            <div className="w-full sm:w-40">
              <Select value={sortOrder} onValueChange={(val: 'newest' | 'oldest') => setSortOrder(val)}>
                <SelectTrigger className="w-full bg-white/85 border-[#E5D5C5]/60 rounded-xl h-10 gap-1.5 text-xs sm:text-sm text-[#3A2D27] shadow-xs">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <ArrowUpDown className="w-3.5 h-3.5 text-[#8B2323] shrink-0" />
                    <SelectValue placeholder="Sort by date" />
                  </div>
                </SelectTrigger>
                <SelectContent className="rounded-xl border-[#E5D5C5]/80 bg-[#FAF7F2]">
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      {filteredBroadcasts.length === 0 ? (
        <div className="text-center py-8 text-[#7A6150] text-xs sm:text-sm bg-white/70 backdrop-blur-sm rounded-2xl border border-[#E5D5C5]/60 space-y-2 p-4">
          <p>No notes match your search or date filter.</p>
          {(searchQuery || dateFilter) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setDateFilter('');
              }}
              className="rounded-xl text-xs border-[#E5D5C5]/60 text-[#8B2323] hover:bg-[#FBE8E8]/50"
            >
              Clear filters
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className={`grid grid-cols-1 md:grid-cols-2 ${variant === 'page' ? 'lg:grid-cols-3' : ''} gap-2.5 sm:gap-3.5`}>
            {displayedBroadcasts.map(b => (
              <div
                key={b._id || b.id}
                className="group relative rounded-2xl border border-[#E5D5C5]/70 bg-white/90 backdrop-blur-sm p-3.5 shadow-sm hover:shadow-md hover:border-[#8B2323]/40 transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Meta row: Date + Author */}
                  <div className="flex items-center justify-between gap-2 mb-2 text-[11px]">
                    <div className="flex items-center gap-1.5 text-[#7A6150] font-medium">
                      <div className="w-5 h-5 rounded-md bg-[#FAF7F2] border border-[#E5D5C5]/70 flex items-center justify-center text-[#8B2323] shrink-0">
                        <Calendar className="w-3 h-3" />
                      </div>
                      <span className="truncate">{formatNoteDate(b.createdAt)}</span>
                    </div>
                    {b.createdByName && (
                      <span className="text-[10px] font-medium text-[#7A6150] uppercase tracking-wider bg-[#FAF7F2] px-2 py-0.5 rounded-full border border-[#E5D5C5]/50 truncate max-w-[120px]">
                        {b.createdByName}
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h3 className="font-serif font-bold text-sm sm:text-base text-[#1A202C] leading-snug group-hover:text-[#8B2323] transition-colors line-clamp-1">
                    {b.title}
                  </h3>

                  {/* Description */}
                  {b.description && (
                    <p className="text-xs text-[#3A2D27]/80 line-clamp-2 leading-relaxed mt-1 whitespace-pre-wrap">
                      {b.description}
                    </p>
                  )}
                </div>

                {/* Attachments / Material links */}
                {b.materialLinks && b.materialLinks.length > 0 && (
                  <div className="space-y-1.5 mt-2.5 pt-2 border-t border-[#E5D5C5]/50">
                    {b.materialLinks.map((link: any, idx: number) => (
                      <MaterialLinkRow key={idx} label={link.label} url={link.url} />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {variant === 'default' && (
            <div className="mt-3.5 flex justify-center">
              <Link href="/broadcasts" className="text-[#8B2323] hover:text-[#721515] text-xs sm:text-sm font-semibold flex items-center gap-1 hover:underline transition-colors">
                See all notes <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}
