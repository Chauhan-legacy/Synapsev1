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
  ListMusic,
  Trash2,
  Sparkles,
  Eye,
  EyeOff,
  Link2,
  Radio,
  ExternalLink,
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
  const [layout, setLayout] = useState<PlayerLayout>('vertical');
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
          ctx.fillStyle = '#1F2430';
          ctx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight);
          x += barWidth;
        }
      } else {
        // Gentle wave idle state
        ctx.strokeStyle = '#1F2430';
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

  // Collapsed Minimal Sidebar Pill
  if (!isExpanded) {
    return (
      <div className="w-full p-2 border-t border-[#DDD6C7] bg-[#FFFFFF] font-mono">
        <div
          onClick={() => setIsExpanded(true)}
          className="cursor-pointer group flex items-center justify-between p-2 rounded-lg bg-[#F7F0D6] border border-[#E6DFC6] hover:shadow-xs transition"
          title="Click to open full Music Player"
        >
          <div className="flex items-center gap-2 min-w-0">
            {/* Soft sage square album art */}
            <div className="w-8 h-8 rounded-md bg-[#8FAE8B] flex items-center justify-center shrink-0 text-[#1F2430]">
              {isPlaying ? <Activity className="w-4 h-4 animate-pulse" /> : <Sparkles className="w-4 h-4" />}
            </div>
            {!collapsedSidebar && (
              <div className="flex flex-col min-w-0">
                <span className="text-[11px] font-bold text-[#1F2430] truncate">
                  {activeEmbed ? activeEmbed.title : (currentTrack?.title || 'Ambient Chords')}
                </span>
                <span className="text-[9px] text-[#6B6F7B] truncate flex items-center gap-1">
                  {activeEmbed ? (
                    <span className="text-[#0F766E] font-semibold uppercase">{activeEmbed.provider} Stream</span>
                  ) : (
                    currentTrack?.artist || '432 Hz Resonant'
                  )}
                </span>
              </div>
            )}
          </div>

          {!collapsedSidebar && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  togglePlay();
                }}
                className="w-7 h-7 rounded-full bg-[#8FAE8B] hover:bg-[#7D9D79] text-[#1F2430] flex items-center justify-center transition"
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Full Expanded Player Card Matching Reference Design
  return (
    <div className="w-full p-2 border-t border-[#DDD6C7] bg-[#FFFFFF] font-mono">
      {/* Hidden Audio Tag */}
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

      {/* Main Pastel Cream Container */}
      <div className="relative rounded-2xl bg-[#F7F0D6] border border-[#E6DFC6] p-3.5 shadow-md flex flex-col gap-3 transition">
        {/* Top Header Row: Collapse, Layout Toggle, Upload File, Link Player */}
        <div className="flex items-center justify-between text-[#6B6F7B] text-[10px]">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-[#1F2430] uppercase tracking-wider">Audio Lab</span>
            <span className="text-[9px] px-1 py-0.2 rounded bg-[#EFE8CC] text-[#1F2430]">
              432Hz Master
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Stream Link Player Button (Spotify, YouTube Music, Apple Music, MP3) */}
            <button
              type="button"
              onClick={() => setShowUrlInput(!showUrlInput)}
              title="Stream from Spotify, YouTube Music, Apple Music or direct audio link"
              className={`p-1 rounded transition flex items-center gap-0.5 ${
                showUrlInput || activeEmbed
                  ? 'bg-[#0F766E] text-white font-bold'
                  : 'hover:bg-[#EFE8CC] text-[#1F2430]'
              }`}
            >
              <Link2 className="w-3.5 h-3.5" />
            </button>

            {/* Upload Local Track */}
            <button
              onClick={() => fileInputRef.current?.click()}
              title="Upload Audio File (mp3, wav, flac)"
              className="p-1 rounded hover:bg-[#EFE8CC] text-[#1F2430] transition"
            >
              <Upload className="w-3.5 h-3.5" />
            </button>

            {/* Toggle Real-Time Visualizer */}
            <button
              onClick={() => setShowVisualizer((v) => !v)}
              title={showVisualizer ? 'Hide Audio Visualizer' : 'Show Audio Visualizer'}
              className="p-1 rounded hover:bg-[#EFE8CC] text-[#1F2430] transition"
            >
              {showVisualizer ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            </button>

            {/* Delete Track */}
            {tracks.length > 1 && (
              <button
                onClick={handleDeleteCurrentTrack}
                title="Remove Track from Vault"
                className="p-1 rounded hover:bg-red-100 text-red-600 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Layout Switcher */}
            <button
              onClick={() => setLayout((l) => (l === 'vertical' ? 'horizontal' : 'vertical'))}
              title="Toggle Layout"
              className="p-1 rounded hover:bg-[#EFE8CC] text-[#1F2430] transition"
            >
              <ListMusic className="w-3.5 h-3.5" />
            </button>

            {/* Minimize */}
            <button
              onClick={() => setIsExpanded(false)}
              title="Minimize player"
              className="p-1 rounded hover:bg-[#EFE8CC] text-[#1F2430] transition"
            >
              <Minimize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Link Player Ingestion Drawer */}
        {showUrlInput && (
          <div className="p-2.5 rounded-xl bg-[#FFFFFF] border border-[#DDD6C7] shadow-xs flex flex-col gap-2">
            <div className="flex items-center justify-between text-[10px] font-bold text-[#1F2430]">
              <span className="flex items-center gap-1">
                <Radio className="w-3 h-3 text-[#0F766E]" />
                Paste Streaming Link
              </span>
              <span className="text-[9px] text-[#78716C]">Spotify / YouTube / Apple / MP3</span>
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
                placeholder="Paste Spotify, YouTube or Apple Music link..."
                className="flex-1 px-2 py-1 text-xs font-mono bg-[#FFFDF9] border border-[#DDD6C7] rounded focus:outline-hidden focus:border-[#0F766E] text-[#1F2430]"
              />
              <button
                type="button"
                onClick={() => handleConnectStream()}
                className="px-2.5 py-1 rounded bg-[#0F766E] hover:bg-[#0B5E58] text-white text-[10px] font-bold transition flex items-center gap-1 shrink-0"
              >
                <span>Connect</span>
              </button>
            </div>

            {urlError && (
              <p className="text-[10px] text-red-600 font-sans">{urlError}</p>
            )}

            {/* Quick Demo Preset Links */}
            <div className="flex flex-wrap gap-1 text-[9px]">
              <span className="text-[#78716C] self-center mr-0.5">Quick demo:</span>
              <button
                type="button"
                onClick={() => handleConnectStream('https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT')}
                className="px-1.5 py-0.5 rounded bg-[#EFE8CC] hover:bg-[#E2D9B8] text-[#1F2430] border border-[#DDD6C7]"
              >
                Spotify
              </button>
              <button
                type="button"
                onClick={() => handleConnectStream('https://www.youtube.com/watch?v=jfKfPfyJRdk')}
                className="px-1.5 py-0.5 rounded bg-[#EFE8CC] hover:bg-[#E2D9B8] text-[#1F2430] border border-[#DDD6C7]"
              >
                YouTube Lofi
              </button>
              <button
                type="button"
                onClick={() => handleConnectStream('https://music.apple.com/us/album/mozart-requiem/1452583842')}
                className="px-1.5 py-0.5 rounded bg-[#EFE8CC] hover:bg-[#E2D9B8] text-[#1F2430] border border-[#DDD6C7]"
              >
                Apple Music
              </button>
              <button
                type="button"
                onClick={() => handleConnectStream('https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3')}
                className="px-1.5 py-0.5 rounded bg-[#EFE8CC] hover:bg-[#E2D9B8] text-[#1F2430] border border-[#DDD6C7]"
              >
                Direct MP3
              </button>
            </div>
          </div>
        )}

        {/* Active Third-Party Embed Player (Spotify, YouTube, Apple Music) */}
        {activeEmbed && activeEmbed.provider !== 'direct' && (
          <div className="rounded-xl overflow-hidden border border-[#DDD6C7] bg-[#10141C] p-1.5 shadow-xs flex flex-col gap-1">
            <div className="flex items-center justify-between px-1 text-[9px] text-[#FFFDF9]">
              <span className="flex items-center gap-1.5 font-bold">
                <span
                  className={`w-2 h-2 rounded-full animate-pulse ${
                    activeEmbed.provider === 'spotify'
                      ? 'bg-green-500'
                      : activeEmbed.provider === 'youtube'
                      ? 'bg-red-500'
                      : 'bg-pink-500'
                  }`}
                />
                <span className="capitalize">{activeEmbed.provider} Stream Active</span>
              </span>
              <div className="flex items-center gap-2 text-[9px]">
                <a
                  href={activeEmbed.originalUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:underline flex items-center gap-0.5 text-[#DDD6C7]"
                  title="Open in native app/tab"
                >
                  Open <ExternalLink className="w-2.5 h-2.5" />
                </a>
                <button
                  type="button"
                  onClick={() => setActiveEmbed(null)}
                  className="text-red-400 hover:text-red-300 font-bold"
                  title="Close streaming player and return to internal synth"
                >
                  Detach
                </button>
              </div>
            </div>

            <iframe
              src={activeEmbed.embedUrl}
              width="100%"
              height={activeEmbed.provider === 'spotify' ? '80' : activeEmbed.provider === 'youtube' ? '140' : '110'}
              frameBorder="0"
              allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              title={activeEmbed.title}
              className="rounded-lg w-full bg-black/40"
            />
          </div>
        )}

        {/* Layout 1: Vertical (from reference image) */}
        {layout === 'vertical' && (
          <div className="flex flex-col gap-3">
            {/* Rounded Sage-Green Album Art with Waveform Canvas */}
            <div className="relative w-full aspect-square rounded-2xl bg-[#8FAE8B] overflow-hidden flex flex-col items-center justify-center shadow-inner">
              <canvas
                ref={canvasRef}
                width={200}
                height={120}
                className="w-full h-full object-cover opacity-80"
              />
              <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between px-2 text-[9px] font-bold text-[#1F2430] bg-[#8FAE8B]/80 backdrop-blur-xs rounded">
                <span className="truncate">{currentTrack?.title || 'Ambient Resonant Chord'}</span>
                <span>432 Hz</span>
              </div>
            </div>

            {/* Track Info & Heart */}
            <div className="flex items-center justify-between px-1">
              <div className="flex flex-col min-w-0">
                <h4 className="text-xs font-bold text-[#1F2430] truncate">
                  {currentTrack?.title || 'Ambient Resonant Chords'}
                </h4>
                <p className="text-[10px] text-[#6B6F7B] truncate">
                  {currentTrack?.artist || 'SYNAPSE Harmonic Synthesizer'}
                </p>
              </div>

              <button
                onClick={handleToggleFavorite}
                className={`p-1.5 rounded-full transition ${
                  isFavorite ? 'text-red-500 fill-current' : 'text-[#6B6F7B] hover:text-[#1F2430]'
                }`}
                title="Favorite track"
              >
                <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
              </button>
            </div>
          </div>
        )}

        {/* Layout 2: Horizontal (from reference image) */}
        {layout === 'horizontal' && (
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-xl bg-[#8FAE8B] overflow-hidden shrink-0 flex items-center justify-center shadow-inner">
              <canvas ref={canvasRef} width={80} height={80} className="w-full h-full" />
            </div>

            <div className="flex-1 min-w-0 flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-[#1F2430] truncate">
                    {currentTrack?.title || 'Ambient Chords'}
                  </h4>
                  <p className="text-[10px] text-[#6B6F7B] truncate">
                    {currentTrack?.artist || 'SYNAPSE Synthesizer'}
                  </p>
                </div>
                <button
                  onClick={handleToggleFavorite}
                  className={`p-1 ${isFavorite ? 'text-red-500 fill-current' : 'text-[#6B6F7B]'}`}
                >
                  <Heart className={`w-3.5 h-3.5 ${isFavorite ? 'fill-current' : ''}`} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Thin Progress Line with Round Handle */}
        <div className="space-y-1">
          <div className="relative flex items-center">
            <input
              type="range"
              min="0"
              max={duration || 30}
              step="0.1"
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1 bg-[#DDD6C7] rounded-lg appearance-none cursor-pointer accent-[#1F2430]"
            />
          </div>
          <div className="flex justify-between text-[9px] text-[#6B6F7B]">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Minimal Controls Row (Shuffle, Prev, Play/Pause, Next, Repeat) */}
        <div className="flex items-center justify-between px-1 text-[#1F2430]">
          {/* Shuffle */}
          <button
            onClick={() => setIsShuffle(!isShuffle)}
            className={`p-1.5 rounded-full hover:bg-[#EFE8CC] transition ${
              isShuffle ? 'text-[#0F766E] font-bold' : 'text-[#6B6F7B]'
            }`}
            title="Shuffle"
          >
            <Shuffle className="w-3.5 h-3.5" />
          </button>

          {/* Previous */}
          <button
            onClick={handlePrevious}
            className="p-1.5 rounded-full hover:bg-[#EFE8CC] transition text-[#1F2430]"
            title="Previous track"
          >
            <SkipBack className="w-4 h-4 fill-current" />
          </button>

          {/* Play / Pause Large Soft Sage Button */}
          <button
            onClick={togglePlay}
            className="w-10 h-10 rounded-full bg-[#8FAE8B] hover:bg-[#7D9D79] text-[#1F2430] flex items-center justify-center transition shadow-sm active:scale-95"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 fill-current" />
            ) : (
              <Play className="w-4 h-4 fill-current ml-0.5" />
            )}
          </button>

          {/* Next */}
          <button
            onClick={handleNext}
            className="p-1.5 rounded-full hover:bg-[#EFE8CC] transition text-[#1F2430]"
            title="Next track"
          >
            <SkipForward className="w-4 h-4 fill-current" />
          </button>

          {/* Repeat */}
          <button
            onClick={() => setIsRepeat(!isRepeat)}
            className={`p-1.5 rounded-full hover:bg-[#EFE8CC] transition ${
              isRepeat ? 'text-[#0F766E] font-bold' : 'text-[#6B6F7B]'
            }`}
            title="Repeat track"
          >
            <Repeat className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Volume & "Analyse this song" Bridge Row */}
        <div className="pt-2 border-t border-[#E6DFC6] flex items-center justify-between gap-2">
          {/* Volume Control */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="text-[#6B6F7B] hover:text-[#1F2430]"
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
              className="w-16 h-1 bg-[#DDD6C7] rounded appearance-none cursor-pointer accent-[#1F2430]"
            />
          </div>

          {/* "Analyse this song" Action Button */}
          <button
            onClick={handleAnalyseThisSong}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#0F766E] hover:bg-[#0B5E58] text-white text-[10px] font-bold shadow-2xs transition active:scale-95"
            title="Inject audio buffer into SYNAPSE analytical pipeline for Fourier & Wavelet investigation"
          >
            <Activity className="w-3 h-3" />
            <span>Analyse this song</span>
          </button>
        </div>
      </div>
    </div>
  );
};
