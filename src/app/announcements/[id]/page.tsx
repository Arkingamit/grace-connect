import { redirect } from 'next/navigation';

export default function AnnouncementRedirectPage({ params }: { params: { id: string } }) {
  redirect(`/announcements?id=${encodeURIComponent(params.id)}`);
}
