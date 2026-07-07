"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BookOpen, Upload, Trash2, CheckCircle2, AlertCircle, FileSpreadsheet, Loader2 } from 'lucide-react';
import { useAdminData } from '@/lib/admin-data-context';
import { toast } from 'sonner';

interface Verse {
  dayOfYear: number;
  text: string;
  reference: string;
}

export default function DailyVersesManagementPage() {
  const [verses, setVerses] = useState<Verse[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [previewVerses, setPreviewVerses] = useState<{ text: string; reference: string }[]>([]);

  useEffect(() => {
    fetchVerses();
  }, []);

  const fetchVerses = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/verses');
      if (res.ok) {
        const data = await res.json();
        setVerses(data);
      }
    } catch (error) {
      console.error('Error fetching verses:', error);
      toast.error('Failed to load existing verses');
    } finally {
      setLoading(false);
    }
  };

  const parseCSV = (csvText: string) => {
    const lines = csvText.split(/\r?\n/).filter(l => l.trim() !== '');
    // Ignore header if it exists
    const startIndex = lines[0].toLowerCase().includes('text') ? 1 : 0;
    
    const parsed = [];
    for(let i = startIndex; i < lines.length; i++) {
      // Basic CSV split, ignoring commas inside quotes
      const row = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
      if (row.length >= 2) {
        // Clean up quotes
        const text = row[0].replace(/^"|"$/g, '').replace(/""/g, '"').trim();
        const reference = row[1].replace(/^"|"$/g, '').replace(/""/g, '"').trim();
        if (text && reference) {
          parsed.push({ text, reference });
        }
      }
    }
    return parsed;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = parseCSV(text);
        if (parsed.length === 0) {
          toast.error("No valid verses found in the file.");
          return;
        }
        setPreviewVerses(parsed);
      } catch (err) {
        console.error(err);
        toast.error("Error parsing the CSV file.");
      }
    };
    reader.readAsText(file);
    
    // Reset input so the same file can be uploaded again if needed
    e.target.value = '';
  };

  const handleSaveVerses = async () => {
    if (previewVerses.length === 0) return;
    setUploading(true);

    try {
      const res = await fetch('/api/admin/verses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verses: previewVerses }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(`Successfully uploaded ${data.count} verses!`);
        setPreviewVerses([]);
        fetchVerses();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to upload verses');
      }
    } catch (error) {
      console.error('Error saving verses:', error);
      toast.error('An error occurred during upload');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteAll = async () => {
    if (!window.confirm("Are you sure you want to delete all verses? This will reset the daily verse to the default.")) return;
    
    try {
      const res = await fetch('/api/admin/verses', {
        method: 'DELETE',
      });
      if (res.ok) {
        toast.success('All verses deleted');
        fetchVerses();
      }
    } catch (error) {
      toast.error('Failed to delete verses');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <BookOpen className="w-8 h-8 text-primary" />
          Daily Bible Verses
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage the daily verses displayed on the home page. Upload a CSV to auto-rotate verses throughout the year.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-primary" /> Upload CSV
            </CardTitle>
            <CardDescription>
              Upload a CSV file containing 2 columns: <strong>Text</strong> and <strong>Reference</strong>. <br/>
              Row 1 will be Day 1, Row 2 will be Day 2, etc. If you upload 365 rows, it covers the whole year!
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed border-border/50 rounded-xl p-8 text-center hover:bg-muted/50 transition-colors">
              <input
                type="file"
                accept=".csv"
                id="csv-upload"
                className="hidden"
                onChange={handleFileUpload}
              />
              <label htmlFor="csv-upload" className="cursor-pointer flex flex-col items-center gap-2">
                <FileSpreadsheet className="w-10 h-10 text-muted-foreground" />
                <span className="font-semibold text-primary">Click to select a .csv file</span>
                <span className="text-sm text-muted-foreground">e.g., "In the beginning...", "Genesis 1:1"</span>
              </label>
            </div>

            {previewVerses.length > 0 && (
              <div className="space-y-4">
                <div className="bg-emerald-500/10 text-emerald-700 p-4 rounded-lg flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Successfully parsed {previewVerses.length} verses!</p>
                    <p className="text-sm opacity-80">Click Save to apply them. This will replace all existing verses.</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSaveVerses} disabled={uploading} className="flex-1">
                    {uploading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Save {previewVerses.length} Verses
                  </Button>
                  <Button variant="outline" onClick={() => setPreviewVerses([])}>Cancel</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Current Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="flex justify-center p-8">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg border border-border/50">
                  <div className="space-y-1">
                    <p className="font-medium text-lg">Total Verses Active</p>
                    <p className="text-sm text-muted-foreground">The system will rotate through these automatically.</p>
                  </div>
                  <div className="text-4xl font-bold text-primary">{verses.length}</div>
                </div>

                {verses.length > 0 ? (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-sm">Sample Verse (Day 1):</h3>
                    <div className="p-4 bg-background border rounded-lg italic text-muted-foreground">
                      "{verses[0].text}" <br/>
                      <span className="text-sm font-semibold not-italic text-foreground mt-2 block">— {verses[0].reference}</span>
                    </div>

                    <Button variant="destructive" onClick={handleDeleteAll} className="w-full">
                      <Trash2 className="w-4 h-4 mr-2" /> Delete All Verses
                    </Button>
                  </div>
                ) : (
                  <div className="p-6 text-center border-2 border-dashed rounded-lg">
                    <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                    <p className="font-medium text-amber-700">No verses uploaded</p>
                    <p className="text-sm text-muted-foreground">The home page is currently displaying the default verse (Psalm 23:1).</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
