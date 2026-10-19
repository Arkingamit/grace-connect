import { redirect } from 'next/navigation';

export default function GalleryRedirectPage({ params }: { params: { id: string } }) {
  redirect(`/gallery?album=${encodeURIComponent(params.id)}`);
}
