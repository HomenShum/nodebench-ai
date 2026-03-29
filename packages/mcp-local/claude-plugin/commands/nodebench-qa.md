# NodeBench QA Loop

Full QA loop: crawl -> findings -> fix suggestions -> re-crawl -> savings report.

## Steps

1. **Crawl the site**: Call `site_map({ url: '<target-url>' })` to crawl all pages and get a session ID.

2. **Review findings**: Call `site_map({ session_id: '<id>', action: 'findings' })` to see all QA issues.

3. **Generate test suggestions**: Call `suggest_tests({ session_id: '<id>' })` to get scenario-based test cases.

4. **Fix issues**: For each finding, trace the root cause (5-whys) and apply minimal targeted fixes.

5. **Re-crawl and diff**: Call `diff_crawl({ url: '<target-url>', baseline_id: '<original-session-id>' })` to compare before/after.

6. **Report savings**: Call `compare_savings()` to show token usage, time saved, and cost estimates.

## Quick start

If you have a running dev server:
```
site_map({ url: 'http://localhost:3000' })
```
Then follow the `next` suggestions in the response.
