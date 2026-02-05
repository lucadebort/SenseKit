
import React, { useState, useMemo } from 'react';
import { InterviewSession, Project } from '../types';
import { normalizeDistance, getImpactScore } from '../utils';

interface RawDataTableProps {
    sessions: InterviewSession[];
    project: Project;
    onViewSession: (s: InterviewSession) => void;
    type: 'relational' | 'impact';
}

type SortKey = 'sessionId' | 'notes' | 'role' | string; // string for dynamic stakeholder IDs
type SortDirection = 'asc' | 'desc';

// SVG Sort Icon Component for Consistency (Identical to ProjectList)
const SortIcon = ({ active, direction }: { active: boolean; direction: SortDirection }) => {
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

export const RawDataTable: React.FC<RawDataTableProps> = ({ sessions, project, onViewSession, type }) => {
    const [filterText, setFilterText] = useState('');
    const [roleFilter, setRoleFilter] = useState('ALL');
    const [sortKey, setSortKey] = useState<SortKey>('timestamp');
    const [sortDir, setSortDir] = useState<SortDirection>('desc');

    const stakeholders = project.config.stakeholders;
    const isRelational = type === 'relational';

    // Helper to get value based on type
    const getValue = (session: InterviewSession, targetId: string): number | null => {
        const map = isRelational ? session.relationshipMap : session.centralityMap;
        const item = map?.find(i => i.id === targetId);
        
        if (!item || !item.position) return null;
        
        const dist = normalizeDistance(item.position);
        if (isRelational) {
            // Return Distance (0-100)
            return dist;
        } else {
            // Return Impact Score (0-100)
            return getImpactScore(dist);
        }
    };

    const getShLabel = (id: string) => stakeholders.find(s => s.id === id)?.label || id;

    // 1. Filter
    const filteredSessions = useMemo(() => {
        return sessions.filter(s => {
            const matchesText = (s.notes || '').toLowerCase().includes(filterText.toLowerCase()) || 
                                s.sessionId.toLowerCase().includes(filterText.toLowerCase());
            const matchesRole = roleFilter === 'ALL' || s.respondentId === roleFilter;
            return matchesText && matchesRole;
        });
    }, [sessions, filterText, roleFilter]);

    // 2. Sort
    const sortedSessions = useMemo(() => {
        return [...filteredSessions].sort((a, b) => {
            let valA: any = '';
            let valB: any = '';

            if (sortKey === 'sessionId') {
                valA = a.sessionId;
                valB = b.sessionId;
            } else if (sortKey === 'notes') {
                valA = a.notes || '';
                valB = b.notes || '';
            } else if (sortKey === 'role') {
                valA = getShLabel(a.respondentId);
                valB = getShLabel(b.respondentId);
            } else if (sortKey === 'timestamp') {
                valA = a.timestamp;
                valB = b.timestamp;
            } else {
                // Dynamic Stakeholder Sort
                const metricA = getValue(a, sortKey);
                const metricB = getValue(b, sortKey);
                // Treat nulls as -1 (always at bottom/top depending on sort)
                valA = metricA === null ? -1 : metricA;
                valB = metricB === null ? -1 : metricB;
            }

            if (valA < valB) return sortDir === 'asc' ? -1 : 1;
            if (valA > valB) return sortDir === 'asc' ? 1 : -1;
            return 0;
        });
    }, [filteredSessions, sortKey, sortDir, stakeholders, isRelational]);

    const handleSort = (key: string) => {
        if (sortKey === key) {
            setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortDir('desc'); // Default to desc (High score / Newest)
        }
    };

    const handleExport = () => {
        let csvContent = "data:text/csv;charset=utf-8,";
        
        // Headers
        const headers = [
            "Session ID", "Date", "Role", "Name",
            ...stakeholders.map(s => `${s.label} (${isRelational ? 'Dist' : 'Score'})`)
        ];
        csvContent += headers.join(",") + "\r\n";

        // Rows
        sortedSessions.forEach(s => {
            const row = [
                s.sessionId,
                new Date(s.timestamp).toLocaleDateString('it-IT'),
                getShLabel(s.respondentId),
                `"${s.notes || ''}"`
            ];

            stakeholders.forEach(sh => {
                const val = getValue(s, sh.id);
                // Handle self-relation in Relational map
                if (isRelational && s.respondentId === sh.id) {
                    row.push("N/A");
                } else {
                    row.push(val !== null ? val.toString() : "");
                }
            });
            csvContent += row.join(",") + "\r\n";
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `table_export_${type}_${new Date().toISOString().slice(0,10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Color logic
    const getColorClass = (val: number | null) => {
        if (val === null) return 'text-slate-400';
        
        if (isRelational) {
            // Distance: Lower is "Better/Closer" (Green), Higher is "Far" (Amber/Red)
            if (val <= 30) return 'text-emerald-600 font-bold';
            if (val <= 70) return 'text-slate-700';
            return 'text-amber-600';
        } else {
            // Impact: Higher is "Better/Critical" (Green), Lower is "Peripheral" (Slate)
            if (val >= 80) return 'text-blue-700 font-bold';
            if (val >= 50) return 'text-blue-500';
            return 'text-slate-500';
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mt-8">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col md:flex-row justify-between items-end md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <div>
                        <h3 className="font-bold text-slate-800 text-lg">
                            {isRelational ? 'Raw Data (Distance)' : 'Raw Data (Impact Score)'}
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">
                            {isRelational 
                                ? "0 = Closest (Center), 100 = Farthest (Edge)." 
                                : "100 = Critical (Center), 0 = Peripheral (Edge)."}
                        </p>
                    </div>
                </div>
                
                {/* Filters & Actions */}
                <div className="flex gap-2 w-full md:w-auto items-center">
                    {/* Search Input with Clear */}
                    <div className="relative w-full md:w-48">
                        <input 
                            type="text" 
                            placeholder="Search Name or ID..." 
                            value={filterText}
                            onChange={e => setFilterText(e.target.value)}
                            className="px-3 py-2 border border-slate-300 rounded-lg text-xs w-full outline-none focus:border-blue-500 pr-8 h-9"
                        />
                        {filterText && (
                            <button 
                                onClick={() => setFilterText('')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                            >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        )}
                    </div>

                    {/* Custom Select for Role */}
                    <div className="relative">
                        <select 
                            value={roleFilter} 
                            onChange={e => setRoleFilter(e.target.value)}
                            className="appearance-none pl-3 pr-8 py-2 border border-slate-300 rounded-lg text-xs bg-white outline-none focus:border-blue-500 min-w-[120px] h-9"
                        >
                            <option value="ALL">All Roles</option>
                            {stakeholders.map(s => (
                                <option key={s.id} value={s.id}>{s.label}</option>
                            ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-slate-500">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </div>
                    </div>

                    {/* EXPORT BUTTON - Square Icon Only */}
                    <button 
                        onClick={handleExport}
                        className="w-9 h-9 flex items-center justify-center bg-white border border-slate-300 rounded-lg text-slate-500 hover:text-blue-600 hover:border-blue-400 transition-all shadow-sm shrink-0"
                        title="Export View to CSV"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto">
                {/* table-fixed allows equal column widths for the stakeholders if we set widths for fixed cols */}
                <table className="w-full text-sm text-left table-fixed min-w-[800px]">
                    <thead className="bg-white border-b border-slate-200 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
                        <tr>
                            <th 
                                className="px-4 py-4 cursor-pointer hover:bg-slate-50 transition-colors w-48"
                                onClick={() => handleSort('notes')}
                            >
                                <div className="flex items-center">
                                    Name <SortIcon active={sortKey === 'notes'} direction={sortDir} />
                                </div>
                            </th>
                            <th 
                                className="px-4 py-4 cursor-pointer hover:bg-slate-50 transition-colors w-32"
                                onClick={() => handleSort('role')}
                            >
                                <div className="flex items-center">
                                    Role <SortIcon active={sortKey === 'role'} direction={sortDir} />
                                </div>
                            </th>
                            {/* Stakeholder Columns */}
                            {stakeholders.map(s => (
                                <th 
                                    key={s.id}
                                    className="px-2 py-4 text-center cursor-pointer hover:bg-slate-50 transition-colors border-l border-slate-100"
                                    onClick={() => handleSort(s.id)}
                                >
                                    <div className="flex items-center justify-center gap-1">
                                        <span className={`truncate ${isRelational && roleFilter === s.id ? 'opacity-30' : ''}`}>
                                            {s.label}
                                        </span>
                                        <SortIcon active={sortKey === s.id} direction={sortDir} />
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {sortedSessions.map(s => (
                            <tr key={s.sessionId} className="hover:bg-slate-50/80 transition-colors">
                                <td className="px-4 py-4 truncate">
                                    <div className="flex flex-col truncate">
                                        <span className="font-bold text-slate-700 text-sm mb-0.5 truncate" title={s.notes}>{s.notes || 'No Name'}</span>
                                        <button 
                                            onClick={() => onViewSession(s)}
                                            className="text-blue-600 text-[10px] hover:underline font-mono text-left w-fit"
                                        >
                                            {s.sessionId.substring(0,8)}...
                                        </button>
                                    </div>
                                </td>
                                <td className="px-4 py-4 text-slate-600 truncate">
                                    {getShLabel(s.respondentId)}
                                </td>
                                {stakeholders.map(sh => {
                                    const val = getValue(s, sh.id);
                                    
                                    // If relational and self, show dash
                                    if (isRelational && s.respondentId === sh.id) {
                                        return (
                                            <td key={sh.id} className="px-4 py-4 text-center border-l border-slate-100 bg-slate-50/50">
                                                <span className="text-slate-300 text-xs">-</span>
                                            </td>
                                        );
                                    }

                                    return (
                                        <td key={sh.id} className="px-4 py-4 text-center border-l border-slate-100">
                                            {val !== null ? (
                                                <span className={`${getColorClass(val)} tabular-nums`}>{val}</span>
                                            ) : (
                                                <span className="text-slate-200 text-xs">-</span>
                                            )}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                        {sortedSessions.length === 0 && (
                            <tr>
                                <td colSpan={2 + stakeholders.length} className="px-6 py-12 text-center text-slate-400 italic">
                                    No matching data found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
