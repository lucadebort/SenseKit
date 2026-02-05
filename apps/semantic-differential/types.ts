// ===== CONFIGURATION TYPES =====

export interface SemanticPair {
  id: string;                    // Unique ID (e.g., 'sp_1704067200000')
  leftTerm: string;              // Es. "Tradizionale"
  rightTerm: string;             // Es. "Innovativo"
  category?: string;             // Optional: for grouping (es. "Valori", "Stile")
}

export interface ScaleConfig {
  points: number;                // 5, 7, 9, 11
  mode: 'discrete' | 'continuous';
  showLabels: boolean;           // Show numbers on scale
  showMidpoint: boolean;         // Highlight center point
}

export interface RandomizationConfig {
  enabled: boolean;              // Enable random flip of endpoints
}

export interface ProjectConfig {
  semanticPairs: SemanticPair[];
  scale: ScaleConfig;
  randomization: RandomizationConfig;
  question?: string;             // Main question for participants (e.g., "Pensando al ToV del tuo Comune...")
  instructions?: string;         // Custom instructions for participants
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  iconType?: 'emoji' | 'image';
  createdAt: number;
  ownerId?: string;              // Firebase Auth UID
  config: ProjectConfig;
}

// ===== SESSION TYPES =====

export interface DifferentialResponse {
  pairId: string;                // Reference to SemanticPair.id
  value: number;                 // -50 to +50 (normalized)
  rawValue: number;              // Original value before normalization
  wasFlipped: boolean;           // Whether endpoints were flipped for this participant
  timestamp: number;             // When the response was given
}

export interface Session {
  sessionId: string;
  projectId: string;
  participantUid?: string;       // Firebase Auth UID (for anonymous)
  participantName?: string;      // Participant name/label
  groupId?: string;              // For clustering/group comparison
  groupLabel?: string;           // Es. "Gruppo A", "Marketing", "Under 30"
  status: 'created' | 'in_progress' | 'completed';
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  responses: DifferentialResponse[];
  metadata?: {                   // Optional demographic data
    age?: string;
    role?: string;
    department?: string;
    [key: string]: string | undefined;
  };
}

// ===== ANALYSIS TYPES =====

export interface PairStatistics {
  pairId: string;
  leftTerm: string;
  rightTerm: string;
  mean: number;                  // Normalized mean (-50 to +50)
  stdDev: number;                // Standard deviation
  median: number;
  min: number;
  max: number;
  count: number;                 // Number of responses
  distribution?: number[];       // Distribution per scale point (for discrete)
}

export interface GroupStatistics {
  groupId: string;
  groupLabel: string;
  pairStats: PairStatistics[];
  profileVector: number[];       // Mean vector for radar chart
  participantCount: number;
}

export interface ClusterResult {
  clusterId: number;
  centroid: number[];            // Cluster center
  members: string[];             // Session IDs
  memberCount: number;
}

// ===== SUGGESTION TYPES =====

export interface SuggestedPair {
  leftTerm: string;
  rightTerm: string;
  usageCount: number;            // How many times used in other projects
  category?: string;
  source: 'system' | 'organization';
}
