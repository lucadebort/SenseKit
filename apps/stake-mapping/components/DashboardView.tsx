
import React, { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { subscribeToProjectSessions, clearProjectSessions, deleteSession, calculateRelationalDissonance, calculateAggregatedPositions, calculateGlobalAggregation, createSession, generateCSV, normalizeDistance, calculateTargetAggregation, getImpactScore, slugify } from '../utils';
import { Project, InterviewSession, StakeholderDef } from '../types';
import { AggregatedMap } from './AggregatedMap';
import { InterviewView } from './InterviewView';
import { ProjectSettings } from './ProjectSettings';
import { RawDataTable } from './RawDataTable';
import { isFirebaseConfigured } from '../firebase';
import {
  NavBar,
  Footer,
  Button,
  Badge,
  Input,
  SearchInput,
  Label,
  Card,
  CardContent,
  ConfirmDialog,
  Separator,
  SortIcon,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  cn,
  formatDate,
  formatTime,
} from '@sensekit/shared-ui';
import { applyGradientToZones, lightenColor } from '../constants';

interface DashboardViewProps {
  project: Project;
  initialTab?: string;
  initialSessionId?: string | null;
  onBack: () => void;
  onProjectUpdate: (p: Project) => void;
  onLogout: () => void;
  onNavigate: (path: string) => void;
}

type TabType = 'MANAGEMENT' | 'RELATIONAL' | 'IMPACT' | 'SETTINGS';
type SortKey = 'sessionId' | 'status' | 'respondentId' | 'notes' | 'createdAt' | 'submittedAt';
type SortDirection = 'asc' | 'desc';

export const DashboardView: React.FC<DashboardViewProps> = ({ project, initialTab, initialSessionId, onBack, onProjectUpdate, onLogout, onNavigate }) => {
  const [activeTab, setActiveTab] = useState<TabType>('MANAGEMENT');
  const [sessions, setSessions] = useState<InterviewSession[]>([]);

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

  useEffect(() => {
      if (initialSessionId && sessions.length > 0) {
          const sess = sessions.find(s => s.sessionId === initialSessionId);
          if (sess) setViewingSession(sess);
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
      onNavigate(`/projects/${slugify(project.name)}/viewer/${s.sessionId}`);
  };

  const closeSessionViewer = () => {
      setViewingSession(null);
      let segment = 'overview';
      if (activeTab === 'RELATIONAL') segment = 'relationships';
      if (activeTab === 'IMPACT') segment = 'impact';
      if (activeTab === 'SETTINGS') segment = 'settings';
      onNavigate(`/projects/${slugify(project.name)}/${segment}`);
  };

  useEffect(() => {
      if(project.config.stakeholders.length > 0) {
          setNewSessionRespondent(project.config.stakeholders[0].id);
      }
  }, [project.config.stakeholders]);

  useEffect(() => {
      const unsubscribe = subscribeToProjectSessions(project.id, (data) => setSessions(data));
      return () => unsubscribe();
  }, [project.id]);

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

  const stakeholders = project.config.stakeholders;
  const relZones = project.config.relationshipZones;

  const getShLabel = (id: string) => stakeholders.find(s => s.id === id)?.label || id;
  const getRelZoneLabel = (dist: number) => {
      const step = 1 / relZones.length;
      const idx = Math.min(Math.floor((dist / 100) / step), relZones.length - 1);
      return relZones[idx].label;
  };

  const aggRelationship = useMemo(() => calculateAggregatedPositions(sessions, 'relationshipMap', project.config), [sessions, project.config]);
  const targetImpactAnalysis = useMemo(() => calculateGlobalAggregation(sessions, 'centralityMap', project.config), [sessions, project.config]);
  const dissonanceStats = useMemo(() => calculateRelationalDissonance(sessions, project.config), [sessions, project.config]);

  const processedSessions = useMemo(() => {
      let result = [...sessions];
      result = result.filter(s => {
          const matchSearch = (s.notes || '').toLowerCase().includes(searchTerm.toLowerCase()) || s.sessionId.toLowerCase().includes(searchTerm.toLowerCase());
          const matchStatus = filterStatus === 'ALL' || s.status === filterStatus;
          const matchRole = filterRole === 'ALL' || s.respondentId === filterRole;
          return matchSearch && matchStatus && matchRole;
      });
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

  const handleCreateLink = async () => {
      if(!newSessionRespondent || !newSessionNotes.trim()) return;
      setIsCreating(true);
      const id = await createSession(project.id, newSessionRespondent, newSessionNotes);
      const baseUrl = window.location.origin;
      setGeneratedLink(`${baseUrl}/?session=${id}`);
      setNewSessionNotes('');
      setIsCreating(false);
  };

  const handleCopyLink = (sessionId: string) => {
      const baseUrl = window.location.origin;
      navigator.clipboard.writeText(`${baseUrl}/?session=${sessionId}`);
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

  const viewingIndex = viewingSession ? processedSessions.findIndex(s => s.sessionId === viewingSession.sessionId) : -1;
  const hasNextSession = viewingIndex !== -1 && viewingIndex > 0;
  const hasPrevSession = viewingIndex !== -1 && viewingIndex < processedSessions.length - 1;
  const viewingRespondentInfo = viewingSession ? stakeholders.find(s => s.id === viewingSession.respondentId) : null;

  const handlePrevSession = () => { if(viewingIndex > 0) openSessionViewer(processedSessions[viewingIndex - 1]); };
  const handleNextSession = () => { if(viewingIndex < processedSessions.length - 1) openSessionViewer(processedSessions[viewingIndex + 1]); };

  // Build project icon ReactNode for NavBar context
  const projectIcon = project.icon ? (
    <div className="w-6 h-6 rounded bg-muted flex items-center justify-center overflow-hidden shrink-0">
      {project.iconType === 'image' ? (
        <img src={project.icon} alt="" className="w-full h-full object-cover" />
      ) : (
        <span className="text-sm">{project.icon}</span>
      )}
    </div>
  ) : undefined;

  const brandIcon = (
    <div className="w-8 h-8 bg-card rounded-full flex items-center justify-center shadow-sm border border-border">
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" stroke="#2563eb" strokeWidth="2"/>
        <circle cx="12" cy="12" r="6" stroke="#059669" strokeWidth="2"/>
        <circle cx="12" cy="12" r="2" fill="#059669"/>
      </svg>
    </div>
  );

  const navTabs = [
    { id: 'MANAGEMENT', label: 'Management' },
    { id: 'RELATIONAL', label: 'Relationships' },
    { id: 'IMPACT', label: 'Impact' },
    { id: 'SETTINGS', label: 'Settings' },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
        {/* DELETE CONFIRM DIALOG */}
        <ConfirmDialog
          open={showDeleteModal}
          onOpenChange={setShowDeleteModal}
          onConfirm={confirmDelete}
          title="Confirm Deletion"
          description="Are you sure? This cannot be undone."
          confirmLabel="Delete"
          cancelLabel="Cancel"
          variant="destructive"
        />

        {/* NAVBAR */}
        <NavBar
          brand={{ name: 'StakeMap', icon: brandIcon, onClick: onBack }}
          context={{ name: project.name, icon: projectIcon }}
          tabs={navTabs}
          activeTab={activeTab}
          onTabChange={(id) => switchTab(id as TabType)}
          actions={
            <Button variant="ghost" size="sm" onClick={onLogout} className="text-xs font-bold text-muted-foreground hover:text-destructive uppercase tracking-wider">
              Logout
            </Button>
          }
        />

        <main className="flex-1 w-full max-w-7xl mx-auto p-6 pb-20 pt-20">

            {activeTab === 'SETTINGS' && (
                <div className="space-y-8 animate-fade-in">
                     <div>
                        <h2 className="text-2xl font-bold text-foreground">Project Settings</h2>
                        <p className="text-muted-foreground text-sm mt-1">Configure stakeholders, zones, and project details.</p>
                    </div>
                    <ProjectSettings project={project} onUpdate={onProjectUpdate} onDelete={onBack} />
                </div>
            )}

            {activeTab === 'MANAGEMENT' && (
                <div className="space-y-8 animate-fade-in">
                    <div>
                        <h2 className="text-2xl font-bold text-foreground">Session Management</h2>
                        <p className="text-muted-foreground text-sm mt-1">Create and manage interview links and track progress.</p>
                    </div>

                    {/* Create Session Card */}
                    <Card className="border-primary/10">
                      <CardContent className="p-6">
                        <h3 className="flex items-center gap-2 font-semibold text-foreground mb-4">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                            Create New Session
                        </h3>
                        <div className="flex flex-col md:flex-row gap-4 items-end">
                            <div className="flex-1 w-full md:w-1/3">
                                <Label size="xs" className="mb-1 block">Stakeholder Role</Label>
                                <div className="relative">
                                    <select
                                        value={newSessionRespondent}
                                        onChange={(e) => setNewSessionRespondent(e.target.value)}
                                        className="w-full h-12 pl-3 pr-10 border border-input rounded-lg bg-background appearance-none outline-none focus:ring-2 focus:ring-ring text-sm"
                                    >
                                        {stakeholders.map(t => (
                                            <option key={t.id} value={t.id}>{t.label}</option>
                                        ))}
                                    </select>
                                    <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-muted-foreground">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                    </div>
                                </div>
                            </div>
                            <div className="flex-1 w-full md:w-1/2">
                                <Label size="xs" className="mb-1 block">Name <span className="text-destructive">*</span></Label>
                                <Input
                                    type="text"
                                    required
                                    value={newSessionNotes}
                                    onChange={(e) => setNewSessionNotes(e.target.value)}
                                    placeholder="e.g. John Doe"
                                    className="h-12"
                                />
                            </div>
                            <Button
                                onClick={handleCreateLink}
                                disabled={isCreating || !newSessionNotes.trim()}
                                className="h-12 whitespace-nowrap"
                            >
                                Create Link
                            </Button>
                        </div>
                        {generatedLink && (
                            <div className="mt-6 p-4 bg-primary/5 rounded-lg border border-primary/10 flex flex-col md:flex-row items-center justify-between gap-4">
                                <code className="text-sm text-primary break-all bg-card/50 p-2 rounded w-full">{generatedLink}</code>
                                <Button variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(generatedLink)} className="whitespace-nowrap border-primary/20 text-primary hover:bg-primary/5">
                                    Copy Link
                                </Button>
                            </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Sessions Table */}
                    <Card className="overflow-hidden">
                        {/* TOOLBAR */}
                        <div className="p-4 border-b border-border bg-muted/50 flex flex-col md:flex-row gap-4 justify-between items-center">
                            <div className="flex gap-4 w-full md:w-auto">
                                <div className="flex-1 md:flex-none md:w-64">
                                    <SearchInput
                                        placeholder="Search Name or ID..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        onClear={() => setSearchTerm('')}
                                    />
                                </div>
                            </div>

                            <div className="flex gap-2 w-full md:w-auto overflow-x-auto p-1">
                                <div className="relative shrink-0">
                                    <select
                                        value={filterStatus}
                                        onChange={(e) => setFilterStatus(e.target.value as any)}
                                        className="h-10 pl-3 pr-8 rounded-lg border border-input text-xs font-bold text-muted-foreground bg-background outline-none focus:ring-2 focus:ring-ring appearance-none min-w-[120px]"
                                    >
                                        <option value="ALL">Status: All</option>
                                        <option value="completed">Completed</option>
                                        <option value="created">Pending</option>
                                    </select>
                                    <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-muted-foreground">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                    </div>
                                </div>

                                <div className="relative shrink-0">
                                    <select
                                        value={filterRole}
                                        onChange={(e) => setFilterRole(e.target.value)}
                                        className="h-10 pl-3 pr-8 rounded-lg border border-input text-xs font-bold text-muted-foreground bg-background outline-none focus:ring-2 focus:ring-ring appearance-none min-w-[120px]"
                                    >
                                        <option value="ALL">Role: All</option>
                                        {stakeholders.map(s => (
                                            <option key={s.id} value={s.id}>{s.label}</option>
                                        ))}
                                    </select>
                                    <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-muted-foreground">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/50 hover:bg-muted/50">
                                    <TableHead className="text-[10px] uppercase tracking-wider font-bold cursor-pointer hover:bg-muted/80 transition-colors" onClick={() => handleSort('sessionId')}>
                                        <span className="inline-flex items-center">ID <SortIcon active={sortConfig.key === 'sessionId'} direction={sortConfig.direction} /></span>
                                    </TableHead>
                                    <TableHead className="text-[10px] uppercase tracking-wider font-bold cursor-pointer hover:bg-muted/80 transition-colors" onClick={() => handleSort('status')}>
                                        <span className="inline-flex items-center">Status <SortIcon active={sortConfig.key === 'status'} direction={sortConfig.direction} /></span>
                                    </TableHead>
                                    <TableHead className="text-[10px] uppercase tracking-wider font-bold cursor-pointer hover:bg-muted/80 transition-colors" onClick={() => handleSort('respondentId')}>
                                        <span className="inline-flex items-center">Role <SortIcon active={sortConfig.key === 'respondentId'} direction={sortConfig.direction} /></span>
                                    </TableHead>
                                    <TableHead className="text-[10px] uppercase tracking-wider font-bold cursor-pointer hover:bg-muted/80 transition-colors" onClick={() => handleSort('notes')}>
                                        <span className="inline-flex items-center">Name <SortIcon active={sortConfig.key === 'notes'} direction={sortConfig.direction} /></span>
                                    </TableHead>
                                    <TableHead className="text-[10px] uppercase tracking-wider font-bold cursor-pointer hover:bg-muted/80 transition-colors" onClick={() => handleSort('createdAt')}>
                                        <span className="inline-flex items-center">Created At <SortIcon active={sortConfig.key === 'createdAt'} direction={sortConfig.direction} /></span>
                                    </TableHead>
                                    <TableHead className="text-[10px] uppercase tracking-wider font-bold cursor-pointer hover:bg-muted/80 transition-colors" onClick={() => handleSort('submittedAt')}>
                                        <span className="inline-flex items-center">Submitted At <SortIcon active={sortConfig.key === 'submittedAt'} direction={sortConfig.direction} /></span>
                                    </TableHead>
                                    <TableHead className="text-[10px] uppercase tracking-wider font-bold">Link</TableHead>
                                    <TableHead className="text-[10px] uppercase tracking-wider font-bold text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {processedSessions.map(s => (
                                    <TableRow key={s.sessionId} onClick={() => openSessionViewer(s)} className="cursor-pointer group">
                                        <TableCell className="font-mono text-xs text-muted-foreground">
                                            {s.sessionId.substring(0,8)}...
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={s.status === 'completed' ? 'success' : 'warning'}>
                                                {s.status === 'completed' ? 'Completed' : 'Pending'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <span className="inline-flex items-center gap-1 px-1 py-[1px] rounded-md border border-border bg-transparent">
                                                <div className="w-2 h-2 rounded-full shrink-0" style={{backgroundColor: stakeholders.find(t => t.id === s.respondentId)?.color}}></div>
                                                <span className="text-[10px] font-bold text-muted-foreground">{getShLabel(s.respondentId)}</span>
                                            </span>
                                        </TableCell>
                                        <TableCell className="font-medium text-foreground">
                                            {s.notes || <span className="text-muted-foreground/50 italic">No Name</span>}
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground">
                                            <div>{formatDate(s.createdAt)}</div>
                                            <div className="opacity-60">{formatTime(s.createdAt)}</div>
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground">
                                            {s.submittedAt ? (
                                                <>
                                                    <div>{formatDate(s.submittedAt)}</div>
                                                    <div className="opacity-60">{formatTime(s.submittedAt)}</div>
                                                </>
                                            ) : <span className="opacity-40">-</span>}
                                        </TableCell>
                                        <TableCell>
                                            {s.status !== 'completed' ? (
                                                <Button
                                                    variant={copiedId === s.sessionId ? 'ghost' : 'outline'}
                                                    size="sm"
                                                    onClick={(e) => { e.stopPropagation(); handleCopyLink(s.sessionId); }}
                                                    className={cn("w-24 text-xs", copiedId === s.sessionId && "text-emerald-600 bg-emerald-50")}
                                                >
                                                    {copiedId === s.sessionId ? 'Copied!' : 'Copy Link'}
                                                </Button>
                                            ) : (
                                                <span className="text-muted-foreground/40 text-xs italic">Closed</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={(e) => { e.stopPropagation(); setDeleteTargetId(s.sessionId); setShowDeleteModal(true); }}
                                                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                title="Delete Session"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {processedSessions.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">
                                            No sessions found.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </Card>

                    {/* Export Raw Data Card */}
                    <Card>
                      <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-4">
                        <div>
                            <h3 className="font-bold text-foreground text-lg">Export Raw Data</h3>
                            <p className="text-muted-foreground text-sm mt-1">Download complete dataset including coordinates, zones, and qualitative notes.</p>
                        </div>
                        <Button variant="secondary" onClick={() => generateCSV(sessions, project)} className="bg-foreground text-background hover:bg-foreground/90 shrink-0">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            Download CSV
                        </Button>
                      </CardContent>
                    </Card>
                </div>
            )}

            {activeTab === 'RELATIONAL' && (
                <div className="space-y-8 animate-fade-in">
                     <div>
                        <h2 className="text-2xl font-bold text-foreground">Relationships Analysis</h2>
                        <p className="text-muted-foreground text-sm mt-1">Analyze the distances and relationships between stakeholders.</p>
                    </div>

                    {/* DISSONANCE TABLE */}
                    <Card>
                      <CardContent className="p-6">
                        <h2 className="font-bold text-foreground text-lg mb-2">Relational Dissonance</h2>
                        <p className="text-muted-foreground text-sm mb-4">Shows where two stakeholders have significantly different perceptions of their relationship.</p>
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                    <TableHead className="text-xs font-bold uppercase">Stakeholder A</TableHead>
                                    <TableHead className="text-xs font-bold uppercase text-center">Gap</TableHead>
                                    <TableHead className="text-xs font-bold uppercase text-right">Stakeholder B</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {dissonanceStats.map((d, i) => (
                                    <TableRow key={i} className={d.gap > 30 ? 'bg-red-50 hover:bg-red-50' : ''}>
                                        <TableCell className="font-bold text-foreground">
                                            {getShLabel(d.a)} <span className="text-xs font-normal text-muted-foreground block">sees {getShLabel(d.b)} at dist {d.aToB}</span>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="font-mono font-bold text-lg">{d.gap}</div>
                                            <div className="text-[10px] text-muted-foreground uppercase">Points</div>
                                        </TableCell>
                                        <TableCell className="font-bold text-foreground text-right">
                                            {getShLabel(d.b)} <span className="text-xs font-normal text-muted-foreground block">sees {getShLabel(d.a)} at dist {d.bToA}</span>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {dissonanceStats.length === 0 && (
                                    <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground italic py-6">Not enough overlapping data to calculate dissonance yet.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                      </CardContent>
                    </Card>

                    {/* INDIVIDUAL MAPS GRID */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {stakeholders.map(r => {
                            const data = aggRelationship[r.id] || [];
                            const sortedData = [...data].sort((a,b) => a.meanScore - b.meanScore);
                            const count = sessions.filter(s => s.respondentId === r.id && s.status === 'completed').length;

                            let displayZones = project.config.relationshipZones;
                            let displayThemeColor = project.config.relationshipZones[0].color;
                            let centerTokenColor = undefined;

                            if (project.config.useStakeholderColors) {
                                centerTokenColor = r.color;
                                const zoneThemeColor = lightenColor(r.color, 0.85);
                                displayZones = applyGradientToZones(project.config.relationshipZones, zoneThemeColor);
                                displayThemeColor = zoneThemeColor;
                            }

                            return (
                                <Card key={r.id} className="flex flex-col h-full">
                                  <CardContent className="p-4 flex flex-col h-full">
                                    <div className="flex items-center gap-2 mb-4 border-b border-border pb-2">
                                        <div className="w-4 h-4 rounded-full" style={{backgroundColor: r.color}}></div>
                                        <h3 className="font-bold text-foreground text-sm">{r.label}'s Perspective</h3>
                                    </div>
                                    <div className="flex justify-center py-2 mb-6">
                                        <div className="w-full max-w-[300px] aspect-square">
                                            <AggregatedMap
                                                data={data}
                                                config={displayZones}
                                                centerLabel={`${r.label} (YOU)`}
                                                respondentId={r.label}
                                                themeColor={displayThemeColor}
                                                centerTokenColor={centerTokenColor}
                                                stakeholders={project.config.stakeholders}
                                            />
                                        </div>
                                    </div>

                                    <div className="mt-auto pt-4 border-t border-border">
                                        <p className="text-xs text-muted-foreground mb-3">
                                            For <strong className="text-foreground">{r.label}</strong> (n = {count}), stakeholders ordered by proximity:
                                        </p>
                                        <div className="border border-border rounded-lg overflow-hidden">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow className="hover:bg-transparent">
                                                        <TableHead className="text-xs font-bold px-3 py-2">Name</TableHead>
                                                        <TableHead className="text-xs font-bold px-3 py-2">Avg Dist</TableHead>
                                                        <TableHead className="text-xs font-bold px-3 py-2 text-right">Level</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {sortedData.map(item => (
                                                        <TableRow key={item.id}>
                                                            <TableCell className="px-3 py-2 font-bold text-foreground text-xs">{getShLabel(item.id)}</TableCell>
                                                            <TableCell className="px-3 py-2 font-mono text-muted-foreground text-xs">
                                                                {Math.round(item.meanScore)}
                                                                <span className="text-[10px] ml-1 opacity-70">±{item.stdDev}</span>
                                                            </TableCell>
                                                            <TableCell className="px-3 py-2 text-right text-muted-foreground text-xs">{getRelZoneLabel(item.meanScore)}</TableCell>
                                                        </TableRow>
                                                    ))}
                                                    {sortedData.length === 0 && (
                                                        <TableRow><TableCell colSpan={3} className="px-3 py-3 text-center text-muted-foreground italic text-xs">No data collected yet</TableCell></TableRow>
                                                    )}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </div>
                                  </CardContent>
                                </Card>
                            );
                        })}
                    </div>

                    <RawDataTable sessions={sessions} project={project} onViewSession={openSessionViewer} type="relational" />
                </div>
            )}

            {activeTab === 'IMPACT' && (
                <div className="space-y-8 animate-fade-in">
                    <div>
                        <h2 className="text-2xl font-bold text-foreground">Impact Analysis</h2>
                        <p className="text-muted-foreground text-sm mt-1">
                            Aggregated view of stakeholder importance/centrality.
                            <br/>
                            <span className="text-xs opacity-60">0 = Peripheral, 100 = Critical (Center)</span>
                        </p>
                    </div>

                    {/* Global Consensus */}
                    <Card>
                      <CardContent className="p-6">
                        <h3 className="font-bold text-foreground text-lg mb-4">Global Consensus</h3>
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

                            <div className="flex-1 w-full">
                                <Label size="xs" className="mb-3 block">Average Impact Scores</Label>
                                {targetImpactAnalysis.length === 0 ? (
                                    <div className="p-8 text-center text-muted-foreground text-xs italic border border-border rounded-lg bg-muted/50">
                                        No impact data collected yet.
                                    </div>
                                ) : (
                                    <div className="overflow-hidden rounded-lg border border-border">
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="hover:bg-transparent">
                                                    <TableHead className="text-xs font-bold uppercase">Stakeholder</TableHead>
                                                    <TableHead className="text-xs font-bold uppercase text-center">Avg Score</TableHead>
                                                    <TableHead className="text-xs font-bold uppercase text-right">Consensus</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {[...targetImpactAnalysis].sort((a,b) => b.meanScore - a.meanScore).map(item => (
                                                    <TableRow key={item.id}>
                                                        <TableCell className="font-bold text-foreground">{getShLabel(item.id)}</TableCell>
                                                        <TableCell className="text-center">
                                                            <div className="flex items-center justify-center gap-1.5">
                                                                <Badge variant={item.meanScore >= 80 ? 'info' : item.meanScore >= 50 ? 'info' : 'default'} className={item.meanScore >= 80 ? '' : item.meanScore >= 50 ? 'bg-primary/5 text-primary' : ''}>
                                                                    {Math.round(item.meanScore)}
                                                                </Badge>
                                                                <span className="text-[10px] text-muted-foreground font-mono opacity-80">±{item.stdDev}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-right text-xs text-muted-foreground">{item.count} votes</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                            </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Target Specific Maps Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {stakeholders.map(sh => {
                            const stats = targetImpactAnalysis.find(t => t.id === sh.id);
                            return (
                                <Card key={sh.id} className="flex flex-col h-full">
                                  <CardContent className="p-4 flex flex-col h-full">
                                    <div className="flex items-center gap-2 mb-4 border-b border-border pb-2">
                                        <div className="w-3 h-3 rounded-full" style={{backgroundColor: sh.color}}></div>
                                        <h3 className="font-bold text-foreground text-sm truncate">Target: {sh.label}</h3>
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
                                        <div className="mt-auto grid grid-cols-2 gap-2 text-center text-xs bg-muted/50 p-2 rounded-lg border border-border">
                                            <div>
                                                <span className="block text-muted-foreground text-[10px] uppercase">Mean Score</span>
                                                <span className="font-bold text-foreground text-lg">{Math.round(stats.meanScore)}</span>
                                            </div>
                                            <div>
                                                <span className="block text-muted-foreground text-[10px] uppercase">Std Dev</span>
                                                <span className="font-mono text-muted-foreground text-lg">±{stats.stdDev}</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="mt-auto text-center text-xs text-muted-foreground py-4 italic border-t border-border">
                                            No impact data collected for this target yet.
                                        </div>
                                    )}
                                  </CardContent>
                                </Card>
                            );
                        })}
                    </div>

                    <RawDataTable sessions={sessions} project={project} onViewSession={openSessionViewer} type="impact" />
                </div>
            )}

            {viewingSession && createPortal(
                <div className="fixed inset-0 z-[100] bg-card flex flex-col overscroll-none">
                    <div className="h-14 bg-card border-b border-border px-4 flex justify-between items-center">
                        <div className="flex flex-col">
                            <h2 className="font-bold text-foreground text-sm md:text-base leading-tight">{viewingSession.notes}</h2>
                            <div className="flex items-center gap-1 mt-0 px-1 py-[1px] rounded-md border border-border bg-transparent w-fit">
                                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: viewingRespondentInfo?.color || '#94a3b8' }} />
                                <span className="text-[10px] font-bold text-muted-foreground">
                                    {viewingRespondentInfo?.label || viewingSession.respondentId}
                                </span>
                            </div>
                        </div>
                        <div className="flex gap-4 items-center">
                            {sessions.length > 1 && (
                                <div className="flex gap-2">
                                    <Button variant="ghost" size="icon" onClick={handlePrevSession} disabled={!hasNextSession} title="Previous Session (Newer)">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={handleNextSession} disabled={!hasPrevSession} title="Next Session (Older)">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                    </Button>
                                </div>
                            )}
                            <Separator orientation="vertical" className="h-6" />
                            <Button variant="ghost" size="icon" onClick={closeSessionViewer} className="rounded-full">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </Button>
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
