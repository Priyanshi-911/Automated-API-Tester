const logger = require('../utils/logger');

class LlmService {
    constructor() {
        this.apiKey = process.env.GEMINI_API_KEY;
        // Defaulting to the 1.5 Flash model for high speed and cost efficiency
        this.model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
        
        // Gemini REST API Endpoint
        this.apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

        if (!this.apiKey) {
            logger.warn('WARNING: No GEMINI_API_KEY found in environment variables.');
        }
    }

    /**
     * Sends a prompt to the Gemini API and guarantees a JSON object return.
     * @param {string} systemPrompt - The strict instructions for the AI.
     * @param {string} userContent - The code or data to be analyzed.
     * @returns {Promise<Object>} A parsed JavaScript object.
     */
    async askForJson(systemPrompt, userContent) {
        logger.info(`Initiating network call to Gemini (${this.model})...`);

        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    // Gemini 1.5 supports explicit system instructions
                    system_instruction: {
                        parts: [{ text: systemPrompt }]
                    },
                    contents: [{
                        role: 'user',
                        parts: [{ text: userContent }]
                    }],
                    generationConfig: {
                        temperature: 0.1,
                        // Force the model to natively output JSON
                        responseMimeType: "application/json" 
                    }
                })
            });

            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`Gemini API Error [${response.status}]: ${errorBody}`);
            }

            const data = await response.json();
            
            // Navigate Gemini's specific payload structure
            const rawString = data.candidates[0].content.parts[0].text;

            logger.info('Successfully received response from Gemini.');
            
            return this.cleanAndParseJson(rawString);

        } catch (error) {
            logger.error(`LlmService execution failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Defensively cleans the AI output before parsing.
     * @param {string} rawString 
     * @returns {Object}
     */
    cleanAndParseJson(rawString) {
        try {
            let cleanString = rawString.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
            return JSON.parse(cleanString);
        } catch (error) {
            logger.error('Failed to parse Gemini output into JSON.');
            logger.debug(`Raw Output received: ${rawString}`); 
            throw new Error('Gemini output was not valid JSON');
        }
    }
}

module.exports = new LlmService();