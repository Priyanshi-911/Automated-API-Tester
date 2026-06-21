const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

class Ingestor {
    constructor(targetPath) {
        // Renamed from targetDirectory to targetPath to reflect broader support
        this.targetPath = targetPath;
    }

    /**
     * The main entry point for this module.
     * @returns {Promise<Array>} Array of objects containing file paths and their string content.
     */
    async execute() {
        logger.info(`Starting ingestion for: ${this.targetPath}`);
        
        try {
            const absolutePath = path.resolve(process.cwd(), this.targetPath);
            const stat = await fs.stat(absolutePath);

            // NEW LOGIC: Handle single file targeting
            if (stat.isFile()) {
                if (absolutePath.endsWith('.js') || absolutePath.endsWith('.ts')) {
                    const content = await fs.readFile(absolutePath, 'utf8');
                    logger.info(`Ingestion complete. Target was a single file.`);
                    return [{ filePath: absolutePath, content: content }];
                } else {
                    throw new Error(`Target file must be a .js or .ts file: ${absolutePath}`);
                }
            }

            // ORIGINAL LOGIC: Handle directory scanning
            if (stat.isDirectory()) {
                const files = await this.readDirectory(absolutePath);
                logger.info(`Ingestion complete. Found ${files.length} relevant files in directory.`);
                return files;
            }

            throw new Error(`Target path is neither a valid file nor directory: ${absolutePath}`);

        } catch (error) {
            logger.error(`Ingestion failed: ${error.message}`);
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
        const list = await fs.readdir(dir, { withFileTypes: true });

        for (const item of list) {
            const fullPath = path.join(dir, item.name);

            if (item.isDirectory()) {
                if (item.name === 'node_modules' || item.name.startsWith('.')) {
                    continue; 
                }
                const subFiles = await this.readDirectory(fullPath);
                results = results.concat(subFiles);
            } else {
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