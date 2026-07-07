"use client";

import React, { useState, useEffect } from "react";
import { Book, ChevronRight, Calendar, Sparkles, Share2, Heart, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Verse {
  text: string;
  reference: string;
  reflection?: string;
}

export default function DevotionalsPage() {
  const [verse, setVerse] = useState<Verse>({
    text: "The Lord is my shepherd; I shall not want. He makes me lie down in green pastures. He leads me beside still waters.",
    reference: "Psalm 23:1-2",
    reflection: "In moments of stress and uncertainty, remember that God is our shepherd. He provides, guides, and restores our souls. Rest in His peace today."
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/verses/today")
      .then((res) => res.json())
      .then((data) => {
        if (data && data.text) {
          setVerse({
            text: data.text,
            reference: data.reference,
            reflection: data.reflection || "Take a moment to meditate on this scripture today. Let it fill your heart with hope, guidance, and peace as you walk through your day."
          });
        }
      })
      .catch((err) => console.error("Error fetching daily verse:", err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-md mx-auto px-4 py-8 space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="h-8 w-1 border-l-4 border-[#8B2323] pl-2 py-0.5 leading-none"></div>
        <h1 className="text-2xl font-bold font-serif text-[#1A202C]">Daily Bible & Devotional</h1>
      </div>

      {/* Main Scripture Card */}
      <Card className="overflow-hidden border-[#E5D5C5] bg-white/70 backdrop-blur-sm shadow-md rounded-2xl">
        <CardContent className="p-6 space-y-6">
          <div className="flex items-center justify-between text-[#8B2323]">
            <div className="flex items-center gap-2">
              <Book className="w-5 h-5" />
              <span className="text-xs font-bold tracking-wider uppercase">Verse of the Day</span>
            </div>
            <span className="text-xs text-[#7A6150] flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>

          <div className="space-y-4">
            <blockquote className="text-lg font-serif italic text-[#3A2D27] leading-relaxed">
              "{verse.text}"
            </blockquote>
            <cite className="block text-right text-sm font-bold text-[#8B2323] not-italic">
              — {verse.reference}
            </cite>
          </div>
        </CardContent>
      </Card>

      {/* Reflection Card */}
      <Card className="overflow-hidden border-[#E5D5C5] bg-white/70 backdrop-blur-sm shadow-md rounded-2xl">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-2 text-[#8B2323]">
            <Sparkles className="w-5 h-5" />
            <h3 className="font-bold font-serif text-[#1A202C]">Today's Reflection</h3>
          </div>
          <p className="text-sm text-[#7A6150] leading-relaxed">
            {verse.reflection}
          </p>
        </CardContent>
      </Card>

      {/* Daily Reading Plan */}
      <Card className="overflow-hidden border-[#E5D5C5] bg-white/70 backdrop-blur-sm shadow-md rounded-2xl">
        <CardContent className="p-6 space-y-4">
          <h3 className="font-bold font-serif text-[#1A202C] text-base">Daily Reading Plan</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#FAF7F2] border border-[#E5D5C5]/60">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#FBE8E8] text-[#8B2323] flex items-center justify-center font-bold text-xs">1</div>
                <div>
                  <p className="text-xs text-[#7A6150] font-medium">Morning Reading</p>
                  <p className="text-sm font-bold text-[#3A2D27]">Psalms 119:1-18</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-[#7A6150]" />
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#FAF7F2] border border-[#E5D5C5]/60">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#FBE8E8] text-[#8B2323] flex items-center justify-center font-bold text-xs">2</div>
                <div>
                  <p className="text-xs text-[#7A6150] font-medium">Evening Reading</p>
                  <p className="text-sm font-bold text-[#3A2D27]">Romans 12:1-21</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-[#7A6150]" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
