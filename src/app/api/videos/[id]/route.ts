/**
 * GET /api/videos/[id] - Get video detail
 * DELETE /api/videos/[id] - Delete video
 */

import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db, videos, encodingJobs, users } from '@/lib/db';
import { eq, and } from 'drizzle-orm';
import { errorResponse, successResponse, formatBytes, formatDuration, deleteDirectory } from '@/lib/helpers';
import { BASE_URL, HLS_BASE_URL, THUMBNAIL_BASE_URL, HLS_OUTPUT_DIR, UPLOAD_DIR, THUMBNAIL_DIR } from '@/lib/config';
import path from 'path';
import fs from 'fs';

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

        // Get video with user info
        const video = db.select({
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
            subtitleUrl: videos.subtitleUrl,
            introStart: videos.introStart,
            introEnd: videos.introEnd,
            outroStart: videos.outroStart,
            outroEnd: videos.outroEnd,
            createdAt: videos.createdAt,
            startedAt: videos.startedAt,
            completedAt: videos.completedAt,
            username: users.username,
        })
            .from(videos)
            .leftJoin(users, eq(videos.userId, users.id))
            .where(eq(videos.id, id))
            .get();

        if (!video) {
            return errorResponse('Video not found', 404);
        }

        // Check access (admin or owner)
        if (user.role !== 'admin' && video.userId !== user.id) {
            return errorResponse('Access denied', 403);
        }

        // Get encoding jobs
        const jobs = db.select()
            .from(encodingJobs)
            .where(eq(encodingJobs.videoId, id))
            .all();

        // Format response
        const formattedVideo = {
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
            subtitle_url: video.subtitleUrl,
            intro_start: video.introStart,
            intro_end: video.introEnd,
            outro_start: video.outroStart,
            outro_end: video.outroEnd,
            created_at: video.createdAt,
            started_at: video.startedAt,
            completed_at: video.completedAt,
            uploader: video.username,
        };

        const formattedJobs = jobs.map(job => ({
            id: job.id,
            quality: job.quality,
            status: job.status,
            progress: job.progress,
            current_frame: job.currentFrame,
            total_frames: job.totalFrames,
            fps: job.fps,
            bitrate: job.bitrate,
            estimated_time_remaining: job.estimatedTimeRemaining,
            error_message: job.errorMessage,
        }));

        return successResponse({ video: formattedVideo, jobs: formattedJobs });
    } catch (error) {
        console.error('Get video detail error:', error);
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

        // Get video
        const video = db.select().from(videos).where(eq(videos.id, id)).get();

        if (!video) {
            return errorResponse('Video not found', 404);
        }

        // Check access (admin or owner)
        if (user.role !== 'admin' && video.userId !== user.id) {
            return errorResponse('Access denied', 403);
        }

        // Delete files
        if (video.originalPath && fs.existsSync(video.originalPath)) {
            fs.unlinkSync(video.originalPath);
        }

        // Delete HLS output
        const hlsDir = path.join(HLS_OUTPUT_DIR, id);
        deleteDirectory(hlsDir);

        // Delete thumbnail
        const thumbnailPath = path.join(THUMBNAIL_DIR, `${id}.jpg`);
        if (fs.existsSync(thumbnailPath)) {
            fs.unlinkSync(thumbnailPath);
        }

        // Delete encoding jobs (cascade should handle this, but be safe)
        db.delete(encodingJobs).where(eq(encodingJobs.videoId, id)).run();

        // Delete video record
        db.delete(videos).where(eq(videos.id, id)).run();

        return successResponse({}, 'Video deleted successfully');
    } catch (error) {
        console.error('Delete video error:', error);
        return errorResponse('Server error', 500);
    }
}
