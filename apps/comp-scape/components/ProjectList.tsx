import React, { useState, useEffect, useMemo } from 'react';
import { Project, ProjectConfig, CompetitorDef } from '../types';
import { createProject, deleteProject, updateProjectConfig, updateProjectMetadata, subscribeToProjects } from '../utils';
import { DEFAULT_PROJECT_CONFIG, PALETTE, AXIS_PRESETS, generateId } from '../constants';
import { validateProjectName, validateCompetitorName, validateAxisLabel, sanitizeProjectName, sanitizeCompetitorName } from '../validation';
import { useMounted } from '../hooks/useMounted';
import {
  Footer, NavBar, Button, Input, Textarea, Label, SearchInput, ToggleGroup,
  Card, CardContent, Alert, ConfirmDialog, EmptyState, LoadingScreen,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
  Dialog, DialogContent, DialogHeader, DialogTitle,
  formatDate,
} from '@sensekit/shared-ui';

interface ProjectListProps {
  onSelectProject: (project: Project) => void;
  onLogout: () => void;
}

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

export const ProjectList: React.FC<ProjectListProps> = ({ onSelectProject, onLogout }) => {
  const isMounted = useMounted();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Logout confirmation
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Create/Edit Modal
  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [draftName, setDraftName] = useState('');
  const [draftDescription, setDraftDescription] = useState('');
  const [draftIcon, setDraftIcon] = useState('📊');
  const [draftConfig, setDraftConfig] = useState<ProjectConfig>(JSON.parse(JSON.stringify(DEFAULT_PROJECT_CONFIG)));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Delete confirmation
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);

  // View mode and search
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');

  // Filtered projects
  const processedProjects = useMemo(() => {
    return projects.filter(p =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description || '').toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [projects, searchQuery]);

  useEffect(() => {
    const unsubscribe = subscribeToProjects((list) => {
      if (isMounted.current) {
        setProjects(list.sort((a, b) => b.createdAt - a.createdAt));
        setIsLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const openCreateModal = () => {
    setEditingProject(null);
    setDraftName('');
    setDraftDescription('');
    setDraftIcon('📊');
    setDraftConfig(JSON.parse(JSON.stringify(DEFAULT_PROJECT_CONFIG)));
    setError(null);
    setShowModal(true);
  };

  const openEditModal = (project: Project) => {
    setEditingProject(project);
    setDraftName(project.name);
    setDraftDescription(project.description || '');
    setDraftIcon(project.icon || '📊');
    setDraftConfig(JSON.parse(JSON.stringify(project.config)));
    setError(null);
    setShowModal(true);
  };

  const handleSave = async () => {
    const validation = validateProjectName(draftName);
    if (!validation.isValid) {
      setError(validation.error || 'Nome non valido');
      return;
    }

    // Validate axis labels
    const axisLabels = [
      draftConfig.axes.x.leftLabel, draftConfig.axes.x.rightLabel,
      draftConfig.axes.y.bottomLabel, draftConfig.axes.y.topLabel
    ];
    for (const label of axisLabels) {
      const axisVal = validateAxisLabel(label);
      if (!axisVal.isValid) {
        setError(axisVal.error || 'Etichetta asse non valida');
        return;
      }
    }

    // Validate competitors
    for (const comp of draftConfig.competitors) {
      const compVal = validateCompetitorName(comp.name);
      if (!compVal.isValid) {
        setError(compVal.error || 'Nome competitor non valido');
        return;
      }
    }

    if (draftConfig.competitors.length < 2) {
      setError('Servono almeno 2 competitor');
      return;
    }

    setIsSaving(true);
    try {
      if (editingProject) {
        await updateProjectMetadata(editingProject.id, {
          name: sanitizeProjectName(draftName),
          description: draftDescription.substring(0, 500),
          icon: draftIcon
        });
        await updateProjectConfig(editingProject.id, draftConfig);
      } else {
        await createProject(
          sanitizeProjectName(draftName),
          draftDescription.substring(0, 500),
          draftConfig,
          draftIcon
        );
      }
      if (isMounted.current) {
        setShowModal(false);
      }
    } catch (e: any) {
      if (isMounted.current) {
        setError(e.message || 'Errore durante il salvataggio');
      }
    } finally {
      if (isMounted.current) {
        setIsSaving(false);
      }
    }
  };

  const handleDelete = async (projectId: string) => {
    try {
      await deleteProject(projectId);
      if (isMounted.current) {
        setDeletingProjectId(null);
      }
    } catch (e: any) {
      console.error('Delete error:', e);
    }
  };

  const addCompetitor = () => {
    const nextIndex = draftConfig.competitors.length;
    const color = PALETTE[nextIndex % PALETTE.length];
    const newComp: CompetitorDef = {
      id: generateId('comp'),
      name: '',
      color,
    };
    setDraftConfig(prev => ({
      ...prev,
      competitors: [...prev.competitors, newComp]
    }));
  };

  const updateCompetitor = (index: number, field: keyof CompetitorDef, value: string) => {
    const newComps = [...draftConfig.competitors];
    newComps[index] = { ...newComps[index], [field]: field === 'name' ? sanitizeCompetitorName(value) : value };
    setDraftConfig(prev => ({ ...prev, competitors: newComps }));
  };

  const removeCompetitor = (index: number) => {
    setDraftConfig(prev => ({
      ...prev,
      competitors: prev.competitors.filter((_, i) => i !== index)
    }));
  };

  const applyAxisPreset = (presetIndex: number) => {
    const preset = AXIS_PRESETS[presetIndex];
    if (preset) {
      setDraftConfig(prev => ({
        ...prev,
        axes: { x: preset.x, y: preset.y }
      }));
    }
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  const logoutButton = (
    <Button variant="ghost" size="sm" onClick={() => setShowLogoutConfirm(true)} className="text-xs font-medium text-muted-foreground hover:text-destructive uppercase tracking-wider">
      Logout
    </Button>
  );

  return (
    <div className="min-h-screen bg-background pb-20">
      <NavBar
        brand={{ name: 'CompScape', icon: brandIcon }}
        actions={logoutButton}
      />

      <ConfirmDialog
        open={showLogoutConfirm}
        onOpenChange={setShowLogoutConfirm}
        onConfirm={onLogout}
        title="Uscire?"
        description="Sei sicuro di voler uscire dalla dashboard?"
        confirmLabel="Esci"
        variant="destructive"
      />

      {/* Content Header */}
      <div className="max-w-7xl mx-auto px-6 pt-20">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div className="max-w-3xl">
            <h1 className="text-2xl md:text-3xl font-semibold text-foreground mb-3">I Tuoi Progetti</h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Gestisci le tue mappe competitive, definisci assi e competitor, e raccogli i posizionamenti dei partecipanti.
            </p>
          </div>

          <Button onClick={openCreateModal} className="w-full md:w-auto shrink-0" size="lg">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nuovo Progetto
          </Button>
        </div>

        {/* TOOLBAR */}
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-4 flex-1">
            <SearchInput
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onClear={() => setSearchQuery('')}
              placeholder="Cerca progetti..."
              className="w-full max-w-md"
            />
            <span className="text-xs font-medium text-muted-foreground whitespace-nowrap hidden sm:inline-block">
              {processedProjects.length} {processedProjects.length === 1 ? 'progetto' : 'progetti'}
            </span>
          </div>

          <ToggleGroup
            value={viewMode}
            onValueChange={(v) => setViewMode(v as 'grid' | 'list')}
            items={[
              { value: 'grid', label: 'Griglia', icon: gridIcon },
              { value: 'list', label: 'Lista', icon: listIcon },
            ]}
          />
        </div>

        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {processedProjects.map(project => (
              <Card
                key={project.id}
                onClick={() => onSelectProject(project)}
                className="cursor-pointer hover:shadow-lg hover:border-primary/30 transition-all group flex flex-col h-full"
              >
                <CardContent className="p-6 flex flex-col h-full">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-4 min-w-0 w-full">
                      <div className="w-12 h-12 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors shadow-sm shrink-0">
                        {project.icon || '📊'}
                      </div>
                      <div className="flex flex-col min-w-0 flex-1">
                        <div className="flex justify-between items-start">
                          <h3 className="font-bold text-lg text-foreground truncate pr-2 group-hover:text-primary transition-colors">{project.name}</h3>
                          <span className="text-[10px] text-muted-foreground shrink-0 bg-muted px-2 py-1 rounded-full font-mono mt-0.5">{formatDate(project.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground mb-4 line-clamp-2 min-h-[2.5em]">
                    {project.description || 'Nessuna descrizione.'}
                  </p>

                  <div className="mb-4">
                    <Label size="xs" className="mb-2">
                      {project.config.competitors.length} Competitor
                    </Label>
                    <div className="flex flex-wrap gap-y-1 gap-x-3">
                      {project.config.competitors.slice(0, 4).map(comp => (
                        <div key={comp.id} className="flex items-center gap-1.5 min-w-0">
                          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: comp.color }} />
                          <span className="text-xs text-muted-foreground truncate max-w-[100px]">{comp.name}</span>
                        </div>
                      ))}
                      {project.config.competitors.length > 4 && (
                        <span className="text-xs text-muted-foreground">+{project.config.competitors.length - 4} altri</span>
                      )}
                    </div>
                  </div>

                  <div className="mt-auto border-t border-border pt-4 flex items-center justify-between">
                    <div className="flex flex-col">
                      <Label size="xs">Assi</Label>
                      <span className="text-xs text-muted-foreground">
                        {project.config.axes.x.leftLabel} ↔ {project.config.axes.x.rightLabel}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => { e.stopPropagation(); openEditModal(project); }}
                        title="Modifica"
                        className="text-muted-foreground hover:text-primary"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => { e.stopPropagation(); setDeletingProjectId(project.id); }}
                        title="Elimina"
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="overflow-hidden overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Progetto</TableHead>
                  <TableHead>Descrizione</TableHead>
                  <TableHead>Creato</TableHead>
                  <TableHead className="text-center">Competitor</TableHead>
                  <TableHead className="text-center">Asse X</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {processedProjects.map(project => (
                  <TableRow
                    key={project.id}
                    onClick={() => onSelectProject(project)}
                    className="cursor-pointer group"
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm group-hover:bg-indigo-600 group-hover:text-white transition-colors overflow-hidden shrink-0">
                          {project.icon || '📊'}
                        </div>
                        <span className="font-bold text-foreground text-sm truncate max-w-[120px] sm:max-w-none">{project.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-xs text-muted-foreground truncate max-w-xs">{project.description || '-'}</p>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">
                      {formatDate(project.createdAt)}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="font-bold text-foreground text-sm">{project.config.competitors.length}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-xs text-muted-foreground">{project.config.axes.x.leftLabel} ↔ {project.config.axes.x.rightLabel}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => { e.stopPropagation(); openEditModal(project); }}
                          className="text-muted-foreground hover:text-primary"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => { e.stopPropagation(); setDeletingProjectId(project.id); }}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </Button>
                        <svg className="w-5 h-5 ml-2 text-muted-foreground group-hover:text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}

        {processedProjects.length === 0 && (
          <EmptyState
            icon={searchQuery ? '🔍' : '📊'}
            title={searchQuery ? 'Nessun risultato' : 'Nessun progetto'}
            description={searchQuery ? 'Prova a modificare i criteri di ricerca.' : 'Crea il tuo primo progetto per iniziare.'}
            className="mt-8 bg-background border border-dashed border-border rounded-xl"
          />
        )}
      </div>

      <Footer appName="CompScape" appDescription="a competitive landscape tool" />

      {/* Create/Edit Dialog */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProject ? 'Modifica Progetto' : 'Nuovo Progetto'}
            </DialogTitle>
          </DialogHeader>

            <div className="space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <div>
                  <Label size="xs" className="mb-1">Nome Progetto</Label>
                  <Input
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    placeholder="Es. Analisi Brand Automotive"
                  />
                </div>
                <div>
                  <Label size="xs" className="mb-1">Descrizione</Label>
                  <Textarea
                    value={draftDescription}
                    onChange={(e) => setDraftDescription(e.target.value)}
                    placeholder="Descrizione opzionale del progetto"
                    className="h-20 resize-none"
                  />
                </div>
              </div>

              {/* Question */}
              <div>
                <Label size="xs" className="mb-1">
                  Domanda per i Partecipanti
                  <span className="text-muted-foreground font-normal ml-2">(opzionale)</span>
                </Label>
                <Input
                  value={draftConfig.question || ''}
                  onChange={(e) => setDraftConfig(prev => ({ ...prev, question: e.target.value }))}
                  placeholder="Es. Dove posizioneresti ciascun brand rispetto ai seguenti assi?"
                />
                <p className="text-xs text-muted-foreground mt-1">Questa domanda verra mostrata ai partecipanti sopra la matrice</p>
              </div>

              {/* Axes Configuration */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground">Assi della Matrice</h3>
                  <select
                    onChange={(e) => applyAxisPreset(parseInt(e.target.value))}
                    className="h-8 px-2 border border-border rounded text-xs bg-background text-muted-foreground"
                    defaultValue=""
                  >
                    <option value="" disabled>Preset...</option>
                    {AXIS_PRESETS.map((preset, idx) => (
                      <option key={idx} value={idx}>{preset.label}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label size="xs" className="mb-1">Asse X — Sinistra</Label>
                    <Input
                      value={draftConfig.axes.x.leftLabel}
                      onChange={(e) => setDraftConfig(prev => ({
                        ...prev,
                        axes: { ...prev.axes, x: { ...prev.axes.x, leftLabel: e.target.value } }
                      }))}
                      placeholder="Es. Tradizionale"
                    />
                  </div>
                  <div>
                    <Label size="xs" className="mb-1">Asse X — Destra</Label>
                    <Input
                      value={draftConfig.axes.x.rightLabel}
                      onChange={(e) => setDraftConfig(prev => ({
                        ...prev,
                        axes: { ...prev.axes, x: { ...prev.axes.x, rightLabel: e.target.value } }
                      }))}
                      placeholder="Es. Innovativo"
                    />
                  </div>
                  <div>
                    <Label size="xs" className="mb-1">Asse Y — Basso</Label>
                    <Input
                      value={draftConfig.axes.y.bottomLabel}
                      onChange={(e) => setDraftConfig(prev => ({
                        ...prev,
                        axes: { ...prev.axes, y: { ...prev.axes.y, bottomLabel: e.target.value } }
                      }))}
                      placeholder="Es. Di Nicchia"
                    />
                  </div>
                  <div>
                    <Label size="xs" className="mb-1">Asse Y — Alto</Label>
                    <Input
                      value={draftConfig.axes.y.topLabel}
                      onChange={(e) => setDraftConfig(prev => ({
                        ...prev,
                        axes: { ...prev.axes, y: { ...prev.axes.y, topLabel: e.target.value } }
                      }))}
                      placeholder="Es. Generalista"
                    />
                  </div>
                </div>
              </div>

              {/* Competitors */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground">Competitor</h3>
                  <Button variant="ghost" size="sm" onClick={addCompetitor} className="text-primary">
                    + Aggiungi
                  </Button>
                </div>

                {draftConfig.competitors.length === 0 ? (
                  <div className="text-center py-8 bg-muted/30 rounded-lg">
                    <p className="text-sm text-muted-foreground">Nessun competitor. Aggiungine almeno 2.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {draftConfig.competitors.map((comp, idx) => (
                      <div key={comp.id} className="flex items-center gap-2 bg-muted/30 p-3 rounded-lg">
                        <input
                          type="color"
                          value={comp.color}
                          onChange={(e) => updateCompetitor(idx, 'color', e.target.value)}
                          className="w-8 h-8 rounded border border-border cursor-pointer shrink-0"
                        />
                        <input
                          type="text"
                          value={comp.name}
                          onChange={(e) => updateCompetitor(idx, 'name', e.target.value)}
                          placeholder={`Competitor ${idx + 1}`}
                          className="flex-1 h-8 px-2 border border-border rounded text-sm bg-background"
                        />
                        <button
                          onClick={() => removeCompetitor(idx)}
                          className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {error && (
                <Alert variant="destructive">{error}</Alert>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="secondary" onClick={() => setShowModal(false)}>
                Annulla
              </Button>
              <Button onClick={handleSave} isLoading={isSaving}>
                Salva
              </Button>
            </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deletingProjectId}
        onOpenChange={(open) => { if (!open) setDeletingProjectId(null); }}
        onConfirm={() => deletingProjectId && handleDelete(deletingProjectId)}
        title="Elimina Progetto?"
        description="Questa azione eliminera il progetto e tutte le sessioni associate. Non puo essere annullata."
        confirmLabel="Elimina"
        variant="destructive"
      />
    </div>
  );
};
