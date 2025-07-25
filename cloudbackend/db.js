const { Pool } = require('pg'); // Use Pool for connection pooling

const createDatabaseConnection = () => {
    return new Pool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT || 5432, // Default for PostgreSQL
        ssl: {
            rejectUnauthorized: false // Often required for cloud Postgres connections
        }
    });
};

const databaseConnection = createDatabaseConnection();

module.exports = databaseConnection;
