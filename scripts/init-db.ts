/**
 * Database Initialization Script
 * Run this to create tables and seed admin user
 */

import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'data', 'streaming.db');

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

console.log('Creating database tables...');

// Create users table
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    last_login TEXT
  )
`);

// Create movies table
db.exec(`
  CREATE TABLE IF NOT EXISTS movies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    slug TEXT UNIQUE,
    description TEXT,
    poster_url TEXT,
    status TEXT DEFAULT 'ongoing' CHECK (status IN ('ongoing', 'completed')),
    total_episodes INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`);

// Create videos table
db.exec(`
  CREATE TABLE IF NOT EXISTS videos (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    movie_id INTEGER,
    episode_number INTEGER,
    episode_title TEXT,
    original_filename TEXT NOT NULL,
    original_path TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    duration REAL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    hls_360p_path TEXT,
    hls_720p_path TEXT,
    hls_1080p_path TEXT,
    master_playlist_path TEXT,
    embed_code TEXT,
    embed_url TEXT,
    thumbnail_path TEXT,
    subtitle_url TEXT,
    intro_start REAL,
    intro_end REAL,
    outro_start REAL,
    outro_end REAL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    started_at TEXT,
    completed_at TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE SET NULL
  )
`);

// Create encoding_jobs table
db.exec(`
  CREATE TABLE IF NOT EXISTS encoding_jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    video_id TEXT NOT NULL,
    quality TEXT NOT NULL CHECK (quality IN ('360p', '720p', '1080p', 'source')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    progress REAL DEFAULT 0,
    current_frame INTEGER DEFAULT 0,
    total_frames INTEGER DEFAULT 0,
    fps REAL DEFAULT 0,
    bitrate TEXT,
    estimated_time_remaining INTEGER,
    output_path TEXT,
    error_message TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    started_at TEXT,
    completed_at TEXT,
    FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE
  )
`);

// Create sessions table
db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    data TEXT,
    expires_at TEXT NOT NULL,
    last_activity TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`);

// Create indexes
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  CREATE INDEX IF NOT EXISTS idx_videos_user_id ON videos(user_id);
  CREATE INDEX IF NOT EXISTS idx_videos_movie_id ON videos(movie_id);
  CREATE INDEX IF NOT EXISTS idx_videos_status ON videos(status);
  CREATE INDEX IF NOT EXISTS idx_encoding_jobs_video_id ON encoding_jobs(video_id);
  CREATE INDEX IF NOT EXISTS idx_movies_user_id ON movies(user_id);
  CREATE INDEX IF NOT EXISTS idx_movies_slug ON movies(slug);
`);

console.log('Tables created successfully!');

// Check if admin user exists
const adminExists = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');

if (!adminExists) {
    console.log('Creating default admin user...');
    const passwordHash = bcrypt.hashSync('admin123', 10);
    db.prepare(`
    INSERT INTO users (username, email, password_hash, role, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run('admin', 'admin@localhost', passwordHash, 'admin', new Date().toISOString());
    console.log('Admin user created!');
    console.log('  Username: admin');
    console.log('  Password: admin123');
    console.log('  ⚠️  Please change the password after first login!');
} else {
    console.log('Admin user already exists.');
}

db.close();
console.log('\nDatabase initialization complete!');
