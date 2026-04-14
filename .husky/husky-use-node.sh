#!/bin/sh

# Load Node from .nvmrc if possible
export NVM_DIR="$HOME/.nvm"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  . "$NVM_DIR/nvm.sh"
  nvm use > /dev/null
  npm install -g yarn
else
  echo "⚠️  NVM not found. Falling back to system Node version."
fi
