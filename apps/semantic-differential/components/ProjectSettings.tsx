import React, { useState, useEffect, useRef } from 'react';
import { Project, ProjectConfig, SemanticPair } from '../types';
import { updateProjectConfig, updateProjectMetadata, deleteProject, subscribeToProjectSessions } from '../utils';
import { SCALE_OPTIONS, generateId, COMMON_SEMANTIC_PAIRS } from '../constants';
import { validateProjectName, validateSemanticTerm, sanitizeProjectName, sanitizeSemanticTerm } from '../validation';
import { useMounted } from '../hooks/useMounted';

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
          <h2 className="text-2xl font-bold text-slate-800">Impostazioni Progetto</h2>
          <p className="text-slate-500 text-sm mt-1">Configura differenziali, scala e dettagli del progetto.</p>
        </div>
        <div className="flex items-center gap-2">
          {saveStatus === 'saving' && (
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <div className="w-3 h-3 border-2 border-slate-300 border-t-blue-500 rounded-full animate-spin"></div>
              Salvataggio...
            </span>
          )}
          {saveStatus === 'saved' && (
            <span className="text-xs text-emerald-600 flex items-center gap-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Salvato
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {hasData && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-sm text-amber-800">
            <strong>Attenzione:</strong> Questo progetto ha già delle sessioni. Modificare i differenziali potrebbe influenzare l'analisi dei dati.
          </p>
        </div>
      )}

      {/* Project Info */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="font-bold text-slate-800 mb-4">Informazioni Progetto</h3>
        <div className="space-y-4">
          <div className="flex gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Icona</label>
              <button
                onClick={() => {
                  const emoji = prompt('Inserisci un emoji:', meta.icon);
                  if (emoji) setMeta(prev => ({ ...prev, icon: emoji }));
                }}
                className="w-12 h-12 bg-slate-50 rounded-lg flex items-center justify-center text-2xl border border-slate-200 hover:border-slate-300 transition-colors"
              >
                {meta.icon}
              </button>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">Nome Progetto</label>
              <input
                type="text"
                value={meta.name}
                onChange={(e) => setMeta(prev => ({ ...prev, name: e.target.value }))}
                className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Descrizione</label>
            <textarea
              value={meta.description}
              onChange={(e) => setMeta(prev => ({ ...prev, description: e.target.value }))}
              className="w-full h-20 px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Descrizione opzionale del progetto"
            />
          </div>
        </div>
      </div>

      {/* Question & Instructions */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="font-bold text-slate-800 mb-4">Domanda e Istruzioni</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Domanda per i Partecipanti
              <span className="text-slate-400 font-normal ml-2">(opzionale)</span>
            </label>
            <input
              type="text"
              value={config.question || ''}
              onChange={(e) => setConfig(prev => ({ ...prev, question: e.target.value }))}
              className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Es. Pensando al ToV del tuo Comune, come valuteresti lo stile?"
            />
            <p className="text-xs text-slate-400 mt-1">Questa domanda verrà mostrata ai partecipanti sopra ogni differenziale</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Istruzioni
              <span className="text-slate-400 font-normal ml-2">(opzionale)</span>
            </label>
            <textarea
              value={config.instructions || ''}
              onChange={(e) => setConfig(prev => ({ ...prev, instructions: e.target.value }))}
              className="w-full h-24 px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Istruzioni che verranno mostrate ai partecipanti prima di iniziare"
            />
          </div>
        </div>
      </div>

      {/* Scale Config */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="font-bold text-slate-800 mb-4">Configurazione Scala</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Punti Scala</label>
            <select
              value={config.scale.points}
              onChange={(e) => setConfig(prev => ({
                ...prev,
                scale: { ...prev.scale, points: parseInt(e.target.value) }
              }))}
              className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {SCALE_OPTIONS.map(n => (
                <option key={n} value={n}>{n} punti</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Modalità</label>
            <select
              value={config.scale.mode}
              onChange={(e) => setConfig(prev => ({
                ...prev,
                scale: { ...prev.scale, mode: e.target.value as 'discrete' | 'continuous' }
              }))}
              className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-slate-700">Randomizza estremi</span>
            </label>
          </div>
        </div>
        <p className="text-xs text-slate-400 mt-3">
          La randomizzazione inverte casualmente gli estremi di ogni coppia per ridurre l'effetto primacy.
        </p>
      </div>

      {/* Semantic Pairs */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-800">Coppie Semantiche</h3>
          <button
            onClick={addPair}
            className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Aggiungi
          </button>
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
              className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100 cursor-move hover:border-slate-200 transition-colors"
            >
              <div className="text-slate-300 cursor-grab">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                </svg>
              </div>
              <span className="text-xs text-slate-400 w-6">{index + 1}.</span>
              <input
                type="text"
                value={pair.leftTerm}
                onChange={(e) => updatePair(index, 'leftTerm', e.target.value)}
                placeholder="Termine sinistro"
                className="flex-1 h-9 px-3 border border-slate-200 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <span className="text-slate-300">↔</span>
              <input
                type="text"
                value={pair.rightTerm}
                onChange={(e) => updatePair(index, 'rightTerm', e.target.value)}
                placeholder="Termine destro"
                className="flex-1 h-9 px-3 border border-slate-200 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={() => {
                  setEditingPairIndex(index);
                  setShowSuggestions(true);
                }}
                className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
                title="Suggerimenti"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </button>
              <button
                onClick={() => removePair(index)}
                disabled={config.semanticPairs.length <= 1}
                className="p-2 text-slate-400 hover:text-red-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-white rounded-xl border border-red-200 p-6">
        <h3 className="font-bold text-red-700 mb-2">Zona Pericolosa</h3>
        <p className="text-sm text-slate-600 mb-4">
          L'eliminazione del progetto è irreversibile. Tutti i dati e le sessioni verranno cancellati.
        </p>
        <button
          onClick={() => setShowConfirmDelete(true)}
          className="px-4 py-2 bg-red-600 text-white text-sm font-bold rounded-lg hover:bg-red-700 transition-colors"
        >
          Elimina Progetto
        </button>
      </div>

      {/* Suggestions Modal */}
      {showSuggestions && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800">Suggerimenti Coppie</h3>
              <button
                onClick={() => { setShowSuggestions(false); setEditingPairIndex(null); }}
                className="p-1 text-slate-400 hover:text-slate-600"
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
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{category}</h4>
                    <div className="space-y-1">
                      {pairs.map((p, i) => (
                        <button
                          key={i}
                          onClick={() => applySuggestion(p.left, p.right)}
                          className="w-full text-left px-3 py-2 text-sm text-slate-700 bg-slate-50 rounded hover:bg-blue-50 hover:text-blue-700 transition-colors"
                        >
                          {p.left} ↔ {p.right}
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

      {/* Delete Confirmation Modal */}
      {showConfirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Eliminare il Progetto?</h3>
            <p className="text-slate-600 mb-6 text-sm">
              Questa azione non può essere annullata. Tutti i dati verranno persi definitivamente.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmDelete(false)}
                className="flex-1 py-2.5 rounded-lg border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-2.5 rounded-lg bg-red-600 text-white font-bold hover:bg-red-700 transition-colors"
              >
                Elimina
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
