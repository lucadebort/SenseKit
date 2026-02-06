
import React, { useState, useMemo } from 'react';
import { InterviewSession, Project } from '../types';
import { normalizeDistance, getImpactScore } from '../utils';
import {
  Button,
  SearchInput,
  SortIcon,
  Card,
  CardContent,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@sensekit/shared-ui';

interface RawDataTableProps {
    sessions: InterviewSession[];
    project: Project;
    onViewSession: (s: InterviewSession) => void;
    type: 'relational' | 'impact';
}

type SortKey = 'sessionId' | 'notes' | 'role' | string;
type SortDirection = 'asc' | 'desc';

export const RawDataTable: React.FC<RawDataTableProps> = ({ sessions, project, onViewSession, type }) => {
    const [filterText, setFilterText] = useState('');
    const [roleFilter, setRoleFilter] = useState('ALL');
    const [sortKey, setSortKey] = useState<SortKey>('timestamp');
    const [sortDir, setSortDir] = useState<SortDirection>('desc');

    const stakeholders = project.config.stakeholders;
    const isRelational = type === 'relational';

    const getValue = (session: InterviewSession, targetId: string): number | null => {
        const map = isRelational ? session.relationshipMap : session.centralityMap;
        const item = map?.find(i => i.id === targetId);

        if (!item || !item.position) return null;

        const dist = normalizeDistance(item.position);
        if (isRelational) {
            return dist;
        } else {
            return getImpactScore(dist);
        }
    };

    const getShLabel = (id: string) => stakeholders.find(s => s.id === id)?.label || id;

    const filteredSessions = useMemo(() => {
        return sessions.filter(s => {
            const matchesText = (s.notes || '').toLowerCase().includes(filterText.toLowerCase()) ||
                                s.sessionId.toLowerCase().includes(filterText.toLowerCase());
            const matchesRole = roleFilter === 'ALL' || s.respondentId === roleFilter;
            return matchesText && matchesRole;
        });
    }, [sessions, filterText, roleFilter]);

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
                const metricA = getValue(a, sortKey);
                const metricB = getValue(b, sortKey);
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
            setSortDir('desc');
        }
    };

    const handleExport = () => {
        let csvContent = "data:text/csv;charset=utf-8,";

        const headers = [
            "Session ID", "Date", "Role", "Name",
            ...stakeholders.map(s => `${s.label} (${isRelational ? 'Dist' : 'Score'})`)
        ];
        csvContent += headers.join(",") + "\r\n";

        sortedSessions.forEach(s => {
            const row = [
                s.sessionId,
                new Date(s.timestamp).toLocaleDateString('it-IT'),
                getShLabel(s.respondentId),
                `"${s.notes || ''}"`
            ];

            stakeholders.forEach(sh => {
                const val = getValue(s, sh.id);
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

    const getColorClass = (val: number | null) => {
        if (val === null) return 'text-muted-foreground';

        if (isRelational) {
            if (val <= 30) return 'text-emerald-600 font-bold';
            if (val <= 70) return 'text-foreground';
            return 'text-amber-600';
        } else {
            if (val >= 80) return 'text-blue-700 font-bold';
            if (val >= 50) return 'text-blue-500';
            return 'text-muted-foreground';
        }
    };

    return (
        <Card className="overflow-hidden mt-8">
            <div className="p-4 border-b border-border bg-muted/50 flex flex-col md:flex-row justify-between items-end md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <div>
                        <h3 className="font-bold text-foreground text-lg">
                            {isRelational ? 'Raw Data (Distance)' : 'Raw Data (Impact Score)'}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1">
                            {isRelational
                                ? "0 = Closest (Center), 100 = Farthest (Edge)."
                                : "100 = Critical (Center), 0 = Peripheral (Edge)."}
                        </p>
                    </div>
                </div>

                {/* Filters & Actions */}
                <div className="flex gap-2 w-full md:w-auto items-center">
                    <SearchInput
                        placeholder="Search Name or ID..."
                        value={filterText}
                        onChange={e => setFilterText(e.target.value)}
                        onClear={() => setFilterText('')}
                        className="w-full md:w-48 h-9"
                    />

                    {/* Role Filter */}
                    <div className="relative">
                        <select
                            value={roleFilter}
                            onChange={e => setRoleFilter(e.target.value)}
                            className="appearance-none pl-3 pr-8 py-2 border border-input rounded-lg text-xs bg-background outline-none focus:border-primary min-w-[120px] h-9 text-foreground"
                        >
                            <option value="ALL">All Roles</option>
                            {stakeholders.map(s => (
                                <option key={s.id} value={s.id}>{s.label}</option>
                            ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-muted-foreground">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </div>
                    </div>

                    <Button
                        variant="outline" size="icon"
                        onClick={handleExport}
                        title="Export View to CSV"
                        className="h-9 w-9 shrink-0"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    </Button>
                </div>
            </div>

            <div className="overflow-x-auto">
                <Table className="table-fixed min-w-[800px]">
                    <TableHeader>
                        <TableRow>
                            <TableHead
                                className="cursor-pointer hover:bg-muted transition-colors w-48"
                                onClick={() => handleSort('notes')}
                            >
                                <div className="flex items-center">
                                    Name <SortIcon active={sortKey === 'notes'} direction={sortDir} />
                                </div>
                            </TableHead>
                            <TableHead
                                className="cursor-pointer hover:bg-muted transition-colors w-32"
                                onClick={() => handleSort('role')}
                            >
                                <div className="flex items-center">
                                    Role <SortIcon active={sortKey === 'role'} direction={sortDir} />
                                </div>
                            </TableHead>
                            {stakeholders.map(s => (
                                <TableHead
                                    key={s.id}
                                    className="text-center cursor-pointer hover:bg-muted transition-colors border-l border-border/50"
                                    onClick={() => handleSort(s.id)}
                                >
                                    <div className="flex items-center justify-center gap-1">
                                        <span className={`truncate ${isRelational && roleFilter === s.id ? 'opacity-30' : ''}`}>
                                            {s.label}
                                        </span>
                                        <SortIcon active={sortKey === s.id} direction={sortDir} />
                                    </div>
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sortedSessions.map(s => (
                            <TableRow key={s.sessionId}>
                                <TableCell className="truncate">
                                    <div className="flex flex-col truncate">
                                        <span className="font-bold text-foreground text-sm mb-0.5 truncate" title={s.notes}>{s.notes || 'No Name'}</span>
                                        <button
                                            onClick={() => onViewSession(s)}
                                            className="text-primary text-[10px] hover:underline font-mono text-left w-fit"
                                        >
                                            {s.sessionId.substring(0,8)}...
                                        </button>
                                    </div>
                                </TableCell>
                                <TableCell className="text-muted-foreground truncate">
                                    {getShLabel(s.respondentId)}
                                </TableCell>
                                {stakeholders.map(sh => {
                                    const val = getValue(s, sh.id);

                                    if (isRelational && s.respondentId === sh.id) {
                                        return (
                                            <TableCell key={sh.id} className="text-center border-l border-border/50 bg-muted/30">
                                                <span className="text-muted-foreground/50 text-xs">-</span>
                                            </TableCell>
                                        );
                                    }

                                    return (
                                        <TableCell key={sh.id} className="text-center border-l border-border/50">
                                            {val !== null ? (
                                                <span className={`${getColorClass(val)} tabular-nums`}>{val}</span>
                                            ) : (
                                                <span className="text-muted-foreground/30 text-xs">-</span>
                                            )}
                                        </TableCell>
                                    );
                                })}
                            </TableRow>
                        ))}
                        {sortedSessions.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={2 + stakeholders.length} className="text-center py-12 text-muted-foreground italic">
                                    No matching data found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </Card>
    );
};
