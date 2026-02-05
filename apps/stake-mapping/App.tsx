
import React, { useState, useEffect, useCallback } from 'react';
import { InterviewView } from './components/InterviewView';
import { DashboardView } from './components/DashboardView';
import { ProjectList } from './components/ProjectList';
import { InterviewSession, Project } from './types';
import { getSessionById, getProjectById, claimSession, getAllProjects, slugify } from './utils';
import { isFirebaseConfigured, loginAdmin, loginAnonymous, logoutAdmin, subscribeToAuth, auth } from './firebase';
import { Footer } from '@sensekit/shared-ui';

enum ViewMode {
  LOGIN = 'LOGIN',
  PROJECT_LIST = 'PROJECT_LIST',
  DASHBOARD = 'DASHBOARD',
  INTERVIEW = 'INTERVIEW'
}

const App: React.FC = () => {
  const [view, setView] = useState<ViewMode>(ViewMode.LOGIN);
  
  // Data Context
  const [activeSession, setActiveSession] = useState<InterviewSession | null>(null);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [currentTab, setCurrentTab] = useState('overview'); 
  const [initialSessionId, setInitialSessionId] = useState<string | null>(null); // For Admin Viewer deep linking
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Login State
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // New State: Track if public session is already done
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

      // If we provided a path manually (e.g. via navigate), use it instead of window.location
      // This handles cases where pushState failed but we still want to change views.
      if (pathOverride !== undefined) {
          const parts = pathOverride.split('?');
          path = parts[0];
          search = parts[1] ? `?${parts[1]}` : '';
      }

      const searchParams = new URLSearchParams(search);
      const sessionParam = searchParams.get('session');

      // 1. PUBLIC INTERVIEW LINK (?session=...)
      if (sessionParam) {
          // Force loading state true while processing public link
          setIsLoading(true);
          setPublicSessionCompleted(false); // Reset default

          try {
              // Ensure anonymous auth (INVISIBLE BACKGROUND PROCESS)
              if (!auth.currentUser) {
                  if (isFirebaseConfigured()) await loginAnonymous();
              }
              
              const sessionData = await getSessionById(sessionParam);
              
              if (sessionData) {
                  // SECURITY CHECK: If session is completed, BLOCK ACCESS
                  if (sessionData.status === 'completed') {
                      setPublicSessionCompleted(true);
                      setIsLoading(false);
                      return;
                  }

                  // Claim logic
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
              // Handle common Firebase Auth configuration errors gracefully
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

      // PROJECT DASHBOARD (or Viewer)
      if (parts[0] === 'projects' && parts.length >= 2) {
          // Admin Check
          if (!auth.currentUser || auth.currentUser.isAnonymous) {
              setActiveProject(null);
              setView(ViewMode.LOGIN);
              setIsLoading(false);
              return;
          }

          const projectSlug = parts[1];
          // Only set loading if we need to fetch
          if (!activeProject || slugify(activeProject.name) !== projectSlug) {
             setIsLoading(true);
          }
          
          try {
              const allProjects = await getAllProjects();
              const matchedProject = allProjects.find(p => slugify(p.name) === projectSlug);

              if (matchedProject) {
                  setActiveProject(matchedProject);

                  // Check if it's the Admin Viewer URL
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

      // Fallback
      if (auth.currentUser && !auth.currentUser.isAnonymous) {
          navigate('/projects');
      } else {
          setView(ViewMode.LOGIN);
      }
      setIsLoading(false);
  };

  // --- EFFECTS ---

  // 1. Handle Browser Back/Forward (PopState)
  useEffect(() => {
      const onPopState = () => handleRoute();
      window.addEventListener('popstate', onPopState);
      return () => window.removeEventListener('popstate', onPopState);
  }, []); 

  // 2. Initial Load & Auth Subscription
  useEffect(() => {
      let isMounted = true;
      const unsubscribe = subscribeToAuth(async (user) => {
           if (!isMounted) return;
           
           const isPublicLink = window.location.search.includes('session=');

           if (user && !user.isAnonymous) {
               // ADMIN LOGGED IN
               setIsAdmin(true);
               // Use window.location directly here since no pathOverride
               if (window.location.pathname === '/' && !window.location.search) {
                   navigate('/projects');
               } else {
                   handleRoute(); 
               }
           } else {
               // NOT ADMIN (Anonymous or Null)
               setIsAdmin(false);
               
               if (isPublicLink) {
                   // CRITICAL: Await handleRoute logic BEFORE turning off loading.
                   // This ensures anonymous login completes in background.
                   await handleRoute(); 
               } else {
                   // If trying to access admin route without auth
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
          // Subscription will trigger handleRoute
      } catch (error: any) {
          setLoginError("Login failed. Check credentials.");
      } finally {
          // Clear credentials from memory for security
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

  // --- RENDER HELPERS ---

  if (isLoading) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
            <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
            <p className="text-slate-500 font-bold text-sm animate-pulse">Initializing Session...</p>
        </div>
      );
  }

  // 0. SESSION ALREADY COMPLETED (Block access)
  if (publicSessionCompleted) {
      return (
          <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
              <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center shadow-sm mb-6 border border-emerald-100">
                  <svg className="w-10 h-10 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              </div>
              <h1 className="text-2xl font-bold text-slate-800 mb-2">Session Closed</h1>
              <p className="text-slate-500 text-sm max-w-sm mx-auto leading-relaxed mb-6">
                  Thank you! Your responses have been successfully recorded. This session is now locked and cannot be edited further.
              </p>
              <div className="h-px w-12 bg-slate-200 mx-auto"></div>
              <p className="text-[10px] text-slate-400 mt-6">StakeMap &bull; 2026</p>
          </div>
      );
  }

  // 1. PUBLIC INTERVIEW VIEW
  if (view === ViewMode.INTERVIEW && activeSession && activeProject) {
    return (
      <InterviewView 
          session={activeSession}
          project={activeProject}
          onComplete={(updatedSession) => {
              setActiveSession(updatedSession);
              // Optionally trigger the "Completed" screen after a delay or refresh
              // For now, we leave the InterviewView in its "Submitted" state 
              // which shows the "Thank you" toast and locks interactions locally.
          }}
      />
    );
  }

  // 2. ADMIN DASHBOARD
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

  // 3. ADMIN PROJECT LIST
  if (view === ViewMode.PROJECT_LIST && isAdmin) {
      return (
          <ProjectList 
            onSelectProject={(p) => navigate(`/projects/${slugify(p.name)}`)} 
            onLogout={handleLogout} 
          />
      );
  }

  // 4. PUBLIC LINK ERROR STATE (Instead of Login Screen)
  // If we are here, it means we have a session param but failed to load the interview
  // NOTE: We check window.location.search directly as fallback if route logic failed strangely,
  // but usually logic handles this in handleRoute.
  const isPublicLink = new URLSearchParams(window.location.search).get('session');
  if (isPublicLink) {
      return (
          <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-6">
                  <span className="text-3xl">⚠️</span>
              </div>
              <h1 className="text-xl font-bold text-slate-800 mb-2">Session Unavailable</h1>
              <p className="text-slate-500 text-sm max-w-sm mx-auto leading-relaxed mb-6">
                  Unable to access the interview session.
              </p>
              {loginError && (
                  <div className="bg-red-50 text-red-600 p-4 rounded-lg text-xs font-mono mb-6 max-w-md mx-auto border border-red-100 text-left">
                      <strong>Configuration Error:</strong><br/>
                      {loginError}
                  </div>
              )}
              <div className="h-px w-12 bg-slate-200 mx-auto"></div>
              <p className="text-[10px] text-slate-400 mt-6">StakeMap &bull; 2026</p>
          </div>
      );
  }

  // 5. DEFAULT: ADMIN LOGIN SCREEN
  // Only shown if NO session param is present
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4 font-sans text-slate-800 relative">
      
      <div className="bg-white p-10 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] max-w-[480px] w-full border border-slate-100 mb-8">
          
          {/* ICON */}
          <div className="flex justify-center mb-6">
             <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center">
                <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="10" stroke="#2563eb" strokeWidth="2"/>
                    <circle cx="12" cy="12" r="6" stroke="#059669" strokeWidth="2"/>
                    <circle cx="12" cy="12" r="2" fill="#059669"/>
                </svg>
             </div>
          </div>
          
          {/* TEXT CONTENT */}
          <div className="text-center mb-8">
             <h1 className="text-2xl font-bold text-slate-900 mb-1">StakeMap</h1>
             <p className="text-sm font-medium text-slate-500 mb-4">Navigate your stakeholder landscape.</p>
             <p className="text-sm text-slate-500 leading-relaxed px-2">
                Stake Map transforms stakeholder perceptions into clear, data-driven maps.
                It reveals relationship dynamics and influence patterns, helping organizations navigate complexity and make informed strategic decisions.
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
                  {isLoggingIn ? 'Verifying...' : 'Open Dashboard'}
              </button>
          </form>

          {!isFirebaseConfigured() && (
              <p className="mt-6 text-[10px] text-center text-red-500 bg-red-50 p-2 rounded border border-red-100">
                  ⚠️ No Database Connected. Changes are local only.
              </p>
          )}
      </div>

      <Footer appName="StakeMap" appDescription="a stakeholder mapping tool" />
    </div>
  );
};

export default App;
