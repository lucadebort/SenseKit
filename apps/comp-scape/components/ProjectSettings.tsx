import React, { useState } from 'react';
import { Project, ProjectConfig, CompetitorDef } from '../types';
import { updateProjectConfig, updateProjectMetadata, deleteProject } from '../utils';
import { PALETTE, AXIS_PRESETS, generateId } from '../constants';
import { validateProjectName, validateCompetitorName, validateAxisLabel, sanitizeProjectName, sanitizeCompetitorName } from '../validation';
import {
  Button, Input, Textarea, Label, Alert, Card, CardContent, ConfirmDialog,
} from '@sensekit/shared-ui';

interface ProjectSettingsProps {
  project: Project;
  onUpdate: (project: Project) => void;
  onDelete: () => void;
}

export const ProjectSettings: React.FC<ProjectSettingsProps> = ({
  project,
  onUpdate,
  onDelete
}) => {
  const [draftName, setDraftName] = useState(project.name);
  const [draftDescription, setDraftDescription] = useState(project.description || '');
  const [draftIcon, setDraftIcon] = useState(project.icon || '📊');
  const [draftConfig, setDraftConfig] = useState<ProjectConfig>(JSON.parse(JSON.stringify(project.config)));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSave = async () => {
    const nameVal = validateProjectName(draftName);
    if (!nameVal.isValid) {
      setError(nameVal.error || 'Nome non valido');
      return;
    }

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
    setError(null);
    setSuccess(false);

    try {
      await updateProjectMetadata(project.id, {
        name: sanitizeProjectName(draftName),
        description: draftDescription.substring(0, 500),
        icon: draftIcon,
      });
      await updateProjectConfig(project.id, draftConfig);

      onUpdate({
        ...project,
        name: sanitizeProjectName(draftName),
        description: draftDescription.substring(0, 500),
        icon: draftIcon,
        config: draftConfig,
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e: any) {
      setError(e.message || 'Errore durante il salvataggio');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteProject(project.id);
      onDelete();
    } catch (e: any) {
      setError(e.message || 'Errore durante eliminazione');
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

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Metadata */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <h2 className="font-semibold text-foreground">Informazioni Progetto</h2>
          <div>
            <Label size="xs" className="mb-1">Nome Progetto</Label>
            <Input value={draftName} onChange={(e) => setDraftName(e.target.value)} />
          </div>
          <div>
            <Label size="xs" className="mb-1">Descrizione</Label>
            <Textarea
              value={draftDescription}
              onChange={(e) => setDraftDescription(e.target.value)}
              className="h-20 resize-none"
            />
          </div>
          <div>
            <Label size="xs" className="mb-1">
              Domanda per i Partecipanti
              <span className="text-muted-foreground font-normal ml-2">(opzionale)</span>
            </Label>
            <Input
              value={draftConfig.question || ''}
              onChange={(e) => setDraftConfig(prev => ({ ...prev, question: e.target.value }))}
              placeholder="Es. Dove posizioneresti ciascun brand?"
            />
          </div>
          <div>
            <Label size="xs" className="mb-1">
              Istruzioni
              <span className="text-muted-foreground font-normal ml-2">(opzionale)</span>
            </Label>
            <Textarea
              value={draftConfig.instructions || ''}
              onChange={(e) => setDraftConfig(prev => ({ ...prev, instructions: e.target.value }))}
              placeholder="Istruzioni mostrate prima dell'inizio della sessione"
              className="h-20 resize-none"
            />
          </div>
        </CardContent>
      </Card>

      {/* Axes */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-foreground">Assi della Matrice</h2>
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
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Competitors */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-foreground">Competitor</h2>
            <Button variant="ghost" size="sm" onClick={addCompetitor} className="text-primary">
              + Aggiungi
            </Button>
          </div>

          {draftConfig.competitors.length === 0 ? (
            <div className="text-center py-8 bg-muted/30 rounded-lg">
              <p className="text-sm text-muted-foreground">Nessun competitor.</p>
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
        </CardContent>
      </Card>

      {/* Save / Error / Success */}
      {error && <Alert variant="destructive">{error}</Alert>}
      {success && <Alert>Salvato con successo!</Alert>}

      <div className="flex items-center justify-between">
        <Button onClick={handleSave} isLoading={isSaving}>
          Salva Modifiche
        </Button>

        <Button
          variant="ghost"
          className="text-destructive hover:text-destructive"
          onClick={() => setShowDeleteConfirm(true)}
        >
          Elimina Progetto
        </Button>
      </div>

      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        onConfirm={handleDelete}
        title="Elimina Progetto?"
        description="Questa azione eliminera il progetto e tutte le sessioni associate. Non puo essere annullata."
        confirmLabel="Elimina"
        variant="destructive"
      />
    </div>
  );
};
