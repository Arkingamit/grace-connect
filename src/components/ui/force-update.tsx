import React from 'react';
import { Button } from './button';
import { DownloadCloud, Smartphone } from 'lucide-react';

type ForceUpdateProps = {
  storeUrl?: string;
  message?: string;
};

export function ForceUpdate({
  storeUrl,
  message = "We've added some exciting new features and improvements. Please update your app to the latest version to continue using Grace Connect.",
}: ForceUpdateProps) {
  const handleUpdate = () => {
    if (storeUrl) {
      window.open(storeUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
      <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-primary/20">
        <DownloadCloud className="w-12 h-12 text-primary" />
      </div>

      <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
        Time to Update!
      </h1>

      <p className="text-muted-foreground text-lg mb-8 max-w-md mx-auto leading-relaxed">
        {message}
      </p>

      <div className="space-y-4 w-full max-w-xs">
        <Button size="lg" className="w-full gap-2 text-md h-12 rounded-xl" onClick={handleUpdate}>
          <Smartphone className="w-5 h-5" />
          Update Now
        </Button>
      </div>

      <p className="mt-12 text-xs text-muted-foreground font-medium uppercase tracking-widest">
        Grace Connect
      </p>
    </div>
  );
}
