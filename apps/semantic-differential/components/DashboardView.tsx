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

  // Mobile menu
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

  const NavLink = ({ tab, label, mobile = false }: { tab: TabType; label: string; mobile?: boolean }) => (
    <button
      onClick={() => { switchTab(tab); if (mobile) setIsMobileMenuOpen(false); }}
      className={`
        ${mobile
          ? 'w-full text-left px-4 py-3 border-l-4'
          : 'h-full flex items-center px-2 text-sm font-medium border-b-[3px] pt-0.5'
        }
        transition-colors
        ${activeTab === tab
          ? (mobile ? 'bg-primary/10 border-primary text-primary' : 'border-primary text-primary')
          : (mobile ? 'border-transparent text-muted-foreground hover:bg-muted/50' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border')
        }
      `}
    >
      {label}
    </button>
  );

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col pb-20">
      {/* HEADER */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-card/95 backdrop-blur shadow-sm border-b border-border">
        <div className="w-full max-w-7xl mx-auto px-6 h-12 flex justify-between items-center">

          {/* Left: Brand & Context */}
          <div className="flex items-center gap-4 md:gap-6 shrink-0">
            <button onClick={onBack} className="flex items-center gap-3 group outline-none shrink-0" title="Torna ai Progetti">
              <div className="w-8 h-8 bg-card rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm border border-border">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M4 6h16M4 12h16M4 18h16" stroke="#2563eb" strokeWidth="2" strokeLinecap="round"/>
                  <circle cx="8" cy="6" r="2" fill="#059669"/>
                  <circle cx="16" cy="12" r="2" fill="#059669"/>
                  <circle cx="10" cy="18" r="2" fill="#059669"/>
                </svg>
              </div>
              <span className="font-bold text-foreground text-lg tracking-tight group-hover:text-primary transition-colors">SemDiff</span>
            </button>

            <div className="h-6 w-px bg-border hidden sm:block"></div>

            <div className="flex items-center gap-2 max-w-[150px] sm:max-w-[250px] hidden sm:flex">
              {project.icon && (
                <div className="w-6 h-6 rounded bg-muted flex items-center justify-center overflow-hidden shrink-0">
                  <span className="text-sm">{project.icon}</span>
                </div>
              )}
              <h1 className="text-sm font-bold text-muted-foreground truncate">{project.name}</h1>
            </div>
          </div>

          {/* Center Navigation */}
          <nav className="hidden md:flex items-center gap-8 h-full">
            <NavLink tab="overview" label="Panoramica" />
            <NavLink tab="sessions" label="Sessioni" />
            <NavLink tab="analysis" label="Analisi" />
            <NavLink tab="settings" label="Impostazioni" />
          </nav>

          {/* Right: Logout & Mobile Menu */}
          <div className="flex items-center gap-4 shrink-0">
            <button
              onClick={onLogout}
              className="text-xs font-bold text-muted-foreground hover:text-destructive uppercase tracking-wider transition-colors hidden md:block"
            >
              Logout
            </button>

            {/* Mobile Hamburger */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted/50"
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
          <div className="md:hidden bg-card border-t border-border shadow-lg">
            <NavLink tab="overview" label="Panoramica" mobile />
            <NavLink tab="sessions" label="Sessioni" mobile />
            <NavLink tab="analysis" label="Analisi" mobile />
            <NavLink tab="settings" label="Impostazioni" mobile />
            <div className="border-t border-border">
              <button
                onClick={onLogout}
                className="w-full text-left px-4 py-3 text-destructive font-medium hover:bg-destructive/10"
              >
                Logout
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Content - with padding-top for fixed header */}
      <div className="max-w-7xl mx-auto px-6 py-6 mt-12 flex-1">
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <StatCard label="Sessioni Totali" value={sessions.length} />
              <StatCard label="Completate" value={completedSessions.length} valueClassName="text-emerald-600" />
              <StatCard label="In Attesa" value={sessions.filter(s => s.status === 'created').length} />
              <StatCard label="Gruppi" value={groupStats.length} />
            </div>

            {/* Quick Actions */}
            <Card>
              <CardContent className="p-6">
                <h2 className="font-bold text-foreground mb-4">Azioni Rapide</h2>
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
                <h2 className="font-bold text-foreground mb-4">Configurazione</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
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
              <h2 className="font-bold text-foreground">Sessioni ({sessions.length})</h2>
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
                    <h2 className="font-bold text-foreground">Statistiche per Differenziale</h2>
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
                  <h2 className="font-bold text-foreground">Distribuzione per Differenziale</h2>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
                    <h2 className="font-bold text-foreground mb-4">Confronto Gruppi</h2>
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
      </div>

      <Footer appName="SemDiff" appDescription="a semantic differential tool" />

      {/* Create Session Modal */}
      {showCreateSession && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-foreground mb-4">
              {generatedLink ? 'Link Generato' : 'Nuova Sessione'}
            </h3>

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
          </div>
        </div>
      )}

      {/* Session Viewer Modal */}
      {viewingSession && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="font-bold text-foreground">
                  {viewingSession.participantName || 'Partecipante Anonimo'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {viewingSession.groupLabel && `${viewingSession.groupLabel} • `}
                  {formatDateTime(viewingSession.completedAt || viewingSession.createdAt)}
                </p>
              </div>
              <button
                onClick={() => setViewingSession(null)}
                className="p-2 text-muted-foreground hover:text-foreground"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
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
          </div>
        </div>
      )}
    </div>
  );
};
