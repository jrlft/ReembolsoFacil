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
PROJECT_DIR_NAME="reembolsofacil"
EXPECTED_PROJECT_DIR="/home/$(whoami)/$PROJECT_DIR_NAME"
CURRENT_DIR=$(pwd)

# Lógica para diretório do projeto
if [ "$(basename "$CURRENT_DIR")" == "$PROJECT_DIR_NAME" ] && [ -f "package.json" ]; then
    # Se já estamos no diretório do projeto e package.json existe
    log "Script executado de dentro do diretório do projeto: $CURRENT_DIR"
    PROJECT_DIR="$CURRENT_DIR"
    # Não precisa criar, fazer backup ou mover arquivos, já estamos aqui.
    # Apenas certifica-se de que estamos no diretório correto para os próximos comandos.
    cd "$PROJECT_DIR"
elif [ -d "$EXPECTED_PROJECT_DIR" ]; then
    # Se o diretório esperado existe, mas não estamos nele, ou não tem package.json
    warn "Diretório do projeto $EXPECTED_PROJECT_DIR já existe. Fazendo backup..."
    sudo mv "$EXPECTED_PROJECT_DIR" "${EXPECTED_PROJECT_DIR}_backup_$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$EXPECTED_PROJECT_DIR"
    log "Criado novo diretório do projeto: $EXPECTED_PROJECT_DIR"
    cd "$EXPECTED_PROJECT_DIR"
    error "Arquivos do projeto não encontrados no diretório de execução. Clone ou mova os arquivos para $EXPECTED_PROJECT_DIR e execute novamente OU execute o script de dentro do diretório do projeto."
else
    # Se o diretório esperado não existe
    log "Criando diretório do projeto: $EXPECTED_PROJECT_DIR"
    mkdir -p "$EXPECTED_PROJECT_DIR"
    cd "$EXPECTED_PROJECT_DIR"
    error "Arquivos do projeto não encontrados no diretório de execução. Clone ou mova os arquivos para $EXPECTED_PROJECT_DIR e execute novamente OU execute o script de dentro do diretório do projeto."
fi

# Neste ponto, devemos estar dentro do diretório do projeto correto
# e os arquivos do projeto (como package.json) devem estar presentes.
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
        error "Arquivo .env.example não encontrado"
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
        # Criar arquivo .env do frontend se não existir .env.example
        log "Arquivo frontend/.env.example não encontrado. Criando frontend/.env com configurações padrão..."
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
if [ -d "frontend" ]; then
    cd frontend
    npm run build
    cd ..
else
    error "Diretório 'frontend' não encontrado para o build."
fi

# Configurar PM2
log "Configurando PM2..."

# Criar arquivo de configuração do PM2
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'reembolsofacil',
    script: 'server.js', // Certifique-se que este é o entrypoint correto do seu backend
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
# O comando pm2 startup pode requerer interação ou ter output específico.
# A tentativa de automatizar com grep pode ser frágil.
# É mais seguro executar o comando e instruir o usuário se necessário.
STARTUP_COMMAND=$(pm2 startup systemd -u $(whoami) --hp /home/$(whoami))
if [[ -n "$STARTUP_COMMAND" ]] && [[ "$STARTUP_COMMAND" == sudo* ]]; then
    log "Execute o seguinte comando para configurar o startup automático do PM2:"
    echo "$STARTUP_COMMAND"
    # sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u your_user --hp /home/your_user
    # Tentativa de executar automaticamente, mas pode falhar dependendo das permissões sudo e TTY.
    # echo "Tentando executar automaticamente..."
    # sudo bash -c "$STARTUP_COMMAND" || warn "Falha ao executar automaticamente o comando de startup do PM2. Por favor, execute manualmente."
else
    warn "Não foi possível determinar o comando de startup do PM2 ou ele não requer sudo. Verifique a saída do 'pm2 startup'."
fi
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
    sudo ufw allow 3000 # Porta do frontend (se servido diretamente ou via Nginx)
    sudo ufw allow 3001 # Porta do backend
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
    # Certifique-se que o server_name está correto (IP ou domínio)
    # A porta do frontend no proxy_pass deve ser a porta onde o React (build) está sendo servido
    # Se o build do React for servido estaticamente pelo Nginx, a configuração é diferente.
    # Esta configuração assume que o frontend está rodando em um servidor de desenvolvimento em localhost:3000
    # ou que você tem um servidor para os arquivos estáticos do frontend em localhost:3000.
    # Para um build de produção, você normalmente serviria os arquivos estáticos do `frontend/build` diretamente.
    
    # Exemplo para servir build estático do React:
    # sudo tee /etc/nginx/sites-available/reembolsofacil > /dev/null << EOF
# server {
#     listen 80;
#     server_name SEU_DOMINIO_OU_IP; # Substitua pelo seu domínio ou IP

#     root $PROJECT_DIR/frontend/build; # Caminho para os arquivos estáticos do frontend
#     index index.html index.htm;

#     location / {
#         try_files \$uri \$uri/ /index.html;
#     }

#     location /api {
#         proxy_pass http://localhost:3001; # Backend
#         proxy_http_version 1.1;
#         proxy_set_header Upgrade \$http_upgrade;
#         proxy_set_header Connection 'upgrade';
#         proxy_set_header Host \$host;
#         proxy_set_header X-Real-IP \$remote_addr;
#         proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
#         proxy_set_header X-Forwarded-Proto \$scheme;
#         proxy_cache_bypass \$http_upgrade;
#     }

#     location /uploads { # Se os uploads são servidos pelo backend
#         proxy_pass http://localhost:3001/uploads;
#         # Se forem servidos diretamente pelo Nginx, ajuste o alias:
#         # alias $PROJECT_DIR/uploads;
#         # autoindex off; # ou on, se desejar listar arquivos
#     }
# }
# EOF

    # Configuração original do usuário (proxy para app React rodando em 3000)
    sudo tee /etc/nginx/sites-available/reembolsofacil > /dev/null << EOF
server {
    listen 80;
    server_name 38.102.86.102; # Use seu IP ou domínio aqui

    # Frontend (assumindo que está rodando em localhost:3000 via 'npm start' ou similar)
    # Para produção, você normalmente serviria os arquivos de build estáticos.
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

    # Uploads (assumindo que são servidos pelo backend na rota /uploads)
    location /uploads {
        proxy_pass http://localhost:3001; # Rota completa se o backend servir de /api/uploads, por exemplo
                                          # ou diretamente se for /uploads no backend
    }
}
EOF

    # Ativar site
    if [ -L /etc/nginx/sites-enabled/reembolsofacil ]; then
        sudo rm /etc/nginx/sites-enabled/reembolsofacil
    fi
    sudo ln -s /etc/nginx/sites-available/reembolsofacil /etc/nginx/sites-enabled/
    
    # Remover link simbólico default se existir e não for o nosso
    if [ -L /etc/nginx/sites-enabled/default ] && [ "$(readlink -f /etc/nginx/sites-enabled/default)" != "/etc/nginx/sites-available/reembolsofacil" ]; then
        sudo rm -f /etc/nginx/sites-enabled/default
    fi
    
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
# Adicionar um pequeno delay para dar tempo ao PM2 de iniciar
sleep 5 
if curl -s -I http://localhost:3001/api/health | grep -q "HTTP/1.1 200 OK"; then
    log "✅ Backend está rodando na porta 3001 e /api/health responde com 200 OK"
else
    warn "❌ Backend não está respondendo corretamente na porta 3001 ou /api/health não está OK. Verifique os logs: pm2 logs reembolsofacil"
fi

# Verificar se o frontend está acessível (se Nginx não foi configurado, esta verificação pode não ser relevante ou precisa ser ajustada)
# Se o Nginx foi configurado, ele deve estar respondendo na porta 80.
# Se o Nginx não foi configurado, o frontend (React dev server) estaria em localhost:3000 (se iniciado).
# O script de build do frontend não o inicia, apenas cria os arquivos estáticos.
# Para testar o frontend via Nginx (se configurado):
if [[ $REPLY =~ ^[Yy]$ ]]; then # Verifica se Nginx foi configurado
    if curl -s -I http://localhost/ | grep -q "HTTP/1.1"; then # Testa a raiz via Nginx na porta 80
        log "✅ Frontend (via Nginx) está acessível na porta 80"
    else
        warn "❌ Frontend (via Nginx) não está acessível na porta 80. Verifique a configuração do Nginx e os logs."
    fi
else
    log "ℹ️  Nginx não foi configurado. Para acessar o frontend, sirva os arquivos de 'frontend/build' (ex: com 'npx serve -s frontend/build -l 3000') ou configure um servidor web."
fi


# Mostrar informações finais
echo
echo "🎉 Instalação concluída!"
echo
echo "📋 Informações importantes:"
echo "  • Diretório do projeto: $PROJECT_DIR"
# Ajustar as URLs de acordo com a configuração do Nginx ou acesso direto
if [[ $REPLY =~ ^[Yy]$ ]]; then # Se Nginx foi configurado
    echo "  • Backend (via Nginx): http://38.102.86.102/api"
    echo "  • Frontend (via Nginx): http://38.102.86.102/"
    echo "  • API Health (via Nginx): http://38.102.86.102/api/health"
else
    echo "  • Backend (direto): http://localhost:3001 ou http://SEU_IP_EXTERNO:3001"
    echo "  • Frontend: Não iniciado automaticamente. Sirva os arquivos de '$PROJECT_DIR/frontend/build'."
    echo "  • API Health (direto): http://localhost:3001/api/health"
fi
echo
echo "🔧 Comandos úteis:"
echo "  • Ver logs: pm2 logs reembolsofacil"
echo "  • Reiniciar: pm2 restart reembolsofacil"
echo "  • Status: pm2 status"
echo "  • Parar: pm2 stop reembolsofacil"
echo
echo "⚠️  Próximos passos:"
echo "  1. Se você não o fez, edite os arquivos .env e frontend/.env com suas configurações."
echo "  2. Configure o banco de dados Supabase (se aplicável, verifique a documentação do projeto)."
echo "  3. Configure o Amazon SES para envio de emails (se aplicável)."
echo "  4. Se fez alterações de configuração, reinicie a aplicação: pm2 restart reembolsofacil"
echo "  5. Se Nginx não foi configurado, configure um servidor para os arquivos estáticos do frontend (ex: 'npx serve -s $PROJECT_DIR/frontend/build -l 3000')."
echo
echo "📖 Documentação completa no README.md do projeto"
echo

# Mostrar logs em tempo real
read -p "Deseja ver os logs do PM2 em tempo real? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    pm2 logs reembolsofacil
fi
