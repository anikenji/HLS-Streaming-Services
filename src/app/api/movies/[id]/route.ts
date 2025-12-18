/**
 * GET /api/movies/[id] - Get movie detail
 * PATCH /api/movies/[id] - Update movie
 * DELETE /api/movies/[id] - Delete movie
 */

import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db, movies, videos } from '@/lib/db';
import { eq, asc } from 'drizzle-orm';
import { errorResponse, successResponse, formatBytes, formatDuration, generateSlug } from '@/lib/helpers';
import { BASE_URL, HLS_BASE_URL, THUMBNAIL_BASE_URL } from '@/lib/config';

interface Params {
    params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: Params) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return errorResponse('Authentication required', 401);
        }

        const { id } = await params;
        const movieId = parseInt(id);

        // Get movie
        const movie = db.select().from(movies).where(eq(movies.id, movieId)).get();

        if (!movie) {
            return errorResponse('Movie not found', 404);
        }

        // Check access
        if (user.role !== 'admin' && movie.userId !== user.id) {
            return errorResponse('Access denied', 403);
        }

        // Get episodes
        const episodes = db.select()
            .from(videos)
            .where(eq(videos.movieId, movieId))
            .orderBy(asc(videos.episodeNumber))
            .all();

        const formattedEpisodes = episodes.map(ep => ({
            id: ep.id,
            episode_number: ep.episodeNumber,
            episode_title: ep.episodeTitle,
            original_filename: ep.originalFilename,
            status: ep.status,
            duration: ep.duration,
            duration_formatted: formatDuration(ep.duration || 0),
            file_size_formatted: formatBytes(ep.fileSize || 0),
            thumbnail_url: ep.thumbnailPath ? `${THUMBNAIL_BASE_URL}/${ep.id}.jpg` : null,
            embed_url: ep.status === 'completed' ? `${BASE_URL}/embed/${ep.id}` : null,
            master_playlist_url: ep.status === 'completed' ? `${HLS_BASE_URL}/${ep.id}/video.m3u8` : null,
            intro_start: ep.introStart,
            intro_end: ep.introEnd,
            outro_start: ep.outroStart,
            outro_end: ep.outroEnd,
        }));

        return successResponse({
            movie: {
                id: movie.id,
                title: movie.title,
                slug: movie.slug,
                description: movie.description,
                poster_url: movie.posterUrl,
                status: movie.status,
                total_episodes: episodes.length,
                created_at: movie.createdAt,
                updated_at: movie.updatedAt,
            },
            episodes: formattedEpisodes,
        });
    } catch (error) {
        console.error('Get movie detail error:', error);
        return errorResponse('Server error', 500);
    }
}

export async function PATCH(request: NextRequest, { params }: Params) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return errorResponse('Authentication required', 401);
        }

        const { id } = await params;
        const movieId = parseInt(id);
        const body = await request.json();

        // Get movie
        const movie = db.select().from(movies).where(eq(movies.id, movieId)).get();

        if (!movie) {
            return errorResponse('Movie not found', 404);
        }

        // Check access
        if (user.role !== 'admin' && movie.userId !== user.id) {
            return errorResponse('Access denied', 403);
        }

        // Build update
        const updateData: Record<string, unknown> = {
            updatedAt: new Date().toISOString(),
        };

        if (body.title !== undefined) {
            updateData.title = body.title;
            updateData.slug = generateSlug(body.title);
        }
        if (body.description !== undefined) updateData.description = body.description;
        if (body.poster_url !== undefined) updateData.posterUrl = body.poster_url;
        if (body.status !== undefined) updateData.status = body.status;

        db.update(movies).set(updateData).where(eq(movies.id, movieId)).run();

        return successResponse({}, 'Movie updated successfully');
    } catch (error) {
        console.error('Update movie error:', error);
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

        // Get movie
        const movie = db.select().from(movies).where(eq(movies.id, movieId)).get();

        if (!movie) {
            return errorResponse('Movie not found', 404);
        }

        // Check access
        if (user.role !== 'admin' && movie.userId !== user.id) {
            return errorResponse('Access denied', 403);
        }

        // Remove movie association from videos (don't delete videos)
        db.update(videos)
            .set({ movieId: null, episodeNumber: null })
            .where(eq(videos.movieId, movieId))
            .run();

        // Delete movie
        db.delete(movies).where(eq(movies.id, movieId)).run();

        return successResponse({}, 'Movie deleted successfully');
    } catch (error) {
        console.error('Delete movie error:', error);
        return errorResponse('Server error', 500);
    }
}
