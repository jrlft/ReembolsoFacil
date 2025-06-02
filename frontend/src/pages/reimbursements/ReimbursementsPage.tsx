import React from 'react';

const ReimbursementsPage: React.FC = () => {
  return (
    <div>
      <h1 className="text-3xl font-semibold text-gray-800 dark:text-white mb-6">Meus Pedidos de Reembolso</h1>
      <p className="text-gray-600 dark:text-gray-300">Gerencie seus pedidos de reembolso aqui.</p>
      {/* Conteúdo do ReimbursementsPage virá aqui (ex: Tabela/Kanban de pedidos) */}
    </div>
  );
};

export default ReimbursementsPage;