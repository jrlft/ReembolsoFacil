import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, User, Stethoscope, Building, DollarSign, Save } from 'lucide-react';
import toast from 'react-hot-toast';

interface Plano {
  id: string;
  nome: string;
  icone_url?: string;
}

interface Dependente {
  id: string;
  nome: string;
  relacao: string;
}

interface TipoAtendimento {
  id: string;
  nome: string;
  categoria: string;
}

const CreateReimbursementPage: React.FC = () => {
  const [formData, setFormData] = useState({
    plano_id: '',
    dependente_id: '',
    tipo_atendimento_id: '',
    data_atendimento: '',
    data_fim_periodo: '',
    especialidade: '',
    nome_medico: '',
    nome_clinica: '',
    valor_pago: '',
    observacoes: ''
  });
  
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [dependentes, setDependentes] = useState<Dependente[]>([]);
  const [tiposAtendimento, setTiposAtendimento] = useState<TipoAtendimento[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  
  const navigate = useNavigate();

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoadingData(true);
      const token = localStorage.getItem('token');
      
      // Buscar planos
      const planosResponse = await fetch('/api/plans', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (planosResponse.ok) {
        const planosData = await planosResponse.json();
        setPlanos(planosData.plans || []);
      }

      // Buscar tipos de atendimento
      const tiposResponse = await fetch('/api/reimbursements/types', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (tiposResponse.ok) {
        const tiposData = await tiposResponse.json();
        setTiposAtendimento(tiposData.types || []);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados iniciais');
    } finally {
      setLoadingData(false);
    }
  };

  const fetchDependentes = async (planoId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/dependents?plano_id=${planoId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setDependentes(data.dependents || []);
      }
    } catch (error) {
      console.error('Erro ao carregar dependentes:', error);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Quando selecionar um plano, buscar dependentes
    if (name === 'plano_id' && value) {
      fetchDependentes(value);
      setFormData(prev => ({ ...prev, dependente_id: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.plano_id || !formData.dependente_id || !formData.data_atendimento) {
      toast.error('Por favor, preencha os campos obrigatórios');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/reimbursements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          valor_pago: formData.valor_pago ? parseFloat(formData.valor_pago) : null
        })
      });

      if (response.ok) {
        const data = await response.json();
        toast.success('Reembolso criado com sucesso!');
        navigate(`/reimbursements/${data.reimbursement.id}`);
      } else {
        const error = await response.json();
        toast.error(error.message || 'Erro ao criar reembolso');
      }
    } catch (error) {
      console.error('Erro ao criar reembolso:', error);
      toast.error('Erro ao criar reembolso');
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner w-8 h-8"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <button
          onClick={() => navigate('/dashboard')}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Criar Novo Reembolso
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Inicie o controle do seu reembolso, mesmo sem todos os documentos
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="card p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Plano e Dependente */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="label required">
                <Building size={16} className="mr-2" />
                Plano de Saúde
              </label>
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
              <label className="label required">
                <User size={16} className="mr-2" />
                Dependente
              </label>
              <select
                name="dependente_id"
                value={formData.dependente_id}
                onChange={handleChange}
                className="input"
                required
                disabled={!formData.plano_id}
              >
                <option value="">Selecione um dependente</option>
                {dependentes.map(dependente => (
                  <option key={dependente.id} value={dependente.id}>
                    {dependente.nome} ({dependente.relacao})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Tipo de Atendimento e Especialidade */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="label">
                <Stethoscope size={16} className="mr-2" />
                Tipo de Atendimento
              </label>
              <select
                name="tipo_atendimento_id"
                value={formData.tipo_atendimento_id}
                onChange={handleChange}
                className="input"
              >
                <option value="">Selecione o tipo</option>
                {tiposAtendimento.map(tipo => (
                  <option key={tipo.id} value={tipo.id}>
                    {tipo.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">
                <Stethoscope size={16} className="mr-2" />
                Especialidade
              </label>
              <input
                type="text"
                name="especialidade"
                value={formData.especialidade}
                onChange={handleChange}
                className="input"
                placeholder="Ex: Pediatria, Psicologia"
              />
            </div>
          </div>

          {/* Datas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="label required">
                <Calendar size={16} className="mr-2" />
                Data do Atendimento
              </label>
              <input
                type="date"
                name="data_atendimento"
                value={formData.data_atendimento}
                onChange={handleChange}
                className="input"
                required
              />
            </div>

            <div>
              <label className="label">
                <Calendar size={16} className="mr-2" />
                Data Fim do Período
              </label>
              <input
                type="date"
                name="data_fim_periodo"
                value={formData.data_fim_periodo}
                onChange={handleChange}
                className="input"
              />
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Para terapias recorrentes (opcional)
              </p>
            </div>
          </div>

          {/* Médico e Clínica */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="label">
                <User size={16} className="mr-2" />
                Nome do Médico
              </label>
              <input
                type="text"
                name="nome_medico"
                value={formData.nome_medico}
                onChange={handleChange}
                className="input"
                placeholder="Dr. João Silva"
              />
            </div>

            <div>
              <label className="label">
                <Building size={16} className="mr-2" />
                Nome da Clínica
              </label>
              <input
                type="text"
                name="nome_clinica"
                value={formData.nome_clinica}
                onChange={handleChange}
                className="input"
                placeholder="Clínica São Paulo"
              />
            </div>
          </div>

          {/* Valor */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="label">
                <DollarSign size={16} className="mr-2" />
                Valor Pago
              </label>
              <input
                type="number"
                name="valor_pago"
                value={formData.valor_pago}
                onChange={handleChange}
                className="input"
                placeholder="0,00"
                step="0.01"
                min="0"
              />
            </div>
          </div>

          {/* Observações */}
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
              placeholder="Informações adicionais sobre o atendimento..."
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="btn-secondary"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex items-center"
            >
              {loading ? (
                <div className="spinner mr-2" />
              ) : (
                <Save size={20} className="mr-2" />
              )}
              {loading ? 'Criando...' : 'Criar Reembolso'}
            </button>
          </div>
        </form>
      </div>

      {/* Info Card */}
      <div className="card p-6 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
          💡 Dica
        </h3>
        <p className="text-blue-800 dark:text-blue-200 text-sm">
          Você pode criar o reembolso agora e adicionar os documentos depois. 
          O sistema irá te guiar através de cada etapa do processo.
        </p>
      </div>
    </div>
  );
};

export default CreateReimbursementPage;