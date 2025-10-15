# Quick script to check evaluation test results
npm run eval:quick 2>&1 | Select-String -Pattern "PASSED|FAILED|SUMMARY|Success Rate" -Context 0,1
