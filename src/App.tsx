import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, Power, Briefcase, FileText, Shield, DollarSign, Activity, Zap, ShieldAlert } from 'lucide-react';
import { GameState, LogEvent, SPE } from './types';
import { INITIAL_STATE, MAX_TEMP, MAX_PRES, MAX_POWER, PRICES, CHAPTERS } from './constants';
import { tick } from './engine';
import { Meter } from './components/Meter';
import { LogViewer } from './components/LogViewer';

export default function App() {
    const [state, setState] = useState<GameState>(INITIAL_STATE);
    const [logs, setLogs] = useState<LogEvent[]>([]);
    const [isRunning, setIsRunning] = useState(false);

    const addLog = useCallback((message: string, type: LogEvent['type'] = 'info') => {
        setLogs(prev => [...prev, {
            id: Date.now() + Math.random(),
            message,
            type,
            timestamp: new Date().toLocaleTimeString()
        }].slice(-50));
    }, []);

    useEffect(() => {
        if (!isRunning || state.gameOver) return;
        
        const interval = setInterval(() => {
            setState(prev => tick(prev, addLog));
        }, 1000); // 1 tick per second
        
        return () => clearInterval(interval);
    }, [isRunning, state.gameOver, addLog]);

    const handleAction = (action: string) => {
        setState(prev => {
            const next = { ...prev };
            switch (action) {
                case 'MARK_TO_MARKET':
                    next.cash += 5000;
                    next.score += 5;
                    next.totalHiddenDebt += 5000;
                    next.auditRisk += 5;
                    addLog("Booked future profits. +$5000 Cash, +$5 Stock Price.", "success");
                    break;
                case 'CREATE_SPE':
                    if (next.cash >= PRICES.CREATE_SPE) {
                        next.cash -= PRICES.CREATE_SPE;
                        const newSPE: SPE = {
                            id: `SPE-${Date.now()}`,
                            name: `LJM-${next.spes.length + 1}`,
                            debtHidden: 10000,
                            triggerPrice: Math.max(10, next.score - 20),
                            active: true
                        };
                        next.spes.push(newSPE);
                        next.totalHiddenDebt += 10000;
                        next.cash += 10000; // Loan against SPE
                        addLog(`Created SPE ${newSPE.name}. Hid $10k debt. Trigger: $${newSPE.triggerPrice.toFixed(2)}`, "info");
                    } else {
                        addLog("Not enough cash to create SPE.", "warning");
                    }
                    break;
                case 'LOBBY':
                    const lCost = PRICES.LOBBY * Math.pow(1.5, next.evasionCount);
                    const lEffect = 15 * Math.pow(0.8, next.evasionCount);
                    if (next.cash >= lCost) {
                        next.cash -= lCost;
                        next.lobbyingShieldTime += 30; // 30 ticks of protection
                        next.auditRisk = Math.max(0, next.auditRisk - lEffect);
                        next.evasionCount += 1;
                        addLog(`Lobbied Washington. Audit risk reduced by ${lEffect.toFixed(1)}. SEC Heat increased.`, "success");
                    } else {
                        addLog("Not enough cash to lobby.", "warning");
                    }
                    break;
                case 'SHRED':
                    const sCost = PRICES.SHRED * Math.pow(1.5, next.evasionCount);
                    const sEffect = 40 * Math.pow(0.8, next.evasionCount);
                    const sRisk = Math.min(0.8, 0.1 + (next.evasionCount * 0.08));
                    if (next.cash >= sCost) {
                        next.cash -= sCost;
                        next.evasionCount += 1;
                        if (Math.random() < sRisk) {
                            next.auditRisk += 50;
                            addLog(`WHISTLEBLOWER! Shredding discovered by SEC. (Risk was ${(sRisk*100).toFixed(0)}%)`, "danger");
                        } else {
                            next.auditRisk = Math.max(0, next.auditRisk - sEffect);
                            addLog(`Documents shredded successfully. Audit risk reduced by ${sEffect.toFixed(1)}. SEC Heat increased.`, "success");
                        }
                    } else {
                        addLog("Not enough cash to shred.", "warning");
                    }
                    break;
                case 'TOGGLE_SHORTAGE':
                    next.artificialShortage = !next.artificialShortage;
                    addLog(next.artificialShortage ? "Initiated artificial shortage. Prices spiking!" : "Ended artificial shortage.", "warning");
                    break;
            }
            return next;
        });
    };

    const handleControl = (control: 'rods' | 'valve', value: number) => {
        setState(prev => ({ ...prev, [control]: value }));
    };

    const currentLobbyCost = PRICES.LOBBY * Math.pow(1.5, state.evasionCount);
    const currentShredCost = PRICES.SHRED * Math.pow(1.5, state.evasionCount);
    const currentLobbyEffect = 15 * Math.pow(0.8, state.evasionCount);
    const currentShredEffect = 40 * Math.pow(0.8, state.evasionCount);
    const currentShredRisk = Math.min(0.8, 0.1 + (state.evasionCount * 0.08));

    if (state.gameOver) {
        return (
            <div className="min-h-screen bg-black text-red-500 flex flex-col items-center justify-center p-8 font-mono">
                <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="max-w-2xl text-center border border-red-900 bg-red-950/20 p-8 rounded-lg"
                >
                    <AlertTriangle className="w-24 h-24 mx-auto mb-6 text-red-600 animate-pulse" />
                    <h1 className="text-4xl font-bold mb-4 tracking-widest">SYSTEM FAILURE</h1>
                    <p className="text-xl mb-8 text-red-400">{state.failReason}</p>
                    
                    <div className="grid grid-cols-2 gap-4 text-left mb-8 text-sm">
                        <div className="border border-red-900/50 p-4">
                            <div className="text-red-700 mb-1">FINAL STOCK PRICE</div>
                            <div className="text-2xl">${state.score.toFixed(2)}</div>
                        </div>
                        <div className="border border-red-900/50 p-4">
                            <div className="text-red-700 mb-1">HIDDEN DEBT</div>
                            <div className="text-2xl">${state.totalHiddenDebt.toFixed(0)}</div>
                        </div>
                    </div>
                    
                    <button 
                        onClick={() => { setState(INITIAL_STATE); setLogs([]); setIsRunning(false); }}
                        className="px-8 py-3 bg-red-900 hover:bg-red-800 text-white rounded transition-colors uppercase tracking-widest"
                    >
                        Reboot System
                    </button>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-300 font-mono p-4 md:p-6 selection:bg-emerald-900 selection:text-emerald-100">
            {/* Header */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 border-b border-slate-800 pb-4">
                <div>
                    <h1 className="text-2xl font-bold text-emerald-500 tracking-widest flex items-center gap-2">
                        <Zap className="w-6 h-6" />
                        ENRON MELTDOWN MANAGER
                    </h1>
                    <div className="text-xs text-slate-500 mt-1 uppercase tracking-widest">
                        System: BWR-4 Nuclear Reactor [Legacy] | Date: {state.date} | Weather: {state.weather.toUpperCase()}
                    </div>
                    <div className="text-[10px] text-slate-600 mt-2 max-w-xl">
                        OBJECTIVE: Survive until late 2001. Keep stock price high. Manage the reactor to generate power. 
                        Balance Control Rods (heat) and Coolant Valve (cooling). Trigger artificial shortages to spike revenue, 
                        but beware of the SEC. Use SPEs to hide debt.
                    </div>
                </div>
                
                <div className="flex items-center gap-4 mt-4 md:mt-0">
                    <div className="text-right">
                        <div className="text-xs text-slate-500 uppercase tracking-widest">Stock Price (ENE)</div>
                        <div className={`text-3xl font-bold ${state.score > 80 ? 'text-emerald-400' : state.score < 30 ? 'text-red-400' : 'text-slate-200'}`}>
                            ${state.score.toFixed(2)}
                        </div>
                    </div>
                    <button 
                        onClick={() => setIsRunning(!isRunning)}
                        className={`p-3 rounded-full border ${isRunning ? 'border-red-500/30 text-red-400 hover:bg-red-950/30' : 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-950/30'} transition-colors`}
                    >
                        <Power className="w-6 h-6" />
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Reactor / Grid */}
                <div className="space-y-6">
                    <section className="bg-slate-900 border border-slate-800 rounded-lg p-4 shadow-xl">
                        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Activity className="w-4 h-4" />
                            Grid Operations
                        </h2>
                        
                        <Meter label="Core Temperature" value={state.temp} max={MAX_TEMP} unit="K" dangerThreshold={0.85} color="bg-orange-500" />
                        <Meter label="Pressure" value={state.pressure} max={MAX_PRES} unit="PSI" dangerThreshold={0.8} color="bg-blue-500" />
                        <Meter label="Power Output" value={state.power} max={MAX_POWER} unit="MW" color="bg-yellow-500" />
                        
                        <div className="mt-6 space-y-4">
                            <div>
                                <label className="flex justify-between text-xs text-slate-400 uppercase tracking-wider mb-2">
                                    <span>Control Rods (Dampen)</span>
                                    <span>{state.rods}%</span>
                                </label>
                                <input 
                                    type="range" min="0" max="100" value={state.rods}
                                    onChange={(e) => handleControl('rods', parseInt(e.target.value))}
                                    className="w-full accent-slate-500"
                                />
                            </div>
                            <div>
                                <label className="flex justify-between text-xs text-slate-400 uppercase tracking-wider mb-2">
                                    <span>Coolant Valve (Flow)</span>
                                    <span>{state.valve}%</span>
                                </label>
                                <input 
                                    type="range" min="0" max="100" value={state.valve}
                                    onChange={(e) => handleControl('valve', parseInt(e.target.value))}
                                    className="w-full accent-blue-500"
                                />
                            </div>
                        </div>

                        <div className="mt-6 pt-4 border-t border-slate-800">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-xs text-slate-400 uppercase tracking-wider">Grid Frequency</span>
                                <span className={`text-sm font-bold ${state.gridHz < 59.5 ? 'text-red-400 animate-pulse' : 'text-emerald-400'}`}>
                                    {state.gridHz.toFixed(2)} Hz
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-slate-400 uppercase tracking-wider">Grid Demand</span>
                                <span className="text-sm text-slate-300">{state.gridDemand.toFixed(0)} MW</span>
                            </div>
                        </div>
                    </section>
                </div>

                {/* Middle Column: Financials */}
                <div className="space-y-6">
                    <section className="bg-slate-900 border border-slate-800 rounded-lg p-4 shadow-xl">
                        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Briefcase className="w-4 h-4" />
                            The Boardroom
                        </h2>
                        
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="bg-slate-950 border border-slate-800 p-3 rounded">
                                <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Cash Reserves</div>
                                <div className={`text-xl font-bold ${state.cash < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                                    ${state.cash.toFixed(0)}
                                </div>
                            </div>
                            <div className="bg-slate-950 border border-slate-800 p-3 rounded">
                                <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Hidden Debt</div>
                                <div className="text-xl font-bold text-orange-400">
                                    ${state.totalHiddenDebt.toFixed(0)}
                                </div>
                            </div>
                        </div>

                        <Meter label="SEC Audit Risk" value={state.auditRisk} max={100} unit="%" dangerThreshold={0.7} color="bg-red-500" />
                        
                        <div className="mt-6 space-y-3">
                            <button 
                                onClick={() => handleAction('MARK_TO_MARKET')}
                                className="w-full flex items-center justify-between p-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded transition-colors text-sm"
                            >
                                <span className="flex items-center gap-2"><DollarSign className="w-4 h-4 text-emerald-400" /> Mark-to-Market</span>
                                <span className="text-xs text-slate-400">Boost Stock / Hide Losses</span>
                            </button>
                            
                            <button 
                                onClick={() => handleAction('CREATE_SPE')}
                                disabled={state.cash < PRICES.CREATE_SPE}
                                className="w-full flex items-center justify-between p-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <span className="flex items-center gap-2"><Briefcase className="w-4 h-4 text-orange-400" /> Create SPE</span>
                                <span className="text-xs text-slate-400">-${PRICES.CREATE_SPE}</span>
                            </button>

                            <button 
                                onClick={() => handleAction('TOGGLE_SHORTAGE')}
                                className={`w-full flex items-center justify-between p-3 border rounded transition-colors text-sm ${state.artificialShortage ? 'bg-red-900/30 border-red-500/50 text-red-400' : 'bg-slate-800 hover:bg-slate-700 border-slate-700'}`}
                            >
                                <span className="flex items-center gap-2"><Zap className="w-4 h-4" /> Artificial Shortage</span>
                                <span className="text-xs opacity-70">Spike Energy Prices</span>
                            </button>
                        </div>

                        {state.spes.length > 0 && (
                            <div className="mt-6 pt-4 border-t border-slate-800">
                                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Active SPEs</h3>
                                <div className="space-y-2 max-h-32 overflow-y-auto pr-2">
                                    {state.spes.filter(s => s.active).map(spe => (
                                        <div key={spe.id} className="flex justify-between items-center text-xs bg-slate-950 p-2 rounded border border-slate-800">
                                            <span className="text-slate-300">{spe.name}</span>
                                            <div className="text-right">
                                                <div className="text-orange-400">${spe.debtHidden.toFixed(0)}</div>
                                                <div className="text-slate-500 text-[10px]">Trigger: ${spe.triggerPrice.toFixed(2)}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </section>
                </div>

                {/* Right Column: Corporate Actions & Logs */}
                <div className="space-y-6 flex flex-col h-full">
                    <section className="bg-slate-900 border border-slate-800 rounded-lg p-4 shadow-xl">
                        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <ShieldAlert className="w-4 h-4" />
                            Damage Control
                        </h2>
                        
                        <div className="mb-6">
                            <Meter label="SEC Heat Level" value={state.evasionCount} max={10} dangerThreshold={0.7} warningThreshold={0.4} color="bg-yellow-500" />
                        </div>
                        
                        <div className="space-y-3">
                            <button 
                                onClick={() => handleAction('LOBBY')}
                                disabled={state.cash < currentLobbyCost}
                                className="w-full flex items-center justify-between p-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <div className="flex flex-col items-start">
                                    <span className="flex items-center gap-2"><Shield className="w-4 h-4 text-blue-400" /> Lobby Washington</span>
                                    <span className="text-[10px] text-slate-500 mt-1">Reduces risk by {currentLobbyEffect.toFixed(1)}</span>
                                </div>
                                <span className="text-xs text-slate-400">-${currentLobbyCost.toFixed(0)}</span>
                            </button>
                            
                            <button 
                                onClick={() => handleAction('SHRED')}
                                disabled={state.cash < currentShredCost}
                                className="w-full flex items-center justify-between p-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <div className="flex flex-col items-start">
                                    <span className="flex items-center gap-2"><FileText className="w-4 h-4 text-slate-400" /> Shred Documents</span>
                                    <span className="text-[10px] text-slate-500 mt-1">Reduces risk by {currentShredEffect.toFixed(1)} | {(currentShredRisk*100).toFixed(0)}% fail chance</span>
                                </div>
                                <span className="text-xs text-slate-400">-${currentShredCost.toFixed(0)}</span>
                            </button>
                        </div>
                        <div className="mt-3 text-[10px] text-slate-500 text-center italic">
                            Each evasion increases SEC Heat, raising future costs and reducing effectiveness.
                        </div>
                    </section>

                    <section className="bg-slate-900 border border-slate-800 rounded-lg p-4 shadow-xl flex-1 flex flex-col">
                        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">System Log</h2>
                        <div className="flex-1 min-h-0">
                            <LogViewer logs={logs} />
                        </div>
                    </section>
                </div>
            </div>
            
            {/* Chapter Info */}
            <div className="mt-8 text-center text-xs text-slate-600 uppercase tracking-widest">
                {CHAPTERS[state.currentChapter].title} - {CHAPTERS[state.currentChapter].year}
                <div className="mt-1 opacity-70">{CHAPTERS[state.currentChapter].description}</div>
            </div>
        </div>
    );
}
