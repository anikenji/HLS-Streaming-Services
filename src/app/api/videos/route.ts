/**
 * GET /api/videos - List videos
 * POST /api/videos - Upload video (chunked)
 */

import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db, videos, users, encodingJobs } from '@/lib/db';
import { eq, desc, and, sql } from 'drizzle-orm';
import { errorResponse, successResponse, formatBytes, formatDuration, generateUUID, ensureDirectory, validateVideoFile } from '@/lib/helpers';
import { UPLOAD_DIR, BASE_URL, HLS_BASE_URL, THUMBNAIL_BASE_URL } from '@/lib/config';
import path from 'path';
import fs from 'fs';

export async function GET(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return errorResponse('Authentication required', 401);
        }

        const searchParams = request.nextUrl.searchParams;
        const status = searchParams.get('status');
        const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
        const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
        const offset = (page - 1) * limit;

        // Build query conditions
        const conditions = [];
        if (user.role !== 'admin') {
            conditions.push(eq(videos.userId, user.id));
        }
        if (status && ['pending', 'processing', 'completed', 'failed'].includes(status)) {
            conditions.push(eq(videos.status, status as 'pending' | 'processing' | 'completed' | 'failed'));
        }

        // Get total count
        const countResult = db.select({ count: sql<number>`count(*)` })
            .from(videos)
            .where(conditions.length > 0 ? and(...conditions) : undefined)
            .get();
        const total = countResult?.count || 0;

        // Get videos with user info
        const videoList = db.select({
            id: videos.id,
            userId: videos.userId,
            movieId: videos.movieId,
            episodeNumber: videos.episodeNumber,
            episodeTitle: videos.episodeTitle,
            originalFilename: videos.originalFilename,
            fileSize: videos.fileSize,
            duration: videos.duration,
            status: videos.status,
            thumbnailPath: videos.thumbnailPath,
            createdAt: videos.createdAt,
            completedAt: videos.completedAt,
            username: users.username,
        })
            .from(videos)
            .leftJoin(users, eq(videos.userId, users.id))
            .where(conditions.length > 0 ? and(...conditions) : undefined)
            .orderBy(desc(videos.createdAt))
            .limit(limit)
            .offset(offset)
            .all();

        // Format response
        const formattedVideos = videoList.map(video => ({
            id: video.id,
            original_filename: video.originalFilename,
            status: video.status,
            movie_id: video.movieId,
            episode_number: video.episodeNumber,
            episode_title: video.episodeTitle,
            file_size: video.fileSize,
            file_size_formatted: formatBytes(video.fileSize || 0),
            duration: video.duration,
            duration_formatted: formatDuration(video.duration || 0),
            thumbnail_url: video.thumbnailPath ? `${THUMBNAIL_BASE_URL}/${video.id}.jpg` : null,
            embed_url: video.status === 'completed' ? `${BASE_URL}/embed/${video.id}` : null,
            master_playlist_url: video.status === 'completed' ? `${HLS_BASE_URL}/${video.id}/video.m3u8` : null,
            created_at: video.createdAt,
            completed_at: video.completedAt,
            uploader: video.username,
        }));

        return successResponse({
            videos: formattedVideos,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit),
            }
        });
    } catch (error) {
        console.error('List videos error:', error);
        return errorResponse('Server error', 500);
    }
}

export async function POST(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return errorResponse('Authentication required', 401);
        }

        const formData = await request.formData();

        // Check if chunked upload
        const chunk = formData.get('chunk') as File | null;
        const videoId = formData.get('video_id') as string;
        const chunkIndex = parseInt(formData.get('chunk_index') as string || '0');
        const totalChunks = parseInt(formData.get('total_chunks') as string || '1');
        const originalFilename = formData.get('original_filename') as string;

        // Single file upload
        const singleFile = formData.get('video') as File | null;

        if (singleFile) {
            // Handle single file upload
            if (!validateVideoFile(singleFile.name)) {
                return errorResponse('Invalid file type');
            }

            const id = generateUUID();
            const ext = path.extname(singleFile.name);
            const uploadPath = path.join(UPLOAD_DIR, `${id}${ext}`);

            ensureDirectory(UPLOAD_DIR);

            const buffer = Buffer.from(await singleFile.arrayBuffer());
            fs.writeFileSync(uploadPath, buffer);

            // Create video record
            db.insert(videos).values({
                id,
                userId: user.id,
                originalFilename: singleFile.name,
                originalPath: uploadPath,
                fileSize: singleFile.size,
                status: 'pending',
                createdAt: new Date().toISOString(),
            }).run();

            // Create encoding job
            db.insert(encodingJobs).values({
                videoId: id,
                quality: 'source',
                status: 'pending',
                createdAt: new Date().toISOString(),
            }).run();

            return successResponse({ video_id: id, upload_complete: true });
        }

        if (chunk && videoId && originalFilename) {
            // Handle chunked upload
            if (!validateVideoFile(originalFilename)) {
                return errorResponse('Invalid file type');
            }

            const ext = path.extname(originalFilename);
            const tempDir = path.join(UPLOAD_DIR, 'temp', videoId);
            ensureDirectory(tempDir);

            // Save chunk
            const chunkPath = path.join(tempDir, `chunk_${chunkIndex}`);
            const buffer = Buffer.from(await chunk.arrayBuffer());
            fs.writeFileSync(chunkPath, buffer);

            // Check if all chunks received
            const receivedChunks = fs.readdirSync(tempDir).filter(f => f.startsWith('chunk_')).length;

            if (receivedChunks === totalChunks) {
                // Merge chunks
                const finalPath = path.join(UPLOAD_DIR, `${videoId}${ext}`);
                const writeStream = fs.createWriteStream(finalPath);

                for (let i = 0; i < totalChunks; i++) {
                    const chunkData = fs.readFileSync(path.join(tempDir, `chunk_${i}`));
                    writeStream.write(chunkData);
                }
                writeStream.end();

                // Cleanup temp
                fs.rmSync(tempDir, { recursive: true, force: true });

                // Get file size
                const stats = fs.statSync(finalPath);

                // Create video record
                db.insert(videos).values({
                    id: videoId,
                    userId: user.id,
                    originalFilename,
                    originalPath: finalPath,
                    fileSize: stats.size,
                    status: 'pending',
                    createdAt: new Date().toISOString(),
                }).run();

                // Create encoding job
                db.insert(encodingJobs).values({
                    videoId,
                    quality: 'source',
                    status: 'pending',
                    createdAt: new Date().toISOString(),
                }).run();

                return successResponse({ video_id: videoId, upload_complete: true });
            }

            return successResponse({
                video_id: videoId,
                chunk_received: chunkIndex,
                chunks_total: totalChunks,
                upload_complete: false
            });
        }

        return errorResponse('No file provided');
    } catch (error) {
        console.error('Upload error:', error);
        return errorResponse('Server error', 500);
    }
}
