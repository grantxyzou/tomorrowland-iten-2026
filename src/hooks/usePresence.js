import { useState, useEffect } from 'react';

// Keep a node mounted through its exit transition.
//
//   const present = usePresence(open);
//   return present && <El data-open={open} className="fx-pop" />;
//
// Enter: the element mounts with data-open="true"; @starting-style (or the
// closed-state selector) provides the "from" frame. Exit: `open` flips to
// false, the closed-state styles apply, and we hold the mount for `exitMs`
// so the transition can play before unmount.
export function usePresence(open, exitMs = 160) {
  const [mounted, setMounted] = useState(open);

  useEffect(() => {
    if (open) {
      setMounted(true);
      return;
    }
    const t = setTimeout(() => setMounted(false), exitMs);
    return () => clearTimeout(t);
  }, [open, exitMs]);

  return mounted;
}
