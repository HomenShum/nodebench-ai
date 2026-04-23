# Drill into AppData — scan Local, Roaming, LocalLow subfolders
$ErrorActionPreference = 'SilentlyContinue'
$out = 'D:\VSCode Projects\cafecorner_nodebench\nodebench_ai4\nodebench-ai\scripts\audit-appdata-results.txt'

# Use UTF-8 so the output file is readable (prior run was UTF-16LE which looked garbled)
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

function Write-Log($msg) {
    $msg | Out-File -FilePath $out -Append -Encoding utf8
    Write-Host $msg
}

Remove-Item $out -ErrorAction SilentlyContinue
Write-Log "AppData drill-down"
Write-Log "Started: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Write-Log ""

foreach ($sub in @('Local','Roaming','LocalLow')) {
    $base = "C:\Users\hshum\AppData\$sub"
    if (-not (Test-Path $base)) { continue }
    Write-Log "=== AppData\$sub ==="
    $results = @()
    $dirs = Get-ChildItem -Path $base -Directory -Force | Where-Object { $_.LinkType -ne 'Junction' -and $_.LinkType -ne 'SymbolicLink' }
    foreach ($d in $dirs) {
        $m = Get-ChildItem -Path $d.FullName -Recurse -File -Force -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum
        $gb = if ($m.Sum) { [math]::Round($m.Sum / 1GB, 2) } else { 0 }
        $results += [PSCustomObject]@{ Folder = $d.Name; SizeGB = $gb; Files = $m.Count }
    }
    $top = $results | Where-Object { $_.SizeGB -gt 0.1 } | Sort-Object SizeGB -Descending
    $top | Format-Table -AutoSize | Out-String | ForEach-Object { $_.TrimEnd() } | Out-File -FilePath $out -Append -Encoding utf8
    Write-Log ""
}

Write-Log "Finished: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
