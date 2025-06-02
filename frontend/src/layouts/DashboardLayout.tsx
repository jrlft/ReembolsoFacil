import React, { useState } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { Home, Users, Settings, LogOut, Menu, X, Sun, Moon, FileText, Shield } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext'; 
import { useTheme } from '../contexts/ThemeContext';

const DashboardLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { logout, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login'); // Redireciona para login após logout
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
      // Tratar erro de logout se necessário
    }
  };

  const navItems = [
    { name: 'Dashboard', icon: Home, path: '/dashboard' },
    { name: 'Meus Planos', icon: FileText, path: '/dashboard/plans' },
    { name: 'Dependentes', icon: Users, path: '/dashboard/dependents' },
    { name: 'Configurações', icon: Settings, path: '/dashboard/settings' },
  ];

  // Adiciona o item de menu Admin apenas se o usuário for admin
  if (user?.role === 'admin') {
    navItems.push({ name: 'Admin', icon: Shield, path: '/admin/dashboard' });
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
          <Link to="/dashboard" className="text-2xl font-bold text-gray-800 dark:text-white">
            ReembolsoFácil
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
          <div className="flex-1"></div> {/* Espaçador */}
          <button
            onClick={toggleTheme} // toggleTheme já é uma função que não recebe 'current' diretamente aqui
            className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200"
            aria-label="Alternar tema"
          >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
        </header>

        {/* Área de Conteúdo */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 dark:bg-gray-900 p-6">
          <Outlet /> {/* Conteúdo da página específica será renderizado aqui */}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;