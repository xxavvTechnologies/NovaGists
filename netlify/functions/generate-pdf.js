const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const marked = require('marked');

exports.handler = async function(event, context) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { content, title } = JSON.parse(event.body);
        
        // Setup browser
        const browser = await puppeteer.launch({
            args: chromium.args,
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath(),
            headless: chromium.headless,
        });
        
        const page = await browser.newPage();
        
        // Convert markdown to HTML
        const htmlContent = marked.parse(content);
        
        // Generate PDF
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>${title || 'Gist'}</title>
                <style>
                    body {
                        font-family: system-ui, -apple-system, sans-serif;
                        line-height: 1.6;
                        padding: 2rem;
                        max-width: 800px;
                        margin: 0 auto;
                    }
                    pre {
                        background: #f6f8fa;
                        padding: 1rem;
                        border-radius: 4px;
                        overflow-x: auto;
                    }
                    code {
                        font-family: 'Courier New', Courier, monospace;
                    }
                </style>
            </head>
            <body>
                <h1>${title || 'Untitled Gist'}</h1>
                ${htmlContent}
            </body>
            </html>
        `;
        
        await page.setContent(html);
        const pdf = await page.pdf({
            format: 'A4',
            margin: { top: '2cm', right: '2cm', bottom: '2cm', left: '2cm' }
        });
        
        await browser.close();
        
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/pdf'
            },
            body: pdf.toString('base64'),
            isBase64Encoded: true
        };
    } catch (error) {
        console.error('PDF generation error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'PDF generation failed' })
        };
    }
};
