
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useIsMobile } from './use-mobile';

export function useScreen() {
  const [isFullScreen, setIsFullScreen] = useState(false);
  const isMobile = useIsMobile();

  const handleFullScreenChange = useCallback(() => {
    setIsFullScreen(!!document.fullscreenElement);
  }, []);

  useEffect(() => {
    document.addEventListener('fullscreenchange', handleFullScreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullScreenChange);
    };
  }, [handleFullScreenChange]);

  const toggleFullScreen = async () => {
    if (!document.fullscreenElement) {
      try {
        await document.documentElement.requestFullscreen();
        setIsFullScreen(true);
      } catch (err) {
        console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
      }
    } else {
      if (document.exitFullscreen) {
        try {
          await document.exitFullscreen();
          setIsFullScreen(false);
        } catch (err) {
            console.error(`Error attempting to exit full-screen mode: ${err.message} (${err.name})`);
        }
      }
    }
  };

  return { isFullScreen, toggleFullScreen, isMobile };
}
