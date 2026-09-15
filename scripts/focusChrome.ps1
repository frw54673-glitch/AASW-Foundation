$p = Get-Process -Id 14320
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class W {
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int n);
}
"@
[W]::ShowWindow($p.MainWindowHandle, 3) | Out-Null
[W]::SetForegroundWindow($p.MainWindowHandle) | Out-Null
Write-Host "FOREGROUNDED"
