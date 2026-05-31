import { useState, useEffect } from 'react';

export function useLocalTime(timezone) {
  const [time, setTime] = useState(() => getTime(timezone));

  useEffect(() => {
    setTime(getTime(timezone));
    const id = setInterval(() => setTime(getTime(timezone)), 60_000);
    return () => clearInterval(id);
  }, [timezone]);

  return time;
}

function getTime(timezone) {
  if (!timezone) return null;
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZoneName: 'short',
    }).format(new Date());
  } catch {
    return null;
  }
}
