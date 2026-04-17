const logger = require('../utils/logger');

class LlmService {
    constructor() {
        // Load configurations from the .env file
        this.apiKey = process.env.LLM_API_KEY;
        this.apiUrl = process.env.LLM_API_URL || 'https://api.openai.com/v1/chat/completions';
        this.model = process.env.LLM_MODEL || 'gpt-4'; // Default to a standard model

        if (!this.apiKey) {
            logger.warn('WARNING: No LLM_API_KEY found in environment variables.');
        }
    }

    /**
     * Sends a prompt to the LLM and guarantees a JSON object return.
     * @param {string} systemPrompt - The strict instructions for the AI.
     * @param {string} userContent - The code or data to be analyzed.
     * @returns {Promise<Object>} A parsed JavaScript object.
     */
    async askForJson(systemPrompt, userContent) {
        logger.info('Initiating network call to LLM...');

        try {
            // Using Node's native fetch (available in Node 18+)
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userContent }
                    ],
                    // We enforce low temperature (0.1) so the AI is analytical, not creative
                    temperature: 0.1,
                    // Many modern APIs support forcing a JSON return format
                    response_format: { type: 'json_object' } 
                })
            });

            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`LLM API Error [${response.status}]: ${errorBody}`);
            }

            const data = await response.json();
            const rawString = data.choices[0].message.content;

            logger.info('Successfully received response from LLM.');
            
            // Clean and parse the string into a real object
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
            // AI often wraps JSON in markdown blockquotes like ```json ... ```
            // This regex strips those markdown artifacts away.
            let cleanString = rawString.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
            
            return JSON.parse(cleanString);
        } catch (error) {
            logger.error('Failed to parse LLM output into JSON.');
            logger.debug(`Raw Output received: ${rawString}`); // Save the bad output for debugging
            throw new Error('LLM output was not valid JSON');
        }
    }
}

// We export an *instance* of the service (Singleton pattern)
module.exports = new LlmService();