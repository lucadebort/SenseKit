// ===== CORE TYPES =====

export interface Project {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  iconType?: 'emoji' | 'image';
  createdAt: number;
  ownerId?: string;
  config: ProjectConfig;
}

export interface ProjectConfig {
  axes: {
    x: { leftLabel: string; rightLabel: string };
    y: { bottomLabel: string; topLabel: string };
  };
  competitors: CompetitorDef[];
  question?: string;
  instructions?: string;
}

export interface CompetitorDef {
  id: string;
  name: string;
  color: string;
  logo?: string;
}

// ===== SESSION TYPES =====

export interface Session {
  sessionId: string;
  projectId: string;
  participantUid?: string;
  participantName?: string;
  groupId?: string;
  groupLabel?: string;
  status: 'created' | 'in_progress' | 'completed';
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  positions: CompetitorPosition[];
  metadata?: Record<string, string>;
}

export interface CompetitorPosition {
  competitorId: string;
  x: number;  // -50 to +50
  y: number;  // -50 to +50
  timestamp: number;
}

// ===== ANALYSIS TYPES =====

export interface CompetitorStatistics {
  competitorId: string;
  meanX: number;
  meanY: number;
  stdDevX: number;
  stdDevY: number;
  count: number;
  positions: { x: number; y: number }[];
}

export interface GroupStatistics {
  groupId: string;
  groupLabel: string;
  competitorStats: CompetitorStatistics[];
  sessionCount: number;
}
