import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../config/api';
import { User } from '../types/user.types';
import { toast } from '../utils/toast';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
  loading: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      loadUser();
    } else {
      setLoading(false);
    }
  }, []);

  const loadUser = async () => {
    try {
      const { data } = await api.get('/users/me');
      setUser(data);
    } catch (error) {
      console.error('Failed to load user:', error);
      localStorage.clear();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const { data } = await api.post('/auth/login', { email, password });
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      setUser(data.user);
      toast.success('Connexion réussie');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur de connexion');
      throw error;
    }
  };

  const register = async (registerData: any) => {
    try {
      await api.post('/auth/register', registerData);
      toast.success('Inscription réussie');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur d\'inscription');
      throw error;
    }
  };

  const logout = () => {
    localStorage.clear();
    setUser(null);
    toast.info('Déconnexion réussie');
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, refreshUser: loadUser, isAuthenticated: !!user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
