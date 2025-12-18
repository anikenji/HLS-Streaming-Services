'use client';

/**
 * Embed Player Client Component
 * JWPlayer integration with Netflix-style controls
 */

import { useEffect, useState, useRef } from 'react';
import Script from 'next/script';
import styles from './embed.module.css';

interface Props {
    videoId: string;
    title: string;
    playlistUrl: string;
    thumbnailUrl: string;
    introStart?: number | null;
    introEnd?: number | null;
    outroStart?: number | null;
    outroEnd?: number | null;
    jwplayerCdn: string;
}

declare global {
    interface Window {
        jwplayer: (id: string) => JWPlayer;
    }
}

interface JWPlayer {
    setup: (config: Record<string, unknown>) => JWPlayer;
    on: (event: string, callback: (data?: unknown) => void) => JWPlayer;
    getPosition: () => number;
    getDuration: () => number;
    seek: (position: number) => void;
    play: () => void;
}

export default function EmbedPlayer({
    videoId,
    title,
    playlistUrl,
    thumbnailUrl,
    introStart,
    introEnd,
    outroStart,
    outroEnd,
    jwplayerCdn,
}: Props) {
    const [jwReady, setJwReady] = useState(false);
    const [showResume, setShowResume] = useState(false);
    const [savedPosition, setSavedPosition] = useState(0);
    const [showSkipIntro, setShowSkipIntro] = useState(false);
    const [showSkipOutro, setShowSkipOutro] = useState(false);
    const playerRef = useRef<JWPlayer | null>(null);

    // Cookie helpers
    const getCookie = (name: string): string | null => {
        const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
        return match ? match[2] : null;
    };

    const setCookie = (name: string, value: string, days = 30) => {
        const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
        document.cookie = `${name}=${value}; expires=${expires}; path=/`;
    };

    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins} phút ${secs} giây`;
    };

    // Initialize player when JWPlayer script loads
    useEffect(() => {
        if (!jwReady || !window.jwplayer) return;

        const player = window.jwplayer('player').setup({
            file: playlistUrl,
            image: thumbnailUrl,
            width: '100%',
            height: '100%',
            controls: true,
            autostart: false,
            preload: 'metadata',
            playbackRateControls: [0.5, 0.75, 1, 1.25, 1.5, 2],
        });

        playerRef.current = player;

        // Check for saved position
        const saved = getCookie(`watch_progress_${videoId}`);
        if (saved && parseFloat(saved) > 10) {
            setSavedPosition(parseFloat(saved));
            setShowResume(true);
        }

        // Save progress periodically
        player.on('time', () => {
            const pos = player.getPosition();
            if (pos > 0) {
                setCookie(`watch_progress_${videoId}`, pos.toString());
            }

            // Check for intro/outro skip buttons
            if (introStart != null && introEnd != null) {
                if (pos >= (introStart ?? 0) && pos < (introEnd ?? 0)) {
                    setShowSkipIntro(true);
                } else {
                    setShowSkipIntro(false);
                }
            }

            if (outroStart != null && outroEnd != null) {
                if (pos >= (outroStart ?? 0) && pos < (outroEnd ?? 0)) {
                    setShowSkipOutro(true);
                } else {
                    setShowSkipOutro(false);
                }
            }
        });

        // Clear progress on complete
        player.on('complete', () => {
            document.cookie = `watch_progress_${videoId}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        });

    }, [jwReady, playlistUrl, thumbnailUrl, videoId, introStart, introEnd, outroStart, outroEnd]);

    const handleResume = () => {
        setShowResume(false);
        if (playerRef.current) {
            playerRef.current.seek(savedPosition);
            playerRef.current.play();
        }
    };

    const handleRestart = () => {
        setShowResume(false);
        if (playerRef.current) {
            playerRef.current.seek(0);
            playerRef.current.play();
        }
    };

    const handleSkipIntro = () => {
        if (playerRef.current && introEnd != null) {
            playerRef.current.seek(introEnd as number);
        }
        setShowSkipIntro(false);
    };

    const handleSkipOutro = () => {
        if (playerRef.current && outroEnd != null) {
            playerRef.current.seek(outroEnd as number);
        }
        setShowSkipOutro(false);
    };

    return (
        <>
            <Script
                src={jwplayerCdn}
                onLoad={() => setJwReady(true)}
            />

            <div className={styles.embedContainer}>
                <div id="player" className={styles.player}></div>

                {/* Resume Modal */}
                {showResume && (
                    <div className={styles.resumeModal}>
                        <div className={styles.resumeContent}>
                            <h3>THÔNG BÁO!</h3>
                            <p>Bạn đã dừng lại ở</p>
                            <span className={styles.resumeTime}>{formatTime(savedPosition)}</span>
                            <div className={styles.resumeButtons}>
                                <button className={styles.resumeBtn} onClick={handleResume}>
                                    Tiếp tục xem
                                </button>
                                <button className={styles.restartBtn} onClick={handleRestart}>
                                    Xem từ đầu
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Skip Intro Button */}
                {showSkipIntro && (
                    <button className={styles.skipButton} onClick={handleSkipIntro}>
                        Bỏ qua Intro →
                    </button>
                )}

                {/* Skip Outro Button */}
                {showSkipOutro && (
                    <button className={styles.skipButton} onClick={handleSkipOutro}>
                        Bỏ qua Outro →
                    </button>
                )}
            </div>
        </>
    );
}
