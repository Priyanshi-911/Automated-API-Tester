const logger = require('../utils/logger');
const Ingestor = require('../modules/Ingestor');
const Parser = require('../modules/Parser');
const ApiBlueprint = require('../models/ApiBlueprint'); // NEW IMPORT

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
     * The master control sequence.
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

            // ---------------------------------------------------------
            // STAGE 3: Data Structuring (The Boundary Layer)
            // ---------------------------------------------------------
            logger.info('[STAGE 3] Structuring Data into API Blueprint...');
            // We pass the chaotic AI output directly into our strict DTO class
            const blueprint = new ApiBlueprint(extractedRoutes);

            // --- Future stages (Security Analyzer, Generator) will go here ---

            logger.info('================================================');
            logger.info('✅ Extraction & Structuring Completed Successfully');
            logger.info(`📊 Total Valid Endpoints: ${blueprint.endpoints.length}`);
            logger.info('================================================');

            return {
                status: 'success',
                // Notice we return blueprint.endpoints, NOT extractedRoutes
                data: blueprint.endpoints 
            };

        } catch (error) {
            logger.error('================================================');
            logger.error(`❌ FATAL PIPELINE ERROR: ${error.message}`);
            logger.error('================================================');
            
            throw error;
        }
    }
}

module.exports = Pipeline;