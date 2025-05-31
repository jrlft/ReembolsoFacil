const express = require('express');
const { supabaseAdmin } = require('../config/supabase');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Buscar perfil do usuário
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const { data: user, error } = await supabaseAdmin
      .from('usuarios')
      .select('*')
      .eq('id', req.user.id)
      .single();

    if (error) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Remover campos sensíveis
    const { password, ...userProfile } = user;

    res.json(userProfile);
  } catch (error) {
    console.error('Erro ao buscar perfil:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar perfil do usuário
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { nome, telefone, data_nascimento, endereco, observacoes } = req.body;

    if (!nome) {
      return res.status(400).json({ error: 'Nome é obrigatório' });
    }

    const { data: user, error } = await supabaseAdmin
      .from('usuarios')
      .update({
        nome,
        telefone,
        data_nascimento,
        endereco,
        observacoes,
        updated_at: new Date().toISOString()
      })
      .eq('id', req.user.id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Remover campos sensíveis
    const { password, ...userProfile } = user;

    res.json(userProfile);
  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Alterar senha
router.put('/change-password', authenticateToken, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'Senha atual e nova senha são obrigatórias' });
    }

    if (new_password.length < 6) {
      return res.status(400).json({ error: 'Nova senha deve ter pelo menos 6 caracteres' });
    }

    // Verificar senha atual (usando Supabase Auth)
    const { error: signInError } = await supabaseAdmin.auth.signInWithPassword({
      email: req.user.email,
      password: current_password
    });

    if (signInError) {
      return res.status(400).json({ error: 'Senha atual incorreta' });
    }

    // Atualizar senha
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      req.user.id,
      { password: new_password }
    );

    if (updateError) {
      return res.status(400).json({ error: updateError.message });
    }

    res.json({ message: 'Senha alterada com sucesso' });
  } catch (error) {
    console.error('Erro ao alterar senha:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Estatísticas do usuário
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    // Buscar planos do usuário
    const { data: plans, error: plansError } = await supabaseAdmin
      .from('planos_saude')
      .select('id')
      .eq('usuario_id', req.user.id);

    if (plansError) {
      return res.status(400).json({ error: plansError.message });
    }

    const planIds = plans.map(p => p.id);

    // Buscar dependentes
    const { data: dependents, error: depsError } = await supabaseAdmin
      .from('dependentes')
      .select('id')
      .in('plano_id', planIds);

    if (depsError) {
      return res.status(400).json({ error: depsError.message });
    }

    // Buscar reembolsos
    const { data: reimbursements, error: reimbError } = await supabaseAdmin
      .from('pedidos_reembolso')
      .select('id, status, valor_pago, valor_reembolsado, created_at, data_atendimento')
      .in('plano_id', planIds);

    if (reimbError) {
      return res.status(400).json({ error: reimbError.message });
    }

    // Buscar documentos
    const { data: documents, error: docsError } = await supabaseAdmin
      .from('documentos_reembolso')
      .select('id, tamanho_comprimido')
      .eq('usuario_id', req.user.id);

    if (docsError) {
      return res.status(400).json({ error: docsError.message });
    }

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    const thisYear = reimbursements.filter(r => 
      new Date(r.data_atendimento).getFullYear() === currentYear
    );
    const thisMonth = reimbursements.filter(r => {
      const date = new Date(r.data_atendimento);
      return date.getFullYear() === currentYear && date.getMonth() === currentMonth;
    });

    const stats = {
      planos_cadastrados: plans.length,
      dependentes_cadastrados: dependents.length,
      reembolsos: {
        total: reimbursements.length,
        ano_atual: thisYear.length,
        mes_atual: thisMonth.length,
        finalizados: reimbursements.filter(r => r.status === 'finalizado').length,
        em_andamento: reimbursements.filter(r => r.status !== 'finalizado').length
      },
      valores: {
        total_pago: reimbursements.reduce((sum, r) => sum + (r.valor_pago || 0), 0),
        total_reembolsado: reimbursements.reduce((sum, r) => sum + (r.valor_reembolsado || 0), 0),
        pago_ano_atual: thisYear.reduce((sum, r) => sum + (r.valor_pago || 0), 0),
        reembolsado_ano_atual: thisYear.reduce((sum, r) => sum + (r.valor_reembolsado || 0), 0),
        pago_mes_atual: thisMonth.reduce((sum, r) => sum + (r.valor_pago || 0), 0),
        reembolsado_mes_atual: thisMonth.reduce((sum, r) => sum + (r.valor_reembolsado || 0), 0)
      },
      documentos: {
        total: documents.length,
        tamanho_total_mb: (documents.reduce((sum, d) => sum + (d.tamanho_comprimido || 0), 0) / (1024 * 1024)).toFixed(2)
      }
    };

    // Calcular economias
    stats.valores.economia_total = stats.valores.total_pago - stats.valores.total_reembolsado;
    stats.valores.economia_ano_atual = stats.valores.pago_ano_atual - stats.valores.reembolsado_ano_atual;
    stats.valores.economia_mes_atual = stats.valores.pago_mes_atual - stats.valores.reembolsado_mes_atual;

    res.json(stats);
  } catch (error) {
    console.error('Erro ao buscar estatísticas do usuário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Deletar conta do usuário
router.delete('/account', authenticateToken, async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Senha é obrigatória para deletar a conta' });
    }

    // Verificar senha
    const { error: signInError } = await supabaseAdmin.auth.signInWithPassword({
      email: req.user.email,
      password
    });

    if (signInError) {
      return res.status(400).json({ error: 'Senha incorreta' });
    }

    // Deletar do auth (cascade vai deletar do banco)
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(req.user.id);
    
    if (authError) {
      return res.status(400).json({ error: authError.message });
    }

    res.json({ message: 'Conta deletada com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar conta:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Configurações de notificação
router.get('/notification-settings', authenticateToken, async (req, res) => {
  try {
    const { data: settings, error } = await supabaseAdmin
      .from('usuarios')
      .select('notification_settings')
      .eq('id', req.user.id)
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    const defaultSettings = {
      email_reminders: true,
      reminder_frequency_days: 3,
      status_updates: true,
      weekly_reports: false
    };

    res.json(settings.notification_settings || defaultSettings);
  } catch (error) {
    console.error('Erro ao buscar configurações de notificação:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar configurações de notificação
router.put('/notification-settings', authenticateToken, async (req, res) => {
  try {
    const { email_reminders, reminder_frequency_days, status_updates, weekly_reports } = req.body;

    const settings = {
      email_reminders: email_reminders !== undefined ? email_reminders : true,
      reminder_frequency_days: reminder_frequency_days || 3,
      status_updates: status_updates !== undefined ? status_updates : true,
      weekly_reports: weekly_reports !== undefined ? weekly_reports : false
    };

    const { data: user, error } = await supabaseAdmin
      .from('usuarios')
      .update({
        notification_settings: settings,
        updated_at: new Date().toISOString()
      })
      .eq('id', req.user.id)
      .select('notification_settings')
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json(user.notification_settings);
  } catch (error) {
    console.error('Erro ao atualizar configurações de notificação:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;