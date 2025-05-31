# 🚀 ReembolsoFácil - Instruções Completas de Instalação e Deploy

## 📋 Resumo Executivo

Este documento contém todas as instruções necessárias para instalar, configurar e fazer deploy do sistema ReembolsoFácil no servidor VPS Ubuntu 20.04 com IP 38.102.86.102.

## 🎯 Pré-requisitos

- ✅ Servidor VPS Ubuntu 20.04 LTS
- ✅ Acesso SSH ao servidor (IP: 38.102.86.102)
- ✅ Usuário com privilégios sudo
- ✅ Conta no Supabase configurada
- ✅ Conta no Amazon SES configurada

## 🗂️ Estrutura do Projeto

```
ReembolsoFacil/
├── 📁 backend/
│   ├── server.js              # Servidor principal
│   ├── package.json           # Dependências backend
│   ├── .env.example          # Exemplo de configuração
│   ├── 📁 config/            # Configurações
│   ├── 📁 routes/            # Rotas da API
│   ├── 📁 middleware/        # Middlewares
│   ├── 📁 utils/             # Utilitários
│   └── 📁 uploads/           # Arquivos enviados
├── 📁 frontend/
│   ├── package.json          # Dependências frontend
│   ├── .env                  # Configuração frontend
│   ├── 📁 src/               # Código fonte React
│   ├── 📁 public/            # Arquivos públicos
│   └── 📁 build/             # Build de produção
├── 📁 database/
│   ├── schema.sql            # Schema do banco
│   └── SUPABASE_SETUP.md     # Instruções Supabase
├── install.sh                # Script de instalação
├── deploy.sh                 # Script de deploy
├── ecosystem.config.js       # Configuração PM2
└── README.md                 # Documentação principal
```

## 🚀 Instalação Rápida

### Passo 1: Conectar ao Servidor

```bash
ssh usuario@38.102.86.102
cd /home/linkti
```

### Passo 2: Fazer Upload dos Arquivos

Faça upload de todos os arquivos do projeto para `/home/linkti/reembolso-facil/`

### Passo 3: Executar Instalação Automática

```bash
cd reembolso-facil
chmod +x install.sh
./install.sh
```

O script irá:
- ✅ Instalar Node.js 18
- ✅ Instalar PM2
- ✅ Instalar dependências
- ✅ Configurar ambiente
- ✅ Fazer build do frontend
- ✅ Iniciar aplicação

## 🗄️ Configuração do Banco de Dados

### Passo 1: Configurar Supabase

1. Acesse [supabase.com](https://supabase.com)
2. Crie um novo projeto
3. Execute o script `database/schema.sql` no SQL Editor
4. Configure autenticação e URLs de redirect

**Credenciais já configuradas:**
- URL: `https://vflfrwgtswzcpldwqnqs.supabase.co`
- Anon Key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- Service Role: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### Passo 2: Verificar Configuração

```sql
-- Verificar tabelas criadas
SELECT tablename FROM pg_tables WHERE schemaname = 'public';

-- Verificar RLS ativo
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
```

## 📧 Configuração de Email

### Amazon SES já configurado:
- **Access Key**: ``
- **Secret Key**: ``
- **Região**: `sa-east-1`
- **Remetente**: `@.info`

## ⚙️ Configuração de Ambiente


## 🔄 Deploy e Atualizações

### Deploy Inicial
```bash
chmod +x deploy.sh
./deploy.sh
```

### Comandos PM2
```bash
# Ver status
pm2 status

# Ver logs
pm2 logs reembolso-facil

# Reiniciar
pm2 restart reembolso-facil

# Parar
pm2 stop reembolso-facil

# Monitorar
pm2 monit
```

## 🌐 Acesso ao Sistema

### URLs de Acesso
- **Frontend**: http://38.102.86.102:3000
- **API**: http://38.102.86.102:3001
- **Health Check**: http://38.102.86.102:3001/api/health

### Primeiro Acesso
1. Acesse http://38.102.86.102:3000
2. Clique em "Criar Conta"
3. Preencha: email, senha, nome
4. Confirme email recebido
5. Faça login

### Criar Usuário Admin
```sql
-- No Supabase SQL Editor
SELECT create_admin_user('admin@reembolsofacil.com', 'admin123456', 'Administrador');
```

## 🎯 Como Usar o Sistema

### 1. Configuração Inicial
1. **Cadastrar Planos**: Adicione seus planos de saúde
2. **Adicionar Dependentes**: Vincule familiares aos planos
3. **Documentos Recorrentes**: Upload de encaminhamentos, etc.

### 2. Criar Reembolso
1. Clique em **"Inicie um controle de reembolso aqui"**
2. Preencha dados básicos (data, médico, clínica, dependente)
3. Faça upload dos documentos necessários
4. Envie por email quando completo
5. Acompanhe no dashboard Kanban

### 3. Status dos Reembolsos
- 🔵 **Início**: Criado, aguardando documentos
- 🟡 **Documentos Pendentes**: Alguns docs uploadados
- 🟣 **Pronto para Envio**: Todos docs prontos
- 🔵 **Protocolo Aberto**: Enviado para seguradora
- 🟠 **Documentação Pendente**: Seguradora pediu mais docs
- 🟢 **Finalizado**: Reembolso processado

## 📊 Funcionalidades Principais

### Dashboard Kanban
- Visualização estilo Trello
- Arrastar e soltar entre status
- Filtros por plano/dependente

### Documentos
- Upload com compressão automática (máx 900KB)
- Documentos recorrentes reutilizáveis
- Suporte: JPG, PNG, PDF

### Lembretes Automáticos
- Emails a cada 3 dias (configurável)
- Para documentação pendente
- Parar quando documento adicionado

### Relatórios
- Dashboard com métricas
- Análise por período
- Eficiência por plano
- Exportação CSV

### Administração
- Gestão de usuários
- Estatísticas do sistema
- Logs de atividades
- Backup de dados

## 🔧 Manutenção

### Logs Importantes
```bash
# Logs da aplicação
pm2 logs reembolso-facil

# Logs do sistema
tail -f /var/log/syslog

# Verificar processos
ps aux | grep node
```

### Backup
```bash
# Backup automático antes de deploy
./deploy.sh

# Backup manual
cp -r . backup_$(date +%Y%m%d_%H%M%S)
```

### Monitoramento
```bash
# Verificar saúde da API
curl http://localhost:3001/api/health

# Verificar uso de recursos
htop
df -h
free -h
```

## 🐛 Troubleshooting

### Problemas Comuns

**1. Aplicação não inicia**
```bash
# Verificar logs
pm2 logs reembolso-facil

# Verificar portas
netstat -tlnp | grep :300

# Reiniciar
pm2 restart reembolso-facil
```

**2. Erro de conexão com Supabase**
- Verificar credenciais no .env
- Confirmar que RLS está ativo
- Testar conexão manual

**3. Emails não enviados**
- Verificar configuração Amazon SES
- Confirmar domínio verificado
- Checar logs de erro

**4. Upload de arquivos falha**
- Verificar permissões pasta uploads
- Confirmar limite 900KB
- Checar espaço em disco

### Comandos de Diagnóstico
```bash
# Verificar configuração
node -e "console.log(require('./config/supabase'))"

# Testar API
curl -X GET http://localhost:3001/api/health

# Verificar banco
# Execute no Supabase SQL Editor:
SELECT COUNT(*) FROM usuarios;
```

## 🔒 Segurança

### Implementado
- ✅ Autenticação JWT via Supabase
- ✅ Row Level Security (RLS)
- ✅ Rate limiting
- ✅ Validação de arquivos
- ✅ CORS configurado
- ✅ Sanitização de inputs

### Recomendações
- 🔐 Use HTTPS em produção
- 🛡️ Configure firewall
- 📊 Monitore logs
- 💾 Faça backups regulares

## 📈 Monitoramento de Produção

### Métricas Importantes
- Usuários ativos diários
- Reembolsos criados por dia
- Taxa de conversão (início → finalizado)
- Tempo médio de processamento
- Uso de armazenamento

### Alertas Configurar
- CPU > 80%
- Memória > 80%
- Disco > 80%
- API response time > 2s

## 🆘 Suporte

### Contatos
- **Email**: novidades@linkti.info
- **Documentação**: README.md
- **Logs**: `pm2 logs reembolso-facil`

### Recursos Úteis
- [Documentação Supabase](https://supabase.com/docs)
- [Documentação PM2](https://pm2.keymetrics.io/docs/)
- [Documentação React](https://react.dev/)

## ✅ Checklist de Deploy

### Antes do Deploy
- [ ] Backup da versão atual
- [ ] Configurar .env files
- [ ] Testar em ambiente local
- [ ] Verificar dependências atualizadas

### Durante o Deploy
- [ ] Executar script de deploy
- [ ] Verificar build do frontend
- [ ] Testar endpoints da API
- [ ] Verificar logs sem erros

### Após o Deploy
- [ ] Testar funcionalidades principais
- [ ] Verificar emails funcionando
- [ ] Confirmar uploads funcionando
- [ ] Monitorar performance

---

**🎉 Sistema pronto para uso!**

Acesse: http://38.102.86.102:3000

**Desenvolvido com ❤️ para facilitar a gestão de reembolsos de planos de saúde**
