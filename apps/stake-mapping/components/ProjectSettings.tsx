
import React, { useState, useEffect, useRef } from 'react';
import { Project, ProjectConfig, StakeholderDef, ZoneConfig } from '../types';
import { PALETTE, BOARD_SIZE, THEME_COLORS, applyGradientToZones } from '../constants';
import { updateProjectConfig, updateProjectMetadata, subscribeToProjectSessions, deleteProject } from '../utils';
import { ZoneBackground } from './ZoneBackground'; // Reusing existing component for preview
import { IconPicker } from './IconPicker';
import { isFirebaseConfigured } from '../firebase';

interface ProjectSettingsProps {
    project: Project;
    onUpdate: (updatedProject: Project) => void;
    onDelete: () => void;
}

// --- ColorPalette Component (Simplified) ---
interface ColorPaletteProps {
    type: 'relationshipZones' | 'impactZones';
    activeColor: string;
    onColorChange: (type: 'relationshipZones' | 'impactZones', color: string) => void;
    disabled?: boolean;
}

const ColorPalette: React.FC<ColorPaletteProps> = ({ type, activeColor, onColorChange, disabled = false }) => {
    return (
        <div className={`mt-4 transition-opacity ${disabled ? 'opacity-30 pointer-events-none grayscale' : ''}`}>
             <div className="flex items-center gap-2 flex-wrap justify-center md:justify-start">
                <span className="text-xs font-bold text-slate-400 mr-2 uppercase tracking-wide">Theme:</span>
                {THEME_COLORS.map(c => (
                    <button
                        key={c}
                        onClick={() => onColorChange(type, c)}
                        className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${activeColor.toLowerCase() === c ? 'border-slate-500 shadow-md scale-110' : 'border-transparent'}`}
                        style={{ backgroundColor: c }}
                        title={c}
                    />
                ))}
            </div>
            {disabled && <p className="text-[10px] text-slate-400 mt-1 italic">Theme disabled when using dynamic stakeholder colors.</p>}
        </div>
    );
};

export const ProjectSettings: React.FC<ProjectSettingsProps> = ({ project, onUpdate, onDelete }) => {
    // Config State
    const [config, setConfig] = useState<ProjectConfig>(project.config);
    // Meta State (Name, Desc, Icon)
    const [meta, setMeta] = useState({
        name: project.name,
        description: project.description || '',
        icon: project.icon || '📁',
        iconType: project.iconType || 'emoji'
    });
    
    const [showIconPicker, setShowIconPicker] = useState(false);

    const relStartColor = config.relationshipZones[0]?.color || THEME_COLORS[0];
    const impStartColor = config.impactZones[0]?.color || THEME_COLORS[3];

    const [hasData, setHasData] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'idle'>('idle');
    const [showConfirmDelete, setShowConfirmDelete] = useState(false);
    const [showSuccessDelete, setShowSuccessDelete] = useState(false);

    const dragItem = useRef<{ index: number; type: string } | null>(null);
    const dragOverItem = useRef<number | null>(null);
    const firstRender = useRef(true);
    const iconButtonRef = useRef<HTMLDivElement>(null);

    // Subscribe to session data (to lock modifications if needed)
    useEffect(() => {
        const unsub = subscribeToProjectSessions(project.id, (sessions) => {
            setHasData(sessions.length > 0);
        });
        return unsub;
    }, [project.id]);

    // Handle clicking outside icon picker
    useEffect(() => {
        if (!showIconPicker) return;

        const handleClickOutside = (event: MouseEvent) => {
            if (iconButtonRef.current && !iconButtonRef.current.contains(event.target as Node)) {
                setShowIconPicker(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [showIconPicker]);

    // AUTO-SAVE LOGIC (Config + Meta)
    useEffect(() => {
        if (firstRender.current) {
            firstRender.current = false;
            return;
        }

        setSaveStatus('saving');
        const timeoutId = setTimeout(async () => {
            // Save both
            await updateProjectConfig(project.id, config);
            await updateProjectMetadata(project.id, meta);
            
            onUpdate({ 
                ...project, 
                config,
                name: meta.name,
                description: meta.description,
                icon: meta.icon,
                iconType: meta.iconType as 'emoji' | 'image'
            });
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 2000);
        }, 800);

        return () => clearTimeout(timeoutId);
    }, [config, meta]);


    const handleDelete = async () => {
        await deleteProject(project.id);
        setShowConfirmDelete(false);
        setShowSuccessDelete(true);
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

        const list = [...config[type]];
        const itemMoved = list[sourceIndex];
        list.splice(sourceIndex, 1);
        list.splice(destinationIndex, 0, itemMoved);

        let newConfig = { ...config, [type]: list };

        if (type !== 'stakeholders') {
             const startColor = type === 'relationshipZones' ? relStartColor : impStartColor;
             newConfig[type] = applyGradientToZones(newConfig[type], startColor);
        }

        setConfig(newConfig);
        dragItem.current = null;
        dragOverItem.current = null;
    };


    // --- Stakeholder Handlers ---
    const addStakeholder = () => {
        const newId = `sh_${Date.now()}`;
        const color = PALETTE[config.stakeholders.length % PALETTE.length];
        const count = config.stakeholders.length + 1;
        setConfig(prev => ({
            ...prev,
            stakeholders: [...prev.stakeholders, { id: newId, label: `Stakeholder ${count}`, color }]
        }));
    };

    const removeStakeholder = (idx: number) => {
        const newArr = [...config.stakeholders];
        newArr.splice(idx, 1);
        setConfig(prev => ({ ...prev, stakeholders: newArr }));
    };

    const updateStakeholder = (idx: number, field: keyof StakeholderDef, val: string) => {
        const newArr = [...config.stakeholders];
        newArr[idx] = { ...newArr[idx], [field]: val };
        setConfig(prev => ({ ...prev, stakeholders: newArr }));
    };

    // --- Zone Handlers ---
    const updateZone = (type: 'relationshipZones' | 'impactZones', idx: number, field: keyof ZoneConfig, val: string) => {
        const newArr = [...config[type]];
        newArr[idx] = { ...newArr[idx], [field]: val };
        setConfig(prev => ({ ...prev, [type]: newArr }));
    };

    // Simplified: Just add, no color param needed (auto-calculated by applyGradient)
    const addZone = (type: 'relationshipZones' | 'impactZones') => {
        const newId = `z_${Date.now()}`;
        let newArr = [...config[type], { id: newId, label: 'New Zone', color: '#ffffff' }];
        
        const startColor = type === 'relationshipZones' ? relStartColor : impStartColor;
        newArr = applyGradientToZones(newArr, startColor);

        setConfig(prev => ({ ...prev, [type]: newArr }));
    };

    const removeZone = (type: 'relationshipZones' | 'impactZones', idx: number) => {
         let newArr = [...config[type]];
         newArr.splice(idx, 1);
         
         if(newArr.length > 0) {
            const startColor = type === 'relationshipZones' ? relStartColor : impStartColor;
            newArr = applyGradientToZones(newArr, startColor);
         }

         setConfig(prev => ({ ...prev, [type]: newArr }));
    };

    const handleThemeChange = (type: 'relationshipZones' | 'impactZones', newStartColor: string) => {
        let newArr = [...config[type]];
        if(newArr.length === 0) return;
        
        newArr = applyGradientToZones(newArr, newStartColor);
        setConfig(prev => ({ ...prev, [type]: newArr }));
    };
    
    const handleToggleStakeholderColors = (e: React.ChangeEvent<HTMLInputElement>) => {
        setConfig(prev => ({ ...prev, useStakeholderColors: e.target.checked }));
    };

    const previewRadius = BOARD_SIZE / 2;
    const previewCenter = previewRadius;

    return (
        <div className="space-y-8 relative">
            
            {/* MODALS */}
            {showConfirmDelete && (
                <div className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 border border-red-100 animate-fade-in">
                        <h3 className="text-xl font-bold text-slate-800 mb-2">Delete Project?</h3>
                        <p className="text-slate-600 mb-6 text-sm">
                            Are you sure you want to delete <strong>{project.name}</strong>? This will permanently remove the project.
                        </p>
                        <div className="flex gap-3">
                            <button onClick={() => setShowConfirmDelete(false)} className="flex-1 py-2.5 rounded-lg border border-slate-200 text-slate-600 font-bold hover:bg-slate-50">Cancel</button>
                            <button onClick={handleDelete} className="flex-1 py-2.5 rounded-lg bg-red-600 text-white font-bold hover:bg-red-700">Delete Forever</button>
                        </div>
                    </div>
                </div>
            )}
            {showSuccessDelete && (
                <div className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 border border-green-100 text-center">
                         <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600">
                             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">Project Deleted</h3>
                        <button onClick={onDelete} className="w-full py-2.5 rounded-lg bg-slate-800 text-white font-bold hover:bg-slate-900">Back to Projects</button>
                    </div>
                </div>
            )}
            
            {/* AUTO-SAVE INDICATOR */}
            <div className="absolute -top-12 right-0 flex items-center gap-2">
                {saveStatus === 'saving' && (
                    <span className="text-xs font-bold text-slate-400 flex items-center gap-1 animate-pulse">
                        Saving...
                    </span>
                )}
                {saveStatus === 'saved' && (
                    <span className="text-xs font-bold text-green-600 flex items-center gap-1 transition-all">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        Saved
                    </span>
                )}
            </div>
            
            {hasData && (
                 <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-lg text-sm flex gap-2 shadow-sm">
                    <span>⚠️</span>
                    <div>
                        <strong>Modification Locked:</strong> Data collected. Structure is fixed.
                    </div>
                </div>
            )}

            {/* CARD 0: GENERAL INFO */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                 <h3 className="font-bold text-slate-800 text-lg mb-6 border-b border-slate-100 pb-4">General Info</h3>
                 
                 <div className="flex flex-col md:flex-row gap-6">
                     {/* Icon Picker (Replaced) */}
                     <div className="shrink-0 flex flex-col items-center relative" ref={iconButtonRef}>
                         <label className="text-xs font-bold text-slate-500 uppercase mb-1">Icon</label>
                         
                         <button 
                            onClick={() => setShowIconPicker(!showIconPicker)}
                            className="w-24 h-24 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center relative bg-slate-50 hover:border-blue-300 hover:bg-white transition-all group overflow-hidden"
                         >
                             {meta.iconType === 'image' && meta.icon ? (
                                 <img src={meta.icon} alt="Project Icon" className="w-full h-full object-cover" />
                             ) : (
                                 <span className="text-4xl group-hover:scale-110 transition-transform">{meta.icon}</span>
                             )}
                             
                             {/* Overlay Hint */}
                             <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/10 flex items-end justify-center pb-2 transition-colors">
                                 <span className="text-[10px] bg-white px-2 py-0.5 rounded shadow text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">Edit</span>
                             </div>
                         </button>

                         {/* NOTION STYLE PICKER POPOVER */}
                         {showIconPicker && (
                             <div className="absolute top-[80px] left-0 z-50">
                                <IconPicker 
                                    currentIcon={meta.icon} 
                                    currentType={meta.iconType as any}
                                    onChange={(icon, type) => {
                                        setMeta(p => ({...p, icon, iconType: type}));
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
                             <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Project Name</label>
                             <input 
                                type="text" 
                                value={meta.name} 
                                onChange={(e) => setMeta(p => ({...p, name: e.target.value}))} 
                                className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-700" 
                             />
                         </div>
                         <div>
                             <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Description</label>
                             <textarea 
                                value={meta.description} 
                                onChange={(e) => setMeta(p => ({...p, description: e.target.value}))} 
                                rows={2}
                                className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm text-slate-600 resize-none" 
                                placeholder="Briefly describe the project goals..."
                             />
                         </div>
                     </div>
                 </div>
            </div>

            {/* CARD 1: STAKEHOLDERS */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                    <div>
                        <h3 className="font-bold text-slate-800 text-lg">Stakeholder List</h3>
                        <p className="text-xs text-slate-400 mt-1">Define the key actors in the ecosystem.</p>
                    </div>
                </div>

                {/* Stacked Layout with Max Width */}
                <div className="flex flex-col gap-3 max-w-2xl">
                    {config.stakeholders.map((sh, idx) => (
                        <div 
                            key={sh.id} 
                            className="flex gap-2 items-center group p-2 hover:bg-slate-50 transition-colors rounded border border-transparent hover:border-slate-100"
                            draggable
                            onDragStart={(e) => onDragStart(e, idx, 'stakeholders')}
                            onDragEnter={(e) => onDragEnter(e, idx)}
                            onDragEnd={() => onDragEnd('stakeholders')}
                            onDragOver={(e) => e.preventDefault()}
                        >
                            <div className="cursor-grab text-slate-300 hover:text-slate-500 p-1">
                                <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z"/></svg>
                            </div>
                            
                            {/* Input before Color (Left to Right) */}
                            <input 
                                type="text" 
                                value={sh.label} 
                                onChange={(e) => updateStakeholder(idx, 'label', e.target.value)} 
                                className="flex-1 border border-slate-200 rounded p-1.5 text-sm outline-none focus:border-blue-400 min-w-0"
                            />

                            {/* Circular Color Swatch on Right */}
                             <div className="relative w-7 h-7 rounded-full border border-slate-200 shadow-sm shrink-0 overflow-hidden cursor-pointer hover:scale-105 transition-transform" style={{ backgroundColor: sh.color }}>
                                <input 
                                    type="color" 
                                    value={sh.color} 
                                    onChange={(e) => updateStakeholder(idx, 'color', e.target.value)}
                                    className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10"
                                    title="Pick color"
                                />
                            </div>

                            {!hasData && (
                                <button 
                                    onClick={() => removeStakeholder(idx)} 
                                    className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-300 hover:text-red-500 p-1 w-6 h-6 flex items-center justify-center"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                            )}
                        </div>
                    ))}
                    
                    <button 
                        onClick={addStakeholder} 
                        disabled={hasData} 
                        className="w-full py-2 border-2 border-dashed border-slate-200 text-slate-500 text-sm font-bold rounded-lg hover:border-blue-300 hover:text-blue-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
                    >
                        + Add Actor
                    </button>
                </div>
            </div>

            {/* CARD 2: RELATIONSHIP ZONES */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                     <div>
                        <h3 className="font-bold text-slate-800 text-lg">Relationship Zones</h3>
                        <p className="text-xs text-slate-400 mt-1">Distance-based mapping</p>
                     </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                    {/* List Column */}
                    <div className="w-full flex flex-col gap-2">
                        {/* TOGGLE FOR STAKEHOLDER COLORS */}
                        <div className="flex items-center justify-between mb-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                             <label className="text-sm font-bold text-slate-700 flex items-center gap-2 cursor-pointer select-none">
                                <div className="relative">
                                    <input 
                                        type="checkbox" 
                                        className="sr-only peer"
                                        checked={config.useStakeholderColors || false}
                                        onChange={handleToggleStakeholderColors}
                                    />
                                    <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                                </div>
                                <span>Use assigned stakeholder colors</span>
                            </label>
                            <span className="text-[10px] text-slate-400 uppercase tracking-wide">
                                Dynamic
                            </span>
                        </div>

                        <div className="space-y-2">
                            {config.relationshipZones.map((z, idx) => {
                                return (
                                <div 
                                    key={z.id} 
                                    className="flex gap-2 items-center p-2 rounded hover:bg-slate-50 transition-all group"
                                    draggable
                                    onDragStart={(e) => onDragStart(e, idx, 'relationshipZones')}
                                    onDragEnter={(e) => onDragEnter(e, idx)}
                                    onDragEnd={() => onDragEnd('relationshipZones')}
                                    onDragOver={(e) => e.preventDefault()}
                                >
                                    <div className="cursor-grab text-slate-300 hover:text-slate-500 p-1">
                                        <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor"><path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z"/></svg>
                                    </div>
                                    <span className="text-xs text-slate-400 w-4 font-mono">{idx+1}</span>
                                    
                                    <input type="text" value={z.label} onChange={(e) => updateZone('relationshipZones', idx, 'label', e.target.value)} className="flex-1 min-w-0 border border-slate-200 rounded p-1.5 text-xs outline-none focus:border-emerald-400" />

                                    <div className="w-6 h-6 rounded border border-slate-200 shadow-sm shrink-0" style={{ backgroundColor: z.color }}></div>
                                    
                                    {!hasData && config.relationshipZones.length > 1 && (
                                        <button 
                                            onClick={() => removeZone('relationshipZones', idx)}
                                            className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-red-500 rounded w-8 h-8 flex items-center justify-center"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    )}
                                </div>
                            )})}
                        </div>
                        
                        {/* + Add Zone Button - Aligned with input */}
                        <div className="flex gap-2">
                             <div className="w-[1.375rem]"></div>
                             <div className="w-4"></div>
                             
                             <button 
                                onClick={() => addZone('relationshipZones')} 
                                disabled={hasData} 
                                className="text-xs text-blue-600 font-bold hover:text-blue-700 hover:underline disabled:opacity-50 disabled:no-underline py-1"
                            >
                                + Add Zone
                            </button>
                        </div>
                    </div>
                    
                    {/* Preview Column */}
                    <div className="w-full flex items-start justify-center">
                        <div className="w-full bg-white rounded-full border border-slate-200 shadow-sm relative overflow-hidden aspect-square">
                            <svg viewBox={`0 0 ${BOARD_SIZE} ${BOARD_SIZE}`} className="w-full h-full">
                                <ZoneBackground 
                                    radius={previewRadius} 
                                    centerX={previewCenter} 
                                    centerY={previewCenter} 
                                    zones={config.relationshipZones}
                                    centerLabel=""
                                    themeColor={config.relationshipZones[0]?.color || '#000'}
                                />
                            </svg>
                        </div>
                    </div>
                </div>

                <ColorPalette 
                    type="relationshipZones" 
                    activeColor={relStartColor} 
                    onColorChange={handleThemeChange}
                    disabled={config.useStakeholderColors}
                />
            </div>

            {/* CARD 3: IMPACT ZONES */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                    <div>
                        <h3 className="font-bold text-slate-800 text-lg">Impact Zones</h3>
                        <p className="text-xs text-slate-400 mt-1">Importance-based mapping</p>
                     </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                    {/* List Column */}
                    <div className="w-full flex flex-col gap-2">
                        <div className="space-y-2">
                            {config.impactZones.map((z, idx) => {
                                return (
                                <div 
                                    key={z.id} 
                                    className="flex gap-2 items-center p-2 rounded hover:bg-slate-50 transition-all group"
                                    draggable
                                    onDragStart={(e) => onDragStart(e, idx, 'impactZones')}
                                    onDragEnter={(e) => onDragEnter(e, idx)}
                                    onDragEnd={() => onDragEnd('impactZones')}
                                    onDragOver={(e) => e.preventDefault()}
                                >
                                    <div className="cursor-grab text-slate-300 hover:text-slate-500 p-1">
                                        <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor"><path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z"/></svg>
                                    </div>
                                    <span className="text-xs text-slate-400 w-4 font-mono">{idx+1}</span>
                                    
                                    <input type="text" value={z.label} onChange={(e) => updateZone('impactZones', idx, 'label', e.target.value)} className="flex-1 min-w-0 border border-slate-200 rounded p-1.5 text-xs outline-none focus:border-blue-400" />

                                    <div className="w-6 h-6 rounded border border-slate-200 shadow-sm shrink-0" style={{ backgroundColor: z.color }}></div>
                                    
                                    {!hasData && config.impactZones.length > 1 && (
                                        <button 
                                            onClick={() => removeZone('impactZones', idx)}
                                            className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-red-500 rounded w-8 h-8 flex items-center justify-center"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    )}
                                </div>
                            )})}
                        </div>
                        
                        {/* + Add Zone Button - Aligned with input */}
                         <div className="flex gap-2">
                             <div className="w-[1.375rem]"></div>
                             <div className="w-4"></div>
                             
                             <button 
                                onClick={() => addZone('impactZones')} 
                                disabled={hasData} 
                                className="text-xs text-blue-600 font-bold hover:text-blue-700 hover:underline disabled:opacity-50 disabled:no-underline py-1"
                            >
                                + Add Zone
                            </button>
                        </div>
                    </div>

                    {/* Preview Column */}
                    <div className="w-full flex items-start justify-center">
                         <div className="w-full bg-white rounded-full border border-slate-200 shadow-sm relative overflow-hidden aspect-square">
                            <svg viewBox={`0 0 ${BOARD_SIZE} ${BOARD_SIZE}`} className="w-full h-full">
                                <ZoneBackground 
                                    radius={previewRadius} 
                                    centerX={previewCenter} 
                                    centerY={previewCenter} 
                                    zones={config.impactZones}
                                    centerLabel=""
                                    themeColor={config.impactZones[0]?.color || '#000'}
                                />
                            </svg>
                        </div>
                    </div>
                </div>

                <ColorPalette 
                    type="impactZones" 
                    activeColor={impStartColor} 
                    onColorChange={handleThemeChange}
                />
            </div>

            {/* DATABASE CONNECTION CARD */}
            {isFirebaseConfigured() && (
                <div className="bg-white border border-slate-200 p-6 rounded-xl mt-12 mb-4 flex items-start gap-4 shadow-sm">
                     <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                        <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>
                     </div>
                     <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-emerald-700 font-bold text-lg">Database Connected</h3>
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        </div>
                        <p className="text-slate-500 text-sm mt-1">
                            Your project data is securely synced to Firebase Realtime Database. Real-time collaboration is enabled.
                        </p>
                     </div>
                </div>
            )}

            {/* CARD 4: DANGER ZONE */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 mt-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                     <div className="flex items-start gap-4">
                         <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                             <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                         </div>
                        <div>
                            <h3 className="text-red-700 font-bold text-lg">Danger Zone</h3>
                            <p className="text-slate-500 text-sm mt-1">Deleting this project will permanently remove all data, including interview sessions.</p>
                        </div>
                    </div>
                    <button onClick={() => setShowConfirmDelete(true)} className="px-4 py-2 bg-white border border-red-200 text-red-600 text-sm font-bold rounded-lg hover:bg-red-600 hover:text-white transition-colors">Delete Project</button>
                </div>
            </div>
        </div>
    );
};
