import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../lib/api.js';

const GroupContext = createContext(null);
const LS_KEY = 'tml2026_active_group';

function luminance(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

export function GroupProvider({ children }) {
  const [groups,  setGroups]  = useState([]);   // [{id, name, role, displayName, color}]
  const [members, setMembers] = useState([]);   // [{userId, displayName, color, role}]
  const [loading, setLoading] = useState(true);
  const [activeGroupId, _setActive] = useState(() => {
    try { return localStorage.getItem(LS_KEY) || null; } catch { return null; }
  });
  // Incremented by requestJoinFlow(); GroupGate watches this to enter join mode.
  const [joinTrigger, setJoinTrigger] = useState(0);

  const refetchGroups = useCallback(async () => {
    try {
      const res = await apiFetch('/api/groups');
      if (!res.ok) return;
      const data = await res.json();
      setGroups(data.groups || []);
    } catch {}
  }, []);

  useEffect(() => {
    refetchGroups().finally(() => setLoading(false));
  }, [refetchGroups]);

  // Fetch member roster whenever the active group changes.
  useEffect(() => {
    if (!activeGroupId) return;
    apiFetch(`/api/groups?g=${activeGroupId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.members) setMembers(data.members); })
      .catch(() => {});
  }, [activeGroupId]);

  // If the stored gid is gone from the list (user left the group), fall back.
  useEffect(() => {
    if (loading || groups.length === 0) return;
    if (!activeGroupId || !groups.find(g => g.id === activeGroupId)) {
      _setActive(groups[0].id);
    }
  }, [groups, loading, activeGroupId]);

  function setActiveGroupId(gid) {
    try { localStorage.setItem(LS_KEY, gid); } catch {}
    _setActive(gid);
    setMembers([]); // clear stale roster; re-fetched by the effect above
  }

  const memberMap = Object.fromEntries(members.map(m => [m.displayName, m]));

  function colorFor(displayName) {
    return memberMap[displayName]?.color ?? '#888888';
  }

  function inkFor(displayName) {
    return luminance(colorFor(displayName)) > 0.5 ? '#11131c' : '#fff5f4';
  }

  return (
    <GroupContext.Provider value={{
      groups, members, activeGroupId, setActiveGroupId,
      colorFor, inkFor, refetchGroups, loading,
      joinTrigger, requestJoinFlow: () => setJoinTrigger(n => n + 1),
    }}>
      {children}
    </GroupContext.Provider>
  );
}

export function useGroup() {
  return useContext(GroupContext);
}
