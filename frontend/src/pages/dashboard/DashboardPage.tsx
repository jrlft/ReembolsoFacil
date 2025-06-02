import React from 'react';

const DashboardPage: React.FC = () => {
  return (
    <div>
      <h1 className="text-3xl font-semibold text-gray-800 dark:text-white mb-6">Meu Dashboard</h1>
      <p className="text-gray-600 dark:text-gray-300">Visão geral dos seus reembolsos e ações rápidas.</p>
      {/* Conteúdo do DashboardPage virá aqui (ex: cards Kanban, botão "Inicie um controle") */}
    </div>
  );
};

export default DashboardPage;