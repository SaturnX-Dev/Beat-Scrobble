#!/usr/bin/env bash
# ============================================================================
# Beat Scrobble Manager - Gestión de stack Postgres + Beat Scrobble con Podman
# ============================================================================

set -euo pipefail
IFS=$'\n\t'

# ============================================================================
# CONFIGURACIÓN
# ============================================================================

readonly SCRIPT_VERSION="2.0.0"
readonly SCRIPT_NAME="$(basename "${BASH_SOURCE[0]}")"
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Imágenes
IMAGE_BEAT_SCROBBLE="${IMAGE_BEAT_SCROBBLE:-ghcr.io/saturnx-dev/beat-scrobble:latest}"
IMAGE_LOCAL="${IMAGE_LOCAL:-localhost/beat-scrobble:dev}"
IMAGE_GHCR="${IMAGE_GHCR:-ghcr.io/saturnx-dev/beat-scrobble:latest}"
IMAGE_PG="${IMAGE_PG:-docker.io/pgvector/pgvector:pg16}"

# Base de datos
DB_USER="${DB_USER:-postgres}"
DB_PASS="${DB_PASS:-secret}"
DB_NAME="${DB_NAME:-beat-scrobbledb}"

# Puertos - Separados para Local y GHCR
BEAT_SCROBBLE_PORT="${BEAT_SCROBBLE_PORT:-4110}"
PORT_LOCAL="${PORT_LOCAL:-4110}"
PORT_GHCR="${PORT_GHCR:-4111}"
PG_PORT="${PG_PORT:-5432}"
PG_PORT_LOCAL="${PG_PORT_LOCAL:-5432}"
PG_PORT_GHCR="${PG_PORT_GHCR:-5433}"

# Red
NETWORK_MODE="${NETWORK_MODE:-host}"

# Nombres de contenedores - ORIGINALES (para compatibilidad)
readonly BEAT_SCROBBLE_APP_NAME="beat-scrobble-app"
readonly BEAT_SCROBBLE_DB_NAME="beat-scrobble-db"

# Nombres de contenedores - SEPARADOS para Local y GHCR
readonly APP_DEV="beat-scrobble-app-dev"
readonly DB_DEV="beat-scrobble-db-dev"
readonly APP_PROD="beat-scrobble-app"
readonly DB_PROD="beat-scrobble-db"

# Rutas internas del contenedor
readonly BEAT_SCROBBLE_CONFIG_DIR="/app/config"
readonly BEAT_SCROBBLE_IMPORT_DIR="${BEAT_SCROBBLE_CONFIG_DIR}/import"

# Timeouts
readonly DB_STARTUP_TIMEOUT=30
readonly APP_STARTUP_TIMEOUT=15

# Runtime (se detecta en check_dependencies)
RUNTIME="podman"

# NAS Detection
LOG_ENV="${C_YELLOW:-}Local Environment${C_RESET:-}"

# Rutas de datos (se configuran en load_env)
MUSIC_LOCATION=""
DB_DATA_LOCATION=""
CONFIG_LOCATION=""
TZ="${TZ:-UTC}"

# Rutas NAS (Synology defaults)
NAS_MUSIC_LOCATION="${NAS_MUSIC_LOCATION:-/volume1/music}"
NAS_DB_DATA_LOCATION="${NAS_DB_DATA_LOCATION:-/volume1/docker/beat-scrobble/data}"
NAS_CONFIG_LOCATION="${NAS_CONFIG_LOCATION:-/volume1/docker/beat-scrobble/config}"

# Rutas Local (defaults)
LOCAL_MUSIC_LOCATION="${LOCAL_MUSIC_LOCATION:-./music}"
LOCAL_DB_DATA_LOCATION="${LOCAL_DB_DATA_LOCATION:-./data}"
LOCAL_CONFIG_LOCATION="${LOCAL_CONFIG_LOCATION:-./config}"

# SSH para NAS deploy
NAS_SSH_USER="${NAS_SSH_USER:-admin}"
NAS_SSH_HOST="${NAS_SSH_HOST:-192.168.1.100}"
NAS_SSH_PORT="${NAS_SSH_PORT:-22}"


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
log_debug()   { [[ "${DEBUG:-}" == "1" ]] && printf "${C_DIM}🔍 %s${C_RESET}\n" "$*"; }

die() {
  log_error "$*"
  exit 1
}

# ============================================================================
# VALIDACIONES
# ============================================================================

check_dependencies() {
  local missing=()
  
  # Runtime flexible: preferimos podman, pero docker también vale
  if command -v podman >/dev/null 2>&1; then
    RUNTIME="podman"
  elif command -v docker >/dev/null 2>&1; then
    RUNTIME="docker"
  else
    missing+=("podman/docker")
  fi
  
  # Herramientas adicionales
  for cmd in jq; do
    command -v "$cmd" >/dev/null 2>&1 || missing+=("$cmd")
  done
  
  if [[ ${#missing[@]} -gt 0 ]]; then
    die "Dependencias faltantes: ${missing[*]}"
  fi
}

# ============================================================================
# CARGA DE ENTORNO - NAS vs LOCAL AUTO-DETECTION
# ============================================================================

load_env() {
    # 1. Cargar .env si existe
    if [[ -f .env ]]; then
        set -a
        source <(grep -E '^[A-Za-z0-9_]+=' .env) 2>/dev/null || true
        set +a
    fi
    
    # 2. Smart Detection: NAS vs Local
    # Verificamos si las rutas de NAS existen en este sistema
    if [[ -d "/volume1" ]] || [[ -d "/volume2" ]]; then
        LOG_ENV="${C_GREEN}NAS Detected (Synology)${C_RESET}"
        MUSIC_LOCATION="${NAS_MUSIC_LOCATION:-/volume1/music}"
        DB_DATA_LOCATION="${NAS_DB_DATA_LOCATION:-/volume1/docker/beat-scrobble/data}"
        CONFIG_LOCATION="${NAS_CONFIG_LOCATION:-/volume1/docker/beat-scrobble/config}"
    else
        LOG_ENV="${C_YELLOW}Local Environment${C_RESET}"
        MUSIC_LOCATION="${LOCAL_MUSIC_LOCATION:-./music}"
        DB_DATA_LOCATION="${LOCAL_DB_DATA_LOCATION:-./data}"
        CONFIG_LOCATION="${LOCAL_CONFIG_LOCATION:-./config}"
    fi
    
    # 3. Fallback final por seguridad
    MUSIC_LOCATION="${MUSIC_LOCATION:-./music}"
    DB_DATA_LOCATION="${DB_DATA_LOCATION:-./data}"
    CONFIG_LOCATION="${CONFIG_LOCATION:-./config}"
    TZ="${TZ:-UTC}"
}


validate_port() {
  local port=$1
  if ! [[ "$port" =~ ^[0-9]+$ ]] || ((port < 1 || port > 65535)); then
    die "Puerto inválido: $port"
  fi
}

validate_network_mode() {
  local mode=$1
  if [[ ! "$mode" =~ ^(host|bridge)$ ]]; then
    die "Modo de red inválido: $mode (debe ser 'host' o 'bridge')"
  fi
}

image_exists() {
  local image=$1
  local name="${image%:*}"
  local tag="${image#*:}"
  
  # Buscar la imagen con cualquier prefijo (localhost/, docker.io/library/, etc.)
  local result=$(podman images --format '{{.Repository}}:{{.Tag}}' 2>/dev/null | grep -E "(^|/)${name}:${tag}$" || true)
  
  [[ -n "$result" ]]
}

container_exists() {
  local name=$1
  podman ps -a --format '{{.Names}}' | grep -qx "$name"
}

container_running() {
  local name=$1
  podman ps --format '{{.Names}}' | grep -qx "$name"
}

# ============================================================================
# SMART DETECTION - Detecta qué stack está corriendo
# ============================================================================

get_active_stack() {
  local dev_running=false
  local prod_running=false
  
  container_running "$APP_DEV" && dev_running=true
  container_running "$APP_PROD" && prod_running=true
  
  if $dev_running && $prod_running; then
    echo "both"
  elif $dev_running; then
    echo "dev"
  elif $prod_running; then
    echo "prod"
  else
    echo "none"
  fi
}

smart_select_container() {
  local action=$1
  local stack=$(get_active_stack)
  
  case "$stack" in
    "dev")
      echo "$APP_DEV"
      ;;
    "prod")
      echo "$APP_PROD"
      ;;
    "both")
      echo
      printf "${C_YELLOW}Ambos stacks están corriendo. ¿Cuál quieres usar?${C_RESET}\n"
      printf "  ${C_CYAN}1${C_RESET} - Local (DEV) - puerto ${PORT_LOCAL}\n"
      printf "  ${C_CYAN}2${C_RESET} - GHCR (PROD) - puerto ${PORT_GHCR}\n"
      read -rp "➤ Selecciona: " choice
      case "$choice" in
        1) echo "$APP_DEV" ;;
        2) echo "$APP_PROD" ;;
        *) echo "" ;;
      esac
      ;;
    "none")
      log_warn "No hay contenedores corriendo"
      echo ""
      ;;
  esac
}

smart_select_db() {
  local stack=$(get_active_stack)
  
  case "$stack" in
    "dev") echo "$DB_DEV" ;;
    "prod") echo "$DB_PROD" ;;
    "both")
      printf "${C_YELLOW}¿Cuál DB?${C_RESET}\n  1 - LOCAL\n  2 - GHCR\n"
      read -rp "➤ " choice
      [[ "$choice" == "1" ]] && echo "$DB_DEV" || echo "$DB_PROD"
      ;;
    *) echo "" ;;
  esac
}

# ============================================================================
# HELPERS DE USUARIO
# ============================================================================

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

prompt_value() {
  local prompt=$1
  local default=$2
  local value
  
  read -rp "$prompt [${C_CYAN}${default}${C_RESET}]: " value
  echo "${value:-$default}"
}

show_header() {
  clear
  echo
  printf "${C_BOLD}${C_MAGENTA}"
  cat << 'EOF'
    ╔══════════════════════════════════════════════════════════════════╗
    ║  🎵 ╔╗  ╔═╗  ╔═╗  ╔╦╗    ╔═╗  ╔═╗  ╦═╗  ╔═╗  ╔╗  ╔╗  ╦    ╔═╗ 🎵 ║
    ║     ╠╩╗ ║╣   ╠═╣   ║     ╚═╗  ║    ╠╦╝  ║ ║  ╠╩╗ ╠╩╗ ║    ║╣     ║
    ║     ╚═╝ ╚═╝  ╩ ╩   ╩     ╚═╝  ╚═╝  ╩╚═  ╚═╝  ╚═╝ ╚═╝ ╩═╝  ╚═╝    ║
    ╠══════════════════════════════════════════════════════════════════╣
    ║          🐳 Docker Management Tool • Self-Hosted Music 🐳        ║
    ╚══════════════════════════════════════════════════════════════════╝
EOF
  printf "${C_RESET}"
  printf "         ${C_DIM}v%s${C_RESET} ${C_CYAN}•${C_RESET} ${C_GREEN}%s${C_RESET} ${C_CYAN}•${C_RESET} :${PORT_LOCAL}/:${PORT_GHCR} ${C_CYAN}•${C_RESET} %s\n\n" "$SCRIPT_VERSION" "$RUNTIME" "$LOG_ENV"
}


show_separator() {
  printf "${C_DIM}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${C_RESET}\n"
}

# Barra de progreso animada
show_progress() {
  local current=$1
  local total=$2
  local width=40
  local percent=$((current * 100 / total))
  local filled=$((current * width / total))
  local empty=$((width - filled))
  
  printf "\r  ${C_CYAN}["
  printf "%${filled}s" | tr ' ' '█'
  printf "%${empty}s" | tr ' ' '░'
  printf "]${C_RESET} ${C_BOLD}%3d%%${C_RESET}" "$percent"
}

# Spinner animado
show_spinner() {
  local pid=$1
  local msg="${2:-Procesando...}"
  local spinners=('⠋' '⠙' '⠹' '⠸' '⠼' '⠴' '⠦' '⠧' '⠇' '⠏')
  local i=0
  
  while kill -0 "$pid" 2>/dev/null; do
    printf "\r  ${C_CYAN}${spinners[$i]}${C_RESET} ${msg}"
    i=$(( (i + 1) % ${#spinners[@]} ))
    sleep 0.1
  done
  printf "\r  ${C_GREEN}✓${C_RESET} ${msg}\n"
}

# Animación de éxito
show_success_animation() {
  local msg="${1:-¡Completado!}"
  printf "\n"
  printf "  ${C_GREEN}╭────────────────────────────────────────╮${C_RESET}\n"
  printf "  ${C_GREEN}│${C_RESET}  ✨ ${C_BOLD}${C_GREEN}%s${C_RESET}  ${C_GREEN}│${C_RESET}\n" "$msg"
  printf "  ${C_GREEN}╰────────────────────────────────────────╯${C_RESET}\n"
}

# ============================================================================
# OPERACIONES DE CONTENEDORES
# ============================================================================

wait_for_db() {
  local timeout=$DB_STARTUP_TIMEOUT
  local elapsed=0
  
  log_info "Esperando a que Postgres esté listo..."
  
  while ((elapsed < timeout)); do
    if podman exec "$BEAT_SCROBBLE_DB_NAME" pg_isready -U "$DB_USER" >/dev/null 2>&1; then
      log_success "Postgres listo en ${elapsed}s"
      return 0
    fi
    sleep 1
    ((elapsed++))
    printf "${C_DIM}.${C_RESET}"
  done
  
  echo
  log_error "Timeout esperando Postgres después de ${timeout}s"
  return 1
}

wait_for_app() {
  local timeout=$APP_STARTUP_TIMEOUT
  local elapsed=0
  
  log_info "Esperando a que Beat Scrobble responda..."
  
  while ((elapsed < timeout)); do
    if curl -sf "http://localhost:${BEAT_SCROBBLE_PORT}/health" >/dev/null 2>&1; then
      log_success "Beat Scrobble listo en ${elapsed}s"
      return 0
    fi
    sleep 1
    ((elapsed++))
    printf "${C_DIM}.${C_RESET}"
  done
  
  echo
  log_warn "Beat Scrobble no responde health check después de ${timeout}s (puede ser normal)"
  return 0
}

cleanup_containers() {
  local containers=("$BEAT_SCROBBLE_APP_NAME" "$BEAT_SCROBBLE_DB_NAME")
  
  for container in "${containers[@]}"; do
    if container_exists "$container"; then
      log_info "Eliminando contenedor: $container"
      podman rm -f "$container" >/dev/null 2>&1 || true
    fi
  done
}

# ============================================================================
# COMANDOS PRINCIPALES
# ============================================================================

cmd_build() {
  show_header
  printf "${C_BOLD}CONSTRUIR IMAGEN DOCKER (PRIMERA VEZ)${C_RESET}\n\n"
  
  local dockerfile_path="${1:-.}"
  
  if [[ ! -f "${dockerfile_path}/Dockerfile" ]]; then
    die "No se encontró Dockerfile en: ${dockerfile_path}"
  fi
  
  log_info "Ruta del Dockerfile: ${dockerfile_path}/Dockerfile"
  
  show_separator
  echo "Configuración de build:"
  echo "  Dockerfile: ${dockerfile_path}/Dockerfile"
  echo "  Tag:        ${IMAGE_BEAT_SCROBBLE}"
  show_separator
  
  if ! prompt_yes_no "¿Proceder con la construcción?" "y"; then
    log_info "Operación cancelada"
    return 0
  fi
  
  echo
  local version=$(prompt_value "Versión de Beat Scrobble" "2.0.0")
  
  log_info "Construyendo imagen Docker ($version)..."
  log_info "Esto puede tomar varios minutos..."
  echo
  
  if podman build --build-arg BEAT_SCROBBLE_VERSION="$version" -t "$IMAGE_BEAT_SCROBBLE" "$dockerfile_path"; then
    log_success "Imagen construida exitosamente: $IMAGE_BEAT_SCROBBLE"
    
    echo
    show_separator
    printf "${C_GREEN}${C_BOLD}✓ Imagen Docker creada${C_RESET}\n\n"
    echo "  Tag: ${IMAGE_BEAT_SCROBBLE}"
    echo
    echo "${C_CYAN}Próximo paso:${C_RESET}"
    echo "  Usa 'Iniciar stack' (opción 2) para crear y arrancar los contenedores"
    show_separator
  else
    die "Falló la construcción de la imagen"
  fi
}

cmd_start() {
  show_header
  printf "${C_BOLD}INICIAR STACK (CREAR Y ARRANCAR CONTENEDORES)${C_RESET}\n\n"
  
  # Validaciones
  validate_port "$BEAT_SCROBBLE_PORT"
  validate_port "$PG_PORT"
  validate_network_mode "$NETWORK_MODE"
  
  if ! image_exists "$IMAGE_BEAT_SCROBBLE"; then
    log_error "Imagen no encontrada: $IMAGE_BEAT_SCROBBLE"
    echo
    if prompt_yes_no "¿Deseas construir la imagen primero?"; then
      cmd_build
      if ! image_exists "$IMAGE_BEAT_SCROBBLE"; then
        die "No se pudo construir la imagen"
      fi
    else
      die "No se puede iniciar sin imagen"
    fi
  fi
  
  if ! image_exists "$IMAGE_PG"; then
    log_warn "Descargando imagen de Postgres..."
    podman pull "$IMAGE_PG" || die "No se pudo descargar $IMAGE_PG"
  fi
  
  show_separator
  echo "Configuración:"
  echo "  Beat Scrobble:    ${IMAGE_BEAT_SCROBBLE} → :${BEAT_SCROBBLE_PORT}"
  echo "  Postgres: ${IMAGE_PG} → :${PG_PORT}"
  echo "  Database: ${DB_NAME}"
  echo "  Red:      ${NETWORK_MODE}"
  show_separator
  
  if ! prompt_yes_no "¿Proceder con el inicio?" "y"; then
    log_info "Operación cancelada"
    return 0
  fi
  
  echo
  
  # Limpieza de contenedores anteriores si existen
  cleanup_containers
  
  # Postgres
  log_info "Creando Postgres..."
  local db_url="postgres://${DB_USER}:${DB_PASS}@localhost:${PG_PORT}/${DB_NAME}?sslmode=disable"
  
  podman run -d \
    --name "$BEAT_SCROBBLE_DB_NAME" \
    --network host \
    -e POSTGRES_USER="$DB_USER" \
    -e POSTGRES_PASSWORD="$DB_PASS" \
    -e POSTGRES_DB="$DB_NAME" \
    "$IMAGE_PG" >/dev/null
  
  log_success "Postgres creado"
  
  wait_for_db || die "Postgres no arrancó correctamente"
  
  # Beat Scrobble
  log_info "Creando Beat Scrobble..."
  
  podman run -d \
    --name "$BEAT_SCROBBLE_APP_NAME" \
    --network host \
    -e BEAT_SCROBBLE_DATABASE_URL="$db_url" \
    -e BEAT_SCROBBLE_ALLOWED_HOSTS="*" \
    "$IMAGE_BEAT_SCROBBLE" >/dev/null
  
  log_success "Beat Scrobble creado"
  
  wait_for_app
  
  echo
  show_separator
  printf "${C_GREEN}${C_BOLD}✓ Stack iniciado exitosamente${C_RESET}\n\n"
  echo "  Beat Scrobble:    http://localhost:${BEAT_SCROBBLE_PORT}"
  echo "  Postgres: localhost:${PG_PORT}"
  echo "  DB URL:   ${db_url}"
  echo
  echo "${C_CYAN}Próximo paso (opcional):${C_RESET}"
  echo "  Usa 'Importar archivo' (opción 3) para importar tus datos"
  show_separator
}

cmd_stop() {
  show_header
  printf "${C_BOLD}DETENER CONTENEDORES${C_RESET}\n\n"
  
  local stopped=0
  
  for container in "$BEAT_SCROBBLE_APP_NAME" "$BEAT_SCROBBLE_DB_NAME"; do
    if container_running "$container"; then
      log_info "Deteniendo: $container"
      if podman stop "$container" >/dev/null 2>&1; then
        log_success "Detenido: $container"
        ((stopped++))
      else
        log_error "Falló detención de: $container"
      fi
    else
      log_warn "No está corriendo: $container"
    fi
  done
  
  if ((stopped == 0)); then
    log_warn "No se detuvo ningún contenedor"
  else
    log_success "Contenedores detenidos: $stopped"
  fi
}

cmd_restart() {
  show_header
  printf "${C_BOLD}REINICIAR CONTENEDORES${C_RESET}\n\n"
  
  local restarted=0
  
  for container in "$BEAT_SCROBBLE_DB_NAME" "$BEAT_SCROBBLE_APP_NAME"; do
    if container_exists "$container"; then
      log_info "Reiniciando: $container"
      if podman restart "$container" >/dev/null 2>&1; then
        log_success "Reiniciado: $container"
        ((restarted++))
      else
        log_error "Falló reinicio de: $container"
      fi
    else
      log_warn "No existe: $container"
    fi
  done
  
  if ((restarted == 0)); then
    log_warn "No se reinició ningún contenedor"
  fi
}

cmd_status() {
  show_header
  printf "${C_BOLD}ESTADO DE CONTENEDORES${C_RESET}\n\n"
  
  if ! container_exists "$BEAT_SCROBBLE_DB_NAME" && ! container_exists "$BEAT_SCROBBLE_APP_NAME"; then
    log_warn "No hay contenedores de Beat Scrobble"
    return 0
  fi
  
  podman ps -a \
    --filter "name=${BEAT_SCROBBLE_DB_NAME}" \
    --filter "name=${BEAT_SCROBBLE_APP_NAME}" \
    --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
}


cmd_import() {
  show_header
  printf "${C_BOLD}IMPORTAR ARCHIVO${C_RESET}\n\n"
  
  if ! container_running "$BEAT_SCROBBLE_APP_NAME"; then
    log_error "Beat Scrobble no está ejecutándose. Inicia el stack primero."
    return 1
  fi
  
  printf "${C_CYAN}Formatos soportados:${C_RESET}\n"
  echo "  • Spotify:       JSON con 'Streaming_History_Audio' en el nombre"
  echo "  • Maloja:        JSON con 'maloja' en el nombre"
  echo "  • Last.fm:       Export JSON de ghan.nl"
  echo "  • ListenBrainz:  Archivo .zip oficial"
  echo
  
  # Bucle para permitir múltiples importaciones
  while true; do
    local file_path
    read -rp "Ruta completa al archivo (o 'q' para salir): " file_path
    
    # Permitir salir
    if [[ "$file_path" == "q" || "$file_path" == "Q" ]]; then
      log_info "Saliendo de importación"
      return 0
    fi
    
    # Expandir ~ si existe
    file_path="${file_path/#\~/$HOME}"
    
    if [[ -z "$file_path" ]]; then
      log_warn "No se proporcionó ruta de archivo"
      continue
    fi
    
    if [[ ! -f "$file_path" ]]; then
      log_error "Archivo no encontrado: $file_path"
      continue
    fi
    
    # Validar tamaño de archivo
    local file_size=$(stat -f%z "$file_path" 2>/dev/null || stat -c%s "$file_path" 2>/dev/null)
    local file_size_mb=$((file_size / 1024 / 1024))
    
    log_info "Tamaño del archivo: ${file_size_mb} MB"
    
    if ((file_size_mb > 500)); then
      log_warn "⚠️  Archivo muy grande (${file_size_mb} MB)"
      if ! prompt_yes_no "¿Continuar de todas formas?"; then
        continue
      fi
    fi
    
    # Detectar extensión
    local ext="${file_path##*.}"
    local filename=$(basename "$file_path")
    
    if [[ ! "$ext" =~ ^(json|zip)$ ]]; then
      log_error "Extensión no válida: .$ext (solo .json o .zip)"
      continue
    fi
    
    # Validar formato según extensión
    local format_detected="Desconocido"
    
    if [[ "$ext" == "json" ]]; then
      log_info "Validando formato JSON..."
      
      if ! jq empty "$file_path" 2>/dev/null; then
        log_error "❌ El archivo no es un JSON válido"
        continue
      fi
      
      # Detectar tipo de JSON
      if [[ "$filename" =~ [Ss]treaming.*[Hh]istory ]]; then
        format_detected="Spotify"
      elif [[ "$filename" =~ [Mm]aloja ]]; then
        format_detected="Maloja"
      elif jq -e '.recenttracks' "$file_path" >/dev/null 2>&1; then
        format_detected="Last.fm"
      else
        format_detected="JSON genérico"
      fi
      
      log_success "✓ JSON válido detectado: ${format_detected}"
      
    elif [[ "$ext" == "zip" ]]; then
      log_info "Validando archivo ZIP..."
      
      if ! unzip -t "$file_path" >/dev/null 2>&1; then
        log_error "❌ El archivo ZIP está corrupto o no es válido"
        continue
      fi
      
      format_detected="ListenBrainz (ZIP)"
      log_success "✓ ZIP válido detectado: ${format_detected}"
    fi
    
    echo
    show_separator
    printf "${C_BOLD}Resumen de importación:${C_RESET}\n"
    echo "  Archivo:  ${filename}"
    echo "  Formato:  ${format_detected}"
    echo "  Tamaño:   ${file_size_mb} MB"
    echo "  Destino:  ${BEAT_SCROBBLE_IMPORT_DIR}/"
    show_separator
    echo
    
    if ! prompt_yes_no "¿Proceder con la importación?" "y"; then
      log_info "Importación cancelada"
      continue
    fi
    
    echo
    log_info "Preparando importación..."
    
    # Crear directorio de import en contenedor
    log_info "[1/3] Creando directorio de import..."
    if ! podman exec "$BEAT_SCROBBLE_APP_NAME" mkdir -p "$BEAT_SCROBBLE_IMPORT_DIR" 2>/dev/null; then
      log_error "No se pudo crear directorio en contenedor"
      continue
    fi
    log_success "✓ Directorio creado"
    
    # Copiar archivo
    log_info "[2/3] Copiando archivo al contenedor ($file_size_mb MB)..."
    if ! podman cp "$file_path" "${BEAT_SCROBBLE_APP_NAME}:${BEAT_SCROBBLE_IMPORT_DIR}/"; then
      log_error "❌ Falló la copia del archivo"
      continue
    fi
    log_success "✓ Archivo copiado exitosamente"
    
    # Verificar que el archivo se copió correctamente
    log_info "Verificando copia..."
    if ! podman exec "$BEAT_SCROBBLE_APP_NAME" test -f "${BEAT_SCROBBLE_IMPORT_DIR}/${filename}"; then
      log_error "❌ El archivo no se encuentra en el contenedor"
      continue
    fi
    log_success "✓ Archivo verificado en contenedor"
    
    # Reiniciar para procesar
    log_info "[3/3] Reiniciando Beat Scrobble para procesar import..."
    if ! podman restart "$BEAT_SCROBBLE_APP_NAME" >/dev/null 2>&1; then
      log_error "❌ Falló el reinicio del contenedor"
      continue
    fi
    
    echo
    show_separator
    printf "${C_GREEN}${C_BOLD}✅ Import iniciado exitosamente${C_RESET}\n\n"
    echo "  Archivo: ${filename}"
    echo "  Formato: ${format_detected}"
    echo
    echo "${C_CYAN}Próximos pasos:${C_RESET}"
    echo "  1. Usa 'Logs' (opción 8) para monitorear el progreso"
    echo "  2. El procesamiento puede tomar varios minutos"
    echo "  3. Busca mensajes de 'import' o 'scrobble' en los logs"
    show_separator
    echo
    
    # Preguntar si quiere importar más archivos
    if ! prompt_yes_no "¿Deseas importar otro archivo?"; then
      break
    fi
    
    echo
  done
  
  log_success "Importación completada"
}

cmd_logs() {
  show_header
  printf "${C_BOLD}LOGS DE BEAT_SCROBBLE${C_RESET}\n\n"
  
  if ! container_exists "$BEAT_SCROBBLE_APP_NAME"; then
    die "Contenedor $BEAT_SCROBBLE_APP_NAME no existe"
  fi
  
  local lines=${1:-100}
  podman logs --tail="$lines" "$BEAT_SCROBBLE_APP_NAME" 2>&1 || die "No se pudieron obtener logs"
}

cmd_shell() {
  show_header
  printf "${C_BOLD}SHELL EN CONTENEDOR${C_RESET}\n\n"
  
  local container=${1:-$BEAT_SCROBBLE_APP_NAME}
  
  if ! container_running "$container"; then
    die "Contenedor $container no está ejecutándose"
  fi
  
  log_info "Abriendo shell en: $container"
  podman exec -it "$container" /bin/sh || podman exec -it "$container" /bin/bash
}

cmd_backup_db() {
  show_header
  printf "${C_BOLD}BACKUP DE BASE DE DATOS${C_RESET}\n\n"
  
  if ! container_running "$BEAT_SCROBBLE_DB_NAME"; then
    die "Postgres no está ejecutándose"
  fi
  
  local timestamp=$(date +%Y%m%d_%H%M%S)
  local backup_file="beat-scrobble_backup_${timestamp}.sql"
  
  log_info "Creando backup: $backup_file"
  
  podman exec "$BEAT_SCROBBLE_DB_NAME" pg_dump -U "$DB_USER" "$DB_NAME" > "$backup_file" \
    || die "Falló backup"
  
  log_success "Backup guardado: $backup_file"
  log_info "Tamaño: $(du -h "$backup_file" | cut -f1)"
}

cmd_update() {
  show_header
  printf "${C_BOLD}ACTUALIZAR CON CAMBIOS (REBUILD + RECREATE)${C_RESET}\n\n"
  
  local dockerfile_path="${1:-.}"
  
  if [[ ! -f "${dockerfile_path}/Dockerfile" ]]; then
    die "No se encontró Dockerfile en: ${dockerfile_path}"
  fi
  
  log_info "Este comando:"
  echo "  1. Reconstruye la imagen Docker con tus cambios"
  echo "  2. Recreacont el contenedor deBeat Scrobble con la nueva imagen"
  echo
  
  show_separator
  echo "Configuración:"
  echo "  Dockerfile: ${dockerfile_path}/Dockerfile"
  echo "  Tag:        ${IMAGE_BEAT_SCROBBLE}"
  show_separator
  
  if ! prompt_yes_no "¿Proceder con la actualización?" "y"; then
    log_info "Operación cancelada"
    return 0
  fi
  
  echo
  
  # Paso 1: Rebuild
  log_info "[1/2] Reconstruyendo imagen Docker..."
  log_info "Esto puede tomar varios minutos..."
  echo
  local version=$(prompt_value "Versión de Beat Scrobble/Update" "2.0.0")
  
  if ! podman build --build-arg BEAT_SCROBBLE_VERSION="$version" -t "$IMAGE_BEAT_SCROBBLE" "$dockerfile_path"; then
    die "Falló la construcción de la imagen"
  fi
  
  log_success "Imagen reconstruida: $IMAGE_BEAT_SCROBBLE"
  echo
  
  # Paso 2: Recreate
  log_info "[2/2] Recreando contenedor de Beat Scrobble..."
  
  if ! container_running "$BEAT_SCROBBLE_DB_NAME"; then
    die "Base de datos no está ejecutándose. Inicia el stack primero con 'start'"
  fi
  
  # Obtener URL de base de datos
  local db_url="postgres://${DB_USER}:${DB_PASS}@localhost:${PG_PORT}/${DB_NAME}?sslmode=disable"
  
  # Detener y eliminar contenedor de Beat Scrobble
  if container_exists "$BEAT_SCROBBLE_APP_NAME"; then
    log_info "Deteniendo contenedor existente..."
    podman stop "$BEAT_SCROBBLE_APP_NAME" >/dev/null 2>&1 || true
    
    log_info "Eliminando contenedor existente..."
    podman rm "$BEAT_SCROBBLE_APP_NAME" >/dev/null 2>&1 || true
  fi
  
  # Crear nuevo contenedor con imagen actualizada
  podman run -d \
    --name "$BEAT_SCROBBLE_APP_NAME" \
    --network host \
    -e BEAT_SCROBBLE_DATABASE_URL="$db_url" \
    -e BEAT_SCROBBLE_ALLOWED_HOSTS="*" \
    "$IMAGE_BEAT_SCROBBLE" >/dev/null
  
  log_success "Contenedor recreado con nueva imagen"
  
  wait_for_app
  
  echo
  show_separator
  printf "${C_GREEN}${C_BOLD}✓ Actualización completada${C_RESET}\n\n"
  echo "  URL:    http://localhost:${BEAT_SCROBBLE_PORT}"
  echo "  Imagen: ${IMAGE_BEAT_SCROBBLE}"
  echo
  echo "${C_CYAN}¡Tus cambios de UI ya están aplicados!${C_RESET}"
  show_separator
}

cmd_recreate() {
  show_header
  printf "${C_BOLD}RECREAR CONTENEDORES CON NUEVA IMAGEN${C_RESET}\n\n"
  
  # Verificar que la imagen existe
  if ! image_exists "$IMAGE_BEAT_SCROBBLE"; then
    log_error "Imagen no encontrada: $IMAGE_BEAT_SCROBBLE"
    echo
    if prompt_yes_no "¿Deseas construir la imagen primero?"; then
      cmd_build
      if ! image_exists "$IMAGE_BEAT_SCROBBLE"; then
        die "No se pudo construir la imagen"
      fi
    else
      return 1
    fi
  fi
  
  # Obtener configuración actual de los contenedores existentes
  if container_exists "$BEAT_SCROBBLE_APP_NAME"; then
    log_info "Detectando configuración actual..."
    
    # Extraer puerto actual
    local current_port=$(podman inspect "$BEAT_SCROBBLE_APP_NAME" --format '{{range .HostConfig.PortBindings}}{{range .}}{{.HostPort}}{{end}}{{end}}' 2>/dev/null || echo "$BEAT_SCROBBLE_PORT")
    BEAT_SCROBBLE_PORT="${current_port:-$BEAT_SCROBBLE_PORT}"
    
    # Extraer variables de entorno
    local db_url=$(podman inspect "$BEAT_SCROBBLE_APP_NAME" --format '{{range .Config.Env}}{{println .}}{{end}}' 2>/dev/null | grep BEAT_SCROBBLE_DATABASE_URL | cut -d'=' -f2-)
    
    if [[ -n "$db_url" ]]; then
      log_info "Configuración detectada desde contenedor existente"
    fi
  fi
  
  if ! container_running "$BEAT_SCROBBLE_DB_NAME"; then
    log_warn "Base de datos no está ejecutándose"
    if prompt_yes_no "¿Deseas iniciar todo el stack desde cero?"; then
      cmd_reset
      return $?
    else
      die "No se puede recrear Beat Scrobble sin base de datos activa"
    fi
  fi
  
  # Obtener URL de base de datos
  local db_url="postgres://${DB_USER}:${DB_PASS}@localhost:${PG_PORT}/${DB_NAME}?sslmode=disable"
  
  show_separator
  echo "Configuración:"
  echo "  Imagen:   ${IMAGE_BEAT_SCROBBLE}"
  echo "  Puerto:   ${BEAT_SCROBBLE_PORT}"
  echo "  DB:       ${db_url}"
  show_separator
  
  if ! prompt_yes_no "¿Recrear contenedor de Beat Scrobble con esta configuración?"; then
    log_info "Operación cancelada"
    return 0
  fi
  
  echo
  
  # Detener y eliminar contenedor de Beat Scrobble
  if container_exists "$BEAT_SCROBBLE_APP_NAME"; then
    log_info "Deteniendo contenedor existente..."
    podman stop "$BEAT_SCROBBLE_APP_NAME" >/dev/null 2>&1 || true
    
    log_info "Eliminando contenedor existente..."
    podman rm "$BEAT_SCROBBLE_APP_NAME" >/dev/null 2>&1 || true
    
    log_success "Contenedor anterior eliminado"
  fi
  
  # Crear nuevo contenedor con imagen actualizada
  log_info "Creando contenedor con nueva imagen..."
  
  podman run -d \
    --name "$BEAT_SCROBBLE_APP_NAME" \
    --network host \
    -e BEAT_SCROBBLE_DATABASE_URL="$db_url" \
    -e BEAT_SCROBBLE_ALLOWED_HOSTS="*" \
    "$IMAGE_BEAT_SCROBBLE" >/dev/null
  
  log_success "Contenedor creado con nueva imagen"
  
  wait_for_app
  
  echo
  show_separator
  printf "${C_GREEN}${C_BOLD}✓ Beat Scrobble recreado exitosamente${C_RESET}\n\n"
  echo "  URL:    http://localhost:${BEAT_SCROBBLE_PORT}"
  echo "  Imagen: ${IMAGE_BEAT_SCROBBLE}"
  show_separator
}

cmd_synology() {
  show_header
  printf "${C_BOLD}SOPORTE SYNOLOGY NAS${C_RESET}\n\n"
  
  echo "Herramientas para facilitar el despliegue en Synology:"
  echo "  1. Exportar imagen Docker (para importar en Container Manager)"
  echo "  2. Generar docker-compose.yml (para crear Proyecto)"
  echo
  
  local option
  read -rp "Selecciona opción (1-2): " option
  
  case "$option" in
    1)
      echo
      log_info "Exportando imagen ${IMAGE_BEAT_SCROBBLE}..."
      local output_file="beat-scrobble_image.tar"
      
      if ! image_exists "$IMAGE_BEAT_SCROBBLE"; then
        log_error "Imagen no encontrada: $IMAGE_BEAT_SCROBBLE"
        if prompt_yes_no "¿Deseas construirla primero?"; then
          cmd_build
        else
          return 1
        fi
      fi
      
      rm -f "$output_file"
      
      if podman save --format docker-archive -o "$output_file" "$IMAGE_BEAT_SCROBBLE"; then
        log_success "Imagen exportada a: $output_file"
        echo
        echo "Instrucciones para Synology:"
        echo "1. Sube '$output_file' a tu NAS"
        echo "2. Abre Container Manager -> Imagen -> Importar"
        echo "3. Selecciona el archivo y sigue los pasos"
      else
        die "Falló la exportación de la imagen"
      fi
      ;;
      
    2)
      echo
      log_info "Generando docker-compose.yml..."
      
      cat > docker-compose.yml <<EOF
version: '3.8'

services:
  beat-scrobble-db:
    image: ${IMAGE_PG}
    container_name: ${BEAT_SCROBBLE_DB_NAME}
    restart: always
    environment:
      - POSTGRES_USER=${DB_USER}
      - POSTGRES_PASSWORD=${DB_PASS}
      - POSTGRES_DB=${DB_NAME}
    volumes:
      - ./pgdata:/var/lib/postgresql/data
    networks:
      - beat-scrobble-net

  beat-scrobble-app:
    image: ${IMAGE_BEAT_SCROBBLE}
    container_name: ${BEAT_SCROBBLE_APP_NAME}
    restart: always
    ports:
      - "${BEAT_SCROBBLE_PORT}:4110"
    environment:
      - BEAT_SCROBBLE_DATABASE_URL=postgres://${DB_USER}:${DB_PASS}@beat-scrobble-db:5432/${DB_NAME}?sslmode=disable
      - BEAT_SCROBBLE_ALLOWED_HOSTS=*
    depends_on:
      - beat-scrobble-db
    networks:
      - beat-scrobble-net

networks:
  beat-scrobble-net:
    driver: bridge
EOF
      
      log_success "Archivo generado: docker-compose.yml"
      echo
      echo "Instrucciones para Synology:"
      echo "1. Abre Container Manager -> Proyecto -> Crear"
      echo "2. Sube este 'docker-compose.yml'"
      echo "3. Sigue el asistente para finalizar"
      ;;
      
    *)
      log_error "Opción inválida"
      ;;
  esac
}

cmd_publish() {
  cmd_workflow_docker_publish
}

# ============================================================================
# GITHUB WORKFLOWS MANAGEMENT
# ============================================================================

check_gh_cli() {
  if ! command -v gh &> /dev/null; then
    log_error "GitHub CLI (gh) no está instalado."
    echo "  Instalación: https://cli.github.com/manual/installation"
    echo "  Autenticación: gh auth login"
    return 1
  fi
  return 0
}

cmd_workflow_docker_publish() {
  show_header
  printf "${C_BOLD}🚀 WORKFLOW: Docker Publish (GHCR)${C_RESET}\n\n"
  
  check_gh_cli || return 1
  
  echo "Este workflow construye y publica la imagen en GitHub Container Registry."
  echo "Asegúrate de haber hecho commit y push de tus cambios."
  echo
  
  if prompt_yes_no "¿Disparar workflow docker-publish.yml?"; then
    local version=$(prompt_value "Versión a publicar (ej. 2.0.0)" "2.0.0")
    
    log_info "Disparando workflow (version=$version)..."
    if gh workflow run docker-publish.yml -f version="$version"; then
      log_success "Workflow disparado: docker-publish.yml"
      echo "Ver progreso: https://github.com/SaturnX-Dev/Beat-Scrobble/actions"
    else
      log_error "Error al disparar workflow"
    fi
  fi
}

cmd_workflow_docker() {
  show_header
  printf "${C_BOLD}🐳 WORKFLOW: Docker Build & Test${C_RESET}\n\n"
  
  check_gh_cli || return 1
  
  echo "Este workflow ejecuta tests de Go y construye imagen Docker."
  echo
  
  if prompt_yes_no "¿Disparar workflow docker.yml?"; then
    log_info "Disparando workflow..."
    if gh workflow run docker.yml; then
      log_success "Workflow disparado: docker.yml"
    else
      log_error "Error al disparar workflow"
    fi
  fi
}

cmd_workflow_test() {
  show_header
  printf "${C_BOLD}🧪 WORKFLOW: Go Tests${C_RESET}\n\n"
  
  check_gh_cli || return 1
  
  echo "Este workflow ejecuta los tests de Go."
  echo
  
  if prompt_yes_no "¿Disparar workflow test.yml?"; then
    log_info "Disparando workflow..."
    if gh workflow run test.yml; then
      log_success "Workflow disparado: test.yml"
    else
      log_error "Error al disparar workflow"
    fi
  fi
}



cmd_workflow_clean() {
  show_header
  printf "${C_BOLD}🧹 WORKFLOW: Clean Caches${C_RESET}\n\n"
  
  check_gh_cli || return 1
  
  echo "Este workflow limpia todos los caches de GitHub Actions."
  echo
  
  if prompt_yes_no "¿Disparar workflow clean.yml?"; then
    log_info "Disparando workflow..."
    if gh workflow run clean.yml; then
      log_success "Workflow disparado: clean.yml"
    else
      log_error "Error al disparar workflow"
    fi
  fi
}

cmd_workflow_status() {
  show_header
  printf "${C_BOLD}📊 STATUS DE WORKFLOWS${C_RESET}\n\n"
  
  check_gh_cli || return 1
  
  log_info "Últimas ejecuciones de workflows:"
  echo
  gh run list --limit 10
}

cmd_workflows_menu() {
  show_header
  printf "${C_BOLD}🔄 GITHUB WORKFLOWS${C_RESET}\n\n"
  
  check_gh_cli || return 1
  
  printf "${C_DIM}╭─────────────────────────────────────────────────────────╮${C_RESET}\n"
  printf "${C_DIM}│${C_RESET} ${C_BOLD}Disparar Workflows${C_RESET}                                   ${C_DIM}│${C_RESET}\n"
  printf "${C_DIM}╰─────────────────────────────────────────────────────────╯${C_RESET}\n"
  printf "  ${C_CYAN}1${C_RESET}  🚀 Docker Publish  - Publicar a GHCR (Manual)\n"
  printf "  ${C_CYAN}2${C_RESET}  🐳 Docker Build    - Build y test\n"
  printf "  ${C_CYAN}3${C_RESET}  🧪 Go Tests        - Ejecutar tests\n"
  printf "  ${C_CYAN}4${C_RESET}  🧹 Clean Caches    - Limpiar caches\n"
  printf "\n"
  printf "${C_DIM}╭─────────────────────────────────────────────────────────╮${C_RESET}\n"
  printf "${C_DIM}│${C_RESET} ${C_BOLD}Monitoreo${C_RESET}                                             ${C_DIM}│${C_RESET}\n"
  printf "${C_DIM}╰─────────────────────────────────────────────────────────╯${C_RESET}\n"
  printf "  ${C_CYAN}5${C_RESET}  📊 Status          - Ver últimas ejecuciones\n"
  printf "  ${C_CYAN}6${C_RESET}  🌐 Abrir Actions   - Abrir en navegador\n"
  printf "\n"
  printf "  ${C_CYAN}0${C_RESET}  ⬅️  Volver\n\n"
  
  read -rp "➤ Selecciona: " wf_option
  echo
  
  case "$wf_option" in
    1) cmd_workflow_docker_publish ;;
    2) cmd_workflow_docker ;;
    3) cmd_workflow_test ;;
    4) cmd_workflow_clean ;;
    5) cmd_workflow_status ;;
    6) 
      log_info "Abriendo GitHub Actions..."
      xdg-open "https://github.com/SaturnX-Dev/Beat-Scrobble/actions" 2>/dev/null || \
      open "https://github.com/SaturnX-Dev/Beat-Scrobble/actions" 2>/dev/null || \
      echo "https://github.com/SaturnX-Dev/Beat-Scrobble/actions"
      ;;
    0) return ;;
    *) log_error "Opción inválida" ;;
  esac
}

# ============================================================================
# COMANDOS NUEVOS - DESARROLLO LOCAL
# ============================================================================

cmd_build_local() {
  show_header
  printf "${C_BOLD}🏗️  CONSTRUIR IMAGEN LOCAL${C_RESET}\n\n"
  
  local dockerfile_path="${1:-.}"
  
  if [[ ! -f "${dockerfile_path}/Dockerfile" ]]; then
    die "No se encontró Dockerfile en: ${dockerfile_path}"
  fi
  
  show_separator
  echo "Configuración LOCAL:"
  echo "  Dockerfile: ${dockerfile_path}/Dockerfile"
  echo "  Tag:        ${IMAGE_LOCAL}"
  show_separator
  
  if ! prompt_yes_no "¿Proceder con la construcción?" "y"; then
    log_info "Operación cancelada"
    return 0
  fi
  
  echo
  local version=$(prompt_value "Versión de Beat Scrobble" "2.0.0")

  log_info "Construyendo imagen Docker LOCAL ($version)..."
  log_info "Esto puede tomar varios minutos..."
  echo
  
  if podman build --build-arg BEAT_SCROBBLE_VERSION="$version" -t "$IMAGE_LOCAL" "$dockerfile_path"; then
    log_success "Imagen LOCAL construida: $IMAGE_LOCAL"
  else
    die "Falló la construcción"
  fi
}

cmd_start_local() {
  show_header
  printf "${C_BOLD}▶️  INICIAR STACK LOCAL (DEV)${C_RESET}\n\n"
  
  if ! image_exists "$IMAGE_LOCAL"; then
    log_error "Imagen local no encontrada: $IMAGE_LOCAL"
    if prompt_yes_no "¿Construirla ahora?"; then
      cmd_build_local
    else
      return 1
    fi
  fi
  
  # Crear red bridge si no existe
  if ! podman network exists beat-scrobble-net; then
    podman network create beat-scrobble-net >/dev/null
  fi

  # NOTA: En red bridge, la app contacta a la DB por nombre de contenedor, no localhost
  local db_url="postgres://${DB_USER}:${DB_PASS}@${DB_DEV}:5432/${DB_NAME}?sslmode=disable"
  
  show_separator
  echo "Configuración LOCAL:"
  echo "  App:     ${IMAGE_LOCAL} → :${PORT_LOCAL}"
  echo "  DB:      ${IMAGE_PG} → :${PG_PORT_LOCAL}"
  echo "  DB URL:  ${db_url}"
  show_separator
  
  if ! prompt_yes_no "¿Iniciar stack LOCAL?" "y"; then
    return 0
  fi
  
  # NUCLEAR: Protocolo de limpieza de puertos redundante
  if sudo lsof -i :${PG_PORT_LOCAL} -t >/dev/null 2>&1 || ss -tln | grep -q ":${PG_PORT_LOCAL} "; then
    log_warn "Puerto ${PG_PORT_LOCAL} ocupado. Iniciando protocolo NUCLEAR..."
    
    # 1. fuser (El más efectivo para puertos)
    if command -v fuser >/dev/null 2>&1; then
       log_info "Ejecutando fuser -k..."
       sudo fuser -k -n tcp ${PG_PORT_LOCAL} >/dev/null 2>&1 || true
    fi

    # 2. lsof (Clásico)
    sudo lsof -i :${PG_PORT_LOCAL} -t | xargs sudo kill -9 >/dev/null 2>&1 || true
    
    # 3. ss/netstat parsing (Último recurso, busca PIDs)
    # Busca procesos escuchando en el puerto y los mata
    if command -v ss >/dev/null 2>&1; then
        pids=$(sudo ss -lptn "sport = :${PG_PORT_LOCAL}" | grep -o 'pid=[0-9]*' | cut -d= -f2)
        if [ ! -z "$pids" ]; then
            echo "$pids" | xargs sudo kill -9 >/dev/null 2>&1 || true
        fi
    fi

    sleep 5
    
    # Verificación final
    if sudo lsof -i :${PG_PORT_LOCAL} -t >/dev/null 2>&1; then
        log_error "¡No se pudo liberar el puerto 5432! Algo muy extraño ocurre."
        log_warn "Intenta reiniciar tu máquina o matar manualmente los procesos 'postgres'."
        return 1
    fi
    
    log_success "Puerto ${PG_PORT_LOCAL} liberado y verificado."
  fi
  
  # Limpiar contenedores anteriores DEV
  for c in "$APP_DEV" "$DB_DEV"; do
    container_exists "$c" && podman rm -f "$c" >/dev/null 2>&1
  done
  
  # (Eliminado montaje de config local problemático)
  
  # Verificar imagen Postgres
  if ! image_exists "$IMAGE_PG"; then
    log_info "Descargando imagen Postgres..."
    podman pull "$IMAGE_PG" || die "No se pudo descargar $IMAGE_PG"
  fi
  
  # Iniciar Postgres DEV - Puerto específico para no conflictar con Postgres local
  log_info "Iniciando Postgres (DEV) en puerto ${PG_PORT_LOCAL}..."
  podman run -d \
    --name "$DB_DEV" \
    --network beat-scrobble-net \
    -p "${PG_PORT_LOCAL}:5432" \
    -e POSTGRES_USER="$DB_USER" \
    -e POSTGRES_PASSWORD="$DB_PASS" \
    -e POSTGRES_DB="$DB_NAME" \
    "$IMAGE_PG" >/dev/null
  
  # Esperar DB
  log_info "Esperando Postgres en puerto ${PG_PORT_LOCAL}..."
  sleep 3
  for i in {1..30}; do
    podman exec "$DB_DEV" pg_isready -U "$DB_USER" -p "5432" >/dev/null 2>&1 && break
    sleep 1
  done
  log_success "Postgres DEV listo"
  
  # Iniciar App DEV con volumen de config
  log_info "Iniciando Beat Scrobble (DEV)..."
  podman run -d \
    --name "$APP_DEV" \
    --network beat-scrobble-net \
    -p "${PORT_LOCAL}:4110" \
    -e BEAT_SCROBBLE_DATABASE_URL="$db_url" \
    -e BEAT_SCROBBLE_CONFIG_DIR="/app/config" \
    -e BEAT_SCROBBLE_ALLOWED_HOSTS="*" \
    "$IMAGE_LOCAL" >/dev/null
  
  # Verificar que el contenedor está corriendo
  sleep 2
  if ! container_running "$APP_DEV"; then
    log_error "¡El contenedor falló al iniciar!"
    echo
    log_info "Mostrando logs del error:"
    podman logs "$APP_DEV" 2>&1 | tail -20
    echo
    log_warn "Posibles soluciones:"
    echo "  1. Verifica que el puerto ${PORT_LOCAL} no esté ocupado"
    echo "  2. Revisa los logs completos con: podman logs $APP_DEV"
    return 1
  fi
  
  echo
  show_separator
  printf "${C_GREEN}${C_BOLD}✓ Stack LOCAL iniciado${C_RESET}\n\n"
  echo "  URL: http://localhost:${PORT_LOCAL}"
  show_separator
}

cmd_update_local() {
  show_header
  printf "${C_BOLD}♻️  UPDATE LOCAL (REBUILD + RECREATE)${C_RESET}\n\n"
  
  local dockerfile_path="${1:-.}"
  
  log_info "Paso 1/2: Reconstruyendo imagen LOCAL..."
  cmd_build_local "$dockerfile_path"
  
  echo
  log_info "Paso 2/2: Recreando contenedor DEV..."
  
  if container_exists "$APP_DEV"; then
    podman stop "$APP_DEV" >/dev/null 2>&1 || true
    podman rm "$APP_DEV" >/dev/null 2>&1 || true
  fi
  
  # Crear red bridge si no existe
  if ! podman network exists beat-scrobble-net; then
    podman network create beat-scrobble-net >/dev/null
  fi

  local db_url="postgres://${DB_USER}:${DB_PASS}@${DB_DEV}:5432/${DB_NAME}?sslmode=disable"
  
  podman run -d \
    --name "$APP_DEV" \
    --network beat-scrobble-net \
    -p "${PORT_LOCAL}:4110" \
    -e BEAT_SCROBBLE_DATABASE_URL="$db_url" \
    -e BEAT_SCROBBLE_CONFIG_DIR="/app/config" \
    -e BEAT_SCROBBLE_ALLOWED_HOSTS="*" \
    "$IMAGE_LOCAL" >/dev/null
  
  echo
  show_separator
  printf "${C_GREEN}${C_BOLD}✓ Update LOCAL completado${C_RESET}\n"
  echo "  URL: http://localhost:${PORT_LOCAL}"
  show_separator
}

# ============================================================================
# COMANDOS NUEVOS - PRODUCCIÓN GHCR
# ============================================================================

cmd_pull_ghcr() {
  show_header
  printf "${C_BOLD}⬇️  DESCARGAR IMAGEN GHCR${C_RESET}\n\n"
  
  log_info "Descargando: ${IMAGE_GHCR}"
  
  if podman pull "$IMAGE_GHCR"; then
    log_success "Imagen GHCR descargada: $IMAGE_GHCR"
  else
    die "Falló la descarga"
  fi
}

cmd_start_ghcr() {
  show_header
  printf "${C_BOLD}▶️  INICIAR STACK GHCR (PROD)${C_RESET}\n\n"
  
  if ! image_exists "$IMAGE_GHCR"; then
    log_warn "Imagen GHCR no encontrada localmente"
    if prompt_yes_no "¿Descargarla ahora?"; then
      cmd_pull_ghcr
    else
      return 1
    fi
  fi
  
  local db_url="postgres://${DB_USER}:${DB_PASS}@localhost:${PG_PORT_GHCR}/${DB_NAME}?sslmode=disable"
  
  show_separator
  echo "Configuración GHCR:"
  echo "  App:     ${IMAGE_GHCR} → :${PORT_GHCR}"
  echo "  DB:      ${IMAGE_PG} → :${PG_PORT_GHCR}"
  show_separator
  
  if ! prompt_yes_no "¿Iniciar stack GHCR?" "y"; then
    return 0
  fi
  
  # Limpiar contenedores anteriores PROD
  for c in "$APP_PROD" "$DB_PROD"; do
    container_exists "$c" && podman rm -f "$c" >/dev/null 2>&1
  done
  
  # Crear directorio de config local
  local config_dir="${PWD}/config-prod"
  mkdir -p "$config_dir"
  
  # Iniciar Postgres PROD - Puerto diferente para no conflictar con DEV
  log_info "Iniciando Postgres (PROD) en puerto ${PG_PORT_GHCR}..."
  podman run -d \
    --name "$DB_PROD" \
    --network host \
    -e POSTGRES_USER="$DB_USER" \
    -e POSTGRES_PASSWORD="$DB_PASS" \
    -e POSTGRES_DB="$DB_NAME" \
    -e PGPORT="$PG_PORT_GHCR" \
    "$IMAGE_PG" >/dev/null
  
  # Esperar DB
  sleep 3
  for i in {1..30}; do
    podman exec "$DB_PROD" pg_isready -U "$DB_USER" -p "$PG_PORT_GHCR" >/dev/null 2>&1 && break
    sleep 1
  done
  log_success "Postgres PROD listo"
  
  # Iniciar App PROD con volumen de config
  log_info "Iniciando Beat Scrobble (PROD)..."
  podman run -d \
    --name "$APP_PROD" \
    --network host \
    -e BEAT_SCROBBLE_DATABASE_URL="$db_url" \
    -e BEAT_SCROBBLE_CONFIG_DIR="/app/config" \
    -e BEAT_SCROBBLE_ALLOWED_HOSTS="*" \
    "$IMAGE_GHCR" >/dev/null
  
  # Verificar que el contenedor está corriendo
  sleep 2
  if ! container_running "$APP_PROD"; then
    log_error "¡El contenedor falló al iniciar!"
    echo
    log_info "Mostrando logs del error:"
    podman logs "$APP_PROD" 2>&1 | tail -20
    echo
    log_warn "Posibles soluciones:"
    echo "  1. Verifica que el puerto ${PORT_GHCR} no esté ocupado"
    echo "  2. Revisa los logs completos con: podman logs $APP_PROD"
    return 1
  fi
  
  echo
  show_separator
  printf "${C_GREEN}${C_BOLD}✓ Stack GHCR iniciado${C_RESET}\n\n"
  echo "  URL: http://localhost:${PORT_GHCR}"
  show_separator
}

# ============================================================================
# COMANDOS SMART (auto-detectan Local o GHCR)
# ============================================================================

cmd_stop_smart() {
  show_header
  printf "${C_BOLD}⏸️  DETENER CONTENEDORES (SMART)${C_RESET}\n\n"
  
  local stack=$(get_active_stack)
  
  case "$stack" in
    "dev")
      log_info "Deteniendo stack LOCAL..."
      podman stop "$APP_DEV" "$DB_DEV" >/dev/null 2>&1 || true
      log_success "Stack LOCAL detenido"
      ;;
    "prod")
      log_info "Deteniendo stack GHCR..."
      podman stop "$APP_PROD" "$DB_PROD" >/dev/null 2>&1 || true
      log_success "Stack GHCR detenido"
      ;;
    "both")
      printf "${C_YELLOW}Ambos stacks corriendo. ¿Cuál detener?${C_RESET}\n"
      printf "  ${C_CYAN}1${C_RESET} - Local (DEV)\n"
      printf "  ${C_CYAN}2${C_RESET} - GHCR (PROD)\n"
      printf "  ${C_CYAN}3${C_RESET} - Ambos\n"
      read -rp "➤ Selecciona: " choice
      case "$choice" in
        1) podman stop "$APP_DEV" "$DB_DEV" >/dev/null 2>&1; log_success "LOCAL detenido" ;;
        2) podman stop "$APP_PROD" "$DB_PROD" >/dev/null 2>&1; log_success "GHCR detenido" ;;
        3) podman stop "$APP_DEV" "$DB_DEV" "$APP_PROD" "$DB_PROD" >/dev/null 2>&1; log_success "Ambos detenidos" ;;
      esac
      ;;
    "none")
      log_warn "No hay contenedores corriendo"
      ;;
  esac
}

cmd_logs_smart() {
  show_header
  printf "${C_BOLD}📜 LOGS (SMART)${C_RESET}\n\n"
  
  local container=$(smart_select_container "logs")
  
  if [[ -n "$container" ]]; then
    local lines=${1:-100}
    log_info "Logs de $container (últimas $lines líneas):"
    echo
    podman logs --tail="$lines" "$container" 2>&1
  fi
}

cmd_shell_smart() {
  show_header
  printf "${C_BOLD}🐚 SHELL (SMART)${C_RESET}\n\n"
  
  local container=$(smart_select_container "shell")
  
  if [[ -n "$container" ]]; then
    log_info "Abriendo shell en $container..."
    podman exec -it "$container" /bin/sh || podman exec -it "$container" /bin/bash
  fi
}

cmd_status_smart() {
  show_header
  printf "${C_BOLD}📊 ESTADO DE CONTENEDORES${C_RESET}\n\n"
  
  echo "=== LOCAL (DEV) ==="
  if container_running "$APP_DEV"; then
    printf "${C_GREEN}●${C_RESET} App:  $APP_DEV (puerto $PORT_LOCAL)\n"
  else
    printf "${C_DIM}○${C_RESET} App:  $APP_DEV (no corriendo)\n"
  fi
  if container_running "$DB_DEV"; then
    printf "${C_GREEN}●${C_RESET} DB:   $DB_DEV (puerto $PG_PORT_LOCAL)\n"
  else
    printf "${C_DIM}○${C_RESET} DB:   $DB_DEV (no corriendo)\n"
  fi
  
  echo
  echo "=== GHCR (PROD) ==="
  if container_running "$APP_PROD"; then
    printf "${C_GREEN}●${C_RESET} App:  $APP_PROD (puerto $PORT_GHCR)\n"
  else
    printf "${C_DIM}○${C_RESET} App:  $APP_PROD (no corriendo)\n"
  fi
  if container_running "$DB_PROD"; then
    printf "${C_GREEN}●${C_RESET} DB:   $DB_PROD (puerto $PG_PORT_GHCR)\n"
  else
    printf "${C_DIM}○${C_RESET} DB:   $DB_PROD (no corriendo)\n"
  fi
  
  echo
  echo "=== LEGACY (compatibilidad) ==="
  if container_running "$BEAT_SCROBBLE_APP_NAME"; then
    printf "${C_GREEN}●${C_RESET} App:  $BEAT_SCROBBLE_APP_NAME\n"
  fi
  if container_running "$BEAT_SCROBBLE_DB_NAME"; then
    printf "${C_GREEN}●${C_RESET} DB:   $BEAT_SCROBBLE_DB_NAME\n"
  fi
}

cmd_backup_smart() {
  show_header
  printf "${C_BOLD}💾 BACKUP BASE DE DATOS (SMART)${C_RESET}\n\n"
  
  local db_container=$(smart_select_db)
  
  if [[ -z "$db_container" ]]; then
    die "No hay DB corriendo"
  fi
  
  local timestamp=$(date +%Y%m%d_%H%M%S)
  local backup_file="beat-scrobble_backup_${timestamp}.sql"
  
  log_info "Creando backup desde $db_container..."
  podman exec "$db_container" pg_dump -U "$DB_USER" "$DB_NAME" > "$backup_file"
  
  log_success "Backup: $backup_file"
  log_info "Tamaño: $(du -h "$backup_file" | cut -f1)"
}

cmd_import_smart() {
  show_header
  printf "${C_BOLD}📥 IMPORTAR ARCHIVO (SMART)${C_RESET}\n\n"
  
  local container=$(smart_select_container "import")
  
  if [[ -z "$container" ]]; then
    die "No hay contenedor activo para importar"
  fi
  
  printf "${C_CYAN}Formatos soportados:${C_RESET}\n"
  echo "  • Spotify:       JSON con 'Streaming_History_Audio' en el nombre"
  echo "  • Maloja:        JSON con 'maloja' en el nombre"
  echo "  • Last.fm:       Export JSON de ghan.nl"
  echo "  • ListenBrainz:  Archivo .zip oficial"
  echo
  
  while true; do
    local file_path
    read -rp "Ruta completa al archivo (o 'q' para salir): " file_path
    
    if [[ "$file_path" == "q" || "$file_path" == "Q" ]]; then
      log_info "Saliendo de importación"
      return 0
    fi
    
    file_path="${file_path/#\~/$HOME}"
    
    if [[ -z "$file_path" ]]; then
      log_warn "No se proporcionó ruta de archivo"
      continue
    fi
    
    if [[ ! -f "$file_path" ]]; then
      log_error "Archivo no encontrado: $file_path"
      continue
    fi
    
    local file_size=$(stat -f%z "$file_path" 2>/dev/null || stat -c%s "$file_path" 2>/dev/null)
    local file_size_mb=$((file_size / 1024 / 1024))
    local ext="${file_path##*.}"
    local filename=$(basename "$file_path")
    
    if [[ ! "$ext" =~ ^(json|zip)$ ]]; then
      log_error "Extensión no válida: .$ext (solo .json o .zip)"
      continue
    fi
    
    local format_detected="Desconocido"
    
    if [[ "$ext" == "json" ]]; then
      if ! jq empty "$file_path" 2>/dev/null; then
        log_error "❌ El archivo no es un JSON válido"
        continue
      fi
      
      if [[ "$filename" =~ [Ss]treaming.*[Hh]istory ]]; then
        format_detected="Spotify"
      elif [[ "$filename" =~ [Mm]aloja ]]; then
        format_detected="Maloja"
      elif jq -e '.recenttracks' "$file_path" >/dev/null 2>&1; then
        format_detected="Last.fm"
      else
        format_detected="JSON genérico"
      fi
      log_success "✓ JSON válido: ${format_detected}"
      
    elif [[ "$ext" == "zip" ]]; then
      if ! unzip -t "$file_path" >/dev/null 2>&1; then
        log_error "❌ ZIP corrupto"
        continue
      fi
      format_detected="ListenBrainz (ZIP)"
      log_success "✓ ZIP válido: ${format_detected}"
    fi
    
    echo
    show_separator
    echo "  Archivo:  ${filename}"
    echo "  Formato:  ${format_detected}"
    echo "  Tamaño:   ${file_size_mb} MB"
    echo "  Destino:  ${container}:${BEAT_SCROBBLE_IMPORT_DIR}/"
    show_separator
    
    if ! prompt_yes_no "¿Proceder?" "y"; then
      continue
    fi
    
    podman exec "$container" mkdir -p "$BEAT_SCROBBLE_IMPORT_DIR"
    podman cp "$file_path" "${container}:${BEAT_SCROBBLE_IMPORT_DIR}/"
    podman restart "$container" >/dev/null 2>&1
    
    log_success "Import iniciado en $container"
    
    if ! prompt_yes_no "¿Importar otro archivo?"; then
      break
    fi
  done
}

# ============================================================================
# FUNCIONES ADICIONALES DE NEWRUN (ADAPTADAS PARA BEAT SCROBBLE)
# ============================================================================

cmd_config_rutas() {
    show_header
    printf "${C_BOLD}📂 CONFIGURAR RUTAS${C_RESET}\n\n"
    
    # Cargar .env si existe
    if [[ -f .env ]]; then
        set -a
        source <(grep -E '^[A-Za-z0-9_]+=' .env) 2>/dev/null || true
        set +a
    fi
    
    echo "Rutas actuales:"
    echo "  MUSIC_LOCATION:  ${LOCAL_MUSIC_LOCATION:-./music}"
    echo "  DB_DATA:         ${LOCAL_DB_DATA_LOCATION:-./data}"
    echo "  CONFIG:          ${LOCAL_CONFIG_LOCATION:-./config}"
    echo
    
    read -rp "Nueva ruta para música (vacío = no cambiar): " NEW_MUSIC
    read -rp "Nueva ruta para BD (vacío = no cambiar): " NEW_DB
    read -rp "Nueva ruta para config (vacío = no cambiar): " NEW_CONFIG
    
    if [[ ! -f .env ]]; then touch .env; fi
    
    if [[ -n "$NEW_MUSIC" ]]; then
        if grep -q "LOCAL_MUSIC_LOCATION=" .env; then
            sed -i "s|LOCAL_MUSIC_LOCATION=.*|LOCAL_MUSIC_LOCATION=$NEW_MUSIC|g" .env
        else
            echo "LOCAL_MUSIC_LOCATION=$NEW_MUSIC" >> .env
        fi
        log_success "MUSIC_LOCATION actualizado: $NEW_MUSIC"
    fi
    
    if [[ -n "$NEW_DB" ]]; then
        if grep -q "LOCAL_DB_DATA_LOCATION=" .env; then
            sed -i "s|LOCAL_DB_DATA_LOCATION=.*|LOCAL_DB_DATA_LOCATION=$NEW_DB|g" .env
        else
            echo "LOCAL_DB_DATA_LOCATION=$NEW_DB" >> .env
        fi
        log_success "DB_DATA_LOCATION actualizado: $NEW_DB"
    fi
    
    if [[ -n "$NEW_CONFIG" ]]; then
        if grep -q "LOCAL_CONFIG_LOCATION=" .env; then
            sed -i "s|LOCAL_CONFIG_LOCATION=.*|LOCAL_CONFIG_LOCATION=$NEW_CONFIG|g" .env
        else
            echo "LOCAL_CONFIG_LOCATION=$NEW_CONFIG" >> .env
        fi
        log_success "CONFIG_LOCATION actualizado: $NEW_CONFIG"
    fi
}

cmd_nas_deploy() {
    show_header
    printf "${C_BOLD}${C_MAGENTA}🚀 DEPLOY REMOTO A SYNOLOGY NAS${C_RESET}\n\n"
    
    local NAS_USER="${NAS_SSH_USER:-saturnxdev}"
    local NAS_HOST="${NAS_SSH_HOST:-192.168.1.99}"
    local NAS_PORT="${NAS_SSH_PORT:-22}"
    local DEFAULT_APP_PORT="4110"
    
    show_separator
    printf "${C_CYAN}Configuración SSH:${C_RESET}\n"
    echo "  Usuario:  $NAS_USER"
    echo "  Host:     $NAS_HOST"
    echo "  SSH Port: $NAS_PORT"
    show_separator
    echo
    
    read -rp "Puerto para Beat Scrobble en NAS [${DEFAULT_APP_PORT}]: " custom_port
    custom_port="${custom_port:-$DEFAULT_APP_PORT}"
    
    echo
    log_info "Beat Scrobble se desplegará en: http://${NAS_HOST}:${custom_port}"
    echo
    
    if ! prompt_yes_no "¿Proceder con el deploy?" "y"; then
        return 0
    fi
    
    # PASO 1: BUILD LOCAL
    echo
    log_info "📦 Paso 1/4: Construyendo imagen Docker localmente..."
    podman build -t "$IMAGE_LOCAL" .
    if [ $? -ne 0 ]; then
        die "Error al construir la imagen"
    fi
    log_success "Imagen construida correctamente"
    
    # PASO 2: EXPORTAR IMAGEN
    log_info "💾 Paso 2/4: Exportando imagen..."
    local tar_file="/tmp/beat_scrobble_deploy.tar"
    rm -f "$tar_file"
    
    podman save --format docker-archive -o "$tar_file" "$IMAGE_LOCAL"
    log_success "Imagen exportada: $tar_file"
    
    # PASO 3: TRANSFERIR A NAS VIA SSH
    log_info "📤 Paso 3/4: Transfiriendo a NAS via SSH..."
    echo "  Conectando a ${NAS_USER}@${NAS_HOST}..."
    echo "  (Se te pedirá la contraseña)"
    echo
    
    scp -O -P "$NAS_PORT" "$tar_file" "${NAS_USER}@${NAS_HOST}:/tmp/beat_scrobble_deploy.tar"
    if [ $? -ne 0 ]; then
        die "Error al transferir la imagen al NAS"
    fi
    log_success "Imagen transferida al NAS"
    
    # PASO 4: IMPORTAR Y EJECUTAR EN NAS
    log_info "🐳 Paso 4/4: Importando y ejecutando en NAS..."
    echo "  (Se te pedirá la contraseña nuevamente)"
    echo
    
    local NAS_CONTAINER_NAME="beat-scrobble-app"
    
    ssh -tt -p "$NAS_PORT" "${NAS_USER}@${NAS_HOST}" "
echo '==============================================='
echo 'Ejecutando en NAS Synology...'
echo '==============================================='

echo 'Cargando imagen Docker...'
sudo docker load -i /tmp/beat_scrobble_deploy.tar

echo 'Deteniendo contenedor anterior si existe...'
sudo docker rm -f ${NAS_CONTAINER_NAME} 2>/dev/null || true

echo 'Creando directorios...'
sudo mkdir -p /volume1/docker/beat-scrobble/data /volume1/docker/beat-scrobble/config
sudo chmod -R 777 /volume1/docker/beat-scrobble

echo 'Iniciando contenedor en puerto ${custom_port}...'
sudo docker run -d \\
    --name ${NAS_CONTAINER_NAME} \\
    --restart unless-stopped \\
    -p ${custom_port}:4110 \\
    -v /volume1/music:/app/music:rw \\
    -v /volume1/docker/beat-scrobble/data:/app/data:rw \\
    -v /volume1/docker/beat-scrobble/config:/app/config:rw \\
    -e MUSIC_LOCATION=/app/music \\
    -e DB_DATA_LOCATION=/app/data \\
    -e CONFIG_LOCATION=/app/config \\
    -e TZ=America/Mexico_City \\
    ${IMAGE_LOCAL}

rm -f /tmp/beat_scrobble_deploy.tar

echo '==============================================='
echo 'Deploy completado!'
echo '==============================================='
"

    if [ $? -eq 0 ]; then
        rm -f "$tar_file"
        
        echo
        show_separator
        printf "${C_GREEN}${C_BOLD}✅ DEPLOY EXITOSO${C_RESET}\n\n"
        printf "  ${C_CYAN}Beat Scrobble está corriendo en:${C_RESET}\n"
        printf "  ${C_BOLD}http://${NAS_HOST}:${custom_port}${C_RESET}\n\n"
        show_separator
    else
        log_error "Hubo un error durante la ejecución remota"
    fi
}

cmd_build_apk() {
    show_header
    printf "${C_BOLD}📱 COMPILAR APK (ANDROID)${C_RESET}\n\n"

    JAVA_HOME="${JAVA_HOME:-}"
    export JAVA_HOME

    # Buscar directorio Android
    local ANDROID_DIR=""
    if [[ -d "beatscrobble-android" ]]; then
        ANDROID_DIR="beatscrobble-android"
    elif [[ -d "mobile" ]]; then
        ANDROID_DIR="mobile"
    elif [[ -d "android" ]]; then
        ANDROID_DIR="android"
    elif [[ -d "android-native" ]]; then
        ANDROID_DIR="android-native"
    else
        log_error "Directorio de proyecto Android no encontrado (beatscrobble-android/, mobile/, android/, android-native/)."
        return
    fi

    log_info "Proyecto Android detectado en: $ANDROID_DIR"
    
    cd "$ANDROID_DIR"
    
    chmod +x gradlew 2>/dev/null || true
    
    # Configurar SDK si no existe local.properties
    if [[ ! -f "local.properties" ]]; then
        log_warn "local.properties no encontrado. Configurando SDK..."
        
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

    # JDK local integrado
    if [[ -d "../tools/jdk-17" ]] && [[ -f "../tools/jdk-17/bin/java" ]]; then
         JAVA_HOME="$(pwd)/../tools/jdk-17"
         export JAVA_HOME
         log_success "Usando JDK Local Integrado: $JAVA_HOME"
    fi

    log_info "Iniciando compilación Gradle (AssembleDebug)..."
    
    if ./gradlew clean assembleDebug; then
        echo
        log_success "APK Generada exitosamente!"
        echo
        printf "${C_GREEN}${C_BOLD}Ruta: $(pwd)/app/build/outputs/apk/debug/app-debug.apk${C_RESET}\n"
    else
        echo
        log_error "Falló la compilación."
        log_warn "Asegúrate de tener JAVA_HOME y ANDROID_HOME configurados."
    fi
    
    cd ..
}

cmd_dev_host() {
    show_header
    printf "\n${C_BOLD}🛠️  MODO DESARROLLO (HOT RELOAD)${C_RESET}\n"
    printf "${C_DIM}Hot Reloading habilitado para Frontend y Backend.${C_RESET}\n"
    printf "${C_DIM}Frontend: http://localhost:5173${C_RESET}\n"
    printf "${C_DIM}Backend:  http://localhost:4110${C_RESET}\n\n"

    # Cargar .env
    if [[ -f .env ]]; then
        set -a
        source <(grep -E '^[A-Za-z0-9_]+=' .env) 2>/dev/null || true
        set +a
    fi

    # Variables para docker-compose
    export MUSIC_LOCATION="${LOCAL_MUSIC_LOCATION:-$SCRIPT_DIR/music}"
    export CONFIG_LOCATION="${LOCAL_CONFIG_LOCATION:-$SCRIPT_DIR/config}"
    export TZ="${TZ:-UTC}"

    mkdir -p "$MUSIC_LOCATION" "$CONFIG_LOCATION"

    log_info "Iniciando entorno de desarrollo..."
    
    cd "$SCRIPT_DIR"
    
    if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
        log_info "Usando Docker Compose..."
        docker compose -f docker-compose.dev.yml up -d --build
        
        log_success "DB y Backend iniciados en Docker"
        log_info "Logs: docker compose -f docker-compose.dev.yml logs -f"
        echo
        show_separator
        echo
        
        # Frontend LOCAL
        log_info "Iniciando Frontend LOCAL (Vite + React)..."
        log_warn "Presiona Ctrl+C para detener todos los servicios"
        echo
        
        trap 'echo ""; log_info "Deteniendo..."; docker compose -f docker-compose.dev.yml down; exit 0' INT TERM
        
        cd "$SCRIPT_DIR/client"
        export VITE_API_URL="http://localhost:4110"
        
        if ! command -v pnpm &>/dev/null; then
            log_warn "pnpm no encontrado. Instalando..."
            npm install -g pnpm
        fi
        
        pnpm install
        pnpm dev
        
        docker compose -f docker-compose.dev.yml down
        
    elif command -v podman-compose >/dev/null 2>&1; then
        log_info "Usando Podman Compose..."
        podman-compose -f docker-compose.dev.yml up -d --build
        
        log_success "DB y Backend iniciados en Podman"
        echo
        show_separator
        echo
        
        log_info "Iniciando Frontend LOCAL (Vite + React)..."
        log_warn "Presiona Ctrl+C para detener todos los servicios"
        echo
        
        trap 'echo ""; log_info "Deteniendo..."; podman-compose -f docker-compose.dev.yml down; exit 0' INT TERM
        
        cd "$SCRIPT_DIR/client"
        export VITE_API_URL="http://localhost:4110"
        
        if ! command -v pnpm &>/dev/null; then
            log_warn "pnpm no encontrado. Instalando..."
            npm install -g pnpm
        fi
        
        pnpm install
        pnpm dev
        
        podman-compose -f docker-compose.dev.yml down
        
    elif command -v podman >/dev/null 2>&1; then

        log_warn "podman-compose no encontrado. Usando orquestación nativa de Podman..."
        
        # Cleanup
        podman rm -f bs-dev-db bs-dev-backend bs-dev-frontend >/dev/null 2>&1 || true
        podman network rm bs-dev-net >/dev/null 2>&1 || true
        
        podman network create bs-dev-net
        
        # Database
        log_info "Iniciando PostgreSQL..."
        podman run -d --name bs-dev-db \
            --network bs-dev-net \
            -p 5432:5432 \
            -e POSTGRES_USER=postgres \
            -e POSTGRES_PASSWORD=secret \
            -e POSTGRES_DB=beatscrobbledb \
            docker.io/pgvector/pgvector:pg16

        log_info "Esperando a que PostgreSQL inicie..."
        sleep 5

        # Backend
        log_info "Iniciando Backend (Go + Air)..."
        podman run -d --name bs-dev-backend \
            --network bs-dev-net \
            -p 4110:4110 \
            -v "$SCRIPT_DIR":/app:Z \
            -v "$MUSIC_LOCATION":/app/music:Z \
            -v "$CONFIG_LOCATION":/etc/beat_scrobble:Z \
            -e BEAT_SCROBBLE_DATABASE_URL="postgres://postgres:secret@bs-dev-db:5432/beatscrobbledb?sslmode=disable" \
            -e BEAT_SCROBBLE_ALLOWED_HOSTS="*" \
            -e MUSIC_LOCATION=/app/music \
            -e TZ="${TZ}" \
            -e GOTOOLCHAIN=auto \
            -w /app \
            golang:1.24-alpine \
            sh -c "apk add --no-cache gcc musl-dev sqlite-dev vips-dev pkgconfig && go install github.com/air-verse/air@v1.52.3 && air"

        # Frontend LOCAL (no Docker - vanilla-extract no funciona en contenedor)
        log_success "Backend y DB iniciados en segundo plano."
        log_info "Logs backend: podman logs -f bs-dev-backend"
        echo
        show_separator
        echo
        
        log_info "Iniciando Frontend LOCAL (Vite + React)..."
        log_warn "Presiona Ctrl+C para detener todos los servicios"
        echo
        
        # Trap para limpiar al salir
        trap 'echo ""; log_info "Deteniendo..."; podman rm -f bs-dev-db bs-dev-backend >/dev/null 2>&1; podman network rm bs-dev-net >/dev/null 2>&1; exit 0' INT TERM
        
        cd "$SCRIPT_DIR/client"
        export VITE_API_URL="http://localhost:4110"
        
        # Verificar pnpm
        if ! command -v pnpm &>/dev/null; then
            log_warn "pnpm no encontrado. Instalando..."
            npm install -g pnpm
        fi
        
        pnpm install
        pnpm dev
        
        # Cleanup al terminar
        cd "$SCRIPT_DIR"
        log_info "Deteniendo servicios..."
        podman rm -f bs-dev-db bs-dev-backend
        podman network rm bs-dev-net
    else
        die "Necesitas 'docker compose', 'podman-compose' o 'podman' instalado."
    fi
}





cmd_factory_reset() {
    show_header
    printf "${C_RED}${C_BOLD}🧨 FACTORY RESET${C_RESET}\n\n"
    log_warn "ESTO BORRARÁ TODA LA BASE DE DATOS Y CONTENEDORES"
    echo
    echo "Se eliminarán:"
    echo "  • Todos los contenedores de Beat Scrobble"
    echo "  • Volúmenes de datos"
    echo "  • Base de datos PostgreSQL"
    echo
    
    if ! prompt_yes_no "¿Estás MUY seguro?"; then
        log_info "Operación cancelada"
        return
    fi
    
    if ! prompt_yes_no "¿REALMENTE seguro? No hay vuelta atrás."; then
        log_info "Operación cancelada"
        return
    fi
    
    log_info "Deteniendo contenedores..."
    for c in "$APP_DEV" "$DB_DEV" "$APP_PROD" "$DB_PROD" "$BEAT_SCROBBLE_APP_NAME" "$BEAT_SCROBBLE_DB_NAME"; do
        podman stop "$c" >/dev/null 2>&1 || true
        podman rm -f "$c" >/dev/null 2>&1 || true
    done
    
    log_info "Eliminando volúmenes locales..."
    rm -rf ./data/* ./config/* 2>/dev/null || true
    
    log_success "Sistema reseteado a estado inicial."
}

cmd_verify_production() {
    show_header
    printf "${C_BOLD}🧪 VERIFY PRODUCTION${C_RESET}\n\n"
    
    if [[ -f "./scripts/verify-production.sh" ]]; then
        log_info "Ejecutando script de verificación..."
        ./scripts/verify-production.sh
    else
        log_warn "Script verify-production.sh no encontrado"
        echo
        log_info "Realizando verificación básica..."
        
        local container=$(smart_select_container "verify")
        if [[ -z "$container" ]]; then
            log_error "No hay contenedor activo para verificar"
            return
        fi
        
        echo
        log_info "Verificando contenedor: $container"
        
        # Health check
        if podman exec "$container" curl -sf http://localhost:4110/health >/dev/null 2>&1; then
            log_success "✓ Health check: OK"
        else
            log_error "✗ Health check: FAILED"
        fi
        
        # API check
        if podman exec "$container" curl -sf http://localhost:4110/api/stats >/dev/null 2>&1; then
            log_success "✓ API Stats: OK"
        else
            log_warn "⚠ API Stats: No disponible"
        fi
        
        echo
        log_info "Verificación completada"
    fi
}

# ============================================================================
# SUBMENÚS

# ============================================================================

submenu_desarrollo() {
  while true; do
    show_header
    printf "${C_YELLOW}"
    printf "    ╔═══════════════════════════════════════════════╗\n"
    printf "    ║     🚀  DESARROLLO (LOCAL)                   ║\n"
    printf "    ╠═══════════════════════════════════════════════╣\n"
    printf "    ║  Construye y prueba tu código localmente     ║\n"
    printf "    ╚═══════════════════════════════════════════════╝\n"
    printf "${C_RESET}\n"
    
    printf "    ${C_CYAN}1${C_RESET}  🏗️  Build Local   │ Construir imagen\n"
    printf "    ${C_CYAN}2${C_RESET}  ▶️  Start Local   │ Iniciar stack\n"
    printf "    ${C_CYAN}3${C_RESET}  ♻️  Update Local  │ Rebuild + Recreate\n"
    printf "    ${C_YELLOW}D${C_RESET}  🛠️  Dev Host     │ Hot Reload (Go+Vite)\n"
    printf "\n"
    printf "    ${C_RED}X${C_RESET}  🧨 Factory Reset │ Limpiar DB\n"
    printf "    ${C_DIM}0${C_RESET}  ⬅️  Volver\n\n"
    
    read -rp "    ➤ Selecciona: " opt
    echo
    
    case "$opt" in
      1) cmd_build_local ;;
      2) cmd_start_local ;;
      3) cmd_update_local ;;
      d|D) cmd_dev_host ;;
      x|X) cmd_factory_reset ;;
      0) return ;;
      *) log_error "Opción inválida" ;;

    esac
    
    echo
    read -rp "    ⏎ Enter para continuar..."
  done
}

submenu_produccion() {
  while true; do
    show_header
    printf "${C_CYAN}"
    printf "    ╔═══════════════════════════════════════════════╗\n"
    printf "    ║     ☁️   PRODUCCIÓN (GHCR)                    ║\n"
    printf "    ╠═══════════════════════════════════════════════╣\n"
    printf "    ║  Prueba la imagen publicada en GitHub        ║\n"
    printf "    ╚═══════════════════════════════════════════════╝\n"
    printf "${C_RESET}\n"
    
    printf "    ${C_CYAN}1${C_RESET}  ⬇️  Pull GHCR     │ Descargar imagen\n"
    printf "    ${C_CYAN}2${C_RESET}  ▶️  Start GHCR    │ Iniciar stack\n"
    printf "\n"
    printf "    ${C_DIM}0${C_RESET}  ⬅️  Volver\n\n"
    
    read -rp "    ➤ Selecciona: " opt
    echo
    
    case "$opt" in
      1) cmd_pull_ghcr ;;
      2) cmd_start_ghcr ;;
      0) return ;;
      *) log_error "Opción inválida" ;;
    esac
    
    echo
    read -rp "    ⏎ Enter para continuar..."
  done
}

submenu_datos() {
  while true; do
    show_header
    printf "${C_GREEN}"
    printf "    ╔═══════════════════════════════════════════════╗\n"
    printf "    ║     📥  DATOS                                 ║\n"
    printf "    ╠═══════════════════════════════════════════════╣\n"
    printf "    ║  Importar scrobbles y backup de DB           ║\n"
    printf "    ╚═══════════════════════════════════════════════╝\n"
    printf "${C_RESET}\n"
    
    printf "    ${C_CYAN}1${C_RESET}  📥 Import        │ Importar archivo\n"
    printf "    ${C_CYAN}2${C_RESET}  💾 Backup        │ Backup de BD\n"
    printf "\n"
    printf "    ${C_DIM}0${C_RESET}  ⬅️  Volver\n\n"
    
    read -rp "    ➤ Selecciona: " opt
    echo
    
    case "$opt" in
      1) cmd_import_smart ;;
      2) cmd_backup_smart ;;
      0) return ;;
      *) log_error "Opción inválida" ;;
    esac
    
    echo
    read -rp "    ⏎ Enter para continuar..."
  done
}

submenu_gestion() {
  while true; do
    show_header
    printf "${C_BLUE}"
    printf "    ╔═══════════════════════════════════════════════╗\n"
    printf "    ║     ⚙️   GESTIÓN                              ║\n"
    printf "    ╠═══════════════════════════════════════════════╣\n"
    printf "    ║  Control de contenedores (smart auto-detect) ║\n"
    printf "    ╚═══════════════════════════════════════════════╝\n"
    printf "${C_RESET}\n"
    
    printf "    ${C_CYAN}1${C_RESET}  ⏸️  Stop          │ Detener\n"
    printf "    ${C_CYAN}2${C_RESET}  🔁 Restart       │ Reiniciar\n"
    printf "    ${C_CYAN}3${C_RESET}  📊 Status        │ Ver estado\n"
    printf "    ${C_CYAN}4${C_RESET}  📜 Logs          │ Ver logs\n"
    printf "    ${C_CYAN}5${C_RESET}  🐚 Shell         │ Terminal\n"
    printf "\n"
    printf "    ${C_DIM}0${C_RESET}  ⬅️  Volver\n\n"
    
    read -rp "    ➤ Selecciona: " opt
    echo
    
    case "$opt" in
      1) cmd_stop_smart ;;
      2) cmd_restart ;;
      3) cmd_status_smart ;;
      4) cmd_logs_smart ;;
      5) cmd_shell_smart ;;
      0) return ;;
      *) log_error "Opción inválida" ;;
    esac
    
    echo
    read -rp "    ⏎ Enter para continuar..."
  done
}

submenu_herramientas() {
  while true; do
    show_header
    printf "${C_MAGENTA}"
    printf "    ╔═══════════════════════════════════════════════╗\n"
    printf "    ║     🔧  HERRAMIENTAS                          ║\n"
    printf "    ╠═══════════════════════════════════════════════╣\n"
    printf "    ║  NAS, GitHub Actions, Publicación            ║\n"
    printf "    ╚═══════════════════════════════════════════════╝\n"
    printf "${C_RESET}\n"
    
    printf "    ${C_CYAN}1${C_RESET}  📦 Synology      │ NAS Tools\n"
    printf "    ${C_CYAN}2${C_RESET}  🔄 Workflows     │ GitHub Actions\n"
    printf "    ${C_CYAN}3${C_RESET}  🚀 Publish       │ Publicar imagen\n"
    printf "    ${C_MAGENTA}4${C_RESET}  🚀 Deploy NAS    │ SSH → Build → Run\n"
    printf "    ${C_CYAN}5${C_RESET}  📱 Build APK     │ Gradle AssembleDebug\n"
    printf "    ${C_CYAN}6${C_RESET}  📂 Config Rutas  │ Editar .env\n"
    printf "    ${C_GREEN}7${C_RESET}  🧪 Verify Prod   │ API + UX Testing\n"
    printf "\n"
    printf "    ${C_DIM}0${C_RESET}  ⬅️  Volver\n\n"
    
    read -rp "    ➤ Selecciona: " opt
    echo
    
    case "$opt" in
      1) cmd_synology ;;
      2) cmd_workflows_menu ;;
      3) cmd_publish ;;
      4) cmd_nas_deploy ;;
      5) cmd_build_apk ;;
      6) cmd_config_rutas ;;
      7) cmd_verify_production ;;
      0) return ;;
      *) log_error "Opción inválida" ;;

    esac
    
    echo
    read -rp "    ⏎ Enter para continuar..."
  done
}

# ============================================================================
# MENÚ INTERACTIVO
# ============================================================================

show_menu() {
  show_header
  
  # Mostrar estado actual
  local stack=$(get_active_stack)
  printf "${C_DIM}Estado: "
  case "$stack" in
    "dev") printf "${C_GREEN}LOCAL corriendo${C_RESET} (puerto $PORT_LOCAL)\n" ;;
    "prod") printf "${C_CYAN}GHCR corriendo${C_RESET} (puerto $PORT_GHCR)\n" ;;
    "both") printf "${C_YELLOW}Ambos corriendo${C_RESET}\n" ;;
    *) printf "${C_DIM}Ninguno activo${C_RESET}\n" ;;
  esac
  echo

  printf "${C_BOLD}MENÚ PRINCIPAL:${C_RESET}\n\n"
  
  printf "  ${C_CYAN}1${C_RESET}  ${C_YELLOW}🚀 Desarrollo (LOCAL)${C_RESET}     ➜\n"
  printf "  ${C_CYAN}2${C_RESET}  ${C_CYAN}☁️  Producción (GHCR)${C_RESET}      ➜\n"
  printf "  ${C_CYAN}3${C_RESET}  📥 Datos                  ➜\n"
  printf "  ${C_CYAN}4${C_RESET}  ⚙️  Gestión               ➜\n"
  printf "  ${C_CYAN}5${C_RESET}  🔧 Herramientas           ➜\n"
  printf "\n"
  printf "  ${C_CYAN}0${C_RESET}  👋 Salir\n\n"
  
  printf "${C_BOLD}"
  read -rp "➤ Selecciona categoría: " option
  printf "${C_RESET}"
  echo
  
  case "$option" in
    1) submenu_desarrollo ;;
    2) submenu_produccion ;;
    3) submenu_datos ;;
    4) submenu_gestion ;;
    5) submenu_herramientas ;;
    0) 
      clear
      echo
      printf "${C_GREEN}${C_BOLD}✨ ¡Hasta luego! ✨${C_RESET}\n\n"
      exit 0
      ;;
    *) log_error "Opción inválida: $option" ;;
  esac
}

# ============================================================================
# MAIN
# ============================================================================

main() {
  check_dependencies
  load_env
  
  # Modo no interactivo para CI/automatización
  if [[ $# -gt 0 ]]; then
    case "$1" in
      build)     cmd_build "${2:-.}" ;;
      start)     cmd_start ;;
      import)    cmd_import ;;
      update)    cmd_update "${2:-.}" ;;
      stop)      cmd_stop ;;
      restart)   cmd_restart ;;
      status)    cmd_status ;;
      logs)      cmd_logs "${2:-100}" ;;
      logs)      cmd_logs "${2:-100}" ;;
      shell)     cmd_shell "${2:-$BEAT_SCROBBLE_APP_NAME}" ;;
      backup)    cmd_backup_db ;;
      synology)  cmd_synology ;;
      publish)   cmd_publish ;;
      # Legacy compatibility
      rebuild)   cmd_update "${2:-.}" ;;  
      recreate)  cmd_update "${2:-.}" ;;
      *)         die "Comando desconocido: $1\n\nComandos principales:\n  build    - Construir imagen\n  start    - Iniciar stack\n  import   - Importar datos\n  update   - Actualizar con cambios\n\nGestión:\n  stop, restart, status, logs, shell, backup" ;;
    esac
    exit 0
  fi
  
  # Modo interactivo - desactivar exit on error para que el menú no se cierre
  set +e
  while true; do
    show_menu
  done
}

main "$@"
                                                                                                                                                        