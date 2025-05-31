# ReembolsoFácil - Sistema de Gestão de Reembolsos de Planos de Saúde

## 📋 Visão Geral

O ReembolsoFácil é um micro-SaaS desenvolvido para facilitar a gestão de reembolsos de planos de saúde. A plataforma permite que usuários organizem documentos, acompanhem o status dos pedidos de reembolso e recebam lembretes automáticos, tudo em uma interface moderna e intuitiva estilo Trello.

## 🚀 Funcionalidades Principais

### Para Usuários
- **Dashboard Kanban**: Visualização estilo Trello para acompanhar status dos reembolsos
- **Gestão de Planos**: Cadastro de múltiplos planos de saúde com ícones personalizados
- **Gestão de Dependentes**: Organização de familiares por plano de saúde
- **Controle de Reembolsos**: Criação e acompanhamento completo dos pedidos
- **Upload de Documentos**: Compressão automática para máximo 900KB
- **Documentos Recorrentes**: Reutilização de documentos como encaminhamentos médicos
- **Lembretes Automáticos**: Notificações por email para documentação pendente
- **Relatórios Detalhados**: Análise de gastos, economia e eficiência
- **Modo Escuro**: Interface adaptável para conforto visual

### Para Administradores
- **Painel Administrativo**: Gestão completa de usuários e sistema
- **Estatísticas Avançadas**: Métricas de uso e performance
- **Gerenciamento de Usuários**: Criação, edição e remoção de contas
- **Logs do Sistema**: Monitoramento de atividades
- **Backup de Dados**: Exportação de informações

## 🛠️ Stack Tecnológica

### Backend
- **Node.js** com Express
- **TypeScript** para tipagem
- **Supabase** como banco de dados e autenticação
- **Amazon SES** para envio de emails
- **Sharp** para compressão de imagens
- **PDF-lib** para manipulação de PDFs
- **Node-cron** para tarefas agendadas

### Frontend
- **React 18** com TypeScript
- **Tailwind CSS** para estilização
- **React Router** para navegação
- **React Beautiful DnD** para interface Kanban
- **React Hook Form** para formulários
- **Recharts** para gráficos
- **React Hot Toast** para notificações

### Infraestrutura
- **Supabase** (PostgreSQL + Auth + Storage)
- **Amazon SES** para emails
- **VPS Ubuntu 20.04** para hospedagem

## 📦 Instalação e Configuração

### Pré-requisitos
- Node.js 18+ 
- npm ou yarn
- Conta no Supabase
- Conta no Amazon SES
- Servidor VPS Ubuntu 20.04



### 5. Build e Deploy

```bash
# Build do frontend
cd frontend
npm run build
cd ..

# Instalar PM2 para gerenciar o processo
npm install -g pm2

# Iniciar aplicação
pm2 start server.js --name "reembolso-facil"

# Configurar PM2 para iniciar automaticamente
pm2 startup
pm2 save

# Verificar status
pm2 status
pm2 logs reembolso-facil
```

### 6. Configuração do Nginx (Opcional)

```nginx
server {
    listen 80;
    server_name 38.102.86.102;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Uploads
    location /uploads {
        proxy_pass http://localhost:3001;
    }
}
```

## 🗄️ Estrutura do Banco de Dados

### Tabelas Principais
- **usuarios**: Perfis dos usuários
- **planos_saude**: Planos de saúde cadastrados
- **dependentes**: Dependentes por plano
- **pedidos_reembolso**: Pedidos de reembolso
- **documentos_reembolso**: Documentos uploadados
- **documentos_pedidos_vinculo**: Vínculos de documentos recorrentes
- **relatorios_semanais**: Relatórios automáticos

### Status dos Reembolsos
- **inicio**: Reembolso criado, aguardando documentos
- **documentos_pendentes**: Alguns documentos uploadados
- **pronto_envio**: Todos documentos prontos para envio
- **protocolo_aberto**: Enviado para seguradora
- **documentacao_pendente**: Seguradora solicitou documentos adicionais
- **finalizado**: Reembolso processado

## 🎯 Como Usar

### 1. Primeiro Acesso
1. Acesse `http://38.102.86.102:3000`
2. Clique em "Criar Conta"
3. Preencha email, senha e nome
4. Confirme o email recebido

### 2. Configuração Inicial
1. Cadastre seus planos de saúde
2. Adicione dependentes aos planos
3. Configure documentos recorrentes (encaminhamentos, etc.)

### 3. Criando um Reembolso
1. Clique em "Inicie um controle de reembolso aqui"
2. Preencha dados básicos (data, médico, clínica, dependente)
3. Faça upload dos documentos necessários
4. Envie por email quando completo
5. Acompanhe o status no dashboard Kanban

### 4. Documentos Recorrentes
1. Acesse "Documentos" no menu
2. Faça upload de documentos que serão reutilizados
3. Marque como "Recorrente"
4. Vincule aos pedidos conforme necessário

## 📊 Funcionalidades Avançadas

### Lembretes Automáticos
- Verificação a cada 6 horas
- Emails enviados a cada 3 dias (configurável)
- Parar quando documento for adicionado

### Compressão de Arquivos
- Imagens: Redimensionamento e qualidade ajustável
- PDFs: Validação de tamanho (máx. 900KB)
- Suporte: JPG, PNG, PDF

### Relatórios
- Dashboard com métricas gerais
- Relatórios por período
- Análise de eficiência por plano
- Exportação em CSV

### Administração
- Gestão completa de usuários
- Estatísticas do sistema
- Logs de atividades
- Backup de dados

## 🔧 Comandos Úteis

```bash
# Desenvolvimento
npm run dev                 # Iniciar backend em desenvolvimento
cd frontend && npm start    # Iniciar frontend em desenvolvimento

# Produção
npm start                   # Iniciar backend
npm run build              # Build do frontend

# PM2
pm2 restart reembolso-facil # Reiniciar aplicação
pm2 logs reembolso-facil   # Ver logs
pm2 stop reembolso-facil   # Parar aplicação

# Banco de dados
# Execute queries diretamente no Supabase SQL Editor
```

## 🐛 Troubleshooting

### Problemas Comuns

1. **Erro de conexão com Supabase**
   - Verifique as credenciais no .env
   - Confirme que as políticas RLS estão ativas

2. **Emails não enviados**
   - Verifique configuração do Amazon SES
   - Confirme que o domínio está verificado

3. **Upload de arquivos falha**
   - Verifique permissões da pasta uploads
   - Confirme limite de tamanho (900KB)

4. **Aplicação não inicia**
   - Verifique se todas as dependências foram instaladas
   - Confirme que as portas 3000 e 3001 estão livres

### Logs Importantes

```bash
# Logs do PM2
pm2 logs reembolso-facil

# Logs do sistema
tail -f /var/log/nginx/error.log  # Se usando Nginx

# Verificar processos
ps aux | grep node
netstat -tlnp | grep :300
```

## 📈 Monitoramento

### Métricas Importantes
- Usuários ativos
- Reembolsos criados por dia
- Taxa de conversão (início → finalizado)
- Tempo médio de processamento
- Uso de armazenamento

### Health Checks
- `GET /api/health` - Status da API
- Verificar logs do PM2
- Monitorar uso de CPU/memória

## 🔒 Segurança

### Implementado
- Autenticação JWT via Supabase
- Row Level Security (RLS)
- Rate limiting nas APIs
- Validação de tipos de arquivo
- Sanitização de inputs
- CORS configurado

### Recomendações
- Use HTTPS em produção
- Configure firewall no servidor
- Monitore logs de acesso
- Faça backups regulares

## 📞 Suporte

Para suporte técnico ou dúvidas:
- Email: novidades@linkti.info
- Documentação: Este README
- Logs: Verifique PM2 e console do navegador

## 📄 Licença

Este projeto é propriedade da LinkTI. Todos os direitos reservados.

---

**Desenvolvido com ❤️ para facilitar a gestão de reembolsos de planos de saúde**
