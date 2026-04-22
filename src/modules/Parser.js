const logger = require('../utils/logger');
const llmService = require('../services/LlmService');
const { EXTRACT_ROUTES_SYSTEM_PROMPT } = require('../prompts/extractionPrompts');

class Parser {
    constructor() {
        // This will accumulate all routes found across all files
        this.allRoutes = [];
    }

    /**
     * The main entry point for the Parser module.
     * @param {Array} ingestedFiles - The output from the Ingestor module.
     * @returns {Promise<Array>} A unified array of all extracted routes.
     */
    async execute(ingestedFiles) {
        logger.info(`Starting AI parsing for ${ingestedFiles.length} files...`);

        // We use a standard for...of loop to process files sequentially.
        for (const file of ingestedFiles) {
            try {
                await this.parseFile(file);
            } catch (error) {
                // Fault Tolerance: If one file fails, log it but DO NOT crash the pipeline.
                // We want to extract as much as possible from the remaining files.
                logger.error(`Failed to parse file [${file.filePath}]: ${error.message}`);
            }
        }

        logger.info(`Parsing complete. Extracted a total of ${this.allRoutes.length} routes.`);
        return this.allRoutes;
    }

    /**
     * Sends a single file's content to the LLM and processes the response.
     * @param {Object} file - Contains { filePath, content }
     */
    async parseFile(file) {
        logger.debug(`Analyzing file: ${file.filePath}`);

        // Optimization: Skip completely empty files to save LLM API credits and time
        if (!file.content || file.content.trim() === '') {
            logger.debug('File is empty, skipping.');
            return; 
        }

        // Connect the Prompt, the Service, and the Code
        const aiResponse = await llmService.askForJson(
            EXTRACT_ROUTES_SYSTEM_PROMPT,
            file.content
        );

        // Defensive validation: Ensure the AI actually gave us the 'routes' array we asked for
        if (aiResponse && Array.isArray(aiResponse.routes)) {
            
            // Add context: Inject the file path into each route so we know where it came from later
            const routesWithMetadata = aiResponse.routes.map(route => {
                return {
                    ...route,             // Spread operator: copies all existing properties
                    sourceFile: file.filePath // Adds our new property
                };
            });

            // Push the new routes into our global class array
            this.allRoutes.push(...routesWithMetadata);
            logger.debug(`Found ${routesWithMetadata.length} routes in ${file.filePath}`);

        } else {
            // If the AI hallucinates and returns a weird JSON structure, we throw an error
            // This error gets caught by the try/catch in the execute() method
            throw new Error("AI response did not contain a valid 'routes' array.");
        }
    }
}

module.exports = Parser;