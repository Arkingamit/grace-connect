"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useAdminData, type Event } from '@/lib/admin-data-context';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar, Clock, MapPin, Users, ArrowRight, Building2, Images, X, Loader2, ExternalLink, Check, ChevronLeft } from 'lucide-react';



export const categoryColors: Record<string, string> = {
  Worship: "bg-primary/10 text-primary",
  Prayer: "bg-prayer/10 text-prayer",
  Youth: "bg-success/10 text-success",
  Study: "bg-accent/10 text-accent-foreground",
  Outreach: "bg-destructive/10 text-destructive",
  Fellowship: "bg-muted text-muted-foreground"
};

export const ticketColors: Record<string, string> = {
  Worship: "bg-primary text-primary-foreground",
  Prayer: "bg-prayer text-prayer-foreground",
  Youth: "bg-success text-success-foreground",
  Study: "bg-accent text-accent-foreground",
  Outreach: "bg-destructive text-destructive-foreground",
  Fellowship: "bg-secondary text-secondary-foreground"
};

const PREF_KEY = 'grace-user-prefs';

// ─── Event Photo Modal ──────────────────────────────────────────────────────
export function EventPhotoModal({ event, onClose }: { event: Event; onClose: () => void }) {
  const [photos, setPhotos] = useState<{ id: number; src: string; title: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<{ src: string; title: string } | null>(null);

  useEffect(() => {
    if (!event.googlePhotosUrl) return;

    const fetch5Photos = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/gallery/photos?url=${encodeURIComponent(event.googlePhotosUrl!)}`);
        const data = await res.json();
        if (data.photos) {
          setPhotos(data.photos.slice(0, 6));
        }
      } catch (err) {
        console.error('Failed to fetch event photos:', err);
      } finally {
        setLoading(false);
      }
    };

    fetch5Photos();
  }, [event.googlePhotosUrl]);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border/50">
          <div>
            <h3 className="font-bold text-lg">{event.title}</h3>
            <p className="text-sm text-muted-foreground">Event Photos</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Photos Grid */}
        <div className="p-5 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-3">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground animate-pulse">Loading photos...</p>
            </div>
          ) : photos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-3">
              <Images className="w-10 h-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No photos could be loaded from this album.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {photos.map((photo) => (
                <div
                  key={photo.id}
                  className="relative aspect-square rounded-xl overflow-hidden cursor-pointer group hover:ring-2 hover:ring-primary transition-all"
                  onClick={() => setSelectedPhoto(photo)}
                >
                  <img
                    src={photo.src}
                    alt={photo.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border/50 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Showing {photos.length} preview photos</p>
          <a href={event.googlePhotosUrl} target="_blank" rel="noopener noreferrer">
            <Button size="sm" className="gap-2">
              View Full Album <ExternalLink className="w-3.5 h-3.5" />
            </Button>
          </a>
        </div>
      </div>

      {/* Lightbox for individual photo */}
      {selectedPhoto && (
        <div className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4" onClick={() => setSelectedPhoto(null)}>
          <div className="relative max-w-4xl max-h-[90vh]">
            <Button
              variant="ghost"
              size="icon"
              className="absolute -top-12 right-0 text-white hover:bg-white/20"
              onClick={() => setSelectedPhoto(null)}
            >
              <X className="w-6 h-6" />
            </Button>
            <img src={selectedPhoto.src} alt={selectedPhoto.title} className="max-w-full max-h-[80vh] object-contain rounded-xl" />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Event RSVP Modal ───────────────────────────────────────────────────────
export function EventRSVPModal({ event, onClose }: { event: Event; onClose: () => void }) {
  const { addEventRegistration, currentUser } = useAdminData();
  const [name, setName] = useState(currentUser?.name || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [responses, setResponses] = useState<Record<string, string | string[]>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleCheckboxChange = (fieldId: string, optLabel: string, checked: boolean) => {
    setErrorMsg('');
    setFieldErrors(prev => ({ ...prev, [fieldId]: '' }));
    setResponses((prev) => {
      const current = (prev[fieldId] as string[]) || [];
      if (checked) {
        return { ...prev, [fieldId]: [...current, optLabel] };
      } else {
        return { ...prev, [fieldId]: current.filter((l) => l !== optLabel) };
      }
    });
  };

  const handleInputChange = (fieldId: string, value: string | string[]) => {
    setErrorMsg('');
    setFieldErrors(prev => ({ ...prev, [fieldId]: '' }));
    setResponses(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setFieldErrors({});

    let hasErrors = false;
    const newErrors: Record<string, string> = {};

    // Custom Validation
    if (event.formFields) {
      for (const field of event.formFields) {
        if (!field.required) continue;
        const answer = responses[field.id];
        if (answer === undefined || answer === '' || (Array.isArray(answer) && answer.length === 0)) {
          newErrors[field.id] = 'This is a required question';
          hasErrors = true;
        }
      }
    }

    if (hasErrors) {
      setFieldErrors(newErrors);
      setErrorMsg(`${Object.keys(newErrors).length} required field(s) need your attention.`);
      setTimeout(() => {
        const firstErrorId = Object.keys(newErrors)[0];
        const el = document.getElementById(`field-container-${firstErrorId}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
      return;
    }

    setSubmitting(true);
    // Simulate network delay
    setTimeout(() => {
      addEventRegistration({
        eventId: event.id,
        userName: name,
        userEmail: email,
        responses,
      });
      setSubmitted(true);
      setSubmitting(false);
    }, 600);
  };

  if (submitted) {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-md text-center py-12">
          <div className="w-16 h-16 bg-success/20 text-success rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8" />
          </div>
          <DialogTitle className="text-2xl mb-2">You're Registered!</DialogTitle>
          <p className="text-muted-foreground mb-6">We've saved your spot for {event.title}. We look forward to seeing you there!</p>
          <Button onClick={onClose} className="w-full">Close</Button>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>RSVP: {event.title}</DialogTitle>
        </DialogHeader>
        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4 bg-muted/30 p-3 rounded-lg">
          <div className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {new Date(event.date).toLocaleDateString()}</div>
          <div className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {event.time}</div>
          <div className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {event.location}</div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 py-2">
          {/* Basic Info */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm border-b pb-2">Your Information</h4>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Full Name <span className="text-destructive">*</span></Label>
                <Input required value={name} onChange={e => setName(e.target.value)} placeholder="John Doe" />
              </div>
              <div className="space-y-2">
                <Label>Email <span className="text-destructive">*</span></Label>
                <Input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="john@example.com" />
              </div>
            </div>
          </div>

          {/* Dynamic Forms */}
          {event.formFields && event.formFields.length > 0 && (
            <div className="space-y-6">
              <h4 className="font-semibold text-sm border-b pb-2">Event Questions</h4>
              {event.formFields.map((field) => {
                const isError = !!fieldErrors[field.id];
                return (
                  <div key={field.id} id={`field-container-${field.id}`} className={`p-4 rounded-xl border ${isError ? 'border-destructive bg-destructive/5' : 'border-border/40 bg-muted/20'} space-y-3`}>
                    <div>
                      <Label className="text-sm font-medium">
                        {field.label} {field.required && <span className="text-destructive">*</span>}
                      </Label>
                      {field.description && <p className="text-xs text-muted-foreground mt-0.5">{field.description}</p>}
                    </div>

                    {field.type === 'text' && (
                      <Input
                        value={(responses[field.id] as string) || ''}
                        onChange={e => handleInputChange(field.id, e.target.value)}
                        placeholder="Your answer"
                        className={isError ? 'border-destructive focus-visible:ring-destructive' : ''}
                      />
                    )}

                    {field.type === 'textarea' && (
                      <Textarea
                        value={(responses[field.id] as string) || ''}
                        onChange={e => handleInputChange(field.id, e.target.value)}
                        placeholder="Your answer"
                        rows={3}
                        className={isError ? 'border-destructive focus-visible:ring-destructive' : ''}
                      />
                    )}

                    {field.type === 'date' && (
                      <Input
                        type="date"
                        value={(responses[field.id] as string) || ''}
                        onChange={e => handleInputChange(field.id, e.target.value)}
                        className={isError ? 'border-destructive focus-visible:ring-destructive' : ''}
                      />
                    )}

                    {field.type === 'time' && (
                      <Input
                        type="time"
                        value={(responses[field.id] as string) || ''}
                        onChange={e => handleInputChange(field.id, e.target.value)}
                        className={isError ? 'border-destructive focus-visible:ring-destructive w-[150px]' : 'w-[150px]'}
                      />
                    )}

                    {field.type === 'number' && (
                      <Input
                        type="number"
                        value={(responses[field.id] as string) || ''}
                        onChange={e => handleInputChange(field.id, e.target.value)}
                        className={isError ? 'border-destructive focus-visible:ring-destructive' : ''}
                        placeholder="0"
                      />
                    )}

                    {field.type === 'email' && (
                      <Input
                        type="email"
                        value={(responses[field.id] as string) || ''}
                        onChange={e => handleInputChange(field.id, e.target.value)}
                        className={isError ? 'border-destructive focus-visible:ring-destructive' : ''}
                        placeholder="email@example.com"
                      />
                    )}

                    {field.type === 'phone' && (
                      <Input
                        type="tel"
                        value={(responses[field.id] as string) || ''}
                        onChange={e => handleInputChange(field.id, e.target.value)}
                        className={isError ? 'border-destructive focus-visible:ring-destructive' : ''}
                        placeholder="+1 (555) 000-0000"
                      />
                    )}

                    {field.type === 'select' && (
                      <Select
                        value={(responses[field.id] as string) || ''}
                        onValueChange={v => handleInputChange(field.id, v)}
                      >
                        <SelectTrigger className={isError ? 'border-destructive focus:ring-destructive' : ''}>
                          <SelectValue placeholder="Select an option" />
                        </SelectTrigger>
                        <SelectContent>
                          {(field.options || []).map(opt => (
                            <SelectItem key={opt.id} value={opt.label}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}

                    {field.type === 'radio' && (
                      <RadioGroup
                        value={(responses[field.id] as string) || ''}
                        onValueChange={v => handleInputChange(field.id, v)}
                        className="space-y-1 mt-2 pl-1"
                      >
                        {(field.options || []).map(opt => (
                          <div key={opt.id} className="flex items-center space-x-2">
                            <RadioGroupItem value={opt.label} id={`${field.id}-${opt.id}`} />
                            <Label htmlFor={`${field.id}-${opt.id}`} className="font-normal cursor-pointer text-foreground">{opt.label}</Label>
                            {opt.label === 'Other' && (responses[field.id] === 'Other' || (responses[field.id] as string)?.startsWith('Other: ')) && (
                              <Input 
                                className="h-7 text-sm ml-2" 
                                placeholder="Please specify..." 
                                value={(responses[field.id] as string).replace('Other: ', '') === 'Other' ? '' : (responses[field.id] as string).replace('Other: ', '')}
                                onChange={(e) => handleInputChange(field.id, `Other: ${e.target.value}`)}
                                autoFocus
                              />
                            )}
                          </div>
                        ))}
                      </RadioGroup>
                    )}

                    {field.type === 'checkbox' && (
                      <div className="space-y-2 mt-2 pl-1">
                        {(field.options || []).map(opt => {
                          const isChecked = ((responses[field.id] as string[]) || []).includes(opt.label);
                          return (
                            <div key={opt.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`${field.id}-${opt.id}`}
                                checked={isChecked}
                                onCheckedChange={(c) => handleCheckboxChange(field.id, opt.label, !!c)}
                              />
                              <Label htmlFor={`${field.id}-${opt.id}`} className="font-normal cursor-pointer text-foreground">{opt.label}</Label>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {field.type === 'linear_scale' && (
                      <div className="pt-2">
                        <RadioGroup
                          value={(responses[field.id] as string) || ''}
                          onValueChange={v => handleInputChange(field.id, v)}
                          className="flex items-start justify-between w-full"
                        >
                          {Array.from({ length: (field.scaleMax || 5) - (field.scaleMin || 1) + 1 }).map((_, i) => {
                            const numVal = (field.scaleMin || 1) + i;
                            const val = String(numVal);
                            const isFirst = i === 0;
                            const isLast = i === ((field.scaleMax || 5) - (field.scaleMin || 1));
                            
                            // Get custom label for this specific step, falling back to min/max labels for legacy data
                            const stepLabel = field.scaleLabels?.[numVal] || (isFirst ? field.scaleMinLabel : isLast ? field.scaleMaxLabel : null);

                            return (
                              <div key={val} className="flex flex-col items-center gap-2 flex-1 px-1">
                                <span className="text-xs font-medium">{val}</span>
                                <RadioGroupItem value={val} id={`${field.id}-${val}`} />
                                {stepLabel && (
                                  <span className="text-[10px] text-muted-foreground text-center leading-tight mt-1 break-words w-full">
                                    {stepLabel}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </RadioGroup>
                      </div>
                    )}

                    {isError && (
                      <div className="flex items-center gap-1.5 text-xs text-destructive mt-2 font-medium">
                        <X className="w-3.5 h-3.5" />
                        {fieldErrors[field.id]}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {errorMsg && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
              {errorMsg}
            </div>
          )}

          <Button type="submit" className="w-full bg-primary" disabled={submitting}>
            {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            {submitting ? 'Registering...' : 'Confirm RSVP'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export const formatTime = (time: string) => {
  if (!time) return '';
  const [h, m] = time.split(':');
  const hour = parseInt(h);
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
};

export const getAvailabilityStatus = (registered: number, capacity: number) => {
  if (registered === 0) return { text: 'Open Registration', color: 'text-success' };
  const pct = (registered / capacity) * 100;
  if (pct >= 100) return { text: 'Full', color: 'text-destructive' };
  if (pct >= 90) return { text: 'Almost Full', color: 'text-accent' };
  if (pct >= 75) return { text: 'Filling Up', color: 'text-accent' };
  return { text: 'Available', color: 'text-success' };
};

// ─── Events Section ─────────────────────────────────────────────────────────


export function EventsSection({ variant = 'widget' }: { variant?: 'page' | 'widget' }) {
  if (variant === 'page') return <EventsPageLayout />;
  return <EventsWidgetLayout />;
}

function EventsWidgetLayout() {
  const { campuses, groups, getVisibleEvents } = useAdminData();
  const { getSessionMember, getEffectiveGroups } = useAuth();
  const [selectedCampus, setSelectedCampus] = useState('all');
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [albumEvent, setAlbumEvent] = useState<Event | null>(null);
  const [rsvpEvent, setRsvpEvent] = useState<Event | null>(null);

  // Load preferences
  useEffect(() => {
    try {
      const stored = localStorage.getItem(PREF_KEY);
      if (stored) {
        const prefs = JSON.parse(stored);
        if (prefs.campus) setSelectedCampus(prefs.campus);
        if (prefs.group) setSelectedGroup(prefs.group);
      }
    } catch { /* ignore */ }
  }, []);

  // Persist
  useEffect(() => {
    localStorage.setItem(PREF_KEY, JSON.stringify({ campus: selectedCampus, group: selectedGroup }));
  }, [selectedCampus, selectedGroup]);

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

  const visibleEvents = getVisibleEvents(
    selectedCampus === 'all' ? 'all' : selectedCampus,
    userGroups as string[]
  );

  return (
    <section id="events" className="py-10 sm:py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center space-y-5 mb-10">
            <span className="section-heading">Events</span>
            <h2 className="section-title">Upcoming Events</h2>
            <p className="section-subtitle">
              Join us for worship, fellowship, and community outreach
            </p>
          </div>

          {/* Campus & Group Selector */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
            <div className="flex items-center gap-2 w-full sm:w-auto justify-center sm:justify-start">
              <Building2 className="w-4 h-4 text-primary shrink-0" />
              <Select value={selectedCampus} onValueChange={setSelectedCampus}>
                <SelectTrigger className="w-full sm:w-[180px] h-9 text-sm">
                  <SelectValue placeholder="Select Campus" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Campuses</SelectItem>
                  {campuses.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto justify-center sm:justify-start">
              <Users className="w-4 h-4 text-primary shrink-0" />
              <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                <SelectTrigger className="w-full sm:w-[180px] h-9 text-sm">
                  <SelectValue placeholder="Select Group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Groups</SelectItem>
                  {groups.map(g => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Events Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {visibleEvents.map((event) => {
              const availability = getAvailabilityStatus(event.registered, event.capacity);
              const isPast = new Date(event.date) < new Date(new Date().setHours(0,0,0,0));

              return (
                <div key={event.id} className="relative bg-card shadow-sm rounded-[2rem] overflow-hidden hover:shadow-md transition-all duration-300 group border border-border/50 p-5 flex flex-col gap-4">
                  <div className="flex gap-4">
                    {/* Date Bubble */}
                    <div className={`w-16 h-16 shrink-0 rounded-2xl flex flex-col items-center justify-center border ${isPast ? 'bg-muted border-border/50 opacity-50 grayscale' : 'bg-[#FFF5F5] border-red-50/50'}`}>
                      <span className={`text-xl font-bold leading-none ${isPast ? 'text-muted-foreground' : 'text-[#8B2323]'}`}>
                        {new Date(event.date).getDate()}
                      </span>
                      <span className={`text-xs font-bold mt-1 ${isPast ? 'text-muted-foreground' : 'text-[#8B2323]'}`}>
                        {new Date(event.date).toLocaleDateString('en-US', { month: 'short' })}
                      </span>
                    </div>
                    
                    {/* Title & Badges */}
                    <div className="flex-1 flex flex-col justify-center">
                      <h3 className={`text-lg font-bold leading-tight line-clamp-2 mb-1 ${isPast ? 'text-muted-foreground' : 'text-[#1A202C] group-hover:text-primary transition-colors'}`}>
                        {event.title}
                      </h3>
                      <div className="flex flex-wrap gap-1">
                        <Badge variant="outline" className={`${categoryColors[event.category] || ''} border-current opacity-90 text-[10px] px-2 py-0`}>
                          {event.category}
                        </Badge>
                        {event.recurring && <Badge variant="outline" className="text-[10px] px-2 py-0 border-border">Recurring</Badge>}
                        {isPast && <Badge variant="secondary" className="text-[10px] px-2 py-0">Ended</Badge>}
                      </div>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-start gap-2">
                      <Clock className="w-4 h-4 shrink-0 mt-0.5 text-primary/70" />
                      <span>{formatTime(event.time)}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-primary/70" />
                      <span className="line-clamp-1">{event.location}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Users className="w-4 h-4 shrink-0 mt-0.5 text-primary/70" />
                      <span>
                        {event.capacity === 0 
                          ? (event.registered > 0 ? `${event.registered} registered (Unlimited)` : "Unlimited spots")
                          : (event.capacity - event.registered > 0 
                              ? `${event.capacity - event.registered} spots remaining (out of ${event.capacity})` 
                              : "Event full")
                        }
                      </span>
                    </div>
                  </div>

                  {/* Status & Actions */}
                  <div className="mt-auto pt-4 flex items-center justify-between border-t border-border/40">
                    <span className={`text-xs font-medium ${isPast ? 'text-muted-foreground' : availability.color}`}>
                      {isPast ? 'Event Ended' : availability.text}
                    </span>
                    
                    <div className="flex items-center gap-2">
                      {event.googlePhotosUrl && (
                        <Button variant="outline" size="icon" className="h-9 w-9 text-primary hover:bg-primary/10 rounded-xl" onClick={() => setAlbumEvent(event)} title="View Event Photos">
                          <Images className="w-4 h-4" />
                        </Button>
                      )}
                      <Button 
                        disabled={isPast || event.registered >= event.capacity}
                        onClick={() => setRsvpEvent(event)}
                        className="h-9 text-xs rounded-xl px-4"
                      >
                        {isPast ? 'Ended' : event.registered >= event.capacity ? 'Full' : 'RSVP'}
                        {!isPast && event.registered < event.capacity && <ArrowRight className="w-3.5 h-3.5 ml-1.5" />}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {visibleEvents.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No events for your selection.</p>
              <p className="text-sm text-muted-foreground mt-1">Try selecting a different campus or group.</p>
            </div>
          )}

          {/* View All */}
          <div className="text-center mt-12">
            <Link href="/events">
              <Button variant="outline" size="lg" className="gap-2">
                View Full Calendar
                <Calendar className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Photo Album Modal */}
      {albumEvent && (
        <EventPhotoModal event={albumEvent} onClose={() => setAlbumEvent(null)} />
      )}

      {/* RSVP Modal */}
      {rsvpEvent && (
        <EventRSVPModal event={rsvpEvent} onClose={() => setRsvpEvent(null)} />
      )}
    </section>
  );
};

function EventsPageLayout() {
  const { events, eventRegistrations, currentUser, getVisibleEvents } = useAdminData();
  const { getSessionMember, getEffectiveGroups } = useAuth();
  const [albumEvent, setAlbumEvent] = useState<Event | null>(null);
  const [rsvpEvent, setRsvpEvent] = useState<Event | null>(null);
  const [activeTab, setActiveTab] = useState("upcoming");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const myRegistrations = useMemo(() => {
    if (!currentUser) return [];
    const registeredEventIds = eventRegistrations
      .filter(reg => reg.userEmail === currentUser.email)
      .map(reg => reg.eventId);
    // Remove duplicates if same user registered multiple times
    const uniqueIds = Array.from(new Set(registeredEventIds));
    return events.filter(e => uniqueIds.includes(e.id));
  }, [events, eventRegistrations, currentUser]);

  const visibleEvents = useMemo(() => {
    const sessionMember = getSessionMember();
    if (!sessionMember) {
      // If not logged in, only see "all" campus / "all" groups events (or maybe guest-allowed)
      // We'll treat guest as having 'global' campus and no special groups
      return getVisibleEvents('global', []);
    }
    const effectiveGroups = getEffectiveGroups(sessionMember);
    const isAdminOrLeader = sessionMember.role === 'admin' || sessionMember.role === 'super_admin' || sessionMember.role === 'campus_leader';
    const userGroups = isAdminOrLeader ? ['all'] : Array.from(new Set([...effectiveGroups, 'all']));
    
    return getVisibleEvents(sessionMember.campusId || 'all', userGroups, sessionMember.role);
  }, [getSessionMember, getEffectiveGroups, getVisibleEvents]);

  const upcomingEvents = useMemo(() => {
    return visibleEvents.filter(e => new Date(e.date) >= today)
                 .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [visibleEvents]);

  const pastEvents = useMemo(() => {
    return visibleEvents.filter(e => new Date(e.date) < today)
                 .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [visibleEvents]);

  const renderEventGrid = (eventList: Event[]) => {
    if (eventList.length === 0) {
      return (
        <div className="text-center py-20 glass-card rounded-3xl border-0">
          <Calendar className="w-16 h-16 text-primary/20 mx-auto mb-4" />
          <h3 className="text-2xl font-bold mb-2 italic">Nothing here yet</h3>
          <p className="text-muted-foreground">No events found in this category.</p>
        </div>
      );
    }

    return (
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {eventList.map((event) => {
          const availability = getAvailabilityStatus(event.registered, event.capacity);
          const isPast = new Date(event.date) < today;

          return (
            <div key={event.id} className="relative bg-card shadow-sm rounded-[2rem] overflow-hidden hover:shadow-md transition-all duration-300 group border border-border/50 p-5 flex flex-col gap-4">
              <div className="flex gap-4">
                {/* Date Bubble */}
                <div className={`w-16 h-16 shrink-0 rounded-2xl flex flex-col items-center justify-center border ${isPast ? 'bg-muted border-border/50 opacity-50 grayscale' : 'bg-[#FFF5F5] border-red-50/50'}`}>
                  <span className={`text-xl font-bold leading-none ${isPast ? 'text-muted-foreground' : 'text-[#8B2323]'}`}>
                    {new Date(event.date).getDate()}
                  </span>
                  <span className={`text-xs font-bold mt-1 ${isPast ? 'text-muted-foreground' : 'text-[#8B2323]'}`}>
                    {new Date(event.date).toLocaleDateString('en-US', { month: 'short' })}
                  </span>
                </div>
                
                {/* Title & Badges */}
                <div className="flex-1 flex flex-col justify-center">
                  <h3 className={`text-lg font-bold leading-tight line-clamp-2 mb-1 ${isPast ? 'text-muted-foreground' : 'text-[#1A202C] group-hover:text-primary transition-colors'}`}>
                    {event.title}
                  </h3>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="outline" className={`${categoryColors[event.category] || ''} border-current opacity-90 text-[10px] px-2 py-0`}>
                      {event.category}
                    </Badge>
                    {event.recurring && <Badge variant="outline" className="text-[10px] px-2 py-0 border-border">Recurring</Badge>}
                    {isPast && <Badge variant="secondary" className="text-[10px] px-2 py-0">Ended</Badge>}
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-start gap-2">
                  <Clock className="w-4 h-4 shrink-0 mt-0.5 text-primary/70" />
                  <span>{formatTime(event.time)}</span>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-primary/70" />
                  <span className="line-clamp-1">{event.location}</span>
                </div>
                <div className="flex items-start gap-2">
                  <Users className="w-4 h-4 shrink-0 mt-0.5 text-primary/70" />
                  <span>
                    {event.capacity === 0 
                      ? (event.registered > 0 ? `${event.registered} registered (Unlimited)` : "Unlimited spots")
                      : (event.capacity - event.registered > 0 
                          ? `${event.capacity - event.registered} spots remaining (out of ${event.capacity})` 
                          : "Event full")
                    }
                  </span>
                </div>
              </div>

              {/* Status & Actions */}
              <div className="mt-auto pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border/40">
                <span className={`text-xs font-medium self-start sm:self-auto ${isPast ? 'text-muted-foreground' : availability.color}`}>
                  {isPast ? 'Event Ended' : availability.text}
                </span>
                
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  {event.googlePhotosUrl && (
                    <Button variant="outline" size="icon" className="h-10 w-10 shrink-0 text-primary hover:bg-primary/10 rounded-xl" onClick={() => setAlbumEvent(event)} title="View Event Photos">
                      <Images className="w-4 h-4" />
                    </Button>
                  )}
                  <Button 
                    disabled={isPast || event.registered >= event.capacity}
                    onClick={() => setRsvpEvent(event)}
                    className="h-10 w-full sm:w-auto text-sm font-semibold rounded-xl px-6"
                  >
                    {isPast ? 'Ended' : event.registered >= event.capacity ? 'Full' : 'RSVP'}
                    {!isPast && event.registered < event.capacity && <ArrowRight className="w-4 h-4 ml-2" />}
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="w-full pb-12">
      <main className="flex-1">
        <div className="container mx-auto px-4 md:px-0">
          <div className="max-w-6xl mx-auto space-y-8">
            {/* Header */}
            <div>
              <Link href="/#events">
                <Button variant="ghost" size="sm" className="mb-6 -ml-3 gap-2 text-muted-foreground hover:text-foreground">
                  <ChevronLeft className="w-4 h-4" /> Back to Home
                </Button>
              </Link>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 border-l-4 border-[#8B2323] pl-3 py-0.5 leading-none md:border-l-0 md:pl-0">Grace Calendar</h1>
              <p className="text-xl text-muted-foreground">
                Stay connected with our community events, services, and gatherings.
              </p>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="flex w-full overflow-x-auto no-scrollbar justify-start md:grid md:grid-cols-3 md:max-w-md mb-6 md:mb-8 bg-card/50 p-1 border border-border/50">
                <TabsTrigger className="shrink-0 rounded-lg px-4 py-2" value="upcoming">Upcoming Events</TabsTrigger>
                <TabsTrigger className="shrink-0 rounded-lg px-4 py-2" value="registered">Registered Events</TabsTrigger>
                <TabsTrigger className="shrink-0 rounded-lg px-4 py-2" value="past">Past Events</TabsTrigger>
              </TabsList>

              <TabsContent value="upcoming" className="space-y-6">
                {renderEventGrid(upcomingEvents)}
              </TabsContent>

              <TabsContent value="registered" className="space-y-6">
                {!currentUser ? (
                  <div className="text-center py-20 glass-card rounded-3xl border-0">
                    <Users className="w-16 h-16 text-primary/20 mx-auto mb-4" />
                    <h3 className="text-2xl font-bold mb-2 italic">Sign In Required</h3>
                    <p className="text-muted-foreground">Please sign in to view your event registrations.</p>
                  </div>
                ) : (
                  renderEventGrid(myRegistrations)
                )}
              </TabsContent>

              <TabsContent value="past" className="space-y-6">
                {renderEventGrid(pastEvents)}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>

      {/* Photo Album Modal */}
      {albumEvent && (
        <EventPhotoModal event={albumEvent} onClose={() => setAlbumEvent(null)} />
      )}

      {/* RSVP Modal */}
      {rsvpEvent && (
        <EventRSVPModal event={rsvpEvent} onClose={() => setRsvpEvent(null)} />
      )}
    </div>
  );
}
