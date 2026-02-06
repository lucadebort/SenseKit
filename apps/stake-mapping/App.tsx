
import React, { useState, useEffect, useCallback } from 'react';
import { InterviewView } from './components/InterviewView';
import { DashboardView } from './components/DashboardView';
import { ProjectList } from './components/ProjectList';
import { InterviewSession, Project } from './types';
import { getSessionById, getProjectById, claimSession, getAllProjects, slugify } from './utils';
import { isFirebaseConfigured, loginAdmin, loginAnonymous, logoutAdmin, subscribeToAuth, auth } from './firebase';
import {
  LoadingScreen,
  LoginScreen,
  Alert,
  Footer,
  Separator,
  Button,
  Toaster,
} from '@sensekit/shared-ui';

enum ViewMode {
  LOGIN = 'LOGIN',
  PROJECT_LIST = 'PROJECT_LIST',
  DASHBOARD = 'DASHBOARD',
  INTERVIEW = 'INTERVIEW'
}

const StakeMapIcon = (
  <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" stroke="#2563eb" strokeWidth="2"/>
    <circle cx="12" cy="12" r="6" stroke="#059669" strokeWidth="2"/>
    <circle cx="12" cy="12" r="2" fill="#059669"/>
  </svg>
);

const App: React.FC = () => {
  const [view, setView] = useState<ViewMode>(ViewMode.LOGIN);

  // Data Context
  const [activeSession, setActiveSession] = useState<InterviewSession | null>(null);
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

  const [publicSessionCompleted, setPublicSessionCompleted] = useState(false);

  // --- ROUTING LOGIC ---

  const navigate = (path: string) => {
      try {
        window.history.pushState({}, '', path);
      } catch (e) {
        console.warn("Navigation URL update failed (likely restricted environment). Proceeding with in-app navigation.", e);
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

      // 1. PUBLIC INTERVIEW LINK (?session=...)
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
                      setView(ViewMode.INTERVIEW);
                  } else {
                      setLoginError("Project associated with this session was not found.");
                      setView(ViewMode.LOGIN);
                  }
              } else {
                  setLoginError("Session ID invalid or not found.");
                  setView(ViewMode.LOGIN);
              }
          } catch (e: any) {
              console.error("Public access error", e);
              let msg = e.message;
              if (e.code === 'auth/admin-restricted-operation' || e.code === 'auth/operation-not-allowed') {
                  msg = "Anonymous Authentication is not enabled in the Firebase Console. Please enable it in Authentication > Sign-in method.";
              } else if (e.code === 'auth/network-request-failed') {
                  msg = "Network error. Please check your internet connection.";
              }
              setLoginError(msg);
              setView(ViewMode.LOGIN);
          }
          setIsLoading(false);
          return;
      }

      // 2. ADMIN ROUTES (/projects/...)
      const parts = path.split('/').filter(Boolean);

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

      if (parts[0] === 'projects' && parts.length === 1) {
          setActiveProject(null);
          setView(ViewMode.PROJECT_LIST);
          setIsLoading(false);
          return;
      }

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
                  }
                  else {
                      setInitialSessionId(null);
                      const tab = parts[2] || 'overview';
                      setCurrentTab(tab);
                      setView(ViewMode.DASHBOARD);
                  }
              } else {
                  console.warn("Project slug not found:", projectSlug);
                  navigate('/projects');
              }
          } catch (e) {
              console.error("Routing error", e);
              setView(ViewMode.PROJECT_LIST);
          }
          setIsLoading(false);
          return;
      }

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
          setLoginError("Login failed. Check credentials.");
      } finally {
          setEmailInput('');
          setPasswordInput('');
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
    return <LoadingScreen message="Initializing Session..." />;
  }

  // SESSION COMPLETED
  if (publicSessionCompleted) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center shadow-sm mb-6 border border-emerald-100">
          <svg className="w-10 h-10 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Session Closed</h1>
        <p className="text-muted-foreground text-sm max-w-sm mx-auto leading-relaxed mb-6">
          Thank you! Your responses have been successfully recorded. This session is now locked and cannot be edited further.
        </p>
        <Separator className="w-12 mx-auto" />
        <p className="text-[10px] text-muted-foreground mt-6">StakeMap &bull; 2026</p>
      </div>
    );
  }

  // PUBLIC INTERVIEW VIEW
  if (view === ViewMode.INTERVIEW && activeSession && activeProject) {
    return (
      <InterviewView
          session={activeSession}
          project={activeProject}
          onComplete={(updatedSession) => {
              setActiveSession(updatedSession);
          }}
      />
    );
  }

  // ADMIN DASHBOARD
  if (view === ViewMode.DASHBOARD && activeProject) {
    return (
      <DashboardView
          project={activeProject}
          initialTab={currentTab}
          initialSessionId={initialSessionId}
          onBack={() => navigate('/projects')}
          onProjectUpdate={(p) => setActiveProject(p)}
          onLogout={handleLogout}
          onNavigate={(path) => navigate(path)}
      />
    );
  }

  // ADMIN PROJECT LIST
  if (view === ViewMode.PROJECT_LIST && isAdmin) {
    return (
      <ProjectList
        onSelectProject={(p) => navigate(`/projects/${slugify(p.name)}`)}
        onLogout={handleLogout}
      />
    );
  }

  // PUBLIC LINK ERROR STATE
  const isPublicLink = new URLSearchParams(window.location.search).get('session');
  if (isPublicLink) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 bg-card rounded-full flex items-center justify-center shadow-sm mb-6">
          <span className="text-3xl">&#9888;</span>
        </div>
        <h1 className="text-xl font-bold text-foreground mb-2">Session Unavailable</h1>
        <p className="text-muted-foreground text-sm max-w-sm mx-auto leading-relaxed mb-6">
          Unable to access the interview session.
        </p>
        {loginError && (
          <Alert variant="destructive" title="Configuration Error" className="max-w-md mx-auto mb-6 text-xs">
            {loginError}
          </Alert>
        )}
        <Separator className="w-12 mx-auto" />
        <p className="text-[10px] text-muted-foreground mt-6">StakeMap &bull; 2026</p>
      </div>
    );
  }

  // DEFAULT: ADMIN LOGIN SCREEN
  return (
    <>
      <LoginScreen
        appName="StakeMap"
        appDescription="a stakeholder mapping tool"
        appTagline="Navigate your stakeholder landscape."
        appDetailedDescription="Stake Map transforms stakeholder perceptions into clear, data-driven maps. It reveals relationship dynamics and influence patterns, helping organizations navigate complexity and make informed strategic decisions."
        icon={StakeMapIcon}
        email={emailInput}
        password={passwordInput}
        onEmailChange={setEmailInput}
        onPasswordChange={setPasswordInput}
        onSubmit={handleLogin}
        isLoading={isLoggingIn}
        error={loginError}
        firebaseWarning={!isFirebaseConfigured() ? "No Database Connected. Changes are local only." : null}
        submitLabel="Open Dashboard"
        loadingLabel="Verifying..."
      />
      <Toaster />
    </>
  );
};

export default App;
