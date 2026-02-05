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
import { Footer } from '@sensekit/shared-ui';
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

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      created: 'bg-slate-100 text-slate-600',
      in_progress: 'bg-amber-100 text-amber-700',
      completed: 'bg-emerald-100 text-emerald-700'
    };
    const labels = {
      created: 'In attesa',
      in_progress: 'In corso',
      completed: 'Completata'
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status as keyof typeof styles] || styles.created}`}>
        {labels[status as keyof typeof labels] || status}
      </span>
    );
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
          ? (mobile ? 'bg-blue-50 border-blue-600 text-blue-700' : 'border-blue-600 text-blue-600')
          : (mobile ? 'border-transparent text-slate-600 hover:bg-slate-50' : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300')
        }
      `}
    >
      {label}
    </button>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-20">
      {/* HEADER */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur shadow-sm border-b border-slate-200">
        <div className="w-full max-w-7xl mx-auto px-6 h-12 flex justify-between items-center">

          {/* Left: Brand & Context */}
          <div className="flex items-center gap-4 md:gap-6 shrink-0">
            <button onClick={onBack} className="flex items-center gap-3 group outline-none shrink-0" title="Torna ai Progetti">
              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm border border-slate-200">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M4 6h16M4 12h16M4 18h16" stroke="#2563eb" strokeWidth="2" strokeLinecap="round"/>
                  <circle cx="8" cy="6" r="2" fill="#059669"/>
                  <circle cx="16" cy="12" r="2" fill="#059669"/>
                  <circle cx="10" cy="18" r="2" fill="#059669"/>
                </svg>
              </div>
              <span className="font-bold text-slate-800 text-lg tracking-tight group-hover:text-blue-600 transition-colors">SemDiff</span>
            </button>

            <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>

            <div className="flex items-center gap-2 max-w-[150px] sm:max-w-[250px] hidden sm:flex">
              {project.icon && (
                <div className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                  <span className="text-sm">{project.icon}</span>
                </div>
              )}
              <h1 className="text-sm font-bold text-slate-600 truncate">{project.name}</h1>
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
          <div className="md:hidden bg-white border-t border-slate-200 shadow-lg">
            <NavLink tab="overview" label="Panoramica" mobile />
            <NavLink tab="sessions" label="Sessioni" mobile />
            <NavLink tab="analysis" label="Analisi" mobile />
            <NavLink tab="settings" label="Impostazioni" mobile />
            <div className="border-t border-slate-100">
              <button
                onClick={onLogout}
                className="w-full text-left px-4 py-3 text-red-600 font-medium hover:bg-red-50"
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
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <p className="text-xs text-slate-500 font-medium">Sessioni Totali</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">{sessions.length}</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <p className="text-xs text-slate-500 font-medium">Completate</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">{completedSessions.length}</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <p className="text-xs text-slate-500 font-medium">In Attesa</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">
                  {sessions.filter(s => s.status === 'created').length}
                </p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <p className="text-xs text-slate-500 font-medium">Gruppi</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">{groupStats.length}</p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="font-bold text-slate-800 mb-4">Azioni Rapide</h2>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => { setShowCreateSession(true); setGeneratedLink(null); }}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition-colors"
                >
                  + Crea Link Sessione
                </button>
                {completedSessions.length > 0 && (
                  <button
                    onClick={() => generateCSV(sessions, project)}
                    className="px-4 py-2 bg-slate-100 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-200 transition-colors"
                  >
                    Esporta CSV
                  </button>
                )}
              </div>
            </div>

            {/* Configuration Summary */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="font-bold text-slate-800 mb-4">Configurazione</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-slate-500">Scala</p>
                  <p className="font-medium text-slate-800">{project.config.scale.points} punti</p>
                </div>
                <div>
                  <p className="text-slate-500">Modalita</p>
                  <p className="font-medium text-slate-800">
                    {project.config.scale.mode === 'discrete' ? 'Discreta' : 'Continua'}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">Randomizzazione</p>
                  <p className="font-medium text-slate-800">
                    {project.config.randomization.enabled ? 'Attiva' : 'Disattiva'}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">Differenziali</p>
                  <p className="font-medium text-slate-800">{project.config.semanticPairs.length}</p>
                </div>
              </div>

              {/* Pairs List */}
              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-xs text-slate-500 font-medium mb-2">Coppie Semantiche</p>
                <div className="flex flex-wrap gap-2">
                  {project.config.semanticPairs.map(pair => (
                    <span key={pair.id} className="px-2 py-1 bg-slate-50 rounded text-xs text-slate-600">
                      {pair.leftTerm} &#8596; {pair.rightTerm}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SESSIONS TAB */}
        {activeTab === 'sessions' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="font-bold text-slate-800">Sessioni ({sessions.length})</h2>
              <button
                onClick={() => { setShowCreateSession(true); setGeneratedLink(null); }}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition-colors"
              >
                + Nuova Sessione
              </button>
            </div>

            {sessions.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                <p className="text-slate-500">Nessuna sessione. Crea un link per iniziare.</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">Partecipante</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">Gruppo</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">Stato</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">Data</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-slate-500">Azioni</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sessions.map(session => (
                      <tr key={session.sessionId} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-sm text-slate-800">
                          {session.participantName || <span className="text-slate-400">Anonimo</span>}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {session.groupLabel || '-'}
                        </td>
                        <td className="px-4 py-3">
                          {getStatusBadge(session.status)}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-500">
                          {formatDate(session.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            {session.status === 'completed' && (
                              <button
                                onClick={() => setViewingSession(session)}
                                className="px-2 py-1 text-xs text-blue-600 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
                              >
                                Visualizza
                              </button>
                            )}
                            {session.status === 'created' && (
                              <button
                                onClick={() => copyToClipboard(`${window.location.origin}/?session=${session.sessionId}`)}
                                className="px-2 py-1 text-xs text-slate-600 bg-slate-100 rounded hover:bg-slate-200 transition-colors"
                              >
                                Copia Link
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteSession(session.sessionId)}
                              className="px-2 py-1 text-xs text-red-600 bg-red-50 rounded hover:bg-red-100 transition-colors"
                            >
                              Elimina
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ANALYSIS TAB */}
        {activeTab === 'analysis' && (
          <div className="space-y-6">
            {completedSessions.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                <p className="text-slate-500">Nessuna sessione completata. I dati appariranno qui.</p>
              </div>
            ) : (
              <>
                {/* Statistics Table */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <div className="p-4 border-b border-slate-100">
                    <h2 className="font-bold text-slate-800">Statistiche per Differenziale</h2>
                  </div>
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">Differenziale</th>
                        <th className="text-center px-4 py-3 text-xs font-medium text-slate-500">Media</th>
                        <th className="text-center px-4 py-3 text-xs font-medium text-slate-500">Dev. Std.</th>
                        <th className="text-center px-4 py-3 text-xs font-medium text-slate-500">Mediana</th>
                        <th className="text-center px-4 py-3 text-xs font-medium text-slate-500">Min/Max</th>
                        <th className="text-center px-4 py-3 text-xs font-medium text-slate-500">N</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {pairStats.map(stat => (
                        <tr key={stat.pairId}>
                          <td className="px-4 py-3">
                            <span className="text-sm text-slate-800">
                              {stat.leftTerm} &#8596; {stat.rightTerm}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`text-sm font-medium ${
                              stat.mean > 10 ? 'text-blue-600' :
                              stat.mean < -10 ? 'text-emerald-600' :
                              'text-slate-600'
                            }`}>
                              {stat.mean > 0 ? '+' : ''}{stat.mean}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center text-sm text-slate-600">{stat.stdDev}</td>
                          <td className="px-4 py-3 text-center text-sm text-slate-600">{stat.median}</td>
                          <td className="px-4 py-3 text-center text-sm text-slate-500">
                            {stat.min} / {stat.max}
                          </td>
                          <td className="px-4 py-3 text-center text-sm text-slate-500">{stat.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Distribution Charts per coppia */}
                <div className="space-y-4">
                  <h2 className="font-bold text-slate-800">Distribuzione per Differenziale</h2>
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
                  <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <h2 className="font-bold text-slate-800 mb-4">Confronto Gruppi</h2>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-slate-200">
                            <th className="text-left px-3 py-2 text-xs font-medium text-slate-500">Gruppo</th>
                            <th className="text-center px-3 py-2 text-xs font-medium text-slate-500">N</th>
                            {project.config.semanticPairs.map(pair => (
                              <th key={pair.id} className="text-center px-3 py-2 text-xs font-medium text-slate-500">
                                {pair.leftTerm.substring(0, 8)}...
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {groupStats.map(group => (
                            <tr key={group.groupId}>
                              <td className="px-3 py-2 text-sm font-medium text-slate-800">{group.groupLabel}</td>
                              <td className="px-3 py-2 text-center text-sm text-slate-500">{group.participantCount}</td>
                              {group.pairStats.map(stat => (
                                <td key={stat.pairId} className="px-3 py-2 text-center text-sm text-slate-600">
                                  {stat.mean > 0 ? '+' : ''}{stat.mean}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Export */}
                <div className="flex gap-3">
                  <button
                    onClick={() => generateCSV(sessions, project)}
                    className="px-4 py-2 bg-slate-100 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-200 transition-colors"
                  >
                    Esporta CSV
                  </button>
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
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">
              {generatedLink ? 'Link Generato' : 'Nuova Sessione'}
            </h3>

            {generatedLink ? (
              <div className="space-y-4">
                <div className="bg-slate-50 rounded-lg p-4">
                  <p className="text-xs text-slate-500 mb-2">Link partecipante:</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={generatedLink}
                      className="flex-1 h-10 px-3 bg-white border border-slate-200 rounded-lg text-sm"
                    />
                    <button
                      onClick={() => copyToClipboard(generatedLink)}
                      className="px-3 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Copia
                    </button>
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowCreateSession(false)}
                    className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                  >
                    Chiudi
                  </button>
                  <button
                    onClick={() => setGeneratedLink(null)}
                    className="px-4 py-2 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Crea Altro
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Nome Partecipante (opzionale)
                  </label>
                  <input
                    type="text"
                    value={newParticipantName}
                    onChange={(e) => setNewParticipantName(e.target.value)}
                    placeholder="Es. Mario Rossi"
                    className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Gruppo (opzionale)
                  </label>
                  <input
                    type="text"
                    value={newGroupLabel}
                    onChange={(e) => setNewGroupLabel(e.target.value)}
                    placeholder="Es. Gruppo A, Marketing, Under 30"
                    className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    onClick={() => setShowCreateSession(false)}
                    className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                  >
                    Annulla
                  </button>
                  <button
                    onClick={handleCreateSession}
                    disabled={isCreating}
                    className="px-4 py-2 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {isCreating ? 'Creazione...' : 'Genera Link'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Session Viewer Modal */}
      {viewingSession && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800">
                  {viewingSession.participantName || 'Partecipante Anonimo'}
                </h3>
                <p className="text-sm text-slate-500">
                  {viewingSession.groupLabel && `${viewingSession.groupLabel} • `}
                  {formatDate(viewingSession.completedAt || viewingSession.createdAt)}
                </p>
              </div>
              <button
                onClick={() => setViewingSession(null)}
                className="p-2 text-slate-400 hover:text-slate-600"
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
                      <span className="text-slate-600">{pair.leftTerm}</span>
                      <span className="text-slate-600">{pair.rightTerm}</span>
                    </div>
                    <div className="relative h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-blue-600 rounded-full"
                        style={{ left: `calc(${percentage}% - 6px)` }}
                      />
                    </div>
                    <div className="text-center">
                      <span className="text-xs text-slate-500">
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
