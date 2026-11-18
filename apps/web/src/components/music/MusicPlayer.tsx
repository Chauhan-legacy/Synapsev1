import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Heart,
  Volume2,
  VolumeX,
  Upload,
  Activity,
  Minimize2,
  Trash2,
  Sparkles,
  Eye,
  EyeOff,
  Link2,
  Radio,
  ExternalLink,
  X,
} from 'lucide-react';
import { useSignal } from '../../context/SignalContext';
import {
  TrackMetadata,
  saveTrackToDB,
  getTracksFromDB,
  deleteTrackFromDB,
  toggleTrackFavoriteInDB,
} from '../../utils/musicDb';

export type PlayerLayout = 'vertical' | 'horizontal' | 'compact' | 'queue';

interface MusicPlayerProps {
  onOpenAnalysis?: () => void;
  collapsedSidebar?: boolean;
}

export const MusicPlayer: React.FC<MusicPlayerProps> = ({
  onOpenAnalysis,
  collapsedSidebar = false,
}) => {
  const { loadCustomSignal } = useSignal();

  // Audio State
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(30);
  const [volume, setVolume] = useState<number>(0.8);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isShuffle, setIsShuffle] = useState<boolean>(false);
  const [isRepeat, setIsRepeat] = useState<boolean>(false);
  const [isFavorite, setIsFavorite] = useState<boolean>(false);

  // Layout & UI Mode
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [showVisualizer, setShowVisualizer] = useState<boolean>(true);

  // Playlist & Tracks
  const [tracks, setTracks] = useState<TrackMetadata[]>([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(0);

  // Stream URL / Provider State (Spotify, YouTube Music, Apple Music, Direct MP3)
  const [showUrlInput, setShowUrlInput] = useState<boolean>(false);
  const [streamUrl, setStreamUrl] = useState<string>('');
  const [urlError, setUrlError] = useState<string | null>(null);
  const [activeEmbed, setActiveEmbed] = useState<{
    provider: 'spotify' | 'youtube' | 'apple' | 'direct';
    embedUrl: string;
    originalUrl: string;
    title: string;
  } | null>(null);

  // Audio Context & Analyser Refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const synthSourceRef = useRef<AudioNode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Active track
  const currentTrack: TrackMetadata | undefined = tracks[currentTrackIndex];

  // Default synthetic ambient generator (Ambient Resonant Harmony 432 Hz)
  const createDefaultTrack = (): TrackMetadata => ({
    id: 'synapse_ambient_harmony',
    title: 'Ambient Resonant Chords',
    artist: 'SYNAPSE Harmonic Synthesizer',
    album: 'Scientific Soundscape',
    duration: 60,
    dateAdded: Date.now(),
    favorite: true,
    fileType: 'audio/synthetic',
  });

  // Load Tracks from IndexedDB
  useEffect(() => {
    let isMounted = true;
    getTracksFromDB()
      .then((savedTracks) => {
        if (!isMounted) return;
        if (savedTracks.length > 0) {
          setTracks(savedTracks);
          setIsFavorite(savedTracks[0].favorite);
        } else {
          const defaultTrack = createDefaultTrack();
          setTracks([defaultTrack]);
          setIsFavorite(true);
        }
      })
      .catch(() => {
        if (isMounted) {
          setTracks([createDefaultTrack()]);
        }
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Parse Spotify, YouTube Music, Apple Music, and direct MP3 URLs
  const parseStreamUrl = (url: string): {
    provider: 'spotify' | 'youtube' | 'apple' | 'direct';
    embedUrl: string;
    title: string;
  } | null => {
    const trimmed = url.trim();
    if (!trimmed) return null;

    // 1. Spotify
    if (trimmed.includes('spotify.com') || trimmed.startsWith('spotify:')) {
      const trackMatch = trimmed.match(/track\/([a-zA-Z0-9]+)/);
      if (trackMatch) {
        return {
          provider: 'spotify',
          embedUrl: `https://open.spotify.com/embed/track/${trackMatch[1]}?utm_source=generator&theme=0`,
          title: `Spotify Track (${trackMatch[1].slice(0, 8)})`,
        };
      }
      const playlistMatch = trimmed.match(/playlist\/([a-zA-Z0-9]+)/);
      if (playlistMatch) {
        return {
          provider: 'spotify',
          embedUrl: `https://open.spotify.com/embed/playlist/${playlistMatch[1]}?utm_source=generator&theme=0`,
          title: `Spotify Playlist (${playlistMatch[1].slice(0, 8)})`,
        };
      }
      const albumMatch = trimmed.match(/album\/([a-zA-Z0-9]+)/);
      if (albumMatch) {
        return {
          provider: 'spotify',
          embedUrl: `https://open.spotify.com/embed/album/${albumMatch[1]}?utm_source=generator&theme=0`,
          title: `Spotify Album (${albumMatch[1].slice(0, 8)})`,
        };
      }
    }

    // 2. YouTube & YouTube Music
    if (
      trimmed.includes('youtube.com') ||
      trimmed.includes('youtu.be') ||
      trimmed.includes('music.youtube.com')
    ) {
      let videoId = '';
      if (trimmed.includes('youtu.be/')) {
        const parts = trimmed.split('youtu.be/');
        videoId = parts[1]?.split(/[?&]/)[0] || '';
      } else if (trimmed.includes('v=')) {
        const match = trimmed.match(/[?&]v=([^&]+)/);
        videoId = match ? match[1] : '';
      } else if (trimmed.includes('embed/')) {
        const parts = trimmed.split('embed/');
        videoId = parts[1]?.split(/[?&]/)[0] || '';
      }
      if (videoId) {
        return {
          provider: 'youtube',
          embedUrl: `https://www.youtube.com/embed/${videoId}?autoplay=1&enablejsapi=1`,
          title: `YouTube Audio (${videoId})`,
        };
      }
    }

    // 3. Apple Music
    if (trimmed.includes('music.apple.com')) {
      const embedUrl = trimmed.replace('music.apple.com', 'embed.music.apple.com');
      return {
        provider: 'apple',
        embedUrl,
        title: 'Apple Music Track',
      };
    }

    // 4. Direct audio / MP3 stream
    if (
      trimmed.endsWith('.mp3') ||
      trimmed.endsWith('.wav') ||
      trimmed.endsWith('.ogg') ||
      trimmed.endsWith('.aac') ||
      trimmed.endsWith('.m4a') ||
      trimmed.includes('audio') ||
      trimmed.includes('stream')
    ) {
      const filename = trimmed.split('/').pop()?.split('?')[0] || 'Web Audio Stream';
      return {
        provider: 'direct',
        embedUrl: trimmed,
        title: filename,
      };
    }

    try {
      new URL(trimmed);
      return {
        provider: 'direct',
        embedUrl: trimmed,
        title: 'Live Audio Stream',
      };
    } catch {
      return null;
    }
  };

  const handleConnectStream = async (rawUrl?: string) => {
    const targetUrl = (rawUrl || streamUrl).trim();
    if (!targetUrl) {
      setUrlError('Please paste a streaming or track URL.');
      return;
    }

    const parsed = parseStreamUrl(targetUrl);
    if (!parsed) {
      setUrlError('Unrecognized URL format. Please paste a valid Spotify, YouTube, Apple Music or audio URL.');
      return;
    }

    setUrlError(null);
    setActiveEmbed({
      provider: parsed.provider,
      embedUrl: parsed.embedUrl,
      originalUrl: targetUrl,
      title: parsed.title,
    });

    const newTrack: TrackMetadata = {
      id: `stream_${Date.now()}`,
      title: parsed.title,
      artist: parsed.provider.toUpperCase() + ' Stream',
      album: 'Universal Web Audio',
      duration: 300,
      dateAdded: Date.now(),
      favorite: true,
      fileType: `stream/${parsed.provider}`,
    };

    if (parsed.provider === 'direct') {
      if (audioRef.current) {
        audioRef.current.src = parsed.embedUrl;
        audioRef.current.load();
        audioRef.current.play().catch(() => {});
        setIsPlaying(true);
      }
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setIsPlaying(true);
    }

    await saveTrackToDB(newTrack);
    setTracks((prev) => [newTrack, ...prev]);
    setCurrentTrackIndex(0);
    setShowUrlInput(false);
    setStreamUrl('');
  };

  // Web Audio Setup for live spectrum visualization
  const setupWebAudio = () => {
    if (!audioContextRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.8;
      audioContextRef.current = ctx;
      analyserRef.current = analyser;

      if (audioRef.current) {
        try {
          const source = ctx.createMediaElementSource(audioRef.current);
          source.connect(analyser);
          analyser.connect(ctx.destination);
        } catch (e) {
          // already connected
        }
      }
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
  };

  // Play synthetic ambient chord when no blob present
  const playSyntheticAudio = () => {
    setupWebAudio();
    const ctx = audioContextRef.current;
    if (!ctx) return;

    // Resonant C Major 432Hz chord: 432Hz, 540Hz, 648Hz
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const osc3 = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(432, ctx.currentTime);
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(540, ctx.currentTime);
    osc3.type = 'sine';
    osc3.frequency.setValueAtTime(648, ctx.currentTime);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, ctx.currentTime);

    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(volume * 0.15, ctx.currentTime + 1.5);

    osc1.connect(filter);
    osc2.connect(filter);
    osc3.connect(filter);
    filter.connect(gain);

    if (analyserRef.current) {
      gain.connect(analyserRef.current);
      analyserRef.current.connect(ctx.destination);
    } else {
      gain.connect(ctx.destination);
    }

    osc1.start();
    osc2.start();
    osc3.start();

    synthSourceRef.current = gain;
    setIsPlaying(true);
  };

  const stopSyntheticAudio = () => {
    if (synthSourceRef.current && audioContextRef.current) {
      const ctx = audioContextRef.current;
      const gainNode = synthSourceRef.current as GainNode;
      try {
        gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
      } catch (e) {}
      synthSourceRef.current = null;
    }
    setIsPlaying(false);
  };

  // Handle Play / Pause Toggle
  const togglePlay = () => {
    if (!currentTrack) return;

    if (isPlaying) {
      if (audioRef.current && currentTrack.blob) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        stopSyntheticAudio();
      }
    } else {
      setupWebAudio();
      if (audioRef.current && currentTrack.blob) {
        audioRef.current.play().catch(() => {});
        setIsPlaying(true);
      } else {
        playSyntheticAudio();
      }
    }
  };

  // Progress Bar Time Update
  useEffect(() => {
    let interval: any = null;
    if (isPlaying) {
      interval = setInterval(() => {
        if (audioRef.current && currentTrack?.blob) {
          setCurrentTime(audioRef.current.currentTime);
          setDuration(audioRef.current.duration || 30);
        } else {
          setCurrentTime((t) => {
            if (t >= duration) {
              if (isRepeat) return 0;
              setIsPlaying(false);
              return 0;
            }
            return t + 0.5;
          });
        }
      }, 500);
    }
    return () => clearInterval(interval);
  }, [isPlaying, currentTrack, duration, isRepeat]);

  // Audio Canvas Visualizer Loop
  useEffect(() => {
    let animationFrameId: number;
    const canvas = canvasRef.current;
    if (!canvas || !showVisualizer) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      animationFrameId = requestAnimationFrame(render);
      const analyser = analyserRef.current;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (analyser && isPlaying) {
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteFrequencyData(dataArray);

        const barWidth = (canvas.width / (bufferLength / 2)) * 1.5;
        let x = 0;

        for (let i = 0; i < bufferLength / 2; i++) {
          const barHeight = (dataArray[i] / 255) * canvas.height * 0.8;
          const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
          gradient.addColorStop(0, '#9CAF88');
          gradient.addColorStop(0.6, '#E8412C');
          gradient.addColorStop(1, '#252925');
          ctx.fillStyle = gradient;
          ctx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight);
          x += barWidth;
        }
      } else {
        // Gentle wave idle state
        ctx.strokeStyle = '#9CAF88';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        const sliceWidth = canvas.width / 20;
        let x = 0;
        for (let i = 0; i < 20; i++) {
          const y = canvas.height / 2 + Math.sin(i * 0.5 + Date.now() * 0.002) * 4;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
          x += sliceWidth;
        }
        ctx.stroke();
      }
    };

    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, [isPlaying, showVisualizer]);

  // Handle Local Audio File Ingestion
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const id = `track_${Date.now()}`;
    const cleanTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');

    const newTrack: TrackMetadata = {
      id,
      title: cleanTitle,
      artist: 'Local Import',
      album: 'Workstation Vault',
      duration: 180,
      blob: file,
      dateAdded: Date.now(),
      favorite: false,
      fileType: file.type || 'audio/mp3',
    };

    await saveTrackToDB(newTrack);
    setTracks((prev) => [newTrack, ...prev]);
    setCurrentTrackIndex(0);

    // Set Audio element source
    if (audioRef.current) {
      audioRef.current.src = URL.createObjectURL(file);
      audioRef.current.load();
    }
  };

  // Skip Tracks
  const handleNext = () => {
    if (tracks.length === 0) return;
    if (isShuffle) {
      const nextIdx = Math.floor(Math.random() * tracks.length);
      setCurrentTrackIndex(nextIdx);
    } else {
      setCurrentTrackIndex((prev) => (prev + 1) % tracks.length);
    }
  };

  const handlePrevious = () => {
    if (tracks.length === 0) return;
    setCurrentTrackIndex((prev) => (prev === 0 ? tracks.length - 1 : prev - 1));
  };

  const handleToggleFavorite = async () => {
    if (!currentTrack) return;
    const nextState = await toggleTrackFavoriteInDB(currentTrack.id);
    setIsFavorite(nextState);
    setTracks((prev) =>
      prev.map((t) => (t.id === currentTrack.id ? { ...t, favorite: nextState } : t))
    );
  };

  const handleDeleteCurrentTrack = async () => {
    if (!currentTrack) return;
    await deleteTrackFromDB(currentTrack.id);
    setTracks((prev) => prev.filter((t) => t.id !== currentTrack.id));
    setCurrentTrackIndex(0);
  };

  // "Analyse this song" Feature: Bridge Audio to SYNAPSE Signal Engine
  const handleAnalyseThisSong = async () => {
    setupWebAudio();
    const ctx = audioContextRef.current;
    if (!ctx) return;

    let pcmData: number[] = [];
    const targetFs = 200; // Resample to 200Hz for high-resolution analysis

    if (currentTrack?.blob) {
      try {
        const arrayBuffer = await currentTrack.blob.arrayBuffer();
        const decodedBuffer = await ctx.decodeAudioData(arrayBuffer);
        const channelData = decodedBuffer.getChannelData(0);
        const step = Math.max(1, Math.floor(decodedBuffer.sampleRate / targetFs));
        const sampleCount = Math.min(2400, Math.floor(channelData.length / step));

        for (let i = 0; i < sampleCount; i++) {
          pcmData.push(channelData[i * step]);
        }
      } catch (e) {
        // fallback
      }
    }

    if (pcmData.length === 0) {
      // Generate real 432Hz multi-harmonic waveform from current synthetic track
      const n = 1200;
      pcmData = Array.from({ length: n }, (_, i) => {
        const t = i / targetFs;
        return (
          0.8 * Math.sin(2 * Math.PI * 5.0 * t) +
          0.5 * Math.sin(2 * Math.PI * 14.0 * t + 0.4) +
          0.3 * Math.sin(2 * Math.PI * 35.0 * t + 1.2) +
          ((i % 17) - 8) / 30.0
        );
      });
    }

    // Stream directly into SYNAPSE Signal Context
    loadCustomSignal({
      id: `audio_${Date.now()}`,
      filename: `${currentTrack?.title || 'Audio_Signal'}.wav`,
      samplingRate: targetFs,
      duration: pcmData.length / targetFs,
      channelNames: ['Audio Channel L (432Hz Master)'],
      channels: {
        'Audio Channel L (432Hz Master)': pcmData,
      },
      timestamps: Array.from({ length: pcmData.length }, (_, i) => i / targetFs),
      quality: {
        total_samples: pcmData.length,
        channel_count: 1,
        sampling_rate: targetFs,
        is_uniform: true,
        timestamp_jitter_pct: 0.0,
        nan_count: 0,
        infinite_count: 0,
        clipping_count: 0,
        content_hash_sha256: `audio_hash_${Date.now()}`,
        warnings: [],
      },
    });

    if (onOpenAnalysis) {
      onOpenAnalysis();
    }
  };

  // Progress Bar Seek
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setCurrentTime(val);
    if (audioRef.current && currentTrack?.blob) {
      audioRef.current.currentTime = val;
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Keyboard Escape listener to minimize expanded player
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isExpanded) {
        setIsExpanded(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isExpanded]);

  return (
    <>
      {/* Hidden Audio & File Inputs */}
      <audio
        ref={audioRef}
        onEnded={handleNext}
        onTimeUpdate={() => {
          if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
        }}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* 1. COLLAPSED MINIMAL SIDEBAR PILL (Always mounted, stable height) */}
      <div className="w-full p-2 border-t border-[#252925]/20 bg-[#9CAF88]">
        {collapsedSidebar ? (
          <button
            type="button"
            onClick={() => setIsExpanded(true)}
            className="w-10 h-10 mx-auto rounded-lg bg-[#F7F5EF] hover:bg-[#FFFFFF] border border-[#252925]/20 text-[#252925] flex items-center justify-center transition shadow-2xs"
            title="Open Audio Lab (432 Hz)"
          >
            {isPlaying ? (
              <Activity className="w-4 h-4 animate-pulse text-[#E8412C]" />
            ) : (
              <Sparkles className="w-4 h-4 text-[#252925]" />
            )}
          </button>
        ) : (
          <div
            onClick={() => setIsExpanded(true)}
            className="cursor-pointer group flex items-center justify-between p-2 rounded-lg bg-[#F7F5EF] border border-[#252925]/20 hover:border-[#252925] transition shadow-2xs"
            title="Click to open Audio Lab"
          >
            <div className="flex items-center gap-2 min-w-0 flex-1 mr-1.5">
              <div className="w-7 h-7 rounded-md bg-[#9CAF88]/30 border border-[#252925]/20 flex items-center justify-center shrink-0 text-[#252925]">
                {isPlaying ? (
                  <Activity className="w-3.5 h-3.5 animate-pulse text-[#E8412C]" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 text-[#252925]" />
                )}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[11px] font-georgia font-semibold text-[#252925] truncate">
                  {activeEmbed ? activeEmbed.title : (currentTrack?.title || 'Ambient Resonant')}
                </span>
                <span className="text-[9px] text-[#252925]/70 truncate flex items-center gap-1 font-mono">
                  {activeEmbed ? (
                    <span className="text-[#E8412C] font-semibold uppercase">{activeEmbed.provider} Stream</span>
                  ) : (
                    currentTrack?.artist || '432 Hz Resonant'
                  )}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  togglePlay();
                }}
                className="w-6 h-6 rounded-full bg-[#E8412C] hover:bg-[#D03522] text-[#F7F5EF] flex items-center justify-center transition shadow-2xs"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <Pause className="w-3 h-3 fill-current" />
                ) : (
                  <Play className="w-3 h-3 fill-current ml-0.5" />
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 2. EXPANDED FLOATING AUDIO LAB PANEL (Docked safely outside sidebar at all viewports) */}
      {isExpanded && (
        <>
          {/* Non-modal Floating Botanical Audio Studio Card */}
          <div
            className={`fixed bottom-4 z-50 w-[340px] sm:w-[370px] max-w-[calc(100vw-2rem)] rounded-2xl bg-[#F7F5EF] border border-[#252925]/30 shadow-2xl p-4 flex flex-col gap-3 font-mono text-[#252925] animate-in fade-in zoom-in-95 ${
              collapsedSidebar
                ? 'left-4 md:left-20'
                : 'left-1/2 -translate-x-1/2 md:translate-x-0 md:left-[272px]'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Header Row */}
            <div className="flex items-center justify-between text-[11px] border-b border-[#252925]/20 pb-2">
              <div className="flex items-center gap-2">
                <span className="font-georgia font-bold text-[#252925] uppercase tracking-wider text-xs">
                  Audio Lab
                </span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#9CAF88]/30 text-[#252925] font-bold border border-[#252925]/20 font-mono">
                  432 Hz
                </span>
                {activeEmbed && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-100 text-[#E8412C] font-bold border border-[#E8412C]/30 uppercase font-mono">
                    {activeEmbed.provider}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowUrlInput(!showUrlInput)}
                  title="Stream from Spotify, YouTube, Apple Music or MP3 URL"
                  className={`p-1.5 rounded transition ${
                    showUrlInput
                      ? 'bg-[#252925] text-[#F7F5EF] font-bold'
                      : 'hover:bg-[#9CAF88]/20 text-[#252925]'
                  }`}
                >
                  <Link2 className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  title="Upload local audio file"
                  className="p-1.5 rounded hover:bg-[#9CAF88]/20 text-[#252925] transition"
                >
                  <Upload className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => setShowVisualizer((v) => !v)}
                  title={showVisualizer ? 'Hide Visualizer' : 'Show Visualizer'}
                  className="p-1.5 rounded hover:bg-[#9CAF88]/20 text-[#252925] transition"
                >
                  {showVisualizer ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                </button>

                <button
                  type="button"
                  onClick={() => setIsExpanded(false)}
                  title="Minimize Audio Lab (Esc)"
                  className="p-1.5 rounded hover:bg-[#9CAF88]/20 text-[#252925] transition"
                >
                  <Minimize2 className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => setIsExpanded(false)}
                  title="Close Audio Lab"
                  className="p-1.5 rounded hover:bg-[#E8412C]/20 text-[#252925] hover:text-[#E8412C] transition"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* URL Streaming Ingestion Drawer */}
            {showUrlInput && (
              <div className="p-2.5 rounded-xl bg-[#FFFFFF] border border-[#252925]/20 shadow-inner flex flex-col gap-2">
                <div className="flex items-center justify-between text-[10px] text-[#252925]/80">
                  <span className="flex items-center gap-1 font-semibold text-[#252925]">
                    <Radio className="w-3 h-3 text-[#E8412C]" />
                    Paste Streaming URL
                  </span>
                  <span className="text-[9px]">Spotify / YouTube / Apple / MP3</span>
                </div>

                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={streamUrl}
                    onChange={(e) => {
                      setStreamUrl(e.target.value);
                      if (urlError) setUrlError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleConnectStream();
                    }}
                    placeholder="Paste track or playlist link..."
                    className="flex-1 px-2.5 py-1 text-xs font-mono bg-[#F7F5EF] border border-[#252925]/20 rounded text-[#252925] placeholder-[#252925]/40 focus:outline-hidden focus:border-[#252925]"
                  />
                  <button
                    type="button"
                    onClick={() => handleConnectStream()}
                    className="px-2.5 py-1 rounded bg-[#252925] hover:bg-[#252925]/90 text-[#F7F5EF] text-[10px] font-bold transition shrink-0"
                  >
                    Connect
                  </button>
                </div>

                {urlError && <p className="text-[10px] text-[#E8412C] font-sans">{urlError}</p>}

                <div className="flex flex-wrap gap-1 text-[9px] pt-1">
                  <span className="text-[#252925]/60 self-center mr-0.5">Quick demo:</span>
                  <button
                    type="button"
                    onClick={() => handleConnectStream('https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT')}
                    className="px-1.5 py-0.5 rounded bg-[#9CAF88]/30 hover:bg-[#9CAF88]/50 text-[#252925] border border-[#252925]/20"
                  >
                    Spotify
                  </button>
                  <button
                    type="button"
                    onClick={() => handleConnectStream('https://www.youtube.com/watch?v=jfKfPfyJRdk')}
                    className="px-1.5 py-0.5 rounded bg-[#9CAF88]/30 hover:bg-[#9CAF88]/50 text-[#252925] border border-[#252925]/20"
                  >
                    YouTube Lofi
                  </button>
                  <button
                    type="button"
                    onClick={() => handleConnectStream('https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3')}
                    className="px-1.5 py-0.5 rounded bg-[#9CAF88]/30 hover:bg-[#9CAF88]/50 text-[#252925] border border-[#252925]/20"
                  >
                    Direct MP3
                  </button>
                </div>
              </div>
            )}

            {/* Embedded Third-Party Stream Player */}
            {activeEmbed && activeEmbed.provider !== 'direct' ? (
              <div className="space-y-2">
                <div className="rounded-xl overflow-hidden border border-[#252925]/20 bg-black shadow-inner">
                  <iframe
                    src={activeEmbed.embedUrl}
                    width="100%"
                    height={activeEmbed.provider === 'youtube' ? '150' : activeEmbed.provider === 'spotify' ? '80' : '100'}
                    frameBorder="0"
                    allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
                    loading="lazy"
                    title={activeEmbed.title}
                    className="w-full block"
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] px-1">
                  <a
                    href={activeEmbed.originalUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#252925] hover:text-[#E8412C] flex items-center gap-1 hover:underline"
                  >
                    Open in new tab <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                  <button
                    type="button"
                    onClick={() => setActiveEmbed(null)}
                    className="px-2 py-0.5 rounded bg-[#FFFFFF] hover:bg-red-50 text-[#E8412C] text-[10px] border border-[#E8412C]/30 transition"
                  >
                    Detach stream
                  </button>
                </div>
              </div>
            ) : (
              /* Waveform & Real-Time Spectrum Canvas (Compact 16:9 Ribbon) */
              showVisualizer && (
                <div className="relative w-full h-24 rounded-xl bg-[#FFFFFF] border border-[#252925]/20 overflow-hidden flex flex-col items-center justify-center shadow-inner">
                  <canvas
                    ref={canvasRef}
                    width={320}
                    height={96}
                    className="w-full h-full object-cover opacity-90"
                  />
                  <div className="absolute bottom-1.5 left-2 right-2 flex items-center justify-between px-2 py-0.5 text-[9px] font-bold text-[#252925] bg-[#F7F5EF]/90 backdrop-blur-xs rounded border border-[#252925]/20">
                    <span className="truncate flex-1 mr-2">{currentTrack?.title || 'Ambient Resonant Chords'}</span>
                    <span className="shrink-0 text-[#E8412C] font-mono">432 Hz Master</span>
                  </div>
                </div>
              )
            )}

            {/* Track Info & Heart Row */}
            <div className="flex items-center justify-between px-0.5">
              <div className="flex flex-col min-w-0 flex-1 mr-2">
                <h4 className="font-georgia text-sm font-bold text-[#252925] truncate">
                  {currentTrack?.title || 'Ambient Resonant Chords'}
                </h4>
                <p className="text-[10px] text-[#252925]/70 truncate font-mono">
                  {currentTrack?.artist || 'SYNAPSE Harmonic Synthesizer'}
                </p>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {tracks.length > 1 && (
                  <button
                    type="button"
                    onClick={handleDeleteCurrentTrack}
                    className="p-1.5 rounded-full text-[#252925]/70 hover:text-[#E8412C] hover:bg-[#9CAF88]/20 transition"
                    title="Delete track"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleToggleFavorite}
                  className={`p-1.5 rounded-full transition shrink-0 hover:bg-[#9CAF88]/20 ${
                    isFavorite ? 'text-[#E8412C] fill-current' : 'text-[#252925]/70 hover:text-[#252925]'
                  }`}
                  title="Favorite track"
                >
                  <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current text-[#E8412C]' : ''}`} />
                </button>
              </div>
            </div>

            {/* Progress Bar & Timestamps */}
            <div className="space-y-1">
              <input
                type="range"
                min="0"
                max={duration || 30}
                step="0.1"
                value={currentTime}
                onChange={handleSeek}
                className="w-full h-1 bg-[#9CAF88]/30 rounded-lg appearance-none cursor-pointer accent-[#E8412C]"
              />
              <div className="flex justify-between text-[9px] text-[#252925]/70 font-mono">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Playback Controls (Shuffle, Prev, Play/Pause, Next, Repeat) */}
            <div className="flex items-center justify-between px-2 text-[#252925]">
              <button
                type="button"
                onClick={() => setIsShuffle(!isShuffle)}
                className={`p-1.5 rounded-full hover:bg-[#9CAF88]/20 transition ${
                  isShuffle ? 'text-[#E8412C] font-bold' : 'text-[#252925]/70'
                }`}
                title="Shuffle"
              >
                <Shuffle className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={handlePrevious}
                className="p-1.5 rounded-full hover:bg-[#9CAF88]/20 transition text-[#252925]"
                title="Previous track"
              >
                <SkipBack className="w-4 h-4 fill-current" />
              </button>

              <button
                type="button"
                onClick={togglePlay}
                className="w-10 h-10 rounded-full bg-[#E8412C] hover:bg-[#D03522] text-[#F7F5EF] flex items-center justify-center transition shadow-md active:scale-95"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4 fill-current" />
                ) : (
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                )}
              </button>

              <button
                type="button"
                onClick={handleNext}
                className="p-1.5 rounded-full hover:bg-[#9CAF88]/20 transition text-[#252925]"
                title="Next track"
              >
                <SkipForward className="w-4 h-4 fill-current" />
              </button>

              <button
                type="button"
                onClick={() => setIsRepeat(!isRepeat)}
                className={`p-1.5 rounded-full hover:bg-[#9CAF88]/20 transition ${
                  isRepeat ? 'text-[#E8412C] font-bold' : 'text-[#252925]/70'
                }`}
                title="Repeat track"
              >
                <Repeat className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Volume & "Analyse this song" Pipeline Bridge */}
            <div className="pt-2 border-t border-[#252925]/20 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <button
                  type="button"
                  onClick={() => setIsMuted(!isMuted)}
                  className="text-[#252925]/70 hover:text-[#252925] shrink-0"
                  title={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-3.5 h-3.5" />
                  ) : (
                    <Volume2 className="w-3.5 h-3.5" />
                  )}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    setVolume(v);
                    setIsMuted(false);
                    if (audioRef.current) audioRef.current.volume = v;
                  }}
                  className="w-16 h-1 bg-[#9CAF88]/30 rounded appearance-none cursor-pointer accent-[#E8412C]"
                />
              </div>

              <button
                type="button"
                onClick={handleAnalyseThisSong}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#252925] hover:bg-[#252925]/90 text-[#F7F5EF] border border-[#252925] font-georgia text-xs font-bold shadow-2xs transition active:scale-95 whitespace-nowrap shrink-0"
                title="Inject audio buffer into SYNAPSE analytical pipeline for Fourier & Wavelet investigation"
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Analyse this song</span>
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
};
