const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { supabaseAdmin } = require('../config/supabase');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Configuração do multer para upload
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB inicial, será comprimido para 900KB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de arquivo não permitido. Use apenas JPG, PNG ou PDF.'));
    }
  }
});

// Função para comprimir imagem
const compressImage = async (buffer, mimetype) => {
  const maxSize = 900 * 1024; // 900KB
  let quality = 90;
  let compressed = buffer;

  if (mimetype.startsWith('image/')) {
    while (compressed.length > maxSize && quality > 10) {
      compressed = await sharp(buffer)
        .jpeg({ quality })
        .toBuffer();
      quality -= 10;
    }

    // Se ainda estiver muito grande, redimensionar
    if (compressed.length > maxSize) {
      let width = 1920;
      while (compressed.length > maxSize && width > 800) {
        compressed = await sharp(buffer)
          .resize(width, null, { withoutEnlargement: true })
          .jpeg({ quality: 80 })
          .toBuffer();
        width -= 200;
      }
    }
  }

  return compressed;
};

// Função para comprimir PDF (simplificada)
const compressPDF = async (buffer) => {
  // Para PDFs, por enquanto apenas verificamos o tamanho
  // Em uma implementação completa, usaríamos uma biblioteca como pdf2pic + sharp
  const maxSize = 900 * 1024; // 900KB
  
  if (buffer.length <= maxSize) {
    return buffer;
  }
  
  // Se o PDF for muito grande, retornamos erro para o usuário comprimir manualmente
  throw new Error('PDF muito grande. Por favor, comprima o arquivo para menos de 900KB.');
};

// Upload de documento
router.post('/upload', authenticateToken, upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    const { pedido_id, tipo_documento, is_recurrent = false } = req.body;

    if (!pedido_id && !is_recurrent) {
      return res.status(400).json({ error: 'ID do pedido é obrigatório para documentos não recorrentes' });
    }

    if (!tipo_documento) {
      return res.status(400).json({ error: 'Tipo do documento é obrigatório' });
    }

    // Se não for recorrente, verificar se o pedido pertence ao usuário
    if (!is_recurrent) {
      const { data: reimbursement, error: reimbError } = await supabaseAdmin
        .from('pedidos_reembolso')
        .select(`
          id,
          planos_saude!inner(usuario_id)
        `)
        .eq('id', pedido_id)
        .eq('planos_saude.usuario_id', req.user.id)
        .single();

      if (reimbError || !reimbursement) {
        return res.status(404).json({ error: 'Pedido de reembolso não encontrado' });
      }
    }

    // Comprimir arquivo
    let compressedBuffer;
    try {
      if (req.file.mimetype === 'application/pdf') {
        compressedBuffer = await compressPDF(req.file.buffer);
      } else {
        compressedBuffer = await compressImage(req.file.buffer, req.file.mimetype);
      }
    } catch (compressionError) {
      return res.status(400).json({ error: compressionError.message });
    }

    // Gerar nome único para o arquivo
    const fileExtension = path.extname(req.file.originalname);
    const fileName = `${uuidv4()}${fileExtension}`;
    const uploadPath = path.join(process.env.UPLOAD_PATH || './uploads', fileName);

    // Criar diretório se não existir
    await fs.mkdir(path.dirname(uploadPath), { recursive: true });

    // Salvar arquivo comprimido
    await fs.writeFile(uploadPath, compressedBuffer);

    // Salvar informações no banco
    const documentData = {
      usuario_id: req.user.id,
      tipo_documento,
      nome_original: req.file.originalname,
      nome_arquivo: fileName,
      tamanho_original: req.file.size,
      tamanho_comprimido: compressedBuffer.length,
      mimetype: req.file.mimetype,
      is_recurrent: is_recurrent === 'true',
      created_at: new Date().toISOString()
    };

    if (!is_recurrent) {
      documentData.pedido_id = pedido_id;
    }

    const { data: document, error } = await supabaseAdmin
      .from('documentos_reembolso')
      .insert([documentData])
      .select()
      .single();

    if (error) {
      // Deletar arquivo se falhou ao salvar no banco
      await fs.unlink(uploadPath).catch(console.error);
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json({
      ...document,
      url: `/uploads/${fileName}`,
      compression_ratio: ((req.file.size - compressedBuffer.length) / req.file.size * 100).toFixed(1)
    });
  } catch (error) {
    console.error('Erro no upload:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Listar documentos de um pedido
router.get('/reimbursement/:pedido_id', authenticateToken, async (req, res) => {
  try {
    const { data: documents, error } = await supabaseAdmin
      .from('documentos_reembolso')
      .select(`
        *,
        pedidos_reembolso!inner(
          planos_saude!inner(usuario_id)
        )
      `)
      .eq('pedido_id', req.params.pedido_id)
      .eq('pedidos_reembolso.planos_saude.usuario_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    const documentsWithUrls = documents.map(doc => ({
      ...doc,
      url: `/uploads/${doc.nome_arquivo}`
    }));

    res.json(documentsWithUrls);
  } catch (error) {
    console.error('Erro ao listar documentos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Listar documentos recorrentes do usuário
router.get('/recurrent', authenticateToken, async (req, res) => {
  try {
    const { tipo_documento } = req.query;

    let query = supabaseAdmin
      .from('documentos_reembolso')
      .select('*')
      .eq('usuario_id', req.user.id)
      .eq('is_recurrent', true)
      .order('created_at', { ascending: false });

    if (tipo_documento) {
      query = query.eq('tipo_documento', tipo_documento);
    }

    const { data: documents, error } = await query;

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    const documentsWithUrls = documents.map(doc => ({
      ...doc,
      url: `/uploads/${doc.nome_arquivo}`
    }));

    res.json(documentsWithUrls);
  } catch (error) {
    console.error('Erro ao listar documentos recorrentes:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Vincular documento recorrente a um pedido
router.post('/link-recurrent', authenticateToken, async (req, res) => {
  try {
    const { documento_id, pedido_id } = req.body;

    if (!documento_id || !pedido_id) {
      return res.status(400).json({ error: 'ID do documento e do pedido são obrigatórios' });
    }

    // Verificar se o documento recorrente pertence ao usuário
    const { data: document, error: docError } = await supabaseAdmin
      .from('documentos_reembolso')
      .select('*')
      .eq('id', documento_id)
      .eq('usuario_id', req.user.id)
      .eq('is_recurrent', true)
      .single();

    if (docError || !document) {
      return res.status(404).json({ error: 'Documento recorrente não encontrado' });
    }

    // Verificar se o pedido pertence ao usuário
    const { data: reimbursement, error: reimbError } = await supabaseAdmin
      .from('pedidos_reembolso')
      .select(`
        id,
        planos_saude!inner(usuario_id)
      `)
      .eq('id', pedido_id)
      .eq('planos_saude.usuario_id', req.user.id)
      .single();

    if (reimbError || !reimbursement) {
      return res.status(404).json({ error: 'Pedido de reembolso não encontrado' });
    }

    // Criar vínculo
    const { data: link, error } = await supabaseAdmin
      .from('documentos_pedidos_vinculo')
      .insert([
        {
          documento_id,
          pedido_id,
          created_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json(link);
  } catch (error) {
    console.error('Erro ao vincular documento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Buscar documento específico
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { data: document, error } = await supabaseAdmin
      .from('documentos_reembolso')
      .select('*')
      .eq('id', req.params.id)
      .eq('usuario_id', req.user.id)
      .single();

    if (error) {
      return res.status(404).json({ error: 'Documento não encontrado' });
    }

    res.json({
      ...document,
      url: `/uploads/${document.nome_arquivo}`
    });
  } catch (error) {
    console.error('Erro ao buscar documento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Deletar documento
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { data: document, error: docError } = await supabaseAdmin
      .from('documentos_reembolso')
      .select('*')
      .eq('id', req.params.id)
      .eq('usuario_id', req.user.id)
      .single();

    if (docError || !document) {
      return res.status(404).json({ error: 'Documento não encontrado' });
    }

    // Deletar vínculos se for documento recorrente
    if (document.is_recurrent) {
      await supabaseAdmin
        .from('documentos_pedidos_vinculo')
        .delete()
        .eq('documento_id', req.params.id);
    }

    // Deletar registro do banco
    const { error } = await supabaseAdmin
      .from('documentos_reembolso')
      .delete()
      .eq('id', req.params.id);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Deletar arquivo físico
    const filePath = path.join(process.env.UPLOAD_PATH || './uploads', document.nome_arquivo);
    await fs.unlink(filePath).catch(console.error);

    res.json({ message: 'Documento deletado com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar documento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Listar tipos de documento disponíveis
router.get('/types/available', (req, res) => {
  const documentTypes = [
    { id: 'nota_fiscal', name: 'Nota Fiscal', required_for: ['consulta', 'consulta_online', 'psicologia', 'fisioterapia', 'terapia_ocupacional', 'fonoaudiologia', 'nutricao', 'exame'] },
    { id: 'comprovante_pagamento', name: 'Comprovante de Pagamento', required_for: ['consulta', 'consulta_online', 'psicologia', 'fisioterapia', 'terapia_ocupacional', 'fonoaudiologia', 'nutricao', 'exame'] },
    { id: 'encaminhamento_medico', name: 'Encaminhamento Médico', required_for: ['psicologia', 'fisioterapia', 'terapia_ocupacional', 'fonoaudiologia', 'nutricao'], recurrent: true },
    { id: 'relatorio_terapeuta', name: 'Relatório do Terapeuta', required_for: ['psicologia', 'fisioterapia', 'terapia_ocupacional', 'fonoaudiologia'] },
    { id: 'pedido_medico', name: 'Pedido Médico', required_for: ['exame'] },
    { id: 'documento_pessoal', name: 'Documento Pessoal', required_for: [], optional: true },
    { id: 'carta_resultado', name: 'Carta Resultado da Seguradora', required_for: [], optional: true },
    { id: 'contrato_medico', name: 'Contrato com Médico/Clínica', required_for: [], optional: true, recurrent: true }
  ];

  res.json(documentTypes);
});

// Atualizar documento recorrente (marcar como expirado e adicionar novo)
router.post('/recurrent/:id/update', authenticateToken, upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    // Verificar se o documento recorrente pertence ao usuário
    const { data: oldDocument, error: oldDocError } = await supabaseAdmin
      .from('documentos_reembolso')
      .select('*')
      .eq('id', req.params.id)
      .eq('usuario_id', req.user.id)
      .eq('is_recurrent', true)
      .single();

    if (oldDocError || !oldDocument) {
      return res.status(404).json({ error: 'Documento recorrente não encontrado' });
    }

    // Marcar documento antigo como expirado
    await supabaseAdmin
      .from('documentos_reembolso')
      .update({ 
        is_expired: true,
        expired_at: new Date().toISOString()
      })
      .eq('id', req.params.id);

    // Comprimir novo arquivo
    let compressedBuffer;
    try {
      if (req.file.mimetype === 'application/pdf') {
        compressedBuffer = await compressPDF(req.file.buffer);
      } else {
        compressedBuffer = await compressImage(req.file.buffer, req.file.mimetype);
      }
    } catch (compressionError) {
      return res.status(400).json({ error: compressionError.message });
    }

    // Gerar nome único para o novo arquivo
    const fileExtension = path.extname(req.file.originalname);
    const fileName = `${uuidv4()}${fileExtension}`;
    const uploadPath = path.join(process.env.UPLOAD_PATH || './uploads', fileName);

    // Salvar novo arquivo
    await fs.writeFile(uploadPath, compressedBuffer);

    // Criar novo documento
    const { data: newDocument, error } = await supabaseAdmin
      .from('documentos_reembolso')
      .insert([
        {
          usuario_id: req.user.id,
          tipo_documento: oldDocument.tipo_documento,
          nome_original: req.file.originalname,
          nome_arquivo: fileName,
          tamanho_original: req.file.size,
          tamanho_comprimido: compressedBuffer.length,
          mimetype: req.file.mimetype,
          is_recurrent: true,
          replaces_document_id: req.params.id,
          created_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (error) {
      await fs.unlink(uploadPath).catch(console.error);
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json({
      ...newDocument,
      url: `/uploads/${fileName}`,
      compression_ratio: ((req.file.size - compressedBuffer.length) / req.file.size * 100).toFixed(1)
    });
  } catch (error) {
    console.error('Erro ao atualizar documento recorrente:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;