/**
 * GET /api/stream/segment
 * Secure HLS segment streaming
 */

import { NextRequest } from 'next/server';
import { errorResponse } from '@/lib/helpers';
import { STREAM_SECRET_KEY, HLS_OUTPUT_DIR } from '@/lib/config';
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
        const segment = searchParams.get('segment');

        if (!token || !segment) {
            return errorResponse('Token and segment required', 400);
        }

        // Validate segment name (prevent path traversal)
        if (!/^seg_\d+\.ts$/.test(segment)) {
            return errorResponse('Invalid segment name', 400);
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

        // Get segment file
        const segmentPath = path.join(HLS_OUTPUT_DIR, videoId, segment);

        if (!fs.existsSync(segmentPath)) {
            return errorResponse('Segment not found', 404);
        }

        const content = fs.readFileSync(segmentPath);

        return new Response(content, {
            headers: {
                'Content-Type': 'video/mp2t',
                'Cache-Control': 'public, max-age=86400',
                'Access-Control-Allow-Origin': '*',
            },
        });
    } catch (error) {
        console.error('Segment error:', error);
        return errorResponse('Server error', 500);
    }
}
