"use client";

import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, ExternalLink } from 'lucide-react';
import { useAdminData } from '@/lib/admin-data-context';

export function NoteShareSection({ variant = 'default' }: { variant?: 'default' | 'page' }) {
  const { broadcasts } = useAdminData();

  if (!broadcasts || broadcasts.length === 0) {
    return null;
  }

  return (
    <div className="w-full">
      {variant === 'default' && (
        <div className="flex justify-between items-end mb-4">
          <h2 className="text-2xl font-serif font-bold text-[#1A202C] border-l-4 border-[#8B2323] pl-3 py-0.5 leading-none">
            Note Share
          </h2>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {broadcasts.map(b => (
          <Card key={b._id} className="overflow-hidden group hover:shadow-lg transition-shadow border-[#E5D5C5]/60 bg-[#F3EAE1]">
            <div className="bg-gradient-to-br from-[#8B2323]/5 to-transparent p-4 pb-3 border-b border-[#E5D5C5]/60">
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-lg text-[#1A202C] truncate">{b.title}</h3>
                  <p className="text-xs text-[#7A6150] mt-0.5">
                    By {b.createdByName || 'Admin'} • {new Date(b.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-sm text-[#3A2D27] line-clamp-3 whitespace-pre-wrap">{b.description}</p>
              {b.materialLinks && b.materialLinks.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-[#E5D5C5]/60">
                  <p className="text-[10px] font-bold text-[#7A6150] uppercase tracking-wider">Materials</p>
                  {b.materialLinks.map((link: any, idx: number) => (
                    <a
                      key={idx}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-[#8B2323] hover:underline p-2 rounded-lg bg-[#FAF7F2]/50 hover:bg-[#FAF7F2] border border-[#E5D5C5]/30 shadow-sm transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{link.label}</span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
