import { useState, useCallback } from 'react';
import { UserProfile } from '@/lib/types';
import { mapId } from '@/lib/hooks/utils';

export function useUsers() {
  const [users, setUsers] = useState<UserProfile[]>([]);

  const addUser = useCallback(async (u: Omit<UserProfile, 'id'>) => {
    const res = await fetch('/api/admin/users', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(u),
    });
    if (res.ok) {
      const created = await res.json();
      setUsers(prev => [...prev, { ...created, id: created._id }]);
    }
  }, []);

  const updateUser = useCallback(async (id: string, u: Partial<UserProfile>) => {
    const res = await fetch(`/api/admin/users/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(u),
    });
    if (res.ok) {
      const updated = await res.json();
      setUsers(prev => prev.map(user => user.id === id ? { ...user, ...updated, id: updated._id } : user));
    }
  }, []);

  const deleteUser = useCallback(async (id: string) => {
    const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
    if (res.ok) setUsers(prev => prev.filter(u => u.id !== id));
  }, []);

  return {
    users,
    setUsers,
    addUser,
    updateUser,
    deleteUser,
  };
}
