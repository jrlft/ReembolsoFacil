const express = require('express');
const { supabaseAdmin } = require('../config/supabase');
const { authenticateToken } = require('../middleware/auth');
const { sendReimbursementDocuments } = require('../utils/emailService');
const router = express.Router();

// Listar reembolsos do usuário
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status, plano_id, dependente_id, page = 1, limit = 20 } = req.query;
    
    let query = supabaseAdmin
      .from('pedidos_reembolso')
      .select(`
        *,
        planos_saude!inner(nome, icone_url, usuario_id),
        dependentes!inner(nome, relacao)
      `)
      .eq('planos_saude.usuario_id', req.user.id)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    if (plano_id) {
      query = query.eq('plano_id', plano_id);
    }

    if (dependente_id) {
      query = query.eq('dependente_id', dependente_id);
    }

    // Paginação
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data: reimbursements, error } = await query;

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Contar total para paginação
    const { count, error: countError } = await supabaseAdmin
      .from('pedidos_reembolso')
      .select('*', { count: 'exact', head: true })
      .eq('planos_saude.usuario_id', req.user.id);

    if (countError) {
      console.error('Erro ao contar reembolsos:', countError);
    }

    res.json({
      data: reimbursements,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error) {
    console.error('Erro ao listar reembolsos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Buscar reembolso específico
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { data: reimbursement, error } = await supabaseAdmin
      .from('pedidos_reembolso')
      .select(`
        *,
        planos_saude!inner(nome, icone_url, usuario_id, email_seguradora),
        dependentes!inner(nome, relacao),
        documentos_reembolso(*)
      `)
      .eq('id', req.params.id)
      .eq('planos_saude.usuario_id', req.user.id)
      .single();

    if (error) {
      return res.status(404).json({ error: 'Reembolso não encontrado' });
    }

    res.json(reimbursement);
  } catch (error) {
    console.error('Erro ao buscar reembolso:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar novo reembolso
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      plano_id,
      dependente_id,
      tipo_atendimento,
      especialidade,
      nome_medico,
      nome_clinica,
      data_atendimento,
      data_fim_atendimento,
      valor_pago,
      observacoes
    } = req.body;

    if (!plano_id || !dependente_id || !tipo_atendimento || !data_atendimento) {
      return res.status(400).json({ 
        error: 'Plano, dependente, tipo de atendimento e data são obrigatórios' 
      });
    }

    // Verificar se o plano e dependente pertencem ao usuário
    const { data: plan, error: planError } = await supabaseAdmin
      .from('planos_saude')
      .select('id')
      .eq('id', plano_id)
      .eq('usuario_id', req.user.id)
      .single();

    if (planError || !plan) {
      return res.status(400).json({ error: 'Plano não encontrado' });
    }

    const { data: dependent, error: depError } = await supabaseAdmin
      .from('dependentes')
      .select('id')
      .eq('id', dependente_id)
      .eq('plano_id', plano_id)
      .single();

    if (depError || !dependent) {
      return res.status(400).json({ error: 'Dependente não encontrado' });
    }

    const { data: reimbursement, error } = await supabaseAdmin
      .from('pedidos_reembolso')
      .insert([
        {
          plano_id,
          dependente_id,
          tipo_atendimento,
          especialidade,
          nome_medico,
          nome_clinica,
          data_atendimento,
          data_fim_atendimento,
          valor_pago,
          observacoes,
          status: 'inicio',
          created_at: new Date().toISOString()
        }
      ])
      .select(`
        *,
        planos_saude(nome, icone_url),
        dependentes(nome, relacao)
      `)
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json(reimbursement);
  } catch (error) {
    console.error('Erro ao criar reembolso:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar reembolso
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const {
      tipo_atendimento,
      especialidade,
      nome_medico,
      nome_clinica,
      data_atendimento,
      data_fim_atendimento,
      valor_pago,
      valor_reembolsado,
      numero_protocolo,
      status,
      observacoes,
      pending_docs_description,
      reminder_interval
    } = req.body;

    // Verificar se o reembolso pertence ao usuário
    const { data: existingReimbursement, error: checkError } = await supabaseAdmin
      .from('pedidos_reembolso')
      .select(`
        id,
        planos_saude!inner(usuario_id)
      `)
      .eq('id', req.params.id)
      .eq('planos_saude.usuario_id', req.user.id)
      .single();

    if (checkError || !existingReimbursement) {
      return res.status(404).json({ error: 'Reembolso não encontrado' });
    }

    const updateData = {
      updated_at: new Date().toISOString()
    };

    // Adicionar campos que foram fornecidos
    if (tipo_atendimento !== undefined) updateData.tipo_atendimento = tipo_atendimento;
    if (especialidade !== undefined) updateData.especialidade = especialidade;
    if (nome_medico !== undefined) updateData.nome_medico = nome_medico;
    if (nome_clinica !== undefined) updateData.nome_clinica = nome_clinica;
    if (data_atendimento !== undefined) updateData.data_atendimento = data_atendimento;
    if (data_fim_atendimento !== undefined) updateData.data_fim_atendimento = data_fim_atendimento;
    if (valor_pago !== undefined) updateData.valor_pago = valor_pago;
    if (valor_reembolsado !== undefined) updateData.valor_reembolsado = valor_reembolsado;
    if (numero_protocolo !== undefined) updateData.numero_protocolo = numero_protocolo;
    if (status !== undefined) updateData.status = status;
    if (observacoes !== undefined) updateData.observacoes = observacoes;
    if (pending_docs_description !== undefined) updateData.pending_docs_description = pending_docs_description;
    if (reminder_interval !== undefined) updateData.reminder_interval = reminder_interval;

    // Se mudou para documentação pendente, definir data do lembrete
    if (status === 'documentacao_pendente') {
      updateData.pending_docs_reminder_date = new Date().toISOString();
    }

    // Se mudou para finalizado, limpar lembretes
    if (status === 'finalizado') {
      updateData.pending_docs_reminder_date = null;
      updateData.pending_docs_description = null;
    }

    const { data: reimbursement, error } = await supabaseAdmin
      .from('pedidos_reembolso')
      .update(updateData)
      .eq('id', req.params.id)
      .select(`
        *,
        planos_saude(nome, icone_url),
        dependentes(nome, relacao)
      `)
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json(reimbursement);
  } catch (error) {
    console.error('Erro ao atualizar reembolso:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Deletar reembolso
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    // Verificar se o reembolso pertence ao usuário
    const { data: existingReimbursement, error: checkError } = await supabaseAdmin
      .from('pedidos_reembolso')
      .select(`
        id,
        planos_saude!inner(usuario_id)
      `)
      .eq('id', req.params.id)
      .eq('planos_saude.usuario_id', req.user.id)
      .single();

    if (checkError || !existingReimbursement) {
      return res.status(404).json({ error: 'Reembolso não encontrado' });
    }

    // Deletar documentos associados primeiro
    const { error: docsError } = await supabaseAdmin
      .from('documentos_reembolso')
      .delete()
      .eq('pedido_id', req.params.id);

    if (docsError) {
      console.error('Erro ao deletar documentos:', docsError);
    }

    const { error } = await supabaseAdmin
      .from('pedidos_reembolso')
      .delete()
      .eq('id', req.params.id);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Reembolso deletado com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar reembolso:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Enviar documentos por email
router.post('/:id/send-email', authenticateToken, async (req, res) => {
  try {
    const { data: reimbursement, error } = await supabaseAdmin
      .from('pedidos_reembolso')
      .select(`
        *,
        planos_saude!inner(nome, email_seguradora, usuario_id),
        dependentes!inner(nome),
        usuarios!inner(nome, email)
      `)
      .eq('id', req.params.id)
      .eq('planos_saude.usuario_id', req.user.id)
      .single();

    if (error || !reimbursement) {
      return res.status(404).json({ error: 'Reembolso não encontrado' });
    }

    const reimbursementDetails = {
      type: reimbursement.tipo_atendimento,
      date: reimbursement.data_atendimento,
      dependent: reimbursement.dependentes.nome,
      doctor: reimbursement.nome_medico,
      clinic: reimbursement.nome_clinica,
      amount: reimbursement.valor_pago,
      protocol: reimbursement.numero_protocolo,
      insuranceEmail: reimbursement.planos_saude.email_seguradora
    };

    await sendReimbursementDocuments(
      reimbursement.usuarios.email,
      reimbursement.usuarios.nome,
      reimbursementDetails
    );

    // Atualizar status para protocolo aberto se ainda não foi
    if (reimbursement.status === 'pronto_envio') {
      await supabaseAdmin
        .from('pedidos_reembolso')
        .update({ 
          status: 'protocolo_aberto',
          updated_at: new Date().toISOString()
        })
        .eq('id', req.params.id);
    }

    res.json({ message: 'Email enviado com sucesso' });
  } catch (error) {
    console.error('Erro ao enviar email:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Listar tipos de atendimento disponíveis
router.get('/types/available', (req, res) => {
  const availableTypes = [
    { 
      id: 'consulta', 
      name: 'Consulta', 
      documents: ['nota_fiscal', 'comprovante_pagamento'] 
    },
    { 
      id: 'consulta_online', 
      name: 'Consulta Online', 
      documents: ['nota_fiscal', 'comprovante_pagamento'] 
    },
    { 
      id: 'psicologia', 
      name: 'Psicologia', 
      documents: ['nota_fiscal', 'comprovante_pagamento', 'encaminhamento_medico', 'relatorio_terapeuta'] 
    },
    { 
      id: 'fisioterapia', 
      name: 'Fisioterapia', 
      documents: ['nota_fiscal', 'comprovante_pagamento', 'encaminhamento_medico', 'relatorio_terapeuta'] 
    },
    { 
      id: 'terapia_ocupacional', 
      name: 'Terapia Ocupacional', 
      documents: ['nota_fiscal', 'comprovante_pagamento', 'encaminhamento_medico', 'relatorio_terapeuta'] 
    },
    { 
      id: 'fonoaudiologia', 
      name: 'Fonoaudiologia', 
      documents: ['nota_fiscal', 'comprovante_pagamento', 'encaminhamento_medico', 'relatorio_terapeuta'] 
    },
    { 
      id: 'nutricao', 
      name: 'Nutrição', 
      documents: ['nota_fiscal', 'comprovante_pagamento', 'encaminhamento_medico'] 
    },
    { 
      id: 'exame', 
      name: 'Exame', 
      documents: ['nota_fiscal', 'comprovante_pagamento', 'pedido_medico'] 
    }
  ];

  res.json(availableTypes);
});

// Dashboard com estatísticas por status (estilo Trello)
router.get('/dashboard/kanban', authenticateToken, async (req, res) => {
  try {
    const { data: reimbursements, error } = await supabaseAdmin
      .from('pedidos_reembolso')
      .select(`
        *,
        planos_saude!inner(nome, icone_url, usuario_id),
        dependentes!inner(nome, relacao)
      `)
      .eq('planos_saude.usuario_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    const kanbanData = {
      inicio: reimbursements.filter(r => r.status === 'inicio'),
      documentos_pendentes: reimbursements.filter(r => r.status === 'documentos_pendentes'),
      pronto_envio: reimbursements.filter(r => r.status === 'pronto_envio'),
      protocolo_aberto: reimbursements.filter(r => r.status === 'protocolo_aberto'),
      documentacao_pendente: reimbursements.filter(r => r.status === 'documentacao_pendente'),
      finalizado: reimbursements.filter(r => r.status === 'finalizado')
    };

    res.json(kanbanData);
  } catch (error) {
    console.error('Erro ao buscar dashboard kanban:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;