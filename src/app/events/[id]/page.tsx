import { redirect } from 'next/navigation';

export default function EventRsvpRedirectPage({ params }: { params: { id: string } }) {
  redirect(`/events?rsvp=${encodeURIComponent(params.id)}`);
}
