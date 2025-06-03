import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, TrendingUp, FileText, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

interface Reembolso {
  id: string;
  especialidade: string;
  nome_medico: string;
  nome_clinica: string;
  data_atendimento: string;
  valor_pago: number;
  status: string;
  plano_nome: string;
  dependente_nome: string;
}

interface Stats {
  total_reembolsos: number;
  valor_total_pago: number;
  valor_total_reembolsado: number;
  pendentes: number;
}

const DashboardPage: React.FC = () => {
  const [reembolsos, setReembolsos] = useState<Reembolso[]>([]);
  const [stats, setStats] = useState<Stats>({
    total_reembolsos: 0,
    valor_total_pago: 0,
    valor_total_reembolsado: 0,
    pendentes: 0
  });
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Buscar reembolsos
      const reembolsosResponse = await fetch('/api/reimbursements', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (reembolsosResponse.ok) {
        const reembolsosData = await reembolsosResponse.json();
        setReembolsos(reembolsosData.reimbursements || []);
      }

      // Buscar estatísticas
      const statsResponse = await fetch('/api/reports/dashboard', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData.stats || stats);
      }
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'inicio': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'documentos-pendentes': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'pronto-envio': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'protocolo-aberto': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200';
      case 'documentacao-pendente': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'finalizado': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'inicio': return 'Início';
      case 'documentos-pendentes': return 'Documentos Pendentes';
      case 'pronto-envio': return 'Pronto para Envio';
      case 'protocolo-aberto': return 'Protocolo Aberto';
      case 'documentacao-pendente': return 'Documentação Pendente';
      case 'finalizado': return 'Finalizado';
      default: return status;
    }
  };

  const groupReembolsosByStatus = () => {
    const groups = {
      'inicio': [] as Reembolso[],
      'documentos-pendentes': [] as Reembolso[],
      'pronto-envio': [] as Reembolso[],
      'protocolo-aberto': [] as Reembolso[],
      'documentacao-pendente': [] as Reembolso[],
      'finalizado': [] as Reembolso[]
    };

    reembolsos.forEach(reembolso => {
      if (groups[reembolso.status as keyof typeof groups]) {
        groups[reembolso.status as keyof typeof groups].push(reembolso);
      }
    });

    return groups;
  };

  const handleCreateReembolso = () => {
    navigate('/reimbursements/create');
  };

  const handleReembolsoClick = (id: string) => {
    navigate(`/reimbursements/${id}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner w-8 h-8"></div>
      </div>
    );
  }

  const groupedReembolsos = groupReembolsosByStatus();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Bem-vindo, {user?.nome || 'Usuário'}! Gerencie seus reembolsos aqui.
          </p>
        </div>
      </div>

      {/* Botão Principal */}
      <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">
              Inicie um controle de reembolso aqui
            </h2>
            <p className="text-primary-100 mb-4">
              Comece organizando sua consulta ou terapia, mesmo sem todos os documentos
            </p>
            <button
              onClick={handleCreateReembolso}
              className="bg-white text-primary-600 px-6 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center"
            >
              <Plus size={20} className="mr-2" />
              Criar Novo Reembolso
            </button>
          </div>
          <div className="hidden md:block">
            <FileText size={80} className="text-primary-200" />
          </div>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total de Reembolsos
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.total_reembolsos}
              </p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
              <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Valor Total Pago
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                R$ {stats.valor_total_pago.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <CheckCircle className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Valor Reembolsado
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                R$ {stats.valor_total_reembolsado.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-3 bg-orange-100 dark:bg-orange-900 rounded-lg">
              <Clock className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Pendentes
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.pendentes}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          Seus Reembolsos
        </h2>
        
        {reembolsos.length === 0 ? (
          <div className="card p-8 text-center">
            <FileText size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Nenhum reembolso encontrado
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Comece criando seu primeiro pedido de reembolso
            </p>
            <button
              onClick={handleCreateReembolso}
              className="btn-primary"
            >
              <Plus size={20} className="mr-2" />
              Criar Primeiro Reembolso
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-6 gap-6">
            {Object.entries(groupedReembolsos).map(([status, items]) => (
              <div key={status} className="kanban-column">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium text-gray-900 dark:text-white">
                    {getStatusText(status)}
                  </h3>
                  <span className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs px-2 py-1 rounded-full">
                    {items.length}
                  </span>
                </div>
                
                <div className="space-y-3">
                  {items.map((reembolso) => (
                    <div
                      key={reembolso.id}
                      onClick={() => handleReembolsoClick(reembolso.id)}
                      className="kanban-card"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                          {reembolso.especialidade}
                        </h4>
                        <span className={`badge text-xs ${getStatusColor(reembolso.status)}`}>
                          {getStatusText(reembolso.status)}
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                        Dr. {reembolso.nome_medico}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {reembolso.nome_clinica}
                      </p>
                      
                      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                        <span>{new Date(reembolso.data_atendimento).toLocaleDateString()}</span>
                        <span>R$ {reembolso.valor_pago?.toFixed(2) || '0,00'}</span>
                      </div>
                      
                      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        {reembolso.plano_nome} • {reembolso.dependente_nome}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;