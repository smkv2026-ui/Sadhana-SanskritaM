import { useEffect, useState } from 'react';

/** Current time, re-rendering every `intervalMs` (paused when the tab is hidden). */
export function useNow(intervalMs = 1000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    let id = window.setInterval(() => setNow(new Date()), intervalMs);
    const onVis = () => {
      clearInterval(id);
      if (document.visibilityState === 'visible') {
        setNow(new Date());
        id = window.setInterval(() => setNow(new Date()), intervalMs);
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [intervalMs]);
  return now;
}

export function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(() => {
    try {
      return window.matchMedia('(pointer: coarse)').matches || /Android|iPhone|iPad/i.test(navigator.userAgent);
    } catch {
      return false;
    }
  });
  useEffect(() => {
    try {
      const mq = window.matchMedia('(pointer: coarse)');
      const on = () => setMobile(mq.matches);
      mq.addEventListener?.('change', on);
      return () => mq.removeEventListener?.('change', on);
    } catch {
      return undefined;
    }
  }, []);
  return mobile;
}
