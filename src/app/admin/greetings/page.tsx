"use client";

import React, { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Gift, Heart, MessageCircle, Send, Loader2, Phone, Calendar, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface GreetingUser {
  _id: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  phone?: string;
  whatsapp?: string;
  events: string[];
  birthday?: string;
  marriageDate?: string;
}

export default function GreetingsPage() {
  const [users, setUsers] = useState<GreetingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [messageText, setMessageText] = useState<{ [key: string]: string }>({});
  const [sending, setSending] = useState<{ [key: string]: boolean }>({});
  const [activeTab, setActiveTab] = useState('today');
  const { toast } = useToast();

  useEffect(() => {
    fetchGreetings(activeTab);
    setSearch('');
  }, [activeTab]);

  const fetchGreetings = async (filter: string) => {
    try {
      setLoading(true);
      const url = filter === 'all' ? '/api/admin/greetings?filter=all' : '/api/admin/greetings';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.greetings);
      }
    } catch (error) {
      console.error('Error fetching greetings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load greetings.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((user) => {
      const haystack = [
        user.name,
        user.firstName,
        user.lastName,
        user.email,
        user.phone,
        user.whatsapp,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [users, search]);

  const handleSendAppMessage = async (userId: string) => {
    const text = messageText[userId];
    if (!text) {
      toast({ title: 'Error', description: 'Please enter a message.', variant: 'destructive' });
      return;
    }

    try {
      setSending(prev => ({ ...prev, [userId]: true }));
      const res = await fetch('/api/admin/greetings/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, message: text }),
      });

      if (res.ok) {
        toast({ title: 'Success', description: 'Message sent successfully.' });
        setMessageText(prev => ({ ...prev, [userId]: '' }));
      } else {
        throw new Error('Failed to send');
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to send message.', variant: 'destructive' });
    } finally {
      setSending(prev => ({ ...prev, [userId]: false }));
    }
  };

  const openWhatsApp = (whatsapp?: string, name?: string, events?: string[]) => {
    if (!whatsapp) return;
    
    // Default message based on event
    const isBirthday = events?.includes('birthday');
    const isAnniv = events?.includes('anniversary');
    let defaultMsg = `Hi ${name || ''}, `;
    if (isBirthday && isAnniv) defaultMsg += `wishing you a very Happy Birthday and a Happy Anniversary today from Grace Church! 🎉💑`;
    else if (isBirthday) defaultMsg += `wishing you a very Happy Birthday today from Grace Church! 🎉`;
    else if (isAnniv) defaultMsg += `wishing you a Happy Anniversary today from Grace Church! 💑`;
    else defaultMsg += `sending you warm greetings from Grace Church!`;

    const encoded = encodeURIComponent(defaultMsg);
    // Remove non-numeric characters from whatsapp number just in case
    const number = whatsapp.replace(/\D/g, '');
    window.open(`https://wa.me/${number}?text=${encoded}`, '_blank');
  };

  const renderUserCards = (showMessaging: boolean) => {
    if (loading) {
      return (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (users.length === 0) {
      return (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center space-y-3">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
              <Gift className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-lg font-medium">No greetings found</p>
              <p className="text-sm text-muted-foreground">There are no birthdays or anniversaries to show.</p>
            </div>
          </CardContent>
        </Card>
      );
    }

    if (filteredUsers.length === 0) {
      return (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center space-y-3">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
              <Search className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-lg font-medium">No members match your search</p>
              <p className="text-sm text-muted-foreground">Try a different name, phone, or email.</p>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {filteredUsers.map(user => (
          <Card key={user._id} className="overflow-hidden flex flex-col">
            <CardHeader className="bg-muted/30 pb-4">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <CardTitle className="text-lg">{user.name}</CardTitle>
                  <CardDescription className="flex flex-col gap-1 mt-1">
                    {user.phone && (
                      <span className="flex items-center text-xs">
                        <Phone className="h-3 w-3 mr-1" /> {user.phone}
                      </span>
                    )}
                    {user.birthday && (
                      <span className="flex items-center text-xs text-muted-foreground">
                        <Gift className="h-3 w-3 mr-1" /> {new Date(user.birthday).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                      </span>
                    )}
                    {user.marriageDate && (
                      <span className="flex items-center text-xs text-muted-foreground">
                        <Heart className="h-3 w-3 mr-1" /> {new Date(user.marriageDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                      </span>
                    )}
                  </CardDescription>
                </div>
                <div className="flex flex-col gap-1.5 items-end">
                  {user.events.includes('birthday') && (
                    <Badge className="bg-primary/20 text-primary hover:bg-primary/30 border-0 flex items-center gap-1">
                      <Gift className="h-3 w-3" /> Birthday
                    </Badge>
                  )}
                  {user.events.includes('anniversary') && (
                    <Badge className="bg-rose-500/20 text-rose-600 hover:bg-rose-500/30 border-0 flex items-center gap-1">
                      <Heart className="h-3 w-3" /> Anniversary
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 flex-1 flex flex-col justify-between space-y-4">
              {showMessaging && (
                <div className="space-y-2">
                  <label className="text-xs font-medium">Custom In-App Message</label>
                  <Textarea 
                    placeholder="Write a custom wishing message..."
                    className="min-h-[80px] text-sm resize-none"
                    value={messageText[user._id] || ''}
                    onChange={(e) => setMessageText(prev => ({ ...prev, [user._id]: e.target.value }))}
                  />
                  <Button 
                    size="sm" 
                    className="w-full" 
                    variant="secondary"
                    disabled={sending[user._id] || !messageText[user._id]}
                    onClick={() => handleSendAppMessage(user._id)}
                  >
                    {sending[user._id] ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                    Send In-App Message
                  </Button>
                </div>
              )}

              {user.whatsapp && (
                <div className={showMessaging ? "pt-2 border-t border-border/50" : ""}>
                  <Button 
                    size="sm" 
                    className="w-full bg-[#25D366] hover:bg-[#25D366]/90 text-white" 
                    onClick={() => openWhatsApp(user.whatsapp, user.firstName, user.events)}
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Send WhatsApp DM
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Greetings Directory</h1>
          <p className="text-muted-foreground">
            Celebrate birthdays and anniversaries with your campus members.
          </p>
        </div>
        <Button onClick={() => fetchGreetings(activeTab)} variant="outline" disabled={loading} className="w-full sm:w-auto rounded-xl">
          Refresh
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7A6150]" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search members by name, phone, or email..."
          className="pl-9 h-11 rounded-xl bg-[#FAF7F2] border-[#E5D5C5]/60"
        />
      </div>

      <Tabs defaultValue="today" onValueChange={setActiveTab}>
        <TabsList className="mb-6 w-full sm:w-auto">
          <TabsTrigger value="today" className="flex items-center gap-2 flex-1 sm:flex-none">
            <Calendar className="w-4 h-4" /> Today's Occasions
          </TabsTrigger>
          <TabsTrigger value="all" className="flex items-center gap-2 flex-1 sm:flex-none">
            <Gift className="w-4 h-4" /> All Members Directory
          </TabsTrigger>
        </TabsList>
        <TabsContent value="today">
          {renderUserCards(true)}
        </TabsContent>
        <TabsContent value="all">
          {renderUserCards(false)}
        </TabsContent>
      </Tabs>
    </div>
  );
}
