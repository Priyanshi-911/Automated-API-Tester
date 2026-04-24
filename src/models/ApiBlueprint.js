const logger = require('../utils/logger');
const crypto = require('crypto'); // Built-in Node.js module for unique IDs

class ApiBlueprint {
    /**
     * @param {Array} rawRoutes - The raw JSON array returned by the Parser module.
     */
    constructor(rawRoutes) {
        if (!Array.isArray(rawRoutes)) {
            throw new Error("ApiBlueprint requires an array of raw routes to initialize.");
        }

        // This will hold our perfectly sanitized, guaranteed-structure routes
        this.endpoints = [];
        
        this._processRoutes(rawRoutes);
    }

    /**
     * Iterates through the raw AI data and attempts to normalize each route.
     * @param {Array} rawRoutes 
     */
    _processRoutes(rawRoutes) {
        logger.info(`Validating and structuring ${rawRoutes.length} raw routes into the Blueprint...`);

        for (const raw of rawRoutes) {
            try {
                const cleanEndpoint = this._normalize(raw);
                this.endpoints.push(cleanEndpoint);
            } catch (error) {
                // If the AI completely hallucinated a single route, we drop it,
                // but we DO NOT crash the entire pipeline.
                logger.warn(`Dropped invalid route during blueprinting: ${error.message}`);
                logger.debug(`Faulty raw data: ${JSON.stringify(raw)}`);
            }
        }

        logger.info(`Blueprint created successfully with ${this.endpoints.length} valid endpoints.`);
    }

    /**
     * The boundary layer. This forces raw data into a strict schema.
     * @param {Object} raw - A single raw route object from the AI.
     * @returns {Object} A strictly typed and formatted endpoint object.
     */
    _normalize(raw) {
        // 1. Strict Requirement Check
        if (!raw.method || !raw.path) {
            throw new Error("Missing critical fields: 'method' or 'path'");
        }

        // 2. Data Coercion and Formatting
        return {
            // Assign a unique ID so downstream modules can easily target this exact route
            id: crypto.randomUUID(), 
            
            // Standardize the method (e.g., 'get' -> 'GET')
            method: String(raw.method).toUpperCase(), 
            
            // Ensure the path exists
            path: String(raw.path),
            
            // Track origins
            sourceFile: raw.sourceFile || 'unknown_source',
            
            // Force the AI's answer into a strict true/false boolean
            requiresAuth: Boolean(raw.requires_auth), 

            // Safely map parameters, defaulting to empty arrays if the AI omitted them
            parameters: {
                path: Array.isArray(raw.parameters?.path) ? raw.parameters.path : [],
                query: Array.isArray(raw.parameters?.query) ? raw.parameters.query : [],
                body: Array.isArray(raw.parameters?.body) ? raw.parameters.body : []
            },

            // --- EXTENSIBILITY PLACEHOLDERS ---
            // These arrays are empty now, but the SecurityAnalyzer and 
            // ValidationGenerator will populate them in the next stages.
            securityFlags: [],
            functionalAssertions: [] 
        };
    }
}

module.exports = ApiBlueprint;