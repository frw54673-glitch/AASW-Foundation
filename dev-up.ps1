# AASW Foundation - one-click local dev startup.
# Boots the persistent embedded MySQL (project .local-mysql data), waits for
# it to accept connections, then starts the app dev server. This prevents the
# "Failed query ... members" / ECONNREFUSED 127.0.0.1:3306 errors that happen
# when the app runs without the database.
#
# The mysqld binary lives in .local-mysql\binaries (project-local), so Windows
# temp cleanup can never delete it again. runEmbeddedDb.ts restores it there
# if a download is ever needed.
#
# Usage:  .\dev-up.ps1          (from the project root, in PowerShell)
#         powershell -File dev-up.ps1

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
$binary = Join-Path $root ".local-mysql\binaries\9.7.2\mysql\bin\mysqld.exe"

function Test-DbUp {
  try {
    $tcp = New-Object Net.Sockets.TcpClient
    $tcp.Connect("127.0.0.1", 3306)
    $tcp.Close()
    return $true
  } catch { return $false }
}

# 1. Database already running? Nothing to do.
if (Test-DbUp) {
  Write-Host "[dev-up] MySQL is already running on 3306." -ForegroundColor Green
}
else {
  # 2. Binary missing? Re-download it once via the embedded boot script.
  if (-not (Test-Path $binary)) {
    Write-Host "[dev-up] mysqld binary missing (temp cleanup) - re-downloading..." -ForegroundColor Yellow
    $job = Start-Job -ScriptBlock {
      Set-Location $using:root
      pnpm exec tsx scripts/runEmbeddedDb.ts 2>&1 | Out-Null
    }
    # Wait until the binary lands (max ~6 minutes for the download).
    for ($i = 0; $i -lt 72; $i++) {
      if (Test-Path $binary) { break }
      Start-Sleep -Seconds 5
    }
    Stop-Job $job -ErrorAction SilentlyContinue
    Remove-Job $job -Force -ErrorAction SilentlyContinue
    if (-not (Test-Path $binary)) {
      throw "[dev-up] mysqld binary download failed. Run: pnpm exec tsx scripts/runEmbeddedDb.ts"
    }
    Write-Host "[dev-up] Binary restored." -ForegroundColor Green
  }

  # 3. Boot the PERSISTENT database (keeps all member data in .local-mysql/data).
  Write-Host "[dev-up] Booting persistent MySQL (data survives restarts)..." -ForegroundColor Yellow
  # pnpm is a .cmd shim on Windows; Start-Process needs the .cmd extension.
  $pnpmCmd = (Get-Command pnpm.cmd -ErrorAction SilentlyContinue).Source
  if (-not $pnpmCmd) { $pnpmCmd = (Get-Command pnpm -ErrorAction Stop).Source }
  $dbProc = Start-Process -FilePath $pnpmCmd -ArgumentList "exec", "tsx", "scripts/runPersistentDb.ts" `
    -WorkingDirectory $root -WindowStyle Minimized -PassThru
  $dbProc.Id | Out-File (Join-Path $root ".local-mysql\dev-up-db.pid") -Encoding ascii

  for ($i = 0; $i -lt 30; $i++) {
    if (Test-DbUp) { break }
    Start-Sleep -Seconds 1
  }
  if (-not (Test-DbUp)) {
    throw "[dev-up] MySQL did not come up on 3306 within 30s. Check .local-mysql\error.err"
  }
  Write-Host "[dev-up] MySQL is UP on 127.0.0.1:3306 (persistent data)." -ForegroundColor Green
}

# 4. Start the app dev server in this window.
$pnpmCmd = (Get-Command pnpm.cmd -ErrorAction SilentlyContinue).Source
if (-not $pnpmCmd) { $pnpmCmd = (Get-Command pnpm -ErrorAction Stop).Source }
& $pnpmCmd dev
