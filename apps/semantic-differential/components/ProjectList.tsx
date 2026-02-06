import React, { useState, useEffect, useMemo } from 'react';
import { Project, ProjectConfig, SemanticPair } from '../types';
import { createProject, deleteProject, updateProjectConfig, updateProjectMetadata, subscribeToProjects } from '../utils';
import { DEFAULT_PROJECT_CONFIG, SCALE_OPTIONS, generateId, COMMON_SEMANTIC_PAIRS } from '../constants';
import { validateProjectName, validateSemanticTerm, sanitizeProjectName, sanitizeSemanticTerm } from '../validation';
import { useMounted } from '../hooks/useMounted';
import {
  Footer, NavBar, Button, Input, Textarea, Label, SearchInput, ToggleGroup,
  Card, CardContent, Alert, ConfirmDialog, EmptyState, LoadingScreen,
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
  formatDate,
} from '@sensekit/shared-ui';

interface ProjectListProps {
  onSelectProject: (project: Project) => void;
  onLogout: () => void;
}

const brandIcon = (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 6h16M4 12h16M4 18h16" stroke="#2563eb" strokeWidth="2" strokeLinecap="round"/>
    <circle cx="8" cy="6" r="2" fill="#059669"/>
    <circle cx="16" cy="12" r="2" fill="#059669"/>
    <circle cx="10" cy="18" r="2" fill="#059669"/>
  </svg>
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

  // Suggestion picker
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [editingPairIndex, setEditingPairIndex] = useState<number | null>(null);

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

    for (const pair of draftConfig.semanticPairs) {
      const leftVal = validateSemanticTerm(pair.leftTerm);
      const rightVal = validateSemanticTerm(pair.rightTerm);
      if (!leftVal.isValid || !rightVal.isValid) {
        setError('Tutti i termini delle coppie devono essere compilati');
        return;
      }
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

  const addSemanticPair = () => {
    const newPair: SemanticPair = {
      id: generateId('sp'),
      leftTerm: '',
      rightTerm: '',
      category: ''
    };
    setDraftConfig(prev => ({
      ...prev,
      semanticPairs: [...prev.semanticPairs, newPair]
    }));
  };

  const updatePair = (index: number, field: keyof SemanticPair, value: string) => {
    const newPairs = [...draftConfig.semanticPairs];
    newPairs[index] = { ...newPairs[index], [field]: sanitizeSemanticTerm(value) };
    setDraftConfig(prev => ({ ...prev, semanticPairs: newPairs }));
  };

  const removePair = (index: number) => {
    setDraftConfig(prev => ({
      ...prev,
      semanticPairs: prev.semanticPairs.filter((_, i) => i !== index)
    }));
  };

  const applySuggestion = (left: string, right: string, category?: string) => {
    if (editingPairIndex !== null) {
      const newPairs = [...draftConfig.semanticPairs];
      newPairs[editingPairIndex] = {
        ...newPairs[editingPairIndex],
        leftTerm: left,
        rightTerm: right,
        category: category || ''
      };
      setDraftConfig(prev => ({ ...prev, semanticPairs: newPairs }));
    }
    setShowSuggestions(false);
    setEditingPairIndex(null);
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  const logoutButton = (
    <Button variant="ghost" size="sm" onClick={() => setShowLogoutConfirm(true)} className="text-xs font-bold text-muted-foreground hover:text-destructive uppercase tracking-wider">
      Logout
    </Button>
  );

  return (
    <div className="min-h-screen bg-background pb-20 pt-14">
      <NavBar
        brand={{ name: 'SemDiff', icon: brandIcon }}
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
      <div className="max-w-7xl mx-auto px-6 pt-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div className="max-w-3xl">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-3">I Tuoi Progetti</h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Gestisci le tue ricerche sui differenziali semantici, crea nuovi questionari e monitora l'avanzamento delle interviste.
            </p>
          </div>

          <Button onClick={openCreateModal} className="w-full md:w-auto shrink-0">
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
              className="max-w-md"
            />
            <span className="text-xs font-bold text-muted-foreground whitespace-nowrap hidden sm:inline-block">
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
      </div>

      {/* Project Content */}
      <div className="max-w-7xl mx-auto px-6">
        {processedProjects.length === 0 && !searchQuery ? (
          <Card className="mt-8 border-dashed">
            <EmptyState
              icon="📊"
              title="Nessun progetto"
              description="Crea il tuo primo progetto per iniziare."
            />
          </Card>
        ) : processedProjects.length === 0 ? (
          <Card className="mt-8 border-dashed">
            <EmptyState
              icon="🔍"
              title="Nessun risultato"
              description="Prova a modificare i criteri di ricerca."
            />
          </Card>
        ) : viewMode === 'grid' ? (
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
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide block mb-2">
                      {project.config.semanticPairs.length} Differenziali Semantici
                    </span>
                    <div className="flex flex-wrap gap-y-1 gap-x-3">
                      {project.config.semanticPairs.slice(0, 3).map(pair => (
                        <div key={pair.id} className="flex items-center gap-1.5 min-w-0">
                          <span className="text-xs text-muted-foreground truncate max-w-[120px]">{pair.leftTerm} ↔ {pair.rightTerm}</span>
                        </div>
                      ))}
                      {project.config.semanticPairs.length > 3 && (
                        <span className="text-xs text-muted-foreground">+{project.config.semanticPairs.length - 3} altre</span>
                      )}
                    </div>
                  </div>

                  <div className="mt-auto border-t border-border pt-4 flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wide font-bold">Scala</span>
                      <span className="text-sm font-bold text-foreground">{project.config.scale.points} punti</span>
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
            <Table className="min-w-[600px] md:min-w-full">
              <TableHeader>
                <TableRow>
                  <TableHead className="px-4 md:px-6">Progetto</TableHead>
                  <TableHead className="px-6">Descrizione</TableHead>
                  <TableHead className="px-6">Creato</TableHead>
                  <TableHead className="px-2 md:px-6 text-center">Coppie</TableHead>
                  <TableHead className="px-4 md:px-6 text-center">Scala</TableHead>
                  <TableHead className="px-4 md:px-6"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {processedProjects.map(project => (
                  <TableRow
                    key={project.id}
                    onClick={() => onSelectProject(project)}
                    className="cursor-pointer group"
                  >
                    <TableCell className="px-4 md:px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm group-hover:bg-indigo-600 group-hover:text-white transition-colors overflow-hidden shrink-0">
                          {project.icon || '📊'}
                        </div>
                        <span className="font-bold text-foreground text-sm truncate max-w-[120px] sm:max-w-none">{project.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="px-6">
                      <p className="text-xs text-muted-foreground truncate max-w-xs">{project.description || '-'}</p>
                    </TableCell>
                    <TableCell className="px-6 text-xs text-muted-foreground font-mono">
                      {formatDate(project.createdAt)}
                    </TableCell>
                    <TableCell className="px-2 md:px-6 text-center">
                      <span className="font-bold text-foreground text-sm">{project.config.semanticPairs.length}</span>
                    </TableCell>
                    <TableCell className="px-4 md:px-6 text-center">
                      <span className="text-xs text-muted-foreground">{project.config.scale.points}pt {project.config.scale.mode === 'discrete' ? 'D' : 'C'}</span>
                    </TableCell>
                    <TableCell className="px-4 md:px-6 text-right">
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
      </div>

      <Footer appName="SemDiff" appDescription="a semantic differential tool" />

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-border">
            <div className="p-6 border-b border-border">
              <h2 className="text-xl font-bold text-foreground">
                {editingProject ? 'Modifica Progetto' : 'Nuovo Progetto'}
              </h2>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <div>
                  <Label size="xs" className="mb-1">Nome Progetto</Label>
                  <Input
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    placeholder="Es. Ricerca Brand Perception"
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
                  placeholder="Es. Pensando al ToV del tuo Comune, come valuteresti lo stile?"
                />
                <p className="text-xs text-muted-foreground mt-1">Questa domanda verrà mostrata ai partecipanti sopra i differenziali</p>
              </div>

              {/* Scale Config */}
              <div className="space-y-4">
                <h3 className="font-bold text-foreground">Configurazione Scala</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label size="xs" className="mb-1">Punti Scala</Label>
                    <select
                      value={draftConfig.scale.points}
                      onChange={(e) => setDraftConfig(prev => ({
                        ...prev,
                        scale: { ...prev.scale, points: parseInt(e.target.value) }
                      }))}
                      className="w-full h-10 px-3 border border-border rounded-lg text-sm bg-background"
                    >
                      {SCALE_OPTIONS.map(p => (
                        <option key={p} value={p}>{p} punti</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label size="xs" className="mb-1">Modalita</Label>
                    <select
                      value={draftConfig.scale.mode}
                      onChange={(e) => setDraftConfig(prev => ({
                        ...prev,
                        scale: { ...prev.scale, mode: e.target.value as 'discrete' | 'continuous' }
                      }))}
                      className="w-full h-10 px-3 border border-border rounded-lg text-sm bg-background"
                    >
                      <option value="discrete">Discreta (punti fissi)</option>
                      <option value="continuous">Continua (slider)</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={draftConfig.randomization.enabled}
                      onChange={(e) => setDraftConfig(prev => ({
                        ...prev,
                        randomization: { ...prev.randomization, enabled: e.target.checked }
                      }))}
                      className="w-4 h-4 rounded border-border"
                    />
                    Randomizza estremi
                    <span className="relative group">
                      <svg className="w-4 h-4 text-muted-foreground cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-foreground text-background text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none w-64 z-50">
                        <strong>Effetto Primacy:</strong> i partecipanti tendono a preferire il primo termine che leggono. Attivando questa opzione, gli estremi vengono scambiati casualmente per ogni partecipante, eliminando questo bias. I valori vengono poi normalizzati nell'analisi.
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-foreground"></div>
                      </div>
                    </span>
                  </label>
                </div>
              </div>

              {/* Semantic Pairs */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-foreground">Differenziali Semantici</h3>
                  <Button variant="ghost" size="sm" onClick={addSemanticPair} className="text-primary">
                    + Aggiungi Coppia
                  </Button>
                </div>

                {draftConfig.semanticPairs.length === 0 ? (
                  <div className="text-center py-8 bg-muted/30 rounded-lg">
                    <p className="text-sm text-muted-foreground">Nessuna coppia. Aggiungine una per iniziare.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {draftConfig.semanticPairs.map((pair, idx) => (
                      <div key={pair.id} className="flex items-center gap-2 bg-muted/30 p-3 rounded-lg">
                        <span className="text-xs text-muted-foreground w-6">{idx + 1}.</span>
                        <input
                          type="text"
                          value={pair.leftTerm}
                          onChange={(e) => updatePair(idx, 'leftTerm', e.target.value)}
                          placeholder="Termine sinistro"
                          className="flex-1 h-8 px-2 border border-border rounded text-sm bg-background"
                        />
                        <span className="text-muted-foreground">&#8596;</span>
                        <input
                          type="text"
                          value={pair.rightTerm}
                          onChange={(e) => updatePair(idx, 'rightTerm', e.target.value)}
                          placeholder="Termine destro"
                          className="flex-1 h-8 px-2 border border-border rounded text-sm bg-background"
                        />
                        <button
                          onClick={() => { setEditingPairIndex(idx); setShowSuggestions(true); }}
                          className="p-1.5 text-muted-foreground hover:text-primary transition-colors"
                          title="Suggerimenti"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => removePair(idx)}
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

            <div className="p-6 border-t border-border flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setShowModal(false)}>
                Annulla
              </Button>
              <Button onClick={handleSave} isLoading={isSaving}>
                Salva
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Suggestions Modal */}
      {showSuggestions && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-xl max-w-md w-full max-h-[80vh] overflow-y-auto border border-border">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="font-bold text-foreground">Suggerimenti</h3>
              <button onClick={() => setShowSuggestions(false)} className="text-muted-foreground hover:text-foreground">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 space-y-2">
              {COMMON_SEMANTIC_PAIRS.map((pair, idx) => (
                <button
                  key={idx}
                  onClick={() => applySuggestion(pair.left, pair.right, pair.category)}
                  className="w-full text-left p-3 rounded-lg hover:bg-muted/50 transition-colors border border-border"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">
                      {pair.left} &#8596; {pair.right}
                    </span>
                    {pair.category && (
                      <span className="text-xs text-muted-foreground">{pair.category}</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

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
