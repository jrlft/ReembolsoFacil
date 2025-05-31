const AWS = require('aws-sdk');

// Configurar AWS SES
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

const ses = new AWS.SES({ apiVersion: '2010-12-01' });

const sendEmail = async (to, subject, htmlBody, textBody = null) => {
  const params = {
    Destination: {
      ToAddresses: [to]
    },
    Message: {
      Body: {
        Html: {
          Charset: 'UTF-8',
          Data: htmlBody
        },
        Text: {
          Charset: 'UTF-8',
          Data: textBody || htmlBody.replace(/<[^>]*>/g, '')
        }
      },
      Subject: {
        Charset: 'UTF-8',
        Data: subject
      }
    },
    Source: process.env.EMAIL_FROM
  };

  try {
    const result = await ses.sendEmail(params).promise();
    console.log('Email enviado com sucesso:', result.MessageId);
    return { success: true, messageId: result.MessageId };
  } catch (error) {
    console.error('Erro ao enviar email:', error);
    throw error;
  }
};

const sendReimbursementReminder = async (userEmail, userName, reimbursementDetails) => {
  const subject = 'Lembrete: Documentação Pendente - ReembolsoFácil';
  
  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0; }
        .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>ReembolsoFácil</h1>
          <p>Lembrete de Documentação Pendente</p>
        </div>
        <div class="content">
          <p>Olá, <strong>${userName}</strong>!</p>
          
          <p>Você tem um pedido de reembolso com documentação complementar solicitada pela seguradora:</p>
          
          <div style="background: white; padding: 15px; border-radius: 6px; margin: 15px 0;">
            <h3>Detalhes do Pedido:</h3>
            <p><strong>Protocolo:</strong> ${reimbursementDetails.protocol || 'N/A'}</p>
            <p><strong>Tipo:</strong> ${reimbursementDetails.type}</p>
            <p><strong>Data:</strong> ${new Date(reimbursementDetails.date).toLocaleDateString('pt-BR')}</p>
            <p><strong>Dependente:</strong> ${reimbursementDetails.dependent}</p>
          </div>
          
          <p><strong>Lembrete:</strong> Você tem um pedido da seguradora de documentação complementar. Lembre-se de providenciar para atualizar na plataforma da seguradora para análise do seu pedido de reembolso.</p>
          
          <p>Acesse sua conta para adicionar os documentos faltantes:</p>
          
          <a href="${process.env.FRONTEND_URL}/dashboard" class="button">Acessar Plataforma</a>
          
          <p>Este lembrete será enviado a cada 3 dias até que você adicione o arquivo faltante e confirme que também o fez no sistema da seguradora.</p>
        </div>
        <div class="footer">
          <p>ReembolsoFácil - Gestão Inteligente de Reembolsos</p>
          <p>Este é um email automático, não responda.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail(userEmail, subject, htmlBody);
};

const sendReimbursementDocuments = async (userEmail, userName, reimbursementDetails, attachments = []) => {
  const subject = `Documentos para Reembolso - Protocolo ${reimbursementDetails.protocol || 'Pendente'}`;
  
  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
        .docs-list { background: white; padding: 15px; border-radius: 6px; margin: 15px 0; }
        .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>ReembolsoFácil</h1>
          <p>Documentos para Reembolso</p>
        </div>
        <div class="content">
          <p>Olá, <strong>${userName}</strong>!</p>
          
          <p>Segue em anexo os documentos para seu pedido de reembolso:</p>
          
          <div class="docs-list">
            <h3>Detalhes do Pedido:</h3>
            <p><strong>Tipo:</strong> ${reimbursementDetails.type}</p>
            <p><strong>Data:</strong> ${new Date(reimbursementDetails.date).toLocaleDateString('pt-BR')}</p>
            <p><strong>Dependente:</strong> ${reimbursementDetails.dependent}</p>
            <p><strong>Médico:</strong> ${reimbursementDetails.doctor}</p>
            <p><strong>Clínica:</strong> ${reimbursementDetails.clinic}</p>
            <p><strong>Valor Pago:</strong> R$ ${reimbursementDetails.amount?.toFixed(2) || '0,00'}</p>
          </div>
          
          <p>Envie estes documentos para sua seguradora através dos canais oficiais e guarde o número do protocolo para acompanhamento.</p>
          
          <p><strong>Email da Seguradora:</strong> ${reimbursementDetails.insuranceEmail || 'Consulte o site da sua seguradora'}</p>
        </div>
        <div class="footer">
          <p>ReembolsoFácil - Gestão Inteligente de Reembolsos</p>
          <p>Este é um email automático, não responda.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  // TODO: Implementar anexos quando necessário
  return await sendEmail(userEmail, subject, htmlBody);
};

const sendWelcomeEmail = async (userEmail, userName) => {
  const subject = 'Bem-vindo ao ReembolsoFácil!';
  
  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0; }
        .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>ReembolsoFácil</h1>
          <p>Bem-vindo à plataforma!</p>
        </div>
        <div class="content">
          <p>Olá, <strong>${userName}</strong>!</p>
          
          <p>Seja bem-vindo ao ReembolsoFácil! Sua conta foi criada com sucesso.</p>
          
          <p>Agora você pode:</p>
          <ul>
            <li>Cadastrar seus planos de saúde</li>
            <li>Gerenciar dependentes</li>
            <li>Organizar pedidos de reembolso</li>
            <li>Acompanhar o status dos seus reembolsos</li>
            <li>Receber lembretes automáticos</li>
          </ul>
          
          <p>Comece agora mesmo:</p>
          
          <a href="${process.env.FRONTEND_URL}/dashboard" class="button">Acessar Plataforma</a>
          
          <p>Se precisar de ajuda, nossa equipe está sempre disponível.</p>
        </div>
        <div class="footer">
          <p>ReembolsoFácil - Gestão Inteligente de Reembolsos</p>
          <p>Este é um email automático, não responda.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail(userEmail, subject, htmlBody);
};

module.exports = {
  sendEmail,
  sendReimbursementReminder,
  sendReimbursementDocuments,
  sendWelcomeEmail
};