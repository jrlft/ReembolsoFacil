const express = require('express');
const { supabaseAdmin } = require('../config/supabase');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Relatório geral do usuário
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const { period = '12' } = req.query; // meses
    const periodMonths = parseInt(period);
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - periodMonths);

    // Buscar todos os reembolsos do usuário
    const { data: reimbursements, error } = await supabaseAdmin
      .from('pedidos_reembolso')
      .select(`
        *,
        planos_saude!inner(nome, usuario_id),
        dependentes!inner(nome, relacao)
      `)
      .eq('planos_saude.usuario_id', req.user.id)
      .gte('created_at', startDate.toISOString());

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();

    // Filtros por período
    const thisYear = reimbursements.filter(r => 
      new Date(r.data_atendimento).getFullYear() === currentYear
    );
    
    const thisMonth = reimbursements.filter(r => {
      const date = new Date(r.data_atendimento);
      return date.getFullYear() === currentYear && date.getMonth() === currentMonth;
    });

    // Estatísticas gerais
    const stats = {
      total: {
        reembolsos: reimbursements.length,
        valor_pago: reimbursements.reduce((sum, r) => sum + (r.valor_pago || 0), 0),
        valor_reembolsado: reimbursements.reduce((sum, r) => sum + (r.valor_reembolsado || 0), 0),
        economia: 0
      },
      ano_atual: {
        reembolsos: thisYear.length,
        valor_pago: thisYear.reduce((sum, r) => sum + (r.valor_pago || 0), 0),
        valor_reembolsado: thisYear.reduce((sum, r) => sum + (r.valor_reembolsado || 0), 0),
        economia: 0
      },
      mes_atual: {
        reembolsos: thisMonth.length,
        valor_pago: thisMonth.reduce((sum, r) => sum + (r.valor_pago || 0), 0),
        valor_reembolsado: thisMonth.reduce((sum, r) => sum + (r.valor_reembolsado || 0), 0),
        economia: 0
      }
    };

    // Calcular economia (valor pago - valor reembolsado)
    stats.total.economia = stats.total.valor_pago - stats.total.valor_reembolsado;
    stats.ano_atual.economia = stats.ano_atual.valor_pago - stats.ano_atual.valor_reembolsado;
    stats.mes_atual.economia = stats.mes_atual.valor_pago - stats.mes_atual.valor_reembolsado;

    // Por tipo de atendimento
    const porTipo = reimbursements.reduce((acc, r) => {
      if (!acc[r.tipo_atendimento]) {
        acc[r.tipo_atendimento] = {
          quantidade: 0,
          valor_pago: 0,
          valor_reembolsado: 0,
          economia: 0
        };
      }
      acc[r.tipo_atendimento].quantidade++;
      acc[r.tipo_atendimento].valor_pago += r.valor_pago || 0;
      acc[r.tipo_atendimento].valor_reembolsado += r.valor_reembolsado || 0;
      acc[r.tipo_atendimento].economia = acc[r.tipo_atendimento].valor_pago - acc[r.tipo_atendimento].valor_reembolsado;
      return acc;
    }, {});

    // Por status
    const porStatus = reimbursements.reduce((acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    }, {});

    // Por dependente
    const porDependente = reimbursements.reduce((acc, r) => {
      const nome = r.dependentes.nome;
      if (!acc[nome]) {
        acc[nome] = {
          quantidade: 0,
          valor_pago: 0,
          valor_reembolsado: 0,
          economia: 0
        };
      }
      acc[nome].quantidade++;
      acc[nome].valor_pago += r.valor_pago || 0;
      acc[nome].valor_reembolsado += r.valor_reembolsado || 0;
      acc[nome].economia = acc[nome].valor_pago - acc[nome].valor_reembolsado;
      return acc;
    }, {});

    // Por plano
    const porPlano = reimbursements.reduce((acc, r) => {
      const nome = r.planos_saude.nome;
      if (!acc[nome]) {
        acc[nome] = {
          quantidade: 0,
          valor_pago: 0,
          valor_reembolsado: 0,
          economia: 0
        };
      }
      acc[nome].quantidade++;
      acc[nome].valor_pago += r.valor_pago || 0;
      acc[nome].valor_reembolsado += r.valor_reembolsado || 0;
      acc[nome].economia = acc[nome].valor_pago - acc[nome].valor_reembolsado;
      return acc;
    }, {});

    // Evolução mensal
    const evolucaoMensal = {};
    reimbursements.forEach(r => {
      const date = new Date(r.data_atendimento);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!evolucaoMensal[key]) {
        evolucaoMensal[key] = {
          quantidade: 0,
          valor_pago: 0,
          valor_reembolsado: 0,
          economia: 0
        };
      }
      
      evolucaoMensal[key].quantidade++;
      evolucaoMensal[key].valor_pago += r.valor_pago || 0;
      evolucaoMensal[key].valor_reembolsado += r.valor_reembolsado || 0;
      evolucaoMensal[key].economia = evolucaoMensal[key].valor_pago - evolucaoMensal[key].valor_reembolsado;
    });

    res.json({
      periodo_meses: periodMonths,
      estatisticas: stats,
      por_tipo: porTipo,
      por_status: porStatus,
      por_dependente: porDependente,
      por_plano: porPlano,
      evolucao_mensal: evolucaoMensal
    });
  } catch (error) {
    console.error('Erro no relatório dashboard:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Relatório por período específico
router.get('/period', authenticateToken, async (req, res) => {
  try {
    const { start_date, end_date, plano_id, dependente_id, tipo_atendimento } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({ error: 'Data de início e fim são obrigatórias' });
    }

    let query = supabaseAdmin
      .from('pedidos_reembolso')
      .select(`
        *,
        planos_saude!inner(nome, usuario_id),
        dependentes!inner(nome, relacao)
      `)
      .eq('planos_saude.usuario_id', req.user.id)
      .gte('data_atendimento', start_date)
      .lte('data_atendimento', end_date);

    if (plano_id) {
      query = query.eq('plano_id', plano_id);
    }

    if (dependente_id) {
      query = query.eq('dependente_id', dependente_id);
    }

    if (tipo_atendimento) {
      query = query.eq('tipo_atendimento', tipo_atendimento);
    }

    const { data: reimbursements, error } = await query.order('data_atendimento', { ascending: false });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    const summary = {
      total_reembolsos: reimbursements.length,
      valor_total_pago: reimbursements.reduce((sum, r) => sum + (r.valor_pago || 0), 0),
      valor_total_reembolsado: reimbursements.reduce((sum, r) => sum + (r.valor_reembolsado || 0), 0),
      economia_total: 0,
      por_status: reimbursements.reduce((acc, r) => {
        acc[r.status] = (acc[r.status] || 0) + 1;
        return acc;
      }, {}),
      por_tipo: reimbursements.reduce((acc, r) => {
        if (!acc[r.tipo_atendimento]) {
          acc[r.tipo_atendimento] = { quantidade: 0, valor_pago: 0, valor_reembolsado: 0 };
        }
        acc[r.tipo_atendimento].quantidade++;
        acc[r.tipo_atendimento].valor_pago += r.valor_pago || 0;
        acc[r.tipo_atendimento].valor_reembolsado += r.valor_reembolsado || 0;
        return acc;
      }, {})
    };

    summary.economia_total = summary.valor_total_pago - summary.valor_total_reembolsado;

    res.json({
      periodo: {
        inicio: start_date,
        fim: end_date
      },
      resumo: summary,
      reembolsos: reimbursements
    });
  } catch (error) {
    console.error('Erro no relatório por período:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Relatório de eficiência de reembolso
router.get('/efficiency', authenticateToken, async (req, res) => {
  try {
    const { data: reimbursements, error } = await supabaseAdmin
      .from('pedidos_reembolso')
      .select(`
        *,
        planos_saude!inner(nome, usuario_id),
        dependentes!inner(nome)
      `)
      .eq('planos_saude.usuario_id', req.user.id)
      .not('valor_pago', 'is', null)
      .not('valor_reembolsado', 'is', null);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Calcular eficiência por plano
    const eficienciaPorPlano = {};
    reimbursements.forEach(r => {
      const plano = r.planos_saude.nome;
      if (!eficienciaPorPlano[plano]) {
        eficienciaPorPlano[plano] = {
          total_pago: 0,
          total_reembolsado: 0,
          quantidade: 0,
          eficiencia_percentual: 0
        };
      }
      
      eficienciaPorPlano[plano].total_pago += r.valor_pago;
      eficienciaPorPlano[plano].total_reembolsado += r.valor_reembolsado;
      eficienciaPorPlano[plano].quantidade++;
    });

    // Calcular percentual de eficiência
    Object.keys(eficienciaPorPlano).forEach(plano => {
      const data = eficienciaPorPlano[plano];
      data.eficiencia_percentual = data.total_pago > 0 
        ? ((data.total_reembolsado / data.total_pago) * 100).toFixed(2)
        : 0;
    });

    // Calcular eficiência por tipo de atendimento
    const eficienciaPorTipo = {};
    reimbursements.forEach(r => {
      const tipo = r.tipo_atendimento;
      if (!eficienciaPorTipo[tipo]) {
        eficienciaPorTipo[tipo] = {
          total_pago: 0,
          total_reembolsado: 0,
          quantidade: 0,
          eficiencia_percentual: 0
        };
      }
      
      eficienciaPorTipo[tipo].total_pago += r.valor_pago;
      eficienciaPorTipo[tipo].total_reembolsado += r.valor_reembolsado;
      eficienciaPorTipo[tipo].quantidade++;
    });

    Object.keys(eficienciaPorTipo).forEach(tipo => {
      const data = eficienciaPorTipo[tipo];
      data.eficiencia_percentual = data.total_pago > 0 
        ? ((data.total_reembolsado / data.total_pago) * 100).toFixed(2)
        : 0;
    });

    // Tempo médio de processamento
    const reimbursementsWithDates = reimbursements.filter(r => 
      r.status === 'finalizado' && r.created_at && r.updated_at
    );

    const tempoMedioProcessamento = reimbursementsWithDates.length > 0
      ? reimbursementsWithDates.reduce((sum, r) => {
          const inicio = new Date(r.created_at);
          const fim = new Date(r.updated_at);
          return sum + (fim - inicio);
        }, 0) / reimbursementsWithDates.length / (1000 * 60 * 60 * 24) // em dias
      : 0;

    res.json({
      eficiencia_por_plano: eficienciaPorPlano,
      eficiencia_por_tipo: eficienciaPorTipo,
      tempo_medio_processamento_dias: Math.round(tempoMedioProcessamento),
      total_analisado: reimbursements.length
    });
  } catch (error) {
    console.error('Erro no relatório de eficiência:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Relatório de documentos pendentes
router.get('/pending-docs', authenticateToken, async (req, res) => {
  try {
    const { data: pendingReimbursements, error } = await supabaseAdmin
      .from('pedidos_reembolso')
      .select(`
        *,
        planos_saude!inner(nome, usuario_id),
        dependentes!inner(nome),
        documentos_reembolso(id, tipo_documento, created_at)
      `)
      .eq('planos_saude.usuario_id', req.user.id)
      .in('status', ['inicio', 'documentos_pendentes', 'documentacao_pendente']);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    const documentTypes = {
      'consulta': ['nota_fiscal', 'comprovante_pagamento'],
      'consulta_online': ['nota_fiscal', 'comprovante_pagamento'],
      'psicologia': ['nota_fiscal', 'comprovante_pagamento', 'encaminhamento_medico', 'relatorio_terapeuta'],
      'fisioterapia': ['nota_fiscal', 'comprovante_pagamento', 'encaminhamento_medico', 'relatorio_terapeuta'],
      'terapia_ocupacional': ['nota_fiscal', 'comprovante_pagamento', 'encaminhamento_medico', 'relatorio_terapeuta'],
      'fonoaudiologia': ['nota_fiscal', 'comprovante_pagamento', 'encaminhamento_medico', 'relatorio_terapeuta'],
      'nutricao': ['nota_fiscal', 'comprovante_pagamento', 'encaminhamento_medico'],
      'exame': ['nota_fiscal', 'comprovante_pagamento', 'pedido_medico']
    };

    const pendingAnalysis = pendingReimbursements.map(r => {
      const requiredDocs = documentTypes[r.tipo_atendimento] || [];
      const existingDocs = r.documentos_reembolso.map(d => d.tipo_documento);
      const missingDocs = requiredDocs.filter(doc => !existingDocs.includes(doc));
      
      return {
        id: r.id,
        tipo_atendimento: r.tipo_atendimento,
        dependente: r.dependentes.nome,
        plano: r.planos_saude.nome,
        data_atendimento: r.data_atendimento,
        status: r.status,
        documentos_necessarios: requiredDocs,
        documentos_existentes: existingDocs,
        documentos_faltantes: missingDocs,
        percentual_completo: ((existingDocs.length / requiredDocs.length) * 100).toFixed(1),
        dias_pendente: Math.floor((new Date() - new Date(r.created_at)) / (1000 * 60 * 60 * 24))
      };
    });

    const summary = {
      total_pendentes: pendingAnalysis.length,
      com_documentacao_completa: pendingAnalysis.filter(r => r.documentos_faltantes.length === 0).length,
      com_documentacao_parcial: pendingAnalysis.filter(r => r.documentos_faltantes.length > 0 && r.documentos_existentes.length > 0).length,
      sem_documentacao: pendingAnalysis.filter(r => r.documentos_existentes.length === 0).length,
      tempo_medio_pendencia: pendingAnalysis.length > 0 
        ? Math.round(pendingAnalysis.reduce((sum, r) => sum + r.dias_pendente, 0) / pendingAnalysis.length)
        : 0
    };

    res.json({
      resumo: summary,
      reembolsos_pendentes: pendingAnalysis
    });
  } catch (error) {
    console.error('Erro no relatório de documentos pendentes:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Exportar relatório em CSV (simulado)
router.get('/export', authenticateToken, async (req, res) => {
  try {
    const { type = 'all', start_date, end_date } = req.query;

    let query = supabaseAdmin
      .from('pedidos_reembolso')
      .select(`
        *,
        planos_saude!inner(nome, usuario_id),
        dependentes!inner(nome, relacao)
      `)
      .eq('planos_saude.usuario_id', req.user.id);

    if (start_date) {
      query = query.gte('data_atendimento', start_date);
    }

    if (end_date) {
      query = query.lte('data_atendimento', end_date);
    }

    const { data: reimbursements, error } = await query.order('data_atendimento', { ascending: false });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Converter para CSV
    const csvHeaders = [
      'Data Atendimento',
      'Tipo Atendimento',
      'Dependente',
      'Plano',
      'Médico',
      'Clínica',
      'Valor Pago',
      'Valor Reembolsado',
      'Status',
      'Protocolo',
      'Criado em'
    ];

    const csvRows = reimbursements.map(r => [
      new Date(r.data_atendimento).toLocaleDateString('pt-BR'),
      r.tipo_atendimento,
      r.dependentes.nome,
      r.planos_saude.nome,
      r.nome_medico || '',
      r.nome_clinica || '',
      (r.valor_pago || 0).toFixed(2),
      (r.valor_reembolsado || 0).toFixed(2),
      r.status,
      r.numero_protocolo || '',
      new Date(r.created_at).toLocaleDateString('pt-BR')
    ]);

    const csvContent = [csvHeaders, ...csvRows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="reembolsos_${new Date().toISOString().split('T')[0]}.csv"`);
    res.send('\ufeff' + csvContent); // BOM para UTF-8
  } catch (error) {
    console.error('Erro na exportação:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;