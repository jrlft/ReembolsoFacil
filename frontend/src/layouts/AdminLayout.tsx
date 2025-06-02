import React, { useState } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { Users, Settings, LogOut, Menu, X, Sun, Moon, LayoutDashboard, BarChart3 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

const AdminLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { signOut, user } = useAuth(); // user pode ser usado para verificações de role adicionais se necessário
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  // Verifica se o usuário é admin, caso contrário redireciona
  // Isso é uma proteção básica no lado do cliente, a proteção real deve estar no backend/rotas
  React.useEffect(() => {
    if (user?.role !== 'admin') {
      navigate('/dashboard'); // Ou para uma página de "não autorizado"
    }
  }, [user, navigate]);

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    }
  };

  const navItems = [
    { name: 'Visão Geral', icon: LayoutDashboard, path: '/admin/dashboard' },
    { name: 'Gerenciar Usuários', icon: Users, path: '/admin/users' },
    { name: 'Relatórios', icon: BarChart3, path: '/admin/reports' },
    { name: 'Configurações Sistema', icon: Settings, path: '/admin/settings' },
  ];

  if (user?.role !== 'admin') {
    // Renderiza nada ou um loader enquanto redireciona para evitar flash de conteúdo não autorizado
    return null; 
  }

  return (
    <div className={`flex h-screen bg-gray-100 dark:bg-gray-900 ${theme}`}>
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-64 bg-white dark:bg-gray-800 shadow-lg transform ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } transition-transform duration-300 ease-in-out md:relative md:translate-x-0 md:shadow-none`}
      >
        <div className="flex items-center justify-between p-4 h-16 border-b dark:border-gray-700">
          <Link to="/admin/dashboard" className="text-2xl font-bold text-gray-800 dark:text-white">
            Admin RFácil
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="text-gray-500 dark:text-gray-400 md:hidden"
            aria-label="Fechar menu"
          >
            <X size={24} />
          </button>
        </div>
        <nav className="py-4">
          {navItems.map((item) => (
            <Link
              key={item.name}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              className="flex items-center px-4 py-3 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200"
            >
              <item.icon size={20} className="mr-3" />
              {item.name}
            </Link>
          ))}
        </nav>
        <div className="absolute bottom-0 w-full p-4 border-t dark:border-gray-700">
          <button
            onClick={handleLogout}
            className="flex items-center w-full px-4 py-3 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200 rounded-md"
          >
            <LogOut size={20} className="mr-3" />
            Sair
          </button>
        </div>
      </aside>

      {/* Overlay para fechar sidebar em mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black opacity-50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Conteúdo Principal */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between p-4 h-16 bg-white dark:bg-gray-800 shadow-md md:shadow-none border-b dark:border-gray-700">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-gray-500 dark:text-gray-400 md:hidden"
            aria-label="Abrir menu"
          >
            <Menu size={24} />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-semibold text-gray-700 dark:text-gray-200">Painel Administrativo</h1>
          </div>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200"
            aria-label="Alternar tema"
          >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
        </header>

        {/* Área de Conteúdo */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 dark:bg-gray-900 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;