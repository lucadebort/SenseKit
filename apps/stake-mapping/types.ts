
export interface Coordinates {
  x: number;
  y: number;
}

// --- DYNAMIC CONFIG TYPES ---

export interface ZoneConfig {
  id: string; // generated ID or simple index string
  label: string;
  color: string;
}

export interface StakeholderDef {
  id: string; // internal ID (e.g., 'sh_1')
  label: string; // Display name (e.g., 'ECB')
  color: string;
}

export interface ProjectConfig {
  stakeholders: StakeholderDef[];
  // Zones ordered from Inner (Center) to Outer (Edge)
  relationshipZones: ZoneConfig[];
  impactZones: ZoneConfig[];
  useStakeholderColors?: boolean; // New flag for dynamic coloring
}

export interface Project {
  id: string;
  name: string;
  description?: string; // New field
  icon?: string; // New field (Emoji char or Base64 string)
  iconType?: 'emoji' | 'image'; // New field
  createdAt: number;
  config: ProjectConfig;
}

// --- DATA TYPES ---

export interface StakeholderData {
  id: string; // Corresponds to StakeholderDef.id
  position: Coordinates | null;
  zoneLabel: string | null; // Store the label at the time of placement
}

export interface AggregatedPoint {
  id: string;
  mean: Coordinates;
  points: Coordinates[];
  meanScore: number;
  stdDev: number;
  count: number;
}

export interface InterviewSession {
  sessionId: string;
  projectId: string; // Link to Project
  respondentId: string; // Corresponds to StakeholderDef.id
  participantUid?: string; // SECURITY: The Firebase Auth UID of the anonymous participant
  timestamp: number;
  createdAt?: number;
  submittedAt?: number;
  status: 'created' | 'completed';
  notes?: string;
  relationshipMap: StakeholderData[];
  centralityMap: StakeholderData[];
}

export interface BoardDimensions {
  width: number;
  height: number;
  centerX: number;
  centerY: number;
  maxRadius: number;
}
