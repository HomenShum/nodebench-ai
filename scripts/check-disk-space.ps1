Get-PSDrive -PSProvider FileSystem |
    Where-Object { $_.Name -in 'C','D' } |
    Select-Object Name,
        @{N='UsedGB';  E={[math]::Round($_.Used/1GB,1)}},
        @{N='FreeGB';  E={[math]::Round($_.Free/1GB,1)}},
        @{N='TotalGB'; E={[math]::Round(($_.Used+$_.Free)/1GB,1)}} |
    Format-Table -AutoSize
