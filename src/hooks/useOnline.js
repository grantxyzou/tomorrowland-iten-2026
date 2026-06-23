import { useState, useEffect } from 'react';

// Tracks the browser's online/offline state. `navigator.onLine` is a coarse
// signal (it only knows about the network interface, not whether requests
// actually succeed), so the picks outbox still retries on its own — this is
// just for showing status and nudging an immediate flush when we come back.
export function useOnline() {
  const [online, setOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine
  );

  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);

  return online;
}
