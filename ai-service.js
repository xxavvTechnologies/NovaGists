class AstroAI {
    constructor() {
        // No API key needed here anymore as it's handled by the serverless function
    }

    async analyze(text) {
        try {
            const response = await fetch('/.netlify/functions/analyze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ text })
            });

            if (!response.ok) throw new Error('AI analysis failed');
            
            return await response.json();
        } catch (error) {
            console.error('AI analysis error:', error);
            throw error;
        }
    }

    formatInsights(analysis) {
        return `
            <div class="ai-insights">
                <div class="insight">
                    <i class="fas fa-brain"></i>
                    <strong>Summary:</strong> ${analysis.summary}
                </div>
                <div class="insight">
                    <i class="fas fa-heart"></i>
                    <strong>Sentiment:</strong> ${analysis.sentiment}
                </div>
                <div class="insight">
                    <i class="fas fa-tags"></i>
                    <strong>Keywords:</strong> ${analysis.keywords.join(', ')}
                </div>
            </div>
        `;
    }
}
