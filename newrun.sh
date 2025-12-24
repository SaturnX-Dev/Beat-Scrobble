#!/usr/bin/env bash
# ============================================================================
# Premium Media App - Manager Script
# ============================================================================

set -euo pipefail
IFS=$'\n\t'

# ============================================================================
# CONFIGURACIÓN
# ============================================================================

readonly SCRIPT_VERSION="2.1.0"
readonly SCRIPT_NAME="$(basename "${BASH_SOURCE[0]}")"

# Imágenes
IMAGE_NAME="${IMAGE_NAME:-premium-media-app:latest}"
CONTAINER_NAME="premium-media-app"

# Puertos
APP_PORT="${APP_PORT:-3000}"

# ============================================================================
# COLORES Y OUTPUT
# ============================================================================

if [[ -t 1 ]]; then
  readonly C_RED='\033[0;31m'
  readonly C_GREEN='\033[0;32m'
  readonly C_YELLOW='\033[0;33m'
  readonly C_BLUE='\033[0;34m'
  readonly C_MAGENTA='\033[0;35m'
  readonly C_CYAN='\033[0;36m'
  readonly C_BOLD='\033[1m'
  readonly C_DIM='\033[2m'
  readonly C_RESET='\033[0m'
else
  readonly C_RED='' C_GREEN='' C_YELLOW='' C_BLUE='' C_MAGENTA=''
  readonly C_CYAN='' C_BOLD='' C_DIM='' C_RESET=''
fi

log_info()    { printf "${C_BLUE}ℹ️${C_RESET}  %s\n" "$*"; }
log_success() { printf "${C_GREEN}✅${C_RESET} %s\n" "$*"; }
log_warn()    { printf "${C_YELLOW}⚠️${C_RESET}  %s\n" "$*"; }
log_error()   { printf "${C_RED}❌${C_RESET} %s\n" "$*" >&2; }

die() {
  log_error "$*"
  exit 1
}

# ============================================================================
# UTILS & VALIDACIONES
# ============================================================================

check_dependencies() {
  local missing=()
  # Preferimos podman, pero docker también vale
  if command -v podman >/dev/null 2>&1; then
      RUNTIME="podman"
  elif command -v docker >/dev/null 2>&1; then
      RUNTIME="docker"
  else
      missing+=("podman/docker")
  fi

  if [[ ${#missing[@]} -gt 0 ]]; then
    die "Dependencias faltantes: ${missing[*]}"
  fi
}

load_env() {
    # 1. Cargar .env si existe
    if [[ -f .env ]]; then
        set -a
        source <(grep -E '^[A-Za-z0-9_]+=' .env)
        set +a
    fi
    
    # 2. Defaults Generales
    TZ="${TZ:-UTC}"
    
    # 3. Smart Detection: NAS vs Local
    # Verificamos si las rutas de NAS existen en este sistema
    if [[ -d "/volume1" ]] || [[ -d "/volume2" ]]; then
        LOG_ENV="${C_GREEN}NAS Detected (Synology)${C_RESET}"
        DOWNLOAD_LOCATION="${NAS_DOWNLOAD_LOCATION:-$LOCAL_DOWNLOAD_LOCATION}"
        DB_DATA_LOCATION="${NAS_DB_DATA_LOCATION:-$LOCAL_DB_DATA_LOCATION}"
        TRANSCODE_LOCATION="${NAS_TRANSCODE_LOCATION:-$LOCAL_TRANSCODE_LOCATION}"
    else
        LOG_ENV="${C_YELLOW}Local Environment${C_RESET}"
        DOWNLOAD_LOCATION="${LOCAL_DOWNLOAD_LOCATION:-./media}"
        DB_DATA_LOCATION="${LOCAL_DB_DATA_LOCATION:-./data}"
        TRANSCODE_LOCATION="${LOCAL_TRANSCODE_LOCATION:-./cache}"
    fi
    
    # Fallback final por seguridad
    DOWNLOAD_LOCATION="${DOWNLOAD_LOCATION:-./media}"
    DB_DATA_LOCATION="${DB_DATA_LOCATION:-./data}"
    TRANSCODE_LOCATION="${TRANSCODE_LOCATION:-./cache}"
}

show_header() { 
  clear
  echo
  printf "${C_BOLD}${C_MAGENTA}"
  cat << 'EOF'
    ╔════════════════════════════════════════════════════════════════════════╗
    ║    $$$$$$\            $$\  $$$$$$\  $$\   $$\           $$\            ║
    ║   $$  __$$\           $$ |$$  __$$\ $$ |  $$ |          $$ |           ║
    ║   $$ /  \__| $$$$$$\  $$ |$$ /  \__|$$ |  $$ |$$\   $$\ $$$$$$$\       ║
    ║   \$$$$$$\  $$  __$$\ $$ |$$$$\     $$$$$$$$ |$$ |  $$ |$$  __$$\      ║
    ║    \____$$\ $$$$$$$$ |$$ |$$  _|    $$  __$$ |$$ |  $$ |$$ |  $$ |     ║
    ║   $$\   $$ |$$   ____|$$ |$$ |      $$ |  $$ |$$ |  $$ |$$ |  $$ |     ║
    ║   \$$$$$$  |\$$$$$$$\ $$ |$$ |      $$ |  $$ |\$$$$$$  |$$$$$$$  |     ║
    ║    \______/  \_______|\__|\__|      \__|  \__| \______/ \_______/      ║
    ╠════════════════════════════════════════════════════════════════════════╣
    ║                 🦄 SelfHub • Premium Media Manager 🦄                  ║
    ╚════════════════════════════════════════════════════════════════════════╝
EOF
  printf "${C_RESET}"
  printf "         ${C_DIM}v%s${C_RESET} ${C_CYAN}•${C_RESET} ${C_GREEN}Port: %s${C_RESET} ${C_CYAN}•${C_RESET} ${C_BLUE}Runtime: %s${C_RESET} ${C_CYAN}•${C_RESET} %s\n\n" "$SCRIPT_VERSION" "$APP_PORT" "$RUNTIME" "$LOG_ENV"
}

show_separator() {
  printf "${C_DIM}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${C_RESET}\n"
}

prompt_yes_no() {
  local prompt=$1
  local default=${2:-n}
  local answer
  
  if [[ "$default" == "y" ]]; then
    read -rp "$prompt [S/n]: " answer
    answer=${answer:-y}
  else
    read -rp "$prompt [s/N]: " answer
    answer=${answer:-n}
  fi
  
  [[ "$answer" =~ ^[sySY]$ ]]
}

# ============================================================================
# COMANDOS DE CONTENEDOR
# ============================================================================

cmd_start() {
  show_header
  printf "${C_BOLD}▶️  INICIAR STACK (PRODUCCIÓN)${C_RESET}\n\n"
  
  load_env
  
  # Ensure directories exist and have permissions
  mkdir -p "$DOWNLOAD_LOCATION" "$DB_DATA_LOCATION"
  # Fix permissions (Wide open for container access)
  chmod -R 777 "$DOWNLOAD_LOCATION" "$DB_DATA_LOCATION" "$TRANSCODE_LOCATION" 2>/dev/null || true
  
  show_separator
  echo "Configuración:"
  echo "  Imagen:    ${IMAGE_NAME}"
  echo "  Puerto:    ${APP_PORT}"
  echo "  Bebidas:   ${DOWNLOAD_LOCATION}"
  echo "  Data:      ${DB_DATA_LOCATION}"
  show_separator
  
  if ! prompt_yes_no "¿Proceder con el inicio?" "y"; then
    return 0
  fi
  
  echo
  
  # Check if image exists or build it
  if [[ "$($RUNTIME images -q $IMAGE_NAME 2> /dev/null)" == "" ]]; then
      log_warn "Imagen no encontrada. Construyendo..."
      $RUNTIME build -t $IMAGE_NAME .
  fi

  # Stop clean
  if $RUNTIME ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
      log_info "Eliminando contenedor anterior..."
      $RUNTIME rm -f $CONTAINER_NAME >/dev/null
  fi
  
  log_info "Iniciando contenedor..."
  
  # Run Command
  GPU_ARGS=""
  if [[ -d "/dev/dri" ]]; then
      GPU_ARGS="--device /dev/dri:/dev/dri"
      log_info "GPU Intel detectada: Passthrough habilitado (/dev/dri)"
  fi

  $RUNTIME run -d \
      --name $CONTAINER_NAME \
      $GPU_ARGS \
      --restart unless-stopped \
      -p ${APP_PORT}:80 \
      -v "${DOWNLOAD_LOCATION}:/app/media:Z" \
      -v "${DB_DATA_LOCATION}:/app/data:Z" \
      -v "${TRANSCODE_LOCATION}:/app/cache:Z" \
      -e DOWNLOAD_LOCATION=/app/media \
      -e TRANSCODE_LOCATION=/app/cache \
      -e DB_DATA_LOCATION=/app/data \
      -e TZ="${TZ}" \
      -e PUID=$(id -u) \
      -e PGID=$(id -g) \
      $IMAGE_NAME
  
  if [ $? -eq 0 ]; then
      echo
      show_separator
      printf "${C_GREEN}${C_BOLD}✓ Stack iniciado exitosamente${C_RESET}\n\n"
      echo "  App URL: http://localhost:${APP_PORT}"
      show_separator
  else
      die "Falló el inicio del contenedor"
  fi
}

cmd_stop_container() {
    log_info "Deteniendo contenedor..."
    $RUNTIME stop $CONTAINER_NAME >/dev/null 2>&1 || true
    log_success "Detenido."
}

cmd_logs() {
    show_header
    printf "${C_BOLD}📜 LOGS DEL CONTENEDOR${C_RESET}\n\n"
    $RUNTIME logs --tail=50 -f $CONTAINER_NAME
}

cmd_shell() {
    $RUNTIME exec -it $CONTAINER_NAME /bin/sh
}

cmd_rebuild() {
    show_header
    printf "${C_BOLD}♻️  RECONSTRUIR IMAGEN${C_RESET}\n\n"
    log_info "Eliminando imagen anterior..."
    $RUNTIME rmi -f $IMAGE_NAME 2>/dev/null || true
    
    log_info "Reconstruyendo imagen (No Cache)..."
    $RUNTIME build --no-cache -t $IMAGE_NAME .
    
    log_success "Build completo."
    if prompt_yes_no "¿Reiniciar contenedor ahora?" "y"; then
        cmd_start
    fi
}

# ============================================================================
# EXPORT / TOOLS
# ============================================================================

cmd_synology_export() {
    show_header
    printf "${C_BOLD}📦 EXPORTAR PARA SYNOLOGY${C_RESET}\n\n"
    
    log_info "Construyendo imagen sin cache (siempre fresca)..."
    $RUNTIME build --no-cache -t $IMAGE_NAME .
    if [ $? -ne 0 ]; then
        die "Error al construir la imagen"
    fi
    log_success "Imagen construida correctamente"
    
    local output_file="premium_media_synology.tar"
    log_info "Exportando a $output_file ..."
    
    if [[ "$RUNTIME" == "podman" ]]; then
        podman save --format docker-archive -o "$output_file" "$IMAGE_NAME"
    else
        docker save -o "$output_file" "$IMAGE_NAME"
    fi
    
    log_success "Exportado: $(pwd)/$output_file"
    echo "Sube este archivo a tu NAS e impórtalo en Container Manager."
    echo
    read -rp "Enter para continuar..."
}

cmd_nas_deploy() {
    show_header
    printf "${C_BOLD}${C_MAGENTA}🚀 DEPLOY REMOTO A SYNOLOGY NAS${C_RESET}\n\n"
    
    # ==========================================================================
    # CONFIGURACIÓN SSH
    # ==========================================================================
    local NAS_USER="${NAS_SSH_USER:-saturnxdev}"
    local NAS_HOST="${NAS_SSH_HOST:-192.168.1.99}"
    local NAS_PORT="${NAS_SSH_PORT:-22}"
    local DEFAULT_APP_PORT="3000"
    
    show_separator
    printf "${C_CYAN}Configuración actual:${C_RESET}\n"
    echo "  Usuario:  $NAS_USER"
    echo "  Host:     $NAS_HOST"
    echo "  SSH Port: $NAS_PORT"
    show_separator
    echo
    
    # Pedir puerto customizado
    read -rp "Puerto para la app en NAS [${DEFAULT_APP_PORT}]: " custom_port
    custom_port="${custom_port:-$DEFAULT_APP_PORT}"
    
    echo
    log_info "La app se desplegará en: http://${NAS_HOST}:${custom_port}"
    echo
    
    if ! prompt_yes_no "¿Proceder con el deploy?" "y"; then
        return 0
    fi
    
    # ==========================================================================
    # PASO 1: BUILD LOCAL
    # ==========================================================================
    echo
    log_info "📦 Paso 1/4: Construyendo imagen Docker localmente..."
    $RUNTIME build -t $IMAGE_NAME .
    if [ $? -ne 0 ]; then
        die "Error al construir la imagen"
    fi
    log_success "Imagen construida correctamente"
    
    # ==========================================================================
    # PASO 2: EXPORTAR IMAGEN
    # ==========================================================================
    log_info "💾 Paso 2/4: Exportando imagen..."
    local tar_file="/tmp/selfhub_deploy.tar"
    
    # Remove existing tar to avoid podman error
    rm -f "$tar_file"
    
    if [[ "$RUNTIME" == "podman" ]]; then
        podman save --format docker-archive -o "$tar_file" "$IMAGE_NAME"
    else
        docker save -o "$tar_file" "$IMAGE_NAME"
    fi
    log_success "Imagen exportada: $tar_file"
    
    # ==========================================================================
    # PASO 3: TRANSFERIR A NAS VIA SSH
    # ==========================================================================
    log_info "📤 Paso 3/4: Transfiriendo a NAS via SSH..."
    echo "  Conectando a ${NAS_USER}@${NAS_HOST}..."
    echo "  (Se te pedirá la contraseña)"
    echo
    
    # Use -O for legacy SCP protocol (Synology doesn't have SFTP enabled by default)
    scp -O -P "$NAS_PORT" "$tar_file" "${NAS_USER}@${NAS_HOST}:/tmp/selfhub_deploy.tar"
    if [ $? -ne 0 ]; then
        die "Error al transferir la imagen al NAS"
    fi
    log_success "Imagen transferida al NAS"
    
    # ==========================================================================
    # PASO 4: IMPORTAR Y EJECUTAR EN NAS
    # ==========================================================================
    log_info "🐳 Paso 4/4: Importando y ejecutando en NAS..."
    echo "  (Se te pedirá la contraseña nuevamente)"
    echo
    
    # Usar heredoc con variables
    local NAS_CONTAINER_NAME="selfhub-app"
    
    # Use -tt to force TTY allocation for sudo password prompt
    # Script is passed as a single command string
    ssh -tt -p "$NAS_PORT" "${NAS_USER}@${NAS_HOST}" "
echo '==============================================='
echo 'Ejecutando en NAS Synology...'
echo '==============================================='

echo 'Cargando imagen Docker...'
sudo docker load -i /tmp/selfhub_deploy.tar

echo 'Deteniendo contenedor anterior si existe...'
sudo docker rm -f ${NAS_CONTAINER_NAME} 2>/dev/null || true

echo 'Creando directorios...'
sudo mkdir -p /volume1/docker/selfhub/data /volume1/docker/selfhub/cache
sudo chmod -R 777 /volume1/docker/selfhub

echo 'Iniciando contenedor en puerto ${custom_port}...'
sudo docker run -d \\
    --name ${NAS_CONTAINER_NAME} \\
    --restart unless-stopped \\
    --device /dev/dri:/dev/dri \\
    --group-add 937 \\
    -e LIBVA_DRIVER_NAME=i915 \\
    -p ${custom_port}:3000 \\
    -v /volume2/NSFW/NSA:/app/media:rw \\
    -v /volume1/docker/selfhub/data:/app/data:rw \\
    -v /volume1/docker/selfhub/cache:/app/cache:rw \\
    -e DOWNLOAD_LOCATION=/app/media \\
    -e TRANSCODE_LOCATION=/app/cache \\
    -e DB_DATA_LOCATION=/app/data \\
    -e TZ=America/Mexico_City \\
    ${IMAGE_NAME}

rm -f /tmp/selfhub_deploy.tar

echo '==============================================='
echo 'Deploy completado!'
echo '==============================================='
"

    if [ $? -eq 0 ]; then
        # Limpiar archivo local
        rm -f "$tar_file"
        
        echo
        show_separator
        printf "${C_GREEN}${C_BOLD}✅ DEPLOY EXITOSO${C_RESET}\n\n"
        printf "  ${C_CYAN}Tu app está corriendo en:${C_RESET}\n"
        printf "  ${C_BOLD}http://${NAS_HOST}:${custom_port}${C_RESET}\n\n"
        show_separator
    else
        log_error "Hubo un error durante la ejecución remota"
    fi
    
    read -rp "Enter para continuar..."
}

cmd_config_media() {
    show_header
    printf "${C_BOLD}📂 CONFIGURAR RUTAS${C_RESET}\n\n"
    load_env
    echo "Ruta actual DOWNLOAD: $DOWNLOAD_LOCATION"
    
    read -rp "Nueva ruta absoluta: " NEW_PATH
    if [[ -z "$NEW_PATH" ]]; then
        log_error "Ruta vacía"
        return
    fi
    
    if [[ ! -f .env ]]; then touch .env; fi
    
    if grep -q "DOWNLOAD_LOCATION=" .env; then
        sed -i "s|DOWNLOAD_LOCATION=.*|DOWNLOAD_LOCATION=$NEW_PATH|g" .env
    else
        echo "DOWNLOAD_LOCATION=$NEW_PATH" >> .env
    fi
    
    log_success "Actualizado .env"
    read -rp "Enter para continuar..."
}

cmd_factory_reset() {
    show_header
    log_warn "🧨 FACTORY RESET - ESTO BORRARÁ LA BASE DE DATOS"
    if prompt_yes_no "¿Estás MUY seguro?"; then
        cmd_stop_container
        rm -f media/database.sqlite*
        rm -rf media/.thumbnails media/hls
        log_success "Sistema limpiado."
    fi
    read -rp "Enter para continuar..."
}

cmd_build_apk() {
    show_header
    printf "${C_BOLD}📱 COMPILAR APK (ANDROID NATIVE)${C_RESET}\n\n"

    # Initialize JAVA_HOME safely
    JAVA_HOME="${JAVA_HOME:-}"
    export JAVA_HOME

    # Check for native project directory
    if [[ ! -d "android-native" ]]; then
        log_error "Directorio android-native no encontrado."
        return
    fi

    log_info "Proyecto Android Nativo detectado."
    
    cd android-native
    
    # Ensure gradlew is executable
    chmod +x gradlew
    
    # Check/Create local.properties for SDK
    if [[ ! -f "local.properties" ]]; then
        log_warn "local.properties no encontrado. Configurando SDK..."
        
        # Auto-detect common locations
        SDK_PATH=""
        POSSIBLE_PATHS=(
            "$HOME/Android/Sdk"
            "$HOME/Android/sdk"
            "$HOME/Library/Android/sdk"
            "/opt/android-sdk"
            "/usr/lib/android-sdk"
        )
        
        for path in "${POSSIBLE_PATHS[@]}"; do
            if [[ -d "$path" ]]; then
                SDK_PATH="$path"
                log_info "SDK detectado en: $SDK_PATH"
                break
            fi
        done
        
        # Prompt if not found
        if [[ -z "$SDK_PATH" ]]; then
            echo "No se detectó el Android SDK automáticamente."
            read -rp "Ingresa la ruta absoluta del Android SDK: " SDK_PATH
        fi
        
        if [[ -n "$SDK_PATH" ]]; then
            echo "sdk.dir=$SDK_PATH" > local.properties
            log_success "Configuración guardada en local.properties"
        else
            log_error "No se configuró el SDK. La compilación fallará."
        fi
    fi

    # Check for valid JAVA_HOME
    # Same logic as before but adapted for context if needed
    if [[ -d "../tools/jdk-17" ]] && [[ -f "../tools/jdk-17/bin/java" ]]; then
         JAVA_HOME="$(pwd)/../tools/jdk-17"
         export JAVA_HOME
         log_success "Usando JDK Local Integrado: $JAVA_HOME"
    fi

    log_info "Iniciando compilación Gradle (AssembleDebug)..."
    
    if ./gradlew clean assembleDebug; then
        echo
        log_success "APK Nativa Generada exitosamente!"
        echo
        printf "${C_GREEN}${C_BOLD}Ruta: $(pwd)/app/build/outputs/apk/debug/app-debug.apk${C_RESET}\n"
    else
        echo
        log_error "Falló la compilación."
        log_warn "Asegúrate de tener JAVA_HOME y ANDROID_HOME configurados."
    fi
    
    # Return to root
    cd ..
    
    echo
    read -rp "Enter para continuar..."
}

# ============================================================================
# DEV MODE (HOST) - Legacy Option D
# ============================================================================
cmd_dev_host() {
    show_header
    printf "\n${C_BOLD}🛠️  MODO DESARROLLO (DOCKER/PODMAN)${C_RESET}\n"
    printf "${C_DIM}Hot Reloading habilitado para Frontend y Backend.${C_RESET}\n"
    printf "${C_DIM}Access Frontend: http://localhost:5173${C_RESET}\n"
    printf "${C_DIM}Access Backend:  http://localhost:3000${C_RESET}\n\n"

    load_env
    # Ensure directories exist
    mkdir -p "$DOWNLOAD_LOCATION" "$DB_DATA_LOCATION" "$TRANSCODE_LOCATION"
    
    # Export for docker-compose substitution
    export DOWNLOAD_LOCATION
    export DB_DATA_LOCATION
    export TRANSCODE_LOCATION
    export TZ

    log_info "Iniciando entorno de desarrollo..."
    
    if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
        docker compose -f docker-compose.dev.yml up --build
    elif command -v podman-compose >/dev/null 2>&1; then
        podman-compose -f docker-compose.dev.yml up --build
    elif command -v podman >/dev/null 2>&1; then
        log_warn "podman-compose no encontrado. Usando orquestación nativa de Podman..."
        
        # Cleanup previous
        podman rm -f selfhub-dev-backend selfhub-dev-frontend >/dev/null 2>&1 || true
        podman network rm selfhub-dev-net >/dev/null 2>&1 || true
        
        # Network
        podman network create selfhub-dev-net
        
        # Backend
        log_info "Iniciando Backend..."
        podman run -d --name selfhub-dev-backend \
            --network selfhub-dev-net \
            -p 3000:3000 \
            -v ./server:/app:Z \
            -v "$DOWNLOAD_LOCATION":/app/media:Z \
            -v "$DB_DATA_LOCATION":/app/data:Z \
            -v "$TRANSCODE_LOCATION":/app/cache:Z \
            -e DOWNLOAD_LOCATION=/app/media \
            -e TRANSCODE_LOCATION=/app/cache \
            -e DB_DATA_LOCATION=/app/data \
            -e TZ="${TZ}" \
            -w /app \
            --device /dev/dri:/dev/dri \
            golang:1.23-alpine \
            sh -c "apk add --no-cache ffmpeg gcc musl-dev && go install github.com/air-verse/air@v1.52.3 && air"

        # Frontend
        log_info "Iniciando Frontend..."
        podman run -d --name selfhub-dev-frontend \
            --network selfhub-dev-net \
            -p 5173:5173 \
            -v ./client:/app:Z \
            -e VITE_API_URL=http://selfhub-dev-backend:3000 \
            -e CI=true \
            -w /app \
            node:20-alpine \
            sh -c "rm -rf node_modules && npm install -g pnpm && pnpm install && pnpm dev --host"
            
        log_success "Contenedores iniciados en segundo plano."
        log_info "Usa 'podman logs -f selfhub-dev-backend' o 'selfhub-dev-frontend' para ver logs."
        log_info "Presiona Enter para detener y limpiar..."
        read -r
        
        log_info "Deteniendo..."
        podman rm -f selfhub-dev-backend selfhub-dev-frontend
        podman network rm selfhub-dev-net
    else
        die "Necesitas 'docker compose', 'podman-compose' o 'podman' instalado."
    fi
}


# ============================================================================
# MENÚ PRINCIPAL
# ============================================================================

show_menu() {
  load_env
  show_header
  
  # Status check
  if $RUNTIME ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
     STATUS="${C_GREEN}RUNNING ●${C_RESET}"
  else
     STATUS="${C_DIM}STOPPED ○${C_RESET}"
  fi
  
  printf "${C_DIM}Estado: %s${C_RESET}\n\n" "$STATUS"

  printf "${C_BOLD}MENÚ PRINCIPAL:${C_RESET}\n\n"

  printf "  ${C_CYAN}1${C_RESET}  🚀 Iniciar Stack         ${C_DIM}│ Build & Run Container${C_RESET}\n"
  printf "  ${C_CYAN}2${C_RESET}  ♻️  Reconstruir           ${C_DIM}│ Force Rebuild${C_RESET}\n"
  printf "  ${C_CYAN}3${C_RESET}  ⏸️  Detener               ${C_DIM}│ Stop Container${C_RESET}\n"
  printf "  ${C_CYAN}4${C_RESET}  📜 Logs                  ${C_DIM}│ Ver salida${C_RESET}\n"
  printf "  ${C_CYAN}5${C_RESET}  🐚 Shell                 ${C_DIM}│ Entrar al contenedor${C_RESET}\n"
  printf "\n"
  printf "  ${C_CYAN}6${C_RESET}  📂 Config Rutas          ${C_DIM}│ Editar .env${C_RESET}\n"
  printf "  ${C_CYAN}7${C_RESET}  📦 Export Synology       ${C_DIM}│ Generar .tar${C_RESET}\n"
  printf "  ${C_MAGENTA}8${C_RESET}  🚀 Deploy a NAS          ${C_DIM}│ SSH → Build → Run${C_RESET}\n"
  printf "  ${C_CYAN}B${C_RESET}  📱 Build APK             ${C_DIM}│ Gradle AssembleDebug${C_RESET}\n"
  printf "  ${C_GREEN}9${C_RESET}  🧪 Verify Production     ${C_DIM}│ API + UX Testing${C_RESET}\n"
  printf "\n"
  printf "  ${C_YELLOW}D${C_RESET}  🛠️  Modo Desarrollo       ${C_DIM}│ Go + Vite (Host)${C_RESET}\n"
  printf "  ${C_RED}X${C_RESET}  🧨 Factory Reset         ${C_DIM}│ Borrar DB${C_RESET}\n"
  printf "  ${C_CYAN}0${C_RESET}  👋 Salir\n\n"
  
  read -rp "➤ Selecciona: " option
  
  case "$option" in
    1) cmd_start ;;
    2) cmd_rebuild ;;
    3) cmd_stop_container ;;
    4) cmd_logs ;;
    5) cmd_shell ;;
    6) cmd_config_media ;;
    7) cmd_synology_export ;;
    8) cmd_nas_deploy ;;
    b|B) cmd_build_apk ;;
    9) ./scripts/verify-production.sh ;;
    d|D) cmd_dev_host ;;
    x|X) cmd_factory_reset ;;
    0) 
      clear; exit 0 ;;
    *) log_error "Opción no válida" ;;
  esac
  
  echo
  read -rp "Enter para continuar..."
}

main() {
  check_dependencies
  while true; do
    show_menu
  done
}

main "$@"