import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Building, Mail, Phone } from 'lucide-react';
import toast from 'react-hot-toast';

interface Plano {
  id: string;
  nome: string;
  icone_url?: string;
  email_reembolso?: string;
  telefone_reembolso?: string;
  observacoes?: string;
  created_at: string;
}

const PlansPage: React.FC = () => {
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPlano, setEditingPlano] = useState<Plano | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    icone_url: '',
    email_reembolso: '',
    telefone_reembolso: '',
    observacoes: ''
  });

  useEffect(() => {
    fetchPlanos();
  }, []);

  const fetchPlanos = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/plans', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPlanos(data.plans || []);
      } else {
        toast.error('Erro ao carregar planos');
      }
    } catch (error) {
      console.error('Erro ao carregar planos:', error);
      toast.error('Erro ao carregar planos');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nome.trim()) {
      toast.error('Nome do plano é obrigatório');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const url = editingPlano ? `/api/plans/${editingPlano.id}` : '/api/plans';
      const method = editingPlano ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        toast.success(editingPlano ? 'Plano atualizado!' : 'Plano criado!');
        setShowModal(false);
        setEditingPlano(null);
        setFormData({
          nome: '',
          icone_url: '',
          email_reembolso: '',
          telefone_reembolso: '',
          observacoes: ''
        });
        fetchPlanos();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Erro ao salvar plano');
      }
    } catch (error) {
      console.error('Erro ao salvar plano:', error);
      toast.error('Erro ao salvar plano');
    }
  };

  const handleEdit = (plano: Plano) => {
    setEditingPlano(plano);
    setFormData({
      nome: plano.nome,
      icone_url: plano.icone_url || '',
      email_reembolso: plano.email_reembolso || '',
      telefone_reembolso: plano.telefone_reembolso || '',
      observacoes: plano.observacoes || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este plano?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/plans/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        toast.success('Plano excluído!');
        fetchPlanos();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Erro ao excluir plano');
      }
    } catch (error) {
      console.error('Erro ao excluir plano:', error);
      toast.error('Erro ao excluir plano');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const openCreateModal = () => {
    setEditingPlano(null);
    setFormData({
      nome: '',
      icone_url: '',
      email_reembolso: '',
      telefone_reembolso: '',
      observacoes: ''
    });
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
            Planos de Saúde
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Gerencie seus planos de saúde e informações de contato
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="btn-primary flex items-center"
        >
          <Plus size={20} className="mr-2" />
          Novo Plano
        </button>
      </div>

      {/* Plans Grid */}
      {planos.length === 0 ? (
        <div className="card p-8 text-center">
          <Building size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Nenhum plano cadastrado
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Comece adicionando seu primeiro plano de saúde
          </p>
          <button
            onClick={openCreateModal}
            className="btn-primary"
          >
            <Plus size={20} className="mr-2" />
            Adicionar Primeiro Plano
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {planos.map((plano) => (
            <div key={plano.id} className="card p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  {plano.icone_url ? (
                    <img
                      src={plano.icone_url}
                      alt={plano.nome}
                      className="w-10 h-10 rounded-lg mr-3"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900 rounded-lg flex items-center justify-center mr-3">
                      <Building size={20} className="text-primary-600 dark:text-primary-400" />
                    </div>
                  )}
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      {plano.nome}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Criado em {new Date(plano.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleEdit(plano)}
                    className="p-2 text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(plano.id)}
                    className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {plano.email_reembolso && (
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 mb-2">
                  <Mail size={14} className="mr-2" />
                  {plano.email_reembolso}
                </div>
              )}

              {plano.telefone_reembolso && (
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 mb-2">
                  <Phone size={14} className="mr-2" />
                  {plano.telefone_reembolso}
                </div>
              )}

              {plano.observacoes && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">
                  {plano.observacoes}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              {editingPlano ? 'Editar Plano' : 'Novo Plano'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label required">
                  Nome do Plano
                </label>
                <input
                  type="text"
                  name="nome"
                  value={formData.nome}
                  onChange={handleChange}
                  className="input"
                  placeholder="Ex: Bradesco Saúde"
                  required
                />
              </div>

              <div>
                <label className="label">
                  URL do Ícone
                </label>
                <input
                  type="url"
                  name="icone_url"
                  value={formData.icone_url}
                  onChange={handleChange}
                  className="input"
                  placeholder="https://exemplo.com/icone.png"
                />
              </div>

              <div>
                <label className="label">
                  Email para Reembolso
                </label>
                <input
                  type="email"
                  name="email_reembolso"
                  value={formData.email_reembolso}
                  onChange={handleChange}
                  className="input"
                  placeholder="reembolso@plano.com.br"
                />
              </div>

              <div>
                <label className="label">
                  Telefone para Reembolso
                </label>
                <input
                  type="tel"
                  name="telefone_reembolso"
                  value={formData.telefone_reembolso}
                  onChange={handleChange}
                  className="input"
                  placeholder="(11) 1234-5678"
                />
              </div>

              <div>
                <label className="label">
                  Observações
                </label>
                <textarea
                  name="observacoes"
                  value={formData.observacoes}
                  onChange={handleChange}
                  className="input"
                  rows={3}
                  placeholder="Informações adicionais sobre o plano..."
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
                  {editingPlano ? 'Atualizar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlansPage;