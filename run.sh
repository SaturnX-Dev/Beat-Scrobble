#!/usr/bin/env bash
# ============================================================================
# Koito Manager - Gestión de stack Postgres + Koito con Podman
# ============================================================================

set -euo pipefail
IFS=$'\n\t'

# ============================================================================
# CONFIGURACIÓN
# ============================================================================

readonly SCRIPT_VERSION="1.0.0"
readonly SCRIPT_NAME="$(basename "${BASH_SOURCE[0]}")"

# Imágenes
IMAGE_KOITO="${IMAGE_KOITO:-koito:local}"
IMAGE_PG="${IMAGE_PG:-docker.io/library/postgres:16}"

# Base de datos
DB_USER="${DB_USER:-postgres}"
DB_PASS="${DB_PASS:-secret}"
DB_NAME="${DB_NAME:-koitodb}"

# Puertos
KOITO_PORT="${KOITO_PORT:-4110}"
PG_PORT="${PG_PORT:-5432}"

# Red
NETWORK_MODE="${NETWORK_MODE:-host}"

# Nombres de contenedores
readonly KOITO_APP_NAME="koito-app"
readonly KOITO_DB_NAME="koito-db"

# Rutas internas del contenedor
readonly KOITO_CONFIG_DIR="/etc/koito"
readonly KOITO_IMPORT_DIR="${KOITO_CONFIG_DIR}/import"

# Timeouts
readonly DB_STARTUP_TIMEOUT=30
readonly APP_STARTUP_TIMEOUT=15

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
  for cmd in podman jq; do
    command -v "$cmd" >/dev/null 2>&1 || missing+=("$cmd")
  done
  
  if [[ ${#missing[@]} -gt 0 ]]; then
    die "Dependencias faltantes: ${missing[*]}"
  fi
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
╔═══════════════════════════════════════════════════════════╗
║            🎵  K O I T O   M A N A G E R  🎵             ║
╚═══════════════════════════════════════════════════════════╝
EOF
  printf "${C_RESET}"
  printf "${C_DIM}v%s | Docker Management Tool${C_RESET}\n\n" "$SCRIPT_VERSION"
}

show_separator() {
  printf "${C_DIM}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${C_RESET}\n"
}

# ============================================================================
# OPERACIONES DE CONTENEDORES
# ============================================================================

wait_for_db() {
  local timeout=$DB_STARTUP_TIMEOUT
  local elapsed=0
  
  log_info "Esperando a que Postgres esté listo..."
  
  while ((elapsed < timeout)); do
    if podman exec "$KOITO_DB_NAME" pg_isready -U "$DB_USER" >/dev/null 2>&1; then
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
  
  log_info "Esperando a que Koito responda..."
  
  while ((elapsed < timeout)); do
    if curl -sf "http://localhost:${KOITO_PORT}/health" >/dev/null 2>&1; then
      log_success "Koito listo en ${elapsed}s"
      return 0
    fi
    sleep 1
    ((elapsed++))
    printf "${C_DIM}.${C_RESET}"
  done
  
  echo
  log_warn "Koito no responde health check después de ${timeout}s (puede ser normal)"
  return 0
}

cleanup_containers() {
  local containers=("$KOITO_APP_NAME" "$KOITO_DB_NAME")
  
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
  echo "  Tag:        ${IMAGE_KOITO}"
  show_separator
  
  if ! prompt_yes_no "¿Proceder con la construcción?" "y"; then
    log_info "Operación cancelada"
    return 0
  fi
  
  echo
  log_info "Construyendo imagen Docker..."
  log_info "Esto puede tomar varios minutos..."
  echo
  
  if podman build -t "$IMAGE_KOITO" "$dockerfile_path"; then
    log_success "Imagen construida exitosamente: $IMAGE_KOITO"
    
    echo
    show_separator
    printf "${C_GREEN}${C_BOLD}✓ Imagen Docker creada${C_RESET}\n\n"
    echo "  Tag: ${IMAGE_KOITO}"
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
  validate_port "$KOITO_PORT"
  validate_port "$PG_PORT"
  validate_network_mode "$NETWORK_MODE"
  
  if ! image_exists "$IMAGE_KOITO"; then
    log_error "Imagen no encontrada: $IMAGE_KOITO"
    echo
    if prompt_yes_no "¿Deseas construir la imagen primero?"; then
      cmd_build
      if ! image_exists "$IMAGE_KOITO"; then
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
  echo "  Koito:    ${IMAGE_KOITO} → :${KOITO_PORT}"
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
    --name "$KOITO_DB_NAME" \
    --network "$NETWORK_MODE" \
    -p "${PG_PORT}:5432" \
    -e POSTGRES_USER="$DB_USER" \
    -e POSTGRES_PASSWORD="$DB_PASS" \
    -e POSTGRES_DB="$DB_NAME" \
    "$IMAGE_PG" >/dev/null
  
  log_success "Postgres creado"
  
  wait_for_db || die "Postgres no arrancó correctamente"
  
  # Koito
  log_info "Creando Koito..."
  
  podman run -d \
    --name "$KOITO_APP_NAME" \
    --network "$NETWORK_MODE" \
    -p "${KOITO_PORT}:4110" \
    -e KOITO_DATABASE_URL="$db_url" \
    -e KOITO_ALLOWED_HOSTS="*" \
    "$IMAGE_KOITO" >/dev/null
  
  log_success "Koito creado"
  
  wait_for_app
  
  echo
  show_separator
  printf "${C_GREEN}${C_BOLD}✓ Stack iniciado exitosamente${C_RESET}\n\n"
  echo "  Koito:    http://localhost:${KOITO_PORT}"
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
  
  for container in "$KOITO_APP_NAME" "$KOITO_DB_NAME"; do
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
  
  for container in "$KOITO_DB_NAME" "$KOITO_APP_NAME"; do
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
  
  if ! container_exists "$KOITO_DB_NAME" && ! container_exists "$KOITO_APP_NAME"; then
    log_warn "No hay contenedores de Koito"
    return 0
  fi
  
  podman ps -a \
    --filter "name=${KOITO_DB_NAME}" \
    --filter "name=${KOITO_APP_NAME}" \
    --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
}


cmd_import() {
  show_header
  printf "${C_BOLD}IMPORTAR ARCHIVO${C_RESET}\n\n"
  
  if ! container_running "$KOITO_APP_NAME"; then
    log_error "Koito no está ejecutándose. Inicia el stack primero."
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
    echo "  Destino:  ${KOITO_IMPORT_DIR}/"
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
    if ! podman exec "$KOITO_APP_NAME" mkdir -p "$KOITO_IMPORT_DIR" 2>/dev/null; then
      log_error "No se pudo crear directorio en contenedor"
      continue
    fi
    log_success "✓ Directorio creado"
    
    # Copiar archivo
    log_info "[2/3] Copiando archivo al contenedor ($file_size_mb MB)..."
    if ! podman cp "$file_path" "${KOITO_APP_NAME}:${KOITO_IMPORT_DIR}/"; then
      log_error "❌ Falló la copia del archivo"
      continue
    fi
    log_success "✓ Archivo copiado exitosamente"
    
    # Verificar que el archivo se copió correctamente
    log_info "Verificando copia..."
    if ! podman exec "$KOITO_APP_NAME" test -f "${KOITO_IMPORT_DIR}/${filename}"; then
      log_error "❌ El archivo no se encuentra en el contenedor"
      continue
    fi
    log_success "✓ Archivo verificado en contenedor"
    
    # Reiniciar para procesar
    log_info "[3/3] Reiniciando Koito para procesar import..."
    if ! podman restart "$KOITO_APP_NAME" >/dev/null 2>&1; then
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
  printf "${C_BOLD}LOGS DE KOITO${C_RESET}\n\n"
  
  if ! container_exists "$KOITO_APP_NAME"; then
    die "Contenedor $KOITO_APP_NAME no existe"
  fi
  
  local lines=${1:-100}
  podman logs --tail="$lines" "$KOITO_APP_NAME" 2>&1 || die "No se pudieron obtener logs"
}

cmd_shell() {
  show_header
  printf "${C_BOLD}SHELL EN CONTENEDOR${C_RESET}\n\n"
  
  local container=${1:-$KOITO_APP_NAME}
  
  if ! container_running "$container"; then
    die "Contenedor $container no está ejecutándose"
  fi
  
  log_info "Abriendo shell en: $container"
  podman exec -it "$container" /bin/sh || podman exec -it "$container" /bin/bash
}

cmd_backup_db() {
  show_header
  printf "${C_BOLD}BACKUP DE BASE DE DATOS${C_RESET}\n\n"
  
  if ! container_running "$KOITO_DB_NAME"; then
    die "Postgres no está ejecutándose"
  fi
  
  local timestamp=$(date +%Y%m%d_%H%M%S)
  local backup_file="koito_backup_${timestamp}.sql"
  
  log_info "Creando backup: $backup_file"
  
  podman exec "$KOITO_DB_NAME" pg_dump -U "$DB_USER" "$DB_NAME" > "$backup_file" \
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
  echo "  2. Recreacont el contenedor deKoito con la nueva imagen"
  echo
  
  show_separator
  echo "Configuración:"
  echo "  Dockerfile: ${dockerfile_path}/Dockerfile"
  echo "  Tag:        ${IMAGE_KOITO}"
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
  
  if ! podman build -t "$IMAGE_KOITO" "$dockerfile_path"; then
    die "Falló la construcción de la imagen"
  fi
  
  log_success "Imagen reconstruida: $IMAGE_KOITO"
  echo
  
  # Paso 2: Recreate
  log_info "[2/2] Recreando contenedor de Koito..."
  
  if ! container_running "$KOITO_DB_NAME"; then
    die "Base de datos no está ejecutándose. Inicia el stack primero con 'start'"
  fi
  
  # Obtener URL de base de datos
  local db_url="postgres://${DB_USER}:${DB_PASS}@localhost:${PG_PORT}/${DB_NAME}?sslmode=disable"
  
  # Detener y eliminar contenedor de Koito
  if container_exists "$KOITO_APP_NAME"; then
    log_info "Deteniendo contenedor existente..."
    podman stop "$KOITO_APP_NAME" >/dev/null 2>&1 || true
    
    log_info "Eliminando contenedor existente..."
    podman rm "$KOITO_APP_NAME" >/dev/null 2>&1 || true
  fi
  
  # Crear nuevo contenedor con imagen actualizada
  podman run -d \
    --name "$KOITO_APP_NAME" \
    --network "$NETWORK_MODE" \
    -p "${KOITO_PORT}:4110" \
    -e KOITO_DATABASE_URL="$db_url" \
    -e KOITO_ALLOWED_HOSTS="*" \
    "$IMAGE_KOITO" >/dev/null
  
  log_success "Contenedor recreado con nueva imagen"
  
  wait_for_app
  
  echo
  show_separator
  printf "${C_GREEN}${C_BOLD}✓ Actualización completada${C_RESET}\n\n"
  echo "  URL:    http://localhost:${KOITO_PORT}"
  echo "  Imagen: ${IMAGE_KOITO}"
  echo
  echo "${C_CYAN}¡Tus cambios de UI ya están aplicados!${C_RESET}"
  show_separator
}

cmd_recreate() {
  show_header
  printf "${C_BOLD}RECREAR CONTENEDORES CON NUEVA IMAGEN${C_RESET}\n\n"
  
  # Verificar que la imagen existe
  if ! image_exists "$IMAGE_KOITO"; then
    log_error "Imagen no encontrada: $IMAGE_KOITO"
    echo
    if prompt_yes_no "¿Deseas construir la imagen primero?"; then
      cmd_build
      if ! image_exists "$IMAGE_KOITO"; then
        die "No se pudo construir la imagen"
      fi
    else
      return 1
    fi
  fi
  
  # Obtener configuración actual de los contenedores existentes
  if container_exists "$KOITO_APP_NAME"; then
    log_info "Detectando configuración actual..."
    
    # Extraer puerto actual
    local current_port=$(podman inspect "$KOITO_APP_NAME" --format '{{range .HostConfig.PortBindings}}{{range .}}{{.HostPort}}{{end}}{{end}}' 2>/dev/null || echo "$KOITO_PORT")
    KOITO_PORT="${current_port:-$KOITO_PORT}"
    
    # Extraer variables de entorno
    local db_url=$(podman inspect "$KOITO_APP_NAME" --format '{{range .Config.Env}}{{println .}}{{end}}' 2>/dev/null | grep KOITO_DATABASE_URL | cut -d'=' -f2-)
    
    if [[ -n "$db_url" ]]; then
      log_info "Configuración detectada desde contenedor existente"
    fi
  fi
  
  if ! container_running "$KOITO_DB_NAME"; then
    log_warn "Base de datos no está ejecutándose"
    if prompt_yes_no "¿Deseas iniciar todo el stack desde cero?"; then
      cmd_reset
      return $?
    else
      die "No se puede recrear Koito sin base de datos activa"
    fi
  fi
  
  # Obtener URL de base de datos
  local db_url="postgres://${DB_USER}:${DB_PASS}@localhost:${PG_PORT}/${DB_NAME}?sslmode=disable"
  
  show_separator
  echo "Configuración:"
  echo "  Imagen:   ${IMAGE_KOITO}"
  echo "  Puerto:   ${KOITO_PORT}"
  echo "  DB:       ${db_url}"
  show_separator
  
  if ! prompt_yes_no "¿Recrear contenedor de Koito con esta configuración?"; then
    log_info "Operación cancelada"
    return 0
  fi
  
  echo
  
  # Detener y eliminar contenedor de Koito
  if container_exists "$KOITO_APP_NAME"; then
    log_info "Deteniendo contenedor existente..."
    podman stop "$KOITO_APP_NAME" >/dev/null 2>&1 || true
    
    log_info "Eliminando contenedor existente..."
    podman rm "$KOITO_APP_NAME" >/dev/null 2>&1 || true
    
    log_success "Contenedor anterior eliminado"
  fi
  
  # Crear nuevo contenedor con imagen actualizada
  log_info "Creando contenedor con nueva imagen..."
  
  podman run -d \
    --name "$KOITO_APP_NAME" \
    --network "$NETWORK_MODE" \
    -p "${KOITO_PORT}:4110" \
    -e KOITO_DATABASE_URL="$db_url" \
    -e KOITO_ALLOWED_HOSTS="*" \
    "$IMAGE_KOITO" >/dev/null
  
  log_success "Contenedor creado con nueva imagen"
  
  wait_for_app
  
  echo
  show_separator
  printf "${C_GREEN}${C_BOLD}✓ Koito recreado exitosamente${C_RESET}\n\n"
  echo "  URL:    http://localhost:${KOITO_PORT}"
  echo "  Imagen: ${IMAGE_KOITO}"
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
      log_info "Exportando imagen ${IMAGE_KOITO}..."
      local output_file="koito_image.tar"
      
      if ! image_exists "$IMAGE_KOITO"; then
        log_error "Imagen no encontrada: $IMAGE_KOITO"
        if prompt_yes_no "¿Deseas construirla primero?"; then
          cmd_build
        else
          return 1
        fi
      fi
      
      rm -f "$output_file"
      
      if podman save --format docker-archive -o "$output_file" "$IMAGE_KOITO"; then
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
  koito-db:
    image: ${IMAGE_PG}
    container_name: ${KOITO_DB_NAME}
    restart: always
    environment:
      - POSTGRES_USER=${DB_USER}
      - POSTGRES_PASSWORD=${DB_PASS}
      - POSTGRES_DB=${DB_NAME}
    volumes:
      - ./pgdata:/var/lib/postgresql/data
    networks:
      - koito-net

  koito-app:
    image: ${IMAGE_KOITO}
    container_name: ${KOITO_APP_NAME}
    restart: always
    ports:
      - "${KOITO_PORT}:4110"
    environment:
      - KOITO_DATABASE_URL=postgres://${DB_USER}:${DB_PASS}@koito-db:5432/${DB_NAME}?sslmode=disable
      - KOITO_ALLOWED_HOSTS=*
    depends_on:
      - koito-db
    networks:
      - koito-net

networks:
  koito-net:
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

# ============================================================================
# MENÚ INTERACTIVO
# ============================================================================

show_menu() {
  show_header
  
  printf "${C_BOLD}OPCIONES:${C_RESET}\n\n"
  printf "${C_DIM}╭─────────────────────────────────────────────────────────╮${C_RESET}\n"
  printf "${C_DIM}│${C_RESET} ${C_BOLD}${C_YELLOW}🚀 Workflow Principal${C_RESET}                                ${C_DIM}│${C_RESET}\n"
  printf "${C_DIM}╰─────────────────────────────────────────────────────────╯${C_RESET}\n"
  printf "  ${C_CYAN}1${C_RESET}  🏗️  ${C_YELLOW}Build${C_RESET}   - Construir imagen (primera vez)\n"
  printf "  ${C_CYAN}2${C_RESET}  ▶️  ${C_YELLOW}Start${C_RESET}   - Iniciar stack (crear y arrancar)\n"
  printf "  ${C_CYAN}3${C_RESET}  📥 Import  - Importar archivo JSON/ZIP\n"
  printf "  ${C_CYAN}4${C_RESET}  ♻️ ${C_GREEN}Update${C_RESET}  - Actualizar con cambios (rebuild + recreate)\n"
  printf "\n"
  printf "${C_DIM}╭─────────────────────────────────────────────────────────╮${C_RESET}\n"
  printf "${C_DIM}│${C_RESET} ${C_BOLD}⚙️  Gestión de Contenedores${C_RESET}                       ${C_DIM}│${C_RESET}\n"
  printf "${C_DIM}╰─────────────────────────────────────────────────────────╯${C_RESET}\n"
  printf "  ${C_CYAN}5${C_RESET}  ⏸️  Stop    - Detener contenedores\n"
  printf "  ${C_CYAN}6${C_RESET}  🔁 Restart - Reiniciar contenedores\n"
  printf "  ${C_CYAN}7${C_RESET}  📊 Status  - Ver estado\n"
  printf "  ${C_CYAN}8${C_RESET}  📜Logs    - Ver logs de Koito\n"
  printf "  ${C_CYAN}9${C_RESET}  🐚 Shell   - Abrir shell en contenedor\n"
  printf "  ${C_CYAN}10${C_RESET} 💾 Backup  - Backup de base de datos\n"
  printf "  ${C_CYAN}11${C_RESET} 📦 Synology - Herramientas para NAS\n"
  printf "\n"
  printf "  ${C_CYAN}0${C_RESET}  👋 Salir\n\n"
  
  printf "${C_BOLD}"
  read -rp "➤ Selecciona opción: " option
  printf "${C_RESET}"
  echo
  
  case "$option" in
    1) cmd_build ;;
    2) cmd_start ;;
    3) cmd_import ;;
    4) cmd_update ;;
    5) cmd_stop ;;
    6) cmd_restart ;;
    7) cmd_status ;;
    8) cmd_logs ;;
    9) cmd_shell ;;
    10) cmd_backup_db ;;
    11) cmd_synology ;;
    0) 
      clear
      echo
      printf "${C_GREEN}${C_BOLD}✨ ¡Hasta luego! ✨${C_RESET}\n\n"
      exit 0
      ;;
    *) log_error "Opción inválida: $option" ;;
  esac
  
  echo
  printf "${C_DIM}"
  read -rp "⏎ Presiona Enter para continuar..."
  printf "${C_RESET}"
}

# ============================================================================
# MAIN
# ============================================================================

main() {
  check_dependencies
  
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
      shell)     cmd_shell "${2:-$KOITO_APP_NAME}" ;;
      backup)    cmd_backup_db ;;
      synology)  cmd_synology ;;
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
