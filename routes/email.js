const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { sendEmail, sendReimbursementReminder } = require('../utils/emailService');
const { testReminder } = require('../utils/scheduler');
const router = express.Router();

// Enviar email de teste
router.post('/test', authenticateToken, async (req, res) => {
  try {
    const { to, subject, message } = req.body;

    if (!to || !subject || !message) {
      return res.status(400).json({ error: 'Destinatário, assunto e mensagem são obrigatórios' });
    }

    const result = await sendEmail(to, subject, message);
    
    res.json({ 
      message: 'Email enviado com sucesso',
      messageId: result.messageId 
    });
  } catch (error) {
    console.error('Erro ao enviar email de teste:', error);
    res.status(500).json({ error: 'Erro ao enviar email' });
  }
});

// Testar lembrete de documentação pendente
router.post('/test-reminder/:reimbursement_id', authenticateToken, async (req, res) => {
  try {
    const result = await testReminder(req.params.reimbursement_id);
    
    if (result.success) {
      res.json({ message: result.message });
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error) {
    console.error('Erro ao testar lembrete:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;