# Configuração do Supabase para ReembolsoFácil

## 1. Criação do Projeto

1. Acesse [supabase.com](https://supabase.com)
2. Faça login ou crie uma conta
3. Clique em "New Project"
4. Escolha sua organização
5. Configure o projeto:
   - **Name**: ReembolsoFacil
   - **Database Password**: Anote esta senha (será necessária para conexões diretas)
   - **Region**: South America (São Paulo) - sa-east-1
6. Aguarde a criação do projeto (pode levar alguns minutos)

## 2. Configuração do Banco de Dados

### 2.1 Executar Schema SQL

1. No painel do Supabase, vá para **SQL Editor**
2. Clique em **New Query**
3. Copie todo o conteúdo do arquivo `schema.sql`
4. Cole no editor SQL
5. Clique em **Run** para executar
6. Verifique se todas as tabelas foram criadas sem erros

### 2.2 Verificar Tabelas Criadas

Execute esta query para verificar:

```sql
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('usuarios', 'planos_saude', 'dependentes', 'pedidos_reembolso', 'documentos_reembolso', 'documentos_pedidos_vinculo', 'relatorios_semanais')
ORDER BY tablename;
```

Deve retornar 7 tabelas.

## 3. Configuração de Autenticação

### 3.1 Configurar Providers

1. Vá para **Authentication** > **Providers**
2. Configure **Email**:
   - ✅ Enable email confirmations
   - ✅ Enable email change confirmations
   - ✅ Enable secure email change
3. **Site URL**: `http://38.102.86.102:3000`
4. **Redirect URLs**: 
   - `http://38.102.86.102:3000/auth/confirm`
   - `http://38.102.86.102:3000/auth/reset-password`

### 3.2 Configurar Templates de Email

1. Vá para **Authentication** > **Email Templates**
2. **Confirm signup**:
   ```html
   <h2>Confirme seu email</h2>
   <p>Clique no link abaixo para confirmar sua conta no ReembolsoFácil:</p>
   <p><a href="{{ .ConfirmationURL }}">Confirmar Email</a></p>
   ```

3. **Reset password**:
   ```html
   <h2>Redefinir senha</h2>
   <p>Clique no link abaixo para redefinir sua senha:</p>
   <p><a href="{{ .ConfirmationURL }}">Redefinir Senha</a></p>
   ```

## 4. Configuração de Segurança (RLS)

### 4.1 Verificar Row Level Security

Execute para verificar se RLS está ativo:

```sql
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('usuarios', 'planos_saude', 'dependentes', 'pedidos_reembolso', 'documentos_reembolso');
```

Todas devem ter `rowsecurity = true`.

### 4.2 Verificar Políticas

```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public';
```

## 5. Obter Credenciais

### 5.1 API Keys

1. Vá para **Settings** > **API**
2. Anote as seguintes informações:

```
Project URL: https://vflfrwgtswzcpldwqnqs.supabase.co
anon public: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmbGZyd2d0c3d6Y3BsZHdxbnFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc4Njk4NjAsImV4cCI6MjA2MzQ0NTg2MH0.nRNEXIRzJQli2pmDf3aREaXmDcPw69WrembVmPwgdQ4
service_role: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmbGZyd2d0c3d6Y3BsZHdxbnFzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0Nzg2OTg2MCwiZXhwIjoyMDYzNDQ1ODYwfQ.i8JpTDULxI_I_6jL2P_2M7FTdMKz_B3aZxKOmP2uUxk
```

### 5.2 JWT Secret

```
JWT Secret: Y9WKeYLqtaFKBZcSvmq5JiLctC4MGRuiRtVt3etIKuNgHpWer7t6SmkpCtFH+Mu96gZYLZS1sCGBWK44qMfFRg==
```

## 6. Criar Usuário Administrador (Opcional)

Execute no SQL Editor para criar o primeiro admin:

```sql
-- Criar usuário administrador
SELECT create_admin_user('admin@reembolsofacil.com', 'admin123456', 'Administrador Sistema');
```

**⚠️ IMPORTANTE**: Altere a senha após o primeiro login!

## 7. Configuração de Storage (Opcional)

Se quiser usar Supabase Storage em vez do sistema de arquivos local:

1. Vá para **Storage**
2. Crie um bucket chamado `documents`
3. Configure políticas de acesso:

```sql
-- Política para upload de documentos
CREATE POLICY "Usuários podem fazer upload de seus documentos" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'documents' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Política para visualizar documentos
CREATE POLICY "Usuários podem ver seus documentos" ON storage.objects
FOR SELECT USING (
  bucket_id = 'documents' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);
```

## 8. Monitoramento

### 8.1 Configurar Alertas

1. Vá para **Settings** > **Billing**
2. Configure alertas de uso
3. Monitore:
   - Database size
   - API requests
   - Storage usage

### 8.2 Logs

1. Vá para **Logs**
2. Monitore:
   - API logs
   - Database logs
   - Auth logs

## 9. Backup

### 9.1 Backup Automático

O Supabase faz backup automático, mas você pode configurar backups adicionais:

1. Vá para **Settings** > **Database**
2. Configure **Point in Time Recovery** (PITR)

### 9.2 Backup Manual

Execute para fazer backup das tabelas principais:

```sql
-- Backup de usuários (sem dados sensíveis)
SELECT id, email, nome, created_at FROM usuarios;

-- Backup de estatísticas
SELECT * FROM relatorios_semanais;
```

## 10. Troubleshooting

### 10.1 Problemas Comuns

**Erro: "relation does not exist"**
- Verifique se o schema.sql foi executado completamente
- Confirme que está conectado ao banco correto

**Erro: "RLS policy violation"**
- Verifique se as políticas RLS estão configuradas
- Confirme que o usuário está autenticado

**Erro: "JWT expired"**
- Verifique se o JWT_SECRET está correto
- Confirme que os tokens não expiraram

### 10.2 Comandos Úteis

```sql
-- Verificar conexões ativas
SELECT * FROM pg_stat_activity WHERE state = 'active';

-- Verificar tamanho do banco
SELECT pg_size_pretty(pg_database_size(current_database()));

-- Verificar tabelas e tamanhos
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

## 11. Configurações de Produção

### 11.1 Limites de Rate

Configure rate limiting no painel:
- **Auth**: 30 requests/hour por IP
- **API**: 100 requests/minute por usuário

### 11.2 CORS

Configure CORS para permitir apenas seu domínio:
- `http://38.102.86.102:3000`
- `http://38.102.86.102:3001`

### 11.3 SSL

O Supabase já fornece SSL por padrão. Certifique-se de usar HTTPS em produção.

## 12. Manutenção

### 12.1 Limpeza Periódica

Execute mensalmente para limpar dados antigos:

```sql
-- Limpar usuários não confirmados há mais de 30 dias
DELETE FROM auth.users 
WHERE email_confirmed_at IS NULL 
AND created_at < NOW() - INTERVAL '30 days';

-- Limpar relatórios antigos (manter apenas 1 ano)
DELETE FROM relatorios_semanais 
WHERE created_at < NOW() - INTERVAL '1 year';
```

### 12.2 Otimização

```sql
-- Analisar performance das queries
EXPLAIN ANALYZE SELECT * FROM pedidos_reembolso WHERE status = 'inicio';

-- Reindexar se necessário
REINDEX TABLE pedidos_reembolso;
```

---

**📞 Suporte Supabase**: [support@supabase.io](mailto:support@supabase.io)
**📖 Documentação**: [supabase.com/docs](https://supabase.com/docs)