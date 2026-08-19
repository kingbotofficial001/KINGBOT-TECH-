"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isDatabaseConnected = isDatabaseConnected;
exports.connectDatabase = connectDatabase;
exports.requireDatabase = requireDatabase;
const mongoose_1 = __importDefault(require("mongoose"));
const logger_1 = __importDefault(require("./utils/logger"));
let hasLoggedMissingUri = false;
function isDatabaseConnected() {
    return mongoose_1.default.connection.readyState === 1;
}
async function connectDatabase() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        if (!hasLoggedMissingUri) {
            logger_1.default.warn('MONGODB_URI is not set. The API will run in degraded mode until it is configured.');
            hasLoggedMissingUri = true;
        }
        return false;
    }
    mongoose_1.default.set('strictQuery', true);
    mongoose_1.default.connection.on('error', (err) => {
        logger_1.default.error('MongoDB connection error', err);
    });
    mongoose_1.default.connection.on('disconnected', () => {
        logger_1.default.warn('MongoDB disconnected. Will retry automatically.');
    });
    mongoose_1.default.connection.on('reconnected', () => {
        logger_1.default.info('MongoDB reconnected.');
    });
    try {
        await mongoose_1.default.connect(uri, { serverSelectionTimeoutMS: 8000 });
        logger_1.default.info('Connected to MongoDB.');
        return true;
    }
    catch (err) {
        logger_1.default.error('Could not connect to MongoDB. The API will run in degraded mode.', err);
        return false;
    }
}
function requireDatabase(req, res, next) {
    if (!isDatabaseConnected()) {
        res.status(503).json({ error: 'Database is currently unavailable. Please try again shortly.' });
        return;
    }
    next();
}
