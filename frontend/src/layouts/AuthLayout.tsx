import React from 'react';
import { Outlet } from 'react-router-dom'; // Para renderizar rotas aninhadas

const AuthLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="w-full max-w-md">
        {/* Você pode adicionar um logo ou título aqui, se desejar */}
        {/* Exemplo:
        <div className="mb-8 text-center">
          <img src="/logo.png" alt="ReembolsoFácil Logo" className="w-32 h-auto mx-auto" />
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white mt-2">ReembolsoFácil</h1>
        </div>
        */}
        <main className="bg-white dark:bg-gray-800 shadow-xl rounded-lg p-6 sm:p-8">
          <Outlet /> {/* Páginas de Login, Cadastro, etc., serão renderizadas aqui */}
        </main>
        <footer className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>&copy; {new Date().getFullYear()} ReembolsoFácil. Todos os direitos reservados.</p>
        </footer>
      </div>
    </div>
  );
};

export default AuthLayout;