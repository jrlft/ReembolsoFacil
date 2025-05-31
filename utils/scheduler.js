const cron = require('node-cron');
const { supabaseAdmin } = require('../config/supabase');
const { sendReimbursementReminder } = require('./emailService');

// Executar a cada 6 horas para verificar lembretes pendentes
cron.schedule('0 */6 * * *', async () => {
  console.log('🔄 Verificando lembretes de documentação pendente...');
  
  try {
    // Buscar reembolsos com documentação pendente que precisam de lembrete
    const { data: pendingReimbursements, error } = await supabaseAdmin
      .from('pedidos_reembolso')
      .select(`
        *,
        usuarios!inner(email, nome),
        dependentes!inner(nome),
        planos_saude!inner(nome)
      `)
      .eq('status', 'documentacao_pendente')
      .not('pending_docs_reminder_date', 'is', null);

    if (error) {
      console.error('Erro ao buscar reembolsos pendentes:', error);
      return;
    }

    for (const reimbursement of pendingReimbursements) {
      const reminderDate = new Date(reimbursement.pending_docs_reminder_date);
      const now = new Date();
      const daysDiff = Math.floor((now - reminderDate) / (1000 * 60 * 60 * 24));

      // Enviar lembrete a cada 3 dias (ou período configurado pelo usuário)
      const reminderInterval = reimbursement.reminder_interval || 3;
      
      if (daysDiff >= reminderInterval) {
        try {
          const reimbursementDetails = {
            protocol: reimbursement.numero_protocolo,
            type: reimbursement.tipo_atendimento,
            date: reimbursement.data_atendimento,
            dependent: reimbursement.dependentes.nome
          };

          await sendReimbursementReminder(
            reimbursement.usuarios.email,
            reimbursement.usuarios.nome,
            reimbursementDetails
          );

          // Atualizar data do último lembrete
          await supabaseAdmin
            .from('pedidos_reembolso')
            .update({ pending_docs_reminder_date: now.toISOString() })
            .eq('id', reimbursement.id);

          console.log(`✅ Lembrete enviado para ${reimbursement.usuarios.email}`);
        } catch (emailError) {
          console.error(`❌ Erro ao enviar lembrete para ${reimbursement.usuarios.email}:`, emailError);
        }
      }
    }

    console.log(`✅ Verificação de lembretes concluída. ${pendingReimbursements.length} reembolsos verificados.`);
  } catch (error) {
    console.error('❌ Erro na verificação de lembretes:', error);
  }
});

// Executar diariamente à meia-noite para limpar usuários não confirmados
cron.schedule('0 0 * * *', async () => {
  console.log('🧹 Limpando usuários não confirmados...');
  
  try {
    // Buscar usuários criados há mais de 24 horas e não confirmados
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const { data: unconfirmedUsers, error } = await supabaseAdmin
      .from('usuarios')
      .select('id, email')
      .lt('created_at', oneDayAgo.toISOString());

    if (error) {
      console.error('Erro ao buscar usuários não confirmados:', error);
      return;
    }

    for (const user of unconfirmedUsers) {
      try {
        // Verificar se o usuário foi confirmado no auth
        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(user.id);
        
        if (authUser && !authUser.email_confirmed_at) {
          // Deletar usuário não confirmado
          await supabaseAdmin.auth.admin.deleteUser(user.id);
          await supabaseAdmin.from('usuarios').delete().eq('id', user.id);
          
          console.log(`🗑️ Usuário não confirmado removido: ${user.email}`);
        }
      } catch (userError) {
        console.error(`Erro ao processar usuário ${user.email}:`, userError);
      }
    }

    console.log('✅ Limpeza de usuários não confirmados concluída.');
  } catch (error) {
    console.error('❌ Erro na limpeza de usuários:', error);
  }
});

// Executar semanalmente para gerar relatórios automáticos
cron.schedule('0 8 * * 1', async () => {
  console.log('📊 Gerando relatórios semanais...');
  
  try {
    // Buscar estatísticas da semana
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const { data: weeklyStats, error } = await supabaseAdmin
      .from('pedidos_reembolso')
      .select('status, valor_pago, valor_reembolsado')
      .gte('created_at', oneWeekAgo.toISOString());

    if (error) {
      console.error('Erro ao gerar relatórios:', error);
      return;
    }

    const stats = {
      total_requests: weeklyStats.length,
      completed: weeklyStats.filter(r => r.status === 'finalizado').length,
      pending: weeklyStats.filter(r => r.status !== 'finalizado').length,
      total_paid: weeklyStats.reduce((sum, r) => sum + (r.valor_pago || 0), 0),
      total_reimbursed: weeklyStats.reduce((sum, r) => sum + (r.valor_reembolsado || 0), 0)
    };

    // Salvar estatísticas semanais
    await supabaseAdmin
      .from('relatorios_semanais')
      .insert([{
        semana: oneWeekAgo.toISOString().split('T')[0],
        estatisticas: stats,
        created_at: new Date().toISOString()
      }]);

    console.log('✅ Relatório semanal gerado:', stats);
  } catch (error) {
    console.error('❌ Erro ao gerar relatório semanal:', error);
  }
});

console.log('⏰ Agendador de tarefas inicializado');

module.exports = {
  // Função para testar envio de lembrete manualmente
  testReminder: async (reimbursementId) => {
    try {
      const { data: reimbursement, error } = await supabaseAdmin
        .from('pedidos_reembolso')
        .select(`
          *,
          usuarios!inner(email, nome),
          dependentes!inner(nome)
        `)
        .eq('id', reimbursementId)
        .single();

      if (error || !reimbursement) {
        throw new Error('Reembolso não encontrado');
      }

      const reimbursementDetails = {
        protocol: reimbursement.numero_protocolo,
        type: reimbursement.tipo_atendimento,
        date: reimbursement.data_atendimento,
        dependent: reimbursement.dependentes.nome
      };

      await sendReimbursementReminder(
        reimbursement.usuarios.email,
        reimbursement.usuarios.nome,
        reimbursementDetails
      );

      return { success: true, message: 'Lembrete enviado com sucesso' };
    } catch (error) {
      console.error('Erro ao enviar lembrete de teste:', error);
      return { success: false, error: error.message };
    }
  }
};