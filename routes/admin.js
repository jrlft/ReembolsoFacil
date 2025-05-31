const express = require('express');
const { supabaseAdmin } = require('../config/supabase');
const { authenticateAdmin } = require('../middleware/auth');
const router = express.Router();

// Dashboard administrativo
router.get('/dashboard', authenticateAdmin, async (req, res) => {
  try {
    // Estatísticas gerais
    const { data: users, error: usersError } = await supabaseAdmin
      .from('usuarios')
      .select('id, created_at, is_admin');

    const { data: plans, error: plansError } = await supabaseAdmin
      .from('planos_saude')
      .select('id, created_at');

    const { data: reimbursements, error: reimbError } = await supabaseAdmin
      .from('pedidos_reembolso')
      .select('id, status, valor_pago, valor_reembolsado, created_at');

    const { data: documents, error: docsError } = await supabaseAdmin
      .from('documentos_reembolso')
      .select('id, tamanho_comprimido, created_at');

    if (usersError || plansError || reimbError || docsError) {
      return res.status(400).json({ error: 'Erro ao buscar estatísticas' });
    }

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const stats = {
      users: {
        total: users.length,
        admins: users.filter(u => u.is_admin).length,
        new_last_30_days: users.filter(u => new Date(u.created_at) >= thirtyDaysAgo).length,
        new_last_7_days: users.filter(u => new Date(u.created_at) >= sevenDaysAgo).length
      },
      plans: {
        total: plans.length,
        new_last_30_days: plans.filter(p => new Date(p.created_at) >= thirtyDaysAgo).length
      },
      reimbursements: {
        total: reimbursements.length,
        by_status: reimbursements.reduce((acc, r) => {
          acc[r.status] = (acc[r.status] || 0) + 1;
          return acc;
        }, {}),
        total_paid: reimbursements.reduce((sum, r) => sum + (r.valor_pago || 0), 0),
        total_reimbursed: reimbursements.reduce((sum, r) => sum + (r.valor_reembolsado || 0), 0),
        new_last_30_days: reimbursements.filter(r => new Date(r.created_at) >= thirtyDaysAgo).length,
        new_last_7_days: reimbursements.filter(r => new Date(r.created_at) >= sevenDaysAgo).length
      },
      documents: {
        total: documents.length,
        total_size_mb: (documents.reduce((sum, d) => sum + (d.tamanho_comprimido || 0), 0) / (1024 * 1024)).toFixed(2),
        new_last_30_days: documents.filter(d => new Date(d.created_at) >= thirtyDaysAgo).length
      }
    };

    res.json(stats);
  } catch (error) {
    console.error('Erro no dashboard admin:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Listar todos os usuários
router.get('/users', authenticateAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '' } = req.query;

    let query = supabaseAdmin
      .from('usuarios')
      .select('*')
      .order('created_at', { ascending: false });

    if (search) {
      query = query.or(`nome.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data: users, error } = await query;

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Contar total
    const { count, error: countError } = await supabaseAdmin
      .from('usuarios')
      .select('*', { count: 'exact', head: true });

    res.json({
      data: users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Buscar usuário específico
router.get('/users/:id', authenticateAdmin, async (req, res) => {
  try {
    const { data: user, error } = await supabaseAdmin
      .from('usuarios')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Buscar estatísticas do usuário
    const { data: plans } = await supabaseAdmin
      .from('planos_saude')
      .select('id')
      .eq('usuario_id', req.params.id);

    const { data: reimbursements } = await supabaseAdmin
      .from('pedidos_reembolso')
      .select('id, status, valor_pago, valor_reembolsado')
      .in('plano_id', plans?.map(p => p.id) || []);

    const userStats = {
      total_plans: plans?.length || 0,
      total_reimbursements: reimbursements?.length || 0,
      total_paid: reimbursements?.reduce((sum, r) => sum + (r.valor_pago || 0), 0) || 0,
      total_reimbursed: reimbursements?.reduce((sum, r) => sum + (r.valor_reembolsado || 0), 0) || 0,
      reimbursements_by_status: reimbursements?.reduce((acc, r) => {
        acc[r.status] = (acc[r.status] || 0) + 1;
        return acc;
      }, {}) || {}
    };

    res.json({
      ...user,
      stats: userStats
    });
  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar usuário
router.put('/users/:id', authenticateAdmin, async (req, res) => {
  try {
    const { nome, email, is_admin } = req.body;

    const updateData = {
      updated_at: new Date().toISOString()
    };

    if (nome !== undefined) updateData.nome = nome;
    if (email !== undefined) updateData.email = email;
    if (is_admin !== undefined) updateData.is_admin = is_admin;

    const { data: user, error } = await supabaseAdmin
      .from('usuarios')
      .update(updateData)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Se mudou o email, atualizar no auth também
    if (email !== undefined) {
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
        req.params.id,
        { email }
      );

      if (authError) {
        console.error('Erro ao atualizar email no auth:', authError);
      }
    }

    res.json(user);
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Deletar usuário
router.delete('/users/:id', authenticateAdmin, async (req, res) => {
  try {
    // Verificar se não é o próprio admin
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: 'Não é possível deletar sua própria conta' });
    }

    // Deletar do auth primeiro
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(req.params.id);
    
    if (authError) {
      console.error('Erro ao deletar do auth:', authError);
    }

    // Deletar do banco (cascade vai deletar relacionados)
    const { error } = await supabaseAdmin
      .from('usuarios')
      .delete()
      .eq('id', req.params.id);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Usuário deletado com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar usuário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Redefinir senha do usuário
router.post('/users/:id/reset-password', authenticateAdmin, async (req, res) => {
  try {
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Senha deve ter pelo menos 6 caracteres' });
    }

    const { error } = await supabaseAdmin.auth.admin.updateUserById(
      req.params.id,
      { password }
    );

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Senha redefinida com sucesso' });
  } catch (error) {
    console.error('Erro ao redefinir senha:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Listar todos os reembolsos (para monitoramento)
router.get('/reimbursements', authenticateAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, user_id } = req.query;

    let query = supabaseAdmin
      .from('pedidos_reembolso')
      .select(`
        *,
        planos_saude!inner(nome, usuario_id),
        dependentes!inner(nome),
        usuarios!inner(nome, email)
      `)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    if (user_id) {
      query = query.eq('planos_saude.usuario_id', user_id);
    }

    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data: reimbursements, error } = await query;

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({
      data: reimbursements,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Erro ao listar reembolsos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Estatísticas detalhadas
router.get('/stats/detailed', authenticateAdmin, async (req, res) => {
  try {
    const { period = '30' } = req.query; // dias
    const periodDays = parseInt(period);
    const startDate = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);

    // Usuários por período
    const { data: usersByDay, error: usersError } = await supabaseAdmin
      .from('usuarios')
      .select('created_at')
      .gte('created_at', startDate.toISOString());

    // Reembolsos por período
    const { data: reimbursementsByDay, error: reimbError } = await supabaseAdmin
      .from('pedidos_reembolso')
      .select('created_at, status, valor_pago, valor_reembolsado')
      .gte('created_at', startDate.toISOString());

    if (usersError || reimbError) {
      return res.status(400).json({ error: 'Erro ao buscar estatísticas detalhadas' });
    }

    // Agrupar por dia
    const usersByDayGrouped = {};
    const reimbursementsByDayGrouped = {};

    usersByDay.forEach(user => {
      const day = new Date(user.created_at).toISOString().split('T')[0];
      usersByDayGrouped[day] = (usersByDayGrouped[day] || 0) + 1;
    });

    reimbursementsByDay.forEach(reimb => {
      const day = new Date(reimb.created_at).toISOString().split('T')[0];
      if (!reimbursementsByDayGrouped[day]) {
        reimbursementsByDayGrouped[day] = {
          count: 0,
          total_paid: 0,
          total_reimbursed: 0,
          by_status: {}
        };
      }
      reimbursementsByDayGrouped[day].count++;
      reimbursementsByDayGrouped[day].total_paid += reimb.valor_pago || 0;
      reimbursementsByDayGrouped[day].total_reimbursed += reimb.valor_reembolsado || 0;
      reimbursementsByDayGrouped[day].by_status[reimb.status] = 
        (reimbursementsByDayGrouped[day].by_status[reimb.status] || 0) + 1;
    });

    res.json({
      period_days: periodDays,
      users_by_day: usersByDayGrouped,
      reimbursements_by_day: reimbursementsByDayGrouped
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas detalhadas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Logs do sistema (simulado)
router.get('/logs', authenticateAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 50, level = 'all' } = req.query;

    // Em uma implementação real, isso viria de um sistema de logs
    // Por enquanto, vamos simular com atividades recentes
    const { data: recentActivity, error } = await supabaseAdmin
      .from('pedidos_reembolso')
      .select(`
        id,
        status,
        created_at,
        updated_at,
        usuarios!inner(nome, email),
        planos_saude!inner(nome)
      `)
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    const logs = recentActivity.map(activity => ({
      id: activity.id,
      timestamp: activity.updated_at,
      level: 'info',
      message: `Reembolso ${activity.status} - ${activity.usuarios.nome}`,
      details: {
        user: activity.usuarios.email,
        plan: activity.planos_saude.nome,
        status: activity.status
      }
    }));

    res.json({
      data: logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Erro ao buscar logs:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Backup de dados (exportar)
router.get('/backup', authenticateAdmin, async (req, res) => {
  try {
    const { table } = req.query;

    if (!table) {
      return res.status(400).json({ error: 'Tabela é obrigatória' });
    }

    const allowedTables = ['usuarios', 'planos_saude', 'dependentes', 'pedidos_reembolso'];
    
    if (!allowedTables.includes(table)) {
      return res.status(400).json({ error: 'Tabela não permitida' });
    }

    const { data, error } = await supabaseAdmin
      .from(table)
      .select('*');

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${table}_backup_${new Date().toISOString().split('T')[0]}.json"`);
    res.json(data);
  } catch (error) {
    console.error('Erro no backup:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;