const logger = require('../utils/logger');
const llmService = require('../services/LlmService');
const { SECURITY_ANALYSIS_PROMPT } = require('../prompts/securityPrompts');

class SecurityAnalyzer {
    constructor() {}

    /**
     * Executes the security analysis against all endpoints in the blueprint.
     * @param {Object} blueprint - The ApiBlueprint instance containing the endpoints.
     * @returns {Promise<Object>} The enriched blueprint.
     */
    async execute(blueprint) {
        logger.info('================================================');
        logger.info(`🛡️ Starting Security Analysis for ${blueprint.endpoints.length} endpoints...`);
        
        // We process sequentially to strictly respect LLM API rate limits
        for (const endpoint of blueprint.endpoints) {
            try {
                await this._analyzeEndpoint(endpoint);
            } catch (error) {
                logger.error(`Security analysis failed for endpoint [${endpoint.method} ${endpoint.path}]: ${error.message}`);
                // Fault Tolerance: Continue to the next endpoint even if this one fails
            }
        }

        logger.info('✅ Security Analysis Complete.');
        logger.info('================================================');
        
        // Return the mutated blueprint so the next pipeline stage can use it
        return blueprint; 
    }

    /**
     * Sends a single endpoint's data to the LLM and attaches the discovered vulnerabilities.
     * @param {Object} endpoint - A single endpoint object from the ApiBlueprint.
     */
    async _analyzeEndpoint(endpoint) {
        // Optimization: We DO NOT send the UUID, sourceFile, or empty arrays to the AI.
        // We only send the minimum viable data (Method, Path, Parameters) to save API tokens and reduce confusion.
        const aiPayload = {
            method: endpoint.method,
            path: endpoint.path,
            parameters: endpoint.parameters
        };

        logger.debug(`Scanning [${endpoint.method} ${endpoint.path}] for vulnerabilities...`);

        const aiResponse = await llmService.askForJson(
            SECURITY_ANALYSIS_PROMPT,
            JSON.stringify(aiPayload)
        );

        // Defensive validation: Ensure the AI adhered to our output schema
        if (aiResponse && Array.isArray(aiResponse.vulnerabilities)) {
            
            // Attach the findings directly into the blueprint's existing 'securityFlags' array
            endpoint.securityFlags.push(...aiResponse.vulnerabilities);
            
            // If the AI actually found something, log a warning so the developer sees it in the terminal
            if (aiResponse.vulnerabilities.length > 0) {
                logger.warn(`Identified ${aiResponse.vulnerabilities.length} potential attack vector(s) on [${endpoint.method} ${endpoint.path}]`);
            }
        } else {
            throw new Error("AI hallucination: Did not return a valid 'vulnerabilities' array.");
        }
    }
}

module.exports = SecurityAnalyzer;