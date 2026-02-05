
import React, { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { subscribeToProjectSessions, clearProjectSessions, deleteSession, calculateRelationalDissonance, calculateAggregatedPositions, calculateGlobalAggregation, createSession, generateCSV, normalizeDistance, calculateTargetAggregation, getImpactScore, slugify } from '../utils';
import { Project, InterviewSession, StakeholderDef } from '../types';
import { AggregatedMap } from './AggregatedMap';
import { InterviewView } from './InterviewView';
import { ProjectSettings } from './ProjectSettings';
import { RawDataTable } from './RawDataTable';
import { isFirebaseConfigured } from '../firebase';
import { Footer } from '@sensekit/shared-ui';
import { applyGradientToZones, lightenColor } from '../constants'; // Added lightenColor import

interface DashboardViewProps {
  project: Project;
  initialTab?: string;
  initialSessionId?: string | null;
  onBack: () => void;
  onProjectUpdate: (p: Project) => void;
  onLogout: () => void;
  onNavigate: (path: string) => void;
}

// MAPPING: Tab Label <-> URL Segment
type TabType = 'MANAGEMENT' | 'RELATIONAL' | 'IMPACT' | 'SETTINGS';
type SortKey = 'sessionId' | 'status' | 'respondentId' | 'notes' | 'createdAt' | 'submittedAt';
type SortDirection = 'asc' | 'desc';

const formatDate = (ts?: number) => {
    if(!ts) return '-';
    return new Date(ts).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const formatTime = (ts?: number) => {
    if(!ts) return '';
    return new Date(ts).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', hour12: false });
};

// SVG Sort Icon Helper
const SortIcon = ({ active, direction }: { active: boolean; direction: SortDirection }) => (
    <span className="ml-1.5 inline-flex flex-col justify-center h-3 w-3 align-middle">
        <svg viewBox="0 0 10 6" className={`w-2.5 h-1.5 mb-[1px] ${active && direction === 'asc' ? 'fill-slate-700' : 'fill-slate-300'}`} style={{ opacity: active && direction === 'desc' ? 0 : 1 }}><path d="M5 0L10 6H0L5 0Z" /></svg>
        <svg viewBox="0 0 10 6" className={`w-2.5 h-1.5 mt-[1px] ${active && direction === 'desc' ? 'fill-slate-700' : 'fill-slate-300'}`} style={{ opacity: active && direction === 'asc' ? 0 : 1 }}><path d="M5 6L0 0H10L5 6Z" /></svg>
    </span>
);

export const DashboardView: React.FC<DashboardViewProps> = ({ project, initialTab, initialSessionId, onBack, onProjectUpdate, onLogout, onNavigate }) => {
  const [activeTab, setActiveTab] = useState<TabType>('MANAGEMENT');
  const [sessions, setSessions] = useState<InterviewSession[]>([]);
  
  // Mobile Menu State
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // New session form
  const [newSessionRespondent, setNewSessionRespondent] = useState<string>('');
  const [newSessionNotes, setNewSessionNotes] = useState('');
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  
  // Filtering & Sorting State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'completed' | 'created'>('ALL');
  const [filterRole, setFilterRole] = useState<string>('ALL');
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({ key: 'createdAt', direction: 'desc' });

  const [viewingSession, setViewingSession] = useState<InterviewSession | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // --- TAB SYNC WITH URL ---
  useEffect(() => {
      // Don't switch tab if we are just deep-linking to a session viewer
      if (!viewingSession) {
          switch(initialTab) {
              case 'overview': setActiveTab('MANAGEMENT'); break;
              case 'relationships': setActiveTab('RELATIONAL'); break;
              case 'impact': setActiveTab('IMPACT'); break;
              case 'settings': setActiveTab('SETTINGS'); break;
              default: setActiveTab('MANAGEMENT');
          }
      }
  }, [initialTab]);

  // --- ADMIN VIEWER DEEP LINK SYNC ---
  useEffect(() => {
      if (initialSessionId && sessions.length > 0) {
          const sess = sessions.find(s => s.sessionId === initialSessionId);
          if (sess) {
              setViewingSession(sess);
          }
      }
  }, [initialSessionId, sessions]);

  const switchTab = (tab: TabType) => {
      setActiveTab(tab);
      let segment = 'overview';
      if (tab === 'RELATIONAL') segment = 'relationships';
      if (tab === 'IMPACT') segment = 'impact';
      if (tab === 'SETTINGS') segment = 'settings';
      
      onNavigate(`/projects/${slugify(project.name)}/${segment}`);
  };

  const openSessionViewer = (s: InterviewSession) => {
      setViewingSession(s);
      // Update URL to Admin Viewer path without reload
      onNavigate(`/projects/${slugify(project.name)}/viewer/${s.sessionId}`);
  };

  const closeSessionViewer = () => {
      setViewingSession(null);
      // Revert URL to current tab
      let segment = 'overview';
      if (activeTab === 'RELATIONAL') segment = 'relationships';
      if (activeTab === 'IMPACT') segment = 'impact';
      if (activeTab === 'SETTINGS') segment = 'settings';
      onNavigate(`/projects/${slugify(project.name)}/${segment}`);
  };

  // Initial respondent selection
  useEffect(() => {
      if(project.config.stakeholders.length > 0) {
          setNewSessionRespondent(project.config.stakeholders[0].id);
      }
  }, [project.config.stakeholders]);

  // Load Data
  useEffect(() => {
      const unsubscribe = subscribeToProjectSessions(project.id, (data) => {
          setSessions(data);
      });
      return () => unsubscribe();
  }, [project.id]);

  // Lock Scroll
  useEffect(() => {
    if (viewingSession) {
        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';
    } else {
        document.body.style.overflow = '';
        document.documentElement.style.overflow = '';
    }
    return () => { 
        document.body.style.overflow = '';
        document.documentElement.style.overflow = '';
    };
  }, [viewingSession]);
  
  // Config shorthands
  const stakeholders = project.config.stakeholders;
  const relZones = project.config.relationshipZones;
  const impZones = project.config.impactZones;

  // Helpers
  const getShLabel = (id: string) => stakeholders.find(s => s.id === id)?.label || id;
  const getRelZoneLabel = (dist: number) => {
      const step = 1 / relZones.length;
      const idx = Math.min(Math.floor((dist / 100) / step), relZones.length - 1);
      return relZones[idx].label;
  };
  
  // Analytics
  const aggRelationship = useMemo(() => calculateAggregatedPositions(sessions, 'relationshipMap', project.config), [sessions, project.config]);
  const targetImpactAnalysis = useMemo(() => calculateGlobalAggregation(sessions, 'centralityMap', project.config), [sessions, project.config]);
  const dissonanceStats = useMemo(() => calculateRelationalDissonance(sessions, project.config), [sessions, project.config]);

  // Filtered & Sorted Sessions
  const processedSessions = useMemo(() => {
      let result = [...sessions];

      // 1. Filter
      result = result.filter(s => {
          const matchSearch = (s.notes || '').toLowerCase().includes(searchTerm.toLowerCase()) || s.sessionId.toLowerCase().includes(searchTerm.toLowerCase());
          const matchStatus = filterStatus === 'ALL' || s.status === filterStatus;
          const matchRole = filterRole === 'ALL' || s.respondentId === filterRole;
          return matchSearch && matchStatus && matchRole;
      });

      // 2. Sort
      result.sort((a, b) => {
          let valA: any = '';
          let valB: any = '';

          switch (sortConfig.key) {
              case 'sessionId': valA = a.sessionId; valB = b.sessionId; break;
              case 'status': valA = a.status; valB = b.status; break;
              case 'respondentId': valA = getShLabel(a.respondentId); valB = getShLabel(b.respondentId); break;
              case 'notes': valA = (a.notes || '').toLowerCase(); valB = (b.notes || '').toLowerCase(); break;
              case 'createdAt': valA = a.createdAt || 0; valB = b.createdAt || 0; break;
              case 'submittedAt': valA = a.submittedAt || 0; valB = b.submittedAt || 0; break;
          }

          if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
          if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
          return 0;
      });

      return result;
  }, [sessions, searchTerm, filterStatus, filterRole, sortConfig, stakeholders]);

  const handleSort = (key: SortKey) => {
      setSortConfig(current => ({
          key,
          direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
      }));
  };

  // Handlers
  const handleCreateLink = async () => {
      if(!newSessionRespondent || !newSessionNotes.trim()) return;
      setIsCreating(true);
      const id = await createSession(project.id, newSessionRespondent, newSessionNotes);
      const baseUrl = window.location.origin;
      const url = `${baseUrl}/?session=${id}`;
      setGeneratedLink(url);
      setNewSessionNotes('');
      setIsCreating(false);
  };

  const handleCopyLink = (sessionId: string) => {
      const baseUrl = window.location.origin;
      const url = `${baseUrl}/?session=${sessionId}`;
      navigator.clipboard.writeText(url);
      setCopiedId(sessionId);
      setTimeout(() => setCopiedId(null), 2000);
  };

  const confirmDelete = async () => {
      if (deleteTargetId === null) {
          await clearProjectSessions(project.id);
          setSessions([]);
      } else {
          await deleteSession(deleteTargetId);
      }
      setShowDeleteModal(false);
  };

  // Viewer Navigation Logic
  const viewingIndex = viewingSession ? processedSessions.findIndex(s => s.sessionId === viewingSession.sessionId) : -1;
  const hasNextSession = viewingIndex !== -1 && viewingIndex > 0;
  const hasPrevSession = viewingIndex !== -1 && viewingIndex < processedSessions.length - 1;
  
  const viewingRespondentInfo = viewingSession ? stakeholders.find(s => s.id === viewingSession.respondentId) : null;

  const handlePrevSession = () => {
      if(viewingIndex > 0) openSessionViewer(processedSessions[viewingIndex - 1]);
  };
  const handleNextSession = () => {
      if(viewingIndex < processedSessions.length - 1) openSessionViewer(processedSessions[viewingIndex + 1]);
  };

  const NavLink = ({ tab, label, mobile = false }: { tab: TabType, label: string, mobile?: boolean }) => (
      <button 
        onClick={() => { switchTab(tab); if(mobile) setIsMobileMenuOpen(false); }}
        className={`
            ${mobile 
                ? 'w-full text-left px-4 py-3 border-l-4' 
                : 'h-full flex items-center px-2 text-sm font-medium border-b-[3px] pt-0.5'
            } 
            transition-colors 
            ${activeTab === tab 
                ? (mobile ? 'bg-blue-50 border-blue-600 text-blue-700' : 'border-blue-600 text-blue-600') 
                : (mobile ? 'border-transparent text-slate-600 hover:bg-slate-50' : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300')
            }
        `}
      >
          {label}
      </button>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
        {/* DELETE MODAL */}
        {showDeleteModal && (
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                <div className="bg-white rounded-xl p-6 w-full max-w-md border border-red-100">
                    <h3 className="text-xl font-bold text-slate-800 mb-2">Confirm Deletion</h3>
                    <p className="text-slate-600 mb-6">Are you sure? This cannot be undone.</p>
                    <div className="flex gap-3">
                        <button onClick={() => setShowDeleteModal(false)} className="flex-1 py-2 bg-slate-100 rounded-lg">Cancel</button>
                        <button onClick={confirmDelete} className="flex-1 py-2 bg-red-600 text-white rounded-lg">Delete</button>
                    </div>
                </div>
            </div>
        )}

        {/* HEADER */}
        <div className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur shadow-sm border-b border-slate-200">
            <div className="w-full max-w-7xl mx-auto px-6 h-12 flex justify-between items-center">
                
                {/* Left: Brand & Context */}
                <div className="flex items-center gap-4 md:gap-6 shrink-0">
                    <button onClick={onBack} className="flex items-center gap-3 group outline-none shrink-0" title="Back to Projects">
                        <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm border border-slate-200">
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="12" cy="12" r="10" stroke="#2563eb" strokeWidth="2"/>
                                <circle cx="12" cy="12" r="6" stroke="#059669" strokeWidth="2"/>
                                <circle cx="12" cy="12" r="2" fill="#059669"/>
                            </svg>
                        </div>
                        <span className="font-bold text-slate-800 text-lg tracking-tight group-hover:text-blue-600 transition-colors">StakeMap</span>
                    </button>
                    
                    <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>
                    
                    <div className="flex items-center gap-2 max-w-[150px] sm:max-w-[250px] hidden sm:flex">
                        {project.icon && (
                            <div className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                                {project.iconType === 'image' ? (
                                    <img src={project.icon} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-sm">{project.icon}</span>
                                )}
                            </div>
                        )}
                        <h1 className="text-sm font-bold text-slate-600 truncate">{project.name}</h1>
                    </div>
                </div>

                {/* Center Navigation */}
                <nav className="hidden md:flex items-center gap-8 h-full">
                    <NavLink tab="MANAGEMENT" label="Management" />
                    <NavLink tab="RELATIONAL" label="Relationships" />
                    <NavLink tab="IMPACT" label="Impact" />
                    <NavLink tab="SETTINGS" label="Settings" />
                </nav>

                {/* Right: Logout & Mobile Menu */}
                <div className="flex items-center gap-4 shrink-0">
                    <button 
                        onClick={onLogout} 
                        className="text-xs font-bold text-slate-400 hover:text-red-600 uppercase tracking-wider transition-colors hidden md:block"
                    >
                        Logout
                    </button>

                    {/* Mobile Hamburger */}
                    <button 
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="md:hidden p-2 text-slate-500 hover:text-slate-800 transition-colors rounded-lg hover:bg-slate-100"
                    >
                        {isMobileMenuOpen ? (
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        ) : (
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                        )}
                    </button>
                </div>
            </div>

            {/* Mobile Menu Dropdown */}
            {isMobileMenuOpen && (
                <div className="md:hidden border-t border-slate-200 bg-white absolute left-0 right-0 top-12 shadow-lg z-40 animate-fade-in">
                    <div className="flex flex-col py-2">
                         {/* Mobile Context Info */}
                         <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2 sm:hidden">
                            {project.icon && (
                                <div className="w-5 h-5 rounded bg-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                                    {project.iconType === 'image' ? (
                                        <img src={project.icon} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-xs">{project.icon}</span>
                                    )}
                                </div>
                            )}
                            <h1 className="text-sm font-bold text-slate-800 truncate">{project.name}</h1>
                        </div>
                        <NavLink tab="MANAGEMENT" label="Management" mobile={true} />
                        <NavLink tab="RELATIONAL" label="Relationships" mobile={true} />
                        <NavLink tab="IMPACT" label="Impact Analysis" mobile={true} />
                        <NavLink tab="SETTINGS" label="Project Settings" mobile={true} />
                        <div className="border-t border-slate-100 mt-1 pt-1">
                            <button 
                                onClick={onLogout} 
                                className="w-full text-left px-4 py-3 text-red-600 hover:bg-red-50 text-sm font-medium"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>

        <main className="flex-1 w-full max-w-7xl mx-auto p-6 pb-20 pt-20">
            
            {activeTab === 'SETTINGS' && (
                <div className="space-y-8 animate-fade-in">
                     <div>
                        <h2 className="text-2xl font-bold text-slate-800">Project Settings</h2>
                        <p className="text-slate-500 text-sm mt-1">Configure stakeholders, zones, and project details.</p>
                    </div>
                    <ProjectSettings project={project} onUpdate={onProjectUpdate} onDelete={onBack} />
                </div>
            )}

            {activeTab === 'MANAGEMENT' && (
                <div className="space-y-8 animate-fade-in">
                    {/* Header Section */}
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">Session Management</h2>
                        <p className="text-slate-500 text-sm mt-1">Create and manage interview links and track progress.</p>
                    </div>

                    {/* Create Session Card */}
                    <div className="bg-white border border-blue-100 shadow-sm rounded-xl p-6">
                        <h3 className="flex items-center gap-2 font-bold text-blue-900 mb-4">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                            Create New Session
                        </h3>
                        <div className="flex flex-col md:flex-row gap-4 items-end">
                            <div className="flex-1 w-full md:w-1/3">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Stakeholder Role</label>
                                <div className="relative">
                                    <select 
                                        value={newSessionRespondent} 
                                        onChange={(e) => setNewSessionRespondent(e.target.value)}
                                        className="w-full h-12 pl-3 pr-10 border border-slate-200 rounded-lg bg-white appearance-none outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        {stakeholders.map(t => (
                                            <option key={t.id} value={t.id}>{t.label}</option>
                                        ))}
                                    </select>
                                    <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-slate-500">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                    </div>
                                </div>
                            </div>
                            <div className="flex-1 w-full md:w-1/2">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Name <span className="text-red-500">*</span></label>
                                <input 
                                    type="text" 
                                    required
                                    value={newSessionNotes} 
                                    onChange={(e) => setNewSessionNotes(e.target.value)} 
                                    placeholder="e.g. John Doe" 
                                    className="w-full h-12 px-3 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" 
                                />
                            </div>
                            <button 
                                onClick={handleCreateLink} 
                                disabled={isCreating || !newSessionNotes.trim()} 
                                className="h-12 bg-blue-600 text-white font-bold px-6 rounded-lg shadow-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                            >
                                Create Link
                            </button>
                        </div>
                        {generatedLink && (
                            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100 flex flex-col md:flex-row items-center justify-between gap-4">
                                <code className="text-sm text-blue-800 break-all bg-white/50 p-2 rounded w-full">{generatedLink}</code>
                                <button onClick={() => navigator.clipboard.writeText(generatedLink)} className="px-6 py-2 bg-white border border-blue-200 text-blue-600 font-bold text-sm rounded-lg hover:bg-blue-50 whitespace-nowrap shadow-sm">Copy Link</button>
                            </div>
                        )}
                    </div>

                    {/* Sessions Table */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        {/* TOOLBAR */}
                        <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col md:flex-row gap-4 justify-between items-center">
                            <div className="flex gap-4 w-full md:w-auto">
                                {/* Search */}
                                <div className="relative flex-1 md:flex-none md:w-64">
                                    <input 
                                        type="text" 
                                        placeholder="Search Name or ID..." 
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full h-10 pl-9 pr-4 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    <svg className="w-4 h-4 text-slate-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                </div>
                            </div>
                            
                            <div className="flex gap-2 w-full md:w-auto overflow-x-auto p-1">
                                {/* Status Filter */}
                                <div className="relative shrink-0">
                                    <select 
                                        value={filterStatus}
                                        onChange={(e) => setFilterStatus(e.target.value as any)}
                                        className="h-10 pl-3 pr-8 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 bg-white outline-none focus:ring-2 focus:ring-blue-500 appearance-none min-w-[120px]"
                                    >
                                        <option value="ALL">Status: All</option>
                                        <option value="completed">Completed</option>
                                        <option value="created">Pending</option>
                                    </select>
                                    <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-slate-500">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                    </div>
                                </div>

                                {/* Role Filter */}
                                <div className="relative shrink-0">
                                    <select 
                                        value={filterRole}
                                        onChange={(e) => setFilterRole(e.target.value)}
                                        className="h-10 pl-3 pr-8 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 bg-white outline-none focus:ring-2 focus:ring-blue-500 appearance-none min-w-[120px]"
                                    >
                                        <option value="ALL">Role: All</option>
                                        {stakeholders.map(s => (
                                            <option key={s.id} value={s.id}>{s.label}</option>
                                        ))}
                                    </select>
                                    <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-slate-500">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
                                    <tr>
                                        <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('sessionId')}>
                                            <div className="flex items-center">ID <SortIcon active={sortConfig.key === 'sessionId'} direction={sortConfig.direction} /></div>
                                        </th>
                                        <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('status')}>
                                            <div className="flex items-center">Status <SortIcon active={sortConfig.key === 'status'} direction={sortConfig.direction} /></div>
                                        </th>
                                        <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('respondentId')}>
                                            <div className="flex items-center">Role <SortIcon active={sortConfig.key === 'respondentId'} direction={sortConfig.direction} /></div>
                                        </th>
                                        <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('notes')}>
                                            <div className="flex items-center">Name <SortIcon active={sortConfig.key === 'notes'} direction={sortConfig.direction} /></div>
                                        </th>
                                        <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('createdAt')}>
                                            <div className="flex items-center">Created At <SortIcon active={sortConfig.key === 'createdAt'} direction={sortConfig.direction} /></div>
                                        </th>
                                        <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('submittedAt')}>
                                            <div className="flex items-center">Submitted At <SortIcon active={sortConfig.key === 'submittedAt'} direction={sortConfig.direction} /></div>
                                        </th>
                                        <th className="px-6 py-4">Link</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {processedSessions.map(s => (
                                        <tr key={s.sessionId} onClick={() => openSessionViewer(s)} className="cursor-pointer hover:bg-indigo-50/50 transition-colors group">
                                            <td className="px-6 py-4 font-mono text-xs text-slate-400">
                                                {s.sessionId.substring(0,8)}...
                                            </td>
                                            <td className="px-6 py-4">
                                                {s.status === 'completed' ? (
                                                    <span className="px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold border border-green-200">Completed</span>
                                                ) : (
                                                    <span className="px-2.5 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-bold border border-yellow-200">Pending</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center gap-1 px-1 py-[1px] m-0 rounded-md border border-[#edeff2] bg-transparent">
                                                    <div className="w-2 h-2 rounded-full shrink-0" style={{backgroundColor: stakeholders.find(t => t.id === s.respondentId)?.color}}></div>
                                                    <span className="text-[10px] font-bold text-slate-500">
                                                        {getShLabel(s.respondentId)}
                                                    </span>
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 font-medium text-slate-700">
                                                {s.notes || <span className="text-slate-300 italic">No Name</span>}
                                            </td>
                                            <td className="px-6 py-4 text-xs text-slate-500">
                                                <div>{formatDate(s.createdAt)}</div>
                                                <div className="text-slate-400">{formatTime(s.createdAt)}</div>
                                            </td>
                                            <td className="px-6 py-4 text-xs text-slate-500">
                                                {s.submittedAt ? (
                                                    <>
                                                        <div>{formatDate(s.submittedAt)}</div>
                                                        <div className="text-slate-400">{formatTime(s.submittedAt)}</div>
                                                    </>
                                                ) : <span className="text-slate-300">-</span>}
                                            </td>
                                            <td className="px-6 py-4">
                                                {s.status !== 'completed' ? (
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); handleCopyLink(s.sessionId); }}
                                                        className={`px-3 py-1.5 border rounded text-xs font-bold transition-all w-24 text-center ${copiedId === s.sessionId ? 'bg-green-50 border-green-200 text-green-700' : 'bg-white border-blue-200 text-blue-600 hover:bg-blue-50'}`}
                                                    >
                                                        {copiedId === s.sessionId ? 'Copied!' : 'Copy Link'}
                                                    </button>
                                                ) : (
                                                    <span className="text-slate-300 text-xs italic">Closed</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); setDeleteTargetId(s.sessionId); setShowDeleteModal(true); }} 
                                                    className="text-slate-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition-colors"
                                                    title="Delete Session"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {processedSessions.length === 0 && (
                                        <tr>
                                            <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                                                No sessions found.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    
                    {/* Export Raw Data Card */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col md:flex-row items-center justify-between gap-4 mt-6">
                        <div>
                            <h3 className="font-bold text-slate-800 text-lg">Export Raw Data</h3>
                            <p className="text-slate-500 text-sm mt-1">Download complete dataset including coordinates, zones, and qualitative notes.</p>
                        </div>
                        <button onClick={() => generateCSV(sessions, project)} className="flex items-center gap-2 px-6 py-3 bg-slate-800 text-white text-sm font-bold rounded-lg shadow-md hover:bg-slate-900 transition-colors shrink-0">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            Download CSV
                        </button>
                    </div>
                </div>
            )}

            {activeTab === 'RELATIONAL' && (
                <div className="space-y-8 animate-fade-in">
                     <div>
                        <h2 className="text-2xl font-bold text-slate-800">Relationships Analysis</h2>
                        <p className="text-slate-500 text-sm mt-1">Analyze the distances and relationships between stakeholders.</p>
                    </div>

                    {/* DISSONANCE TABLE */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <h2 className="font-bold text-slate-800 text-lg mb-2">Relational Dissonance</h2>
                        <p className="text-slate-500 text-sm mb-4">Shows where two stakeholders have significantly different perceptions of their relationship.</p>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 text-slate-500 uppercase text-xs font-bold">
                                    <tr>
                                        <th className="px-4 py-2 text-left">Stakeholder A</th>
                                        <th className="px-4 py-2 text-center">Gap</th>
                                        <th className="px-4 py-2 text-right">Stakeholder B</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {dissonanceStats.map((d, i) => (
                                        <tr key={i} className={d.gap > 30 ? 'bg-red-50' : ''}>
                                            <td className="px-4 py-3 font-bold text-slate-700">
                                                {getShLabel(d.a)} <span className="text-xs font-normal text-slate-500 block">sees {getShLabel(d.b)} at dist {d.aToB}</span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <div className="font-mono font-bold text-lg">{d.gap}</div>
                                                <div className="text-[10px] text-slate-400 uppercase">Points</div>
                                            </td>
                                            <td className="px-4 py-3 font-bold text-slate-700 text-right">
                                                {getShLabel(d.b)} <span className="text-xs font-normal text-slate-500 block">sees {getShLabel(d.a)} at dist {d.bToA}</span>
                                            </td>
                                        </tr>
                                    ))}
                                    {dissonanceStats.length === 0 && (
                                        <tr><td colSpan={3} className="px-4 py-4 text-center text-slate-400 italic">Not enough overlapping data to calculate dissonance yet.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* INDIVIDUAL MAPS GRID */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {stakeholders.map(r => {
                            const data = aggRelationship[r.id] || [];
                            // Sort by distance (ascending) for proximity table
                            const sortedData = [...data].sort((a,b) => a.meanScore - b.meanScore);
                            const count = sessions.filter(s => s.respondentId === r.id && s.status === 'completed').length;
                            
                            // DYNAMIC COLORING LOGIC
                            let displayZones = project.config.relationshipZones;
                            let displayThemeColor = project.config.relationshipZones[0].color;
                            let centerTokenColor = undefined; // Default (will follow theme if not set)
                            
                            if (project.config.useStakeholderColors) {
                                // 1. Use pure color for the Center Dot
                                centerTokenColor = r.color;
                                
                                // 2. Use lighter tint for the Zones Background
                                // 0.85 means 85% white, 15% color -> Pastel
                                const zoneThemeColor = lightenColor(r.color, 0.85); 
                                
                                // 3. Recalculate gradient
                                displayZones = applyGradientToZones(project.config.relationshipZones, zoneThemeColor);
                                displayThemeColor = zoneThemeColor;
                            }

                            return (
                                <div key={r.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col h-full">
                                    {/* Map Section */}
                                    <div className="flex items-center gap-2 mb-4 border-b pb-2">
                                        <div className="w-4 h-4 rounded-full" style={{backgroundColor: r.color}}></div>
                                        <h3 className="font-bold text-slate-700 text-sm">{r.label}'s Perspective</h3>
                                    </div>
                                    <div className="flex justify-center py-2 mb-6">
                                        <div className="w-full max-w-[300px] aspect-square">
                                            <AggregatedMap 
                                                data={data}
                                                config={displayZones}
                                                centerLabel={`${r.label} (YOU)`}
                                                respondentId={r.label}
                                                themeColor={displayThemeColor}
                                                centerTokenColor={centerTokenColor} // Pass specific dark color
                                                stakeholders={project.config.stakeholders}
                                            />
                                        </div>
                                    </div>

                                    {/* Table Section */}
                                    <div className="mt-auto pt-4 border-t border-slate-100">
                                        <p className="text-xs text-slate-500 mb-3">
                                            For <strong className="text-slate-700">{r.label}</strong> (n = {count}), stakeholders ordered by proximity:
                                        </p>
                                        <div className="border border-slate-100 rounded-lg overflow-hidden">
                                            <table className="w-full text-xs">
                                                <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                                                    <tr>
                                                        <th className="px-3 py-2 text-left">Name</th>
                                                        <th className="px-3 py-2 text-left">Avg Dist</th>
                                                        <th className="px-3 py-2 text-right">Level</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 bg-white">
                                                    {sortedData.map(item => (
                                                        <tr key={item.id} className="hover:bg-slate-50/50">
                                                            <td className="px-3 py-2 font-bold text-slate-700">
                                                                {getShLabel(item.id)}
                                                            </td>
                                                            <td className="px-3 py-2 font-mono text-slate-600">
                                                                {Math.round(item.meanScore)} 
                                                                <span className="text-[10px] text-slate-400 ml-1 opacity-70">
                                                                    ±{item.stdDev}
                                                                </span>
                                                            </td>
                                                            <td className="px-3 py-2 text-right text-slate-500">
                                                                {getRelZoneLabel(item.meanScore)}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                     {sortedData.length === 0 && (
                                                        <tr><td colSpan={3} className="px-3 py-3 text-center text-slate-400 italic">No data collected yet</td></tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* RAW DATA TABLE */}
                    <RawDataTable sessions={sessions} project={project} onViewSession={openSessionViewer} type="relational" />
                </div>
            )}

            {activeTab === 'IMPACT' && (
                <div className="space-y-8 animate-fade-in">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">Impact Analysis</h2>
                        <p className="text-slate-500 text-sm mt-1">
                            Aggregated view of stakeholder importance/centrality.
                            <br/>
                            <span className="text-xs text-slate-400">0 = Peripheral, 100 = Critical (Center)</span>
                        </p>
                    </div>

                    {/* 1. Global Aggregation (The "Consensus" Map) */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <h3 className="font-bold text-slate-800 text-lg mb-4">Global Consensus</h3>
                        <div className="flex flex-col md:flex-row gap-8 items-start">
                            <div className="flex-1 flex justify-center w-full">
                                <div className="w-full max-w-[500px] aspect-square">
                                    <AggregatedMap 
                                        data={targetImpactAnalysis}
                                        config={project.config.impactZones}
                                        centerLabel="SUCCESS"
                                        respondentId="Global Consensus"
                                        themeColor={project.config.impactZones[0].color}
                                        stakeholders={project.config.stakeholders}
                                    />
                                </div>
                            </div>
                            
                            {/* Global Scores Table */}
                            <div className="flex-1 w-full">
                                <h4 className="text-sm font-bold text-slate-500 uppercase mb-3">Average Impact Scores</h4>
                                {targetImpactAnalysis.length === 0 ? (
                                    <div className="p-8 text-center text-slate-400 text-xs italic border border-slate-100 rounded-lg bg-slate-50">
                                        No impact data collected yet.
                                    </div>
                                ) : (
                                    <div className="overflow-hidden rounded-lg border border-slate-200">
                                        <table className="w-full text-sm">
                                            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold text-xs uppercase">
                                                <tr>
                                                    <th className="px-4 py-3 text-left">Stakeholder</th>
                                                    <th className="px-4 py-3 text-center">Avg Score</th>
                                                    <th className="px-4 py-3 text-right">Consensus</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {[...targetImpactAnalysis].sort((a,b) => b.meanScore - a.meanScore).map(item => (
                                                    <tr key={item.id} className="hover:bg-slate-50">
                                                        <td className="px-4 py-3 font-bold text-slate-700">{getShLabel(item.id)}</td>
                                                        <td className="px-4 py-3 text-center">
                                                            <div className="flex items-center justify-center gap-1.5">
                                                                <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${
                                                                    item.meanScore >= 80 ? 'bg-blue-100 text-blue-700' :
                                                                    item.meanScore >= 50 ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-500'
                                                                }`}>
                                                                    {Math.round(item.meanScore)}
                                                                </span>
                                                                <span className="text-[10px] text-slate-400 font-mono opacity-80">
                                                                    ±{item.stdDev}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 text-right text-xs text-slate-400">
                                                            {item.count} votes
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* 2. Target Specific Maps Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {stakeholders.map(sh => {
                            const stats = targetImpactAnalysis.find(t => t.id === sh.id);
                            
                            return (
                                <div key={sh.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col h-full">
                                    <div className="flex items-center gap-2 mb-4 border-b pb-2">
                                        <div className="w-3 h-3 rounded-full" style={{backgroundColor: sh.color}}></div>
                                        <h3 className="font-bold text-slate-700 text-sm truncate">Target: {sh.label}</h3>
                                    </div>
                                    
                                    <div className="flex justify-center py-2 mb-4">
                                        <div className="w-full max-w-[250px] aspect-square">
                                            <AggregatedMap 
                                                data={stats ? [stats] : []} 
                                                config={project.config.impactZones}
                                                centerLabel="SUCCESS"
                                                respondentId={sh.label}
                                                themeColor={project.config.impactZones[0].color}
                                                stakeholders={project.config.stakeholders}
                                            />
                                        </div>
                                    </div>

                                    {stats ? (
                                        <div className="mt-auto grid grid-cols-2 gap-2 text-center text-xs bg-slate-50 p-2 rounded-lg border border-slate-100">
                                            <div>
                                                <span className="block text-slate-400 text-[10px] uppercase">Mean Score</span>
                                                <span className="font-bold text-slate-700 text-lg">{Math.round(stats.meanScore)}</span>
                                            </div>
                                            <div>
                                                <span className="block text-slate-400 text-[10px] uppercase">Std Dev</span>
                                                <span className="font-mono text-slate-600 text-lg">±{stats.stdDev}</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="mt-auto text-center text-xs text-slate-400 py-4 italic border-t border-slate-100">
                                            No impact data collected for this target yet.
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* 3. Raw Data */}
                    <RawDataTable sessions={sessions} project={project} onViewSession={openSessionViewer} type="impact" />
                </div>
            )}

            {viewingSession && createPortal(
                <div className="fixed inset-0 z-[100] bg-white flex flex-col overscroll-none">
                    <div className="h-14 bg-white border-b px-4 flex justify-between items-center">
                        <div className="flex flex-col">
                            <h2 className="font-bold text-slate-800 text-sm md:text-base leading-tight">{viewingSession.notes}</h2>
                             {/* MODIFIED: Updated Role Badge Styles with specific requirements */}
                            <div className="flex items-center gap-1 mt-0 px-1 py-[1px] m-0 rounded-md border border-[#edeff2] bg-transparent w-fit">
                                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: viewingRespondentInfo?.color || '#94a3b8' }} />
                                <span className="text-[10px] font-bold text-slate-500">
                                    {viewingRespondentInfo?.label || viewingSession.respondentId}
                                </span>
                            </div>
                        </div>
                        <div className="flex gap-4 items-center">
                             {/* MODIFIED: Arrows hidden if only 1 session */}
                            {sessions.length > 1 && (
                                <div className="flex gap-2">
                                    <button 
                                        onClick={handlePrevSession}
                                        disabled={!hasNextSession}
                                        className="p-2 text-slate-400 hover:text-slate-600 disabled:opacity-20 hover:bg-slate-100 rounded-lg transition-all" 
                                        title="Previous Session (Newer)"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                                    </button>
                                    <button 
                                        onClick={handleNextSession}
                                        disabled={!hasPrevSession}
                                        className="p-2 text-slate-400 hover:text-slate-600 disabled:opacity-20 hover:bg-slate-100 rounded-lg transition-all" 
                                        title="Next Session (Older)"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                    </button>
                                </div>
                            )}
                            <div className="w-px h-6 bg-slate-200"></div>
                            <button onClick={closeSessionViewer} className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-50 rounded-full transition-colors">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                    </div>
                    <div className="flex-1 relative" style={{ maxHeight: 'calc(100% - 50px)' }}>
                        <InterviewView session={viewingSession} project={project} readOnlyOverride={true} isEmbedded={true} enableDownload={true} />
                    </div>
                </div>,
                document.body
            )}
        </main>
        
        <Footer appName="StakeMap" appDescription="a stakeholder mapping tool" />
    </div>
  );
};
