import React from 'react';
import { useParams } from 'react-router-dom';

const ReimbursementDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  return (
    <div>
      <h1 className="text-3xl font-semibold text-gray-800 dark:text-white mb-6">Detalhes do Reembolso #{id}</h1>
      <p className="text-gray-600 dark:text-gray-300">Detalhes do pedido de reembolso aparecerão aqui.</p>
      {/* Conteúdo do ReimbursementDetailPage virá aqui */}
    </div>
  );
};

export default ReimbursementDetailPage;