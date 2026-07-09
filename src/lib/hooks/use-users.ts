import { useState, useCallback } from 'react';
import { UserProfile } from '@/lib/types';
import { mapId } from '@/lib/hooks/utils';

export function useUsers() {
  const [users, setUsers] = useState<UserProfile[]>([]);

  const addUser = useCallback(async (u: Omit<UserProfile, 'id'>) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(u),
      });
      if (res.ok) {
        const created = await res.json();
        setUsers(prev => [...prev, { ...created, id: created._id }]);
        return { success: true };
      } else {
        const data = await res.json();
        return { success: false, error: data.error || 'Failed to add user' };
      }
    } catch (err: any) {
      return { success: false, error: err.message || 'An error occurred' };
    }
  }, []);

  const updateUser = useCallback(async (id: string, u: Partial<UserProfile>) => {
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(u),
      });
      if (res.ok) {
        const updated = await res.json();
        setUsers(prev => prev.map(user => user.id === id ? { ...user, ...updated, id: updated._id } : user));
        return { success: true };
      } else {
        const data = await res.json();
        return { success: false, error: data.error || 'Failed to update user' };
      }
    } catch (err: any) {
      return { success: false, error: err.message || 'An error occurred' };
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
