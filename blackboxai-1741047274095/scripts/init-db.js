const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function initializeDatabase() {
    let connection;
    
    try {
        // First connect without database to create it
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || ''
        });

        // Create database if it doesn't exist
        await connection.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME || 'dms'}`);
        console.log('Database created successfully');

        // Switch to the database
        await connection.query(`USE ${process.env.DB_NAME || 'dms'}`);

        // Read and execute schema.sql
        const schemaPath = path.join(__dirname, '..', 'config', 'schema.sql');
        const schema = await fs.readFile(schemaPath, 'utf8');

        // Split schema into individual statements
        const statements = schema
            .split(';')
            .filter(statement => statement.trim())
            .map(statement => statement.trim() + ';');

        // Execute each statement
        for (const statement of statements) {
            try {
                await connection.query(statement);
            } catch (err) {
                if (err.code !== 'ER_TABLE_EXISTS_ERROR' && err.code !== 'ER_DUP_ENTRY') {
                    throw err;
                }
            }
        }

        console.log('Database schema initialized successfully');

        // Insert some sample data
        await connection.query(`
            INSERT INTO master (first_name, last_name, email, phone1, vendor_name, region)
            VALUES 
            ('John', 'Doe', 'john@example.com', '1234567890', 'Vendor A', 'North'),
            ('Jane', 'Smith', 'jane@example.com', '0987654321', 'Vendor B', 'South'),
            ('Bob', 'Johnson', 'bob@example.com', '5555555555', 'Vendor C', 'East')
            ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP
        `);

        console.log('Sample data inserted successfully');

    } catch (error) {
        console.error('Error initializing database:', error);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

// Run the initialization
initializeDatabase().then(() => {
    console.log('Database initialization completed');
    process.exit(0);
}).catch(error => {
    console.error('Database initialization failed:', error);
    process.exit(1);
});
