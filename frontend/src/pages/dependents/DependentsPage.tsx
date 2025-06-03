import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, User, Users, Calendar, Shield } from 'lucide-react';
import toast from 'react-hot-toast';

interface Dependente {
  id: string;
  nome: string;
  relacao: string;
  data_nascimento?: string;
  cpf?: string;
  plano_id: string;
  plano_nome?: string; // Adicionado para exibição
  created_at: string;
}

interface Plano {
  id: string;
  nome: string;
}

const DependentsPage: React.FC = () => {
  const [dependentes, setDependentes] = useState<Dependente[]>([]);
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingDependente, setEditingDependente] = useState<Dependente | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    relacao: '',
    data_nascimento: '',
    cpf: '',
    plano_id: ''
  });

  useEffect(() => {
    fetchDependentesEPlanos();
  }, []);

  const fetchDependentesEPlanos = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      let planosData: { plans?: Plano[] } = {}; // Definir planosData aqui
      
      // Fetch Planos
      const planosResponse = await fetch('/api/plans', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (planosResponse.ok) {
        planosData = await planosResponse.json(); // Atribuir valor aqui
        setPlanos(planosData.plans || []);
      } else {
        toast.error('Erro ao carregar planos');
      }

      // Fetch Dependentes
      const dependentesResponse = await fetch('/api/dependents', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (dependentesResponse.ok) {
        const dependentesData = await dependentesResponse.json();
        // Adicionar nome do plano aos dependentes para exibição
        const dependentesComPlanoNome = (dependentesData.dependents || []).map((dep: Dependente) => {
          const plano = (planosData.plans || []).find((p: Plano) => p.id === dep.plano_id);
          return { ...dep, plano_nome: plano ? plano.nome : 'N/A' };
        });
        setDependentes(dependentesComPlanoNome);
      } else {
        toast.error('Erro ao carregar dependentes');
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nome.trim() || !formData.relacao.trim() || !formData.plano_id) {
      toast.error('Nome, Relação e Plano são obrigatórios');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const url = editingDependente ? `/api/dependents/${editingDependente.id}` : '/api/dependents';
      const method = editingDependente ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        toast.success(editingDependente ? 'Dependente atualizado!' : 'Dependente criado!');
        setShowModal(false);
        setEditingDependente(null);
        setFormData({ nome: '', relacao: '', data_nascimento: '', cpf: '', plano_id: '' });
        fetchDependentesEPlanos(); // Re-fetch para atualizar a lista
      } else {
        const error = await response.json();
        toast.error(error.message || 'Erro ao salvar dependente');
      }
    } catch (error) {
      console.error('Erro ao salvar dependente:', error);
      toast.error('Erro ao salvar dependente');
    }
  };

  const handleEdit = (dependente: Dependente) => {
    setEditingDependente(dependente);
    setFormData({
      nome: dependente.nome,
      relacao: dependente.relacao,
      data_nascimento: dependente.data_nascimento ? dependente.data_nascimento.split('T')[0] : '', // Formatar data
      cpf: dependente.cpf || '',
      plano_id: dependente.plano_id
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este dependente?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/dependents/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        toast.success('Dependente excluído!');
        fetchDependentesEPlanos(); // Re-fetch para atualizar a lista
      } else {
        const error = await response.json();
        toast.error(error.message || 'Erro ao excluir dependente');
      }
    } catch (error) {
      console.error('Erro ao excluir dependente:', error);
      toast.error('Erro ao excluir dependente');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const openCreateModal = () => {
    setEditingDependente(null);
    setFormData({ nome: '', relacao: '', data_nascimento: '', cpf: '', plano_id: '' });
    setShowModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner w-8 h-8"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Dependentes
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Gerencie os dependentes associados aos seus planos de saúde
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="btn-primary flex items-center"
        >
          <Plus size={20} className="mr-2" />
          Novo Dependente
        </button>
      </div>

      {/* Dependents Grid */}
      {dependentes.length === 0 ? (
        <div className="card p-8 text-center">
          <Users size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Nenhum dependente cadastrado
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Adicione seus dependentes para facilitar a criação de reembolsos
          </p>
          <button
            onClick={openCreateModal}
            className="btn-primary"
          >
            <Plus size={20} className="mr-2" />
            Adicionar Primeiro Dependente
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dependentes.map((dependente) => (
            <div key={dependente.id} className="card p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900 rounded-lg flex items-center justify-center mr-3">
                    <User size={20} className="text-primary-600 dark:text-primary-400" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      {dependente.nome}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {dependente.relacao}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleEdit(dependente)}
                    className="p-2 text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(dependente.id)}
                    className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                {dependente.plano_nome && (
                  <div className="flex items-center">
                    <Shield size={14} className="mr-2" />
                    Plano: {dependente.plano_nome}
                  </div>
                )}
                {dependente.data_nascimento && (
                  <div className="flex items-center">
                    <Calendar size={14} className="mr-2" />
                    Nascimento: {new Date(dependente.data_nascimento).toLocaleDateString()}
                  </div>
                )}
                {dependente.cpf && (
                  <div className="flex items-center">
                    <User size={14} className="mr-2" /> {/* Usar ícone genérico para CPF */}
                    CPF: {dependente.cpf}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              {editingDependente ? 'Editar Dependente' : 'Novo Dependente'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label required">Nome Completo</label>
                <input
                  type="text"
                  name="nome"
                  value={formData.nome}
                  onChange={handleChange}
                  className="input"
                  placeholder="Nome do dependente"
                  required
                />
              </div>

              <div>
                <label className="label required">Relação</label>
                <input
                  type="text"
                  name="relacao"
                  value={formData.relacao}
                  onChange={handleChange}
                  className="input"
                  placeholder="Ex: Filho(a), Cônjuge"
                  required
                />
              </div>

              <div>
                <label className="label required">Plano de Saúde</label>
                <select
                  name="plano_id"
                  value={formData.plano_id}
                  onChange={handleChange}
                  className="input"
                  required
                >
                  <option value="">Selecione um plano</option>
                  {planos.map(plano => (
                    <option key={plano.id} value={plano.id}>
                      {plano.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Data de Nascimento</label>
                <input
                  type="date"
                  name="data_nascimento"
                  value={formData.data_nascimento}
                  onChange={handleChange}
                  className="input"
                />
              </div>

              <div>
                <label className="label">CPF</label>
                <input
                  type="text"
                  name="cpf"
                  value={formData.cpf}
                  onChange={handleChange}
                  className="input"
                  placeholder="000.000.000-00"
                />
              </div>

              <div className="flex items-center justify-end space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                >
                  {editingDependente ? 'Atualizar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DependentsPage;