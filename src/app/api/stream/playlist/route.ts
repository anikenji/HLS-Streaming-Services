/**
 * GET /api/stream/playlist
 * Secure HLS playlist streaming with token validation
 */

import { NextRequest } from 'next/server';
import { errorResponse } from '@/lib/helpers';
import { STREAM_SECRET_KEY, HLS_OUTPUT_DIR, BASE_URL } from '@/lib/config';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

/**
 * Decrypt video token
 */
function decryptVideoToken(encryptedToken: string): { videoId: string; expires: number } | null {
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

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const token = searchParams.get('token');

        if (!token) {
            return errorResponse('Token required', 400);
        }

        // Decrypt and validate token
        const tokenData = decryptVideoToken(token);
        if (!tokenData) {
            return errorResponse('Invalid token', 403);
        }

        // Check expiry
        if (Date.now() > tokenData.expires) {
            return errorResponse('Token expired', 403);
        }

        const { videoId } = tokenData;

        // Get playlist file
        const playlistPath = path.join(HLS_OUTPUT_DIR, videoId, 'video.m3u8');

        if (!fs.existsSync(playlistPath)) {
            return errorResponse('Playlist not found', 404);
        }

        let content = fs.readFileSync(playlistPath, 'utf8');

        // Rewrite segment URLs to use secured endpoint
        content = content.replace(/seg_(\d+)\.ts/g, (match, num) => {
            return `${BASE_URL}/api/stream/segment?token=${encodeURIComponent(token)}&segment=seg_${num}.ts`;
        });

        return new Response(content, {
            headers: {
                'Content-Type': 'application/vnd.apple.mpegurl',
                'Cache-Control': 'no-cache',
                'Access-Control-Allow-Origin': '*',
            },
        });
    } catch (error) {
        console.error('Playlist error:', error);
        return errorResponse('Server error', 500);
    }
}
