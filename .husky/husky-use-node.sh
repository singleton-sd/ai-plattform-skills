#!/bin/sh

# Load Node for Husky without elevating on Windows.
# Never call nvm.exe: nvm-windows updates a symlink and triggers UAC.
# Never npm install -g yarn from a git hook.

node_ready() {
  return 0 2>/dev/null || :
}

win_to_posix() {
  if command -v cygpath >/dev/null 2>&1; then
    cygpath -u "$1"
  else
    printf '%s\n' "$1" | sed 's#\\#/#g'
  fi
}

nvmrc_version() {
  if [ -f .nvmrc ]; then
    sed 's/^v//; s/[[:space:]]//g; s/\r//' < .nvmrc
  fi
}

path_has_node() {
  [ -x "$1/node.exe" ] || [ -x "$1/node" ]
}

# Unix nvm (macOS/Linux/WSL): shell function, no UAC.
if [ -s "$HOME/.nvm/nvm.sh" ]; then
  export NVM_DIR="$HOME/.nvm"
  # shellcheck disable=SC1091
  . "$NVM_DIR/nvm.sh"
  nvm use >/dev/null
  node_ready
fi

VERSION=$(nvmrc_version)

# nvm-windows: put the .nvmrc version directory on PATH.
if [ -n "${NVM_HOME:-}" ] && [ -n "$VERSION" ]; then
  NODE_DIR="$(win_to_posix "$NVM_HOME")/v$VERSION"
  if path_has_node "$NODE_DIR"; then
    export PATH="$NODE_DIR:$PATH"
    node_ready
  fi
fi

# Already-selected nvm-windows symlink.
if [ -n "${NVM_SYMLINK:-}" ]; then
  NODE_DIR="$(win_to_posix "$NVM_SYMLINK")"
  if path_has_node "$NODE_DIR"; then
    export PATH="$NODE_DIR:$PATH"
    node_ready
  fi
fi

# Stock Node.js installer / nvm-windows default symlink location.
if [ -n "${LOCALAPPDATA:-}" ]; then
  NODE_DIR="$(win_to_posix "$LOCALAPPDATA")/Programs/nodejs"
  if path_has_node "$NODE_DIR"; then
    export PATH="$NODE_DIR:$PATH"
    node_ready
  fi
fi

if command -v node >/dev/null 2>&1; then
  node_ready
fi

echo "⚠️  Node.js not found. Install Node or nvm, then retry."
