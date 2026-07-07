"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useAdminData } from '@/lib/admin-data-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  Tv, 
  ChevronRight, 
  Play, 
  Calendar, 
  User, 
  Filter,
  ArrowRight
} from 'lucide-react';

export default function SermonsPage() {
  const { sermonSeries, sermons, getVisibleSermons, currentUser } = useAdminData();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [activeCampusId, setActiveCampusId] = useState('global');

  React.useEffect(() => {
    setActiveCampusId(localStorage.getItem('grace_activeCampus') || 'global');
  }, []);

  const visibleSermons = getVisibleSermons(activeCampusId, currentUser?.groups || [], currentUser?.role);

  const categories = ['All', ...Array.from(new Set(sermonSeries.map(s => s.category)))];

  const filteredSeries = sermonSeries.filter(series => {
    const matchesSearch = series.title.toLowerCase().includes(search.toLowerCase()) || 
                         series.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = activeCategory === 'All' || series.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen pb-20">
      {/* Hero Section */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent -z-10" />
        <div className="container mx-auto px-6 text-center">
          <Badge className="bg-primary/10 text-primary border-0 mb-6 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider">
            Sermon Archive
          </Badge>
          <h1 className="text-5xl lg:text-7xl font-bold mb-6 tracking-tight">
            Explore Our <span className="gradient-text">Teachings</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Browse through our collected sermon series, playlists, and individual messages 
            designed to deepen your faith and understanding.
          </p>
        </div>
      </section>

      {/* Filter & Search Bar */}
      <div className="container mx-auto px-6 mb-12">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between glass-card p-4 rounded-2xl border-0">
          <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto scrollbar-hide">
            {categories.map(cat => (
              <Button
                key={cat}
                variant={activeCategory === cat ? 'default' : 'glass'}
                size="sm"
                onClick={() => setActiveCategory(cat)}
                className="whitespace-nowrap px-6 rounded-full"
              >
                {cat}
              </Button>
            ))}
          </div>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search series or topics..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-background/50 border-border/50 rounded-xl focus:ring-primary/20"
            />
          </div>
        </div>
      </div>

      {/* Series Grid */}
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredSeries.map((series) => {
            const seriesSermons = visibleSermons.filter(s => s.seriesId === series.id);
            const latestSermon = seriesSermons[0];

            return (
              <Link href={`/sermons/series/${series.id}`} key={series.id} className="group">
                <Card className="glass-card h-full overflow-hidden border-0 hover-lift transition-all duration-500">
                  <div className="aspect-[16/9] relative overflow-hidden bg-muted">
                    {latestSermon ? (
                      <img 
                        src={`https://img.youtube.com/vi/${latestSermon.videoId}/maxresdefault.jpg`}
                        alt={series.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-primary/5">
                        <Tv className="w-12 h-12 text-primary/20" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    <Badge className="absolute top-4 left-4 bg-primary text-primary-foreground border-0">
                      {series.category}
                    </Badge>
                    <div className="absolute bottom-4 left-4 right-4 focus:outline-none">
                      <div className="flex items-center gap-2 text-xs text-white/80 font-medium mb-1">
                        <Play className="w-3 h-3 text-primary" /> {seriesSermons.length} Messages
                      </div>
                      <h3 className="text-xl font-bold text-white group-hover:text-primary transition-colors line-clamp-1 italic">
                        {series.title}
                      </h3>
                    </div>
                  </div>
                  <CardContent className="p-6">
                    <p className="text-muted-foreground text-sm line-clamp-2 mb-6 min-h-[40px]">
                      {series.description}
                    </p>
                    <div className="flex items-center justify-between pt-4 border-t border-border/50">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="w-4 h-4 text-primary" />
                        </div>
                        <span className="text-xs font-medium">{latestSermon?.pastor || 'Pastor Geo'}</span>
                      </div>
                      <Button variant="ghost" size="sm" className="h-8 group/btn px-0 hover:bg-transparent text-primary">
                        View Series <ChevronRight className="w-4 h-4 ml-1 group-hover/btn:translate-x-1 transition-transform" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        {filteredSeries.length === 0 && (
          <div className="text-center py-32 glass-card rounded-3xl border-0">
            <Tv className="w-20 h-20 text-muted-foreground/20 mx-auto mb-6" />
            <h3 className="text-2xl font-bold mb-2">No Series Found</h3>
            <p className="text-muted-foreground mb-8">Try adjusting your search or category filters.</p>
            <Button variant="outline" onClick={() => { setSearch(''); setActiveCategory('All'); }}>
              Clear All Filters
            </Button>
          </div>
        )}
      </div>

      {/* Featured Single Message Call to Action */}
      <section className="container mx-auto px-6 mt-32">
        <Card className="relative overflow-hidden border-0 glass-card p-1">
          <div className="bg-gradient-to-r from-primary/10 via-accent/5 to-primary/10 rounded-3xl p-8 md:p-16 flex flex-col md:flex-row items-center gap-12">
            <div className="flex-1 text-center md:text-left">
              <Badge className="bg-primary/20 text-primary border-0 mb-6">Our Mission</Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">Grow Your Faith Through <span className="gradient-text">Message Archive</span></h2>
              <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
                Access hundreds of life-changing messages and series from our past services. 
                Filter by topic, date, or speaker to find exactly what you need today.
              </p>
              <Button size="lg" className="hover-lift px-10 rounded-full font-bold">
                Subscribe to Youtube <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
            <div className="shrink-0 relative w-full md:w-[400px] aspect-[4/3] rounded-2xl overflow-hidden glass-card shadow-2xl">
              <img 
                src="https://images.unsplash.com/photo-1511988617509-a57c8a288659?q=80&w=2071&auto=format&fit=crop"
                alt="Worship focus"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-primary/20 backdrop-blur-[2px] flex items-center justify-center">
                <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
                  <Play className="w-10 h-10 text-white fill-current" />
                </div>
              </div>
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
}
