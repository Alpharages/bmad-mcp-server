#!/usr/bin/env bash
set -euo pipefail

# ──────────────────────────────────────────────────────────────────────────────
# BMAD MCP Server — One-line installer
# Usage: curl -fsSL https://raw.githubusercontent.com/YOUR_ORG/bmad-mcp-server/main/install.sh | bash
# ──────────────────────────────────────────────────────────────────────────────

REPO_URL="https://github.com/Alpharages/bmad-mcp-server.git"
INSTALL_DIR="$HOME/.bmad-mcp-server"
SERVER_ENTRY="$INSTALL_DIR/build/index.js"

# ── colours ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

info()    { echo -e "${CYAN}[bmad]${RESET} $*"; }
success() { echo -e "${GREEN}[bmad]${RESET} $*"; }
warn()    { echo -e "${YELLOW}[bmad]${RESET} $*"; }
error()   { echo -e "${RED}[bmad] ERROR:${RESET} $*" >&2; exit 1; }
step()    { echo -e "\n${BOLD}$*${RESET}"; }

# ── detect OS ─────────────────────────────────────────────────────────────────
detect_os() {
  case "$(uname -s)" in
    Darwin) echo "macos" ;;
    Linux)  echo "linux" ;;
    *)      error "Unsupported OS: $(uname -s). Only macOS and Linux are supported." ;;
  esac
}

OS=$(detect_os)

# ── check / install Node.js ───────────────────────────────────────────────────
check_node() {
  if command -v node &>/dev/null; then
    NODE_VERSION=$(node -e "process.exit(parseInt(process.version.slice(1)) < 18 ? 1 : 0)" 2>/dev/null && echo "ok" || echo "old")
    if [[ "$NODE_VERSION" == "old" ]]; then
      warn "Node.js $(node --version) is too old. Minimum: v18."
      install_node
    else
      info "Node.js $(node --version) found."
    fi
  else
    warn "Node.js not found. Installing..."
    install_node
  fi
}

install_node() {
  if [[ "$OS" == "macos" ]]; then
    if command -v brew &>/dev/null; then
      brew install node
    else
      error "Homebrew not found. Install Node.js v18+ from https://nodejs.org then re-run this script."
    fi
  elif [[ "$OS" == "linux" ]]; then
    if command -v apt-get &>/dev/null; then
      info "Installing Node.js 20 via NodeSource..."
      curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
      sudo apt-get install -y nodejs
    elif command -v dnf &>/dev/null; then
      curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
      sudo dnf install -y nodejs
    elif command -v yum &>/dev/null; then
      curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
      sudo yum install -y nodejs
    else
      error "Cannot auto-install Node.js. Install Node.js v18+ from https://nodejs.org then re-run."
    fi
  fi
  command -v node &>/dev/null || error "Node.js installation failed."
  success "Node.js $(node --version) installed."
}

# ── clone or update repo ──────────────────────────────────────────────────────
setup_repo() {
  step "1/3  Setting up repository..."
  if [[ -d "$INSTALL_DIR/.git" ]]; then
    info "Found existing install at $INSTALL_DIR — pulling latest..."
    git -C "$INSTALL_DIR" pull --ff-only
  else
    info "Cloning $REPO_URL → $INSTALL_DIR"
    git clone --depth 1 "$REPO_URL" "$INSTALL_DIR"
  fi
  success "Repository ready."
}

# ── build ─────────────────────────────────────────────────────────────────────
build_server() {
  step "2/3  Installing dependencies and building..."
  cd "$INSTALL_DIR"
  npm install --silent
  npm run build
  [[ -f "$SERVER_ENTRY" ]] || error "Build failed — $SERVER_ENTRY not found."
  success "Build complete: $SERVER_ENTRY"
}

# ── MCP config helpers ────────────────────────────────────────────────────────

# Merge the bmad entry into an MCP config JSON file using Python (universally available)
inject_mcp_config() {
  local config_file="$1"
  local mcp_key="$2"   # e.g. "mcpServers" or "github.copilot.chat.mcp.servers"

  python3 - "$config_file" "$mcp_key" "$SERVER_ENTRY" <<'PYEOF'
import sys, json, os

config_path = sys.argv[1]
mcp_key     = sys.argv[2]
entry_point = sys.argv[3]

# Load existing config (or start fresh)
if os.path.exists(config_path):
    with open(config_path) as f:
        try:
            cfg = json.load(f)
        except json.JSONDecodeError:
            cfg = {}
else:
    os.makedirs(os.path.dirname(config_path), exist_ok=True)
    cfg = {}

# Ensure the mcp servers key exists
if mcp_key not in cfg:
    cfg[mcp_key] = {}

# Inject / overwrite the bmad entry
cfg[mcp_key]["bmad"] = {
    "command": "node",
    "args": [entry_point]
}

with open(config_path, "w") as f:
    json.dump(cfg, f, indent=2)
    f.write("\n")

print(f"  Updated: {config_path}")
PYEOF
}

# ── configure MCP clients ─────────────────────────────────────────────────────
configure_clients() {
  step "3/3  Configuring MCP clients..."
  local configured=0

  # ── Claude Desktop ──────────────────────────────────────────────────────────
  if [[ "$OS" == "macos" ]]; then
    CLAUDE_CONFIG="$HOME/Library/Application Support/Claude/claude_desktop_config.json"
  else
    CLAUDE_CONFIG="$HOME/.config/Claude/claude_desktop_config.json"
  fi

  if [[ -d "$(dirname "$CLAUDE_CONFIG")" ]] || pgrep -x "Claude" &>/dev/null 2>&1 || \
     [[ -f "$CLAUDE_CONFIG" ]]; then
    inject_mcp_config "$CLAUDE_CONFIG" "mcpServers"
    success "Claude Desktop configured."
    configured=$((configured + 1))
  fi

  # ── VS Code ─────────────────────────────────────────────────────────────────
  if [[ "$OS" == "macos" ]]; then
    VSCODE_CONFIG="$HOME/Library/Application Support/Code/User/settings.json"
  else
    VSCODE_CONFIG="$HOME/.config/Code/User/settings.json"
  fi

  if [[ -f "$VSCODE_CONFIG" ]]; then
    inject_mcp_config "$VSCODE_CONFIG" "github.copilot.chat.mcp.servers"
    success "VS Code (GitHub Copilot) configured."
    configured=$((configured + 1))
  fi

  # ── VS Code Insiders ─────────────────────────────────────────────────────────
  if [[ "$OS" == "macos" ]]; then
    VSCODE_INSIDERS_CONFIG="$HOME/Library/Application Support/Code - Insiders/User/settings.json"
  else
    VSCODE_INSIDERS_CONFIG="$HOME/.config/Code - Insiders/User/settings.json"
  fi

  if [[ -f "$VSCODE_INSIDERS_CONFIG" ]]; then
    inject_mcp_config "$VSCODE_INSIDERS_CONFIG" "github.copilot.chat.mcp.servers"
    success "VS Code Insiders configured."
    configured=$((configured + 1))
  fi

  # ── Cursor ───────────────────────────────────────────────────────────────────
  if [[ "$OS" == "macos" ]]; then
    CURSOR_CONFIG="$HOME/Library/Application Support/Cursor/User/settings.json"
  else
    CURSOR_CONFIG="$HOME/.config/Cursor/User/settings.json"
  fi

  if [[ -f "$CURSOR_CONFIG" ]]; then
    inject_mcp_config "$CURSOR_CONFIG" "mcpServers"
    success "Cursor configured."
    configured=$((configured + 1))
  fi

  # ── Windsurf ─────────────────────────────────────────────────────────────────
  if [[ "$OS" == "macos" ]]; then
    WINDSURF_CONFIG="$HOME/Library/Application Support/Windsurf/User/settings.json"
  else
    WINDSURF_CONFIG="$HOME/.config/Windsurf/User/settings.json"
  fi

  if [[ -f "$WINDSURF_CONFIG" ]]; then
    inject_mcp_config "$WINDSURF_CONFIG" "mcpServers"
    success "Windsurf configured."
    configured=$((configured + 1))
  fi

  # ── Cline (VS Code extension — stores config in global storage) ─────────────
  # Cline reads from ~/.cline/mcp_settings.json
  CLINE_CONFIG="$HOME/.cline/mcp_settings.json"
  if [[ -f "$CLINE_CONFIG" ]]; then
    inject_mcp_config "$CLINE_CONFIG" "mcpServers"
    success "Cline configured."
    configured=$((configured + 1))
  fi

  if [[ $configured -eq 0 ]]; then
    warn "No supported MCP clients were detected."
    print_manual_config
  fi
}

# ── manual fallback ───────────────────────────────────────────────────────────
print_manual_config() {
  echo ""
  echo -e "${YELLOW}Add this block to your MCP client's config file manually:${RESET}"
  echo ""
  echo '  {
    "mcpServers": {
      "bmad": {
        "command": "node",
        "args": ["'"$SERVER_ENTRY"'"]
      }
    }
  }'
  echo ""
  echo "  Client config locations:"
  echo "  • Claude Desktop (macOS):  ~/Library/Application Support/Claude/claude_desktop_config.json"
  echo "  • Claude Desktop (Linux):  ~/.config/Claude/claude_desktop_config.json"
  echo "  • VS Code:                 Settings → Open User Settings (JSON)"
  echo "  • Cursor:                  Settings → Open User Settings (JSON)"
}

# ── summary ───────────────────────────────────────────────────────────────────
print_summary() {
  echo ""
  echo -e "${GREEN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
  echo -e "${GREEN}${BOLD}  BMAD MCP Server installed successfully!${RESET}"
  echo -e "${GREEN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
  echo ""
  echo -e "  ${BOLD}Install path:${RESET}  $INSTALL_DIR"
  echo -e "  ${BOLD}Entry point:${RESET}   $SERVER_ENTRY"
  echo ""
  echo -e "  ${BOLD}Next steps:${RESET}"
  echo "  1. Restart your MCP client (Claude Desktop, VS Code, etc.)"
  echo "  2. Look for 'bmad' in the tools/MCP panel"
  echo ""
  echo -e "  To update later, re-run this script — it will pull the latest."
  echo ""
}

# ── main ──────────────────────────────────────────────────────────────────────
main() {
  echo ""
  echo -e "${BOLD}BMAD MCP Server — Installer${RESET}"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""

  check_node
  setup_repo
  build_server
  configure_clients
  print_summary
}

main
