import { Project, Session, CompetitorPosition, CompetitorStatistics, GroupStatistics, ProjectConfig } from './types';
import { DEFAULT_PROJECT_CONFIG, generateId, slugify } from './constants';
import { db, isFirebaseConfigured } from './firebase';
import { ref, set, get, child, push, onValue, remove, update } from 'firebase/database';
import { safeJsonParse } from './validation';

export { slugify };

// ===== LOCAL STORAGE HELPERS =====

const getLocalProjects = (): Project[] => {
  try {
    const stored = localStorage.getItem('compscape_projects');
    return stored ? safeJsonParse<Project[]>(stored, []) : [];
  } catch (e) {
    console.error('Error reading local projects:', e);
    return [];
  }
};

const setLocalProjects = (projects: Project[]): void => {
  try {
    localStorage.setItem('compscape_projects', JSON.stringify(projects));
  } catch (e) {
    console.error('Error saving local projects:', e);
  }
};

const getLocalSessions = (): Session[] => {
  try {
    const stored = localStorage.getItem('compscape_sessions');
    return stored ? safeJsonParse<Session[]>(stored, []) : [];
  } catch (e) {
    console.error('Error reading local sessions:', e);
    return [];
  }
};

const setLocalSessions = (sessions: Session[]): void => {
  try {
    localStorage.setItem('compscape_sessions', JSON.stringify(sessions));
  } catch (e) {
    console.error('Error saving local sessions:', e);
  }
};

// ===== PROJECT MANAGEMENT =====

export const createProject = async (
  name: string,
  description: string = '',
  customConfig?: ProjectConfig,
  icon: string = '📊'
): Promise<string> => {
  const now = Date.now();
  const newProject: Project = {
    id: '',
    name,
    description,
    icon,
    createdAt: now,
    config: customConfig ? JSON.parse(JSON.stringify(customConfig)) : JSON.parse(JSON.stringify(DEFAULT_PROJECT_CONFIG))
  };

  if (isFirebaseConfigured()) {
    const projRef = push(ref(db, 'compscape_projects'));
    newProject.id = projRef.key as string;
    await set(projRef, newProject);
    return newProject.id;
  } else {
    const projects = getLocalProjects();
    newProject.id = generateId('proj');
    projects.push(newProject);
    setLocalProjects(projects);
    return newProject.id;
  }
};

export const getProjectById = async (id: string): Promise<Project | undefined> => {
  if (isFirebaseConfigured()) {
    try {
      const snapshot = await get(child(ref(db), `compscape_projects/${id}`));
      return snapshot.exists() ? snapshot.val() : undefined;
    } catch (e) {
      console.error('Error fetching project:', e);
      throw e;
    }
  } else {
    return getLocalProjects().find(p => p.id === id);
  }
};

export const getAllProjects = async (): Promise<Project[]> => {
  if (isFirebaseConfigured()) {
    try {
      const snapshot = await get(ref(db, 'compscape_projects'));
      return snapshot.exists() ? Object.values(snapshot.val()) : [];
    } catch (e) {
      console.error('Error fetching all projects:', e);
      return [];
    }
  } else {
    return getLocalProjects();
  }
};

export const updateProjectConfig = async (projectId: string, config: ProjectConfig): Promise<void> => {
  if (isFirebaseConfigured()) {
    await set(ref(db, `compscape_projects/${projectId}/config`), config);
  } else {
    const projects = getLocalProjects();
    const idx = projects.findIndex(p => p.id === projectId);
    if (idx !== -1) {
      projects[idx].config = config;
      setLocalProjects(projects);
    }
  }
};

export const updateProjectMetadata = async (projectId: string, updates: Partial<Project>): Promise<void> => {
  const validUpdates: Partial<Project> = {};
  if (updates.name !== undefined) validUpdates.name = updates.name;
  if (updates.description !== undefined) validUpdates.description = updates.description;
  if (updates.icon !== undefined) validUpdates.icon = updates.icon;

  if (isFirebaseConfigured()) {
    await update(ref(db, `compscape_projects/${projectId}`), validUpdates);
  } else {
    const projects = getLocalProjects();
    const idx = projects.findIndex(p => p.id === projectId);
    if (idx !== -1) {
      projects[idx] = { ...projects[idx], ...validUpdates };
      setLocalProjects(projects);
    }
  }
};

export const deleteProject = async (projectId: string): Promise<void> => {
  await clearProjectSessions(projectId);

  if (isFirebaseConfigured()) {
    await remove(ref(db, `compscape_projects/${projectId}`));
  } else {
    const projects = getLocalProjects().filter(p => p.id !== projectId);
    setLocalProjects(projects);
  }
};

export const subscribeToProjects = (
  callback: (projects: Project[]) => void,
  onError?: (error: Error) => void
) => {
  if (isFirebaseConfigured()) {
    const refDb = ref(db, 'compscape_projects');
    return onValue(refDb, (snap) => {
      const data = snap.val();
      callback(data ? Object.values(data) : []);
    }, (error) => {
      console.error('Error subscribing to projects:', error);
      if (onError) onError(error);
    });
  } else {
    callback(getLocalProjects());
    return () => {};
  }
};

// ===== SESSION MANAGEMENT =====

export const createSession = async (
  projectId: string,
  participantName: string = '',
  groupId: string = '',
  groupLabel: string = ''
): Promise<string> => {
  const now = Date.now();
  const newSession: Session = {
    sessionId: '',
    projectId,
    participantName: participantName.substring(0, 100),
    groupId: groupId.substring(0, 50),
    groupLabel: groupLabel.substring(0, 50),
    status: 'created',
    createdAt: now,
    positions: []
  };

  if (isFirebaseConfigured()) {
    const sessionRef = push(ref(db, 'compscape_sessions'));
    newSession.sessionId = sessionRef.key as string;
    await set(sessionRef, newSession);
    return newSession.sessionId;
  } else {
    const sessions = getLocalSessions();
    newSession.sessionId = generateId('sess');
    sessions.push(newSession);
    setLocalSessions(sessions);
    return newSession.sessionId;
  }
};

export const claimSession = async (sessionId: string, uid: string): Promise<void> => {
  if (isFirebaseConfigured()) {
    const sessionRef = ref(db, `compscape_sessions/${sessionId}`);
    await update(sessionRef, { participantUid: uid });
  }
};

export const getSessionById = async (id: string): Promise<Session | undefined> => {
  if (isFirebaseConfigured()) {
    const snapshot = await get(child(ref(db), `compscape_sessions/${id}`));
    return snapshot.exists() ? snapshot.val() : undefined;
  } else {
    return getLocalSessions().find(s => s.sessionId === id);
  }
};

export const updateSessionPositions = async (
  sessionId: string,
  positions: CompetitorPosition[],
  status: 'in_progress' | 'completed' = 'completed'
): Promise<void> => {
  const now = Date.now();
  const updates: Partial<Session> = { positions, status };

  if (status === 'completed') updates.completedAt = now;
  else if (status === 'in_progress') updates.startedAt = now;

  if (isFirebaseConfigured()) {
    await update(ref(db, `compscape_sessions/${sessionId}`), updates);
  } else {
    const sessions = getLocalSessions();
    const idx = sessions.findIndex(s => s.sessionId === sessionId);
    if (idx !== -1) {
      sessions[idx] = { ...sessions[idx], ...updates };
      setLocalSessions(sessions);
    }
  }
};

export const deleteSession = async (sessionId: string): Promise<void> => {
  if (isFirebaseConfigured()) {
    await remove(ref(db, `compscape_sessions/${sessionId}`));
  } else {
    const sessions = getLocalSessions().filter(s => s.sessionId !== sessionId);
    setLocalSessions(sessions);
  }
};

export const clearProjectSessions = async (projectId: string): Promise<void> => {
  if (isFirebaseConfigured()) {
    const snapshot = await get(ref(db, 'compscape_sessions'));
    if (snapshot.exists()) {
      const all = snapshot.val() as Record<string, Session>;
      const deletes: Promise<void>[] = [];
      Object.entries(all).forEach(([key, s]) => {
        if (s.projectId === projectId) {
          deletes.push(remove(ref(db, `compscape_sessions/${key}`)));
        }
      });
      await Promise.all(deletes);
    }
  } else {
    const sessions = getLocalSessions().filter(s => s.projectId !== projectId);
    setLocalSessions(sessions);
  }
};

export const subscribeToProjectSessions = (
  projectId: string,
  callback: (sessions: Session[]) => void
) => {
  if (isFirebaseConfigured()) {
    const refDb = ref(db, 'compscape_sessions');
    return onValue(refDb, (snap) => {
      const data = snap.val();
      if (data) {
        const all: Session[] = Object.values(data);
        callback(all.filter(s => s.projectId === projectId));
      } else {
        callback([]);
      }
    });
  } else {
    callback(getLocalSessions().filter(s => s.projectId === projectId));
    return () => {};
  }
};

// ===== ANALYSIS =====

export const calculateCompetitorStatistics = (
  sessions: Session[],
  competitorIds: string[]
): CompetitorStatistics[] => {
  const completedSessions = sessions.filter(s => s.status === 'completed');

  return competitorIds.map(competitorId => {
    const allPositions: { x: number; y: number }[] = [];

    completedSessions.forEach(session => {
      const pos = session.positions.find(p => p.competitorId === competitorId);
      if (pos) {
        allPositions.push({ x: pos.x, y: pos.y });
      }
    });

    if (allPositions.length === 0) {
      return {
        competitorId,
        meanX: 0,
        meanY: 0,
        stdDevX: 0,
        stdDevY: 0,
        count: 0,
        positions: [],
      };
    }

    const meanX = allPositions.reduce((s, p) => s + p.x, 0) / allPositions.length;
    const meanY = allPositions.reduce((s, p) => s + p.y, 0) / allPositions.length;

    const stdDevX = Math.sqrt(allPositions.reduce((s, p) => s + (p.x - meanX) ** 2, 0) / allPositions.length);
    const stdDevY = Math.sqrt(allPositions.reduce((s, p) => s + (p.y - meanY) ** 2, 0) / allPositions.length);

    return {
      competitorId,
      meanX,
      meanY,
      stdDevX,
      stdDevY,
      count: allPositions.length,
      positions: allPositions,
    };
  });
};

export const calculateGroupStatistics = (
  sessions: Session[],
  competitorIds: string[]
): GroupStatistics[] => {
  const groups = new Map<string, { label: string; sessions: Session[] }>();

  sessions.forEach(s => {
    const gid = s.groupId || '_ungrouped';
    const label = s.groupLabel || 'Senza gruppo';
    if (!groups.has(gid)) groups.set(gid, { label, sessions: [] });
    groups.get(gid)!.sessions.push(s);
  });

  return Array.from(groups.entries()).map(([groupId, { label, sessions: groupSessions }]) => ({
    groupId,
    groupLabel: label,
    competitorStats: calculateCompetitorStatistics(groupSessions, competitorIds),
    sessionCount: groupSessions.length,
  }));
};

// ===== EXPORT =====

export const generateCSV = (sessions: Session[], competitorNames: Record<string, string>): string => {
  const headers = ['Session ID', 'Partecipante', 'Gruppo', 'Stato', 'Competitor', 'X', 'Y', 'Data'];
  const rows = sessions.flatMap(s =>
    s.positions.map(p => [
      s.sessionId,
      s.participantName || '',
      s.groupLabel || '',
      s.status,
      competitorNames[p.competitorId] || p.competitorId,
      p.x.toFixed(1),
      p.y.toFixed(1),
      new Date(p.timestamp).toISOString(),
    ])
  );

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
};
