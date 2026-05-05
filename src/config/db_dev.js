// src/config/db_dev.js
const mongoose = require('mongoose');

let cached = global.mongoose;
if (!cached) {
    cached = global.mongoose = { conn: null, promise: null };
}

const connectDB = async () => {
    if (cached.conn) {
        // Check if connection is still alive
        if (cached.conn.connection.readyState === 1) return cached.conn;
        // Reset if disconnected
        cached.conn = null;
        cached.promise = null;
    }

    if (!cached.promise) {
        cached.promise = mongoose.connect(process.env.MONGO_URL_DEVELOPMENT, {
            bufferCommands: false,          // Don't queue ops when disconnected
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
            connectTimeoutMS: 10000,
            maxPoolSize: 10,
        }).then((mongoose) => {
            console.log('✅ MongoDB connected');
            return mongoose;
        });
    }

    try {
        cached.conn = await cached.promise;
    } catch (error) {
        cached.promise = null;
        console.error(`❌ MongoDB connection error: ${error.message}`);
        throw error;
    }

    return cached.conn;
};

module.exports = connectDB;