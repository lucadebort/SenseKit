
import { Project, InterviewSession, StakeholderData, AggregatedPoint, ProjectConfig } from './types';
import { BOARD_SIZE, TOKEN_RADIUS, DEFAULT_PROJECT_CONFIG } from './constants';
import { db, isFirebaseConfigured } from './firebase';
import { ref, set, get, child, push, onValue, off, remove, query, orderByChild, equalTo, update } from 'firebase/database';

const CENTER = BOARD_SIZE / 2;
const MAX_RADIUS = (BOARD_SIZE / 2);
const PLAYABLE_RADIUS = MAX_RADIUS - TOKEN_RADIUS;

// --- SAFE LOCALSTORAGE HELPERS ---

const safeGetItem = <T>(key: string, fallback: T): T => {
    try {
        const stored = localStorage.getItem(key);
        if (!stored) return fallback;
        return JSON.parse(stored) as T;
    } catch (e) {
        console.warn(`Failed to parse localStorage key "${key}":`, e);
        return fallback;
    }
};

const safeSetItem = (key: string, value: unknown): boolean => {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (e) {
        console.error(`Failed to save to localStorage key "${key}":`, e);
        return false;
    }
}; 

// --- HELPER: SLUGIFY ---
export const slugify = (text: string) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')        // Replace spaces with -
    .replace(/[^\w\-]+/g, '')    // Remove all non-word chars
    .replace(/\-\-+/g, '-');     // Replace multiple - with single -
};

// --- PROJECT MANAGEMENT ---

export const createProject = async (
    name: string, 
    description: string = '', 
    customConfig?: ProjectConfig,
    icon: string = '📁',
    iconType: 'emoji' | 'image' = 'emoji'
): Promise<string> => {
    const now = Date.now();
    const newProject: Project = {
        id: '',
        name,
        description,
        iconType,
        icon, 
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
        newProject.id = 'proj_' + now;
        projects.push(newProject);
        safeSetItem('stakeholder_projects', projects);
        return newProject.id;
    }
};

export const getProjectById = async (id: string): Promise<Project | undefined> => {
    if (isFirebaseConfigured()) {
        try {
            const snapshot = await get(child(ref(db), `projects/${id}`));
            return snapshot.exists() ? snapshot.val() : undefined;
        } catch (e) {
            console.error("Error fetching project:", e);
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
            console.error("Error fetching all projects:", e);
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
            safeSetItem('stakeholder_projects', projects);
        }
    }
};

// NEW: Update general metadata (name, description, icon)
export const updateProjectMetadata = async (projectId: string, updates: Partial<Project>): Promise<void> => {
    const validUpdates: any = {};
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
            safeSetItem('stakeholder_projects', projects);
        }
    }
};

export const deleteProject = async (projectId: string): Promise<void> => {
    // 1. Delete all sessions first
    await clearProjectSessions(projectId);

    // 2. Delete the project itself
    if (isFirebaseConfigured()) {
        await remove(ref(db, `projects/${projectId}`));
    } else {
        let projects = getLocalProjects();
        projects = projects.filter(p => p.id !== projectId);
        safeSetItem('stakeholder_projects', projects);
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
            console.error("Error subscribing to projects:", error);
            if (onError) onError(error);
        });
    } else {
        callback(getLocalProjects());
        return () => {};
    }
};

const getLocalProjects = (): Project[] => {
    return safeGetItem<Project[]>('stakeholder_projects', []);
};

// --- SESSION MANAGEMENT ---

export const createSession = async (projectId: string, respondentId: string, notes: string = ''): Promise<string> => {
    const cleanNotes = notes.substring(0, 500); 
    const now = Date.now();

    const newSession: InterviewSession = {
        sessionId: '',
        projectId,
        respondentId, // Now storing the ID (e.g. 'sh_1'), not the label
        timestamp: now,
        createdAt: now,
        status: 'created',
        notes: cleanNotes,
        relationshipMap: [],
        centralityMap: []
    };

    if (isFirebaseConfigured()) {
        const sessionRef = push(ref(db, 'sessions'));
        newSession.sessionId = sessionRef.key as string;
        await set(sessionRef, newSession);
        return newSession.sessionId;
    } else {
        const sessions = getLocalSessions();
        newSession.sessionId = 'sess_' + Math.random().toString(36).substr(2, 9);
        sessions.push(newSession);
        safeSetItem('stakeholder_sessions_v2', sessions);
        return newSession.sessionId;
    }
};

export const claimSession = async (sessionId: string, uid: string): Promise<void> => {
    if (isFirebaseConfigured()) {
        const sessionRef = ref(db, `sessions/${sessionId}`);
        await update(sessionRef, { participantUid: uid });
    }
};

export const getSessionById = async (id: string): Promise<InterviewSession | undefined> => {
    if (isFirebaseConfigured()) {
        const snapshot = await get(child(ref(db), `sessions/${id}`));
        return snapshot.exists() ? snapshot.val() : undefined;
    } else {
        return getLocalSessions().find(s => s.sessionId === id);
    }
};

export const updateSession = async (
    sessionId: string,
    relData: StakeholderData[], 
    cenData: StakeholderData[]
): Promise<void> => {
    const now = Date.now();
    const updates = {
        relationshipMap: relData,
        centralityMap: cenData,
        status: 'completed',
        timestamp: now,
        submittedAt: now
    };

    if (isFirebaseConfigured()) {
        const sessionRef = ref(db, `sessions/${sessionId}`);
        await update(sessionRef, updates); 
    } else {
        const sessions = getLocalSessions();
        const index = sessions.findIndex(s => s.sessionId === sessionId);
        if (index !== -1) {
            sessions[index] = { ...sessions[index], ...updates, status: 'completed' as const };
            safeSetItem('stakeholder_sessions_v2', sessions);
        }
    }
};

export const deleteSession = async (sessionId: string): Promise<void> => {
    if (isFirebaseConfigured()) {
        await remove(ref(db, `sessions/${sessionId}`));
    } else {
        let sessions = getLocalSessions();
        sessions = sessions.filter(s => s.sessionId !== sessionId);
        safeSetItem('stakeholder_sessions_v2', sessions);
    }
};

export const subscribeToProjectSessions = (
    projectId: string, 
    callback: (sessions: InterviewSession[]) => void,
    onError?: (error: Error) => void
) => {
    if (isFirebaseConfigured()) {
        const sessionsRef = query(ref(db, 'sessions'), orderByChild('projectId'), equalTo(projectId));
        const listener = onValue(sessionsRef, (snapshot) => {
            const data = snapshot.val();
            const list: InterviewSession[] = data ? Object.values(data) : [];
            callback(list);
        }, (error) => {
            console.error("Error subscribing to sessions:", error);
            if (onError) onError(error);
        });
        return () => off(ref(db, 'sessions'), 'value', listener);
    } else {
        const all = getLocalSessions();
        callback(all.filter(s => s.projectId === projectId));
        return () => {};
    }
};

// New function to fetch ALL sessions for statistics
export const subscribeToAllSessions = (
    callback: (sessions: InterviewSession[]) => void
) => {
    if (isFirebaseConfigured()) {
        const sessionsRef = ref(db, 'sessions');
        return onValue(sessionsRef, (snapshot) => {
            const data = snapshot.val();
            const list: InterviewSession[] = data ? Object.values(data) : [];
            callback(list);
        });
    } else {
        callback(getLocalSessions());
        return () => {};
    }
};

export const clearProjectSessions = async (projectId: string) => {
    if(isFirebaseConfigured()) {
        const snapshot = await get(query(ref(db, 'sessions'), orderByChild('projectId'), equalTo(projectId)));
        if(snapshot.exists()) {
            const updates: Record<string, null> = {};
            snapshot.forEach(child => {
                updates[child.key!] = null;
            });
            // FIX: Use modular update function instead of method call
            await update(ref(db, 'sessions'), updates);
        }
    } else {
        let all = getLocalSessions();
        all = all.filter(s => s.projectId !== projectId);
        safeSetItem('stakeholder_sessions_v2', all);
    }
};

const getLocalSessions = (): InterviewSession[] => {
    return safeGetItem<InterviewSession[]>('stakeholder_sessions_v2', []);
};

// --- MATH & EXPORTS ---

export const downloadSvg = (svgElement: SVGSVGElement | null, filename: string) => {
    if (!svgElement) return;
    const serializer = new XMLSerializer();
    let source = serializer.serializeToString(svgElement);

    // Fix namespace
    if (!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)) {
        source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
    }

    // ROBUST STYLE INJECTION for rendering outside browser context
    // Includes standard system fonts and maps Tailwind colors to CSS values
    // FIX: Escaped the & in the Google Fonts URL to &amp; to prevent XML parsing errors.
    const styleBlock = `
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700&amp;display=swap');
        
        text { 
            font-family: "Inter", "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important; 
            fill: #334155; 
            dominant-baseline: middle;
            text-anchor: middle;
        }
        .font-bold { font-weight: 700; }
        .font-mono { font-family: "Courier New", monospace !important; }
        .uppercase { text-transform: uppercase; }
        .tracking-wider { letter-spacing: 0.05em; }
        
        /* Tailwind Color Mapping for SVG Export */
        .text-slate-700 { fill: #334155; }
        .text-slate-500 { fill: #64748b; }
        .text-slate-400 { fill: #94a3b8; }
        .fill-slate-800 { fill: #1e293b; }
        .fill-slate-700 { fill: #334155; }
        .fill-slate-400 { fill: #94a3b8; }
        .fill-white { fill: #ffffff; }
        .stroke-slate-300 { stroke: #cbd5e1; }
        .stroke-white { stroke: #ffffff; }
        .shadow-sm { filter: drop-shadow(0 1px 2px rgb(0 0 0 / 0.1)); }
    </style>`;

    source = source.replace('</svg>', `${styleBlock}</svg>`);

    const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.download = `${filename}.svg`;
    a.href = url;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
};

export const normalizeDistance = (p: {x: number, y: number} | null) => {
    if (!p) return null;
    const dist = Math.sqrt(Math.pow(p.x - CENTER, 2) + Math.pow(p.y - CENTER, 2));
    const normalized = Math.max(0, Math.min(1, dist / PLAYABLE_RADIUS));
    return Math.round(normalized * 100);
};

export const getImpactScore = (dist: number | null) => {
    if (dist === null) return 0;
    return 100 - dist;
};

// --- DYNAMIC AGGREGATION ---

const calculateProjectedMean = (xSum: number, ySum: number, scalarDistSum: number, count: number): { x: number, y: number } => {
    const avgDistanceValue = scalarDistSum / count; 
    const targetPixelRadius = (avgDistanceValue / 100) * PLAYABLE_RADIUS;
    const centroidX = xSum / count;
    const centroidY = ySum / count;
    const vx = centroidX - CENTER;
    const vy = centroidY - CENTER;
    const centroidDist = Math.sqrt(vx * vx + vy * vy);

    if (centroidDist < 0.1) return { x: CENTER, y: CENTER - targetPixelRadius };
    const scale = targetPixelRadius / centroidDist;
    return { x: CENTER + vx * scale, y: CENTER + vy * scale };
};

export const calculateAggregatedPositions = (sessions: InterviewSession[], mapType: 'relationshipMap' | 'centralityMap', config: ProjectConfig) => {
    const result: Record<string, Record<string, { xSum: number, ySum: number, scalarDistSum: number, points: {x:number, y:number}[], count: number }>> = {};

    config.stakeholders.forEach(r => {
        result[r.id] = {};
        config.stakeholders.forEach(t => {
            result[r.id][t.id] = { xSum: 0, ySum: 0, scalarDistSum: 0, points: [], count: 0 };
        });
    });

    sessions.forEach(s => {
        const respondent = s.respondentId;
        const dataMap = s[mapType] || []; 

        dataMap.forEach(item => {
            if (item.position && result[respondent] && result[respondent][item.id]) {
                const target = result[respondent][item.id];
                target.xSum += item.position.x;
                target.ySum += item.position.y;
                target.points.push(item.position);
                target.scalarDistSum += (normalizeDistance(item.position) || 0);
                target.count++;
            }
        });
    });

    const final: Record<string, AggregatedPoint[]> = {};
    Object.keys(result).forEach(r => {
        final[r] = [];
        Object.keys(result[r]).forEach(t => {
            const d = result[r][t];
            if (d.count > 0) {
                const projectedMean = calculateProjectedMean(d.xSum, d.ySum, d.scalarDistSum, d.count);
                const avgDist = Math.round(d.scalarDistSum / d.count);
                const outputScore = mapType === 'centralityMap' ? (100 - avgDist) : avgDist;
                
                const distances = d.points.map(p => normalizeDistance(p) || 0);
                const variance = distances.reduce((sum, val) => sum + Math.pow(val - avgDist, 2), 0) / d.count;
                
                final[r].push({
                    id: t, 
                    mean: projectedMean, 
                    points: d.points,
                    meanScore: outputScore, 
                    stdDev: Math.round(Math.sqrt(variance) * 10) / 10,
                    count: d.count
                });
            }
        });
    });
    return final;
};

export const calculateGlobalAggregation = (sessions: InterviewSession[], mapType: 'relationshipMap' | 'centralityMap', config: ProjectConfig) => {
    const result: Record<string, { xSum: number, ySum: number, scalarDistSum: number, points: {x:number, y:number}[], count: number }> = {};
    config.stakeholders.forEach(t => {
        result[t.id] = { xSum: 0, ySum: 0, scalarDistSum: 0, points: [], count: 0 };
    });

    sessions.forEach(s => {
        (s[mapType] || []).forEach(item => {
            if (item.position && result[item.id]) {
                const target = result[item.id];
                target.xSum += item.position.x;
                target.ySum += item.position.y;
                target.points.push(item.position);
                target.scalarDistSum += (normalizeDistance(item.position) || 0);
                target.count++;
            }
        });
    });

    const final: AggregatedPoint[] = [];
    Object.keys(result).forEach(t => {
        const d = result[t];
        if (d.count > 0) {
            const projectedMean = calculateProjectedMean(d.xSum, d.ySum, d.scalarDistSum, d.count);
            const avgDist = Math.round(d.scalarDistSum / d.count);
            const outputScore = mapType === 'centralityMap' ? (100 - avgDist) : avgDist;
            const distances = d.points.map(p => normalizeDistance(p) || 0);
            const variance = distances.reduce((sum, val) => sum + Math.pow(val - avgDist, 2), 0) / d.count;

            final.push({
                id: t,
                mean: projectedMean,
                points: d.points,
                meanScore: outputScore, 
                stdDev: Math.round(Math.sqrt(variance) * 10) / 10,
                count: d.count
            });
        }
    });
    return final;
};

export const calculateTargetAggregation = calculateGlobalAggregation;

export const calculateRelationalDissonance = (sessions: InterviewSession[], config: ProjectConfig) => {
    const matrix: Record<string, Record<string, {sum: number, count: number}>> = {};
    config.stakeholders.forEach(r => {
      matrix[r.id] = {};
      config.stakeholders.forEach(c => {
        matrix[r.id][c.id] = { sum: 0, count: 0 };
      });
    });
  
    sessions.forEach(s => {
      const respondent = s.respondentId;
      if (s.relationshipMap) {
          s.relationshipMap.forEach(item => {
            if(item.position && item.id !== respondent && matrix[respondent] && matrix[respondent][item.id]) {
                matrix[respondent][item.id].sum += (normalizeDistance(item.position) || 0);
                matrix[respondent][item.id].count += 1;
            }
        });
      }
    });
  
    const resultMatrix: Record<string, Record<string, number>> = {};
    Object.keys(matrix).forEach(r => {
        resultMatrix[r] = {};
        Object.keys(matrix[r]).forEach(c => {
            const { sum, count } = matrix[r][c];
            resultMatrix[r][c] = count > 0 ? Math.round(sum / count) : 0; 
        });
    });

    const pairs: { a: string, b: string, gap: number, aToB: number, bToA: number, hasData: boolean }[] = [];
    const sh = config.stakeholders;

    for (let i = 0; i < sh.length; i++) {
        for (let j = i + 1; j < sh.length; j++) {
            const A = sh[i].id;
            const B = sh[j].id;
            const valAtoB = resultMatrix[A][B];
            const valBtoA = resultMatrix[B][A];
            
            if (valAtoB > 0 || valBtoA > 0) {
                 pairs.push({
                    a: A,
                    b: B,
                    gap: Math.abs(valAtoB - valBtoA),
                    aToB: valAtoB,
                    bToA: valBtoA,
                    hasData: true 
                });
            }
        }
    }
    return pairs.sort((x, y) => y.gap - x.gap);
};

export const generateCSV = (sessions: InterviewSession[], project: Project) => {
    let csvContent = "data:text/csv;charset=utf-8,";
    const config = project.config;
    const stakeholders = config.stakeholders;
    
    // Lookups
    const getShLabel = (id: string) => stakeholders.find(s => s.id === id)?.label || id;

    const headers = [
        "Session ID", "Status", "Date", "Respondent Role", "Participant Notes",
        ...stakeholders.flatMap(s => [`REL_${s.label}_Dist`, `REL_${s.label}_X`, `REL_${s.label}_Y`]),
        ...stakeholders.flatMap(s => [`IMP_${s.label}_Score`, `IMP_${s.label}_X`, `IMP_${s.label}_Y`])
    ];
    csvContent += headers.join(",") + "\r\n";

    sessions.forEach(s => {
        const row = [
            s.sessionId,
            s.status,
            new Date(s.timestamp).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).replace(',', ''),
            getShLabel(s.respondentId),
            `"${s.notes || ''}"`
        ];

        stakeholders.forEach(sh => {
            const item = s.relationshipMap?.find(i => i.id === sh.id);
            if (item && item.position) {
                row.push(
                    (normalizeDistance(item.position) || "").toString(), 
                    Math.round(item.position.x).toString(), 
                    Math.round(item.position.y).toString()
                );
            } else {
                 if (s.respondentId === sh.id) row.push("0", "N/A", "N/A"); 
                 else row.push("", "", "");
            }
        });

        stakeholders.forEach(sh => {
            const item = s.centralityMap?.find(i => i.id === sh.id);
            if (item && item.position) {
                const dist = normalizeDistance(item.position);
                row.push(
                    getImpactScore(dist).toString(), 
                    Math.round(item.position.x).toString(), 
                    Math.round(item.position.y).toString()
                );
            } else {
                row.push("", "", "");
            }
        });
        csvContent += row.join(",") + "\r\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `project_data_${slugify(project.name)}_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
