/**
 * Database Schema - SQLite with Drizzle ORM
 * Mirrors the PHP MySQL schema
 */

import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

// Users Table
export const users = sqliteTable('users', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    username: text('username').notNull().unique(),
    email: text('email').notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    role: text('role', { enum: ['admin', 'user'] }).default('user').notNull(),
    createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
    lastLogin: text('last_login'),
});

// Movies/Series Table
export const movies = sqliteTable('movies', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    slug: text('slug').unique(),
    description: text('description'),
    posterUrl: text('poster_url'),
    status: text('status', { enum: ['ongoing', 'completed'] }).default('ongoing'),
    totalEpisodes: integer('total_episodes').default(0),
    createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
    updatedAt: text('updated_at').default('CURRENT_TIMESTAMP'),
});

// Videos Table
export const videos = sqliteTable('videos', {
    id: text('id').primaryKey(), // UUID
    userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    movieId: integer('movie_id').references(() => movies.id, { onDelete: 'set null' }),
    episodeNumber: integer('episode_number'),
    episodeTitle: text('episode_title'),
    originalFilename: text('original_filename').notNull(),
    originalPath: text('original_path').notNull(),
    fileSize: integer('file_size').notNull(),
    duration: real('duration'),

    // Status
    status: text('status', { enum: ['pending', 'processing', 'completed', 'failed'] }).default('pending'),

    // HLS paths
    hls360pPath: text('hls_360p_path'),
    hls720pPath: text('hls_720p_path'),
    hls1080pPath: text('hls_1080p_path'),
    masterPlaylistPath: text('master_playlist_path'),

    // Embed
    embedCode: text('embed_code'),
    embedUrl: text('embed_url'),

    // Metadata
    thumbnailPath: text('thumbnail_path'),
    subtitleUrl: text('subtitle_url'),
    introStart: real('intro_start'),
    introEnd: real('intro_end'),
    outroStart: real('outro_start'),
    outroEnd: real('outro_end'),

    // Timestamps
    createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
    startedAt: text('started_at'),
    completedAt: text('completed_at'),
});

// Encoding Jobs Table
export const encodingJobs = sqliteTable('encoding_jobs', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    videoId: text('video_id').notNull().references(() => videos.id, { onDelete: 'cascade' }),
    quality: text('quality', { enum: ['360p', '720p', '1080p', 'source'] }).notNull(),
    status: text('status', { enum: ['pending', 'processing', 'completed', 'failed'] }).default('pending'),

    // Progress
    progress: real('progress').default(0),
    currentFrame: integer('current_frame').default(0),
    totalFrames: integer('total_frames').default(0),
    fps: real('fps').default(0),
    bitrate: text('bitrate'),
    estimatedTimeRemaining: integer('estimated_time_remaining'),

    // Output
    outputPath: text('output_path'),
    errorMessage: text('error_message'),

    // Timestamps
    createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
    startedAt: text('started_at'),
    completedAt: text('completed_at'),
});

// Sessions Table
export const sessions = sqliteTable('sessions', {
    id: text('id').primaryKey(),
    userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    data: text('data'),
    expiresAt: text('expires_at').notNull(),
    lastActivity: text('last_activity').default('CURRENT_TIMESTAMP'),
});

// Type exports
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Video = typeof videos.$inferSelect;
export type NewVideo = typeof videos.$inferInsert;
export type Movie = typeof movies.$inferSelect;
export type NewMovie = typeof movies.$inferInsert;
export type EncodingJob = typeof encodingJobs.$inferSelect;
export type Session = typeof sessions.$inferSelect;
