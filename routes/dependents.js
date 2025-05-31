const express = require('express');
const { supabaseAdmin } = require('../config/supabase');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Listar dependentes do usuário
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { plano_id } = req.query;
    
    let query = supabaseAdmin
      .from('dependentes')
      .select(`
        *,
        planos_saude!inner(nome, usuario_id)
      `)
      .eq('planos_saude.usuario_id', req.user.id)
      .order('created_at', { ascending: false });

    if (plano_id) {
      query = query.eq('plano_id', plano_id);
    }

    const { data: dependents, error } = await query;

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json(dependents);
  } catch (error) {
    console.error('Erro ao listar dependentes:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Buscar dependente específico
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { data: dependent, error } = await supabaseAdmin
      .from('dependentes')
      .select(`
        *,
        planos_saude!inner(nome, usuario_id)
      `)
      .eq('id', req.params.id)
      .eq('planos_saude.usuario_id', req.user.id)
      .single();

    if (error) {
      return res.status(404).json({ error: 'Dependente não encontrado' });
    }

    res.json(dependent);
  } catch (error) {
    console.error('Erro ao buscar dependente:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar novo dependente
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { plano_id, nome, relacao, data_nascimento, cpf, observacoes } = req.body;

    if (!plano_id || !nome || !relacao) {
      return res.status(400).json({ error: 'Plano, nome e relação são obrigatórios' });
    }

    // Verificar se o plano pertence ao usuário
    const { data: plan, error: planError } = await supabaseAdmin
      .from('planos_saude')
      .select('id')
      .eq('id', plano_id)
      .eq('usuario_id', req.user.id)
      .single();

    if (planError || !plan) {
      return res.status(400).json({ error: 'Plano não encontrado ou não pertence ao usuário' });
    }

    const { data: dependent, error } = await supabaseAdmin
      .from('dependentes')
      .insert([
        {
          plano_id,
          nome,
          relacao,
          data_nascimento,
          cpf,
          observacoes,
          created_at: new Date().toISOString()
        }
      ])
      .select(`
        *,
        planos_saude(nome)
      `)
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json(dependent);
  } catch (error) {
    console.error('Erro ao criar dependente:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar dependente
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { nome, relacao, data_nascimento, cpf, observacoes } = req.body;

    if (!nome || !relacao) {
      return res.status(400).json({ error: 'Nome e relação são obrigatórios' });
    }

    // Verificar se o dependente pertence ao usuário
    const { data: existingDependent, error: checkError } = await supabaseAdmin
      .from('dependentes')
      .select(`
        id,
        planos_saude!inner(usuario_id)
      `)
      .eq('id', req.params.id)
      .eq('planos_saude.usuario_id', req.user.id)
      .single();

    if (checkError || !existingDependent) {
      return res.status(404).json({ error: 'Dependente não encontrado' });
    }

    const { data: dependent, error } = await supabaseAdmin
      .from('dependentes')
      .update({
        nome,
        relacao,
        data_nascimento,
        cpf,
        observacoes,
        updated_at: new Date().toISOString()
      })
      .eq('id', req.params.id)
      .select(`
        *,
        planos_saude(nome)
      `)
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json(dependent);
  } catch (error) {
    console.error('Erro ao atualizar dependente:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Deletar dependente
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    // Verificar se existem reembolsos associados
    const { data: reimbursements, error: reimbError } = await supabaseAdmin
      .from('pedidos_reembolso')
      .select('id')
      .eq('dependente_id', req.params.id);

    if (reimbError) {
      return res.status(400).json({ error: reimbError.message });
    }

    if (reimbursements && reimbursements.length > 0) {
      return res.status(400).json({ 
        error: 'Não é possível deletar dependente com reembolsos cadastrados.' 
      });
    }

    // Verificar se o dependente pertence ao usuário
    const { data: existingDependent, error: checkError } = await supabaseAdmin
      .from('dependentes')
      .select(`
        id,
        planos_saude!inner(usuario_id)
      `)
      .eq('id', req.params.id)
      .eq('planos_saude.usuario_id', req.user.id)
      .single();

    if (checkError || !existingDependent) {
      return res.status(404).json({ error: 'Dependente não encontrado' });
    }

    const { error } = await supabaseAdmin
      .from('dependentes')
      .delete()
      .eq('id', req.params.id);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Dependente deletado com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar dependente:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Listar tipos de relação disponíveis
router.get('/relations/available', (req, res) => {
  const availableRelations = [
    { id: 'titular', name: 'Titular' },
    { id: 'conjuge', name: 'Cônjuge' },
    { id: 'filho', name: 'Filho(a)' },
    { id: 'pai', name: 'Pai' },
    { id: 'mae', name: 'Mãe' },
    { id: 'irmao', name: 'Irmão(ã)' },
    { id: 'sogro', name: 'Sogro(a)' },
    { id: 'genro', name: 'Genro/Nora' },
    { id: 'neto', name: 'Neto(a)' },
    { id: 'outro', name: 'Outro' }
  ];

  res.json(availableRelations);
});

// Estatísticas do dependente
router.get('/:id/stats', authenticateToken, async (req, res) => {
  try {
    // Verificar se o dependente pertence ao usuário
    const { data: existingDependent, error: checkError } = await supabaseAdmin
      .from('dependentes')
      .select(`
        id,
        planos_saude!inner(usuario_id)
      `)
      .eq('id', req.params.id)
      .eq('planos_saude.usuario_id', req.user.id)
      .single();

    if (checkError || !existingDependent) {
      return res.status(404).json({ error: 'Dependente não encontrado' });
    }

    const { data: reimbursements, error } = await supabaseAdmin
      .from('pedidos_reembolso')
      .select('status, valor_pago, valor_reembolsado, tipo_atendimento, data_atendimento')
      .eq('dependente_id', req.params.id);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    const currentYear = new Date().getFullYear();
    const currentYearReimbursements = reimbursements.filter(r => 
      new Date(r.data_atendimento).getFullYear() === currentYear
    );

    const stats = {
      total_reembolsos: reimbursements.length,
      reembolsos_ano_atual: currentYearReimbursements.length,
      finalizados: reimbursements.filter(r => r.status === 'finalizado').length,
      em_andamento: reimbursements.filter(r => r.status !== 'finalizado').length,
      valor_total_pago: reimbursements.reduce((sum, r) => sum + (r.valor_pago || 0), 0),
      valor_total_reembolsado: reimbursements.reduce((sum, r) => sum + (r.valor_reembolsado || 0), 0),
      valor_pago_ano_atual: currentYearReimbursements.reduce((sum, r) => sum + (r.valor_pago || 0), 0),
      valor_reembolsado_ano_atual: currentYearReimbursements.reduce((sum, r) => sum + (r.valor_reembolsado || 0), 0),
      por_tipo: reimbursements.reduce((acc, r) => {
        acc[r.tipo_atendimento] = (acc[r.tipo_atendimento] || 0) + 1;
        return acc;
      }, {}),
      por_status: reimbursements.reduce((acc, r) => {
        acc[r.status] = (acc[r.status] || 0) + 1;
        return acc;
      }, {})
    };

    stats.economia_total = stats.valor_total_pago - stats.valor_total_reembolsado;
    stats.economia_ano_atual = stats.valor_pago_ano_atual - stats.valor_reembolsado_ano_atual;

    res.json(stats);
  } catch (error) {
    console.error('Erro ao buscar estatísticas do dependente:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;