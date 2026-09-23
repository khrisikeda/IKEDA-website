while ($true) {
    Write-Host "[Tunnel] Connecting to localhost.run..."
    ssh -o StrictHostKeyChecking=no -o ServerAliveInterval=15 -o ServerAliveCountMax=6 -R 80:localhost:3000 nokey@localhost.run
    Write-Host "[Tunnel] Disconnected. Reconnecting in 3 seconds..."
    Start-Sleep -Seconds 3
}
