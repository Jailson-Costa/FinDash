import { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

export type Meta = {
  id: string;
  usuario_id: string;
  categoria: string; // 'total' for total monthly spending, or specific category name
  valor: number;
  mes: string; // 'YYYY-MM'
};

export function useMetas() {
  const { user } = useAuth();
  const [metas, setMetas] = useState<Meta[]>([]);

  useEffect(() => {
    if (!user) return;
    const storedMetas = localStorage.getItem(`metas_${user.id}`);
    if (storedMetas) {
      try {
        setMetas(JSON.parse(storedMetas));
      } catch (e) {
        console.error('Error parsing metas from localStorage', e);
      }
    }
  }, [user]);

  const saveMetas = (newMetas: Meta[]) => {
    if (!user) return;
    setMetas(newMetas);
    localStorage.setItem(`metas_${user.id}`, JSON.stringify(newMetas));
  };

  const addMeta = (meta: Omit<Meta, 'id' | 'usuario_id'>) => {
    if (!user) return;
    const newMeta: Meta = {
      ...meta,
      id: crypto.randomUUID(),
      usuario_id: user.id,
    };
    saveMetas([...metas, newMeta]);
  };

  const updateMeta = (id: string, updates: Partial<Omit<Meta, 'id' | 'usuario_id'>>) => {
    saveMetas(metas.map(m => m.id === id ? { ...m, ...updates } : m));
  };

  const deleteMeta = (id: string) => {
    saveMetas(metas.filter(m => m.id !== id));
  };

  return { metas, addMeta, updateMeta, deleteMeta };
}
