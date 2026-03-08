#!/usr/bin/env bash

set -e

# Configuration - APPROACH A (Recommended)
APP_DIR="/home/spectadkxh/crm_app"
BACKEND_DIR="${APP_DIR}/Backend"
FRONTEND_DIR="${APP_DIR}/frontend"
PUBLIC_DIR="/home/spectadkxh/public_html/spectra-crm.spectrasynth.com"
# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_step() { echo -e "${BLUE}[STEP]${NC} $1"; }

check_prerequisites() {
    log_step "Checking prerequisites..."

    # Check Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed"
        exit 1
    fi
    log_info "Node.js version: $(node -v)"

    # Check npm
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed"
        exit 1
    fi

    # Check directories
    if [ ! -d "$BACKEND_DIR" ]; then
        log_error "Backend directory not found: $BACKEND_DIR"
        exit 1
    fi

    if [ ! -d "$FRONTEND_DIR" ]; then
        log_error "Frontend directory not found: $FRONTEND_DIR"
        exit 1
    fi

    # Check .env
    if [ ! -f "${BACKEND_DIR}/.env" ]; then
        log_error "Missing .env file in Backend"
        exit 1
    fi

    log_info "All prerequisites met!"
}

deploy_backend() {
    log_step "Deploying Backend..."

    cd "$BACKEND_DIR"

    log_info "Installing backend dependencies..."
    npm install --production

    log_info "Managing backend process..."
    if command -v pm2 &> /dev/null; then
        # Using PM2
        if pm2 describe spectrasynth-crm &> /dev/null; then
            log_info "Restarting existing PM2 process..."
            pm2 restart spectrasynth-crm
        else
            log_info "Starting new PM2 process..."
            pm2 start server.js --name spectrasynth-crm --cwd "$BACKEND_DIR"
        fi
        pm2 save
        log_info "Backend running on PM2"
    else
        log_warn "PM2 not found. Please use cPanel Node.js manager or install PM2:"
        log_warn "  npm install -g pm2"
        log_warn "  pm2 start ${BACKEND_DIR}/server.js --name spectrasynth-crm"
    fi

    log_info "Backend deployed successfully!"
}

deploy_frontend() {
    log_step "Deploying Frontend..."

    cd "$FRONTEND_DIR"

    log_info "Installing frontend dependencies..."
    npm install

    log_info "Building production bundle..."
    npm run build

    # Backup existing deployment
    if [ -d "${PUBLIC_DIR}/assets" ]; then
        BACKUP_DIR="${PUBLIC_DIR}.backup.$(date +%Y%m%d_%H%M%S)"
        log_info "Backing up current deployment to: $BACKUP_DIR"
        mv "$PUBLIC_DIR" "$BACKUP_DIR"
    fi

    log_info "Deploying new build..."
    mkdir -p "$PUBLIC_DIR"
    cp -r dist/* "$PUBLIC_DIR/"

    # Always create/overwrite .htaccess with working configuration
    log_info "Creating .htaccess..."
    cat > "${PUBLIC_DIR}/.htaccess" << 'EOF'
RewriteEngine On

# Force HTTPS
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

# Proxy API to backend (Simple method - works on most cPanel)
RewriteCond %{REQUEST_URI} ^/api/
RewriteRule ^api/(.*)$ http://127.0.0.1:8000/api/$1 [P,L]

# React Router - SPA fallback
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteCond %{REQUEST_URI} !^/api/
RewriteRule ^ /index.html [L]

# Security Headers
<IfModule mod_headers.c>
    Header set X-Content-Type-Options "nosniff"
    Header set X-Frame-Options "SAMEORIGIN"
    Header set X-XSS-Protection "1; mode=block"
</IfModule>

# Disable directory listing
Options -Indexes
EOF

    log_info "Setting permissions..."
    find "$PUBLIC_DIR" -type f -exec chmod 644 {} \;
    find "$PUBLIC_DIR" -type d -exec chmod 755 {} \;

    log_info "Frontend deployed successfully!"
}

check_health() {
    log_step "Running health checks..."

    sleep 3

    # Check backend
    if curl -s -f "http://localhost:8000/api/users" > /dev/null 2>&1; then
        log_info "Backend: Healthy (http://localhost:8000)"
    else
        log_warn "Backend: Not responding. Check logs."
    fi

    # Check frontend files
    if [ -f "${PUBLIC_DIR}/index.html" ]; then
        log_info "Frontend: Deployed (${PUBLIC_DIR})"
    else
        log_error "Frontend: Missing files!"
    fi

    echo ""
    log_info "=========================================="
    log_info "Deployment Complete!"
    log_info "URL: https://spectra-crm.spectrasynth.com"
    log_info "=========================================="
    echo ""
    log_info "Note: If login fails, check:"
    log_info "  1. Frontend .env.production has: VITE_API_URL=/api"
    log_info "  2. Backend CORS allows your domain"
    log_info "  3. Apache logs: tail -50 ~/logs/spectra-crm.spectrasynth.com-error_log"
}

show_status() {
    log_step "Application Status"

    echo ""
    echo "=== Backend Status ==="
    if command -v pm2 &> /dev/null; then
        pm2 list | grep spectrasynth-crm || log_warn "Backend not running on PM2"
    else
        log_warn "PM2 not available. Check cPanel Node.js manager."
    fi

    echo ""
    echo "=== Frontend Status ==="
    if [ -d "$PUBLIC_DIR" ]; then
        echo "Deployed: Yes"
        echo "Location: $PUBLIC_DIR"
        echo "Files: $(ls -1 $PUBLIC_DIR | wc -l)"
    else
        echo "Deployed: No"
    fi

    echo ""
    echo "=== Port Check ==="
    if netstat -tuln 2>/dev/null | grep -q ":8000"; then
        log_info "Port 8000: In use (Backend running)"
    else
        log_warn "Port 8000: Not in use (Backend not running?)"
    fi
}

show_logs() {
    log_step "Application Logs"

    if command -v pm2 &> /dev/null; then
        pm2 logs spectrasynth-crm --lines 50
    else
        if [ -f "${LOGS_DIR}/app.log" ]; then
            tail -50 "${LOGS_DIR}/app.log"
        else
            log_warn "No logs found"
        fi
    fi
}

# Main execution
case "${1:-}" in
    deploy)
        check_prerequisites
        deploy_backend
        deploy_frontend
        check_health
        ;;
    backend)
        check_prerequisites
        deploy_backend
        ;;
    frontend)
        check_prerequisites
        deploy_frontend
        ;;
    status)
        show_status
        ;;
    logs)
        show_logs
        ;;
    restart)
        if command -v pm2 &> /dev/null; then
            pm2 restart spectrasynth-crm
            log_info "Backend restarted"
        else
            log_warn "Use cPanel to restart Node.js application"
        fi
        ;;
    *)
        echo "Usage: $0 {deploy|backend|frontend|status|logs|restart}"
        echo ""
        echo "Commands:"
        echo "  deploy   - Full deployment (backend + frontend)"
        echo "  backend  - Deploy backend only"
        echo "  frontend - Deploy frontend only"
        echo "  status   - Show application status"
        echo "  logs     - Show application logs"
        echo "  restart  - Restart backend"
        exit 1
        ;;
esac
