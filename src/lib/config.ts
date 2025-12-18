/**
 * Application Configuration
 */

import path from 'path';

// Storage paths (relative to project root)
export const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
export const HLS_OUTPUT_DIR = path.join(process.cwd(), 'hls');
export const THUMBNAIL_DIR = path.join(process.cwd(), 'thumbnails');
export const TEMP_DIR = path.join(process.cwd(), 'temp');

// FFmpeg paths (update for your system)
export const FFMPEG_PATH = process.env.FFMPEG_PATH || 'C:/ffmpeg/bin/ffmpeg.exe';
export const FFPROBE_PATH = process.env.FFPROBE_PATH || 'C:/ffmpeg/bin/ffprobe.exe';

// Server configuration
export const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
export const API_BASE = `${BASE_URL}/api`;
export const HLS_BASE_URL = `${BASE_URL}/hls`;
export const THUMBNAIL_BASE_URL = `${BASE_URL}/thumbnails`;

// JWPlayer configuration
export const JWPLAYER_KEY = process.env.JWPLAYER_KEY || 'YOUR_JWPLAYER_KEY';
export const JWPLAYER_CDN = process.env.JWPLAYER_CDN || 'https://cdn.jwplayer.com/libraries/YOUR_KEY.js';

// Upload configuration
export const MAX_UPLOAD_SIZE = 5 * 1024 * 1024 * 1024; // 5GB
export const ALLOWED_EXTENSIONS = ['mp4', 'mkv', 'avi', 'mov', 'webm', 'flv'];
export const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB

// Session configuration
export const SESSION_LIFETIME = 86400; // 24 hours
export const JWT_SECRET = process.env.JWT_SECRET || 'YOUR_SECRET_KEY_CHANGE_THIS';

// Stream security
export const STREAM_SECRET_KEY = process.env.STREAM_SECRET_KEY || 'YOUR_STREAM_SECRET';
export const STREAM_TOKEN_EXPIRY = 4 * 60 * 60; // 4 hours

// Encoding configuration
export const ENCODING_PROFILE = {
    video_bitrate: '1500k',
    max_bitrate: '2000k',
    buffer_size: '4000k',
    audio_bitrate: '192k',
    preset: 'fast',
};

export const HLS_SEGMENT_DURATION = 2;
export const HLS_PLAYLIST_TYPE = 'vod';

// Worker configuration
export const WORKER_INTERVAL = 5; // seconds
export const MAX_CONCURRENT_ENCODES = 3;

// App info
export const APP_NAME = 'HLS Streaming Service';
export const APP_VERSION = '1.0.0';
