#!/bin/bash

# ReembolsoFácil - Script de Instalação Automatizada
# Para Ubuntu 20.04 LTS

set -e

echo "🚀 Iniciando instalação do ReembolsoFácil..."

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função para log
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

# Verificar se está rodando como root
if [[ $EUID -eq 0 ]]; then
   error "Este script não deve ser executado como root"
fi

# Verificar se está no Ubuntu
if ! grep -q "Ubuntu" /etc/os-release; then
    error "Este script é para Ubuntu 20.04 LTS"
fi

log "Verificando sistema..."

# Atualizar sistema
log "Atualizando sistema..."
sudo apt update && sudo apt upgrade -y

# Instalar dependências básicas
log "Instalando dependências básicas..."
sudo apt install -y curl wget git build-essential

# Instalar Node.js 18
log "Instalando Node.js 18..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verificar instalação do Node.js
node_version=$(node --version)
npm_version=$(npm --version)
log "Node.js instalado: $node_version"
log "npm instalado: $npm_version"

# Instalar PM2 globalmente
log "Instalando PM2..."
sudo npm install -g pm2

# Definir diretório do projeto
PROJECT_DIR_NAME="reembolsofacil" # Nome do diretório sem hífen
EXPECTED_PROJECT_DIR="/home/$(whoami)/$PROJECT_DIR_NAME"
CURRENT_DIR=$(pwd)
PROJECT_DIR="" # Será definida abaixo

# Lógica para diretório do projeto (baseada na sua versão melhorada)
if [ "$(basename "$CURRENT_DIR")" == "$PROJECT_DIR_NAME" ] && [ -f "package.json" ]; then
    log "Script executado de dentro do diretório do projeto: $CURRENT_DIR"
    PROJECT_DIR="$CURRENT_DIR"
    cd "$PROJECT_DIR" # Garante que estamos no diretório correto
elif [ -d "$EXPECTED_PROJECT_DIR" ]; then
    warn "Diretório do projeto $EXPECTED_PROJECT_DIR já existe. Fazendo backup..."
    BACKUP_DIR="${EXPECTED_PROJECT_DIR}_backup_$(date +%Y%m%d_%H%M%S)"
    sudo mv "$EXPECTED_PROJECT_DIR" "$BACKUP_DIR"
    log "Backup criado em: $BACKUP_DIR"
    mkdir -p "$EXPECTED_PROJECT_DIR"
    log "Criado novo diretório do projeto: $EXPECTED_PROJECT_DIR"
    cd "$EXPECTED_PROJECT_DIR"
    error "Arquivos do projeto não encontrados no diretório de execução. Clone ou mova os arquivos para $EXPECTED_PROJECT_DIR e execute novamente OU execute o script de dentro do diretório do projeto."
else
    log "Criando diretório do projeto: $EXPECTED_PROJECT_DIR"
    mkdir -p "$EXPECTED_PROJECT_DIR"
    cd "$EXPECTED_PROJECT_DIR"
    error "Arquivos do projeto não encontrados no diretório de execução. Clone ou mova os arquivos para $EXPECTED_PROJECT_DIR e execute novamente OU execute o script de dentro do diretório do projeto."
fi

if [ ! -f "package.json" ]; then
    error "Arquivo package.json não encontrado no diretório do projeto $PROJECT_DIR. Certifique-se de que os arquivos do projeto estão aqui."
fi

log "Diretório do projeto configurado: $PROJECT_DIR"

# Instalar dependências do backend
log "Instalando dependências do backend..."
npm install

# Instalar dependências do frontend
log "Instalando dependências do frontend..."
if [ -d "frontend" ]; then
    cd frontend
    npm install
    cd ..
else
    error "Diretório 'frontend' não encontrado."
fi

# Configurar variáveis de ambiente
log "Configurando variáveis de ambiente..."

if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        log "Arquivo .env criado a partir do .env.example"
        warn "IMPORTANTE: Edite o arquivo .env com suas configurações antes de continuar"
    else
        error "Arquivo .env.example não encontrado. Crie um arquivo .env manualmente."
    fi
else
    log "Arquivo .env já existe"
fi

if [ ! -f "frontend/.env" ]; then
    if [ -f "frontend/.env.example" ]; then
        cp frontend/.env.example frontend/.env
        log "Arquivo frontend/.env criado a partir do frontend/.env.example"
        warn "IMPORTANTE: Edite o arquivo frontend/.env com suas configurações antes de continuar"
    else
        log "Arquivo frontend/.env.example não encontrado. Criando frontend/.env com configurações padrão..."
        cat > frontend/.env << EOF
REACT_APP_SUPABASE_URL=https://vflfrwgtswzcpldwqnqs.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmbGZyd2d0c3d6Y3BsZHdxbnFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc4Njk4NjAsImV4cCI6MjA2MzQ0NTg2MH0.nRNEXIRzJQli2pmDf3aREaXmDcPw69WrembVmPwgdQ4
REACT_APP_API_URL=http://38.102.86.102/api # Ajustado para incluir /api se Nginx for usado
REACT_APP_META_PIXEL_ID=581961359233767
REACT_APP_GOOGLE_ADS_TAG=AW-10888031582
EOF
        log "Arquivo frontend/.env criado com configurações padrão. Verifique REACT_APP_API_URL."
    fi
else
    log "Arquivo frontend/.env já existe"
fi

# Criar diretório de uploads
log "Criando diretório de uploads..."
mkdir -p uploads
chmod 755 uploads

# Build do frontend
log "Fazendo build do frontend..."
if [ -d "frontend" ]; then
    cd frontend
    npm run build
    cd ..
else
    error "Diretório 'frontend' não encontrado para o build."
fi

# Configurar PM2
log "Configurando PM2..."
PM2_APP_NAME="reembolsofacil" # Nome sem hífen

cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: '$PM2_APP_NAME',
    script: 'server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3001 // Backend rodará na porta 3001
    }
  }]
};
EOF

pm2 delete $PM2_APP_NAME 2>/dev/null || true
log "Iniciando aplicação com PM2..."
pm2 start ecosystem.config.js

log "Configurando PM2 para iniciar automaticamente..."
# Gera o comando de startup e instrui o usuário a executá-lo
# Isso é mais seguro do que tentar executar diretamente com sudo via script
STARTUP_COMMAND_OUTPUT=$(pm2 startup systemd -u $(whoami) --hp /home/$(whoami))
# Extrai o comando sudo do output
SUDO_COMMAND=$(echo "$STARTUP_COMMAND_OUTPUT" | grep "sudo")

if [ -n "$SUDO_COMMAND" ]; then
    log "Para habilitar o startup automático do PM2, execute o seguinte comando:"
    echo -e "${YELLOW}$SUDO_COMMAND${NC}"
else
    warn "Não foi possível determinar o comando de startup do PM2 ou ele não requer sudo. Verifique a saída do 'pm2 startup' e execute manualmente se necessário."
fi
pm2 save

log "Verificando status da aplicação PM2..."
pm2 status

# Variável para rastrear se Nginx foi configurado
NGINX_CONFIGURED=false

# Configurar firewall (opcional)
read -p "Deseja configurar o firewall UFW? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    log "Configurando firewall..."
    sudo ufw allow ssh
    sudo ufw allow 80/tcp  # Porta HTTP para Nginx
    sudo ufw allow 443/tcp # Porta HTTPS (se for configurar SSL depois)
    sudo ufw allow 3001/tcp # Permitir acesso direto ao backend se necessário para testes
    sudo ufw --force enable
    log "Firewall configurado"
fi

# Instalar e configurar Nginx (opcional)
read -p "Deseja instalar e configurar Nginx como proxy reverso? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    NGINX_CONFIGURED=true
    log "Instalando Nginx..."
    sudo apt install -y nginx
    
    NGINX_SITE_NAME="reembolsofacil" # Sem hífen
    NGINX_CONFIG_FILE="/etc/nginx/sites-available/$NGINX_SITE_NAME"

    log "Criando configuração do Nginx em $NGINX_CONFIG_FILE..."
    sudo tee $NGINX_CONFIG_FILE > /dev/null << EOF
server {
    listen 80;
    server_name 38.102.86.102; # Seu IP ou domínio

    # Frontend - Servir arquivos estáticos do build de produção
    location / {
        root $PROJECT_DIR/frontend/build;
        index index.html index.htm;
        try_files \$uri \$uri/ /index.html; # Essencial para roteamento do React
    }

    # API Backend
    location /api {
        proxy_pass http://localhost:3001; # Backend rodando na porta 3001
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # Uploads (servidos pelo backend Node.js, acessados via /api/uploads ou /uploads dependendo da rota do backend)
    # Se suas rotas de upload no backend são, por exemplo, /api/uploads/arquivo.pdf
    # então o Nginx já as cobrirá com o location /api.
    # Se for /uploads/arquivo.pdf diretamente do backend, adicione um location específico:
    location /uploads {
        proxy_pass http://localhost:3001/uploads; 
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }
}
EOF

    log "Ativando site Nginx..."
    if [ -L /etc/nginx/sites-enabled/$NGINX_SITE_NAME ]; then
        sudo rm /etc/nginx/sites-enabled/$NGINX_SITE_NAME
    fi
    sudo ln -s $NGINX_CONFIG_FILE /etc/nginx/sites-enabled/
    
    # Remover link simbólico default se existir e não for o nosso
    if [ -L /etc/nginx/sites-enabled/default ] && [ "$(readlink -f /etc/nginx/sites-enabled/default)" != "$NGINX_CONFIG_FILE" ]; then
        sudo rm -f /etc/nginx/sites-enabled/default
    fi
    
    log "Testando configuração Nginx..."
    sudo nginx -t
    
    log "Reiniciando Nginx..."
    sudo systemctl restart nginx
    sudo systemctl enable nginx
    
    log "Nginx configurado e iniciado"
fi

log "Verificando serviços..."
sleep 5 # Dar tempo para os serviços iniciarem

# Verificar backend
if curl -s -I http://localhost:3001/api/health | grep -q "HTTP/1.1 200 OK"; then
    log "✅ Backend (direto) está rodando na porta 3001 e /api/health responde com 200 OK"
else
    warn "❌ Backend (direto) não está respondendo corretamente na porta 3001 ou /api/health não está OK. Verifique os logs: pm2 logs $PM2_APP_NAME"
fi

# Verificar frontend/Nginx
if [ "$NGINX_CONFIGURED" = true ]; then
    if curl -s -I http://38.102.86.102/ | grep -q "HTTP/1.1"; then # Testa a raiz via IP externo na porta 80
        log "✅ Frontend (via Nginx) está acessível em http://38.102.86.102/"
        if curl -s -I http://38.102.86.102/api/health | grep -q "HTTP/1.1 200 OK"; then
             log "✅ API (via Nginx) está acessível em http://38.102.86.102/api/health e responde com 200 OK"
        else
            warn "❌ API (via Nginx) não está respondendo corretamente em http://38.102.86.102/api/health. Verifique Nginx e backend."
        fi
    else
        warn "❌ Frontend (via Nginx) não está acessível em http://38.102.86.102/. Verifique a configuração do Nginx e os logs."
    fi
else
    log "ℹ️  Nginx não foi configurado. Para acessar o frontend, sirva os arquivos de '$PROJECT_DIR/frontend/build' (ex: com 'npx serve -s $PROJECT_DIR/frontend/build -l 3000') ou configure um servidor web."
    log "Backend deve estar acessível em http://SEU_IP_EXTERNO:3001"
fi

echo
echo "🎉 Instalação concluída!"
echo
echo "📋 Informações importantes:"
echo "  • Diretório do projeto: $PROJECT_DIR"
if [ "$NGINX_CONFIGURED" = true ]; then
    echo "  • Frontend (via Nginx): http://38.102.86.102/"
    echo "  • API Backend (via Nginx): http://38.102.86.102/api"
    echo "  • API Health (via Nginx): http://38.102.86.102/api/health"
else
    echo "  • Backend (direto): http://SEU_IP_EXTERNO:3001" # Substitua SEU_IP_EXTERNO pelo IP real
    echo "  • API Health (direto): http://SEU_IP_EXTERNO:3001/api/health"
    echo "  • Frontend: Não iniciado automaticamente. Sirva os arquivos de '$PROJECT_DIR/frontend/build'."
fi
echo
echo "🔧 Comandos úteis:"
echo "  • Ver logs: pm2 logs $PM2_APP_NAME"
echo "  • Reiniciar: pm2 restart $PM2_APP_NAME"
echo "  • Status: pm2 status $PM2_APP_NAME"
echo "  • Parar: pm2 stop $PM2_APP_NAME"
echo
echo "⚠️  Próximos passos:"
echo "  1. Se você não o fez, edite os arquivos .env e frontend/.env com suas configurações."
echo "  2. Execute o comando de startup do PM2 se foi instruído acima."
echo "  3. Configure o banco de dados Supabase (executando o script database/schema.sql)."
echo "  4. Configure o Amazon SES para envio de emails (credenciais no .env)."
echo "  5. Se fez alterações de configuração que exigem reinício, use: pm2 restart $PM2_APP_NAME"
echo "  6. Se Nginx não foi configurado e você deseja acesso externo ao frontend, configure um servidor para os arquivos estáticos de '$PROJECT_DIR/frontend/build'."
echo
echo "📖 Documentação completa no README.md do projeto"
echo

read -p "Deseja ver os logs do PM2 em tempo real? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    pm2 logs $PM2_APP_NAME
fi
