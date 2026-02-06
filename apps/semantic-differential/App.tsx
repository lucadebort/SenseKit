import React, { useState, useEffect } from 'react';
import { Session, Project } from './types';
import { getSessionById, getProjectById, claimSession, getAllProjects, slugify } from './utils';
import { isFirebaseConfigured, loginAdmin, loginAnonymous, logoutAdmin, subscribeToAuth, auth } from './firebase';
import { Footer, LoadingScreen, LoginScreen, Alert } from '@sensekit/shared-ui';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { ProjectList } from './components/ProjectList';
import { DashboardView } from './components/DashboardView';
import { ParticipantView } from './components/ParticipantView';

const semDiffIcon = (
  <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <line x1="4" y1="12" x2="20" y2="12" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" />
    <circle cx="4" cy="12" r="3" stroke="#059669" strokeWidth="2" fill="white" />
    <circle cx="20" cy="12" r="3" stroke="#059669" strokeWidth="2" fill="white" />
    <circle cx="12" cy="12" r="2" fill="#2563eb" />
  </svg>
);

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
    return <LoadingScreen message="Inizializzazione..." />;
  }

  // SESSION COMPLETED
  if (publicSessionCompleted) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center shadow-sm mb-6 border border-emerald-100">
          <svg className="w-10 h-10 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Sessione Completata</h1>
        <p className="text-muted-foreground text-sm max-w-sm mx-auto leading-relaxed mb-6">
          Grazie! Le tue risposte sono state registrate. Questa sessione e ora chiusa.
        </p>
        <div className="h-px w-12 bg-border mx-auto"></div>
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
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 bg-card rounded-full flex items-center justify-center shadow-sm mb-6">
          <span className="text-3xl">&#9888;</span>
        </div>
        <h1 className="text-xl font-bold text-foreground mb-2">Sessione Non Disponibile</h1>
        <p className="text-muted-foreground text-sm max-w-sm mx-auto leading-relaxed mb-6">
          Impossibile accedere alla sessione.
        </p>
        {loginError && (
          <Alert variant="destructive" className="max-w-md mx-auto mb-6 text-left text-xs font-mono">
            {loginError}
          </Alert>
        )}
        <Footer appName="SemDiff" appDescription="a semantic differential tool" />
      </div>
    );
  }

  // DEFAULT: LOGIN SCREEN
  return (
    <LoginScreen
      appName="Semantic Differential"
      appDescription="a semantic differential tool"
      appTagline="Analisi del posizionamento valoriale"
      appDetailedDescription="Strumento per misurare atteggiamenti e percezioni attraverso scale bipolari. Crea differenziali semantici personalizzati e analizza i risultati con statistiche avanzate."
      icon={semDiffIcon}
      email={emailInput}
      password={passwordInput}
      onEmailChange={setEmailInput}
      onPasswordChange={setPasswordInput}
      onSubmit={handleLogin}
      isLoading={isLoggingIn}
      error={loginError}
      submitLabel="Apri Dashboard"
      loadingLabel="Verifica..."
      firebaseWarning={!isFirebaseConfigured() ? '⚠ Nessun Database Connesso. Le modifiche sono solo locali.' : null}
    />
  );
};

export default App;
