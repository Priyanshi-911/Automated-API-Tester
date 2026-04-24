console.log('Pipeline Initialized. Ready for execution.');
// MUST BE FIRST: Load environment variables before any other file tries to use them
require('dotenv').config(); 

const Pipeline = require('./core/Pipeline');
const logger = require('./utils/logger');

/**
 * The main bootstrap function. 
 * In Node.js, wrapping the entry point in an async function is a standard 
 * practice to allow the use of 'await' at the top level.
 */
async function bootstrap() {
    try {
        // 1. Parse Command Line Arguments
        // process.argv returns an array: [node_path, script_path, arg1, arg2...]
        // We slice the first two off to just get the user's inputs.
        const args = process.argv.slice(2);
        
        if (args.length === 0) {
            logger.error('Missing Argument. Usage: node src/index.js <path-to-express-app>');
            process.exit(1); // Exit code 1 indicates an error to the operating system
        }

        const targetDirectory = args[0];

        // 2. Initialize and Run the Orchestrator
        const pipeline = new Pipeline(targetDirectory);
        const result = await pipeline.run();

        // 3. Handle the Final Output
        if (result.status === 'success') {
            logger.info('✅ Process finished successfully.');
            
            // For now, we will print a sample of the extracted data to the terminal
            // so we can visually verify the AI extraction worked.
            if (result.data && result.data.length > 0) {
                console.log('\n--- SAMPLE EXTRACTED DATA ---');
                console.log(JSON.stringify(result.data[0], null, 2));
                console.log('-----------------------------\n');
            }
        } else {
            logger.warn(`⚠️ Process aborted: ${result.reason}`);
        }

    } catch (error) {
        // If the error bubbled all the way up here, it's a fatal system crash.
        logger.error('Critical failure in application bootstrap.');
        process.exit(1);
    }
}

// Trigger the application
bootstrap();