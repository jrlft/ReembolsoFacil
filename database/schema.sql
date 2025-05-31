-- ReembolsoFácil - Schema do Banco de Dados
-- Execute este script no SQL Editor do Supabase

-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabela de usuários (complementa auth.users)
CREATE TABLE usuarios (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    nome VARCHAR(255) NOT NULL,
    telefone VARCHAR(20),
    data_nascimento DATE,
    endereco TEXT,
    observacoes TEXT,
    is_admin BOOLEAN DEFAULT FALSE,
    notification_settings JSONB DEFAULT '{"email_reminders": true, "reminder_frequency_days": 3, "status_updates": true, "weekly_reports": false}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de planos de saúde
CREATE TABLE planos_saude (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    icone_url VARCHAR(500),
    email_seguradora VARCHAR(255),
    telefone_seguradora VARCHAR(20),
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de dependentes
CREATE TABLE dependentes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plano_id UUID NOT NULL REFERENCES planos_saude(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    relacao VARCHAR(50) NOT NULL,
    data_nascimento DATE,
    cpf VARCHAR(14),
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de pedidos de reembolso
CREATE TABLE pedidos_reembolso (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plano_id UUID NOT NULL REFERENCES planos_saude(id) ON DELETE CASCADE,
    dependente_id UUID NOT NULL REFERENCES dependentes(id) ON DELETE CASCADE,
    tipo_atendimento VARCHAR(100) NOT NULL,
    especialidade VARCHAR(100),
    nome_medico VARCHAR(255),
    nome_clinica VARCHAR(255),
    data_atendimento DATE NOT NULL,
    data_fim_atendimento DATE,
    valor_pago DECIMAL(10,2),
    valor_reembolsado DECIMAL(10,2),
    numero_protocolo VARCHAR(100),
    status VARCHAR(50) DEFAULT 'inicio' CHECK (status IN ('inicio', 'documentos_pendentes', 'pronto_envio', 'protocolo_aberto', 'documentacao_pendente', 'finalizado')),
    observacoes TEXT,
    pending_docs_description TEXT,
    pending_docs_reminder_date TIMESTAMP WITH TIME ZONE,
    reminder_interval INTEGER DEFAULT 3,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de documentos de reembolso
CREATE TABLE documentos_reembolso (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    pedido_id UUID REFERENCES pedidos_reembolso(id) ON DELETE CASCADE,
    tipo_documento VARCHAR(100) NOT NULL,
    nome_original VARCHAR(255) NOT NULL,
    nome_arquivo VARCHAR(255) NOT NULL,
    tamanho_original INTEGER NOT NULL,
    tamanho_comprimido INTEGER NOT NULL,
    mimetype VARCHAR(100) NOT NULL,
    is_recurrent BOOLEAN DEFAULT FALSE,
    is_expired BOOLEAN DEFAULT FALSE,
    expired_at TIMESTAMP WITH TIME ZONE,
    replaces_document_id UUID REFERENCES documentos_reembolso(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de vínculos entre documentos recorrentes e pedidos
CREATE TABLE documentos_pedidos_vinculo (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    documento_id UUID NOT NULL REFERENCES documentos_reembolso(id) ON DELETE CASCADE,
    pedido_id UUID NOT NULL REFERENCES pedidos_reembolso(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(documento_id, pedido_id)
);

-- Tabela de relatórios semanais
CREATE TABLE relatorios_semanais (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    semana DATE NOT NULL,
    estatisticas JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para melhor performance
CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_planos_saude_usuario_id ON planos_saude(usuario_id);
CREATE INDEX idx_dependentes_plano_id ON dependentes(plano_id);
CREATE INDEX idx_pedidos_reembolso_plano_id ON pedidos_reembolso(plano_id);
CREATE INDEX idx_pedidos_reembolso_dependente_id ON pedidos_reembolso(dependente_id);
CREATE INDEX idx_pedidos_reembolso_status ON pedidos_reembolso(status);
CREATE INDEX idx_pedidos_reembolso_data_atendimento ON pedidos_reembolso(data_atendimento);
CREATE INDEX idx_documentos_reembolso_usuario_id ON documentos_reembolso(usuario_id);
CREATE INDEX idx_documentos_reembolso_pedido_id ON documentos_reembolso(pedido_id);
CREATE INDEX idx_documentos_reembolso_is_recurrent ON documentos_reembolso(is_recurrent);

-- Triggers para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_usuarios_updated_at BEFORE UPDATE ON usuarios
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_planos_saude_updated_at BEFORE UPDATE ON planos_saude
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dependentes_updated_at BEFORE UPDATE ON dependentes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pedidos_reembolso_updated_at BEFORE UPDATE ON pedidos_reembolso
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Políticas de segurança RLS (Row Level Security)
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE planos_saude ENABLE ROW LEVEL SECURITY;
ALTER TABLE dependentes ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos_reembolso ENABLE ROW LEVEL SECURITY;
ALTER TABLE documentos_reembolso ENABLE ROW LEVEL SECURITY;
ALTER TABLE documentos_pedidos_vinculo ENABLE ROW LEVEL SECURITY;
ALTER TABLE relatorios_semanais ENABLE ROW LEVEL SECURITY;

-- Políticas para usuários
CREATE POLICY "Usuários podem ver e editar seu próprio perfil" ON usuarios
    FOR ALL USING (auth.uid() = id);

-- Políticas para planos de saúde
CREATE POLICY "Usuários podem gerenciar seus próprios planos" ON planos_saude
    FOR ALL USING (auth.uid() = usuario_id);

-- Políticas para dependentes
CREATE POLICY "Usuários podem gerenciar dependentes de seus planos" ON dependentes
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM planos_saude 
            WHERE planos_saude.id = dependentes.plano_id 
            AND planos_saude.usuario_id = auth.uid()
        )
    );

-- Políticas para pedidos de reembolso
CREATE POLICY "Usuários podem gerenciar reembolsos de seus planos" ON pedidos_reembolso
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM planos_saude 
            WHERE planos_saude.id = pedidos_reembolso.plano_id 
            AND planos_saude.usuario_id = auth.uid()
        )
    );

-- Políticas para documentos
CREATE POLICY "Usuários podem gerenciar seus próprios documentos" ON documentos_reembolso
    FOR ALL USING (auth.uid() = usuario_id);

-- Políticas para vínculos de documentos
CREATE POLICY "Usuários podem gerenciar vínculos de seus documentos" ON documentos_pedidos_vinculo
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM documentos_reembolso 
            WHERE documentos_reembolso.id = documentos_pedidos_vinculo.documento_id 
            AND documentos_reembolso.usuario_id = auth.uid()
        )
    );

-- Políticas para relatórios semanais (apenas leitura para todos)
CREATE POLICY "Relatórios semanais são públicos para leitura" ON relatorios_semanais
    FOR SELECT USING (true);

-- Políticas especiais para administradores
CREATE POLICY "Admins podem ver todos os usuários" ON usuarios
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM usuarios admin_user 
            WHERE admin_user.id = auth.uid() 
            AND admin_user.is_admin = true
        )
    );

CREATE POLICY "Admins podem atualizar usuários" ON usuarios
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM usuarios admin_user 
            WHERE admin_user.id = auth.uid() 
            AND admin_user.is_admin = true
        )
    );

CREATE POLICY "Admins podem deletar usuários" ON usuarios
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM usuarios admin_user 
            WHERE admin_user.id = auth.uid() 
            AND admin_user.is_admin = true
        )
        AND id != auth.uid() -- Não pode deletar a si mesmo
    );

-- Função para criar usuário administrador inicial
CREATE OR REPLACE FUNCTION create_admin_user(admin_email TEXT, admin_password TEXT, admin_name TEXT)
RETURNS TEXT AS $$
DECLARE
    new_user_id UUID;
BEGIN
    -- Criar usuário no auth
    INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        created_at,
        updated_at,
        confirmation_token,
        email_change,
        email_change_token_new,
        recovery_token
    ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        uuid_generate_v4(),
        'authenticated',
        'authenticated',
        admin_email,
        crypt(admin_password, gen_salt('bf')),
        NOW(),
        NOW(),
        NOW(),
        '',
        '',
        '',
        ''
    ) RETURNING id INTO new_user_id;

    -- Criar perfil do usuário admin
    INSERT INTO usuarios (id, email, nome, is_admin) 
    VALUES (new_user_id, admin_email, admin_name, true);

    RETURN 'Usuário administrador criado com sucesso: ' || admin_email;
EXCEPTION
    WHEN OTHERS THEN
        RETURN 'Erro ao criar usuário administrador: ' || SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Inserir dados iniciais

-- Criar primeiro usuário administrador (opcional)
-- SELECT create_admin_user('admin@reembolsofacil.com', 'admin123', 'Administrador');

-- Inserir tipos de atendimento padrão (como referência)
COMMENT ON TABLE pedidos_reembolso IS 'Tipos de atendimento suportados: consulta, consulta_online, psicologia, fisioterapia, terapia_ocupacional, fonoaudiologia, nutricao, exame';

-- Inserir tipos de documento padrão (como referência)
COMMENT ON TABLE documentos_reembolso IS 'Tipos de documento suportados: nota_fiscal, comprovante_pagamento, encaminhamento_medico, relatorio_terapeuta, pedido_medico, documento_pessoal, carta_resultado, contrato_medico';

-- Inserir status de reembolso padrão (como referência)
COMMENT ON COLUMN pedidos_reembolso.status IS 'Status possíveis: inicio, documentos_pendentes, pronto_envio, protocolo_aberto, documentacao_pendente, finalizado';

-- Views úteis para relatórios

-- View de reembolsos com informações completas
CREATE VIEW vw_reembolsos_completos AS
SELECT 
    pr.id,
    pr.tipo_atendimento,
    pr.especialidade,
    pr.nome_medico,
    pr.nome_clinica,
    pr.data_atendimento,
    pr.valor_pago,
    pr.valor_reembolsado,
    pr.numero_protocolo,
    pr.status,
    pr.created_at,
    u.nome as usuario_nome,
    u.email as usuario_email,
    ps.nome as plano_nome,
    d.nome as dependente_nome,
    d.relacao as dependente_relacao
FROM pedidos_reembolso pr
JOIN planos_saude ps ON pr.plano_id = ps.id
JOIN usuarios u ON ps.usuario_id = u.id
JOIN dependentes d ON pr.dependente_id = d.id;

-- View de estatísticas por usuário
CREATE VIEW vw_estatisticas_usuario AS
SELECT 
    u.id as usuario_id,
    u.nome as usuario_nome,
    u.email as usuario_email,
    COUNT(DISTINCT ps.id) as total_planos,
    COUNT(DISTINCT d.id) as total_dependentes,
    COUNT(DISTINCT pr.id) as total_reembolsos,
    COUNT(DISTINCT CASE WHEN pr.status = 'finalizado' THEN pr.id END) as reembolsos_finalizados,
    COALESCE(SUM(pr.valor_pago), 0) as total_pago,
    COALESCE(SUM(pr.valor_reembolsado), 0) as total_reembolsado,
    COALESCE(SUM(pr.valor_pago) - SUM(pr.valor_reembolsado), 0) as economia_total
FROM usuarios u
LEFT JOIN planos_saude ps ON u.id = ps.usuario_id
LEFT JOIN dependentes d ON ps.id = d.plano_id
LEFT JOIN pedidos_reembolso pr ON ps.id = pr.plano_id
GROUP BY u.id, u.nome, u.email;

-- Comentários finais
COMMENT ON DATABASE postgres IS 'ReembolsoFácil - Sistema de Gestão de Reembolsos de Planos de Saúde';

-- Verificar se tudo foi criado corretamente
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('usuarios', 'planos_saude', 'dependentes', 'pedidos_reembolso', 'documentos_reembolso', 'documentos_pedidos_vinculo', 'relatorios_semanais')
ORDER BY tablename;