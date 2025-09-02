#!/usr/bin/env bash
set -euo pipefail

# Basic provisioning for Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y curl git unzip nginx mysql-client

# Install Node.js LTS (18.x)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs build-essential

# Create web root
sudo mkdir -p /var/www/ax-frontend
sudo chown -R $USER:$USER /var/www/ax-frontend

# Enable UFW basics (optional)
if command -v ufw >/dev/null 2>&1; then
  sudo ufw allow OpenSSH || true
  sudo ufw allow 80/tcp || true
  sudo ufw allow 443/tcp || true
fi

echo "Provisioning complete."
