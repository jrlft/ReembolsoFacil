#!/bin/bash

# ReembolsoFácil - Script de Deploy
# Para atualizar a aplicação em produção

set -e

echo "🚀 Iniciando deploy do ReembolsoFácil..."

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

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

# Verificar se está no diretório correto
if [ ! -f "package.json" ]; then
    error "Execute este script no diretório raiz do projeto"
fi

# Verificar se PM2 está instalado
if ! command -v pm2 &> /dev/null; then
    error "PM2 não está instalado. Execute: npm install -g pm2"
fi

# Fazer backup da versão atual
log "Fazendo backup da versão atual..."
BACKUP_DIR="backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp -r . "$BACKUP_DIR/" 2>/dev/null || warn "Falha ao fazer backup completo"

# Parar aplicação
log "Parando aplicação..."
pm2 stop reembolsofacil || warn "Aplicação não estava rodando"

# Atualizar dependências do backend
log "Atualizando dependências do backend..."
npm install

# Atualizar dependências do frontend
log "Atualizando dependências do frontend..."
cd frontend
npm install

# Build do frontend
log "Fazendo build do frontend..."
npm run build
cd ..

# Verificar se o build foi bem-sucedido
if [ ! -d "frontend/build" ]; then
    error "Build do frontend falhou"
fi

# Criar diretórios necessários
log "Criando diretórios necessários..."
mkdir -p uploads
mkdir -p logs
chmod 755 uploads

# Verificar configurações
log "Verificando configurações..."
if [ ! -f ".env" ]; then
    warn "Arquivo .env não encontrado. Copiando do exemplo..."
    cp .env.example .env
    warn "IMPORTANTE: Configure o arquivo .env antes de continuar"
fi

if [ ! -f "frontend/.env" ]; then
    warn "Arquivo frontend/.env não encontrado. Criando com configurações padrão..."
    cat > frontend/.env << EOF
REACT_APP_SUPABASE_URL=https://vflfrwgtswzcpldwqnqs.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmbGZyd2d0c3d6Y3BsZHdxbnFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc4Njk4NjAsImV4cCI6MjA2MzQ0NTg2MH0.nRNEXIRzJQli2pmDf3aREaXmDcPw69WrembVmPwgdQ4
REACT_APP_API_URL=http://38.102.86.102:3001
REACT_APP_META_PIXEL_ID=581961359233767
REACT_APP_GOOGLE_ADS_TAG=AW-10888031582
EOF
fi

# Testar configuração
log "Testando configuração..."
node -e "
const config = require('./config/supabase');
console.log('✅ Configuração do Supabase OK');
" || error "Erro na configuração do Supabase"

# Iniciar aplicação
log "Iniciando aplicação..."
pm2 start ecosystem.config.js

# Aguardar inicialização
log "Aguardando inicialização..."
sleep 5

# Verificar se está rodando
if pm2 list | grep -q "reembolsofacil.*online"; then
    log "✅ Aplicação iniciada com sucesso"
else
    error "❌ Falha ao iniciar aplicação"
fi

# Testar endpoints
log "Testando endpoints..."

# Testar health check
if curl -s -f http://localhost:3001/api/health > /dev/null; then
    log "✅ API está respondendo"
else
    warn "❌ API não está respondendo"
fi

# Testar frontend (se estiver servindo estático)
if curl -s -f http://localhost:3000 > /dev/null; then
    log "✅ Frontend está acessível"
else
    warn "❌ Frontend não está acessível"
fi

# Salvar configuração do PM2
log "Salvando configuração do PM2..."
pm2 save

# Mostrar status
log "Status da aplicação:"
pm2 status

# Mostrar logs recentes
log "Logs recentes:"
pm2 logs reembolsofacil --lines 10

# Limpeza
log "Limpando arquivos temporários..."
# Manter apenas os 5 backups mais recentes
ls -dt backup_* 2>/dev/null | tail -n +6 | xargs rm -rf 2>/dev/null || true

# Informações finais
echo
echo "🎉 Deploy concluído com sucesso!"
echo
echo "📋 Informações:"
echo "  • Backend: http://38.102.86.102:3001"
echo "  • Frontend: http://38.102.86.102:3000"
echo "  • Health Check: http://38.102.86.102:3001/api/health"
echo "  • Backup criado em: $BACKUP_DIR"
echo
echo "🔧 Comandos úteis:"
echo "  • Ver logs: pm2 logs reembolsofacil"
echo "  • Reiniciar: pm2 restart reembolsofacil"
echo "  • Status: pm2 status"
echo "  • Monitorar: pm2 monit"
echo

# Verificar se há atualizações pendentes
if [ -f "package-lock.json" ]; then
    if npm outdated > /dev/null 2>&1; then
        warn "Há atualizações de dependências disponíveis. Execute 'npm update' quando apropriado."
    fi
fi

# Verificar espaço em disco
DISK_USAGE=$(df -h . | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 80 ]; then
    warn "Uso de disco alto: ${DISK_USAGE}%. Considere fazer limpeza."
fi

# Verificar memória
MEMORY_USAGE=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
if [ "$MEMORY_USAGE" -gt 80 ]; then
    warn "Uso de memória alto: ${MEMORY_USAGE}%. Monitore a aplicação."
fi

echo "✅ Deploy finalizado!"
