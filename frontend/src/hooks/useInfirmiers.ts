import { useState, useEffect } from 'react';
import { User } from '../types';
import api from '../config/api';

export const useInfirmiers = () => {
  const [infirmiers, setInfirmiers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInfirmiers = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/users/infirmiers');
      setInfirmiers(data);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const createInfirmier = async (dto: Partial<User> & { password: string }) => {
    await api.post('/users/infirmiers', dto);
    await fetchInfirmiers();
  };

  const toggleActive = async (id: string) => {
    await api.patch(`/users/infirmiers/${id}/toggle-active`);
    await fetchInfirmiers();
  };

  useEffect(() => {
    fetchInfirmiers();
  }, []);

  return { infirmiers, loading, error, createInfirmier, toggleActive, refetch: fetchInfirmiers };
};
