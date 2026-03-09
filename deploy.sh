#!/bin/bash
# Deploy resume-editor to EC2
# Usage: ./deploy.sh <ec2-public-ip> <path-to-key.pem>
#
# Prerequisites:
#   1. Launch an EC2 instance (Ubuntu 22.04, t3.small or larger)
#   2. Security group: allow inbound TCP 80 (HTTP) from 0.0.0.0/0
#   3. Have your .pem key file ready
#
# Example:
#   ./deploy.sh 54.123.45.67 ~/my-key.pem

set -e

EC2_IP="$1"
KEY_FILE="$2"

if [ -z "$EC2_IP" ] || [ -z "$KEY_FILE" ]; then
  echo "Usage: ./deploy.sh <ec2-public-ip> <path-to-key.pem>"
  exit 1
fi

SSH="ssh -i $KEY_FILE -o StrictHostKeyChecking=no ubuntu@$EC2_IP"
SCP="scp -i $KEY_FILE -o StrictHostKeyChecking=no"

echo "=== Step 1: Install Docker on EC2 ==="
$SSH << 'ENDSSH'
if ! command -v docker &> /dev/null; then
  sudo apt-get update
  sudo apt-get install -y ca-certificates curl gnupg
  sudo install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  sudo chmod a+r /etc/apt/keyrings/docker.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
  sudo apt-get update
  sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
  sudo usermod -aG docker ubuntu
  echo "Docker installed. You may need to re-run this script for group changes to take effect."
fi
echo "Docker version: $(docker --version)"
ENDSSH

echo "=== Step 2: Copy project files to EC2 ==="
# Create a tar of the project (excluding node_modules, .git, dist)
tar czf /tmp/resume-editor.tar.gz \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='dist' \
  -C "$(dirname "$0")" .

$SCP /tmp/resume-editor.tar.gz ubuntu@$EC2_IP:/tmp/resume-editor.tar.gz
rm /tmp/resume-editor.tar.gz

echo "=== Step 3: Extract and build on EC2 ==="
$SSH << 'ENDSSH'
mkdir -p ~/resume-editor
cd ~/resume-editor
tar xzf /tmp/resume-editor.tar.gz
rm /tmp/resume-editor.tar.gz
ENDSSH

echo "=== Step 4: Set up .env and start containers ==="
echo "Enter your NVIDIA_API_KEY (or press Enter to read from server/.env):"
read -r NVIDIA_KEY

if [ -z "$NVIDIA_KEY" ]; then
  # Try to read from local server/.env
  SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
  if [ -f "$SCRIPT_DIR/server/.env" ]; then
    NVIDIA_KEY=$(grep NVIDIA_API_KEY "$SCRIPT_DIR/server/.env" | cut -d'=' -f2)
  fi
fi

if [ -z "$NVIDIA_KEY" ]; then
  echo "ERROR: No NVIDIA_API_KEY found. Create .env on EC2 manually."
  exit 1
fi

$SSH "cd ~/resume-editor && echo 'NVIDIA_API_KEY=$NVIDIA_KEY' > .env"

$SSH << 'ENDSSH'
cd ~/resume-editor
sudo docker compose down 2>/dev/null || true
sudo docker compose up -d --build
echo ""
echo "=== Waiting for containers to start... ==="
sleep 5
sudo docker compose ps
ENDSSH

echo ""
echo "=== DEPLOYED! ==="
echo "Your app is live at: http://$EC2_IP"
echo "Share this URL with your friend!"
