/**
 * Database Connection - SQLite with Drizzle ORM
 * Uses lazy initialization to avoid errors during module loading
 */

import Database from 'better-sqlite3';
import { drizzle, BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import path from 'path';
import fs from 'fs';

// Database file path
const DB_PATH = path.join(process.cwd(), 'data', 'streaming.db');

// Singleton instances
let sqlite: Database.Database | null = null;
let drizzleDb: BetterSQLite3Database<typeof schema> | null = null;

/**
 * Get or create database connection
 */
function getConnection(): Database.Database {
    if (!sqlite) {
        // Ensure data directory exists
        const dataDir = path.dirname(DB_PATH);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        sqlite = new Database(DB_PATH);
        sqlite.pragma('journal_mode = WAL');
    }
    return sqlite;
}

/**
 * Get Drizzle ORM instance (lazy initialization)
 */
function getDrizzle(): BetterSQLite3Database<typeof schema> {
    if (!drizzleDb) {
        drizzleDb = drizzle(getConnection(), { schema });
    }
    return drizzleDb;
}

// Create a proxy that lazily initializes the database
export const db = new Proxy({} as BetterSQLite3Database<typeof schema>, {
    get(target, prop) {
        const drizzleInstance = getDrizzle();
        const value = (drizzleInstance as Record<string | symbol, unknown>)[prop];
        if (typeof value === 'function') {
            return value.bind(drizzleInstance);
        }
        return value;
    }
});

// Export schema for use elsewhere
export * from './schema';

// Export raw sqlite getter for migrations
export function getSqlite(): Database.Database {
    return getConnection();
}
