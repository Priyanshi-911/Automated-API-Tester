const winston = require('winston');

const { combine, timestamp, printf, colorize } = winston.format;

const customFormat = printf(({ level, message, timestamp }) => {
    return `[${timestamp}] ${level}: ${message}`;
});

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: combine(
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        customFormat
    ),
    transports: [
        new winston.transports.Console({
            format: combine(
                colorize(),
                customFormat
            )
        }),
        new winston.transports.File({ 
            filename: 'dist/error.log', 
            level: 'error' 
        }),
        new winston.transports.File({ 
            filename: 'dist/combined.log' 
        })
    ],
});

module.exports = logger;