import { chromium } from 'playwright';

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();

    page.on('console', msg => {
        if (msg.type() === 'error') console.log('ERROR:', msg.text());
        else console.log('LOG:', msg.text());
    });

    page.on('requestfailed', request => {
        console.log('REQUEST FAILED:', request.url(), request.failure()?.errorText);
    });

    page.on('response', response => {
        if (response.status() >= 400) {
            console.log('BAD RESPONSE:', response.status(), response.url());
        }
    });

    try {
        console.log('Navigating to preview server http://localhost:4178/ ...');
        await page.goto('http://localhost:4178/', { waitUntil: 'networkidle' });
        await page.waitForTimeout(5000);
        const html = await page.content();
        console.log('HTML length:', html.length);
        console.log('Main component found?', html.includes('main-content'));
    } catch (err) {
        console.log('EXECUTION ERROR:', err.message);
    } finally {
        await browser.close();
    }
})();
