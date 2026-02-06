import React, { useState, useEffect, useMemo } from 'react';
import { Project, Session, PairStatistics, GroupStatistics } from '../types';
import {
  subscribeToProjectSessions,
  createSession,
  deleteSession,
  slugify,
  calculatePairStatistics,
  compareGroups,
  generateCSV
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
import { DistributionChart } from './DistributionChart';
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
      <path d="M4 6h16M4 12h16M4 18h16" stroke="#2563eb" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="8" cy="6" r="2" fill="#059669"/>
      <circle cx="16" cy="12" r="2" fill="#059669"/>
      <circle cx="10" cy="18" r="2" fill="#059669"/>
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
  onNavigate
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

  // Analysis
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeToProjectSessions(project.id, (list) => {
      if (isMounted.current) {
        setSessions(list.sort((a, b) => b.createdAt - a.createdAt));
        setIsLoading(false);
      }
    });
    return () => unsubscribe();
  }, [project.id]);

  // Statistics calculations
  const completedSessions = useMemo(() =>
    sessions.filter(s => s.status === 'completed'),
    [sessions]
  );

  const pairStats: PairStatistics[] = useMemo(() =>
    project.config.semanticPairs.map(pair =>
      calculatePairStatistics(completedSessions, pair, project.config.scale)
    ),
    [completedSessions, project.config]
  );

  const groupStats: GroupStatistics[] = useMemo(() =>
    compareGroups(completedSessions, project.config.semanticPairs, project.config.scale),
    [completedSessions, project.config]
  );

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
        brand={{ name: 'SemDiff', icon: brandIcon, onClick: onBack }}
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
              <StatCard label="Gruppi" value={groupStats.length} />
            </div>

            {/* Quick Actions */}
            <Card>
              <CardContent className="p-6">
                <h2 className="font-semibold text-foreground mb-4">Azioni Rapide</h2>
                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={() => { setShowCreateSession(true); setGeneratedLink(null); }}
                  >
                    + Crea Link Sessione
                  </Button>
                  {completedSessions.length > 0 && (
                    <Button
                      variant="secondary"
                      onClick={() => generateCSV(sessions, project)}
                    >
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
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
                  <div>
                    <p className="text-muted-foreground">Scala</p>
                    <p className="font-medium text-foreground">{project.config.scale.points} punti</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Modalita</p>
                    <p className="font-medium text-foreground">
                      {project.config.scale.mode === 'discrete' ? 'Discreta' : 'Continua'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Randomizzazione</p>
                    <p className="font-medium text-foreground">
                      {project.config.randomization.enabled ? 'Attiva' : 'Disattiva'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Differenziali</p>
                    <p className="font-medium text-foreground">{project.config.semanticPairs.length}</p>
                  </div>
                </div>

                {/* Pairs List */}
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-xs text-muted-foreground font-medium mb-2">Coppie Semantiche</p>
                  <div className="flex flex-wrap gap-2">
                    {project.config.semanticPairs.map(pair => (
                      <span key={pair.id} className="px-2 py-1 bg-background rounded text-xs text-muted-foreground">
                        {pair.leftTerm} &#8596; {pair.rightTerm}
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
              <Button
                onClick={() => { setShowCreateSession(true); setGeneratedLink(null); }}
              >
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
                {/* Statistics Table */}
                <Card className="overflow-hidden">
                  <div className="p-4 border-b border-border">
                    <h2 className="font-semibold text-foreground">Statistiche per Differenziale</h2>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50 hover:bg-muted/50">
                        <TableHead className="text-xs">Differenziale</TableHead>
                        <TableHead className="text-xs text-center">Media</TableHead>
                        <TableHead className="text-xs text-center">Dev. Std.</TableHead>
                        <TableHead className="text-xs text-center">Mediana</TableHead>
                        <TableHead className="text-xs text-center">Min/Max</TableHead>
                        <TableHead className="text-xs text-center">N</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pairStats.map(stat => (
                        <TableRow key={stat.pairId}>
                          <TableCell>
                            <span className="text-sm text-foreground">
                              {stat.leftTerm} &#8596; {stat.rightTerm}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={`text-sm font-medium ${
                              stat.mean > 10 ? 'text-primary' :
                              stat.mean < -10 ? 'text-emerald-600' :
                              'text-muted-foreground'
                            }`}>
                              {stat.mean > 0 ? '+' : ''}{stat.mean}
                            </span>
                          </TableCell>
                          <TableCell className="text-center text-sm text-muted-foreground">{stat.stdDev}</TableCell>
                          <TableCell className="text-center text-sm text-muted-foreground">{stat.median}</TableCell>
                          <TableCell className="text-center text-sm text-muted-foreground">
                            {stat.min} / {stat.max}
                          </TableCell>
                          <TableCell className="text-center text-sm text-muted-foreground">{stat.count}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>

                {/* Distribution Charts per coppia */}
                <div className="space-y-4">
                  <h2 className="font-semibold text-foreground">Distribuzione per Differenziale</h2>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {project.config.semanticPairs.map(pair => {
                      const stat = pairStats.find(s => s.pairId === pair.id);
                      if (!stat) return null;
                      return (
                        <DistributionChart
                          key={pair.id}
                          pair={pair}
                          stats={stat}
                          sessions={completedSessions}
                          scalePoints={project.config.scale.points}
                          scaleMode={project.config.scale.mode}
                        />
                      );
                    })}
                  </div>
                </div>

                {/* Group Comparison */}
                {groupStats.length > 1 && (
                  <Card className="p-6">
                    <h2 className="font-semibold text-foreground mb-4">Confronto Gruppi</h2>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent">
                            <TableHead className="text-xs">Gruppo</TableHead>
                            <TableHead className="text-xs text-center">N</TableHead>
                            {project.config.semanticPairs.map(pair => (
                              <TableHead key={pair.id} className="text-xs text-center">
                                {pair.leftTerm.substring(0, 8)}...
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {groupStats.map(group => (
                            <TableRow key={group.groupId}>
                              <TableCell className="text-sm font-medium text-foreground">{group.groupLabel}</TableCell>
                              <TableCell className="text-center text-sm text-muted-foreground">{group.participantCount}</TableCell>
                              {group.pairStats.map(stat => (
                                <TableCell key={stat.pairId} className="text-center text-sm text-muted-foreground">
                                  {stat.mean > 0 ? '+' : ''}{stat.mean}
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
                  <Button
                    variant="secondary"
                    onClick={() => generateCSV(sessions, project)}
                  >
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

      <Footer appName="SemDiff" appDescription="a semantic differential tool" />

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
                  <Input
                    type="text"
                    readOnly
                    value={generatedLink}
                    className="flex-1"
                  />
                  <Button
                    onClick={() => copyToClipboard(generatedLink)}
                  >
                    Copia
                  </Button>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button
                  variant="secondary"
                  onClick={() => setShowCreateSession(false)}
                >
                  Chiudi
                </Button>
                <Button
                  onClick={() => setGeneratedLink(null)}
                >
                  Crea Altro
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label className="mb-1 block">
                  Nome Partecipante (opzionale)
                </Label>
                <Input
                  type="text"
                  value={newParticipantName}
                  onChange={(e) => setNewParticipantName(e.target.value)}
                  placeholder="Es. Mario Rossi"
                />
              </div>
              <div>
                <Label className="mb-1 block">
                  Gruppo (opzionale)
                </Label>
                <Input
                  type="text"
                  value={newGroupLabel}
                  onChange={(e) => setNewGroupLabel(e.target.value)}
                  placeholder="Es. Gruppo A, Marketing, Under 30"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  variant="secondary"
                  onClick={() => setShowCreateSession(false)}
                >
                  Annulla
                </Button>
                <Button
                  onClick={handleCreateSession}
                  isLoading={isCreating}
                >
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
                {viewingSession.groupLabel && `${viewingSession.groupLabel} • `}
                {formatDateTime(viewingSession.completedAt || viewingSession.createdAt)}
              </p>
            )}
          </DialogHeader>
          {viewingSession && (
            <div className="space-y-4">
              {viewingSession.responses.map(resp => {
                const pair = project.config.semanticPairs.find(p => p.id === resp.pairId);
                if (!pair) return null;

                const percentage = ((resp.value + 50) / 100) * 100;

                return (
                  <div key={resp.pairId} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{pair.leftTerm}</span>
                      <span className="text-muted-foreground">{pair.rightTerm}</span>
                    </div>
                    <div className="relative h-3 bg-muted rounded-full overflow-hidden">
                      <div
                        className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-primary rounded-full"
                        style={{ left: `calc(${percentage}% - 6px)` }}
                      />
                    </div>
                    <div className="text-center">
                      <span className="text-xs text-muted-foreground">
                        Valore: {resp.value > 0 ? '+' : ''}{resp.value}
                        {resp.wasFlipped && ' (invertito)'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
