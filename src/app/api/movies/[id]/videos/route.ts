/**
 * POST /api/movies/[id]/videos - Add video to movie
 * DELETE /api/movies/[id]/videos - Remove video from movie
 */

import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db, movies, videos } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { errorResponse, successResponse } from '@/lib/helpers';

interface Params {
    params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: Params) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return errorResponse('Authentication required', 401);
        }

        const { id } = await params;
        const movieId = parseInt(id);
        const body = await request.json();
        const { video_id, episode_number, episode_title } = body;

        if (!video_id) {
            return errorResponse('Video ID is required');
        }

        // Verify movie exists and user has access
        const movie = db.select().from(movies).where(eq(movies.id, movieId)).get();
        if (!movie) {
            return errorResponse('Movie not found', 404);
        }
        if (user.role !== 'admin' && movie.userId !== user.id) {
            return errorResponse('Access denied', 403);
        }

        // Verify video exists
        const video = db.select().from(videos).where(eq(videos.id, video_id)).get();
        if (!video) {
            return errorResponse('Video not found', 404);
        }

        // Update video with movie association
        db.update(videos)
            .set({
                movieId: movieId,
                episodeNumber: episode_number || null,
                episodeTitle: episode_title || null,
            })
            .where(eq(videos.id, video_id))
            .run();

        return successResponse({}, 'Video added to movie');
    } catch (error) {
        console.error('Add video to movie error:', error);
        return errorResponse('Server error', 500);
    }
}

export async function DELETE(request: NextRequest, { params }: Params) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return errorResponse('Authentication required', 401);
        }

        const { id } = await params;
        const movieId = parseInt(id);
        const { searchParams } = new URL(request.url);
        const videoId = searchParams.get('video_id');

        if (!videoId) {
            return errorResponse('Video ID is required');
        }

        // Verify movie exists and user has access
        const movie = db.select().from(movies).where(eq(movies.id, movieId)).get();
        if (!movie) {
            return errorResponse('Movie not found', 404);
        }
        if (user.role !== 'admin' && movie.userId !== user.id) {
            return errorResponse('Access denied', 403);
        }

        // Remove video from movie (don't delete video)
        db.update(videos)
            .set({
                movieId: null,
                episodeNumber: null,
                episodeTitle: null,
            })
            .where(eq(videos.id, videoId))
            .run();

        return successResponse({}, 'Video removed from movie');
    } catch (error) {
        console.error('Remove video from movie error:', error);
        return errorResponse('Server error', 500);
    }
}
