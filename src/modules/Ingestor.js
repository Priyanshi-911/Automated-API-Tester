const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

class Ingestor {
    constructor(targetDirectory) {
        this.targetDirectory = targetDirectory;
    }

    /**
     * The main entry point for this module.
     * @returns {Promise<Array>} Array of objects containing file paths and their string content.
     */
    async execute() {
        logger.info(`Starting ingestion for directory: ${this.targetDirectory}`);
        
        try {
            // Convert relative path to an absolute path based on where the script is run
            const absolutePath = path.resolve(process.cwd(), this.targetDirectory);
            
            // Check if the path exists and is actually a directory
            const stat = await fs.stat(absolutePath);
            if (!stat.isDirectory()) {
                throw new Error(`Target path is not a directory: ${absolutePath}`);
            }

            const files = await this.readDirectory(absolutePath);
            logger.info(`Ingestion complete. Found ${files.length} relevant files.`);
            
            return files;

        } catch (error) {
            logger.error(`Ingestion failed: ${error.message}`);
            // We throw the error so the main Pipeline knows execution must stop
            throw error; 
        }
    }

    /**
     * Recursively reads a directory to find all .js and .ts files.
     * @param {string} dir - The directory to scan.
     * @returns {Promise<Array>}
     */
    async readDirectory(dir) {
        let results = [];
        
        // Read contents of the directory. 'withFileTypes' lets us easily check if an item is a folder or file.
        const list = await fs.readdir(dir, { withFileTypes: true });

        for (const item of list) {
            const fullPath = path.join(dir, item.name);

            if (item.isDirectory()) {
                // Ignore irrelevant folders to save memory and processing time
                if (item.name === 'node_modules' || item.name.startsWith('.')) {
                    continue; 
                }
                // Recursion: If it's a folder, call this exact function again to look inside it
                const subFiles = await this.readDirectory(fullPath);
                results = results.concat(subFiles);
            } else {
                // We only care about backend code files (JavaScript/TypeScript)
                if (fullPath.endsWith('.js') || fullPath.endsWith('.ts')) {
                    const content = await fs.readFile(fullPath, 'utf8');
                    results.push({
                        filePath: fullPath,
                        content: content
                    });
                    logger.debug(`Successfully ingested: ${item.name}`);
                }
            }
        }
        
        return results;
    }
}

module.exports = Ingestor;