"use client";

import React, { useState } from 'react';
import { useAdminData } from '@/lib/admin-data-context';
import { useAuth } from '@/lib/auth-context';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Calendar, Pin, Building2, Users, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import { formatDDMMYYYY } from '@/lib/date-utils';

export const AnnouncementsSection = ({ preview = false }: { preview?: boolean }) => {
  const { announcements, campuses, groups, getVisibleAnnouncements } = useAdminData();
  const { getSessionMember, getEffectiveGroups } = useAuth();
  
  const [selectedCampus] = useState('all');
  const [selectedGroup] = useState('all');
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    setExpandedCards(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Merge family member's groups into visibility filter
  const sessionMember = getSessionMember();
  const effectiveGroups = sessionMember ? getEffectiveGroups(sessionMember) : [];

  const isAdminOrLeader = sessionMember?.role === 'admin' || sessionMember?.role === 'super_admin' || sessionMember?.role === 'campus_leader';
  const allowedGroups = isAdminOrLeader 
    ? groups 
    : Array.from(new Set([...effectiveGroups, 'all']));

  const userGroups = selectedGroup === 'all' 
    ? allowedGroups 
    : (allowedGroups.includes(selectedGroup) || isAdminOrLeader ? [selectedGroup] : []);

  const campusForFilter = selectedCampus === 'all' ? 'all' : selectedCampus;

  const visibleAnnouncements = getVisibleAnnouncements(campusForFilter, userGroups as string[]);

  return (
    <section id="announcements" className={preview ? "w-full" : "py-6 sm:py-12"}>
      <div className={preview ? "w-full px-4 sm:px-0" : "container mx-auto px-4"}>
        <div className="max-w-4xl mx-auto">
          {/* Announcements List */}
          <div className="space-y-3">
            {visibleAnnouncements.length === 0 && (
              <div className="text-center py-8 bg-white/70 backdrop-blur-sm rounded-2xl border border-[#E5D5C5]/60 p-4">
                <p className="text-sm font-medium text-[#7A6150]">No announcements for your selection.</p>
                <p className="text-xs text-[#7A6150]/80 mt-1">Try selecting a different campus or group.</p>
              </div>
            )}
            {(preview ? visibleAnnouncements.slice(0, 3) : visibleAnnouncements).map((announcement) => {
              const isExpanded = !!expandedCards[announcement.id];
              const isLongContent = Boolean(
                announcement.content && (announcement.content.length > 80 || announcement.content.includes('\n'))
              );

              return (
                <div
                  key={announcement.id}
                  className="group relative rounded-2xl border border-[#E5D5C5]/70 bg-white/90 backdrop-blur-sm p-3.5 sm:p-4 shadow-sm hover:shadow-md hover:border-[#8B2323]/40 transition-all"
                >
                  {/* Header Row: Pinned & Badges + Date */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                      {announcement.isPinned && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#8B2323] bg-[#FBE8E8] px-2 py-0.5 rounded-full border border-[#E5C5C5]/60">
                          <Pin className="w-2.5 h-2.5 fill-current" />
                          Pinned
                        </span>
                      )}

                      {!announcement.targetCampuses?.includes('all') && (
                        <Badge variant="outline" className="text-[9px] gap-1 px-1.5 py-0 bg-[#F3EAE1] text-[#7A6150] border-[#E5D5C5]">
                          <Building2 className="w-2.5 h-2.5" />
                          {announcement.targetCampuses?.map(id => campuses.find(c => c.id === id)?.name || id).join(', ')}
                        </Badge>
                      )}
                      {!announcement.targetGroups?.includes('all') && (
                        <Badge variant="outline" className="text-[9px] gap-1 px-1.5 py-0 bg-[#F3EAE1] text-[#7A6150] border-[#E5D5C5]">
                          <Users className="w-2.5 h-2.5" />
                          {announcement.targetGroups?.join(', ')}
                        </Badge>
                      )}
                    </div>

                    {(announcement.reminderDate || announcement.createdAt) && (
                      <div className="flex items-center gap-1 text-[11px] font-medium text-[#7A6150] shrink-0">
                        <Calendar className="w-3 h-3 text-[#8B2323]" />
                        <span>
                          {announcement.reminderDate
                            ? `${formatDDMMYYYY(announcement.reminderDate)}${announcement.reminderTime ? ` at ${announcement.reminderTime}` : ''}`
                            : formatDDMMYYYY(announcement.createdAt)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Title */}
                  <h3 className="font-serif font-bold text-sm sm:text-base text-[#1A202C] leading-snug group-hover:text-[#8B2323] transition-colors mb-1.5">
                    {announcement.title}
                  </h3>

                  {/* Content */}
                  {announcement.content && (
                    <div>
                      <p className={`text-xs sm:text-sm text-[#3A2D27]/85 leading-relaxed whitespace-pre-wrap transition-all ${isExpanded ? '' : 'line-clamp-2'}`}>
                        {announcement.content}
                      </p>

                      {isLongContent && (
                        <div className="flex items-center justify-end mt-2 pt-1 border-t border-[#E5D5C5]/40">
                          <button
                            type="button"
                            onClick={(e) => toggleExpand(announcement.id, e)}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#8B2323] hover:text-[#6E1A1A] hover:bg-[#FBE8E8]/70 px-2.5 py-1 rounded-full border border-[#E5D5C5]/70 transition-all active:scale-95"
                          >
                            {isExpanded ? (
                              <>
                                Read Less <ChevronUp className="w-3 h-3" />
                              </>
                            ) : (
                              <>
                                Read More <ChevronDown className="w-3 h-3" />
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {preview && visibleAnnouncements.length > 3 && (
              <div className="mt-3 flex justify-center">
                <Link href="/announcements" className="text-[#8B2323] text-xs sm:text-sm font-bold flex items-center hover:underline">
                  See all <ChevronRight className="w-4 h-4 ml-1" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};