/**
 * Helper Functions / Utilities
 */

import { v4 as uuidv4 } from 'uuid';
import { ALLOWED_EXTENSIONS, FFPROBE_PATH } from './config';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const execAsync = promisify(exec);

/**
 * Generate UUID v4
 */
export function generateUUID(): string {
    return uuidv4();
}

/**
 * Validate video file extension
 */
export function validateVideoFile(filename: string): boolean {
    const ext = path.extname(filename).slice(1).toLowerCase();
    return ALLOWED_EXTENSIONS.includes(ext);
}

/**
 * Get file extension
 */
export function getFileExtension(filename: string): string {
    return path.extname(filename).slice(1).toLowerCase();
}

/**
 * Sanitize filename
 */
export function sanitizeFilename(filename: string): string {
    return path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, '_');
}

/**
 * Get video duration using ffprobe
 */
export async function getVideoDuration(filePath: string): Promise<number | null> {
    if (!fs.existsSync(filePath)) return null;

    try {
        const cmd = `"${FFPROBE_PATH}" -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`;
        const { stdout } = await execAsync(cmd);
        return parseFloat(stdout.trim()) || null;
    } catch {
        return null;
    }
}

/**
 * Get video resolution using ffprobe
 */
export async function getVideoResolution(filePath: string): Promise<{ width: number; height: number } | null> {
    if (!fs.existsSync(filePath)) return null;

    try {
        const cmd = `"${FFPROBE_PATH}" -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 "${filePath}"`;
        const { stdout } = await execAsync(cmd);
        const [width, height] = stdout.trim().split('x').map(Number);
        return { width, height };
    } catch {
        return null;
    }
}

/**
 * Format bytes to human readable
 */
export function formatBytes(bytes: number, precision = 2): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let unitIndex = 0;
    let size = bytes;

    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }

    return `${size.toFixed(precision)} ${units[unitIndex]}`;
}

/**
 * Format duration from seconds to HH:MM:SS
 */
export function formatDuration(seconds: number): string {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Ensure directory exists
 */
export function ensureDirectory(dirPath: string): boolean {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
    return fs.existsSync(dirPath);
}

/**
 * Delete directory recursively
 */
export function deleteDirectory(dirPath: string): boolean {
    if (!fs.existsSync(dirPath)) return false;

    fs.rmSync(dirPath, { recursive: true, force: true });
    return true;
}

/**
 * Get file size in bytes
 */
export function getFileSize(filePath: string): number {
    if (!fs.existsSync(filePath)) return 0;
    return fs.statSync(filePath).size;
}

/**
 * JSON response helper
 */
export function jsonResponse(data: object, status = 200): Response {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}

/**
 * Error response helper
 */
export function errorResponse(message: string, status = 400): Response {
    return jsonResponse({ success: false, error: message }, status);
}

/**
 * Success response helper
 */
export function successResponse(data: object = {}, message = ''): Response {
    const response: Record<string, unknown> = { success: true, ...data };
    if (message) response.message = message;
    return jsonResponse(response);
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

/**
 * Validate username (alphanumeric and underscore)
 */
export function validateUsername(username: string): boolean {
    return /^[a-zA-Z0-9_]{3,50}$/.test(username);
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): boolean {
    return password.length >= 6;
}

/**
 * Generate slug from title
 */
export function generateSlug(title: string): string {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}
