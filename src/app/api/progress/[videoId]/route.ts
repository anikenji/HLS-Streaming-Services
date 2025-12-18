/**
 * GET /api/progress/[videoId]
 * Poll encoding progress for a video
 */

import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db, videos, encodingJobs } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { errorResponse, successResponse } from '@/lib/helpers';

interface Params {
    params: Promise<{ videoId: string }>;
}

export async function GET(request: NextRequest, { params }: Params) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return errorResponse('Authentication required', 401);
        }

        const { videoId } = await params;

        // Get video
        const video = db.select().from(videos).where(eq(videos.id, videoId)).get();
        if (!video) {
            return errorResponse('Video not found', 404);
        }

        // Check access
        if (user.role !== 'admin' && video.userId !== user.id) {
            return errorResponse('Access denied', 403);
        }

        // Get encoding jobs
        const jobs = db.select()
            .from(encodingJobs)
            .where(eq(encodingJobs.videoId, videoId))
            .all();

        // Calculate overall progress
        let totalProgress = 0;
        let completedJobs = 0;

        jobs.forEach(job => {
            totalProgress += job.progress || 0;
            if (job.status === 'completed') completedJobs++;
        });

        const overallProgress = jobs.length > 0 ? totalProgress / jobs.length : 0;
        const isComplete = jobs.length > 0 && completedJobs === jobs.length;

        return successResponse({
            video_id: videoId,
            status: video.status,
            overall_progress: Math.round(overallProgress * 100) / 100,
            is_complete: isComplete,
            jobs: jobs.map(job => ({
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
            })),
        });
    } catch (error) {
        console.error('Progress poll error:', error);
        return errorResponse('Server error', 500);
    }
}
