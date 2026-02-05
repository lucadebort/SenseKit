import React, { useState, useEffect, useMemo } from 'react';
import { Project, ProjectConfig, SemanticPair } from '../types';
import { createProject, deleteProject, updateProjectConfig, updateProjectMetadata, subscribeToProjects } from '../utils';
import { DEFAULT_PROJECT_CONFIG, SCALE_OPTIONS, generateId, COMMON_SEMANTIC_PAIRS } from '../constants';
import { validateProjectName, validateSemanticTerm, sanitizeProjectName, sanitizeSemanticTerm } from '../validation';
import { useMounted } from '../hooks/useMounted';
import { Footer } from '@sensekit/shared-ui';

interface ProjectListProps {
  onSelectProject: (project: Project) => void;
  onLogout: () => void;
}

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

  // View mode and search (matching stake-mapping style)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');

  // Helper for date formatting
  const formatDate = (ts: number) => new Date(ts).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });

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

    // Validate semantic pairs
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
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20 pt-14">
      {/* NAVBAR */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-white/95 backdrop-blur shadow-sm border-b border-slate-200">
        <div className="w-full max-w-7xl mx-auto px-6 h-12 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-200">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 6h16M4 12h16M4 18h16" stroke="#2563eb" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="8" cy="6" r="2" fill="#059669"/>
                <circle cx="16" cy="12" r="2" fill="#059669"/>
                <circle cx="10" cy="18" r="2" fill="#059669"/>
              </svg>
            </div>
            <span className="font-bold text-slate-800 text-lg tracking-tight">SemDiff</span>
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
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 border border-slate-200 text-center">
            <h3 className="text-xl font-bold text-slate-800 mb-2">Uscire?</h3>
            <p className="text-slate-600 mb-6 text-sm">
              Sei sicuro di voler uscire dalla dashboard?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-2.5 rounded-lg border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={onLogout}
                className="flex-1 py-2.5 rounded-lg bg-red-600 text-white font-bold hover:bg-red-700 transition-colors"
              >
                Esci
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content Header - Matching stake-mapping style */}
      <div className="max-w-7xl mx-auto px-6 pt-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div className="max-w-3xl">
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-3">I Tuoi Progetti</h1>
            <p className="text-slate-500 text-sm leading-relaxed">
              Gestisci le tue ricerche sui differenziali semantici, crea nuovi questionari e monitora l'avanzamento delle interviste.
            </p>
          </div>

          <button
            onClick={openCreateModal}
            className="w-full md:w-auto bg-blue-600 text-white px-6 py-3 rounded-lg font-bold shadow-md hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shrink-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nuovo Progetto
          </button>
        </div>

        {/* TOOLBAR - Search + View Toggle */}
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative w-full max-w-md">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Cerca progetti..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-10 pr-10 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all shadow-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            <span className="text-xs font-bold text-slate-400 whitespace-nowrap hidden sm:inline-block">
              {processedProjects.length} {processedProjects.length === 1 ? 'progetto' : 'progetti'}
            </span>
          </div>

          <div className="flex h-10 items-center bg-white p-1 rounded-lg border border-slate-200 shrink-0 shadow-sm">
            <button
              onClick={() => setViewMode('grid')}
              className={`h-full w-8 flex items-center justify-center rounded-md transition-all ${viewMode === 'grid' ? 'bg-slate-100 text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              title="Vista Griglia"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`h-full w-8 flex items-center justify-center rounded-md transition-all ${viewMode === 'list' ? 'bg-slate-100 text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              title="Vista Lista"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Project Content */}
      <div className="max-w-7xl mx-auto px-6">
        {processedProjects.length === 0 && !searchQuery ? (
          <div className="mt-8 text-center py-16 bg-white border border-slate-200 border-dashed rounded-xl">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-slate-900 font-bold text-lg">Nessun progetto</h3>
            <p className="text-slate-500 text-sm mt-2">Crea il tuo primo progetto per iniziare.</p>
          </div>
        ) : processedProjects.length === 0 ? (
          <div className="mt-8 text-center py-16 bg-white border border-slate-200 border-dashed rounded-xl">
            <div className="text-4xl mb-4">🔍</div>
            <h3 className="text-slate-900 font-bold text-lg">Nessun risultato</h3>
            <p className="text-slate-500 text-sm mt-2">Prova a modificare i criteri di ricerca.</p>
          </div>
        ) : viewMode === 'grid' ? (
          /* GRID VIEW - Matching stake-mapping 3 cols */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {processedProjects.map(project => (
              <div
                key={project.id}
                onClick={() => onSelectProject(project)}
                className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-blue-300 cursor-pointer transition-all group flex flex-col h-full"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-4 min-w-0 w-full">
                    <div className="w-12 h-12 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors shadow-sm shrink-0">
                      {project.icon || '📊'}
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="flex justify-between items-start">
                        <h3 className="font-bold text-lg text-slate-800 truncate pr-2 group-hover:text-blue-600 transition-colors">{project.name}</h3>
                        <span className="text-[10px] text-slate-400 shrink-0 bg-slate-50 px-2 py-1 rounded-full font-mono mt-0.5">{formatDate(project.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-500 mb-4 line-clamp-2 min-h-[2.5em]">
                  {project.description || 'Nessuna descrizione.'}
                </p>

                <div className="mb-4">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-2">
                    {project.config.semanticPairs.length} Differenziali Semantici
                  </span>
                  <div className="flex flex-wrap gap-y-1 gap-x-3">
                    {project.config.semanticPairs.slice(0, 3).map(pair => (
                      <div key={pair.id} className="flex items-center gap-1.5 min-w-0">
                        <span className="text-xs text-slate-600 truncate max-w-[120px]">{pair.leftTerm} ↔ {pair.rightTerm}</span>
                      </div>
                    ))}
                    {project.config.semanticPairs.length > 3 && (
                      <span className="text-xs text-slate-400">+{project.config.semanticPairs.length - 3} altre</span>
                    )}
                  </div>
                </div>

                <div className="mt-auto border-t border-slate-100 pt-4 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wide font-bold">Scala</span>
                    <span className="text-sm font-bold text-slate-700">{project.config.scale.points} punti</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); openEditModal(project); }}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Modifica"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeletingProjectId(project.id); }}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Elimina"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* LIST VIEW - Matching stake-mapping table style */
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px] md:min-w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 md:px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Progetto</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Descrizione</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Creato</th>
                  <th className="px-2 md:px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Coppie</th>
                  <th className="px-4 md:px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Scala</th>
                  <th className="px-4 md:px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {processedProjects.map(project => (
                  <tr
                    key={project.id}
                    onClick={() => onSelectProject(project)}
                    className="hover:bg-slate-50 cursor-pointer group transition-colors"
                  >
                    <td className="px-4 md:px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm group-hover:bg-indigo-600 group-hover:text-white transition-colors overflow-hidden shrink-0">
                          {project.icon || '📊'}
                        </div>
                        <span className="font-bold text-slate-700 text-sm truncate max-w-[120px] sm:max-w-none">{project.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs text-slate-500 truncate max-w-xs">{project.description || '-'}</p>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500 font-mono">
                      {formatDate(project.createdAt)}
                    </td>
                    <td className="px-2 md:px-6 py-4 text-center">
                      <span className="font-bold text-slate-700 text-sm">{project.config.semanticPairs.length}</span>
                    </td>
                    <td className="px-4 md:px-6 py-4 text-center">
                      <span className="text-xs text-slate-600">{project.config.scale.points}pt {project.config.scale.mode === 'discrete' ? 'D' : 'C'}</span>
                    </td>
                    <td className="px-4 md:px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); openEditModal(project); }}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeletingProjectId(project.id); }}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                        <svg className="w-5 h-5 ml-2 text-slate-400 group-hover:text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Footer appName="SemDiff" appDescription="a semantic differential tool" />

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-800">
                {editingProject ? 'Modifica Progetto' : 'Nuovo Progetto'}
              </h2>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nome Progetto</label>
                  <input
                    type="text"
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Es. Ricerca Brand Perception"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Descrizione</label>
                  <textarea
                    value={draftDescription}
                    onChange={(e) => setDraftDescription(e.target.value)}
                    className="w-full h-20 px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Descrizione opzionale del progetto"
                  />
                </div>
              </div>

              {/* Question */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Domanda per i Partecipanti
                  <span className="text-slate-400 font-normal ml-2">(opzionale)</span>
                </label>
                <input
                  type="text"
                  value={draftConfig.question || ''}
                  onChange={(e) => setDraftConfig(prev => ({ ...prev, question: e.target.value }))}
                  className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Es. Pensando al ToV del tuo Comune, come valuteresti lo stile?"
                />
                <p className="text-xs text-slate-400 mt-1">Questa domanda verrà mostrata ai partecipanti sopra i differenziali</p>
              </div>

              {/* Scale Config */}
              <div className="space-y-4">
                <h3 className="font-bold text-slate-700">Configurazione Scala</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Punti Scala</label>
                    <select
                      value={draftConfig.scale.points}
                      onChange={(e) => setDraftConfig(prev => ({
                        ...prev,
                        scale: { ...prev.scale, points: parseInt(e.target.value) }
                      }))}
                      className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm"
                    >
                      {SCALE_OPTIONS.map(p => (
                        <option key={p} value={p}>{p} punti</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Modalita</label>
                    <select
                      value={draftConfig.scale.mode}
                      onChange={(e) => setDraftConfig(prev => ({
                        ...prev,
                        scale: { ...prev.scale, mode: e.target.value as 'discrete' | 'continuous' }
                      }))}
                      className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm"
                    >
                      <option value="discrete">Discreta (punti fissi)</option>
                      <option value="continuous">Continua (slider)</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      checked={draftConfig.randomization.enabled}
                      onChange={(e) => setDraftConfig(prev => ({
                        ...prev,
                        randomization: { ...prev.randomization, enabled: e.target.checked }
                      }))}
                      className="w-4 h-4 rounded border-slate-300"
                    />
                    Randomizza estremi
                    <span className="relative group">
                      <svg className="w-4 h-4 text-slate-400 cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none w-64 z-50">
                        <strong>Effetto Primacy:</strong> i partecipanti tendono a preferire il primo termine che leggono. Attivando questa opzione, gli estremi vengono scambiati casualmente per ogni partecipante, eliminando questo bias. I valori vengono poi normalizzati nell'analisi.
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
                      </div>
                    </span>
                  </label>
                </div>
              </div>

              {/* Semantic Pairs */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-700">Differenziali Semantici</h3>
                  <button
                    onClick={addSemanticPair}
                    className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    + Aggiungi Coppia
                  </button>
                </div>

                {draftConfig.semanticPairs.length === 0 ? (
                  <div className="text-center py-8 bg-slate-50 rounded-lg">
                    <p className="text-sm text-slate-500">Nessuna coppia. Aggiungine una per iniziare.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {draftConfig.semanticPairs.map((pair, idx) => (
                      <div key={pair.id} className="flex items-center gap-2 bg-slate-50 p-3 rounded-lg">
                        <span className="text-xs text-slate-400 w-6">{idx + 1}.</span>
                        <input
                          type="text"
                          value={pair.leftTerm}
                          onChange={(e) => updatePair(idx, 'leftTerm', e.target.value)}
                          placeholder="Termine sinistro"
                          className="flex-1 h-8 px-2 border border-slate-200 rounded text-sm"
                        />
                        <span className="text-slate-400">&#8596;</span>
                        <input
                          type="text"
                          value={pair.rightTerm}
                          onChange={(e) => updatePair(idx, 'rightTerm', e.target.value)}
                          placeholder="Termine destro"
                          className="flex-1 h-8 px-2 border border-slate-200 rounded text-sm"
                        />
                        <button
                          onClick={() => { setEditingPairIndex(idx); setShowSuggestions(true); }}
                          className="p-1.5 text-slate-400 hover:text-blue-500 transition-colors"
                          title="Suggerimenti"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => removePair(idx)}
                          className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
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
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                  {error}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isSaving ? 'Salvataggio...' : 'Salva'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Suggestions Modal */}
      {showSuggestions && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800">Suggerimenti</h3>
              <button onClick={() => setShowSuggestions(false)} className="text-slate-400 hover:text-slate-600">
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
                  className="w-full text-left p-3 rounded-lg hover:bg-slate-50 transition-colors border border-slate-100"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700">
                      {pair.left} &#8596; {pair.right}
                    </span>
                    {pair.category && (
                      <span className="text-xs text-slate-400">{pair.category}</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deletingProjectId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-sm w-full p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-2">Elimina Progetto?</h3>
            <p className="text-sm text-slate-500 mb-6">
              Questa azione eliminera il progetto e tutte le sessioni associate. Non puo essere annullata.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeletingProjectId(null)}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={() => handleDelete(deletingProjectId)}
                className="px-4 py-2 text-sm font-bold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
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
