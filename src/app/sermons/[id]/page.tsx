import { redirect } from 'next/navigation';

export default function SermonRedirectPage({ params }: { params: { id: string } }) {
  redirect(`/sermons?sermon=${encodeURIComponent(params.id)}`);
}
