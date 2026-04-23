const logger = require('../utils/logger');
const Ingestor = require('../modules/Ingestor');
const Parser = require('../modules/Parser');

class Pipeline {
    /**
     * @param {string} targetDirectory - The path to the Express.js project we want to analyze.
     */
    constructor(targetDirectory) {
        this.targetDirectory = targetDirectory;
        
        // Instantiate our modules
        this.ingestor = new Ingestor(this.targetDirectory);
        this.parser = new Parser();
    }

    /**
     * The master control sequence. This runs the entire tool from start to finish.
     * @returns {Promise<Object>} The final result of the pipeline.
     */
    async run() {
        logger.info('================================================');
        logger.info(`🚀 Starting Automated API Load Test Generator`);
        logger.info(`🎯 Target Directory: ${this.targetDirectory}`);
        logger.info('================================================');

        try {
            // ---------------------------------------------------------
            // STAGE 1: Ingestion (Read the files)
            // ---------------------------------------------------------
            logger.info('[STAGE 1] Initiating File Ingestion...');
            const rawFiles = await this.ingestor.execute();

            if (rawFiles.length === 0) {
                logger.warn('No valid JavaScript/TypeScript files found. Exiting pipeline.');
                return { status: 'aborted', reason: 'No files found' };
            }

            // ---------------------------------------------------------
            // STAGE 2: Parsing (AI Extraction)
            // ---------------------------------------------------------
            logger.info('[STAGE 2] Initiating AI Route Extraction...');
            const extractedRoutes = await this.parser.execute(rawFiles);

            if (extractedRoutes.length === 0) {
                logger.warn('No API routes could be extracted from the provided files. Exiting pipeline.');
                return { status: 'aborted', reason: 'No routes found' };
            }

            // --- Future stages (Blueprint, Security Analyzer, Generator) will go here ---

            // For now, we will just log our success and return the routes
            logger.info('================================================');
            logger.info('✅ Pipeline Execution Completed Successfully');
            logger.info(`📊 Total Routes Extracted: ${extractedRoutes.length}`);
            logger.info('================================================');

            return {
                status: 'success',
                data: extractedRoutes
            };

        } catch (error) {
            // Global Error Handler: If ANY stage throws an unhandled error, it bubbles up to here.
            logger.error('================================================');
            logger.error(`❌ FATAL PIPELINE ERROR: ${error.message}`);
            logger.error('================================================');
            
            throw error; // Rethrow to the CLI so it can exit the process safely
        }
    }
}

module.exports = Pipeline;