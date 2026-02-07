import React, { useState, useEffect, useMemo } from 'react';
import { Project, Session, CompetitorStatistics, GroupStatistics } from '../types';
import {
  subscribeToProjectSessions,
  createSession,
  deleteSession,
  slugify,
  calculateCompetitorStatistics,
  calculateGroupStatistics,
  generateCSV,
} from '../utils';
import { useMounted } from '../hooks/useMounted';
import {
  Footer,
  NavBar,
  Button,
  Input,
  Label,
  Card,
  CardContent,
  StatCard,
  StatusBadge,
  type SessionStatus,
  EmptyState,
  LoadingScreen,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  formatDateTime,
} from '@sensekit/shared-ui';
import { AggregatedMatrix } from './AggregatedMatrix';
import { CompetitiveMatrix } from './CompetitiveMatrix';
import { ProjectSettings } from './ProjectSettings';

interface DashboardViewProps {
  project: Project;
  initialTab: string;
  initialSessionId: string | null;
  onBack: () => void;
  onProjectUpdate: (project: Project) => void;
  onLogout: () => void;
  onNavigate: (path: string) => void;
}

type TabType = 'overview' | 'sessions' | 'analysis' | 'settings';

const brandIcon = (
  <div className="w-8 h-8 bg-card rounded-full flex items-center justify-center shadow-sm border border-border">
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <line x1="12" y1="4" x2="12" y2="20" stroke="#d4d4d4" strokeWidth="1" />
      <line x1="4" y1="12" x2="20" y2="12" stroke="#d4d4d4" strokeWidth="1" />
      <circle cx="8" cy="8" r="2" fill="#3b82f6" />
      <circle cx="16" cy="10" r="2" fill="#ef4444" />
      <circle cx="13" cy="16" r="2" fill="#22c55e" />
    </svg>
  </div>
);

const navTabs = [
  { id: 'overview', label: 'Panoramica' },
  { id: 'sessions', label: 'Sessioni' },
  { id: 'analysis', label: 'Analisi' },
  { id: 'settings', label: 'Impostazioni' },
];

export const DashboardView: React.FC<DashboardViewProps> = ({
  project,
  initialTab,
  initialSessionId,
  onBack,
  onProjectUpdate,
  onLogout,
  onNavigate,
}) => {
  const isMounted = useMounted();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>((initialTab as TabType) || 'overview');
  const [isLoading, setIsLoading] = useState(true);

  // Session creation
  const [showCreateSession, setShowCreateSession] = useState(false);
  const [newParticipantName, setNewParticipantName] = useState('');
  const [newGroupLabel, setNewGroupLabel] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);

  // Session viewer
  const [viewingSession, setViewingSession] = useState<Session | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToProjectSessions(project.id, (list) => {
      if (isMounted.current) {
        setSessions(list.sort((a, b) => b.createdAt - a.createdAt));
        setIsLoading(false);
      }
    });
    return () => unsubscribe();
  }, [project.id]);

  // Statistics
  const completedSessions = useMemo(() =>
    sessions.filter(s => s.status === 'completed'),
    [sessions]
  );

  const competitorIds = project.config.competitors.map(c => c.id);

  const competitorStats: CompetitorStatistics[] = useMemo(() =>
    calculateCompetitorStatistics(completedSessions, competitorIds),
    [completedSessions, competitorIds]
  );

  const groupStats: GroupStatistics[] = useMemo(() =>
    calculateGroupStatistics(completedSessions, competitorIds),
    [completedSessions, competitorIds]
  );

  const competitorNames = useMemo(() => {
    const map: Record<string, string> = {};
    project.config.competitors.forEach(c => { map[c.id] = c.name; });
    return map;
  }, [project.config.competitors]);

  const handleCreateSession = async () => {
    setIsCreating(true);
    try {
      const id = await createSession(
        project.id,
        newParticipantName,
        newGroupLabel ? slugify(newGroupLabel) : '',
        newGroupLabel
      );
      const baseUrl = window.location.origin;
      const url = `${baseUrl}/?session=${id}`;
      if (isMounted.current) {
        setGeneratedLink(url);
        setNewParticipantName('');
        setNewGroupLabel('');
      }
    } catch (e) {
      console.error('Create session error:', e);
    } finally {
      if (isMounted.current) {
        setIsCreating(false);
      }
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      await deleteSession(sessionId);
    } catch (e) {
      console.error('Delete session error:', e);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const switchTab = (tab: TabType) => {
    setActiveTab(tab);
    onNavigate(`/projects/${slugify(project.name)}/${tab}`);
  };

  const handleExportCSV = () => {
    const csv = generateCSV(sessions, competitorNames);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${slugify(project.name)}-export.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const projectIcon = project.icon ? (
    <div className="w-6 h-6 rounded bg-muted flex items-center justify-center overflow-hidden shrink-0">
      <span className="text-sm">{project.icon}</span>
    </div>
  ) : undefined;

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <NavBar
        brand={{ name: 'CompScape', icon: brandIcon, onClick: onBack }}
        context={{ name: project.name, icon: projectIcon }}
        tabs={navTabs}
        activeTab={activeTab}
        onTabChange={(id) => switchTab(id as TabType)}
        actions={
          <Button variant="ghost" size="sm" onClick={onLogout} className="text-xs font-medium text-muted-foreground hover:text-destructive uppercase tracking-wider">
            Logout
          </Button>
        }
      />

      <main className="flex-1 w-full max-w-7xl mx-auto p-6 pb-20 pt-20">
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <StatCard label="Sessioni Totali" value={sessions.length} />
              <StatCard label="Completate" value={completedSessions.length} valueClassName="text-emerald-600" />
              <StatCard label="In Attesa" value={sessions.filter(s => s.status === 'created').length} />
              <StatCard label="Competitor" value={project.config.competitors.length} />
            </div>

            {/* Quick Actions */}
            <Card>
              <CardContent className="p-6">
                <h2 className="font-semibold text-foreground mb-4">Azioni Rapide</h2>
                <div className="flex flex-wrap gap-3">
                  <Button onClick={() => { setShowCreateSession(true); setGeneratedLink(null); }}>
                    + Crea Link Sessione
                  </Button>
                  {completedSessions.length > 0 && (
                    <Button variant="secondary" onClick={handleExportCSV}>
                      Esporta CSV
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Configuration Summary */}
            <Card>
              <CardContent className="p-6">
                <h2 className="font-semibold text-foreground mb-4">Configurazione</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6 text-sm">
                  <div>
                    <p className="text-muted-foreground">Asse X</p>
                    <p className="font-medium text-foreground">{project.config.axes.x.leftLabel} ↔ {project.config.axes.x.rightLabel}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Asse Y</p>
                    <p className="font-medium text-foreground">{project.config.axes.y.bottomLabel} ↔ {project.config.axes.y.topLabel}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Competitor</p>
                    <p className="font-medium text-foreground">{project.config.competitors.length}</p>
                  </div>
                </div>

                {/* Competitors List */}
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-xs text-muted-foreground font-medium mb-2">Competitor</p>
                  <div className="flex flex-wrap gap-2">
                    {project.config.competitors.map(comp => (
                      <span key={comp.id} className="flex items-center gap-1.5 px-2 py-1 bg-background rounded text-xs text-muted-foreground">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: comp.color }} />
                        {comp.name}
                      </span>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* SESSIONS TAB */}
        {activeTab === 'sessions' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="font-semibold text-foreground">Sessioni ({sessions.length})</h2>
              <Button onClick={() => { setShowCreateSession(true); setGeneratedLink(null); }}>
                + Nuova Sessione
              </Button>
            </div>

            {sessions.length === 0 ? (
              <Card>
                <EmptyState
                  title="Nessuna sessione"
                  description="Crea un link per iniziare."
                />
              </Card>
            ) : (
              <Card className="overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead className="text-xs">Partecipante</TableHead>
                      <TableHead className="text-xs">Gruppo</TableHead>
                      <TableHead className="text-xs">Stato</TableHead>
                      <TableHead className="text-xs">Data</TableHead>
                      <TableHead className="text-xs text-right">Azioni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessions.map(session => (
                      <TableRow key={session.sessionId}>
                        <TableCell className="text-sm text-foreground">
                          {session.participantName || <span className="text-muted-foreground">Anonimo</span>}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {session.groupLabel || '-'}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={session.status as SessionStatus} />
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDateTime(session.createdAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {session.status === 'completed' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs text-primary bg-primary/10 hover:bg-primary/20"
                                onClick={() => setViewingSession(session)}
                              >
                                Visualizza
                              </Button>
                            )}
                            {session.status === 'created' && (
                              <Button
                                variant="secondary"
                                size="sm"
                                className="text-xs"
                                onClick={() => copyToClipboard(`${window.location.origin}/?session=${session.sessionId}`)}
                              >
                                Copia Link
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs text-destructive bg-destructive/10 hover:bg-destructive/20"
                              onClick={() => handleDeleteSession(session.sessionId)}
                            >
                              Elimina
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </div>
        )}

        {/* ANALYSIS TAB */}
        {activeTab === 'analysis' && (
          <div className="space-y-6">
            {completedSessions.length === 0 ? (
              <Card>
                <EmptyState
                  title="Nessuna sessione completata"
                  description="I dati appariranno qui."
                />
              </Card>
            ) : (
              <>
                {/* Aggregated Matrix */}
                <Card>
                  <CardContent className="p-6">
                    <h2 className="font-semibold text-foreground mb-4">Mappa Aggregata</h2>
                    <AggregatedMatrix
                      axes={project.config.axes}
                      competitors={project.config.competitors}
                      stats={competitorStats}
                    />
                  </CardContent>
                </Card>

                {/* Statistics Table */}
                <Card className="overflow-hidden">
                  <div className="p-4 border-b border-border">
                    <h2 className="font-semibold text-foreground">Statistiche per Competitor</h2>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50 hover:bg-muted/50">
                        <TableHead className="text-xs">Competitor</TableHead>
                        <TableHead className="text-xs text-center">Media X</TableHead>
                        <TableHead className="text-xs text-center">Media Y</TableHead>
                        <TableHead className="text-xs text-center">Dev.Std X</TableHead>
                        <TableHead className="text-xs text-center">Dev.Std Y</TableHead>
                        <TableHead className="text-xs text-center">N</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {competitorStats.map(stat => {
                        const comp = project.config.competitors.find(c => c.id === stat.competitorId);
                        if (!comp) return null;
                        return (
                          <TableRow key={stat.competitorId}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: comp.color }} />
                                <span className="text-sm text-foreground">{comp.name}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center text-sm text-muted-foreground">
                              {stat.meanX.toFixed(1)}
                            </TableCell>
                            <TableCell className="text-center text-sm text-muted-foreground">
                              {stat.meanY.toFixed(1)}
                            </TableCell>
                            <TableCell className="text-center text-sm text-muted-foreground">
                              {stat.stdDevX.toFixed(1)}
                            </TableCell>
                            <TableCell className="text-center text-sm text-muted-foreground">
                              {stat.stdDevY.toFixed(1)}
                            </TableCell>
                            <TableCell className="text-center text-sm text-muted-foreground">
                              {stat.count}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </Card>

                {/* Group Comparison */}
                {groupStats.length > 1 && (
                  <Card className="p-6">
                    <h2 className="font-semibold text-foreground mb-4">Confronto Gruppi</h2>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent">
                            <TableHead className="text-xs">Gruppo</TableHead>
                            <TableHead className="text-xs text-center">Sessioni</TableHead>
                            {project.config.competitors.map(comp => (
                              <TableHead key={comp.id} className="text-xs text-center">
                                {comp.name}
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {groupStats.map(group => (
                            <TableRow key={group.groupId}>
                              <TableCell className="text-sm font-medium text-foreground">{group.groupLabel}</TableCell>
                              <TableCell className="text-center text-sm text-muted-foreground">{group.sessionCount}</TableCell>
                              {group.competitorStats.map(stat => (
                                <TableCell key={stat.competitorId} className="text-center text-xs text-muted-foreground">
                                  ({stat.meanX.toFixed(1)}, {stat.meanY.toFixed(1)})
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </Card>
                )}

                {/* Export */}
                <div className="flex gap-3">
                  <Button variant="secondary" onClick={handleExportCSV}>
                    Esporta CSV
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {/* SETTINGS TAB */}
        {activeTab === 'settings' && (
          <ProjectSettings
            project={project}
            onUpdate={onProjectUpdate}
            onDelete={onBack}
          />
        )}
      </main>

      <Footer appName="CompScape" appDescription="a competitive landscape tool" />

      {/* Create Session Dialog */}
      <Dialog open={showCreateSession} onOpenChange={setShowCreateSession}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {generatedLink ? 'Link Generato' : 'Nuova Sessione'}
            </DialogTitle>
          </DialogHeader>

          {generatedLink ? (
            <div className="space-y-4">
              <div className="bg-background rounded-lg p-4">
                <p className="text-xs text-muted-foreground mb-2">Link partecipante:</p>
                <div className="flex items-center gap-2">
                  <Input type="text" readOnly value={generatedLink} className="flex-1" />
                  <Button onClick={() => copyToClipboard(generatedLink)}>Copia</Button>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="secondary" onClick={() => setShowCreateSession(false)}>Chiudi</Button>
                <Button onClick={() => setGeneratedLink(null)}>Crea Altro</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label className="mb-1 block">Nome Partecipante (opzionale)</Label>
                <Input
                  type="text"
                  value={newParticipantName}
                  onChange={(e) => setNewParticipantName(e.target.value)}
                  placeholder="Es. Mario Rossi"
                />
              </div>
              <div>
                <Label className="mb-1 block">Gruppo (opzionale)</Label>
                <Input
                  type="text"
                  value={newGroupLabel}
                  onChange={(e) => setNewGroupLabel(e.target.value)}
                  placeholder="Es. Gruppo A, Marketing, Under 30"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="secondary" onClick={() => setShowCreateSession(false)}>Annulla</Button>
                <Button onClick={handleCreateSession} isLoading={isCreating}>
                  {isCreating ? 'Creazione...' : 'Genera Link'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Session Viewer Dialog */}
      <Dialog open={!!viewingSession} onOpenChange={(open) => { if (!open) setViewingSession(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {viewingSession?.participantName || 'Partecipante Anonimo'}
            </DialogTitle>
            {viewingSession && (
              <p className="text-sm text-muted-foreground">
                {viewingSession.groupLabel && `${viewingSession.groupLabel} · `}
                {formatDateTime(viewingSession.completedAt || viewingSession.createdAt)}
              </p>
            )}
          </DialogHeader>
          {viewingSession && (
            <div className="space-y-4">
              {/* Show the session positions on a mini matrix */}
              <div className="w-full max-w-[400px] mx-auto aspect-square">
                <CompetitiveMatrix
                  axes={project.config.axes}
                  tokens={viewingSession.positions.map(pos => {
                    const comp = project.config.competitors.find(c => c.id === pos.competitorId);
                    return {
                      id: pos.competitorId,
                      x: pos.x,
                      y: pos.y,
                      color: comp?.color || '#888',
                      label: comp?.name || pos.competitorId,
                    };
                  })}
                  interactive={false}
                  showGrid={true}
                />
              </div>

              {/* Position list */}
              <div className="space-y-2">
                {viewingSession.positions.map(pos => {
                  const comp = project.config.competitors.find(c => c.id === pos.competitorId);
                  return (
                    <div key={pos.competitorId} className="flex items-center justify-between py-1">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: comp?.color || '#888' }} />
                        <span className="text-sm text-foreground">{comp?.name || pos.competitorId}</span>
                      </div>
                      <span className="text-xs text-muted-foreground font-mono">
                        X: {pos.x.toFixed(1)} / Y: {pos.y.toFixed(1)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
