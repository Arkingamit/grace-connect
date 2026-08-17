export function mapId<T extends { _id?: string }>(item: T): T & { id: string } {
  return { ...item, id: item._id || (item as any).id || '' };
}

export function mapIds<T extends { _id?: string }>(items: T[]): (T & { id: string })[] {
  return items.map(mapId);
}
