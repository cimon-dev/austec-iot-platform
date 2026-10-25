$csharp = @'
using System;
using System.Runtime.InteropServices;
public class WlanHelper {
    [DllImport("wlanapi.dll")]
    public static extern int WlanOpenHandle(uint dwClientVersion, IntPtr pReserved, out uint pdwNegotiatedVersion, out IntPtr phClientHandle);
    [DllImport("wlanapi.dll")]
    public static extern int WlanCloseHandle(IntPtr hClientHandle, IntPtr pReserved);
    [DllImport("wlanapi.dll")]
    public static extern int WlanEnumInterfaces(IntPtr hClientHandle, IntPtr pReserved, out IntPtr ppInterfaceList);
    [DllImport("wlanapi.dll")]
    public static extern int WlanScan(IntPtr hClientHandle, ref Guid pInterfaceGuid, IntPtr pDot11Ssid, IntPtr pIeData, IntPtr pReserved);

    public static void TriggerScan() {
        uint negVersion;
        IntPtr hClient;
        if (WlanOpenHandle(2, IntPtr.Zero, out negVersion, out hClient) == 0) {
            IntPtr pIfList;
            if (WlanEnumInterfaces(hClient, IntPtr.Zero, out pIfList) == 0) {
                int count = Marshal.ReadInt32(pIfList);
                for (int i = 0; i < count; i++) {
                    IntPtr pGuid = new IntPtr(pIfList.ToInt64() + 8 + i * 532);
                    Guid guid = (Guid)Marshal.PtrToStructure(pGuid, typeof(Guid));
                    WlanScan(hClient, ref guid, IntPtr.Zero, IntPtr.Zero, IntPtr.Zero);
                }
            }
            WlanCloseHandle(hClient, IntPtr.Zero);
        }
    }
}
'@
Add-Type -TypeDefinition $csharp -ErrorAction SilentlyContinue
[WlanHelper]::TriggerScan()
Start-Sleep -Milliseconds 1800

$raw = netsh wlan show networks mode=bssid
$lines = $raw -split "`r?`n"

$networks = @()
$currentSsid = ""
$currentSignal = ""
$currentBand = ""

foreach ($line in $lines) {
    if ($line -match '^\s*SSID\s+\d+\s*:\s*(.*)$') {
        if ($currentSsid -and $currentSsid.Trim().Length -gt 0) {
            $networks += [PSCustomObject]@{
                ssid = $currentSsid.Trim()
                signal = $currentSignal.Trim()
                band = $currentBand.Trim()
            }
        }
        $currentSsid = $matches[1]
        $currentSignal = "50%"
        $currentBand = "2.4 GHz"
    }
    elseif ($line -match '^\s*Signal\s*:\s*(\d+%)') {
        $currentSignal = $matches[1]
    }
    elseif ($line -match '^\s*Band\s*:\s*(.*)$') {
        $currentBand = $matches[1]
    }
}

if ($currentSsid -and $currentSsid.Trim().Length -gt 0) {
    $networks += [PSCustomObject]@{
        ssid = $currentSsid.Trim()
        signal = $currentSignal.Trim()
        band = $currentBand.Trim()
    }
}

# Lọc bỏ mạng ẩn, deduplicate
$unique = $networks | Where-Object { $_.ssid.Length -gt 0 } | Group-Object ssid | ForEach-Object {
    $_.Group | Sort-Object { [int]($_.signal -replace '%','') } -Descending | Select-Object -First 1
}

$unique | ConvertTo-Json -Compress
