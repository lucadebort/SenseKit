
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Project, ProjectConfig, StakeholderDef, ZoneConfig } from '../types';
import { createProject, subscribeToProjects, subscribeToAllSessions } from '../utils';
import {
  NavBar,
  Footer,
  Button,
  Badge,
  Input,
  Textarea,
  Label,
  SearchInput,
  ToggleGroup,
  Card,
  CardContent,
  Alert,
  ConfirmDialog,
  EmptyState,
  SortIcon,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  cn,
  formatDate,
} from '@sensekit/shared-ui';
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

const brandIcon = (
  <div className="w-8 h-8 bg-card rounded-full flex items-center justify-center shadow-sm border border-border">
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" stroke="#2563eb" strokeWidth="2"/>
      <circle cx="12" cy="12" r="6" stroke="#059669" strokeWidth="2"/>
      <circle cx="12" cy="12" r="2" fill="#059669"/>
    </svg>
  </div>
);

const gridIcon = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
  </svg>
);

const listIcon = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);

const viewToggleItems = [
  { value: 'grid', label: 'Grid View', icon: gridIcon },
  { value: 'list', label: 'List View', icon: listIcon },
];

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
  const [maxStepReached, setMaxStepReached] = useState(1);
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
  const iconWrapperRef = useRef<HTMLDivElement>(null);

  // Drag & Drop Refs
  const dragItem = useRef<{ index: number; type: string } | null>(null);
  const dragOverItem = useRef<number | null>(null);

  // Firebase subscriptions - run once on mount
  useEffect(() => {
    const unsubProjects = subscribeToProjects(setProjects, (err) => {
        console.error(err);
        if (err.message.includes("permission_denied")) {
             setError("Permission Denied: You do not have permission to view projects. Please check your Firebase Database Rules.");
        } else {
             setError(`Error loading projects: ${err.message}`);
        }
    });

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

  // Close icon picker when clicking outside
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
      setMaxStepReached(1);
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
          setSortOrder(field === 'name' ? 'asc' : 'desc');
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
    <div className="min-h-screen bg-background font-sans pb-20">

      {/* NAVBAR */}
      <NavBar
        brand={{ name: 'StakeMap', icon: brandIcon }}
        actions={
          <Button variant="ghost" size="sm" onClick={() => setShowLogoutConfirm(true)} className="text-xs font-bold text-muted-foreground hover:text-destructive uppercase tracking-wider">
            Logout
          </Button>
        }
      />

      {/* LOGOUT CONFIRM */}
      <ConfirmDialog
        open={showLogoutConfirm}
        onOpenChange={setShowLogoutConfirm}
        onConfirm={onLogout}
        title="Sign Out?"
        description="Are you sure you want to log out from the admin dashboard?"
        confirmLabel="Sign Out"
        cancelLabel="Cancel"
        variant="destructive"
      />

      {/* WIZARD CLOSE CONFIRM */}
      <ConfirmDialog
        open={showCloseConfirm}
        onOpenChange={setShowCloseConfirm}
        onConfirm={() => setShowWizard(false)}
        title="Discard Draft?"
        description="You have unsaved changes. Are you sure you want to exit?"
        confirmLabel="Discard"
        cancelLabel="Keep Editing"
        variant="destructive"
      />

      {/* WIZARD MODAL */}
      {showWizard && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-background rounded-2xl shadow-2xl w-full max-w-6xl h-[85vh] flex flex-col overflow-hidden border border-border relative">

                  {/* HEADER WITH STEPPER AND CLOSE */}
                  <div className="bg-background border-b border-border px-6 py-3 shrink-0 flex items-center justify-between gap-4">

                      {/* LEFT: Title */}
                      <div className="shrink-0 hidden md:block w-40">
                          <h2 className="text-lg font-bold text-foreground whitespace-nowrap">New Project</h2>
                      </div>

                      {/* CENTER: RESPONSIVE STEPPER */}
                      <div className="flex-1 flex justify-center items-center min-w-0">

                          {/* MOBILE/COMPACT (< md): Arrows + Big Dots */}
                          <div className="md:hidden flex items-center justify-between w-full max-w-sm gap-2">

                              <Button
                                  variant="ghost" size="icon"
                                  onClick={() => setWizardStep(s => Math.max(1, s - 1))}
                                  disabled={wizardStep === 1}
                                  className="text-muted-foreground"
                              >
                                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                              </Button>

                              <div className="flex flex-col items-center">
                                  <span className="text-xs font-bold text-foreground uppercase tracking-wide mb-1.5 truncate max-w-[140px]">
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
                                                  className={cn(
                                                      "w-3 h-3 rounded-full transition-all border",
                                                      s.id === wizardStep ? 'bg-primary border-primary scale-110' : s.id < wizardStep ? 'bg-primary/50 border-primary/50 hover:bg-primary/70' : 'bg-muted border-border',
                                                      canVisit ? 'cursor-pointer' : 'cursor-not-allowed'
                                                  )}
                                                  aria-label={`Step ${s.id}`}
                                              />
                                          );
                                      })}
                                  </div>
                              </div>

                              <Button
                                  variant="ghost" size="icon"
                                  onClick={handleNextStep}
                                  disabled={wizardStep === 5 || (wizardStep === 1 && !draftName.trim())}
                                  className="text-muted-foreground"
                              >
                                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                              </Button>
                          </div>

                          {/* DESKTOP (>= md): Full Visual Stepper */}
                          <div className="hidden md:flex justify-center items-center gap-2">
                              {WIZARD_STEPS.map((step, idx) => {
                                  const isActive = wizardStep === step.id;
                                  const isPast = step.id < wizardStep;
                                  const canVisit = step.id <= maxStepReached;

                                  return (
                                      <React.Fragment key={step.id}>
                                          {idx > 0 && <div className={cn("w-4 h-0.5 rounded shrink-0", canVisit ? 'bg-primary' : 'bg-border')}></div>}
                                          <div
                                            onClick={() => canVisit && setWizardStep(step.id)}
                                            className={cn(
                                              "flex items-center gap-2 transition-all shrink-0",
                                              isActive ? 'cursor-default' : canVisit ? 'cursor-pointer' : 'cursor-not-allowed',
                                              !canVisit && 'opacity-50'
                                            )}
                                          >
                                              <div
                                                className={cn(
                                                  "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-colors",
                                                  isActive ? 'border-primary bg-primary text-primary-foreground' : canVisit ? 'border-primary bg-background text-primary hover:bg-primary/10' : 'border-border bg-background text-muted-foreground'
                                                )}
                                              >
                                                  {isPast ? '✓' : step.id}
                                              </div>
                                              <span className={cn(
                                                "text-xs font-bold uppercase tracking-wider",
                                                isActive ? 'text-primary' : canVisit ? 'text-foreground' : 'text-muted-foreground'
                                              )}>
                                                  {step.label}
                                              </span>
                                          </div>
                                      </React.Fragment>
                                  );
                              })}
                          </div>
                      </div>

                      <div className="shrink-0 w-40 flex justify-end">
                          <Button variant="ghost" size="icon" onClick={handleCloseAttempt} className="text-muted-foreground">
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                          </Button>
                      </div>
                  </div>

                  {/* MIDDLE: SCROLLABLE CONTENT */}
                  <div className={`flex-1 ${wizardStep === 3 || wizardStep === 4 ? 'overflow-hidden flex flex-col p-8 bg-muted/30' : 'overflow-y-auto p-8 bg-muted/30'}`}>

                      {/* STEP 1: GENERAL INFO */}
                      {wizardStep === 1 && (
                          <div className="max-w-xl mx-auto space-y-8 animate-fade-in py-8">
                              <Card>
                                 <CardContent className="p-6">
                                   <div className="flex flex-col md:flex-row gap-6">
                                     {/* Icon Picker */}
                                     <div className="shrink-0 flex flex-col items-center relative" ref={iconWrapperRef}>
                                         <Label size="xs" className="mb-1">Icon</Label>

                                         <button
                                            onClick={(e) => { e.preventDefault(); setShowIconPicker(!showIconPicker); }}
                                            className="w-24 h-24 rounded-xl border-2 border-dashed border-border flex items-center justify-center relative bg-muted/50 hover:border-primary/50 hover:bg-background transition-all group overflow-hidden"
                                         >
                                             {draftIconType === 'image' && draftIcon ? (
                                                 <img src={draftIcon} alt="Project Icon" className="w-full h-full object-cover" />
                                             ) : (
                                                 <span className="text-4xl group-hover:scale-110 transition-transform">{draftIcon}</span>
                                             )}

                                             <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/10 flex items-end justify-center pb-2 transition-colors">
                                                 <span className="text-[10px] bg-background px-2 py-0.5 rounded shadow text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">Edit</span>
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
                                             <Label size="xs" className="mb-1">Project Name <span className="text-destructive">*</span></Label>
                                             <Input
                                                value={draftName}
                                                onChange={(e) => setDraftName(e.target.value)}
                                                placeholder="e.g. 2026 Strategy Review"
                                                className="font-bold"
                                                autoFocus
                                             />
                                         </div>
                                         <div>
                                             <Label size="xs" className="mb-1">Description</Label>
                                             <Textarea
                                                value={draftDesc}
                                                onChange={(e) => setDraftDesc(e.target.value)}
                                                rows={2}
                                                placeholder="Briefly describe the project goals..."
                                             />
                                         </div>
                                     </div>
                                   </div>
                                 </CardContent>
                              </Card>
                          </div>
                      )}

                      {/* STEP 2: STAKEHOLDERS */}
                      {wizardStep === 2 && (
                          <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
                              <Card>
                                  <CardContent className="p-4">
                                      <div className="space-y-2">
                                          {draftConfig.stakeholders.map((sh, idx) => (
                                              <div
                                                key={sh.id}
                                                className="flex gap-3 items-center bg-muted/50 p-2 rounded-lg border border-border/50 group transition-all hover:bg-primary/5 hover:border-primary/20"
                                              >
                                                  <input
                                                      type="text"
                                                      value={sh.label}
                                                      onChange={e => updateStakeholder(idx, 'label', e.target.value)}
                                                      className="flex-1 outline-none text-sm font-bold text-foreground placeholder-muted-foreground bg-transparent"
                                                      placeholder={`Stakeholder Role ${idx + 1}`}
                                                  />

                                                  <div className="relative w-8 h-8 rounded-full border border-border overflow-hidden cursor-pointer hover:scale-105 transition-transform shadow-sm" style={{ backgroundColor: sh.color }}>
                                                      <input
                                                          type="color"
                                                          value={sh.color}
                                                          onChange={e => updateStakeholder(idx, 'color', e.target.value)}
                                                          className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                                                      />
                                                  </div>

                                                  <Button variant="ghost" size="icon" onClick={() => removeStakeholder(idx)} className="h-8 w-8 text-muted-foreground hover:text-destructive">
                                                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                  </Button>
                                              </div>
                                          ))}
                                      </div>
                                      <div className="mt-4">
                                          <Button
                                              variant="outline"
                                              onClick={addStakeholder}
                                              className="w-full py-3 border-2 border-dashed text-muted-foreground hover:text-primary hover:border-primary hover:bg-primary/5"
                                          >
                                              + Add Stakeholder Role
                                          </Button>
                                      </div>
                                  </CardContent>
                              </Card>
                          </div>
                      )}

                      {/* STEP 3 & 4: ZONES */}
                      {(wizardStep === 3 || wizardStep === 4) && (
                          <div className="max-w-5xl mx-auto space-y-6 animate-fade-in h-full">
                              <div className="flex flex-col md:flex-row gap-12 items-stretch h-full">
                                  {/* List Editor Column */}
                                  <div className="flex-1 w-full flex flex-col relative h-full min-h-0">
                                      {/* Scrollable Zone List */}
                                      <div className="flex-1 overflow-y-auto pr-2 -mr-2 min-h-0">
                                          <div className="space-y-2 pb-4">
                                              {(wizardStep === 3 ? draftConfig.relationshipZones : draftConfig.impactZones).map((z, idx) => {
                                                  const type = wizardStep === 3 ? 'relationshipZones' : 'impactZones';
                                                  return (
                                                      <div
                                                          key={z.id}
                                                          className="flex gap-2 items-center bg-background py-1.5 px-3 rounded-lg border border-border shadow-sm"
                                                          draggable
                                                          onDragStart={(e) => onDragStart(e, idx, type)}
                                                          onDragEnter={(e) => onDragEnter(e, idx)}
                                                          onDragEnd={() => onDragEnd(type)}
                                                          onDragOver={(e) => e.preventDefault()}
                                                      >
                                                          <div className="cursor-grab text-muted-foreground/50 hover:text-muted-foreground p-1">
                                                              <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor"><path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z"/></svg>
                                                          </div>
                                                          <span className="text-xs text-muted-foreground w-4 font-mono">{idx+1}</span>

                                                          <input
                                                              type="text"
                                                              value={z.label}
                                                              onChange={e => updateZone(type, idx, 'label', e.target.value)}
                                                              className="flex-1 min-w-0 border border-border rounded p-1.5 text-xs outline-none focus:border-primary bg-background text-foreground"
                                                          />

                                                          <div className="w-6 h-6 rounded border border-border shadow-sm shrink-0" style={{ backgroundColor: z.color }}></div>

                                                          <Button
                                                              variant="ghost" size="icon"
                                                              onClick={() => removeZone(type, idx)}
                                                              disabled={(wizardStep === 3 ? draftConfig.relationshipZones : draftConfig.impactZones).length <= 1}
                                                              className="h-7 w-7 text-muted-foreground hover:text-destructive disabled:opacity-0"
                                                          >
                                                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                          </Button>
                                                      </div>
                                                  )
                                              })}

                                              <div className="flex items-center justify-between pl-10 pt-1">
                                                    <Button
                                                        variant="link" size="sm"
                                                        onClick={() => addZone(wizardStep === 3 ? 'relationshipZones' : 'impactZones')}
                                                        className="text-xs font-bold"
                                                    >
                                                        + Add Zone Level
                                                    </Button>
                                              </div>
                                          </div>
                                      </div>

                                      {/* THEME SELECTOR */}
                                      <div className="shrink-0 mt-auto pt-4 border-t border-border bg-muted/30 relative z-10">
                                            <Label size="xs" className="mb-3">Color Theme</Label>
                                            <div className="flex flex-wrap gap-2">
                                                {THEME_COLORS.map(c => {
                                                    const currentStartColor = wizardStep === 3 ? draftConfig.relationshipZones[0]?.color : draftConfig.impactZones[0]?.color;
                                                    const isActive = currentStartColor?.toLowerCase() === c;
                                                    return (
                                                        <button
                                                            key={c}
                                                            onClick={() => handleThemeChange(wizardStep === 3 ? 'relationshipZones' : 'impactZones', c)}
                                                            className={cn(
                                                                "w-6 h-6 rounded-full border-2 transition-transform hover:scale-110",
                                                                isActive ? 'border-foreground/50 shadow-md scale-110' : 'border-transparent'
                                                            )}
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
                                      <div className="w-full max-w-[400px] aspect-square bg-background rounded-full border border-border shadow-2xl relative overflow-hidden">
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
                               <Card className="overflow-hidden">
                                   <div className="bg-muted p-6 border-b border-border text-center">
                                       <div className="w-16 h-16 bg-background rounded-2xl mx-auto flex items-center justify-center text-4xl shadow-sm mb-4 overflow-hidden">
                                           {draftIconType === 'image' ? <img src={draftIcon} className="w-full h-full object-cover"/> : draftIcon}
                                       </div>
                                       <h2 className="text-2xl font-bold text-foreground">{draftName}</h2>
                                       {draftDesc && <p className="text-muted-foreground mt-1">{draftDesc}</p>}
                                   </div>

                                   <CardContent className="p-8 space-y-6">
                                        <div className="grid grid-cols-3 gap-4 text-center">
                                            <div className="bg-muted p-3 rounded-lg border border-border">
                                                <div className="text-2xl font-bold text-primary">{draftConfig.stakeholders.length}</div>
                                                <div className="text-[10px] font-bold text-muted-foreground uppercase">Stakeholders</div>
                                            </div>
                                            <div className="bg-muted p-3 rounded-lg border border-border">
                                                <div className="text-2xl font-bold text-emerald-600">{draftConfig.relationshipZones.length}</div>
                                                <div className="text-[10px] font-bold text-muted-foreground uppercase">Rel. Zones</div>
                                            </div>
                                            <div className="bg-muted p-3 rounded-lg border border-border">
                                                <div className="text-2xl font-bold text-indigo-600">{draftConfig.impactZones.length}</div>
                                                <div className="text-[10px] font-bold text-muted-foreground uppercase">Imp. Zones</div>
                                            </div>
                                        </div>

                                        <Alert variant="warning" title="Structural Lock Warning">
                                            <p className="leading-relaxed">
                                                Once you create this project and start collecting interviews, the <strong>number of stakeholders and zones will be locked</strong> to ensure data consistency.
                                                <br/><br/>
                                                You can still rename them or change colors later, but you cannot add or remove items.
                                            </p>
                                        </Alert>
                                   </CardContent>
                               </Card>
                          </div>
                      )}
                  </div>

                  {/* BOTTOM: FOOTER NAV */}
                  <div className="px-6 py-3 border-t border-border bg-background flex justify-between items-center shrink-0 z-20 w-full box-border">
                      {wizardStep > 1 ? (
                          <Button variant="outline" size="sm" onClick={() => setWizardStep(p => p - 1)}>
                              ← Back
                          </Button>
                      ) : (
                          <Button variant="ghost" size="sm" onClick={handleCloseAttempt} className="text-muted-foreground">
                              Cancel
                          </Button>
                      )}

                      {wizardStep < 5 ? (
                          <Button
                            size="sm"
                            onClick={handleNextStep}
                            disabled={wizardStep === 1 && !draftName.trim()}
                        >
                            Next Step →
                        </Button>
                      ) : (
                          <Button
                            size="sm"
                            onClick={handleCreate}
                            isLoading={isCreating}
                        >
                            {isCreating ? 'Creating Project...' : 'Create Project'}
                        </Button>
                      )}
                  </div>
              </div>
          </div>
      )}

      <div className="max-w-7xl mx-auto px-6 pt-20">

        {/* Header Content */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div className="max-w-3xl">
                <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-3">Your Projects</h1>
                <p className="text-muted-foreground text-sm leading-relaxed">
                    Manage your research projects, create new stakeholder maps, and track the progress of ongoing interviews.
                    Select a project to access the dashboard and analysis tools.
                </p>
            </div>

            <Button onClick={openWizard} className="w-full md:w-auto shrink-0" size="lg">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Create New Project
            </Button>
        </div>

        {error && (
            <Alert variant="destructive" title="Access Error" className="mb-6">
                {error}
            </Alert>
        )}

        {/* TOOLBAR */}
        <div className="flex items-center justify-between gap-4 mb-4">

            {/* Left: Search + Count */}
            <div className="flex items-center gap-4 flex-1">
                <SearchInput
                    placeholder="Search projects..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onClear={() => setSearchQuery('')}
                    className="w-full max-w-md"
                />
                <span className="text-xs font-bold text-muted-foreground whitespace-nowrap hidden sm:inline-block">
                    {processedProjects.length} {processedProjects.length === 1 ? 'project' : 'projects'}
                </span>
            </div>

            {/* Right: View Toggle */}
            <ToggleGroup
                items={viewToggleItems}
                value={viewMode}
                onValueChange={(v) => setViewMode(v as 'grid' | 'list')}
            />
        </div>

        {/* CONTENT */}
        {viewMode === 'grid' ? (
            /* GRID VIEW */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {processedProjects.map(p => {
                    const stats = getProjectStats(p.id);
                    return (
                        <Card
                            key={p.id}
                            onClick={() => onSelectProject(p)}
                            className="hover:shadow-lg hover:border-primary/30 cursor-pointer transition-all group flex flex-col h-full"
                        >
                            <CardContent className="p-6 flex flex-col h-full">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-4 min-w-0 w-full">
                                         <div className="shrink-0">{renderProjectIcon(p)}</div>

                                         <div className="flex flex-col min-w-0 flex-1">
                                             <div className="flex justify-between items-start">
                                                 <h3 className="font-bold text-lg text-foreground truncate pr-2 group-hover:text-primary transition-colors">{p.name}</h3>
                                                 <span className="text-[10px] text-muted-foreground shrink-0 bg-muted px-2 py-1 rounded-full font-mono mt-0.5">{formatDate(p.createdAt)}</span>
                                             </div>
                                         </div>
                                    </div>
                                </div>

                                <p className="text-xs text-muted-foreground mb-4 line-clamp-2 min-h-[2.5em]">
                                    {p.description || "No description provided."}
                                </p>

                                <div className="mb-4">
                                    <Label size="xs" className="mb-2">
                                        {p.config.stakeholders.length} Stakeholders
                                    </Label>
                                    <div className="flex flex-wrap gap-y-1 gap-x-3">
                                        {p.config.stakeholders.map(s => (
                                            <div key={s.id} className="flex items-center gap-1.5 min-w-0">
                                                <div className="w-2 h-2 rounded-full shrink-0" style={{backgroundColor: s.color}}></div>
                                                <span className="text-xs text-muted-foreground truncate max-w-[100px]">{s.label}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="mt-auto border-t border-border pt-4 flex items-center justify-between">
                                    <div className="flex flex-col">
                                         <Label size="xs">Sessions</Label>
                                         <div className="flex items-baseline gap-1">
                                             <span className="text-xl font-bold text-foreground">{stats.total}</span>
                                             {stats.pending > 0 && (
                                                <Badge variant="warning" className="text-xs">
                                                    {stats.pending} pending
                                                </Badge>
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
                                        <span className="text-[10px] text-muted-foreground italic">No interviews yet</span>
                                    ) : null}
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        ) : (
            /* LIST VIEW */
            <Card className="overflow-hidden overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead
                                className="cursor-pointer hover:bg-muted transition-colors"
                                onClick={() => handleSort('name')}
                            >
                                <div className="flex items-center">
                                    Project <SortIcon active={sortField === 'name'} direction={sortOrder} />
                                </div>
                            </TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead
                                className="cursor-pointer hover:bg-muted transition-colors"
                                onClick={() => handleSort('createdAt')}
                            >
                                <div className="flex items-center">
                                    Created <SortIcon active={sortField === 'createdAt'} direction={sortOrder} />
                                </div>
                            </TableHead>
                            <TableHead
                                className="text-center cursor-pointer hover:bg-muted transition-colors"
                                onClick={() => handleSort('sessions')}
                            >
                                <div className="flex items-center justify-center">
                                    Sessions <SortIcon active={sortField === 'sessions'} direction={sortOrder} />
                                </div>
                            </TableHead>
                            <TableHead
                                className="text-right cursor-pointer hover:bg-muted transition-colors"
                                onClick={() => handleSort('status')}
                            >
                                <div className="flex items-center justify-end">
                                    Status <SortIcon active={sortField === 'status'} direction={sortOrder} />
                                </div>
                            </TableHead>
                            <TableHead />
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {processedProjects.map(p => {
                            const stats = getProjectStats(p.id);
                            return (
                                <TableRow
                                    key={p.id}
                                    onClick={() => onSelectProject(p)}
                                    className="cursor-pointer group"
                                >
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm group-hover:bg-indigo-600 group-hover:text-white transition-colors overflow-hidden shrink-0">
                                                {p.iconType === 'image' && p.icon ? (
                                                    <img src={p.icon} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    p.icon || p.name.substring(0,1).toUpperCase()
                                                )}
                                            </div>
                                            <span className="font-bold text-foreground text-sm truncate max-w-[120px] sm:max-w-none">{p.name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <p className="text-xs text-muted-foreground truncate max-w-xs">{p.description || '-'}</p>
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground font-mono">
                                        {formatDate(p.createdAt)}
                                    </TableCell>
                                    <TableCell className="text-center">
                                         <div className="flex flex-col items-center">
                                            <span className="font-bold text-foreground text-sm">{stats.total}</span>
                                            {stats.pending > 0 && (
                                                <span className="text-[10px] text-amber-600 font-bold whitespace-nowrap">{stats.pending} pending</span>
                                            )}
                                         </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {stats.total > 0 && stats.pending === 0 ? (
                                             <Badge variant="success">Ready</Badge>
                                        ) : stats.total === 0 ? (
                                            <span className="text-xs text-muted-foreground italic whitespace-nowrap">No data</span>
                                        ) : (
                                            <Badge variant="default">In Progress</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right text-muted-foreground group-hover:text-primary">
                                        <svg className="w-5 h-5 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </Card>
        )}

        {processedProjects.length === 0 && !error && (
            <EmptyState
                icon="📂"
                title="No projects found"
                description={searchQuery ? 'Try adjusting your search criteria.' : 'Create your first project above to get started.'}
                className="mt-8 bg-background border border-dashed border-border rounded-xl"
            />
        )}
      </div>

      <Footer appName="StakeMap" appDescription="a stakeholder mapping tool" />
    </div>
  );
};
