"use client";

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { CalendarDays, Download, FileText, Printer } from 'lucide-react';
import { generateOccurrences } from '@/lib/recurrence';

interface SchedulePreviewExportProps {
  title: string;
  startDate: string; // YYYY-MM-DD
  endDate?: string;
  pattern: string;
  dayOfWeek?: string;
  weekOfMonth?: string;
  startTime?: string;
}

export function SchedulePreviewExport({
  title,
  startDate,
  endDate,
  pattern,
  dayOfWeek,
  weekOfMonth,
  startTime
}: SchedulePreviewExportProps) {
  const [open, setOpen] = useState(false);

  const occurrences = useMemo(() => {
    if (!startDate || !pattern) return [];
    try {
      // Generate max 1 year of occurrences or up to 52 instances
      const calculatedEnd = endDate || new Date(new Date(startDate).getTime() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      return generateOccurrences(startDate, calculatedEnd, pattern, dayOfWeek, weekOfMonth, 52);
    } catch (e) {
      console.error(e);
      return [];
    }
  }, [startDate, endDate, pattern, dayOfWeek, weekOfMonth]);

  const handleExportCSV = () => {
    const header = "Occurrence,Date,Time\n";
    const rows = occurrences.map((date, idx) => `${idx + 1},${date},${startTime || 'N/A'}`).join('\n');
    const csvContent = header + rows;
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${(title || 'Schedule').replace(/\s+/g, '_')}_schedule.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintPDF = () => {
    // Generate a temporary iframe or just open a new window to print nicely
    const printWindow = window.open('', '', 'width=800,height=600');
    if (!printWindow) return;

    const html = `
      <html>
        <head>
          <title>${title || 'Schedule'} - Export</title>
          <style>
            body { font-family: system-ui, sans-serif; padding: 20px; color: #333; }
            h1 { font-size: 24px; margin-bottom: 5px; }
            p { color: #666; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            th { background-color: #f8f9fa; }
            @media print {
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <h1>${title || 'Schedule'}</h1>
          <p>Recurring Schedule Preview (Next ${occurrences.length} occurrences)</p>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Date</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              ${occurrences.map((d, i) => `
                <tr>
                  <td>${i + 1}</td>
                  <td>${new Date(d).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' })}</td>
                  <td>${startTime || 'N/A'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <script>
            window.onload = () => {
              window.print();
              setTimeout(() => window.close(), 500);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  };

  if (!pattern) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 w-full mt-2 border-violet-200 hover:bg-violet-50 hover:text-violet-700">
          <CalendarDays className="w-4 h-4 text-violet-500" /> Preview Schedule & Export
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-violet-500" />
            Schedule Preview
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={handleExportCSV} variant="outline" className="flex-1 gap-2 border-green-200 hover:bg-green-50 hover:text-green-700">
              <FileText className="w-4 h-4 text-green-600" /> Excel (CSV)
            </Button>
            <Button onClick={handlePrintPDF} variant="outline" className="flex-1 gap-2 border-red-200 hover:bg-red-50 hover:text-red-700">
              <Printer className="w-4 h-4 text-red-600" /> Print / PDF
            </Button>
          </div>

          <div className="bg-muted/30 border border-border/50 rounded-lg overflow-hidden flex flex-col h-[300px]">
            <div className="bg-muted/50 p-2 border-b grid grid-cols-12 gap-2 text-xs font-semibold text-muted-foreground">
              <div className="col-span-2 text-center">#</div>
              <div className="col-span-6">Date</div>
              <div className="col-span-4 text-right pr-2">Time</div>
            </div>
            <div className="overflow-y-auto p-2 space-y-1 flex-1">
              {!startDate ? (
                <div className="text-center text-sm text-red-500 p-4 font-medium flex flex-col items-center justify-center h-full">
                  Please set a Start Date first!
                </div>
              ) : occurrences.length === 0 ? (
                <div className="text-center text-sm text-muted-foreground p-4">No occurrences generated based on current settings.</div>
              ) : (
                occurrences.map((date, idx) => (
                  <div key={date} className="grid grid-cols-12 gap-2 text-sm p-2 hover:bg-muted/50 rounded-md transition-colors">
                    <div className="col-span-2 text-center text-muted-foreground">{idx + 1}</div>
                    <div className="col-span-6 font-medium">
                      {new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </div>
                    <div className="col-span-4 text-right pr-2 text-muted-foreground">{startTime || '-'}</div>
                  </div>
                ))
              )}
            </div>
          </div>
          
          <div className="text-[10px] text-center text-muted-foreground">
            Preview is limited to the next 52 occurrences (approx. 1 year).
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
