const express = require('express');
const { supabaseAdmin } = require('../config/supabase');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Listar planos do usuário
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { data: plans, error } = await supabaseAdmin
      .from('planos_saude')
      .select('*')
      .eq('usuario_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json(plans);
  } catch (error) {
    console.error('Erro ao listar planos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Buscar plano específico
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { data: plan, error } = await supabaseAdmin
      .from('planos_saude')
      .select('*')
      .eq('id', req.params.id)
      .eq('usuario_id', req.user.id)
      .single();

    if (error) {
      return res.status(404).json({ error: 'Plano não encontrado' });
    }

    res.json(plan);
  } catch (error) {
    console.error('Erro ao buscar plano:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar novo plano
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { nome, icone_url, email_reembolso, telefone_reembolso, observacoes } = req.body;

    if (!nome) {
      return res.status(400).json({ error: 'Nome do plano é obrigatório' });
    }

    const { data: plan, error } = await supabaseAdmin
      .from('planos_saude')
      .insert([
        {
          usuario_id: req.user.id,
          nome,
          icone_url,
          email_reembolso, // Corrigido para corresponder ao frontend e schema
          telefone_reembolso, // Corrigido para corresponder ao frontend e schema
          observacoes,
          created_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json(plan);
  } catch (error) {
    console.error('Erro ao criar plano:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar plano
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { nome, icone_url, email_reembolso, telefone_reembolso, observacoes } = req.body;

    if (!nome) {
      return res.status(400).json({ error: 'Nome do plano é obrigatório' });
    }

    const { data: plan, error } = await supabaseAdmin
      .from('planos_saude')
      .update({
        nome,
        icone_url,
        email_reembolso, // Corrigido para corresponder ao frontend e schema
        telefone_reembolso, // Corrigido para corresponder ao frontend e schema
        observacoes,
        updated_at: new Date().toISOString()
      })
      .eq('id', req.params.id)
      .eq('usuario_id', req.user.id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    if (!plan) {
      return res.status(404).json({ error: 'Plano não encontrado' });
    }

    res.json(plan);
  } catch (error) {
    console.error('Erro ao atualizar plano:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Deletar plano
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    // Verificar se existem dependentes ou reembolsos associados
    const { data: dependents, error: depsError } = await supabaseAdmin
      .from('dependentes')
      .select('id')
      .eq('plano_id', req.params.id);

    if (depsError) {
      return res.status(400).json({ error: depsError.message });
    }

    if (dependents && dependents.length > 0) {
      return res.status(400).json({ 
        error: 'Não é possível deletar plano com dependentes cadastrados. Remova os dependentes primeiro.' 
      });
    }

    const { data: reimbursements, error: reimbError } = await supabaseAdmin
      .from('pedidos_reembolso')
      .select('id')
      .eq('plano_id', req.params.id);

    if (reimbError) {
      return res.status(400).json({ error: reimbError.message });
    }

    if (reimbursements && reimbursements.length > 0) {
      return res.status(400).json({ 
        error: 'Não é possível deletar plano com reembolsos cadastrados.' 
      });
    }

    const { error } = await supabaseAdmin
      .from('planos_saude')
      .delete()
      .eq('id', req.params.id)
      .eq('usuario_id', req.user.id);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Plano deletado com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar plano:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Listar ícones disponíveis
router.get('/icons/available', (req, res) => {
  const availableIcons = [
    { id: 'bradesco', name: 'Bradesco Saúde', url: '/icons/bradesco.png' },
    { id: 'amil', name: 'Amil', url: '/icons/amil.png' },
    { id: 'unimed', name: 'Unimed', url: '/icons/unimed.png' },
    { id: 'sulamerica', name: 'SulAmérica', url: '/icons/sulamerica.png' },
    { id: 'hapvida', name: 'Hapvida', url: '/icons/hapvida.png' },
    { id: 'notredame', name: 'NotreDame Intermédica', url: '/icons/notredame.png' },
    { id: 'prevent', name: 'Prevent Senior', url: '/icons/prevent.png' },
    { id: 'golden', name: 'Golden Cross', url: '/icons/golden.png' },
    { id: 'cassi', name: 'Cassi', url: '/icons/cassi.png' },
    { id: 'geap', name: 'Geap', url: '/icons/geap.png' },
    { id: 'generic', name: 'Genérico', url: '/icons/generic.png' }
  ];

  res.json(availableIcons);
});

// Estatísticas do plano
router.get('/:id/stats', authenticateToken, async (req, res) => {
  try {
    const { data: reimbursements, error } = await supabaseAdmin
      .from('pedidos_reembolso')
      .select('status, valor_pago, valor_reembolsado, tipo_atendimento')
      .eq('plano_id', req.params.id);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    const stats = {
      total_reembolsos: reimbursements.length,
      finalizados: reimbursements.filter(r => r.status === 'finalizado').length,
      em_andamento: reimbursements.filter(r => r.status !== 'finalizado').length,
      valor_total_pago: reimbursements.reduce((sum, r) => sum + (r.valor_pago || 0), 0),
      valor_total_reembolsado: reimbursements.reduce((sum, r) => sum + (r.valor_reembolsado || 0), 0),
      por_tipo: reimbursements.reduce((acc, r) => {
        acc[r.tipo_atendimento] = (acc[r.tipo_atendimento] || 0) + 1;
        return acc;
      }, {}),
      por_status: reimbursements.reduce((acc, r) => {
        acc[r.status] = (acc[r.status] || 0) + 1;
        return acc;
      }, {})
    };

    stats.economia = stats.valor_total_pago - stats.valor_total_reembolsado;

    res.json(stats);
  } catch (error) {
    console.error('Erro ao buscar estatísticas do plano:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;