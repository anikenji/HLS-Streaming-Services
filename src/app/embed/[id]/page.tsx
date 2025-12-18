/**
 * Video Embed Player Page
 * Server Component - fetches video data and renders player
 */

import { db, videos } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { encryptVideoToken } from '@/lib/security';
import { BASE_URL, THUMBNAIL_BASE_URL, JWPLAYER_CDN } from '@/lib/config';
import { notFound } from 'next/navigation';
import EmbedPlayer from './EmbedPlayer';

interface Props {
    params: Promise<{ id: string }>;
}

export default async function EmbedPage({ params }: Props) {
    const { id } = await params;

    // Get video from database
    const video = db.select().from(videos).where(eq(videos.id, id)).get();

    if (!video || video.status !== 'completed') {
        notFound();
    }

    // Generate secure stream token
    const streamToken = encryptVideoToken(id);
    const playlistUrl = `${BASE_URL}/api/stream/playlist?token=${encodeURIComponent(streamToken)}`;
    const thumbnailUrl = video.thumbnailPath ? `${THUMBNAIL_BASE_URL}/${id}.jpg` : '';

    return (
        <EmbedPlayer
            videoId={id}
            title={video.originalFilename}
            playlistUrl={playlistUrl}
            thumbnailUrl={thumbnailUrl}
            introStart={video.introStart}
            introEnd={video.introEnd}
            outroStart={video.outroStart}
            outroEnd={video.outroEnd}
            jwplayerCdn={JWPLAYER_CDN}
        />
    );
}
