import { useState, useCallback } from 'react';
import { GalleryAlbum } from '@/lib/types';
import { mapId } from '@/lib/hooks/utils';

export function useGallery() {
  const [galleryAlbums, setGalleryAlbums] = useState<GalleryAlbum[]>([]);
  const [galleryAlbumUrl, setGalleryAlbumUrlState] = useState('');

  const addGalleryAlbum = useCallback(async (a: Omit<GalleryAlbum, 'id'>) => {
    const res = await fetch('/api/admin/media/gallery', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(a),
    });
    if (res.ok) {
      const created = await res.json();
      setGalleryAlbums(prev => [...prev, mapId(created)]);
    }
  }, []);

  const updateGalleryAlbum = useCallback(async (id: string, a: Partial<GalleryAlbum>) => {
    const res = await fetch(`/api/admin/media/gallery/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(a),
    });
    if (res.ok) {
      const updated = await res.json();
      setGalleryAlbums(prev => prev.map(album => album.id === id ? mapId(updated) : album));
    }
  }, []);

  const deleteGalleryAlbum = useCallback(async (id: string) => {
    const res = await fetch(`/api/admin/media/gallery/${id}`, { method: 'DELETE' });
    if (res.ok) setGalleryAlbums(prev => prev.filter(a => a.id !== id));
  }, []);

  const reorderGalleryAlbums = useCallback((albums: GalleryAlbum[]) => {
    const reordered = albums.map((a, i) => ({ ...a, sortOrder: i }));
    setGalleryAlbums(reordered);
    fetch('/api/admin/media/gallery/reorder', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: reordered.map(a => ({ id: a.id, sortOrder: a.sortOrder })) }),
    });
  }, []);

  const setGalleryAlbumUrl = useCallback((url: string) => setGalleryAlbumUrlState(url), []);

  return {
    galleryAlbums,
    setGalleryAlbums,
    galleryAlbumUrl,
    setGalleryAlbumUrl,
    addGalleryAlbum,
    updateGalleryAlbum,
    deleteGalleryAlbum,
    reorderGalleryAlbums,
  };
}
