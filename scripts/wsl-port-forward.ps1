# WSL2 Port Forwarding Script
# Run as Administrator in Windows PowerShell

$wslIP = bash.exe -c "hostname -I | awk '{print $1}'"
$ports = @(3000, 5173, 8080)

Write-Host "WSL2 IP Address: $wslIP" -ForegroundColor Green
Write-Host "Setting up port forwarding for ports: $($ports -join ', ')" -ForegroundColor Yellow

foreach ($port in $ports) {
    # Remove any existing port proxy
    netsh interface portproxy delete v4tov4 listenport=$port listenaddress=0.0.0.0 2>$null
    
    # Add new port proxy
    netsh interface portproxy add v4tov4 listenport=$port listenaddress=0.0.0.0 connectport=$port connectaddress=$wslIP
    
    # Add firewall rule if it doesn't exist
    $ruleName = "WSL2 Port $port"
    if (-not (Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue)) {
        New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -Protocol TCP -LocalPort $port -Action Allow
        Write-Host "Added firewall rule for port $port" -ForegroundColor Green
    }
}

Write-Host "`nPort forwarding setup complete!" -ForegroundColor Green
Write-Host "You can now access your services from external devices using your Windows IP address" -ForegroundColor Cyan

# Show current port proxies
Write-Host "`nCurrent port forwarding rules:" -ForegroundColor Yellow
netsh interface portproxy show all

# Get Windows IP addresses
Write-Host "`nYour Windows IP addresses:" -ForegroundColor Yellow
Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.InterfaceAlias -notlike "*Loopback*" -and $_.InterfaceAlias -notlike "*WSL*"} | Select-Object InterfaceAlias, IPAddress | Format-Table