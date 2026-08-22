"use client";

import React, { useCallback } from 'react';
import { useAdminData } from '@/lib/admin-data-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  QrCode, Download, Copy, Check, Building2, ExternalLink,
} from 'lucide-react';

export default function QRCodesPage() {
  const { campuses, currentUser } = useAdminData();
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const [downloadingId, setDownloadingId] = React.useState<string | null>(null);
  const [downloadError, setDownloadError] = React.useState('');
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const isCampusLeader = currentUser.role === 'campus_leader';

  // Campus leaders only see their own campus
  const visibleCampuses = isCampusLeader
    ? campuses.filter(c => c.id === currentUser.campusId)
    : campuses;

  const getRegistrationUrl = (campusId: string) => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/register/${campusId}`;
    }
    // Fallback for SSR, though we won't render the QR code until mounted
    return `http://localhost:3000/register/${campusId}`;
  };

  const getQRImageUrl = (campusId: string, size: number = 200) => {
    const registrationUrl = getRegistrationUrl(campusId);
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(registrationUrl)}&format=png&margin=10`;
  };

  const copyLink = useCallback((campusId: string) => {
    const url = getRegistrationUrl(campusId);
    navigator.clipboard.writeText(url);
    setCopiedId(campusId);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  const downloadQR = useCallback(async (campusId: string, campusName: string) => {
    const filename = `${campusName.replace(/\s+/g, '-').toLowerCase()}-qr-code.png`;
    setDownloadError('');
    setDownloadingId(campusId);
    try {
      const res = await fetch(`/api/admin/campus-qr?campusId=${encodeURIComponent(campusId)}&size=512`, {
        credentials: 'include',
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Could not download the QR code.');
      }
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : 'Could not download the QR code.');
    } finally {
      setDownloadingId(null);
    }
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <QrCode className="w-8 h-8 text-primary" />
          Campus QR Codes
        </h1>
        <p className="text-muted-foreground mt-1">
          Share these QR codes so new members can register directly to a specific campus.
          {isCampusLeader && (
            <span className="text-amber-500"> · Showing your campus only</span>
          )}
        </p>
      </div>

      {/* Info Banner */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-start gap-3">
        <QrCode className="w-5 h-5 text-primary mt-0.5 shrink-0" />
        <div className="text-sm">
          <p className="font-medium text-foreground">How it works</p>
          <p className="text-muted-foreground mt-0.5">
            When someone scans a campus QR code, they&apos;re taken directly to the registration page
            with the campus already selected. After they submit, you&apos;ll receive the request in the
            <strong> Requests</strong> tab for approval.
          </p>
        </div>
      </div>

      {downloadError && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {downloadError}
        </div>
      )}

      {/* QR Code Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mounted && visibleCampuses.map(campus => {
          const url = getRegistrationUrl(campus.id);
          const qrImageUrl = getQRImageUrl(campus.id);
          const isCopied = copiedId === campus.id;

          return (
            <Card key={campus.id} className="border-border/50 hover:shadow-lg transition-all duration-300 group">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-primary" />
                    <CardTitle className="text-lg">{campus.name}</CardTitle>
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    {campus.pastor}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* QR Code */}
                <div className="flex items-center justify-center p-6 bg-white rounded-xl border border-border/30">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrImageUrl}
                    alt={`QR Code for ${campus.name}`}
                    width={200}
                    height={200}
                    className="rounded-md"
                  />
                </div>

                {/* URL Preview */}
                <div className="bg-muted/30 rounded-lg p-2.5 flex items-center gap-2 text-xs">
                  <ExternalLink className="w-3 h-3 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground truncate font-mono">{url}</span>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs"
                    onClick={() => downloadQR(campus.id, campus.name)}
                    disabled={downloadingId === campus.id}
                  >
                    <Download className="w-3.5 h-3.5" />
                    {downloadingId === campus.id ? 'Downloading…' : 'Download PNG'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className={`gap-1.5 text-xs transition-all ${isCopied ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' : ''}`}
                    onClick={() => copyLink(campus.id)}
                  >
                    {isCopied ? (
                      <><Check className="w-3.5 h-3.5" /> Copied!</>
                    ) : (
                      <><Copy className="w-3.5 h-3.5" /> Copy Link</>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {visibleCampuses.length === 0 && (
        <div className="text-center py-16">
          <QrCode className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">No campuses available</p>
        </div>
      )}
    </div>
  );
}
