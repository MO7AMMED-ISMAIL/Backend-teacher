// src/server.js
require('dotenv').config();

const app = require('./app');
const connectDB = require('./config/db_dev');

const PORT = process.env.PORT || 5000;

// Connect to MongoDB then start the server
const startServer = async () => {
    await connectDB();

    const server = app.listen(PORT, () => {
        console.log('─────────────────────────────────────────');
        console.log(`🚀  Server running on port ${PORT}`);
        console.log(`🌍  Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`📡  API Base URL: http://localhost:${PORT}/api`);
        console.log('─────────────────────────────────────────');
    });


    // Graceful shutdown on unhandled errors
    process.on('unhandledRejection', (err) => {
        console.error('❌ Unhandled Rejection:', err.message);
        server.close(() => process.exit(1));
    });


    process.on('uncaughtException', (err) => {
        console.error('❌ Uncaught Exception:', err.message);
        server.close(() => process.exit(1));
    });


};

startServer();