/**
 * Security utilities for stream token encryption
 */

import crypto from 'crypto';
import { STREAM_SECRET_KEY, STREAM_TOKEN_EXPIRY } from './config';

/**
 * Encrypt video token for secure streaming
 */
export function encryptVideoToken(videoId: string): string {
    const key = crypto.scryptSync(STREAM_SECRET_KEY, 'salt', 32);
    const iv = crypto.randomBytes(16);

    const data = JSON.stringify({
        videoId,
        expires: Date.now() + (STREAM_TOKEN_EXPIRY * 1000),
    });

    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return `${iv.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt video token
 */
export function decryptVideoToken(encryptedToken: string): { videoId: string; expires: number } | null {
    try {
        const key = crypto.scryptSync(STREAM_SECRET_KEY, 'salt', 32);
        const [ivHex, encryptedHex] = encryptedToken.split(':');
        const iv = Buffer.from(ivHex, 'hex');
        const encrypted = Buffer.from(encryptedHex, 'hex');

        const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
        let decrypted = decipher.update(encrypted, undefined, 'utf8');
        decrypted += decipher.final('utf8');

        return JSON.parse(decrypted);
    } catch {
        return null;
    }
}

/**
 * Validate stream token
 */
export function validateStreamToken(token: string): { valid: boolean; videoId?: string; error?: string } {
    if (!token) {
        return { valid: false, error: 'Token required' };
    }

    const tokenData = decryptVideoToken(token);
    if (!tokenData) {
        return { valid: false, error: 'Invalid token' };
    }

    if (Date.now() > tokenData.expires) {
        return { valid: false, error: 'Token expired' };
    }

    return { valid: true, videoId: tokenData.videoId };
}
