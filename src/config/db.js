const mongoose = require('mongoose');

// Use a global variable to cache the connection across serverless function invocations
let cached = global.mongoose;

if (!cached) {
    cached = global.mongoose = { conn: null, promise: null };
}

const connectDB = async () => {
    // If we have a connection, return it
    if (cached.conn) {
        if (cached.conn.connection.readyState === 1) {
            return cached.conn;
        }
        // If connection is not open, reset cache
        cached.conn = null;
        cached.promise = null;
    }

    // If no promise exists, start a new connection
    if (!cached.promise) {
        const opts = {
            bufferCommands: false,
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
            connectTimeoutMS: 10000,
        };

        const dbUri = process.env.MONGO_URI || process.env.MONGO_URL_DEVELOPMENT;
        
        if (!dbUri) {
            console.error('❌ MongoDB URI is missing in environment variables (MONGO_URI or MONGO_URL_DEVELOPMENT)');
            throw new Error('Database connection URI is missing');
        }

        console.log('📡 Attempting to connect to MongoDB...');
        cached.promise = mongoose.connect(dbUri, opts).then((mongoose) => {
            console.log('✅ MongoDB connected successfully');
            return mongoose;
        });
    }

    try {
        cached.conn = await cached.promise;
    } catch (e) {
        cached.promise = null;
        console.error(`❌ MongoDB connection error: ${e.message}`);
        throw e;
    }

    return cached.conn;
};

module.exports = connectDB;
