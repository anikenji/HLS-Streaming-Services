/**
 * PATCH /api/videos/[id]/metadata
 * Update video metadata (intro/outro times, subtitle URL, episode info)
 */

import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db, videos } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { errorResponse, successResponse } from '@/lib/helpers';

interface Params {
    params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: Params) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return errorResponse('Authentication required', 401);
        }

        const { id } = await params;
        const body = await request.json();

        // Get video
        const video = db.select().from(videos).where(eq(videos.id, id)).get();

        if (!video) {
            return errorResponse('Video not found', 404);
        }

        // Check access (admin or owner)
        if (user.role !== 'admin' && video.userId !== user.id) {
            return errorResponse('Access denied', 403);
        }

        // Build update object
        const updateData: Record<string, unknown> = {};

        if (body.intro_start !== undefined) updateData.introStart = body.intro_start;
        if (body.intro_end !== undefined) updateData.introEnd = body.intro_end;
        if (body.outro_start !== undefined) updateData.outroStart = body.outro_start;
        if (body.outro_end !== undefined) updateData.outroEnd = body.outro_end;
        if (body.subtitle_url !== undefined) updateData.subtitleUrl = body.subtitle_url;
        if (body.episode_title !== undefined) updateData.episodeTitle = body.episode_title;
        if (body.episode_number !== undefined) updateData.episodeNumber = body.episode_number;

        if (Object.keys(updateData).length === 0) {
            return errorResponse('No valid fields to update');
        }

        // Update video
        db.update(videos)
            .set(updateData)
            .where(eq(videos.id, id))
            .run();

        return successResponse({}, 'Metadata updated successfully');
    } catch (error) {
        console.error('Update metadata error:', error);
        return errorResponse('Server error', 500);
    }
}
