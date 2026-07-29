import React from 'react';
import AdminLayoutClient from './admin-layout-client';
import { LiveStreamPoller } from '@/components/live-stream-poller';
import connectToDatabase from '@/lib/db';
import { AdminActionLoadingProvider } from '@/components/admin/admin-action-loading';

export const dynamic = 'force-dynamic';

/**
 * Admin Layout — wraps only /admin/* routes.
 * AdminDataProvider is already available from the global Providers wrapper.
 * LiveStreamPoller is scoped here so it only runs for admin users,
 * not for every public visitor.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await connectToDatabase();

  return (
    <>
      <LiveStreamPoller />
      <AdminLayoutClient>
        <AdminActionLoadingProvider>{children}</AdminActionLoadingProvider>
      </AdminLayoutClient>
    </>
  );
}
