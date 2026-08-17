import { useState, useCallback } from 'react';
import { Campus, Group } from '@/lib/types';
import { mapId } from '@/lib/hooks/utils';

export function useCampuses() {
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [groups, setGroups] = useState<string[]>([]);
  const [groupScopes, setGroupScopes] = useState<Group[]>([]);

  const addCampus = useCallback(async (c: Omit<Campus, 'id'>) => {
    const res = await fetch('/api/admin/campuses', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(c),
    });
    if (res.ok) {
      const created = await res.json();
      setCampuses(prev => [...prev, mapId(created)]);
    }
  }, []);

  const updateCampus = useCallback(async (id: string, c: Partial<Campus>) => {
    const res = await fetch(`/api/admin/campuses/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(c),
    });
    if (res.ok) {
      const updated = await res.json();
      setCampuses(prev => prev.map(campus => campus.id === id ? mapId(updated) : campus));
    }
  }, []);

  const deleteCampus = useCallback(async (id: string) => {
    const res = await fetch(`/api/admin/campuses/${id}`, { method: 'DELETE' });
    if (res.ok) setCampuses(prev => prev.filter(c => c.id !== id));
  }, []);

  const addGroup = useCallback(async (
    name: string,
    scope: string = 'global',
    leaderId?: string,
    coreGroupId?: string
  ) => {
    const res = await fetch('/api/admin/groups', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        scope,
        leaderId: leaderId || undefined,
        coreGroupId: coreGroupId || undefined,
      }),
    });
    if (res.ok) {
      const created = await res.json();
      const mapped = mapId(created);
      setGroupScopes(prev => [...prev, {
        name: mapped.name,
        scope: mapped.scope,
        id: mapped.id,
        coreGroupId: mapped.coreGroupId ? String(mapped.coreGroupId) : null,
      }]);
      setGroups(prev => Array.from(new Set([...prev, mapped.name])));
      return { success: true as const, group: mapped, leader: created.leader || null };
    }
    const data = await res.json().catch(() => ({}));
    return { success: false as const, error: data.error || 'Failed to create group' };
  }, []);

  const deleteGroup = useCallback(async (name: string, scope: string, id?: string) => {
    const group =
      (id && groupScopes.find((g) => (g as any).id === id)) ||
      groupScopes.find((g) => g.name === name && g.scope === scope) ||
      groupScopes.find((g) => g.name === name);

    const groupId = id || (group as any)?.id;
    if (!groupId) {
      return { success: false as const, error: 'Group not found' };
    }

    const res = await fetch(`/api/admin/groups/${groupId}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { success: false as const, error: data.error || 'Failed to delete group' };
    }

    const deletedName = group?.name || name;
    const deletedScope = group?.scope || scope;
    setGroupScopes((prev) =>
      prev.filter((g) => {
        if ((g as any).id && (g as any).id === groupId) return false;
        return !(g.name === deletedName && g.scope === deletedScope);
      })
    );
    setGroups((prev) => {
      const stillExists = groupScopes.some(
        (g) => g.name === deletedName && ((g as any).id ? (g as any).id !== groupId : g.scope !== deletedScope)
      );
      if (stillExists) return prev;
      return prev.filter((g) => g !== deletedName);
    });
    return { success: true as const };
  }, [groupScopes]);

  return {
    campuses,
    setCampuses,
    groups,
    setGroups,
    groupScopes,
    setGroupScopes,
    addCampus,
    updateCampus,
    deleteCampus,
    addGroup,
    deleteGroup,
  };
}
