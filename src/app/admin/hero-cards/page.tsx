"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FlipHorizontal, Plus, X } from 'lucide-react';
import { useAdminData, type FlipCardItem } from '@/lib/admin-data-context';
import { toast } from 'sonner';

export default function HeroCardsManagementPage() {
  const { 
    flipCardConfig, 
    updateFlipCardConfig, 
    events, 
    announcements, 
    prayerRequests, 
    sermons, 
    worshipVideos 
  } = useAdminData();

  // Flip Card Form State
  const [flipForm, setFlipForm] = useState(flipCardConfig);

  useEffect(() => {
    setFlipForm(flipCardConfig);
  }, [flipCardConfig]);

  const handleSaveFlipConfig = () => {
    const isActive = flipForm.items && flipForm.items.length > 0;
    updateFlipCardConfig({ ...flipForm, isActive });
    toast.success('Flip card configuration updated!');
  };

  const handleAddItem = () => {
    setFlipForm({
      ...flipForm,
      items: [
        ...(flipForm.items || []),
        {
          id: Math.random().toString(36).substring(7),
          type: 'custom',
          title: 'New Item',
          description: '',
          buttonText: 'Read More',
          buttonLink: '/'
        }
      ]
    });
  };

  const handleRemoveItem = (index: number) => {
    const newItems = [...(flipForm.items || [])];
    newItems.splice(index, 1);
    setFlipForm({ ...flipForm, items: newItems });
  };

  const handleUpdateItem = (index: number, updates: Partial<FlipCardItem>) => {
    const newItems = [...(flipForm.items || [])];
    newItems[index] = { ...newItems[index], ...updates };
    setFlipForm({ ...flipForm, items: newItems });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <FlipHorizontal className="w-8 h-8 text-primary" />
          Highlights Cards
        </h1>
        <p className="text-muted-foreground mt-1">
          Configure what appears on the back of the Highlights card when users interact with it.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mt-8">
        <Card className="md:col-span-2 max-w-3xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FlipHorizontal className="w-5 h-5 text-primary" /> Highlights Card Flip Side
            </CardTitle>
            <CardDescription>
              Configure what appears on the back of the Daily Verse card when users hover over it. 
              Useful for highlighting important events or announcements.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-6">
              {(flipForm.items || []).map((item, index) => (
                <div key={item.id} className="p-4 border rounded-xl relative space-y-4 bg-background shadow-sm">
                  <div className="absolute top-2 right-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleRemoveItem(index)}
                      className="text-destructive hover:bg-destructive/10"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Content Type</Label>
                      <Select 
                        value={item.type} 
                        onValueChange={(val: any) => handleUpdateItem(index, { type: val, itemId: '' })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="custom">Custom Content</SelectItem>
                          <SelectItem value="event">Event</SelectItem>
                          <SelectItem value="announcement">Announcement</SelectItem>
                          <SelectItem value="sermon">Sermon</SelectItem>
                          <SelectItem value="worship_video">Worship Video</SelectItem>
                          <SelectItem value="prayer">Prayer Request</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {item.type !== 'custom' && (
                      <div className="space-y-2">
                        <Label>Select Item</Label>
                        <Select 
                          value={item.itemId} 
                          onValueChange={(val: any) => handleUpdateItem(index, { itemId: val })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select item" />
                          </SelectTrigger>
                          <SelectContent>
                            {item.type === 'event' && events.filter(e => !(flipForm.items || []).some((i, idx) => idx !== index && i.type === 'event' && i.itemId === e.id)).map(e => <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>)}
                            {item.type === 'announcement' && announcements.filter(a => !(flipForm.items || []).some((i, idx) => idx !== index && i.type === 'announcement' && i.itemId === a.id)).map(a => <SelectItem key={a.id} value={a.id}>{a.title}</SelectItem>)}
                            {item.type === 'sermon' && sermons.filter(s => !(flipForm.items || []).some((i, idx) => idx !== index && i.type === 'sermon' && i.itemId === s.id)).map(s => <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>)}
                            {item.type === 'worship_video' && worshipVideos.filter(w => !(flipForm.items || []).some((i, idx) => idx !== index && i.type === 'worship_video' && i.itemId === w.id)).map(w => <SelectItem key={w.id} value={w.id}>{w.title}</SelectItem>)}
                            {item.type === 'prayer' && prayerRequests.filter(p => !(flipForm.items || []).some((i, idx) => idx !== index && i.type === 'prayer' && i.itemId === p.id)).map(p => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  {item.type === 'custom' && (
                    <>
                      <div className="space-y-2">
                        <Label>Title</Label>
                        <Input 
                          placeholder="e.g. Christmas Eve Service" 
                          value={item.title || ''}
                          onChange={(e) => handleUpdateItem(index, { title: e.target.value })}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Input 
                          placeholder="e.g. Join us for our annual picnic" 
                          value={item.description || ''} 
                          onChange={(e) => handleUpdateItem(index, { description: e.target.value })}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Button Text</Label>
                          <Input 
                            placeholder="e.g. RSVP Now" 
                            value={item.buttonText || ''}
                            onChange={(e) => handleUpdateItem(index, { buttonText: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Button Link</Label>
                          <Input 
                            placeholder="e.g. /events/picnic" 
                            value={item.buttonLink || ''} 
                            onChange={(e) => handleUpdateItem(index, { buttonLink: e.target.value })}
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}
              
              <Button 
                variant="outline" 
                onClick={handleAddItem} 
                className="w-full border-dashed"
              >
                <Plus className="w-4 h-4 mr-2" /> Add Another Item
              </Button>
            </div>

            <Button onClick={handleSaveFlipConfig} className="w-full">
              Save Configuration
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
