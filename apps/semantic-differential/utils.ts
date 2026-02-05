import { Project, Session, DifferentialResponse, PairStatistics, GroupStatistics, ClusterResult, ProjectConfig, SemanticPair, SuggestedPair } from './types';
import { DEFAULT_PROJECT_CONFIG, generateId, slugify, COMMON_SEMANTIC_PAIRS } from './constants';
import { db, isFirebaseConfigured } from './firebase';
import { ref, set, get, child, push, onValue, off, remove, query, orderByChild, equalTo, update } from 'firebase/database';
import { safeJsonParse } from './validation';

export { slugify };

// ===== LOCAL STORAGE HELPERS (with try/catch) =====

const getLocalProjects = (): Project[] => {
  try {
    const stored = localStorage.getItem('semantic_differential_projects');
    return stored ? safeJsonParse<Project[]>(stored, []) : [];
  } catch (e) {
    console.error('Error reading local projects:', e);
    return [];
  }
};

const setLocalProjects = (projects: Project[]): void => {
  try {
    localStorage.setItem('semantic_differential_projects', JSON.stringify(projects));
  } catch (e) {
    console.error('Error saving local projects:', e);
  }
};

const getLocalSessions = (): Session[] => {
  try {
    const stored = localStorage.getItem('semantic_differential_sessions');
    return stored ? safeJsonParse<Session[]>(stored, []) : [];
  } catch (e) {
    console.error('Error reading local sessions:', e);
    return [];
  }
};

const setLocalSessions = (sessions: Session[]): void => {
  try {
    localStorage.setItem('semantic_differential_sessions', JSON.stringify(sessions));
  } catch (e) {
    console.error('Error saving local sessions:', e);
  }
};

// ===== PROJECT MANAGEMENT =====

export const createProject = async (
  name: string,
  description: string = '',
  customConfig?: ProjectConfig,
  icon: string = '📊',
  iconType: 'emoji' | 'image' = 'emoji'
): Promise<string> => {
  const now = Date.now();
  const newProject: Project = {
    id: '',
    name,
    description,
    icon,
    iconType,
    createdAt: now,
    config: customConfig ? JSON.parse(JSON.stringify(customConfig)) : JSON.parse(JSON.stringify(DEFAULT_PROJECT_CONFIG))
  };

  if (isFirebaseConfigured()) {
    const projRef = push(ref(db, 'projects'));
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
      const snapshot = await get(child(ref(db), `projects/${id}`));
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
      const snapshot = await get(ref(db, 'projects'));
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
    await set(ref(db, `projects/${projectId}/config`), config);
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
  if (updates.iconType !== undefined) validUpdates.iconType = updates.iconType;

  if (isFirebaseConfigured()) {
    await update(ref(db, `projects/${projectId}`), validUpdates);
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
    await remove(ref(db, `projects/${projectId}`));
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
    const refDb = ref(db, 'projects');
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
    responses: []
  };

  if (isFirebaseConfigured()) {
    const sessionRef = push(ref(db, 'sessions'));
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
    const sessionRef = ref(db, `sessions/${sessionId}`);
    await update(sessionRef, { participantUid: uid });
  }
};

export const getSessionById = async (id: string): Promise<Session | undefined> => {
  if (isFirebaseConfigured()) {
    const snapshot = await get(child(ref(db), `sessions/${id}`));
    return snapshot.exists() ? snapshot.val() : undefined;
  } else {
    return getLocalSessions().find(s => s.sessionId === id);
  }
};

export const updateSessionResponses = async (
  sessionId: string,
  responses: DifferentialResponse[],
  status: 'in_progress' | 'completed' = 'completed'
): Promise<void> => {
  const now = Date.now();
  const updates: Partial<Session> = {
    responses,
    status,
  };

  if (status === 'completed') {
    updates.completedAt = now;
  } else if (status === 'in_progress') {
    updates.startedAt = now;
  }

  if (isFirebaseConfigured()) {
    const sessionRef = ref(db, `sessions/${sessionId}`);
    await update(sessionRef, updates);
  } else {
    const sessions = getLocalSessions();
    const index = sessions.findIndex(s => s.sessionId === sessionId);
    if (index !== -1) {
      sessions[index] = { ...sessions[index], ...updates };
      setLocalSessions(sessions);
    }
  }
};

export const deleteSession = async (sessionId: string): Promise<void> => {
  if (isFirebaseConfigured()) {
    await remove(ref(db, `sessions/${sessionId}`));
  } else {
    const sessions = getLocalSessions().filter(s => s.sessionId !== sessionId);
    setLocalSessions(sessions);
  }
};

export const subscribeToProjectSessions = (
  projectId: string,
  callback: (sessions: Session[]) => void,
  onError?: (error: Error) => void
) => {
  if (isFirebaseConfigured()) {
    const sessionsRef = query(ref(db, 'sessions'), orderByChild('projectId'), equalTo(projectId));
    const listener = onValue(sessionsRef, (snapshot) => {
      const data = snapshot.val();
      const list: Session[] = data ? Object.values(data) : [];
      callback(list);
    }, (error) => {
      console.error('Error subscribing to sessions:', error);
      if (onError) onError(error);
    });
    return () => off(ref(db, 'sessions'), 'value', listener);
  } else {
    const all = getLocalSessions();
    callback(all.filter(s => s.projectId === projectId));
    return () => {};
  }
};

export const clearProjectSessions = async (projectId: string): Promise<void> => {
  if (isFirebaseConfigured()) {
    const snapshot = await get(query(ref(db, 'sessions'), orderByChild('projectId'), equalTo(projectId)));
    if (snapshot.exists()) {
      const updates: Record<string, null> = {};
      snapshot.forEach(child => {
        updates[child.key!] = null;
      });
      await update(ref(db, 'sessions'), updates);
    }
  } else {
    const sessions = getLocalSessions().filter(s => s.projectId !== projectId);
    setLocalSessions(sessions);
  }
};

// ===== RANDOMIZATION LOGIC =====

const hashString = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
};

const createSeededRandom = (seed: number): () => number => {
  return function() {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
};

export const generateFlipPattern = (
  sessionId: string,
  pairIds: string[],
  enabled: boolean
): Map<string, boolean> => {
  const flipMap = new Map<string, boolean>();

  if (!enabled) {
    pairIds.forEach(id => flipMap.set(id, false));
    return flipMap;
  }

  const seed = hashString(sessionId);
  const rng = createSeededRandom(seed);

  pairIds.forEach(id => {
    flipMap.set(id, rng() > 0.5);
  });

  return flipMap;
};

export const normalizeValue = (
  rawValue: number,
  wasFlipped: boolean,
  mode: 'discrete' | 'continuous',
  scalePoints: number
): number => {
  let normalized: number;

  if (mode === 'discrete') {
    // For discrete: rawValue is 0 to (points-1)
    const midpoint = (scalePoints - 1) / 2;
    normalized = ((rawValue - midpoint) / midpoint) * 50;
  } else {
    // For continuous: rawValue is 0 to 100
    normalized = rawValue - 50;
  }

  // If flipped, invert the sign to normalize
  if (wasFlipped) {
    normalized = -normalized;
  }

  return Math.round(normalized * 10) / 10;
};

// ===== STATISTICS CALCULATIONS =====

export const calculatePairStatistics = (
  sessions: Session[],
  pair: SemanticPair,
  scaleConfig: { points: number; mode: 'discrete' | 'continuous' }
): PairStatistics => {
  const completedSessions = sessions.filter(s => s.status === 'completed');

  const responses = completedSessions
    .map(s => s.responses.find(r => r.pairId === pair.id))
    .filter((r): r is DifferentialResponse => r !== undefined);

  if (responses.length === 0) {
    return {
      pairId: pair.id,
      leftTerm: pair.leftTerm,
      rightTerm: pair.rightTerm,
      mean: 0,
      stdDev: 0,
      median: 0,
      min: 0,
      max: 0,
      count: 0,
      distribution: scaleConfig.mode === 'discrete' ? new Array(scaleConfig.points).fill(0) : undefined
    };
  }

  const values = responses.map(r => r.value);

  // Mean
  const sum = values.reduce((a, b) => a + b, 0);
  const mean = sum / values.length;

  // Standard deviation
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  const stdDev = Math.sqrt(variance);

  // Median
  const sorted = [...values].sort((a, b) => a - b);
  const median = sorted.length % 2 === 0
    ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
    : sorted[Math.floor(sorted.length / 2)];

  // Distribution (for discrete mode)
  let distribution: number[] | undefined;
  if (scaleConfig.mode === 'discrete') {
    distribution = new Array(scaleConfig.points).fill(0);
    responses.forEach(r => {
      // Convert normalized value back to discrete index
      const midpoint = (scaleConfig.points - 1) / 2;
      const index = Math.round((r.value / 50) * midpoint + midpoint);
      if (index >= 0 && index < scaleConfig.points) {
        distribution![index]++;
      }
    });
  }

  return {
    pairId: pair.id,
    leftTerm: pair.leftTerm,
    rightTerm: pair.rightTerm,
    mean: Math.round(mean * 10) / 10,
    stdDev: Math.round(stdDev * 10) / 10,
    median: Math.round(median * 10) / 10,
    min: Math.min(...values),
    max: Math.max(...values),
    count: values.length,
    distribution
  };
};

export const calculateProfileVector = (
  sessions: Session[],
  pairs: SemanticPair[]
): number[] => {
  return pairs.map(pair => {
    const stats = calculatePairStatistics(sessions, pair, { points: 7, mode: 'discrete' });
    // Normalize to 0-100 for radar chart
    return Math.round(((stats.mean + 50) / 100) * 100);
  });
};

export const compareGroups = (
  sessions: Session[],
  pairs: SemanticPair[],
  scaleConfig: { points: number; mode: 'discrete' | 'continuous' }
): GroupStatistics[] => {
  const groups = new Map<string, Session[]>();

  sessions.forEach(s => {
    const key = s.groupId || 'ungrouped';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(s);
  });

  return Array.from(groups.entries()).map(([groupId, groupSessions]) => ({
    groupId,
    groupLabel: groupSessions[0]?.groupLabel || groupId,
    pairStats: pairs.map(p => calculatePairStatistics(groupSessions, p, scaleConfig)),
    profileVector: calculateProfileVector(groupSessions, pairs),
    participantCount: groupSessions.filter(s => s.status === 'completed').length
  }));
};

// ===== K-MEANS CLUSTERING =====

const euclideanDistance = (a: number[], b: number[]): number => {
  return Math.sqrt(a.reduce((sum, val, i) => sum + Math.pow(val - b[i], 2), 0));
};

const findNearestCentroid = (point: number[], centroids: number[][]): number => {
  let minDist = Infinity;
  let nearest = 0;
  centroids.forEach((c, i) => {
    const dist = euclideanDistance(point, c);
    if (dist < minDist) {
      minDist = dist;
      nearest = i;
    }
  });
  return nearest;
};

const initializeRandomCentroids = (matrix: number[][], k: number): number[][] => {
  const indices = new Set<number>();
  while (indices.size < k && indices.size < matrix.length) {
    indices.add(Math.floor(Math.random() * matrix.length));
  }
  return Array.from(indices).map(i => [...matrix[i]]);
};

const recalculateCentroids = (matrix: number[][], assignments: number[], k: number): number[][] => {
  const dimensions = matrix[0]?.length || 0;
  const centroids: number[][] = Array.from({ length: k }, () => new Array(dimensions).fill(0));
  const counts = new Array(k).fill(0);

  matrix.forEach((point, i) => {
    const cluster = assignments[i];
    counts[cluster]++;
    point.forEach((val, d) => {
      centroids[cluster][d] += val;
    });
  });

  return centroids.map((c, i) =>
    counts[i] > 0 ? c.map(v => v / counts[i]) : c
  );
};

const arraysEqual = (a: number[], b: number[]): boolean => {
  return a.length === b.length && a.every((v, i) => v === b[i]);
};

export const kMeansClustering = (
  sessions: Session[],
  pairs: SemanticPair[],
  k: number = 3,
  maxIterations: number = 100
): ClusterResult[] => {
  const completedSessions = sessions.filter(s => s.status === 'completed');

  if (completedSessions.length < k) {
    return [];
  }

  // Build matrix: rows = sessions, columns = normalized values
  const matrix = completedSessions.map(s =>
    pairs.map(p => {
      const resp = s.responses.find(r => r.pairId === p.id);
      return resp?.value ?? 0;
    })
  );

  if (matrix.length === 0 || matrix[0].length === 0) {
    return [];
  }

  // Initialize centroids
  let centroids = initializeRandomCentroids(matrix, k);

  // K-means iteration
  let assignments: number[] = [];
  for (let iter = 0; iter < maxIterations; iter++) {
    const newAssignments = matrix.map(point => findNearestCentroid(point, centroids));

    if (arraysEqual(assignments, newAssignments)) break;
    assignments = newAssignments;

    centroids = recalculateCentroids(matrix, assignments, k);
  }

  // Build result
  return Array.from({ length: k }, (_, clusterId) => ({
    clusterId,
    centroid: centroids[clusterId],
    members: completedSessions
      .filter((_, i) => assignments[i] === clusterId)
      .map(s => s.sessionId),
    memberCount: assignments.filter(a => a === clusterId).length
  })).filter(c => c.memberCount > 0);
};

// ===== SUGGESTIONS =====

export const getSuggestedPairs = async (): Promise<SuggestedPair[]> => {
  // Return common semantic pairs as suggestions
  return COMMON_SEMANTIC_PAIRS.map(p => ({
    leftTerm: p.left,
    rightTerm: p.right,
    usageCount: 0,
    category: p.category,
    source: 'system' as const
  }));
};

// ===== EXPORT FUNCTIONS =====

export const generateCSV = (sessions: Session[], project: Project): void => {
  const pairs = project.config.semanticPairs;
  const scaleConfig = project.config.scale;

  const headers = [
    'Session ID',
    'Participant Name',
    'Group',
    'Status',
    'Completed At',
    ...pairs.flatMap(p => [
      `${p.leftTerm} <-> ${p.rightTerm} (Raw)`,
      `${p.leftTerm} <-> ${p.rightTerm} (Normalized)`,
      `${p.leftTerm} <-> ${p.rightTerm} (Flipped)`
    ])
  ];

  const rows = sessions.map(s => {
    const row: string[] = [
      s.sessionId,
      s.participantName || '',
      s.groupLabel || '',
      s.status,
      s.completedAt ? new Date(s.completedAt).toISOString() : ''
    ];

    pairs.forEach(p => {
      const resp = s.responses.find(r => r.pairId === p.id);
      if (resp) {
        row.push(
          resp.rawValue.toString(),
          resp.value.toString(),
          resp.wasFlipped ? 'Yes' : 'No'
        );
      } else {
        row.push('', '', '');
      }
    });

    return row;
  });

  const csvContent = [headers, ...rows]
    .map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${slugify(project.name)}-data-${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const downloadSvg = (svgElement: SVGSVGElement | null, filename: string): void => {
  if (!svgElement) return;

  const serializer = new XMLSerializer();
  let source = serializer.serializeToString(svgElement);

  if (!source.match(/^<svg[^>]+xmlns="http:\/\/www\.w3\.org\/2000\/svg"/)) {
    source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
  }

  const styleBlock = `
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700&amp;display=swap');
    text {
      font-family: "Inter", "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
      fill: #334155;
    }
    .font-bold { font-weight: 700; }
    .text-slate-700 { fill: #334155; }
    .text-slate-500 { fill: #64748b; }
    .text-slate-400 { fill: #94a3b8; }
  </style>`;

  source = source.replace('</svg>', `${styleBlock}</svg>`);

  const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.download = `${filename}.svg`;
  a.href = url;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
