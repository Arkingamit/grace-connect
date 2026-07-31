"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useAdminData } from '@/lib/admin-data-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Search, 
  Tv, 
  ChevronRight, 
  Play, 
  User,
  ArrowLeft
} from 'lucide-react';

export default function SermonsPage() {
  const { sermonSeries, sermons, getVisibleSermons, currentUser } = useAdminData();
  const [search, setSearch] = useState('');
  const [activePastor, setActivePastor] = useState('All');
  const [activeCampusId, setActiveCampusId] = useState('global');
  const [viewMode, setViewMode] = useState<'series' | 'sermons'>('series');

  React.useEffect(() => {
    setActiveCampusId(localStorage.getItem('grace_activeCampus') || 'global');
  }, []);

  const visibleSermons = getVisibleSermons(activeCampusId, currentUser?.groups || [], currentUser?.role);

  const pastors = ['All', ...Array.from(new Set(visibleSermons.map(s => s.pastor).filter(Boolean)))];

  const filteredSeries = sermonSeries.filter(series => {
    const seriesSermons = visibleSermons.filter(s => s.seriesId === series.id);
    const matchesSearch = series.title.toLowerCase().includes(search.toLowerCase()) || 
                         series.description.toLowerCase().includes(search.toLowerCase()) ||
                         seriesSermons.some(s => s.pastor?.toLowerCase().includes(search.toLowerCase()));
    
    const matchesPastor = activePastor === 'All' || seriesSermons.some(s => s.pastor === activePastor);
    
    return matchesSearch && matchesPastor && seriesSermons.length > 0;
  });

  const filteredSermons = visibleSermons.filter(sermon => {
    const matchesSearch = sermon.title.toLowerCase().includes(search.toLowerCase()) || 
                         sermon.description?.toLowerCase().includes(search.toLowerCase());
    const matchesPastor = activePastor === 'All' || sermon.pastor === activePastor;
    return matchesSearch && matchesPastor;
  });

  return (
    <div className="min-h-screen pb-20">
      {/* Header with Back Button */}
      <div className="container mx-auto px-6 pt-12 pb-6">
        <Link href="/">
          <Button variant="ghost" className="pl-0 gap-2 hover:bg-transparent text-muted-foreground hover:text-primary transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium text-lg">Back</span>
          </Button>
        </Link>
      </div>

      {/* Filter & Search Bar */}
      <div className="container mx-auto px-6 mb-12">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between glass-card p-4 rounded-2xl border-0">
          <div className="flex gap-2 p-1 bg-background/50 rounded-xl w-full md:w-auto">
            <Button 
              variant={viewMode === 'series' ? 'default' : 'ghost'} 
              size="sm"
              onClick={() => setViewMode('series')}
              className="flex-1 md:flex-none rounded-lg"
            >
              Series
            </Button>
            <Button 
              variant={viewMode === 'sermons' ? 'default' : 'ghost'} 
              size="sm"
              onClick={() => setViewMode('sermons')}
              className="flex-1 md:flex-none rounded-lg"
            >
              Sermons
            </Button>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <div className="relative w-full sm:w-64 md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search series or topics..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-background/50 border-border/50 rounded-xl focus:ring-primary/20"
              />
            </div>
            <div className="w-full sm:w-48">
              <Select value={activePastor} onValueChange={setActivePastor}>
                <SelectTrigger className="w-full rounded-xl bg-background/50 border-input text-foreground h-10">
                  <SelectValue placeholder="Filter by Pastor" />
                </SelectTrigger>
                <SelectContent>
                  {pastors.map(p => (
                    <SelectItem key={p} value={p}>{p === 'All' ? 'All Pastors' : p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Series Grid */}
      <div className="container mx-auto px-6">
        {viewMode === 'series' ? (
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
                          src={`https://img.youtube.com/vi/${latestSermon.videoId}/hqdefault.jpg`}
                          alt={series.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-primary/5">
                          <Tv className="w-12 h-12 text-primary/20" />
                        </div>
                      )}
                      <Badge className="absolute top-4 left-4 bg-primary text-primary-foreground border-0">
                        {series.category}
                      </Badge>
                    </div>
                    <CardContent className="p-6">
                      <h4 className="font-bold text-lg mb-2 line-clamp-2 group-hover:text-primary transition-colors">{series.title}</h4>
                      {series.description && series.description !== series.title && (
                        <p className="text-muted-foreground text-sm line-clamp-2 mb-6 min-h-[40px]">
                          {series.description}
                        </p>
                      )}
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
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredSermons.map((sermon) => {
              const series = sermonSeries.find(s => s.id === sermon.seriesId);
              
              return (
                <Link href={`/sermons/series/${sermon.seriesId}`} key={sermon.id} className="group">
                  <Card className="glass-card h-full overflow-hidden border-0 hover-lift transition-all duration-500">
                    <div className="aspect-[16/9] relative overflow-hidden bg-muted">
                      <img 
                        src={`https://img.youtube.com/vi/${sermon.videoId}/hqdefault.jpg`}
                        alt={sermon.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      />
                      {series && (
                        <Badge className="absolute top-4 left-4 bg-primary text-primary-foreground border-0">
                          {series.category}
                        </Badge>
                      )}
                    </div>
                    <CardContent className="p-6">
                      <h4 className="font-bold text-lg mb-2 line-clamp-2 group-hover:text-primary transition-colors">{sermon.title}</h4>
                      {sermon.description && sermon.description !== sermon.title && (
                        <p className="text-muted-foreground text-sm line-clamp-2 mb-6 min-h-[40px]">
                          {sermon.description}
                        </p>
                      )}
                      <div className="flex items-center justify-between pt-4 border-t border-border/50">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="w-4 h-4 text-primary" />
                          </div>
                          <span className="text-xs font-medium">{sermon.pastor || 'Pastor Geo'}</span>
                        </div>
                        <Button variant="ghost" size="sm" className="h-8 group/btn px-0 hover:bg-transparent text-primary">
                          Watch <Play className="w-4 h-4 ml-1 group-hover/btn:translate-x-1 transition-transform" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}

        {((viewMode === 'series' && filteredSeries.length === 0) || (viewMode === 'sermons' && filteredSermons.length === 0)) && (
          <div className="text-center py-32 glass-card rounded-3xl border-0">
            <Tv className="w-20 h-20 text-muted-foreground/20 mx-auto mb-6" />
            <h3 className="text-2xl font-bold mb-2">No {viewMode === 'series' ? 'Series' : 'Sermons'} Found</h3>
            <p className="text-muted-foreground mb-8">Try adjusting your search or category filters.</p>
            <Button variant="outline" onClick={() => { setSearch(''); setActivePastor('All'); }}>
              Clear All Filters
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
