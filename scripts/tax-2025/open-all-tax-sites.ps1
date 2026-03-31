# Opens all 7 tax document sites + checklist in your default browser

$checklistPath = Join-Path $PSScriptRoot ".tax-checklist.html"

# Generate checklist HTML
@"
<!DOCTYPE html><html><head><title>Tax Document Checklist</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 900px; margin: 40px auto; padding: 20px; background: #1a1a1a; color: #e0e0e0; }
  h1 { color: #d97757; border-bottom: 2px solid #d97757; padding-bottom: 10px; }
  .site { background: #252525; border: 1px solid #333; border-radius: 8px; padding: 16px; margin: 12px 0; }
  .site h3 { color: #d97757; margin: 0 0 8px 0; display: inline; }
  .site .instructions { color: #aaa; font-size: 14px; margin-top: 8px; }
  .done { opacity: 0.4; text-decoration: line-through; }
  input[type=checkbox] { transform: scale(1.3); margin-right: 8px; cursor: pointer; }
  label { cursor: pointer; }
  .tag { background: #d97757; color: white; border-radius: 4px; padding: 2px 8px; font-size: 12px; font-weight: bold; margin-right: 8px; }
  .summary { background: #2a2015; border: 2px solid #d97757; border-radius: 8px; padding: 20px; margin: 20px 0; }
  code { background: #333; padding: 2px 6px; border-radius: 4px; }
</style></head><body>
  <h1>2025 Tax Document Download Checklist</h1>
  <div class="summary">
    <strong>Instructions:</strong> Each site opened in a separate tab. Log in, download docs, check the box.<br>
    <strong>Save to:</strong> <code>C:\Users\hshum\Downloads\2025-Tax-Bundle\</code>
  </div>
  <div class="site"><label><input type="checkbox" onchange="this.closest('.site').classList.toggle('done')">
    <span class="tag">1</span><h3>Keeper Tax - Prior Returns</h3></label>
    <div class="instructions">Log in > Tax Filing > Download 2023 + 2024 returns as PDF. Accountant needs prior year.</div></div>
  <div class="site"><label><input type="checkbox" onchange="this.closest('.site').classList.toggle('done')">
    <span class="tag">2</span><h3>Chase - Statements + Tax Docs</h3></label>
    <div class="instructions">Log in > Hamburger menu > Statements & Documents > Tax Documents tab > Download 1099-INT. Then Statements tab > December 2025 for each card. Also find "Year in Review".</div></div>
  <div class="site"><label><input type="checkbox" onchange="this.closest('.site').classList.toggle('done')">
    <span class="tag">3</span><h3>Schwab - Consolidated 1099</h3></label>
    <div class="instructions">Log in > Accounts > Tax Center > Download Consolidated 1099 for 2025 (includes 1099-B, 1099-R, 1099-DIV, 1099-INT).</div></div>
  <div class="site"><label><input type="checkbox" onchange="this.closest('.site').classList.toggle('done')">
    <span class="tag">4</span><h3>E*TRADE - Consolidated 1099</h3></label>
    <div class="instructions">Log in > Accounts > Tax Center > Download Consolidated 1099 for 2025.</div></div>
  <div class="site"><label><input type="checkbox" onchange="this.closest('.site').classList.toggle('done')">
    <span class="tag">5</span><h3>Webull - 1099</h3></label>
    <div class="instructions">Log in > Account > Tax Documents > Download 1099 for 2025.</div></div>
  <div class="site"><label><input type="checkbox" onchange="this.closest('.site').classList.toggle('done')">
    <span class="tag">6</span><h3>TurboTax - W-2</h3></label>
    <div class="instructions">Log in > Documents > Download W-2 for 2025. If not here, check Ideaflow/employer HR portal.</div></div>
  <div class="site"><label><input type="checkbox" onchange="this.closest('.site').classList.toggle('done')">
    <span class="tag">7</span><h3>Nelnet - 1098-E Student Loan Interest</h3></label>
    <div class="instructions">Log in > Tax Documents > Download 1098-E for 2025. Worth up to $2,500 deduction!</div></div>
  <div class="summary" style="margin-top:30px">
    <h3 style="color:#d97757;margin-top:0">After downloading everything:</h3>
    <p>Move 1099s into <code>01-Income\1099s\</code></p>
    <p>Move W-2 into <code>01-Income\W2s\</code></p>
    <p>Move Keeper returns into <code>05-General-Tax\</code></p>
    <p>Move 1098-E into <code>02-Deductions\Education\</code></p>
    <p>Move Chase statements into <code>13-Banking\</code></p>
    <p>Zip the whole folder and send to accountant!</p>
  </div>
</body></html>
"@ | Out-File -Encoding utf8 $checklistPath

# Open checklist first
Start-Process $checklistPath
Start-Sleep -Seconds 1

# Open all sites
$urls = @(
    "https://www.keepertax.com/login",
    "https://www.chase.com/",
    "https://www.schwab.com/client-home",
    "https://us.etrade.com/etx/sp/login",
    "https://www.webull.com/account",
    "https://myturbotax.intuit.com/",
    "https://www.nelnet.com/welcome"
)

foreach ($url in $urls) {
    Start-Process $url
    Start-Sleep -Milliseconds 500
}

Write-Host ""
Write-Host "============================================"
Write-Host "  All 7 sites + checklist opened!"
Write-Host "============================================"
Write-Host ""
Write-Host "  Tab 1: Checklist (check off as you go)"
Write-Host "  Tab 2: Keeper Tax (2023+2024 returns)"
Write-Host "  Tab 3: Chase (statements + tax docs)"
Write-Host "  Tab 4: Schwab (consolidated 1099)"
Write-Host "  Tab 5: E*TRADE (consolidated 1099)"
Write-Host "  Tab 6: Webull (1099)"
Write-Host "  Tab 7: TurboTax (W-2)"
Write-Host "  Tab 8: Nelnet (1098-E)"
Write-Host ""
