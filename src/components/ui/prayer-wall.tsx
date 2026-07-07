"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Heart, MessageCircle, Plus, Shield, Clock, Users, Loader2, Building2, User, Send, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import { useAdminData } from "@/lib/admin-data-context";
import { motion, AnimatePresence } from "framer-motion";

interface PrayerRequest {
  id: string;
  title: string;
  content: string;
  authorName: string;
  isAnonymous: boolean;
  privacy: string;
  category: string;
  prayedCount: number;
  comments: number;
  createdAt: string;
  status?: string;
  prayedBy?: string[];
}

const categoryColors = {
  Health: "bg-success/10 text-success",
  Career: "bg-accent/10 text-accent-foreground",
  Relationships: "bg-prayer/10 text-prayer",
  Church: "bg-primary/10 text-primary",
  Family: "bg-muted text-muted-foreground",
  General: "bg-gray-100 text-gray-800"
};

export function PrayerWall({ variant = 'widget' }: { variant?: 'page' | 'widget' }) {
  if (variant === 'page') {
    return <PrayerWallPageLayout />;
  }
  return <PrayerWallWidgetLayout />;
}

// --- WIDGET LAYOUT (Original Component UI) ---
function PrayerWallWidgetLayout() {
  const [prayers, setPrayers] = useState<PrayerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [newRequest, setNewRequest] = useState({
    title: '',
    content: '',
    campusId: ''
  });

  const { getSessionMember } = useAuth();
  const sessionMember = getSessionMember();
  const [campuses, setCampuses] = useState<{id: string, name: string}[]>([]);

  useEffect(() => {
    fetch('/api/campuses')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setCampuses(data.map(c => ({ id: c._id || c.id, name: c.name })));
      })
      .catch(console.error);
  }, []);

  const fetchPrayers = async () => {
    try {
      const res = await fetch('/api/prayers');
      if (res.ok) {
        const data = await res.json();
        setPrayers(data);
      }
    } catch (error) {
      console.error('Failed to fetch prayers', error);
      toast.error('Failed to load prayer requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrayers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionMember && !newRequest.campusId) {
      toast.error('Please select a campus');
      return;
    }
    setSubmitting(true);
    try {
      const payload = { ...newRequest };
      if (sessionMember) {
        payload.campusId = sessionMember.campusId;
      }
      const res = await fetch('/api/prayers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        toast.success('Prayer request submitted! It will appear once approved by your campus leader.');
        setShowForm(false);
        setNewRequest({ title: '', content: '', campusId: '' });
        fetchPrayers();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to submit prayer request');
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePray = async (id: string) => {
    try {
      const res = await fetch(`/api/prayers/${id}/pray`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setPrayers(prev => prev.map(p => p.id === id ? { 
          ...p, 
          prayedCount: data.prayedCount, 
          prayedBy: [...(p.prayedBy || []), sessionMember?._id || sessionMember?.id || ''] 
        } : p));
        if (data.alreadyPrayed) {
          toast.info('You already prayed for this');
        } else {
          toast.success('You prayed for this request');
        }
      } else {
        const data = await res.json();
        toast.error(data.error || 'You already prayed for this');
      }
    } catch (error) {
      toast.error('Failed to record prayer');
    }
  };

  return (
    <section id="prayers" className="py-10 sm:py-16">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center space-y-5 mb-12">
            <span className="section-heading">Community</span>
            <h2 className="section-title">Prayer Wall</h2>
            <p className="section-subtitle">
              Share your prayer requests and pray for others in our community
            </p>
          </div>

          <div className="text-center mb-8">
            <Button
              onClick={() => setShowForm(!showForm)}
              className="bg-gradient-to-r from-prayer to-prayer/80 hover:opacity-90"
              size="lg"
            >
              <Plus className="w-4 h-4 mr-2" />
              Share Prayer Request
            </Button>
          </div>

          {showForm && (
            <Card className="mb-8 border-prayer/20 animate-in fade-in slide-in-from-top-4">
              <CardHeader>
                <h3 className="text-lg font-semibold">Share Your Prayer Request</h3>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Input
                      placeholder="Prayer request title"
                      value={newRequest.title}
                      onChange={(e) => setNewRequest(prev => ({ ...prev, title: e.target.value }))}
                      required
                      minLength={3}
                    />
                  </div>
                  <div>
                    <Textarea
                      placeholder="Share your prayer request..."
                      rows={4}
                      value={newRequest.content}
                      onChange={(e) => setNewRequest(prev => ({ ...prev, content: e.target.value }))}
                      required
                      minLength={10}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {!sessionMember && (
                      <div className="sm:col-span-2">
                        <select
                          value={newRequest.campusId}
                          onChange={(e) => setNewRequest(prev => ({ ...prev, campusId: e.target.value }))}
                          className="w-full text-sm border rounded px-3 py-2 bg-transparent"
                          required
                        >
                          <option value="">Select your Campus *</option>
                          {campuses.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                        <p className="text-xs text-muted-foreground mt-1">
                          <Building2 className="w-3 h-3 inline mr-1" />
                          Required so we can route your request to the correct campus leader for approval.
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button type="submit" disabled={submitting}>
                      {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Submit Prayer Request
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <div className="flex flex-wrap gap-2 justify-center mb-8">
            <Button variant="default" size="sm">All Prayers</Button>
            <Button variant="outline" size="sm">Recent</Button>
            <Button variant="outline" size="sm">Most Prayed</Button>
            <Button variant="outline" size="sm">Health</Button>
            <Button variant="outline" size="sm">Family</Button>
            <Button variant="outline" size="sm">Career</Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-prayer" />
            </div>
          ) : prayers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No prayer requests found. Be the first to share one!
            </div>
          ) : (
            <div className="space-y-6">
              {prayers.map((request) => {
                const hasPrayed = request.prayedBy && sessionMember && request.prayedBy.includes(sessionMember.id || sessionMember._id || '');
                return (
                <Card key={request.id} className="hover:shadow-elevated transition-all duration-300">
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge className={`${categoryColors[request.category as keyof typeof categoryColors] || categoryColors.General} text-xs`}>
                            {request.category || 'General'}
                          </Badge>
                          {request.privacy !== 'public' && (
                            <Badge variant="outline" className="text-xs gap-1">
                              <Shield className="w-3 h-3" />
                              {request.privacy === 'members' ? 'Members' : 'Staff Only'}
                            </Badge>
                          )}
                        </div>
                        <h3 className="text-lg font-semibold">{request.title}</h3>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>By {request.authorName || 'Anonymous'}</span>
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{new Date(request.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-muted-foreground leading-relaxed mb-4 whitespace-pre-wrap">
                      {request.content}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Button variant="ghost" size="sm" className="gap-2 cursor-default">
                          <MessageCircle className="w-4 h-4" />
                          <span>{request.comments} comments</span>
                        </Button>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={hasPrayed}
                        className={`gap-2 transition-colors ${
                          hasPrayed
                          ? 'bg-[#FBE8E8] text-[#8B2323] border-[#8B2323]/20'
                          : 'bg-prayer/5 border-prayer/20 hover:bg-prayer/10'
                        }`}
                        onClick={() => handlePray(request.id)}
                      >
                        <Heart className={`w-4 h-4 ${hasPrayed ? 'fill-current' : ''}`} />
                        {hasPrayed ? 'Prayed' : 'I Prayed'} • {request.prayedCount}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// --- PAGE LAYOUT (Original Page UI) ---
function PrayerWallPageLayout() {
  const { session } = useAuth();
  
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [publicPrayers, setPublicPrayers] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/prayers')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setPublicPrayers(data);
      })
      .catch(console.error);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/prayers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          content,
          authorId: session?.memberId,
          authorName: session?.name,
        }),
      });

      if (res.ok) {
        setSubmitted(true);
        setTitle("");
        setContent("");
        fetch('/api/prayers')
          .then(res => res.json())
          .then(data => {
            if (Array.isArray(data)) setPublicPrayers(data);
          })
          .catch(console.error);
      }
    } catch (err) {
      console.error("Failed to submit prayer", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="py-8 md:py-12">
      <div className="text-center mb-10">
        <h1 className="text-4xl md:text-5xl font-serif font-bold text-[#1A202C] mb-4">Prayer Wall</h1>
        <p className="text-[#7A6150] max-w-2xl mx-auto text-lg">
          Bear one another's burdens, and so fulfill the law of Christ. Share your prayer requests, and let our community pray with you.
        </p>
      </div>

      <div className="grid md:grid-cols-5 gap-8">
        {/* Submit Prayer Form */}
        <div className="md:col-span-2">
          <div className="sticky top-24">
            <Card className="p-6 border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white/60 backdrop-blur-sm rounded-3xl">
              <h2 className="text-xl font-bold text-[#1A202C] mb-4">Submit a Request</h2>
              
              <AnimatePresence mode="wait">
                {submitted ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center justify-center text-center py-8"
                  >
                    <div className="w-16 h-16 bg-[#ECFDF5] rounded-full flex items-center justify-center mb-4">
                      <CheckCircle2 className="w-8 h-8 text-[#10B981]" />
                    </div>
                    <h3 className="font-bold text-lg mb-2">Prayer Shared</h3>
                    <p className="text-sm text-[#7A6150] mb-6">Your prayer request has been submitted to the community.</p>
                    <Button variant="outline" onClick={() => setSubmitted(false)}>
                      Submit Another
                    </Button>
                  </motion.div>
                ) : (
                  <motion.form 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onSubmit={handleSubmit} 
                    className="space-y-4"
                  >
                    <div>
                      <input
                        type="text"
                        className="w-full bg-[#FAF7F2] border border-[#E5D5C5] rounded-2xl p-4 text-[#3A2D27] placeholder:text-[#a59d94] focus:outline-none focus:ring-2 focus:ring-[#8B2323]/20 mb-4"
                        placeholder="Prayer request title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                      />
                      <textarea 
                        className="w-full bg-[#FAF7F2] border border-[#E5D5C5] rounded-2xl p-4 text-[#3A2D27] placeholder:text-[#a59d94] focus:outline-none focus:ring-2 focus:ring-[#8B2323]/20 resize-none"
                        rows={5}
                        placeholder="How can we pray for you?"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        required
                      />
                    </div>

                    <Button 
                      type="submit" 
                      disabled={isSubmitting || !content.trim()}
                      className="w-full bg-[#8B2323] hover:bg-[#6b1b1b] text-white rounded-xl py-6 font-semibold"
                    >
                      {isSubmitting ? "Submitting..." : (
                        <span className="flex items-center gap-2">
                          Share Prayer <Send className="w-4 h-4" />
                        </span>
                      )}
                    </Button>
                  </motion.form>
                )}
              </AnimatePresence>
            </Card>
          </div>
        </div>

        {/* Community Prayers Feed */}
        <div className="md:col-span-3 space-y-4">
          <h2 className="text-2xl font-serif font-bold text-[#1A202C] mb-6 border-l-4 border-[#8B2323] pl-3 py-0.5 leading-none">
            Community Prayers
          </h2>
          
          {publicPrayers
            .filter((p: any) => p.status === "approved" || p.status === undefined)
            .sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
            .map((prayer: any) => (
              <PrayerPageCard key={prayer.id} prayer={prayer} session={session} />
            ))
          }

          {publicPrayers.length === 0 && (
            <div className="text-center py-12 bg-white/40 rounded-3xl border border-[#F3EAE1] border-dashed">
              <Heart className="w-12 h-12 text-[#E5D5C5] mx-auto mb-3" />
              <p className="text-[#7A6150]">No prayer requests at the moment.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PrayerPageCard({ prayer, session }: { prayer: any, session: any }) {
  const [prayedCount, setPrayedCount] = useState(prayer.prayedCount || 0);
  const [hasPrayed, setHasPrayed] = useState(
    prayer.prayedBy && session && prayer.prayedBy.includes(session.memberId)
  );

  const handlePray = async () => {
    if (hasPrayed) return;
    
    setHasPrayed(true);
    setPrayedCount((prev: number) => prev + 1);

    try {
      const res = await fetch(`/api/prayers/${prayer.id}/pray`, { method: 'POST' });
      
      if (!res.ok) {
        setHasPrayed(false);
        setPrayedCount((prev: number) => prev - 1);
        return;
      }

      const data = await res.json();
      if (data.alreadyPrayed) {
        setPrayedCount(data.prayedCount);
      }
    } catch (err) {
      setHasPrayed(false);
      setPrayedCount((prev: number) => prev - 1);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/60 backdrop-blur-sm p-5 rounded-2xl border border-white shadow-sm"
    >
      <div className="flex justify-between items-start mb-2">
        <span className="text-[10px] font-bold text-[#8B2323] tracking-wider uppercase bg-[#FBE8E8] px-2 py-1 rounded-sm">
          {new Date(prayer.createdAt || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
      </div>
      <p className="text-[#3A2D27] leading-relaxed mb-4 whitespace-pre-wrap">{prayer.content}</p>
      
      <div className="flex items-center justify-between border-t border-[#F3EAE1] pt-4">
        <div className="flex items-center text-sm font-semibold text-[#8B2323]">
          <User className="w-4 h-4 mr-2" />
          {prayer.isAnonymous ? "Anonymous" : (prayer.authorName || 'Anonymous')}
        </div>
        
        <button 
          onClick={handlePray}
          disabled={hasPrayed}
          className={`flex items-center gap-1.5 text-sm font-bold px-4 py-2 rounded-full transition-colors ${
            hasPrayed 
            ? 'bg-[#FBE8E8] text-[#8B2323]' 
            : 'bg-[#F3EAE1] text-[#7A6150] hover:bg-[#E5D5C5] active:scale-95'
          }`}
        >
          <Heart className={`w-4 h-4 ${hasPrayed ? 'fill-current' : ''}`} />
          {hasPrayed ? 'Prayed' : 'Pray'} • {prayedCount}
        </button>
      </div>
    </motion.div>
  );
}