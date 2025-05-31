import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { User, Session } from '@supabase/supabase-js';
import toast from 'react-hot-toast';

interface AuthUser extends User {
  nome?: string;
  is_admin?: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, nome: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        // Buscar dados adicionais do usuário
        const response = await fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        });

        if (response.ok) {
          const userData = await response.json();
          setUser({
            ...session.user,
            nome: userData.user.nome,
            is_admin: userData.user.is_admin
          });
        } else {
          setUser(session.user);
        }
        setSession(session);
      } else {
        setUser(null);
        setSession(null);
      }
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
      setUser(null);
      setSession(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Verificar sessão inicial
    refreshUser();

    // Escutar mudanças na autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          if (session?.user) {
            try {
              const response = await fetch('/api/auth/me', {
                headers: {
                  'Authorization': `Bearer ${session.access_token}`
                }
              });

              if (response.ok) {
                const userData = await response.json();
                setUser({
                  ...session.user,
                  nome: userData.user.nome,
                  is_admin: userData.user.is_admin
                });
              } else {
                setUser(session.user);
              }
            } catch (error) {
              console.error('Erro ao buscar dados do usuário:', error);
              setUser(session.user);
            }
            setSession(session);
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setSession(null);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao fazer login');
      }

      // Definir sessão no Supabase
      const { error } = await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });

      if (error) {
        throw error;
      }

      setUser({
        ...data.session.user,
        nome: data.user.nome,
        is_admin: data.user.is_admin
      });
      setSession(data.session);

      toast.success('Login realizado com sucesso!');
    } catch (error: any) {
      console.error('Erro no login:', error);
      toast.error(error.message || 'Erro ao fazer login');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, nome: string) => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, nome }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao criar conta');
      }

      toast.success('Conta criada! Verifique seu email para confirmar.');
    } catch (error: any) {
      console.error('Erro no registro:', error);
      toast.error(error.message || 'Erro ao criar conta');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        throw error;
      }

      // Chamar API para logout
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });

      setUser(null);
      setSession(null);
      
      toast.success('Logout realizado com sucesso!');
    } catch (error: any) {
      console.error('Erro no logout:', error);
      toast.error(error.message || 'Erro ao fazer logout');
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao enviar email de recuperação');
      }

      toast.success('Email de recuperação enviado!');
    } catch (error: any) {
      console.error('Erro na recuperação de senha:', error);
      toast.error(error.message || 'Erro ao enviar email de recuperação');
      throw error;
    }
  };

  const updatePassword = async (password: string) => {
    try {
      const { error } = await supabase.auth.updateUser({ password });
      
      if (error) {
        throw error;
      }

      toast.success('Senha atualizada com sucesso!');
    } catch (error: any) {
      console.error('Erro ao atualizar senha:', error);
      toast.error(error.message || 'Erro ao atualizar senha');
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    session,
    loading,
    isAdmin: user?.is_admin || false,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};