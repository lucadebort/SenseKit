import React, { useState, useEffect } from 'react';
import { Session, Project } from './types';
import { getSessionById, getProjectById, claimSession, getAllProjects, slugify } from './utils';
import { isFirebaseConfigured, loginAdmin, loginAnonymous, logoutAdmin, subscribeToAuth, auth } from './firebase';
import { Footer } from '@sensekit/shared-ui';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { ProjectList } from './components/ProjectList';
import { DashboardView } from './components/DashboardView';
import { ParticipantView } from './components/ParticipantView';

enum ViewMode {
  LOGIN = 'LOGIN',
  PROJECT_LIST = 'PROJECT_LIST',
  DASHBOARD = 'DASHBOARD',
  PARTICIPANT = 'PARTICIPANT'
}

const App: React.FC = () => {
  const [view, setView] = useState<ViewMode>(ViewMode.LOGIN);

  // Data Context
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [currentTab, setCurrentTab] = useState('overview');
  const [initialSessionId, setInitialSessionId] = useState<string | null>(null);

  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Login State
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Track if session is already completed
  const [publicSessionCompleted, setPublicSessionCompleted] = useState(false);

  // --- ROUTING LOGIC ---

  const navigate = (path: string) => {
    try {
      window.history.pushState({}, '', path);
    } catch (e) {
      console.warn('Navigation URL update failed:', e);
    }
    handleRoute(path);
  };

  const handleRoute = async (pathOverride?: string) => {
    let path = window.location.pathname;
    let search = window.location.search;

    if (pathOverride !== undefined) {
      const parts = pathOverride.split('?');
      path = parts[0];
      search = parts[1] ? `?${parts[1]}` : '';
    }

    const searchParams = new URLSearchParams(search);
    const sessionParam = searchParams.get('session');

    // 1. PUBLIC PARTICIPANT LINK (?session=...)
    if (sessionParam) {
      setIsLoading(true);
      setPublicSessionCompleted(false);

      try {
        if (!auth.currentUser) {
          if (isFirebaseConfigured()) await loginAnonymous();
        }

        const sessionData = await getSessionById(sessionParam);

        if (sessionData) {
          if (sessionData.status === 'completed') {
            setPublicSessionCompleted(true);
            setIsLoading(false);
            return;
          }

          if (isFirebaseConfigured() && auth.currentUser && auth.currentUser.isAnonymous && !sessionData.participantUid) {
            await claimSession(sessionParam, auth.currentUser.uid);
            sessionData.participantUid = auth.currentUser.uid;
          }

          const projectData = await getProjectById(sessionData.projectId);
          if (projectData) {
            setActiveProject(projectData);
            setActiveSession(sessionData);
            setView(ViewMode.PARTICIPANT);
          } else {
            setLoginError('Progetto associato alla sessione non trovato.');
            setView(ViewMode.LOGIN);
          }
        } else {
          setLoginError('ID sessione non valido o non trovato.');
          setView(ViewMode.LOGIN);
        }
      } catch (e: any) {
        console.error('Public access error', e);
        let msg = e.message;
        if (e.code === 'auth/admin-restricted-operation' || e.code === 'auth/operation-not-allowed') {
          msg = 'Anonymous Authentication non abilitata nella Firebase Console.';
        } else if (e.code === 'auth/network-request-failed') {
          msg = 'Errore di rete. Controlla la connessione.';
        }
        setLoginError(msg);
        setView(ViewMode.LOGIN);
      }
      setIsLoading(false);
      return;
    }

    // 2. ADMIN ROUTES (/projects/...)
    const parts = path.split('/').filter(Boolean);

    // ROOT
    if (parts.length === 0) {
      if (auth.currentUser && !auth.currentUser.isAnonymous) {
        navigate('/projects');
      } else {
        setActiveProject(null);
        setView(ViewMode.LOGIN);
      }
      setIsLoading(false);
      return;
    }

    // PROJECTS LIST
    if (parts[0] === 'projects' && parts.length === 1) {
      setActiveProject(null);
      setView(ViewMode.PROJECT_LIST);
      setIsLoading(false);
      return;
    }

    // PROJECT DASHBOARD
    if (parts[0] === 'projects' && parts.length >= 2) {
      if (!auth.currentUser || auth.currentUser.isAnonymous) {
        setActiveProject(null);
        setView(ViewMode.LOGIN);
        setIsLoading(false);
        return;
      }

      const projectSlug = parts[1];
      if (!activeProject || slugify(activeProject.name) !== projectSlug) {
        setIsLoading(true);
      }

      try {
        const allProjects = await getAllProjects();
        const matchedProject = allProjects.find(p => slugify(p.name) === projectSlug);

        if (matchedProject) {
          setActiveProject(matchedProject);

          if (parts[2] === 'viewer' && parts[3]) {
            setInitialSessionId(parts[3]);
            setView(ViewMode.DASHBOARD);
          } else {
            setInitialSessionId(null);
            const tab = parts[2] || 'overview';
            setCurrentTab(tab);
            setView(ViewMode.DASHBOARD);
          }
        } else {
          console.warn('Project slug not found:', projectSlug);
          navigate('/projects');
        }
      } catch (e) {
        console.error('Routing error', e);
        setView(ViewMode.PROJECT_LIST);
      }
      setIsLoading(false);
      return;
    }

    // Fallback
    if (auth.currentUser && !auth.currentUser.isAnonymous) {
      navigate('/projects');
    } else {
      setView(ViewMode.LOGIN);
    }
    setIsLoading(false);
  };

  // --- EFFECTS ---

  useEffect(() => {
    const onPopState = () => handleRoute();
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    let isMounted = true;
    const unsubscribe = subscribeToAuth(async (user) => {
      if (!isMounted) return;

      const isPublicLink = window.location.search.includes('session=');

      if (user && !user.isAnonymous) {
        setIsAdmin(true);
        if (window.location.pathname === '/' && !window.location.search) {
          navigate('/projects');
        } else {
          handleRoute();
        }
      } else {
        setIsAdmin(false);

        if (isPublicLink) {
          await handleRoute();
        } else {
          if (window.location.pathname.startsWith('/projects')) {
            setView(ViewMode.LOGIN);
          } else {
            setView(ViewMode.LOGIN);
          }
          setIsLoading(false);
        }
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError(null);
    try {
      await loginAdmin(emailInput, passwordInput);
    } catch (error: any) {
      setLoginError('Login fallito. Verifica le credenziali.');
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await logoutAdmin();
    setActiveProject(null);
    navigate('/');
  };

  // --- RENDER ---

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
        <p className="text-slate-500 font-bold text-sm animate-pulse">Inizializzazione...</p>
      </div>
    );
  }

  // SESSION COMPLETED
  if (publicSessionCompleted) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center shadow-sm mb-6 border border-emerald-100">
          <svg className="w-10 h-10 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Sessione Completata</h1>
        <p className="text-slate-500 text-sm max-w-sm mx-auto leading-relaxed mb-6">
          Grazie! Le tue risposte sono state registrate. Questa sessione e ora chiusa.
        </p>
        <div className="h-px w-12 bg-slate-200 mx-auto"></div>
        <Footer appName="SemDiff" appDescription="a semantic differential tool" />
      </div>
    );
  }

  // PARTICIPANT VIEW
  if (view === ViewMode.PARTICIPANT && activeSession && activeProject) {
    return (
      <ErrorBoundary>
        <ParticipantView
          session={activeSession}
          project={activeProject}
          onComplete={(updatedSession) => {
            setActiveSession(updatedSession);
            setPublicSessionCompleted(true);
          }}
        />
      </ErrorBoundary>
    );
  }

  // ADMIN DASHBOARD
  if (view === ViewMode.DASHBOARD && activeProject) {
    return (
      <ErrorBoundary>
        <DashboardView
          project={activeProject}
          initialTab={currentTab}
          initialSessionId={initialSessionId}
          onBack={() => navigate('/projects')}
          onProjectUpdate={(p) => setActiveProject(p)}
          onLogout={handleLogout}
          onNavigate={(path) => navigate(path)}
        />
      </ErrorBoundary>
    );
  }

  // ADMIN PROJECT LIST
  if (view === ViewMode.PROJECT_LIST && isAdmin) {
    return (
      <ErrorBoundary>
        <ProjectList
          onSelectProject={(p) => navigate(`/projects/${slugify(p.name)}`)}
          onLogout={handleLogout}
        />
      </ErrorBoundary>
    );
  }

  // PUBLIC LINK ERROR
  const isPublicLink = new URLSearchParams(window.location.search).get('session');
  if (isPublicLink) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-6">
          <span className="text-3xl">&#9888;</span>
        </div>
        <h1 className="text-xl font-bold text-slate-800 mb-2">Sessione Non Disponibile</h1>
        <p className="text-slate-500 text-sm max-w-sm mx-auto leading-relaxed mb-6">
          Impossibile accedere alla sessione.
        </p>
        {loginError && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg text-xs font-mono mb-6 max-w-md mx-auto border border-red-100 text-left">
            <strong>Errore:</strong><br />
            {loginError}
          </div>
        )}
        <Footer appName="SemDiff" appDescription="a semantic differential tool" />
      </div>
    );
  }

  // DEFAULT: LOGIN SCREEN
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4 font-sans text-slate-800 relative">
      <div className="bg-white p-10 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] max-w-[480px] w-full border border-slate-100 mb-8">

        {/* ICON */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center">
            <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <line x1="4" y1="12" x2="20" y2="12" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" />
              <circle cx="4" cy="12" r="3" stroke="#059669" strokeWidth="2" fill="white" />
              <circle cx="20" cy="12" r="3" stroke="#059669" strokeWidth="2" fill="white" />
              <circle cx="12" cy="12" r="2" fill="#2563eb" />
            </svg>
          </div>
        </div>

        {/* TEXT */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Semantic Differential</h1>
          <p className="text-sm font-medium text-slate-500 mb-4">Analisi del posizionamento valoriale</p>
          <p className="text-sm text-slate-500 leading-relaxed px-2">
            Strumento per misurare atteggiamenti e percezioni attraverso scale bipolari.
            Crea differenziali semantici personalizzati e analizza i risultati con statistiche avanzate.
          </p>
        </div>

        <div className="flex items-center gap-4 mb-8">
          <div className="h-px bg-slate-200 flex-1"></div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ADMIN ACCESS</span>
          <div className="h-px bg-slate-200 flex-1"></div>
        </div>

        {/* FORM */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <input
              type="email"
              placeholder="Email"
              required
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              className="w-full h-12 px-4 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all"
            />
          </div>
          <div>
            <input
              type="password"
              placeholder="Password"
              required
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              className="w-full h-12 px-4 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all"
            />
            {loginError && <p className="text-red-500 text-xs mt-2 text-center">{loginError}</p>}
          </div>
          <button
            type="submit"
            disabled={isLoggingIn}
            className="w-full h-12 bg-white border border-slate-200 text-slate-700 font-bold rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-center gap-2 shadow-sm"
          >
            {isLoggingIn && (
              <svg className="animate-spin h-4 w-4 text-slate-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            {isLoggingIn ? 'Verifica...' : 'Apri Dashboard'}
          </button>
        </form>

        {!isFirebaseConfigured() && (
          <p className="mt-6 text-[10px] text-center text-red-500 bg-red-50 p-2 rounded border border-red-100">
            &#9888; Nessun Database Connesso. Le modifiche sono solo locali.
          </p>
        )}
      </div>

      <Footer appName="SemDiff" appDescription="a semantic differential tool" />
    </div>
  );
};

export default App;
