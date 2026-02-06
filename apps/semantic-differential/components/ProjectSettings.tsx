import React, { useState, useEffect, useRef } from 'react';
import { Project, ProjectConfig, SemanticPair } from '../types';
import { updateProjectConfig, updateProjectMetadata, deleteProject, subscribeToProjectSessions } from '../utils';
import { SCALE_OPTIONS, generateId, COMMON_SEMANTIC_PAIRS } from '../constants';
import { validateProjectName, validateSemanticTerm, sanitizeProjectName, sanitizeSemanticTerm } from '../validation';
import { useMounted } from '../hooks/useMounted';
import { Button, Input, Textarea, Label, Card, CardContent, Alert, Badge, ConfirmDialog } from '@sensekit/shared-ui';

interface ProjectSettingsProps {
  project: Project;
  onUpdate: (updatedProject: Project) => void;
  onDelete: () => void;
}

export const ProjectSettings: React.FC<ProjectSettingsProps> = ({ project, onUpdate, onDelete }) => {
  const isMounted = useMounted();

  // Config State
  const [config, setConfig] = useState<ProjectConfig>(JSON.parse(JSON.stringify(project.config)));

  // Meta State
  const [meta, setMeta] = useState({
    name: project.name,
    description: project.description || '',
    icon: project.icon || '📊'
  });

  const [hasData, setHasData] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'idle'>('idle');
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Suggestion picker
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [editingPairIndex, setEditingPairIndex] = useState<number | null>(null);

  const firstRender = useRef(true);
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  // Subscribe to session data (to show warning if data exists)
  useEffect(() => {
    const unsub = subscribeToProjectSessions(project.id, (sessions) => {
      if (isMounted.current) {
        setHasData(sessions.length > 0);
      }
    });
    return unsub;
  }, [project.id]);

  // AUTO-SAVE LOGIC
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }

    setSaveStatus('saving');
    const timeoutId = setTimeout(async () => {
      try {
        // Validate
        const nameValidation = validateProjectName(meta.name);
        if (!nameValidation.isValid) {
          setError(nameValidation.error || 'Nome non valido');
          setSaveStatus('idle');
          return;
        }

        // Save config
        await updateProjectConfig(project.id, config);

        // Save metadata
        await updateProjectMetadata(project.id, {
          name: sanitizeProjectName(meta.name),
          description: meta.description,
          icon: meta.icon
        });

        if (isMounted.current) {
          setError(null);
          setSaveStatus('saved');
          onUpdate({
            ...project,
            name: meta.name,
            description: meta.description,
            icon: meta.icon,
            config
          });
        }
      } catch (e) {
        console.error('Save error:', e);
        if (isMounted.current) {
          setError('Errore nel salvataggio');
          setSaveStatus('idle');
        }
      }
    }, 800);

    return () => clearTimeout(timeoutId);
  }, [config, meta, project.id]);

  // Semantic Pairs handlers
  const addPair = () => {
    const newPair: SemanticPair = {
      id: generateId('sp'),
      leftTerm: '',
      rightTerm: ''
    };
    setConfig(prev => ({
      ...prev,
      semanticPairs: [...prev.semanticPairs, newPair]
    }));
  };

  const removePair = (index: number) => {
    setConfig(prev => ({
      ...prev,
      semanticPairs: prev.semanticPairs.filter((_, i) => i !== index)
    }));
  };

  const updatePair = (index: number, field: 'leftTerm' | 'rightTerm', value: string) => {
    setConfig(prev => {
      const newPairs = [...prev.semanticPairs];
      newPairs[index] = { ...newPairs[index], [field]: sanitizeSemanticTerm(value) };
      return { ...prev, semanticPairs: newPairs };
    });
  };

  const applySuggestion = (left: string, right: string) => {
    if (editingPairIndex !== null) {
      setConfig(prev => {
        const newPairs = [...prev.semanticPairs];
        newPairs[editingPairIndex] = {
          ...newPairs[editingPairIndex],
          leftTerm: left,
          rightTerm: right
        };
        return { ...prev, semanticPairs: newPairs };
      });
    }
    setShowSuggestions(false);
    setEditingPairIndex(null);
  };

  // Drag & Drop handlers
  const onDragStart = (index: number) => {
    dragItem.current = index;
  };

  const onDragEnter = (index: number) => {
    dragOverItem.current = index;
  };

  const onDragEnd = () => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    if (dragItem.current === dragOverItem.current) {
      dragItem.current = null;
      dragOverItem.current = null;
      return;
    }

    setConfig(prev => {
      const newPairs = [...prev.semanticPairs];
      const item = newPairs[dragItem.current!];
      newPairs.splice(dragItem.current!, 1);
      newPairs.splice(dragOverItem.current!, 0, item);
      return { ...prev, semanticPairs: newPairs };
    });

    dragItem.current = null;
    dragOverItem.current = null;
  };

  const handleDelete = async () => {
    try {
      await deleteProject(project.id);
      onDelete();
    } catch (e) {
      console.error('Delete error:', e);
      setError('Errore durante l\'eliminazione');
    }
  };

  return (
    <div className="space-y-8">
      {/* Save Status */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Impostazioni Progetto</h2>
          <p className="text-muted-foreground text-sm mt-1">Configura differenziali, scala e dettagli del progetto.</p>
        </div>
        <div className="flex items-center gap-2">
          {saveStatus === 'saving' && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <div className="w-3 h-3 border-2 border-border border-t-primary rounded-full animate-spin"></div>
              Salvataggio...
            </span>
          )}
          {saveStatus === 'saved' && (
            <Badge variant="success" className="flex items-center gap-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Salvato
            </Badge>
          )}
        </div>
      </div>

      {error && (
        <Alert variant="destructive">{error}</Alert>
      )}

      {hasData && (
        <Alert variant="warning" title="Attenzione">
          Questo progetto ha già delle sessioni. Modificare i differenziali potrebbe influenzare l'analisi dei dati.
        </Alert>
      )}

      {/* Project Info */}
      <Card>
        <CardContent className="p-6">
          <h3 className="font-bold text-foreground mb-4">Informazioni Progetto</h3>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div>
                <Label size="xs" className="mb-1">Icona</Label>
                <button
                  onClick={() => {
                    const emoji = prompt('Inserisci un emoji:', meta.icon);
                    if (emoji) setMeta(prev => ({ ...prev, icon: emoji }));
                  }}
                  className="w-12 h-12 bg-muted/30 rounded-lg flex items-center justify-center text-2xl border border-border hover:border-border transition-colors"
                >
                  {meta.icon}
                </button>
              </div>
              <div className="flex-1">
                <Label size="xs" className="mb-1">Nome Progetto</Label>
                <Input
                  type="text"
                  value={meta.name}
                  onChange={(e) => setMeta(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label size="xs" className="mb-1">Descrizione</Label>
              <Textarea
                value={meta.description}
                onChange={(e) => setMeta(prev => ({ ...prev, description: e.target.value }))}
                className="h-20"
                placeholder="Descrizione opzionale del progetto"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Question & Instructions */}
      <Card>
        <CardContent className="p-6">
          <h3 className="font-bold text-foreground mb-4">Domanda e Istruzioni</h3>
          <div className="space-y-4">
            <div>
              <Label size="xs" className="mb-1">
                Domanda per i Partecipanti
                <span className="text-muted-foreground font-normal ml-2">(opzionale)</span>
              </Label>
              <Input
                type="text"
                value={config.question || ''}
                onChange={(e) => setConfig(prev => ({ ...prev, question: e.target.value }))}
                placeholder="Es. Pensando al ToV del tuo Comune, come valuteresti lo stile?"
              />
              <p className="text-xs text-muted-foreground mt-1">Questa domanda verrà mostrata ai partecipanti sopra ogni differenziale</p>
            </div>
            <div>
              <Label size="xs" className="mb-1">
                Istruzioni
                <span className="text-muted-foreground font-normal ml-2">(opzionale)</span>
              </Label>
              <Textarea
                value={config.instructions || ''}
                onChange={(e) => setConfig(prev => ({ ...prev, instructions: e.target.value }))}
                className="h-24"
                placeholder="Istruzioni che verranno mostrate ai partecipanti prima di iniziare"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Scale Config */}
      <Card>
        <CardContent className="p-6">
          <h3 className="font-bold text-foreground mb-4">Configurazione Scala</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label size="xs" className="mb-1">Punti Scala</Label>
              <select
                value={config.scale.points}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  scale: { ...prev.scale, points: parseInt(e.target.value) }
                }))}
                className="w-full h-10 px-3 border border-border rounded-lg text-sm focus:ring-2 focus:ring-ring focus:border-transparent"
              >
                {SCALE_OPTIONS.map(n => (
                  <option key={n} value={n}>{n} punti</option>
                ))}
              </select>
            </div>
            <div>
              <Label size="xs" className="mb-1">Modalità</Label>
              <select
                value={config.scale.mode}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  scale: { ...prev.scale, mode: e.target.value as 'discrete' | 'continuous' }
                }))}
                className="w-full h-10 px-3 border border-border rounded-lg text-sm focus:ring-2 focus:ring-ring focus:border-transparent"
              >
                <option value="discrete">Discreta (punti)</option>
                <option value="continuous">Continua (slider)</option>
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.randomization.enabled}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    randomization: { enabled: e.target.checked }
                  }))}
                  className="w-4 h-4 text-primary rounded focus:ring-ring"
                />
                <span className="text-sm text-foreground">Randomizza estremi</span>
              </label>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            La randomizzazione inverte casualmente gli estremi di ogni coppia per ridurre l'effetto primacy.
          </p>
        </CardContent>
      </Card>

      {/* Semantic Pairs */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-foreground">Coppie Semantiche</h3>
            <Button size="sm" onClick={addPair}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Aggiungi
            </Button>
          </div>

          <div className="space-y-3">
            {config.semanticPairs.map((pair, index) => (
              <div
                key={pair.id}
                draggable
                onDragStart={() => onDragStart(index)}
                onDragEnter={() => onDragEnter(index)}
                onDragEnd={onDragEnd}
                onDragOver={(e) => e.preventDefault()}
                className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border border-border cursor-move hover:border-border transition-colors"
              >
                <div className="text-muted-foreground cursor-grab">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                  </svg>
                </div>
                <span className="text-xs text-muted-foreground w-6">{index + 1}.</span>
                <input
                  type="text"
                  value={pair.leftTerm}
                  onChange={(e) => updatePair(index, 'leftTerm', e.target.value)}
                  placeholder="Termine sinistro"
                  className="flex-1 h-9 px-3 border border-border rounded text-sm focus:ring-2 focus:ring-ring focus:border-transparent"
                />
                <span className="text-muted-foreground">&harr;</span>
                <input
                  type="text"
                  value={pair.rightTerm}
                  onChange={(e) => updatePair(index, 'rightTerm', e.target.value)}
                  placeholder="Termine destro"
                  className="flex-1 h-9 px-3 border border-border rounded text-sm focus:ring-2 focus:ring-ring focus:border-transparent"
                />
                <button
                  onClick={() => {
                    setEditingPairIndex(index);
                    setShowSuggestions(true);
                  }}
                  className="p-2 text-muted-foreground hover:text-primary transition-colors"
                  title="Suggerimenti"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </button>
                <button
                  onClick={() => removePair(index)}
                  disabled={config.semanticPairs.length <= 1}
                  className="p-2 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/30">
        <CardContent className="p-6">
          <h3 className="font-bold text-destructive mb-2">Zona Pericolosa</h3>
          <p className="text-sm text-muted-foreground mb-4">
            L'eliminazione del progetto è irreversibile. Tutti i dati e le sessioni verranno cancellati.
          </p>
          <Button variant="destructive" onClick={() => setShowConfirmDelete(true)}>
            Elimina Progetto
          </Button>
        </CardContent>
      </Card>

      {/* Suggestions Modal */}
      {showSuggestions && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-xl max-w-lg w-full max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="font-bold text-foreground">Suggerimenti Coppie</h3>
              <button
                onClick={() => { setShowSuggestions(false); setEditingPairIndex(null); }}
                className="p-1 text-muted-foreground hover:text-foreground"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {['Valori', 'Stile', 'Personalita', 'Organizzazione', 'Percezione'].map(category => {
                const pairs = COMMON_SEMANTIC_PAIRS.filter(p => p.category === category);
                if (pairs.length === 0) return null;
                return (
                  <div key={category} className="mb-4">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">{category}</h4>
                    <div className="space-y-1">
                      {pairs.map((p, i) => (
                        <button
                          key={i}
                          onClick={() => applySuggestion(p.left, p.right)}
                          className="w-full text-left px-3 py-2 text-sm text-foreground bg-muted/30 rounded hover:bg-primary/5 hover:text-primary transition-colors"
                        >
                          {p.left} &harr; {p.right}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={showConfirmDelete}
        onOpenChange={setShowConfirmDelete}
        onConfirm={handleDelete}
        title="Eliminare il Progetto?"
        description="Questa azione non può essere annullata. Tutti i dati verranno persi definitivamente."
        confirmLabel="Elimina"
        cancelLabel="Annulla"
        variant="destructive"
      />
    </div>
  );
};
