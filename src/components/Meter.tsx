import React from 'react';

interface MeterProps {
    label: string;
    value: number;
    max: number;
    unit?: string;
    dangerThreshold?: number;
    warningThreshold?: number;
    color?: string;
}

export function Meter({ label, value, max, unit = '', dangerThreshold = 0.8, warningThreshold = 0.6, color = 'bg-emerald-500' }: MeterProps) {
    const percentage = Math.min(100, Math.max(0, (value / max) * 100));
    
    let barColor = color;
    if (percentage >= dangerThreshold * 100) {
        barColor = 'bg-red-500';
    } else if (percentage >= warningThreshold * 100) {
        barColor = 'bg-yellow-500';
    }

    return (
        <div className="mb-4">
            <div className="flex justify-between text-xs font-mono mb-1 text-slate-400 uppercase tracking-wider">
                <span>{label}</span>
                <span className={percentage >= dangerThreshold * 100 ? 'text-red-400 animate-pulse' : 'text-slate-300'}>
                    {value.toFixed(1)}{unit} / {max}{unit}
                </span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                <div 
                    className={`h-full ${barColor} transition-all duration-200 ease-out`}
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    );
}
