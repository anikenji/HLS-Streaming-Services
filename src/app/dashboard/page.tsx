'use client';

/**
 * Dashboard Page
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import styles from './dashboard.module.css';

interface Video {
    id: string;
    original_filename: string;
    status: string;
    file_size_formatted: string;
    duration_formatted: string;
    thumbnail_url: string | null;
    embed_url: string | null;
    created_at: string;
}

interface Movie {
    id: number;
    title: string;
    description: string;
    status: string;
    total_episodes: number;
    poster_url: string | null;
}

interface User {
    id: number;
    username: string;
    email: string;
    role: string;
}

export default function DashboardPage() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [videos, setVideos] = useState<Video[]>([]);
    const [movies, setMovies] = useState<Movie[]>([]);
    const [currentPage, setCurrentPage] = useState('videos');
    const [loading, setLoading] = useState(true);

    // Upload state
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    // Modal state
    const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
    const [showCreateMovie, setShowCreateMovie] = useState(false);

    // Check auth
    useEffect(() => {
        fetch('/api/auth/check')
            .then(res => res.json())
            .then(data => {
                if (data.success && data.authenticated) {
                    setUser(data.user);
                } else {
                    router.push('/');
                }
            })
            .catch(() => router.push('/'))
            .finally(() => setLoading(false));
    }, [router]);

    // Load videos
    const loadVideos = useCallback(async () => {
        try {
            const res = await fetch('/api/videos');
            const data = await res.json();
            if (data.success) {
                setVideos(data.videos);
            }
        } catch (error) {
            console.error('Failed to load videos:', error);
        }
    }, []);

    // Load movies
    const loadMovies = useCallback(async () => {
        try {
            const res = await fetch('/api/movies');
            const data = await res.json();
            if (data.success) {
                setMovies(data.movies);
            }
        } catch (error) {
            console.error('Failed to load movies:', error);
        }
    }, []);

    useEffect(() => {
        if (user) {
            loadVideos();
            loadMovies();
        }
    }, [user, loadVideos, loadMovies]);

    // Logout
    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/');
    };

    // File upload
    const handleFileUpload = async (file: File) => {
        const allowedExtensions = ['mp4', 'mkv', 'avi', 'mov', 'webm', 'flv'];
        const ext = file.name.split('.').pop()?.toLowerCase();

        if (!ext || !allowedExtensions.includes(ext)) {
            alert('Invalid file type');
            return;
        }

        setUploading(true);
        setUploadProgress(0);

        try {
            const chunkSize = 5 * 1024 * 1024; // 5MB
            const totalChunks = Math.ceil(file.size / chunkSize);
            const videoId = crypto.randomUUID();

            for (let i = 0; i < totalChunks; i++) {
                const start = i * chunkSize;
                const end = Math.min(start + chunkSize, file.size);
                const chunk = file.slice(start, end);

                const formData = new FormData();
                formData.append('chunk', chunk);
                formData.append('video_id', videoId);
                formData.append('chunk_index', i.toString());
                formData.append('total_chunks', totalChunks.toString());
                formData.append('original_filename', file.name);

                const res = await fetch('/api/videos', {
                    method: 'POST',
                    body: formData,
                });

                const data = await res.json();
                if (!data.success) {
                    throw new Error(data.error);
                }

                setUploadProgress(((i + 1) / totalChunks) * 100);

                if (data.upload_complete) {
                    alert('Upload successful! Video is being processed.');
                    loadVideos();
                    setCurrentPage('videos');
                }
            }
        } catch (error) {
            alert('Upload failed: ' + (error as Error).message);
        } finally {
            setUploading(false);
            setUploadProgress(0);
        }
    };

    // Delete video
    const handleDeleteVideo = async (videoId: string) => {
        if (!confirm('Are you sure you want to delete this video?')) return;

        try {
            const res = await fetch(`/api/videos/${videoId}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
                loadVideos();
                setSelectedVideo(null);
            } else {
                alert(data.error);
            }
        } catch (error) {
            alert('Delete failed');
        }
    };

    // Create movie
    const handleCreateMovie = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);

        try {
            const res = await fetch('/api/movies', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: formData.get('title'),
                    description: formData.get('description'),
                }),
            });
            const data = await res.json();
            if (data.success) {
                loadMovies();
                setShowCreateMovie(false);
            } else {
                alert(data.error);
            }
        } catch (error) {
            alert('Failed to create movie');
        }
    };

    if (loading) {
        return (
            <div className={styles.loadingScreen}>
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <div className={styles.dashboard}>
            {/* Sidebar */}
            <aside className={styles.sidebar}>
                <div className={styles.logo}>
                    <h1>🎬 HLS Stream</h1>
                </div>

                <nav className={styles.nav}>
                    <a
                        href="#"
                        className={`${styles.navItem} ${currentPage === 'videos' ? styles.active : ''}`}
                        onClick={(e) => { e.preventDefault(); setCurrentPage('videos'); }}
                    >
                        📁 My Videos
                    </a>
                    <a
                        href="#"
                        className={`${styles.navItem} ${currentPage === 'movies' ? styles.active : ''}`}
                        onClick={(e) => { e.preventDefault(); setCurrentPage('movies'); }}
                    >
                        🎬 Movies/Series
                    </a>
                    <a
                        href="#"
                        className={`${styles.navItem} ${currentPage === 'upload' ? styles.active : ''}`}
                        onClick={(e) => { e.preventDefault(); setCurrentPage('upload'); }}
                    >
                        ⬆️ Upload
                    </a>
                </nav>

                <div className={styles.userInfo}>
                    <div className={styles.userName}>{user?.username}</div>
                    <div className={styles.userRole}>{user?.role}</div>
                    <button className={styles.logoutBtn} onClick={handleLogout}>
                        Logout
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className={styles.main}>
                <header className={styles.header}>
                    <h2>
                        {currentPage === 'videos' && 'My Videos'}
                        {currentPage === 'movies' && 'Movies/Series'}
                        {currentPage === 'upload' && 'Upload Video'}
                    </h2>
                    <div className={styles.headerActions}>
                        {currentPage === 'videos' && (
                            <button className="btn btn-primary" onClick={() => setCurrentPage('upload')}>
                                ⬆️ Upload Video
                            </button>
                        )}
                        {currentPage === 'movies' && (
                            <button className="btn btn-primary" onClick={() => setShowCreateMovie(true)}>
                                ➕ New Movie
                            </button>
                        )}
                    </div>
                </header>

                {/* Videos Page */}
                {currentPage === 'videos' && (
                    <div className={styles.content}>
                        {videos.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-state-icon">📁</div>
                                <h3>No videos yet</h3>
                                <p>Upload your first video to get started</p>
                                <button className="btn btn-primary" onClick={() => setCurrentPage('upload')}>
                                    Upload Video
                                </button>
                            </div>
                        ) : (
                            <div className="video-grid">
                                {videos.map(video => (
                                    <div
                                        key={video.id}
                                        className="video-card"
                                        onClick={() => setSelectedVideo(video)}
                                    >
                                        <div className="video-card-thumbnail">
                                            {video.thumbnail_url ? (
                                                <img src={video.thumbnail_url} alt={video.original_filename} />
                                            ) : (
                                                <div className={styles.noThumbnail}>🎬</div>
                                            )}
                                            <span className={`video-card-status status-${video.status}`}>
                                                {video.status}
                                            </span>
                                        </div>
                                        <div className="video-card-body">
                                            <div className="video-card-title">{video.original_filename}</div>
                                            <div className="video-card-meta">
                                                <span>{video.file_size_formatted}</span>
                                                <span>{video.duration_formatted}</span>
                                            </div>
                                            {video.status === 'processing' && (
                                                <div className="progress-bar">
                                                    <div className="progress-bar-fill" style={{ width: '50%' }}></div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Movies Page */}
                {currentPage === 'movies' && (
                    <div className={styles.content}>
                        {movies.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-state-icon">🎬</div>
                                <h3>No movies yet</h3>
                                <p>Create a movie or series to organize your videos</p>
                                <button className="btn btn-primary" onClick={() => setShowCreateMovie(true)}>
                                    Create Movie
                                </button>
                            </div>
                        ) : (
                            <div className="video-grid">
                                {movies.map(movie => (
                                    <div key={movie.id} className="video-card">
                                        <div className="video-card-thumbnail">
                                            {movie.poster_url ? (
                                                <img src={movie.poster_url} alt={movie.title} />
                                            ) : (
                                                <div className={styles.noThumbnail}>🎬</div>
                                            )}
                                            <span className={`video-card-status status-${movie.status === 'completed' ? 'completed' : 'processing'}`}>
                                                {movie.status}
                                            </span>
                                        </div>
                                        <div className="video-card-body">
                                            <div className="video-card-title">{movie.title}</div>
                                            <div className="video-card-meta">
                                                <span>{movie.total_episodes} episodes</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Upload Page */}
                {currentPage === 'upload' && (
                    <div className={styles.content}>
                        {!uploading ? (
                            <div
                                className="upload-zone"
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    if (e.dataTransfer.files[0]) {
                                        handleFileUpload(e.dataTransfer.files[0]);
                                    }
                                }}
                                onClick={() => document.getElementById('file-input')?.click()}
                            >
                                <div className="upload-zone-icon">📁</div>
                                <h3>Drag & Drop video file here</h3>
                                <p>or click to browse (max 5GB)</p>
                                <p>Supported: MP4, MKV, AVI, MOV, WebM, FLV</p>
                                <input
                                    type="file"
                                    id="file-input"
                                    accept=".mp4,.mkv,.avi,.mov,.webm,.flv"
                                    style={{ display: 'none' }}
                                    onChange={(e) => {
                                        if (e.target.files?.[0]) {
                                            handleFileUpload(e.target.files[0]);
                                        }
                                    }}
                                />
                            </div>
                        ) : (
                            <div className={styles.uploadProgress}>
                                <div className="spinner"></div>
                                <h3>Uploading...</h3>
                                <div className="progress-bar" style={{ width: '300px', height: '8px' }}>
                                    <div
                                        className="progress-bar-fill"
                                        style={{ width: `${uploadProgress}%` }}
                                    ></div>
                                </div>
                                <p>{Math.round(uploadProgress)}%</p>
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* Video Detail Modal */}
            {selectedVideo && (
                <div className="modal-overlay active" onClick={() => setSelectedVideo(null)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{selectedVideo.original_filename}</h2>
                            <button className="modal-close" onClick={() => setSelectedVideo(null)}>
                                ×
                            </button>
                        </div>

                        <div className={styles.videoDetail}>
                            <p><strong>Status:</strong> {selectedVideo.status}</p>
                            <p><strong>Size:</strong> {selectedVideo.file_size_formatted}</p>
                            <p><strong>Duration:</strong> {selectedVideo.duration_formatted}</p>

                            {selectedVideo.status === 'completed' && selectedVideo.embed_url && (
                                <div className={styles.videoActions}>
                                    <a
                                        href={selectedVideo.embed_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn btn-primary"
                                    >
                                        ▶️ Play Video
                                    </a>
                                    <button
                                        className="btn btn-secondary"
                                        onClick={() => {
                                            navigator.clipboard.writeText(selectedVideo.embed_url!);
                                            alert('Link copied!');
                                        }}
                                    >
                                        📋 Copy Link
                                    </button>
                                </div>
                            )}

                            <button
                                className="btn btn-danger"
                                onClick={() => handleDeleteVideo(selectedVideo.id)}
                            >
                                🗑️ Delete Video
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Movie Modal */}
            {showCreateMovie && (
                <div className="modal-overlay active" onClick={() => setShowCreateMovie(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Create New Movie/Series</h2>
                            <button className="modal-close" onClick={() => setShowCreateMovie(false)}>
                                ×
                            </button>
                        </div>

                        <form onSubmit={handleCreateMovie}>
                            <div className="form-group">
                                <label>Title</label>
                                <input type="text" name="title" required />
                            </div>
                            <div className="form-group">
                                <label>Description</label>
                                <textarea name="description" rows={3}></textarea>
                            </div>
                            <button type="submit" className="btn btn-primary btn-block">
                                Create Movie
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
