
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Project, ProjectConfig, StakeholderDef, ZoneConfig } from '../types';
import { createProject, subscribeToProjects, subscribeToAllSessions } from '../utils';
import { Footer } from '@sensekit/shared-ui';
import { PALETTE, DEFAULT_PROJECT_CONFIG, applyGradientToZones, THEME_COLORS, BOARD_SIZE } from '../constants';
import { ZoneBackground } from './ZoneBackground';
import { IconPicker } from './IconPicker';

interface ProjectListProps {
  onSelectProject: (p: Project) => void;
  onLogout: () => void;
}

type SortField = 'name' | 'createdAt' | 'sessions' | 'status';
type SortOrder = 'asc' | 'desc';

const WIZARD_STEPS = [
    { id: 1, label: 'Info' },
    { id: 2, label: 'Stakeholder Roles' },
    { id: 3, label: 'Relationships' },
    { id: 4, label: 'Impact' },
    { id: 5, label: 'Confirm' }
];

// Helper for consistent date formatting
const formatDate = (ts: number) => new Date(ts).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });

// SVG Sort Icon Component for Consistency
const SortIcon = ({ active, direction }: { active: boolean; direction: SortOrder }) => {
    return (
        <span className="ml-1.5 inline-flex flex-col justify-center h-3 w-3 align-middle">
            {/* UP ARROW */}
            <svg 
                viewBox="0 0 10 6" 
                className={`w-2.5 h-1.5 mb-[1px] ${active && direction === 'asc' ? 'fill-slate-700' : 'fill-slate-300'}`}
                style={{ opacity: active && direction === 'desc' ? 0 : 1 }}
            >
                <path d="M5 0L10 6H0L5 0Z" />
            </svg>
            {/* DOWN ARROW */}
            <svg 
                viewBox="0 0 10 6" 
                className={`w-2.5 h-1.5 mt-[1px] ${active && direction === 'desc' ? 'fill-slate-700' : 'fill-slate-300'}`}
                style={{ opacity: active && direction === 'asc' ? 0 : 1 }}
            >
                <path d="M5 6L0 0H10L5 6Z" />
            </svg>
        </span>
    );
};

export const ProjectList: React.FC<ProjectListProps> = ({ onSelectProject, onLogout }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [sessionStats, setSessionStats] = useState<Record<string, { total: number, pending: number }>>({});
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Toolbar State
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Wizard State
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [maxStepReached, setMaxStepReached] = useState(1); // Track max progress
  const [isCreating, setIsCreating] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  
  // Logout Confirm State
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  
  // Draft Data
  const [draftName, setDraftName] = useState('');
  const [draftDesc, setDraftDesc] = useState('');
  const [draftIcon, setDraftIcon] = useState('📁');
  const [draftIconType, setDraftIconType] = useState<'emoji' | 'image'>('emoji');
  const [draftConfig, setDraftConfig] = useState<ProjectConfig>(JSON.parse(JSON.stringify(DEFAULT_PROJECT_CONFIG)));

  // Icon Picker state in wizard
  const [showIconPicker, setShowIconPicker] = useState(false);
  // Ref changed to DIV to wrap both button and picker for click-outside logic
  const iconWrapperRef = useRef<HTMLDivElement>(null);

  // Drag & Drop Refs
  const dragItem = useRef<{ index: number; type: string } | null>(null);
  const dragOverItem = useRef<number | null>(null);

  // Firebase subscriptions - run once on mount
  useEffect(() => {
    // 1. Subscribe to Projects
    const unsubProjects = subscribeToProjects(setProjects, (err) => {
        console.error(err);
        if (err.message.includes("permission_denied")) {
             setError("Permission Denied: You do not have permission to view projects. Please check your Firebase Database Rules.");
        } else {
             setError(`Error loading projects: ${err.message}`);
        }
    });

    // 2. Subscribe to ALL sessions to calculate stats efficiently
    const unsubSessions = subscribeToAllSessions((allSessions) => {
        const stats: Record<string, { total: number, pending: number }> = {};
        allSessions.forEach(s => {
            if (!stats[s.projectId]) stats[s.projectId] = { total: 0, pending: 0 };
            stats[s.projectId].total++;
            if (s.status !== 'completed') stats[s.projectId].pending++;
        });
        setSessionStats(stats);
    });

    return () => {
        unsubProjects();
        unsubSessions();
    };
  }, []);

  // Close icon picker when clicking outside - separate effect
  useEffect(() => {
    if (!showIconPicker) return;

    const handleClickOutside = (event: MouseEvent) => {
        if (iconWrapperRef.current && !iconWrapperRef.current.contains(event.target as Node)) {
            setShowIconPicker(false);
        }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showIconPicker]);

  const openWizard = () => {
      setDraftName('');
      setDraftDesc('');
      setDraftIcon('📁');
      setDraftIconType('emoji');
      setDraftConfig(JSON.parse(JSON.stringify(DEFAULT_PROJECT_CONFIG)));
      setWizardStep(1);
      setMaxStepReached(1); // Reset history
      setShowWizard(true);
      setShowCloseConfirm(false);
  };

  const handleCloseAttempt = () => {
      if (draftName.trim() || draftDesc.trim()) {
          setShowCloseConfirm(true);
      } else {
          setShowWizard(false);
      }
  };

  const handleNextStep = () => {
      // Validate Step 1
      if (wizardStep === 1 && !draftName.trim()) return;

      setWizardStep(prev => {
          const next = prev + 1;
          if (next > maxStepReached) setMaxStepReached(next);
          return next;
      });
  };

  const handleCreate = async () => {
    if (!draftName.trim()) return;
    setIsCreating(true);
    try {
        await createProject(draftName, draftDesc, draftConfig, draftIcon, draftIconType);
        setShowWizard(false);
    } catch (e: any) {
        setError("Failed to create project. Check permissions.");
    } finally {
        setIsCreating(false);
    }
  };

  // --- Drag & Drop Handlers ---
  const onDragStart = (e: React.DragEvent, index: number, type: string) => {
      dragItem.current = { index, type };
      e.dataTransfer.effectAllowed = "move";
  };

  const onDragEnter = (e: React.DragEvent, index: number) => {
      dragOverItem.current = index;
  };

  const onDragEnd = (type: 'stakeholders' | 'relationshipZones' | 'impactZones') => {
      const sourceIndex = dragItem.current?.index;
      const destinationIndex = dragOverItem.current;

      if (sourceIndex === undefined || destinationIndex === null || sourceIndex === destinationIndex) {
          dragItem.current = null;
          dragOverItem.current = null;
          return;
      }

      const list = [...draftConfig[type]] as any[];
      const itemMoved = list[sourceIndex];
      list.splice(sourceIndex, 1);
      list.splice(destinationIndex, 0, itemMoved);

      if (type !== 'stakeholders') {
           const startColor = list[0]?.color || THEME_COLORS[0];
           const updatedList = applyGradientToZones(list, startColor);
           setDraftConfig(prev => ({ ...prev, [type]: updatedList }));
      } else {
           setDraftConfig(prev => ({ ...prev, stakeholders: list }));
      }
      
      dragItem.current = null;
      dragOverItem.current = null;
  };

  // --- Draft Updaters ---

  const addStakeholder = () => {
      const newId = `sh_${Date.now()}`;
      const color = PALETTE[draftConfig.stakeholders.length % PALETTE.length];
      const count = draftConfig.stakeholders.length + 1;
      setDraftConfig(prev => ({
          ...prev,
          stakeholders: [...prev.stakeholders, { id: newId, label: `Stakeholder Role ${count}`, color }]
      }));
  };

  const removeStakeholder = (idx: number) => {
      const newArr = [...draftConfig.stakeholders];
      newArr.splice(idx, 1);
      setDraftConfig(prev => ({ ...prev, stakeholders: newArr }));
  };

  const updateStakeholder = (idx: number, field: keyof StakeholderDef, val: string) => {
      const newArr = [...draftConfig.stakeholders];
      newArr[idx] = { ...newArr[idx], [field]: val };
      setDraftConfig(prev => ({ ...prev, stakeholders: newArr }));
  };

  const updateZone = (type: 'relationshipZones' | 'impactZones', idx: number, field: keyof ZoneConfig, val: string) => {
      const newArr = [...draftConfig[type]];
      newArr[idx] = { ...newArr[idx], [field]: val };
      setDraftConfig(prev => ({ ...prev, [type]: newArr }));
  };

  // No longer needed individually, kept logic for theme change
  const handleThemeChange = (type: 'relationshipZones' | 'impactZones', color: string) => {
      let newArr = [...draftConfig[type]];
      newArr = applyGradientToZones(newArr, color);
      setDraftConfig(prev => ({ ...prev, [type]: newArr }));
  };

  const addZone = (type: 'relationshipZones' | 'impactZones') => {
      const newId = `z_${Date.now()}`;
      let newArr = [...draftConfig[type], { id: newId, label: 'New Zone', color: '#ffffff' }];
      const startColor = draftConfig[type][0]?.color || THEME_COLORS[0];
      newArr = applyGradientToZones(newArr, startColor);
      setDraftConfig(prev => ({ ...prev, [type]: newArr }));
  };

  const removeZone = (type: 'relationshipZones' | 'impactZones', idx: number) => {
       let newArr = [...draftConfig[type]];
       newArr.splice(idx, 1);
       if(newArr.length > 0) {
           const startColor = draftConfig[type][0].color;
           newArr = applyGradientToZones(newArr, startColor);
       }
       setDraftConfig(prev => ({ ...prev, [type]: newArr }));
  };


  const getProjectStats = (projectId: string) => {
      return sessionStats[projectId] || { total: 0, pending: 0 };
  };

  const renderProjectIcon = (p: Project) => {
      if (p.iconType === 'image' && p.icon) {
          return (
              <img src={p.icon} alt="icon" className="w-12 h-12 rounded-lg object-cover shadow-sm shrink-0" />
          );
      }
      return (
        <div className="w-12 h-12 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors shadow-sm shrink-0">
            {p.icon || p.name.substring(0,1).toUpperCase()}
        </div>
      );
  };

  // --- Filtering & Sorting Logic ---
  const handleSort = (field: SortField) => {
      if (sortField === field) {
          setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
      } else {
          setSortField(field);
          setSortOrder(field === 'name' ? 'asc' : 'desc'); // Default defaults
      }
  };

  const processedProjects = useMemo(() => {
      let result = projects.filter(p => 
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
          (p.description || '').toLowerCase().includes(searchQuery.toLowerCase())
      );

      return result.sort((a, b) => {
          let valA: any = '';
          let valB: any = '';

          switch (sortField) {
              case 'name':
                  valA = a.name.toLowerCase();
                  valB = b.name.toLowerCase();
                  break;
              case 'createdAt':
                  valA = a.createdAt;
                  valB = b.createdAt;
                  break;
              case 'sessions':
                  valA = getProjectStats(a.id).total;
                  valB = getProjectStats(b.id).total;
                  break;
              case 'status':
                  // Sort by pending count basically
                  valA = getProjectStats(a.id).pending;
                  valB = getProjectStats(b.id).pending;
                  break;
          }

          if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
          if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
          return 0;
      });
  }, [projects, searchQuery, sortField, sortOrder, sessionStats]);

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20">
      
      {/* NAVBAR */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-white/95 backdrop-blur shadow-sm border-b border-slate-200">
          <div className="w-full max-w-7xl mx-auto px-6 h-12 flex justify-between items-center">
               <div className="flex items-center gap-3">
                   <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-200">
                       <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                           <circle cx="12" cy="12" r="10" stroke="#2563eb" strokeWidth="2"/>
                           <circle cx="12" cy="12" r="6" stroke="#059669" strokeWidth="2"/>
                           <circle cx="12" cy="12" r="2" fill="#059669"/>
                       </svg>
                   </div>
                   <span className="font-bold text-slate-800 text-lg tracking-tight">StakeMap</span>
               </div>
               
               <button 
                  onClick={() => setShowLogoutConfirm(true)} 
                  className="text-xs font-bold text-slate-400 hover:text-red-600 uppercase tracking-wider transition-colors"
               >
                  Logout
               </button>
          </div>
      </div>

      {/* LOGOUT CONFIRM MODAL */}
      {showLogoutConfirm && (
          <div className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 border border-slate-200 animate-fade-in text-center">
                  <h3 className="text-xl font-bold text-slate-800 mb-2">Sign Out?</h3>
                  <p className="text-slate-600 mb-6 text-sm">
                      Are you sure you want to log out from the admin dashboard?
                  </p>
                  <div className="flex gap-3">
                      <button 
                        onClick={() => setShowLogoutConfirm(false)} 
                        className="flex-1 py-2.5 rounded-lg border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={onLogout} 
                        className="flex-1 py-2.5 rounded-lg bg-red-600 text-white font-bold hover:bg-red-700 transition-colors"
                      >
                        Sign Out
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* WIZARD MODAL */}
      {showWizard && (
          <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[85vh] flex flex-col overflow-hidden border border-slate-200 relative">
                  
                  {/* CLOSE CONFIRM OVERLAY */}
                  {showCloseConfirm && (
                      <div className="absolute inset-0 z-50 bg-white/90 backdrop-blur-sm flex items-center justify-center p-8">
                          <div className="max-w-md w-full text-center space-y-4">
                              <h3 className="text-xl font-bold text-slate-800">Discard Draft?</h3>
                              <p className="text-slate-600">You have unsaved changes. Are you sure you want to exit?</p>
                              <div className="flex gap-3 justify-center">
                                  <button onClick={() => setShowCloseConfirm(false)} className="px-6 py-2 bg-white border border-slate-200 rounded-lg font-bold text-slate-600 hover:bg-slate-50">Keep Editing</button>
                                  <button onClick={() => setShowWizard(false)} className="px-6 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700">Discard</button>
                              </div>
                          </div>
                      </div>
                  )}

                  {/* HEADER WITH STEPPER AND CLOSE */}
                  <div className="bg-white border-b border-slate-100 px-6 py-3 shrink-0 flex items-center justify-between gap-4">
                      
                      {/* LEFT: Title (Visible on Desktop only to prevent overlap) */}
                      <div className="shrink-0 hidden md:block w-40">
                          <h2 className="text-lg font-bold text-slate-800 whitespace-nowrap">New Project</h2>
                      </div>
                      
                      {/* CENTER: RESPONSIVE STEPPER */}
                      <div className="flex-1 flex justify-center items-center min-w-0">
                          
                          {/* MOBILE/COMPACT (< md): Arrows + Big Dots */}
                          <div className="md:hidden flex items-center justify-between w-full max-w-sm gap-2">
                              
                              {/* Prev Arrow */}
                              <button 
                                  onClick={() => setWizardStep(s => Math.max(1, s - 1))}
                                  disabled={wizardStep === 1}
                                  className="p-2 rounded-full hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors text-slate-500 hover:text-slate-800"
                              >
                                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                              </button>

                              {/* Center Dots */}
                              <div className="flex flex-col items-center">
                                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-1.5 truncate max-w-[140px]">
                                      {WIZARD_STEPS[wizardStep-1].label}
                                  </span>
                                  <div className="flex items-center gap-3">
                                      {WIZARD_STEPS.map(s => {
                                          const canVisit = s.id <= maxStepReached;
                                          return (
                                              <button 
                                                  key={s.id}
                                                  onClick={() => canVisit && setWizardStep(s.id)}
                                                  disabled={!canVisit}
                                                  className={`
                                                      w-3 h-3 rounded-full transition-all border
                                                      ${s.id === wizardStep ? 'bg-blue-600 border-blue-600 scale-110' : s.id < wizardStep ? 'bg-blue-300 border-blue-300 hover:bg-blue-400' : 'bg-slate-100 border-slate-200'}
                                                      ${canVisit ? 'cursor-pointer' : 'cursor-not-allowed'}
                                                  `}
                                                  aria-label={`Step ${s.id}`}
                                              />
                                          );
                                      })}
                                  </div>
                              </div>

                              {/* Next Arrow */}
                              <button 
                                  onClick={handleNextStep}
                                  disabled={wizardStep === 5 || (wizardStep === 1 && !draftName.trim())}
                                  className="p-2 rounded-full hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors text-slate-500 hover:text-slate-800"
                              >
                                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                              </button>
                          </div>

                          {/* DESKTOP (>= md): Full Visual Stepper */}
                          <div className="hidden md:flex justify-center items-center gap-2">
                              {WIZARD_STEPS.map((step, idx) => {
                                  const isActive = wizardStep === step.id;
                                  const isPast = step.id < wizardStep;
                                  const canVisit = step.id <= maxStepReached;

                                  let circleClass = 'border-slate-300 bg-white text-slate-400';
                                  let textClass = 'text-slate-500';
                                  let cursorClass = 'cursor-not-allowed';

                                  if (isActive) {
                                      circleClass = 'border-blue-600 bg-blue-600 text-white';
                                      textClass = 'text-blue-600';
                                      cursorClass = 'cursor-default';
                                  } else if (canVisit) {
                                      circleClass = 'border-blue-600 bg-white text-blue-600 hover:bg-blue-50';
                                      textClass = 'text-slate-700 font-bold';
                                      cursorClass = 'cursor-pointer'; // Removed hover:scale-105
                                  }

                                  return (
                                      <React.Fragment key={step.id}>
                                          {idx > 0 && <div className={`w-4 h-0.5 rounded shrink-0 ${canVisit ? 'bg-blue-600' : 'bg-slate-200'}`}></div>}
                                          <div 
                                            onClick={() => canVisit && setWizardStep(step.id)}
                                            className={`flex items-center gap-2 transition-all shrink-0 ${cursorClass} ${!canVisit ? 'opacity-50' : 'opacity-100'}`}
                                          >
                                              <div 
                                                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-colors ${circleClass}`}
                                              >
                                                  {isPast ? '✓' : step.id}
                                              </div>
                                              <span className={`text-xs font-bold uppercase tracking-wider ${textClass}`}>
                                                  {step.label}
                                              </span>
                                          </div>
                                      </React.Fragment>
                                  );
                              })}
                          </div>
                      </div>

                      <div className="shrink-0 w-40 flex justify-end">
                          <button onClick={handleCloseAttempt} className="p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-colors">
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                      </div>
                  </div>

                  {/* MIDDLE: SCROLLABLE CONTENT */}
                  {/* Step 3 & 4 need custom scroll handling for layout, others use default */}
                  <div className={`flex-1 ${wizardStep === 3 || wizardStep === 4 ? 'overflow-hidden flex flex-col p-8 bg-slate-50/50' : 'overflow-y-auto p-8 bg-slate-50/50'}`}>
                      
                      {/* STEP 1: GENERAL INFO (Settings Style) */}
                      {wizardStep === 1 && (
                          <div className="max-w-xl mx-auto space-y-8 animate-fade-in py-8">
                              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                 <div className="flex flex-col md:flex-row gap-6">
                                     {/* Icon Picker (With Click Outside Fix) */}
                                     <div className="shrink-0 flex flex-col items-center relative" ref={iconWrapperRef}>
                                         <label className="text-xs font-bold text-slate-500 uppercase mb-1">Icon</label>
                                         
                                         <button 
                                            onClick={(e) => { e.preventDefault(); setShowIconPicker(!showIconPicker); }}
                                            className="w-24 h-24 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center relative bg-slate-50 hover:border-blue-300 hover:bg-white transition-all group overflow-hidden"
                                         >
                                             {draftIconType === 'image' && draftIcon ? (
                                                 <img src={draftIcon} alt="Project Icon" className="w-full h-full object-cover" />
                                             ) : (
                                                 <span className="text-4xl group-hover:scale-110 transition-transform">{draftIcon}</span>
                                             )}
                                             
                                             <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/10 flex items-end justify-center pb-2 transition-colors">
                                                 <span className="text-[10px] bg-white px-2 py-0.5 rounded shadow text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">Edit</span>
                                             </div>
                                         </button>

                                         {showIconPicker && (
                                             <div className="absolute top-[46px] left-0 z-50">
                                                 <IconPicker 
                                                    currentIcon={draftIcon} 
                                                    currentType={draftIconType}
                                                    onChange={(icon, type) => {
                                                        setDraftIcon(icon);
                                                        setDraftIconType(type);
                                                        if(type === 'emoji') setShowIconPicker(false);
                                                    }}
                                                    onClose={() => setShowIconPicker(false)}
                                                 />
                                             </div>
                                         )}
                                     </div>

                                     {/* Text Inputs */}
                                     <div className="flex-1 space-y-4">
                                         <div>
                                             <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Project Name <span className="text-red-500">*</span></label>
                                             <input 
                                                type="text" 
                                                value={draftName} 
                                                onChange={(e) => setDraftName(e.target.value)} 
                                                placeholder="e.g. 2026 Strategy Review"
                                                className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-700" 
                                                autoFocus
                                             />
                                         </div>
                                         <div>
                                             <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Description</label>
                                             <textarea 
                                                value={draftDesc} 
                                                onChange={(e) => setDraftDesc(e.target.value)} 
                                                rows={2}
                                                className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm text-slate-600 resize-none" 
                                                placeholder="Briefly describe the project goals..."
                                             />
                                         </div>
                                     </div>
                                 </div>
                            </div>
                          </div>
                      )}

                      {/* STEP 2: STAKEHOLDERS (No Drag) */}
                      {wizardStep === 2 && (
                          <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
                              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                  <div className="space-y-2">
                                      {draftConfig.stakeholders.map((sh, idx) => (
                                          <div 
                                            key={sh.id} 
                                            className="flex gap-3 items-center bg-slate-50 p-2 rounded-lg border border-slate-100 group transition-all hover:bg-blue-50/30 hover:border-blue-100"
                                          >
                                              
                                              <input 
                                                  type="text"
                                                  value={sh.label}
                                                  onChange={e => updateStakeholder(idx, 'label', e.target.value)}
                                                  className="flex-1 outline-none text-sm font-bold text-slate-700 placeholder-slate-300 bg-transparent"
                                                  placeholder={`Stakeholder Role ${idx + 1}`}
                                              />
                                              
                                              <div className="relative w-8 h-8 rounded-full border border-slate-200 overflow-hidden cursor-pointer hover:scale-105 transition-transform shadow-sm" style={{ backgroundColor: sh.color }}>
                                                  <input 
                                                      type="color" 
                                                      value={sh.color}
                                                      onChange={e => updateStakeholder(idx, 'color', e.target.value)}
                                                      className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                                                  />
                                              </div>
                                              
                                              <button onClick={() => removeStakeholder(idx)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-white rounded-full transition-all">
                                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                              </button>
                                          </div>
                                      ))}
                                  </div>
                                  <div className="mt-4">
                                      <button 
                                          onClick={addStakeholder}
                                          className="w-full py-3 border-2 border-dashed border-slate-200 text-slate-400 font-bold rounded-lg hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
                                      >
                                          <span>+ Add Stakeholder Role</span>
                                      </button>
                                  </div>
                              </div>
                          </div>
                      )}

                      {/* STEP 3 & 4: ZONES */}
                      {(wizardStep === 3 || wizardStep === 4) && (
                          <div className="max-w-5xl mx-auto space-y-6 animate-fade-in h-full">
                              <div className="flex flex-col md:flex-row gap-12 items-stretch h-full">
                                  {/* List Editor Column - Flex Col to anchor palette at bottom and scroll zones */}
                                  <div className="flex-1 w-full flex flex-col relative h-full min-h-0">
                                      {/* Scrollable Zone List */}
                                      <div className="flex-1 overflow-y-auto pr-2 -mr-2 min-h-0">
                                          <div className="space-y-2 pb-4">
                                              {(wizardStep === 3 ? draftConfig.relationshipZones : draftConfig.impactZones).map((z, idx) => {
                                                  const type = wizardStep === 3 ? 'relationshipZones' : 'impactZones';
                                                  return (
                                                      <div 
                                                          key={z.id} 
                                                          className="flex gap-2 items-center bg-white py-1.5 px-3 rounded-lg border border-slate-200 shadow-sm"
                                                          draggable
                                                          onDragStart={(e) => onDragStart(e, idx, type)}
                                                          onDragEnter={(e) => onDragEnter(e, idx)}
                                                          onDragEnd={() => onDragEnd(type)}
                                                          onDragOver={(e) => e.preventDefault()}
                                                      >
                                                          <div className="cursor-grab text-slate-300 hover:text-slate-500 p-1">
                                                              <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor"><path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z"/></svg>
                                                          </div>
                                                          <span className="text-xs text-slate-400 w-4 font-mono">{idx+1}</span>
                                                          
                                                          <input 
                                                              type="text" 
                                                              value={z.label} 
                                                              onChange={e => updateZone(type, idx, 'label', e.target.value)}
                                                              className="flex-1 min-w-0 border border-slate-200 rounded p-1.5 text-xs outline-none focus:border-emerald-400" 
                                                          />

                                                          <div className="w-6 h-6 rounded border border-slate-200 shadow-sm shrink-0" style={{ backgroundColor: z.color }}></div>
                                                          
                                                          <button 
                                                              onClick={() => removeZone(type, idx)}
                                                              disabled={(wizardStep === 3 ? draftConfig.relationshipZones : draftConfig.impactZones).length <= 1}
                                                              className="p-1 text-slate-300 hover:text-red-500 disabled:opacity-0"
                                                          >
                                                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                          </button>
                                                      </div>
                                                  )
                                              })}
                                              
                                              <div className="flex items-center justify-between pl-10 pt-1">
                                                    <button 
                                                        onClick={() => addZone(wizardStep === 3 ? 'relationshipZones' : 'impactZones')}
                                                        className="text-xs font-bold text-blue-600 hover:underline"
                                                    >
                                                        + Add Zone Level
                                                    </button>
                                              </div>
                                          </div>
                                      </div>

                                      {/* THEME SELECTOR - Anchored to bottom, sticky style */}
                                      <div className="shrink-0 mt-auto pt-4 border-t border-slate-200 bg-slate-50/50 relative z-10">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-3">Color Theme</span>
                                            <div className="flex flex-wrap gap-2">
                                                {THEME_COLORS.map(c => {
                                                    const currentStartColor = wizardStep === 3 ? draftConfig.relationshipZones[0]?.color : draftConfig.impactZones[0]?.color;
                                                    const isActive = currentStartColor?.toLowerCase() === c;
                                                    return (
                                                        <button
                                                            key={c}
                                                            onClick={() => handleThemeChange(wizardStep === 3 ? 'relationshipZones' : 'impactZones', c)}
                                                            className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${isActive ? 'border-slate-500 shadow-md scale-110' : 'border-transparent'}`}
                                                            style={{ backgroundColor: c }}
                                                            title={c}
                                                        />
                                                    );
                                                })}
                                            </div>
                                      </div>
                                  </div>

                                  {/* Preview */}
                                  <div className="flex-1 w-full flex justify-center items-start pt-4">
                                      <div className="w-full max-w-[400px] aspect-square bg-white rounded-full border border-slate-200 shadow-2xl relative overflow-hidden">
                                          <svg viewBox={`0 0 ${BOARD_SIZE} ${BOARD_SIZE}`} className="w-full h-full">
                                              <ZoneBackground 
                                                  radius={BOARD_SIZE/2} 
                                                  centerX={BOARD_SIZE/2} 
                                                  centerY={BOARD_SIZE/2} 
                                                  zones={wizardStep === 3 ? draftConfig.relationshipZones : draftConfig.impactZones}
                                                  centerLabel={wizardStep === 3 ? "YOU" : "SUCCESS"}
                                                  themeColor={wizardStep === 3 ? draftConfig.relationshipZones[0].color : draftConfig.impactZones[0].color}
                                              />
                                          </svg>
                                      </div>
                                  </div>
                              </div>
                          </div>
                      )}

                      {/* STEP 5: CONFIRMATION */}
                      {wizardStep === 5 && (
                          <div className="max-w-2xl mx-auto animate-fade-in py-8">
                               <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
                                   <div className="bg-slate-50 p-6 border-b border-slate-200 text-center">
                                       <div className="w-16 h-16 bg-white rounded-2xl mx-auto flex items-center justify-center text-4xl shadow-sm mb-4 overflow-hidden">
                                           {draftIconType === 'image' ? <img src={draftIcon} className="w-full h-full object-cover"/> : draftIcon}
                                       </div>
                                       <h2 className="text-2xl font-bold text-slate-800">{draftName}</h2>
                                       {draftDesc && <p className="text-slate-500 mt-1">{draftDesc}</p>}
                                   </div>
                                   
                                   <div className="p-8 space-y-6">
                                        <div className="grid grid-cols-3 gap-4 text-center">
                                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                                <div className="text-2xl font-bold text-blue-600">{draftConfig.stakeholders.length}</div>
                                                <div className="text-[10px] font-bold text-slate-400 uppercase">Stakeholders</div>
                                            </div>
                                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                                <div className="text-2xl font-bold text-emerald-600">{draftConfig.relationshipZones.length}</div>
                                                <div className="text-[10px] font-bold text-slate-400 uppercase">Rel. Zones</div>
                                            </div>
                                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                                <div className="text-2xl font-bold text-indigo-600">{draftConfig.impactZones.length}</div>
                                                <div className="text-[10px] font-bold text-slate-400 uppercase">Imp. Zones</div>
                                            </div>
                                        </div>

                                        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-5 flex gap-4 text-sm text-yellow-900">
                                            <span className="text-2xl shrink-0">⚠️</span>
                                            <div>
                                                <strong className="block mb-1 font-bold">Structural Lock Warning</strong>
                                                <p className="leading-relaxed opacity-90">
                                                    Once you create this project and start collecting interviews, the <strong>number of stakeholders and zones will be locked</strong> to ensure data consistency. 
                                                    <br/><br/>
                                                    You can still rename them or change colors later, but you cannot add or remove items.
                                                </p>
                                            </div>
                                        </div>
                                   </div>
                               </div>
                          </div>
                      )}
                  </div>

                  {/* BOTTOM: FOOTER NAV */}
                  <div className="px-6 py-3 border-t border-slate-200 bg-white flex justify-between items-center shrink-0 z-20 w-full box-border">
                      {wizardStep > 1 ? (
                          <button onClick={() => setWizardStep(p => p - 1)} className="px-4 py-2 rounded-lg border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 transition-colors text-xs">
                              ← Back
                          </button>
                      ) : (
                          <button onClick={handleCloseAttempt} className="px-4 py-2 rounded-lg text-slate-500 hover:text-slate-800 font-medium transition-colors text-xs">
                              Cancel
                          </button>
                      )}

                      {wizardStep < 5 ? (
                          <button 
                            onClick={handleNextStep} 
                            disabled={wizardStep === 1 && !draftName.trim()}
                            className="px-6 py-2 bg-slate-800 text-white font-bold rounded-lg hover:bg-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-slate-200 text-xs"
                        >
                            Next Step →
                        </button>
                      ) : (
                          <button 
                            onClick={handleCreate} 
                            disabled={isCreating}
                            className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-70 shadow-md shadow-blue-200 transition-all flex items-center gap-2 text-xs"
                        >
                            {isCreating ? 'Creating Project...' : '🚀 Create Project'}
                        </button>
                      )}
                  </div>
              </div>
          </div>
      )}

      <div className="max-w-7xl mx-auto px-6 pt-20">
        
        {/* Header Content */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div className="max-w-3xl">
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-3">Your Projects</h1>
                <p className="text-slate-500 text-sm leading-relaxed">
                    Manage your research projects, create new stakeholder maps, and track the progress of ongoing interviews. 
                    Select a project to access the dashboard and analysis tools.
                </p>
            </div>
            
            <button 
                onClick={openWizard} 
                className="w-full md:w-auto bg-blue-600 text-white px-6 py-3 rounded-lg font-bold shadow-md hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shrink-0"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Create New Project
            </button>
        </div>

        {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl mb-6 flex gap-3 items-start animate-fade-in">
                <span className="text-xl">⚠️</span>
                <div>
                    <strong className="block font-bold">Access Error</strong>
                    <p className="text-sm">{error}</p>
                </div>
            </div>
        )}

        {/* TOOLBAR */}
        <div className="flex items-center justify-between gap-4 mb-4">
            
            {/* Left: Search + Count */}
            <div className="flex items-center gap-4 flex-1">
                <div className="relative w-full max-w-md">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </div>
                    <input 
                        type="text" 
                        placeholder="Search projects..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full h-10 pl-10 pr-10 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all shadow-sm"
                    />
                    {searchQuery && (
                        <button 
                            onClick={() => setSearchQuery('')}
                            className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    )}
                </div>
                <span className="text-xs font-bold text-slate-400 whitespace-nowrap hidden sm:inline-block">
                    {processedProjects.length} {processedProjects.length === 1 ? 'project' : 'projects'}
                </span>
            </div>

            {/* Right: View Toggle */}
            <div className="flex h-10 items-center bg-white p-1 rounded-lg border border-slate-200 shrink-0 shadow-sm">
                <button 
                    onClick={() => setViewMode('grid')}
                    className={`h-full w-8 flex items-center justify-center rounded-md transition-all ${viewMode === 'grid' ? 'bg-slate-100 text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    title="Grid View"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                </button>
                <button 
                    onClick={() => setViewMode('list')}
                    className={`h-full w-8 flex items-center justify-center rounded-md transition-all ${viewMode === 'list' ? 'bg-slate-100 text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    title="List View"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                </button>
            </div>
        </div>

        {/* CONTENT */}
        {viewMode === 'grid' ? (
            /* GRID VIEW */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {processedProjects.map(p => {
                    const stats = getProjectStats(p.id);
                    return (
                        <div 
                            key={p.id} 
                            onClick={() => onSelectProject(p)}
                            className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-blue-300 cursor-pointer transition-all group flex flex-col h-full"
                        >
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-4 min-w-0 w-full">
                                     {/* Icon */}
                                     <div className="shrink-0">{renderProjectIcon(p)}</div>
                                     
                                     {/* Name & Meta */}
                                     <div className="flex flex-col min-w-0 flex-1">
                                         <div className="flex justify-between items-start">
                                             <h3 className="font-bold text-lg text-slate-800 truncate pr-2 group-hover:text-blue-600 transition-colors">{p.name}</h3>
                                             <span className="text-[10px] text-slate-400 shrink-0 bg-slate-50 px-2 py-1 rounded-full font-mono mt-0.5">{formatDate(p.createdAt)}</span>
                                         </div>
                                     </div>
                                </div>
                            </div>
                            
                            <p className="text-xs text-slate-500 mb-4 line-clamp-2 min-h-[2.5em]">
                                {p.description || "No description provided."}
                            </p>

                            <div className="mb-4">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-2">
                                    {p.config.stakeholders.length} Stakeholders
                                </span>
                                <div className="flex flex-wrap gap-y-1 gap-x-3">
                                    {p.config.stakeholders.map(s => (
                                        <div key={s.id} className="flex items-center gap-1.5 min-w-0">
                                            <div className="w-2 h-2 rounded-full shrink-0" style={{backgroundColor: s.color}}></div>
                                            <span className="text-xs text-slate-600 truncate max-w-[100px]">{s.label}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            
                            <div className="mt-auto border-t border-slate-100 pt-4 flex items-center justify-between">
                                <div className="flex flex-col">
                                     <span className="text-[10px] text-slate-400 uppercase tracking-wide font-bold">Sessions</span>
                                     <div className="flex items-baseline gap-1">
                                         <span className="text-xl font-bold text-slate-700">{stats.total}</span>
                                         {stats.pending > 0 && (
                                            <span className="text-xs text-yellow-600 font-medium bg-yellow-50 px-1.5 rounded border border-yellow-100">
                                                {stats.pending} pending
                                            </span>
                                         )}
                                     </div>
                                </div>
                                
                                {stats.total > 0 && stats.pending === 0 ? (
                                    <div className="text-right">
                                        <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide flex items-center gap-1">
                                            Ready 
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                        </span>
                                    </div>
                                ) : stats.total === 0 ? (
                                    <span className="text-[10px] text-slate-400 italic">No interviews yet</span>
                                ) : null}
                            </div>
                        </div>
                    );
                })}
            </div>
        ) : (
            /* LIST VIEW (Optimized for Mobile) */
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[600px] md:min-w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th 
                                className="px-4 md:px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors"
                                onClick={() => handleSort('name')}
                            >
                                <div className="flex items-center">
                                    Project <SortIcon active={sortField === 'name'} direction={sortOrder} />
                                </div>
                            </th>
                            <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Description</th>
                            <th 
                                className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors"
                                onClick={() => handleSort('createdAt')}
                            >
                                <div className="flex items-center">
                                    Created <SortIcon active={sortField === 'createdAt'} direction={sortOrder} />
                                </div>
                            </th>
                            <th 
                                className="px-2 md:px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center cursor-pointer hover:bg-slate-100 transition-colors"
                                onClick={() => handleSort('sessions')}
                            >
                                <div className="flex items-center justify-center">
                                    Sessions <SortIcon active={sortField === 'sessions'} direction={sortOrder} />
                                </div>
                            </th>
                            <th 
                                className="px-4 md:px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right cursor-pointer hover:bg-slate-100 transition-colors"
                                onClick={() => handleSort('status')}
                            >
                                <div className="flex items-center justify-end">
                                    Status <SortIcon active={sortField === 'status'} direction={sortOrder} />
                                </div>
                            </th>
                            <th className="px-4 md:px-6 py-4"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {processedProjects.map(p => {
                            const stats = getProjectStats(p.id);
                            return (
                                <tr 
                                    key={p.id} 
                                    onClick={() => onSelectProject(p)} 
                                    className="hover:bg-slate-50 cursor-pointer group transition-colors"
                                >
                                    <td className="px-4 md:px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm group-hover:bg-indigo-600 group-hover:text-white transition-colors overflow-hidden shrink-0">
                                                {p.iconType === 'image' && p.icon ? (
                                                    <img src={p.icon} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    p.icon || p.name.substring(0,1).toUpperCase()
                                                )}
                                            </div>
                                            <span className="font-bold text-slate-700 text-sm truncate max-w-[120px] sm:max-w-none">{p.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-xs text-slate-500 truncate max-w-xs">{p.description || '-'}</p>
                                    </td>
                                    <td className="px-6 py-4 text-xs text-slate-500 font-mono">
                                        {formatDate(p.createdAt)}
                                    </td>
                                    <td className="px-2 md:px-6 py-4 text-center">
                                         <div className="flex flex-col items-center">
                                            <span className="font-bold text-slate-700 text-sm">{stats.total}</span>
                                            {stats.pending > 0 && (
                                                <span className="text-[10px] text-yellow-600 font-bold whitespace-nowrap">{stats.pending} pending</span>
                                            )}
                                         </div>
                                    </td>
                                    <td className="px-4 md:px-6 py-4 text-right">
                                        {stats.total > 0 && stats.pending === 0 ? (
                                             <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 whitespace-nowrap">
                                                Ready
                                             </span>
                                        ) : stats.total === 0 ? (
                                            <span className="text-xs text-slate-400 italic whitespace-nowrap">No data</span>
                                        ) : (
                                            <span className="text-xs text-blue-600 font-medium whitespace-nowrap">In Progress</span>
                                        )}
                                    </td>
                                    <td className="px-4 md:px-6 py-4 text-right text-slate-400 group-hover:text-blue-600">
                                        <svg className="w-5 h-5 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        )}

        {processedProjects.length === 0 && !error && (
            <div className="mt-8 text-center py-16 bg-white border border-slate-200 border-dashed rounded-xl">
                <div className="text-4xl mb-4">📂</div>
                <h3 className="text-slate-900 font-bold text-lg">No projects found</h3>
                <p className="text-slate-500 text-sm mt-2">
                    {searchQuery ? 'Try adjusting your search criteria.' : 'Create your first project above to get started.'}
                </p>
            </div>
        )}
      </div>
      
      <Footer appName="StakeMap" appDescription="a stakeholder mapping tool" />
    </div>
  );
};
