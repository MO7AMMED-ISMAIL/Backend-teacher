// src/config/db.js
const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI, {
            // Mongoose 8 no longer needs useNewUrlParser / useUnifiedTopology
        });
        console.log(`✅  MongoDB connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`❌  MongoDB connection error: ${error.message}`);
        process.exit(1);
    }
};

// Graceful disconnect on app shutdown
process.on('SIGINT', async () => {
    await mongoose.connection.close();
    console.log('MongoDB connection closed (app termination)');
    process.exit(0);
});

module.exports = connectDB;