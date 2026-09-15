/**
 * Background Audio Keep-Alive Service
 *
 * Prevents mobile OS (Android Chrome / iOS Safari) from suspending JavaScript execution
 * and navigator.geolocation.watchPosition when the phone screen is turned off or locked.
 * Employs a microscopic looping silent audio track coupled with the Web MediaSession API.
 */

const SILENT_WAV_BASE64 =
  'data:audio/wav;base64,UklGRjIAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YRAAAAAAAAAAAAAAAAAAAAAAAAAA';

let audioElement = null;

export const startBackgroundAudio = () => {
  try {
    if (!audioElement) {
      audioElement = new Audio(SILENT_WAV_BASE64);
      audioElement.loop = true;
      audioElement.volume = 0.01; // Tiny volume keeps the hardware audio pipe active
    }

    if ('mediaSession' in navigator && window.MediaMetadata) {
      navigator.mediaSession.metadata = new window.MediaMetadata({
        title: 'OnTrack — Live Run Tracking',
        artist: 'Active GPS Session',
        album: 'OnTrack Athletics',
      });
      navigator.mediaSession.playbackState = 'playing';
    }

    const playPromise = audioElement.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        console.warn('Background audio keep-alive autoplay notice:', err.message);
      });
    }
  } catch (err) {
    console.warn('Failed to initialize background audio:', err);
  }
};

export const stopBackgroundAudio = () => {
  try {
    if (audioElement) {
      audioElement.pause();
      audioElement.currentTime = 0;
    }
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'paused';
    }
  } catch (err) {
    console.warn('Failed to stop background audio:', err);
  }
};
