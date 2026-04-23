# Audit C:\Users\hshum top-level folder sizes — fast, skips junctions to avoid loops
$ErrorActionPreference = 'SilentlyContinue'
$root = 'C:\Users\hshum'
$out = 'D:\VSCode Projects\cafecorner_nodebench\nodebench_ai4\nodebench-ai\scripts\audit-results.txt'

"Auditing $root ..." | Tee-Object -FilePath $out
"Started: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" | Tee-Object -FilePath $out -Append
"" | Tee-Object -FilePath $out -Append

$results = @()
$topDirs = Get-ChildItem -Path $root -Directory -Force | Where-Object { $_.LinkType -ne 'Junction' -and $_.LinkType -ne 'SymbolicLink' }

foreach ($dir in $topDirs) {
    Write-Host "Scanning $($dir.Name)..."
    $bytes = 0
    $fileCount = 0
    try {
        $measure = Get-ChildItem -Path $dir.FullName -Recurse -File -Force -ErrorAction SilentlyContinue |
                   Measure-Object -Property Length -Sum
        $bytes = if ($measure.Sum) { $measure.Sum } else { 0 }
        $fileCount = $measure.Count
    } catch {}
    $results += [PSCustomObject]@{
        Folder = $dir.Name
        SizeGB = [math]::Round($bytes / 1GB, 2)
        Files = $fileCount
    }
}

"TOP FOLDERS BY SIZE" | Tee-Object -FilePath $out -Append
"===================" | Tee-Object -FilePath $out -Append
$results | Sort-Object SizeGB -Descending | Format-Table -AutoSize | Out-String | Tee-Object -FilePath $out -Append

"" | Tee-Object -FilePath $out -Append
"Finished: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" | Tee-Object -FilePath $out -Append
