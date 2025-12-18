/**
 * GET /api/movies - List movies
 * POST /api/movies - Create movie
 */

import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db, movies, videos } from '@/lib/db';
import { eq, desc, and, sql } from 'drizzle-orm';
import { errorResponse, successResponse, generateSlug } from '@/lib/helpers';

export async function GET(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return errorResponse('Authentication required', 401);
        }

        // Get movies (admin sees all, user sees own)
        const conditions = user.role !== 'admin' ? [eq(movies.userId, user.id)] : [];

        const movieList = db.select()
            .from(movies)
            .where(conditions.length > 0 ? and(...conditions) : undefined)
            .orderBy(desc(movies.createdAt))
            .all();

        // Get episode count for each movie
        const formattedMovies = movieList.map(movie => {
            const episodeCount = db.select({ count: sql<number>`count(*)` })
                .from(videos)
                .where(eq(videos.movieId, movie.id))
                .get();

            return {
                id: movie.id,
                title: movie.title,
                slug: movie.slug,
                description: movie.description,
                poster_url: movie.posterUrl,
                status: movie.status,
                total_episodes: episodeCount?.count || 0,
                created_at: movie.createdAt,
                updated_at: movie.updatedAt,
            };
        });

        return successResponse({ movies: formattedMovies });
    } catch (error) {
        console.error('List movies error:', error);
        return errorResponse('Server error', 500);
    }
}

export async function POST(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return errorResponse('Authentication required', 401);
        }

        const body = await request.json();
        const { title, description, poster_url, status } = body;

        if (!title) {
            return errorResponse('Title is required');
        }

        // Generate slug
        const slug = generateSlug(title);

        // Check if slug exists
        const existing = db.select().from(movies).where(eq(movies.slug, slug)).get();
        const finalSlug = existing ? `${slug}-${Date.now()}` : slug;

        // Create movie
        const result = db.insert(movies).values({
            userId: user.id,
            title,
            slug: finalSlug,
            description: description || null,
            posterUrl: poster_url || null,
            status: status || 'ongoing',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        }).run();

        return successResponse({
            movie_id: Number(result.lastInsertRowid),
            slug: finalSlug
        }, 'Movie created successfully');
    } catch (error) {
        console.error('Create movie error:', error);
        return errorResponse('Server error', 500);
    }
}
