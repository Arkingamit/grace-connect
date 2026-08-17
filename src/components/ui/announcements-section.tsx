"use client";

import React, { useState } from 'react';
import { useAdminData } from '@/lib/admin-data-context';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Calendar, Pin, Building2, Users, ChevronRight } from 'lucide-react';

const categoryColors: Record<string, string> = {
  Worship: "bg-primary/10 text-primary",
  Membership: "bg-accent/10 text-accent-foreground",
  Youth: "bg-success/10 text-success",
  Outreach: "bg-prayer/10 text-prayer",
  Urgent: "bg-destructive/10 text-destructive"
};

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

  // For the dropdown filter: only filter if they select a specific group/campus
  // and we pass allowedGroups to getVisibleAnnouncements to enforce security at the data level
  const userGroups = selectedGroup === 'all' 
    ? allowedGroups 
    : (allowedGroups.includes(selectedGroup) || isAdminOrLeader ? [selectedGroup] : []);

  const campusForFilter = selectedCampus === 'all' ? 'all' : selectedCampus;

  const visibleAnnouncements = getVisibleAnnouncements(campusForFilter, userGroups as string[]);

  return (
    <section id="announcements" className="py-10 sm:py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          {/* Section Header removed as per request */}

          {/* Announcements List */}
          <div className="space-y-4">
            {visibleAnnouncements.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No announcements for your selection.</p>
                <p className="text-sm text-muted-foreground mt-1">Try selecting a different campus or group.</p>
              </div>
            )}
            {(preview ? visibleAnnouncements.slice(0, 3) : visibleAnnouncements).map((announcement) => (
              <Card key={announcement.id} className="overflow-hidden hover:shadow-elevated transition-all duration-300 border-[#E5D5C5]/60 shadow-sm rounded-3xl">
                <CardHeader className="pb-3 pt-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-1.5">
                      <div className="flex items-center gap-2">
                        {announcement.isPinned && (
                          <Pin className="w-3.5 h-3.5 text-[#8B2323] fill-current" />
                        )}

                        {/* Show targeting info */}
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
                      <h3 className="text-xl font-bold leading-tight text-[#1A202C]">
                        {announcement.title}
                      </h3>
                      {announcement.reminderDate && announcement.reminderTime && (
                        <div className="flex items-center gap-1 text-xs font-semibold text-blue-500">
                          <Calendar className="w-3 h-3" />
                          <span>Scheduled for {announcement.reminderDate} at {announcement.reminderTime}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0 pb-5">
                  <p className={`text-[#7A6150] text-sm leading-relaxed mb-4 whitespace-pre-wrap ${expandedCards[announcement.id] ? '' : 'line-clamp-3'}`}>
                    {announcement.content}
                  </p>
                  
                  <div className="flex items-center justify-end">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={(e) => toggleExpand(announcement.id, e)}
                      className="text-xs font-bold h-8 rounded-full border-[#E5D5C5] text-[#7A6150] hover:text-[#8B2323] hover:bg-[#FBE8E8]"
                    >
                      {expandedCards[announcement.id] ? 'Read Less' : 'Read More'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {preview && visibleAnnouncements.length > 3 && (
              <div className="mt-4 flex justify-center">
                <Link href="/announcements" className="text-[#8B2323] text-sm font-bold flex items-center hover:underline">
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