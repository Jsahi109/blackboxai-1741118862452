const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');
const fs = require('fs').promises;

// Ensure the data directory exists
const dataDir = path.join(__dirname, '..', 'data');
fs.mkdir(dataDir, { recursive: true }).catch(console.error);

// Database file path
const dbPath = path.join(dataDir, 'database.sqlite');

// Create database connection
async function getDb() {
    try {
        const db = await open({
            filename: dbPath,
            driver: sqlite3.Database
        });

        // Enable foreign keys
        await db.run('PRAGMA foreign_keys = ON');

        return db;
    } catch (error) {
        console.error('Error opening database:', error);
        throw error;
    }
}

// Initialize database schema
async function initializeSchema() {
    const db = await getDb();
    try {
        // Read schema file
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schema = await fs.readFile(schemaPath, 'utf8');

        // Convert MySQL schema to SQLite
        const sqliteSchema = schema
            .replace(/AUTO_INCREMENT/g, 'AUTOINCREMENT')
            .replace(/TIMESTAMP DEFAULT CURRENT_TIMESTAMP/g, 'DATETIME DEFAULT CURRENT_TIMESTAMP')
            .replace(/TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP/g, 'DATETIME DEFAULT CURRENT_TIMESTAMP')
            .replace(/JSON/g, 'TEXT')
            .replace(/BOOLEAN/g, 'INTEGER');

        // Split into individual statements
        const statements = sqliteSchema
            .split(';')
            .filter(statement => statement.trim())
            .map(statement => statement.trim() + ';');

        // Execute each statement
        for (const statement of statements) {
            try {
                await db.exec(statement);
            } catch (err) {
                if (!err.message.includes('table already exists')) {
                    throw err;
                }
            }
        }

        console.log('Database schema initialized successfully');
    } catch (error) {
        console.error('Error initializing schema:', error);
        throw error;
    } finally {
        await db.close();
    }
}

// Initialize database on module load
initializeSchema().catch(console.error);

module.exports = {
    getDb,
    initializeSchema
};
