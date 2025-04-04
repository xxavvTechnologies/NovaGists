const fetch = require('node-fetch');

exports.handler = async function(event, context) {
    // Only allow POST method
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { text } = JSON.parse(event.body);
        
        if (!text) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Text is required' })
            };
        }

        // Call NLP Cloud API
        const response = await fetch('https://api.nlpcloud.io/v1/bart-large-mnli/classification', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.NLPCLOUD_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text,
                labels: ['positive', 'negative', 'neutral']
            })
        });

        const sentimentData = await response.json();

        // Get keywords using summarization endpoint
        const keywordsResponse = await fetch('https://api.nlpcloud.io/v1/bart-large-cnn/keywords', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.NLPCLOUD_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ text })
        });

        const keywordsData = await keywordsResponse.json();

        // Get summary
        const summaryResponse = await fetch('https://api.nlpcloud.io/v1/bart-large-cnn/summarization', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.NLPCLOUD_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ text })
        });

        const summaryData = await summaryResponse.json();

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                sentiment: sentimentData.labels[0],
                keywords: keywordsData.keywords.slice(0, 5),
                summary: summaryData.summary_text
            })
        };

    } catch (error) {
        console.error('Analysis error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Analysis failed' })
        };
    }
};
