@echo off
cd /d "%~dp0"
if not exist certs mkdir certs

powershell -NoProfile -Command "$ips = @(Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' } | Select-Object -ExpandProperty IPAddress); $san = @('DNS:localhost','IP:127.0.0.1'); foreach ($ip in $ips) { $san += ('IP:' + $ip) }; $cnf = @('[req]','distinguished_name=dn','x509_extensions=v3','prompt=no','[dn]','CN=AR Food Menu','[v3]','subjectAltName=' + ($san -join ','),'extendedKeyUsage=serverAuth','keyUsage=digitalSignature,keyEncipherment'); Set-Content -Path 'certs\openssl.cnf' -Value $cnf -Encoding ascii"

set "OPENSSL=C:\xampp\php\extras\openssl\openssl.exe"
if not exist "%OPENSSL%" set "OPENSSL=C:\Program Files\Git\usr\bin\openssl.exe"
"%OPENSSL%" req -x509 -newkey rsa:2048 -keyout certs\key.pem -out certs\cert.pem -days 825 -nodes -config certs\openssl.cnf
if errorlevel 1 exit /b 1

for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":8000" ^| findstr "LISTENING"') do taskkill /F /PID %%p >nul 2>&1
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":8443" ^| findstr "LISTENING"') do taskkill /F /PID %%p >nul 2>&1

start "AR Menu PHP" /MIN /D "%~dp0." "C:\xampp\php\php.exe" -S 0.0.0.0:8000 router.php
start "AR Menu HTTPS" /MIN /D "%~dp0." node "%~dp0tools\phone-https.mjs"
echo Phone scanner: https://YOUR-WIFI-IP:8443/ar.php
echo Open the home page and scan the QR code. On the phone, tap Advanced, then continue.
