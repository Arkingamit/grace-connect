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

  const addGroup = useCallback(async (name: string, scope: string = 'global') => {
    const res = await fetch('/api/admin/groups', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, scope }),
    });
    if (res.ok) {
      const created = await res.json();
      const mapped = mapId(created);
      setGroupScopes(prev => [...prev, { name: mapped.name, scope: mapped.scope, id: mapped.id }]);
      setGroups(prev => Array.from(new Set([...prev, mapped.name])));
    }
  }, []);

  const deleteGroup = useCallback(async (name: string, scope: string) => {
    const group = groupScopes.find(g => g.name === name && g.scope === scope);
    if (group && (group as any).id) {
      const res = await fetch(`/api/admin/groups/${(group as any).id}`, { method: 'DELETE' });
      if (res.ok) {
        setGroupScopes(prev => prev.filter(g => !(g.name === name && g.scope === scope)));
        setGroups(prev => {
          const remainingWithSameName = groupScopes.filter(g => g.name === name && g.scope !== scope);
          if (remainingWithSameName.length === 0) {
            return prev.filter(g => g !== name);
          }
          return prev;
        });
      }
    }
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
