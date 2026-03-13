import { GameState, LogEvent, SPE, Chapter } from "./types";
import { MAX_TEMP, MAX_PRES, MELTDOWN_TEMP_START, MELTDOWN_PRES_START, START_DATE, HISTORIC_EVENTS, HISTORIC_WEATHER_PATTERNS, CHAPTERS } from "./constants";

export function tick(state: GameState, addLog: (msg: string, type: LogEvent['type']) => void): GameState {
    if (state.gameOver) return state;

    const next = { ...state };
    
    // Time & Date
    next.dayTime += 1; // Let's say 1 tick = 1 hour
    if (next.dayTime >= 24) {
        next.dayTime = 0;
        next.dayCount += 1;
        
        const currentDate = new Date(START_DATE);
        currentDate.setDate(currentDate.getDate() + next.dayCount);
        next.date = currentDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        
        // Check Historic Events
        const currentMonth = currentDate.getMonth() + 1;
        const currentYear = currentDate.getFullYear();
        
        HISTORIC_EVENTS.forEach(ev => {
            if (ev.month === currentMonth && ev.year === currentYear && next.dayCount % 30 === 1) { // Trigger once per month
                addLog(`HISTORIC EVENT: ${ev.title} - ${ev.description}`, ev.type);
                if (ev.effect) ev.effect(next);
            }
        });
        
        // Weather
        const weather = HISTORIC_WEATHER_PATTERNS.find(w => w.month === currentMonth && w.year === currentYear);
        if (weather) {
            next.weather = weather.type;
            next.gridDemand = 600 * weather.demandMod * CHAPTERS[next.currentChapter].modifiers.demandScale;
        } else {
            next.weather = 'sunny';
            next.gridDemand = 600 * CHAPTERS[next.currentChapter].modifiers.demandScale;
        }
    }

    // Physics
    next.reactivity = ((100 - next.rods) / 100) * next.fuel;
    
    let flowRate = next.pump ? (next.valve / 100) * (next.pumpHealth / 100) * 100 * next.pumpLevel : 0;
    next.flowRate = flowRate;
    
    // Temp changes
    const tempIncrease = next.reactivity * 2.5;
    const tempDecrease = flowRate * 1.2;
    next.temp = Math.max(300, next.temp + tempIncrease - tempDecrease);
    
    // Pressure
    next.pressure = Math.max(0, (next.temp - 300) * 0.8);
    
    // Power Generation
    if (next.temp > 500) {
        next.power = (next.temp - 500) * 0.5 * (next.turbineHealth / 100);
    } else {
        next.power = 0;
    }
    
    // Grid Math
    const powerDiff = next.power - next.gridDemand;
    next.gridHz = 60 + (powerDiff * 0.005);
    
    if (next.gridHz < 59.5 || next.artificialShortage) {
        if (!next.brownoutActive) {
            addLog("BROWNOUT WARNING: Grid frequency critical. Rolling blackouts initiated.", "warning");
        }
        next.brownoutActive = true;
    } else {
        next.brownoutActive = false;
    }
    
    // Financials
    let revenue = next.power * 0.1;
    if (next.brownoutActive) {
        // Enron makes bank on shortages
        revenue *= 5.0; 
        if (Math.random() < 0.05) {
            next.auditRisk += 0.5 * CHAPTERS[next.currentChapter].modifiers.regulatorAggression;
        }
    }
    
    if (next.artificialShortage) {
        if (Math.random() < 0.1) {
            next.auditRisk += 1.0 * CHAPTERS[next.currentChapter].modifiers.regulatorAggression;
        }
    }
    
    // Operating costs
    const costs = (flowRate * 0.05) + (next.totalHiddenDebt * 0.001);
    next.cash += (revenue - costs);
    
    // Stock Price (Score)
    const baseScore = 40;
    const cashFactor = next.cash / 1000;
    const debtFactor = next.totalHiddenDebt / 2000;
    const powerFactor = next.power / 100;
    const volatility = CHAPTERS[next.currentChapter].modifiers.volatility;
    
    let targetScore = baseScore + cashFactor - debtFactor + powerFactor;
    // Add some random volatility
    targetScore += (Math.random() - 0.5) * 2 * volatility;
    
    // Smooth score changes
    next.score = next.score * 0.95 + targetScore * 0.05;
    
    // SPE Triggers
    next.spes.forEach(spe => {
        if (spe.active && next.score < spe.triggerPrice) {
            spe.active = false;
            next.totalHiddenDebt -= spe.debtHidden;
            next.cash -= spe.debtHidden; // Debt comes back to bite
            next.auditRisk += 25;
            addLog(`SPE COLLAPSE: ${spe.name} triggered! Debt returned to balance sheet.`, "danger");
        }
    });
    
    // Lobbying Shield decay
    if (next.lobbyingShieldTime > 0) {
        next.lobbyingShieldTime -= 1;
        next.auditRisk = Math.max(0, next.auditRisk - 0.1);
    }
    
    // Win/Loss Conditions
    if (next.temp > MAX_TEMP || next.pressure > MAX_PRES) {
        next.gameOver = true;
        next.failReason = "CATASTROPHIC MELTDOWN. Infrastructure destroyed.";
    } else if (next.cash < -5000) {
        next.gameOver = true;
        next.failReason = "BANKRUPTCY. Margin calls failed.";
    } else if (next.auditRisk >= 100) {
        next.gameOver = true;
        next.failReason = "SEC RAID. Accounting fraud exposed. You are going to prison.";
    }
    
    // Chapter progression
    if (CHAPTERS[next.currentChapter].winCondition(next)) {
        if (next.currentChapter < CHAPTERS.length - 1) {
            next.currentChapter += 1;
            addLog(`CHAPTER COMPLETE: Moving to ${CHAPTERS[next.currentChapter].title}`, "success");
        } else {
            next.gameOver = true;
            next.failReason = "YOU ESCAPED. Millions secured offshore. The company burns behind you.";
        }
    }

    return next;
}
