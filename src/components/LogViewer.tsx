import React, { useEffect, useRef } from 'react';
import { LogEvent } from '../types';

export function LogViewer({ logs }: { logs: LogEvent[] }) {
    const endRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    return (
        <div className="h-48 overflow-y-auto bg-slate-900 border border-slate-700 rounded p-2 font-mono text-xs">
            {logs.map(log => {
                let color = 'text-slate-300';
                if (log.type === 'danger') color = 'text-red-400 font-bold';
                if (log.type === 'warning') color = 'text-yellow-400';
                if (log.type === 'success') color = 'text-emerald-400';
                if (log.type === 'info') color = 'text-blue-400';

                return (
                    <div key={log.id} className={`mb-1 ${color}`}>
                        <span className="opacity-50 mr-2">[{log.timestamp}]</span>
                        {log.message}
                    </div>
                );
            })}
            <div ref={endRef} />
        </div>
    );
}
