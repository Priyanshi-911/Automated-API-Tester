const logger = require('../utils/logger');
const llmService = require('../services/LlmService');
const { VALIDATION_PROMPT } = require('../prompts/validationPrompts');

class ValidationGenerator {
    constructor() {}

    /**
     * Executes the functional validation analysis against all endpoints in the blueprint.
     * @param {Object} blueprint - The ApiBlueprint instance containing the endpoints.
     * @returns {Promise<Object>} The enriched blueprint.
     */
    async execute(blueprint) {
        logger.info('================================================');
        logger.info(`🧪 Starting Functional Validation for ${blueprint.endpoints.length} endpoints...`);
        
        // Process sequentially to respect LLM API rate limits
        for (const endpoint of blueprint.endpoints) {
            try {
                await this._analyzeEndpoint(endpoint);
            } catch (error) {
                logger.error(`Validation generation failed for endpoint [${endpoint.method} ${endpoint.path}]: ${error.message}`);
                // Fault Tolerance: Log the error and continue to the next endpoint
            }
        }

        logger.info('✅ Functional Validation Complete.');
        logger.info('================================================');
        
        return blueprint; 
    }

    /**
     * Sends a single endpoint's data to the LLM and attaches the discovered assertions.
     * @param {Object} endpoint - A single endpoint object from the ApiBlueprint.
     */
    async _analyzeEndpoint(endpoint) {
        // Optimization: Only send the minimum viable data to the LLM
        const aiPayload = {
            method: endpoint.method,
            path: endpoint.path,
            parameters: endpoint.parameters,
            requiresAuth: endpoint.requiresAuth // We include this so the LLM knows to generate 401 tests
        };

        logger.debug(`Generating success/failure assertions for [${endpoint.method} ${endpoint.path}]...`);

        const aiResponse = await llmService.askForJson(
            VALIDATION_PROMPT,
            JSON.stringify(aiPayload)
        );

        // Defensive validation: Ensure the AI adhered to our output schema
        if (aiResponse && Array.isArray(aiResponse.assertions)) {
            
            // Attach the findings directly into the blueprint's existing 'functionalAssertions' array
            endpoint.functionalAssertions.push(...aiResponse.assertions);
            
            logger.debug(`Attached ${aiResponse.assertions.length} assertions to [${endpoint.method} ${endpoint.path}]`);
            
        } else {
            throw new Error("AI hallucination: Did not return a valid 'assertions' array.");
        }
    }
}

module.exports = ValidationGenerator;