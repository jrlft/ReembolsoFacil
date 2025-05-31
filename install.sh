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

# Criar diretório do projeto
PROJECT_DIR="/home/$(whoami)/reembolsofacil"
log "Criando diretório do projeto: $PROJECT_DIR"

if [ -d "$PROJECT_DIR" ]; then
    warn "Diretório já existe. Fazendo backup..."
    sudo mv "$PROJECT_DIR" "${PROJECT_DIR}_backup_$(date +%Y%m%d_%H%M%S)"
fi

mkdir -p "$PROJECT_DIR"
cd "$PROJECT_DIR"

# Se os arquivos já estão no diretório atual, copiar
if [ -f "package.json" ]; then
    log "Copiando arquivos do projeto..."
    cp -r . "$PROJECT_DIR/"
    cd "$PROJECT_DIR"
else
    error "Arquivos do projeto não encontrados. Certifique-se de executar este script no diretório do projeto."
fi

# Instalar dependências do backend
log "Instalando dependências do backend..."
npm install

# Instalar dependências do frontend
log "Instalando dependências do frontend..."
cd frontend
npm install
cd ..

# Configurar variáveis de ambiente
log "Configurando variáveis de ambiente..."

if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        log "Arquivo .env criado a partir do .env.example"
        warn "IMPORTANTE: Edite o arquivo .env com suas configurações antes de continuar"
    else
        error "Arquivo .env.example não encontrado"
    fi
else
    log "Arquivo .env já existe"
fi

if [ ! -f "frontend/.env" ]; then
    if [ -f "frontend/.env.example" ]; then
        cp frontend/.env.example frontend/.env
        log "Arquivo frontend/.env criado"
    else
        # Criar arquivo .env do frontend se não existir
        cat > frontend/.env << EOF
REACT_APP_SUPABASE_URL=https://vflfrwgtswzcpldwqnqs.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmbGZyd2d0c3d6Y3BsZHdxbnFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc4Njk4NjAsImV4cCI6MjA2MzQ0NTg2MH0.nRNEXIRzJQli2pmDf3aREaXmDcPw69WrembVmPwgdQ4
REACT_APP_API_URL=http://38.102.86.102:3001
REACT_APP_META_PIXEL_ID=581961359233767
REACT_APP_GOOGLE_ADS_TAG=AW-10888031582
EOF
        log "Arquivo frontend/.env criado com configurações padrão"
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
cd frontend
npm run build
cd ..

# Configurar PM2
log "Configurando PM2..."

# Criar arquivo de configuração do PM2
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'reembolsofacil',
    script: 'server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    }
  }]
};
EOF

# Parar processo existente se houver
pm2 delete reembolsofacil 2>/dev/null || true

# Iniciar aplicação
log "Iniciando aplicação..."
pm2 start ecosystem.config.js

# Configurar PM2 para iniciar automaticamente
log "Configurando PM2 para iniciar automaticamente..."
pm2 startup | grep -E '^sudo' | bash || warn "Falha ao configurar startup automático do PM2"
pm2 save

# Verificar status
log "Verificando status da aplicação..."
pm2 status

# Configurar firewall (opcional)
read -p "Deseja configurar o firewall UFW? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    log "Configurando firewall..."
    sudo ufw allow ssh
    sudo ufw allow 3000
    sudo ufw allow 3001
    sudo ufw --force enable
    log "Firewall configurado"
fi

# Instalar e configurar Nginx (opcional)
read -p "Deseja instalar e configurar Nginx? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    log "Instalando Nginx..."
    sudo apt install -y nginx
    
    # Criar configuração do Nginx
    sudo tee /etc/nginx/sites-available/reembolsofacil > /dev/null << EOF
server {
    listen 80;
    server_name 38.102.86.102;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # Uploads
    location /uploads {
        proxy_pass http://localhost:3001;
    }
}
EOF

    # Ativar site
    sudo ln -sf /etc/nginx/sites-available/reembolsofacil /etc/nginx/sites-enabled/
    sudo rm -f /etc/nginx/sites-enabled/default
    
    # Testar configuração
    sudo nginx -t
    
    # Reiniciar Nginx
    sudo systemctl restart nginx
    sudo systemctl enable nginx
    
    log "Nginx configurado e iniciado"
fi

# Verificar se tudo está funcionando
log "Verificando serviços..."

# Verificar se o backend está rodando
if curl -s http://localhost:3001/api/health > /dev/null; then
    log "✅ Backend está rodando na porta 3001"
else
    warn "❌ Backend não está respondendo na porta 3001"
fi

# Verificar se o frontend está acessível
if curl -s http://localhost:3000 > /dev/null; then
    log "✅ Frontend está acessível na porta 3000"
else
    warn "❌ Frontend não está acessível na porta 3000"
fi

# Mostrar informações finais
echo
echo "🎉 Instalação concluída!"
echo
echo "📋 Informações importantes:"
echo "  • Diretório do projeto: $PROJECT_DIR"
echo "  • Backend: http://38.102.86.102:3001"
echo "  • Frontend: http://38.102.86.102:3000"
echo "  • API Health: http://38.102.86.102:3001/api/health"
echo
echo "🔧 Comandos úteis:"
echo "  • Ver logs: pm2 logs reembolsofacil"
echo "  • Reiniciar: pm2 restart reembolsofacil"
echo "  • Status: pm2 status"
echo "  • Parar: pm2 stop reembolsofacil"
echo
echo "⚠️  Próximos passos:"
echo "  1. Configure o banco de dados Supabase executando o script database/schema.sql"
echo "  2. Edite o arquivo .env com suas configurações"
echo "  3. Configure o Amazon SES para envio de emails"
echo "  4. Reinicie a aplicação: pm2 restart reembolsofacil"
echo
echo "📖 Documentação completa no README.md"
echo

# Mostrar logs em tempo real
read -p "Deseja ver os logs em tempo real? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    pm2 logs reembolsofacil
fi
