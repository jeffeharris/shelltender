#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== WSL2 Network Configuration Check ===${NC}\n"

# Get WSL2 IP
WSL_IP=$(hostname -I | awk '{print $1}')
echo -e "${GREEN}WSL2 IP Address:${NC} $WSL_IP"

# Check if running in WSL2
if grep -q microsoft /proc/version; then
    echo -e "${GREEN}✓ Running in WSL2${NC}"
else
    echo -e "${RED}✗ Not running in WSL2${NC}"
fi

echo -e "\n${YELLOW}=== Service Status ===${NC}"

# Check if services are running
check_service() {
    local port=$1
    local name=$2
    if lsof -i :$port >/dev/null 2>&1; then
        local bind_addr=$(lsof -i :$port -n -P | grep LISTEN | awk '{print $9}' | head -1)
        echo -e "${GREEN}✓ $name (port $port):${NC} Running on $bind_addr"
    else
        echo -e "${RED}✗ $name (port $port):${NC} Not running"
    fi
}

check_service 3000 "API Server"
check_service 5173 "Vite Dev Server"
check_service 8080 "WebSocket Server"

echo -e "\n${YELLOW}=== Instructions to Access from Mobile ===${NC}"
echo "1. Open Windows PowerShell as Administrator"
echo "2. Run the port forwarding script:"
echo -e "   ${BLUE}powershell.exe -ExecutionPolicy Bypass -File \"\\\\wsl.localhost\\Ubuntu\\home\\jeffh\\projects\\shelltender\\scripts\\wsl-port-forward.ps1\"${NC}"
echo ""
echo "3. Find your Windows IP address:"
echo "   - Open Command Prompt on Windows"
echo "   - Run: ipconfig"
echo "   - Look for your network adapter's IPv4 address"
echo ""
echo "4. On your mobile device, access:"
echo -e "   ${GREEN}http://<Windows-IP>:5173${NC}"
echo "   Example: http://192.168.1.100:5173"
echo ""
echo -e "${YELLOW}Note:${NC} Make sure your mobile device is on the same Wi-Fi network!"

echo -e "\n${YELLOW}=== Alternative: Quick Test ===${NC}"
echo "To quickly test if port forwarding is needed, try accessing from Windows browser:"
echo -e "   ${BLUE}http://localhost:5173${NC} - If this works, WSL2 is already accessible"
echo -e "   ${BLUE}http://$WSL_IP:5173${NC} - Direct WSL2 IP access"