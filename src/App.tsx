/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Settings2, 
  RefreshCw, 
  Info,
  ChevronRight,
  BarChart3,
  LineChart as LineChartIcon,
  PieChart,
  ShieldAlert,
  Plus,
  Trash2,
  Layers,
  Grid3X3,
  Palette,
  Sparkles,
  Target,
  Clock,
  Wallet,
  ArrowRight,
  Download,
  Lock,
  User,
  Key,
  LogIn,
  LogOut,
  Sun,
  Moon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { runMultiMonteCarlo, type MultiSimulationParams, type MultiSimulationResult, type AssetParams } from './lib/simulation';
import { cn, formatCurrency, formatPercent, downloadCSV } from './lib/utils';
import { generatePortfolio, analyzeStockEntry, type PortfolioResponse, type StockRecommendation, type StockEntryAnalysis } from './services/geminiService';

const ASSET_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Violet
  '#EC4899', // Pink
  '#06B6D4', // Cyan
];

const INITIAL_ASSETS: AssetParams[] = [
  { id: '1', name: 'S&P 500', initialPrice: 5200, drift: 0.09, volatility: 0.18, color: ASSET_COLORS[0] },
  { id: '2', name: 'Gold', initialPrice: 2350, drift: 0.06, volatility: 0.15, color: ASSET_COLORS[1] },
];

export default function App() {
  const [assets, setAssets] = useState<AssetParams[]>(INITIAL_ASSETS);
  const [correlations, setCorrelations] = useState<number[][]>([
    [1, 0.2],
    [0.2, 1]
  ]);
  const [timeHorizon, setTimeHorizon] = useState(30);
  const [numSimulations, setNumSimulations] = useState(100);
  
  const [result, setResult] = useState<MultiSimulationResult | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [activeTab, setActiveTab] = useState<'portfolio' | 'assets' | 'advisor' | 'entry'>('portfolio');
  const [chartType, setChartType] = useState<'line' | 'radar'>('line');

  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState('');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [showSettings, setShowSettings] = useState(false);

  // AI Advisor State
  const [advisorBudget, setAdvisorBudget] = useState(8);
  const [advisorStrategy, setAdvisorStrategy] = useState('growth');
  const [advisorHorizon, setAdvisorHorizon] = useState('5 minutes');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiPortfolio, setAiPortfolio] = useState<PortfolioResponse | null>(null);

  // Entry Advisor State
  const [entryTicker, setEntryTicker] = useState('');
  const [isAnalyzingEntry, setIsAnalyzingEntry] = useState(false);
  const [entryAnalysis, setEntryAnalysis] = useState<StockEntryAnalysis | null>(null);

  const handleSimulate = () => {
    setIsSimulating(true);
    setTimeout(() => {
      const res = runMultiMonteCarlo({
        assets,
        correlations,
        timeHorizon,
        numSimulations,
        stepsPerDay: 1
      });
      setResult(res);
      setIsSimulating(false);
    }, 400);
  };

  const handleGeneratePortfolio = async () => {
    setIsGenerating(true);
    try {
      const res = await generatePortfolio(advisorBudget, advisorStrategy, advisorHorizon);
      setAiPortfolio(res);
    } catch (error) {
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAnalyzeEntry = async () => {
    if (!entryTicker) return;
    setIsAnalyzingEntry(true);
    try {
      const res = await analyzeStockEntry(entryTicker);
      setEntryAnalysis(res);
    } catch (error) {
      console.error(error);
    } finally {
      setIsAnalyzingEntry(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginUser === 'Aafiurrahmanbarek' && loginPass === '895811') {
      setIsAuthenticated(true);
      setLoginError('');
    } else {
      setLoginError('Invalid credentials. Access denied.');
    }
  };

  const importAiPortfolio = () => {
    if (!aiPortfolio) return;
    
    const newAssets: AssetParams[] = aiPortfolio.stocks.map((stock, idx) => ({
      id: stock.symbol,
      name: stock.name,
      initialPrice: 100, // Normalized for simulation
      drift: stock.expectedDrift,
      volatility: stock.expectedVolatility,
      color: ASSET_COLORS[idx % ASSET_COLORS.length]
    }));

    const newCorr = Array.from({ length: newAssets.length }, (_, i) => 
      Array.from({ length: newAssets.length }, (_, j) => (i === j ? 1 : 0.1)) // Default low correlation
    );

    setAssets(newAssets);
    setCorrelations(newCorr);
    setActiveTab('portfolio');
    setTimeout(handleSimulate, 100);
  };

  const handleExportCSV = () => {
    if (!result) return;

    let csvContent = "Day,";
    
    // Header for Portfolio Paths
    result.portfolioPaths.forEach((_, i) => {
      csvContent += `Portfolio_Path_${i+1},`;
    });

    // Header for Asset Paths
    result.results.forEach(res => {
      const asset = assets.find(a => a.id === res.assetId);
      csvContent += `${asset?.name || res.assetId}_Path_1,`;
    });

    csvContent = csvContent.slice(0, -1) + "\n";

    // Data rows
    result.days.forEach((day, dayIdx) => {
      csvContent += `${Math.round(day)},`;
      
      // Portfolio path values
      result.portfolioPaths.forEach(path => {
        csvContent += `${path[dayIdx]},`;
      });

      // Asset path values (first path)
      result.results.forEach(res => {
        csvContent += `${res.paths[0][dayIdx]},`;
      });

      csvContent = csvContent.slice(0, -1) + "\n";
    });

    // Add Statistics at the end
    csvContent += "\n--- Statistics ---\n";
    csvContent += "Asset,Mean,VaR_95,Volatility\n";
    result.results.forEach(res => {
      const asset = assets.find(a => a.id === res.assetId);
      csvContent += `${asset?.name || res.assetId},${res.stats.mean},${res.stats.var95},${asset?.volatility}\n`;
    });

    downloadCSV(`rahman_monte_carlo_export_${new Date().getTime()}.csv`, csvContent);
  };

  const handleSimulateRef = useRef(handleSimulate);
  useEffect(() => {
    handleSimulateRef.current = handleSimulate;
  });

  useEffect(() => {
    handleSimulateRef.current();
    
    // Auto-refresh every 5 minutes (300,000 ms)
    const interval = setInterval(() => {
      handleSimulateRef.current();
    }, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  const addAsset = () => {
    if (assets.length >= ASSET_COLORS.length) return;
    const newId = (assets.length + 1).toString();
    const newAsset: AssetParams = {
      id: newId,
      name: `Asset ${newId}`,
      initialPrice: 100,
      drift: 0.05,
      volatility: 0.2,
      color: ASSET_COLORS[assets.length]
    };
    
    const newAssets = [...assets, newAsset];
    const newCorr = Array.from({ length: newAssets.length }, (_, i) => 
      Array.from({ length: newAssets.length }, (_, j) => (i === j ? 1 : 0))
    );
    
    // Copy old correlations
    for (let i = 0; i < correlations.length; i++) {
      for (let j = 0; j < correlations.length; j++) {
        newCorr[i][j] = correlations[i][j];
      }
    }
    
    setAssets(newAssets);
    setCorrelations(newCorr);
  };

  const removeAsset = (id: string) => {
    if (assets.length <= 1) return;
    const idx = assets.findIndex(a => a.id === id);
    const newAssets = assets.filter(a => a.id !== id);
    const newCorr = correlations.filter((_, i) => i !== idx).map(row => row.filter((_, j) => j !== idx));
    setAssets(newAssets);
    setCorrelations(newCorr);
  };

  const updateAsset = (id: string, field: keyof AssetParams, value: any) => {
    setAssets(assets.map(a => a.id === id ? { ...a, [field]: value } : a));
  };

  const updateCorrelation = (i: number, j: number, val: number) => {
    const newCorr = [...correlations.map(row => [...row])];
    const clamped = Math.max(-1, Math.min(1, val));
    newCorr[i][j] = clamped;
    newCorr[j][i] = clamped; // Keep symmetric
    setCorrelations(newCorr);
  };

  const portfolioChartData = useMemo(() => {
    if (!result) return [];
    return result.days.map((day, dayIdx) => {
      const dataPoint: any = { day: Math.round(day) };
      
      // Add mean path as path_0 (the thickest line)
      dataPoint['path_0'] = result.portfolioMeanPath[dayIdx];

      // Show first 9 random paths for portfolio as background
      result.portfolioPaths.slice(0, 9).forEach((path, pathIdx) => {
        dataPoint[`path_${pathIdx + 1}`] = path[dayIdx];
      });
      return dataPoint;
    });
  }, [result]);

  const assetsChartData = useMemo(() => {
    if (!result) return [];
    return result.days.map((day, dayIdx) => {
      const dataPoint: any = { day: Math.round(day) };
      result.results.forEach(res => {
        dataPoint[res.assetId] = res.meanPath[dayIdx]; // Show mean path instead of random path[0]
      });
      return dataPoint;
    });
  }, [result]);

  const diversificationScore = useMemo(() => {
    const n = correlations.length;
    if (n <= 1) return "None";
    let sum = 0;
    let count = 0;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        sum += correlations[i][j];
        count++;
      }
    }
    const avgCorr = sum / count;
    if (avgCorr < 0) return "Excellent";
    if (avgCorr < 0.3) return "High";
    if (avgCorr < 0.6) return "Medium";
    return "Low";
  }, [correlations]);

  const radarData = useMemo(() => {
    if (!result) return [];
    return result.results.map(res => {
      const asset = assets.find(a => a.id === res.assetId);
      return {
        asset: asset?.name || res.assetId,
        Sharpe: Math.max(0, res.stats.sharpe),
        Sortino: Math.max(0, res.stats.sortino),
        Beta: Math.max(0, res.stats.beta)
      };
    });
  }, [result, assets]);

  if (!isAuthenticated) {
    return (
      <div className={cn("min-h-screen font-sans flex items-center justify-center selection:bg-blue-500/30", theme === 'dark' ? "dark bg-black text-slate-100" : "bg-slate-50 text-slate-900")}>
        <div className="w-full max-w-md p-8 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-3xl shadow-2xl">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-600/20 text-blue-600 dark:text-blue-500 rounded-2xl flex items-center justify-center mb-4 border border-blue-200 dark:border-blue-500/30">
              <Lock size={32} />
            </div>
            <h1 className="text-2xl font-black tracking-widest uppercase text-slate-900 dark:text-white">SIMBHA</h1>
            <p className="text-slate-500 text-xs font-bold tracking-widest uppercase mt-2">Restricted Access</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <User size={12} /> Username
              </label>
              <input 
                type="text" 
                value={loginUser}
                onChange={e => setLoginUser(e.target.value)}
                className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-blue-500 transition-colors text-slate-900 dark:text-white"
                placeholder="Enter username"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <Key size={12} /> Password
              </label>
              <input 
                type="password" 
                value={loginPass}
                onChange={e => setLoginPass(e.target.value)}
                className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-blue-500 transition-colors text-slate-900 dark:text-white"
                placeholder="Enter password"
              />
            </div>
            {loginError && <p className="text-red-500 text-xs font-bold text-center">{loginError}</p>}
            <button type="submit" className="w-full py-4 mt-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black uppercase tracking-[0.2em] text-xs shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2">
              <LogIn size={16} /> Authenticate
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("min-h-screen font-sans selection:bg-blue-500/30", theme === 'dark' ? "dark bg-black text-slate-100" : "bg-slate-50 text-slate-900")}>
      {/* Header */}
      <header className="h-16 border-b border-slate-200 dark:border-zinc-800 bg-white/80 dark:bg-black/50 backdrop-blur-xl flex items-center justify-between px-6 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
            <Activity size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">SIMBHA</h1>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest">Advanced Risk Engine</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={handleExportCSV}
            disabled={!result}
            className="flex items-center gap-2 bg-slate-200 dark:bg-zinc-800 hover:bg-slate-300 dark:hover:bg-zinc-700 disabled:opacity-50 text-slate-900 dark:text-white px-4 py-2 rounded-xl text-xs font-bold transition-all"
          >
            <Download size={16} />
            Export CSV
          </button>
          <button 
            onClick={handleSimulate}
            disabled={isSimulating}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-300 dark:disabled:bg-zinc-800 disabled:text-slate-500 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-blue-500/10 active:scale-95"
          >
            <RefreshCw size={18} className={cn(isSimulating && "animate-spin")} />
            {isSimulating ? "Simulating..." : "Run Engine"}
          </button>

          <div className="relative">
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className="p-2.5 bg-slate-200 dark:bg-zinc-800 hover:bg-slate-300 dark:hover:bg-zinc-700 rounded-xl text-slate-700 dark:text-slate-300 transition-all"
            >
              <Settings2 size={18} />
            </button>
            
            <AnimatePresence>
              {showSettings && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-2 w-48 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-2xl overflow-hidden z-50"
                >
                  <div className="p-2 space-y-1">
                    <button 
                      onClick={() => { setTheme(theme === 'dark' ? 'light' : 'dark'); setShowSettings(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-slate-900 dark:hover:text-white rounded-lg transition-colors"
                    >
                      {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                      {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                    </button>
                    <button 
                      onClick={() => { setIsAuthenticated(false); setShowSettings(false); setLoginUser(''); setLoginPass(''); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-700 dark:hover:text-red-300 rounded-lg transition-colors"
                    >
                      <LogOut size={16} />
                      Logout
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      <main className="p-6 max-w-[1800px] mx-auto grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Sidebar Controls */}
        <aside className="xl:col-span-4 space-y-6">
          {/* Assets Configuration */}
          <section className="bg-white dark:bg-zinc-950 rounded-2xl border border-slate-200 dark:border-zinc-800 p-5 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                <Layers size={18} className="text-blue-500" />
                <h2 className="font-bold">Assets</h2>
              </div>
              <button 
                onClick={addAsset}
                className="p-2 bg-slate-200 dark:bg-zinc-800 hover:bg-slate-300 dark:hover:bg-zinc-700 rounded-lg text-blue-500 dark:text-blue-400 transition-colors"
              >
                <Plus size={18} />
              </button>
            </div>
            
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {assets.map((asset, idx) => (
                <div key={asset.id} className="p-4 bg-slate-50 dark:bg-zinc-900/50 rounded-xl border border-slate-200 dark:border-zinc-800/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: asset.color }} />
                      <input 
                        value={asset.name}
                        onChange={e => updateAsset(asset.id, 'name', e.target.value)}
                        className="bg-transparent font-bold text-sm outline-none w-32 focus:text-blue-500 dark:focus:text-blue-400 transition-colors text-slate-900 dark:text-white"
                      />
                    </div>
                    <button onClick={() => removeAsset(asset.id)} className="text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Price</label>
                      <input 
                        type="number"
                        value={asset.initialPrice}
                        onChange={e => updateAsset(asset.id, 'initialPrice', Number(e.target.value))}
                        className="w-full bg-white dark:bg-black border border-slate-200 dark:border-zinc-800 rounded-lg px-2 py-1.5 text-xs font-medium outline-none focus:border-blue-500 text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Drift %</label>
                      <input 
                        type="number"
                        step="0.1"
                        value={asset.drift * 100}
                        onChange={e => updateAsset(asset.id, 'drift', Number(e.target.value) / 100)}
                        className="w-full bg-white dark:bg-black border border-slate-200 dark:border-zinc-800 rounded-lg px-2 py-1.5 text-xs font-medium outline-none focus:border-blue-500 text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Vol %</label>
                      <input 
                        type="number"
                        step="0.1"
                        value={asset.volatility * 100}
                        onChange={e => updateAsset(asset.id, 'volatility', Number(e.target.value) / 100)}
                        className="w-full bg-white dark:bg-black border border-slate-200 dark:border-zinc-800 rounded-lg px-2 py-1.5 text-xs font-medium outline-none focus:border-blue-500 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Correlation Matrix */}
          <section className="bg-white dark:bg-zinc-950 rounded-2xl border border-slate-200 dark:border-zinc-800 p-5 shadow-xl">
            <div className="flex items-center gap-2 mb-6 text-slate-800 dark:text-slate-200">
              <Grid3X3 size={18} className="text-emerald-500" />
              <h2 className="font-bold">Correlation Matrix</h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-[10px] font-bold uppercase tracking-wider">
                <thead>
                  <tr>
                    <th className="p-2"></th>
                    {assets.map(a => <th key={a.id} className="p-2 text-slate-500">{a.name.slice(0, 3)}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {correlations.map((row, i) => (
                    <tr key={i}>
                      <td className="p-2 text-slate-500">{assets[i].name.slice(0, 3)}</td>
                      {row.map((val, j) => (
                        <td key={j} className="p-1">
                          <input 
                            type="number"
                            step="0.1"
                            disabled={i === j}
                            value={val}
                            onChange={e => updateCorrelation(i, j, Number(e.target.value))}
                            className={cn(
                              "w-12 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded px-1 py-1 text-center outline-none focus:border-blue-500 transition-colors text-slate-900 dark:text-white",
                              i === j && "opacity-30",
                              val > 0.5 && "text-emerald-600 dark:text-emerald-400",
                              val < -0.5 && "text-red-600 dark:text-red-400"
                            )}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Global Settings */}
          <section className="bg-white dark:bg-zinc-950 rounded-2xl border border-slate-200 dark:border-zinc-800 p-5 shadow-xl">
            <div className="flex items-center gap-2 mb-6 text-slate-800 dark:text-slate-200">
              <Settings2 size={18} className="text-amber-500" />
              <h2 className="font-bold">Global Settings</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Time Horizon: {timeHorizon} Days</label>
                <input 
                  type="range" min="7" max="365" value={timeHorizon}
                  onChange={e => setTimeHorizon(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Simulations</label>
                <select 
                  value={numSimulations}
                  onChange={e => setNumSimulations(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-sm font-bold outline-none focus:border-blue-500 text-slate-900 dark:text-white"
                >
                  <option value={50}>50 Iterations</option>
                  <option value={100}>100 Iterations</option>
                  <option value={500}>500 Iterations</option>
                </select>
              </div>
            </div>
          </section>
        </aside>

        {/* Main Content Area */}
        <div className="xl:col-span-8 space-y-6">
          {/* Portfolio Summary */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <StatCard 
              title="Exp. Return (Ann.)" 
              value={result ? formatPercent(result.portfolioStats.annReturn) : "..."} 
              icon={<TrendingUp className="text-emerald-500" />}
              subtitle="Annualized"
            />
            <StatCard 
              title="Portfolio VaR (95%)" 
              value={result ? formatPercent(Math.max(0, result.portfolioStats.var95) / 100) : "..."} 
              icon={<ShieldAlert className="text-red-500" />}
              subtitle="Est. max loss"
            />
            <StatCard 
              title="Sharpe Ratio" 
              value={result ? result.portfolioStats.sharpe.toFixed(2) : "..."} 
              icon={<Activity className="text-blue-500" />}
              subtitle="Risk-adjusted"
            />
            <StatCard 
              title="Sortino Ratio" 
              value={result ? result.portfolioStats.sortino.toFixed(2) : "..."} 
              icon={<Activity className="text-purple-500" />}
              subtitle="Downside-adjusted"
            />
            <StatCard 
              title="Diversification" 
              value={diversificationScore} 
              icon={<Palette className="text-amber-500" />}
              subtitle="Based on correlations"
            />
          </div>

          {/* Chart Section */}
          <div className="bg-white dark:bg-zinc-950 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between bg-slate-50 dark:bg-zinc-950/50">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setActiveTab('portfolio')}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all uppercase tracking-widest",
                    activeTab === 'portfolio' ? "bg-blue-600 text-white" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  )}
                >
                  <LineChartIcon size={16} />
                  Portfolio
                </button>
                <button 
                  onClick={() => setActiveTab('assets')}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all uppercase tracking-widest",
                    activeTab === 'assets' ? "bg-blue-600 text-white" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  )}
                >
                  <Activity size={16} />
                  Assets
                </button>
                <button 
                  onClick={() => setActiveTab('advisor')}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all uppercase tracking-widest",
                    activeTab === 'advisor' ? "bg-purple-600 text-white" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  )}
                >
                  <Sparkles size={16} />
                  AI Advisor
                </button>
                <button 
                  onClick={() => setActiveTab('entry')}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all uppercase tracking-widest",
                    activeTab === 'entry' ? "bg-emerald-600 text-white" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  )}
                >
                  <Target size={16} />
                  Entry Advisor
                </button>
              </div>

              {(activeTab === 'portfolio' || activeTab === 'assets') && (
                <div className="flex items-center gap-1 bg-slate-200 dark:bg-black/50 p-1 rounded-lg border border-slate-300 dark:border-zinc-800">
                  <button onClick={() => setChartType('line')} className={cn("px-3 py-1.5 rounded-md text-xs font-bold transition-all", chartType === 'line' ? "bg-white dark:bg-zinc-700 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white")}>Line</button>
                  <button onClick={() => setChartType('radar')} className={cn("px-3 py-1.5 rounded-md text-xs font-bold transition-all", chartType === 'radar' ? "bg-white dark:bg-zinc-700 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white")}>Radar</button>
                </div>
              )}
            </div>

            <div className="p-6 h-[500px] overflow-y-auto custom-scrollbar">
              <AnimatePresence mode="wait">
                {activeTab === 'portfolio' ? (
                  <motion.div 
                    key="portfolio"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="w-full h-full"
                  >
                    {chartType === 'radar' && result ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                          <PolarGrid stroke="#1E293B" />
                          <PolarAngleAxis dataKey="asset" tick={{ fill: '#94A3B8', fontSize: 10 }} />
                          <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={{ fill: '#475569', fontSize: 10 }} />
                          <Radar name="Sharpe Ratio" dataKey="Sharpe" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.4} />
                          <Radar name="Sortino Ratio" dataKey="Sortino" stroke="#10B981" fill="#10B981" fillOpacity={0.4} />
                          <Radar name="Beta" dataKey="Beta" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.4} />
                          <Legend />
                          <Tooltip contentStyle={{ backgroundColor: theme === 'dark' ? '#000000' : '#ffffff', border: theme === 'dark' ? '1px solid #1E293B' : '1px solid #E2E8F0', borderRadius: '12px', fontSize: '12px', color: theme === 'dark' ? '#F8FAFC' : '#0F172A' }} />
                        </RadarChart>
                      </ResponsiveContainer>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={portfolioChartData}>
                          <defs>
                            <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#10B981" stopOpacity={1} />
                              <stop offset="50%" stopColor="#3B82F6" stopOpacity={0.8} />
                              <stop offset="100%" stopColor="#F43F5E" stopOpacity={0.6} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1E293B" />
                          <XAxis dataKey="day" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                          <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: theme === 'dark' ? '#000000' : '#ffffff', border: theme === 'dark' ? '1px solid #1E293B' : '1px solid #E2E8F0', borderRadius: '12px', fontSize: '12px' }}
                            itemStyle={{ color: theme === 'dark' ? '#F8FAFC' : '#0F172A' }}
                          />
                          {Object.keys(portfolioChartData[0] || {}).filter(k => k.startsWith('path_')).map((key, idx) => (
                            <Line 
                              key={key} type="monotone" dataKey={key} 
                              stroke="url(#portfolioGradient)" 
                              strokeWidth={idx === 0 ? 3 : 1.5}
                              opacity={idx === 0 ? 1 : 0.15} dot={false} 
                            />
                          ))}
                        </LineChart>
                      </ResponsiveContainer>
                    )}
                  </motion.div>
                ) : activeTab === 'assets' ? (
                  <motion.div 
                    key="assets"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="w-full h-full"
                  >
                    {chartType === 'radar' && result ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                          <PolarGrid stroke="#1E293B" />
                          <PolarAngleAxis dataKey="asset" tick={{ fill: '#94A3B8', fontSize: 10 }} />
                          <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={{ fill: '#475569', fontSize: 10 }} />
                          <Radar name="Sharpe Ratio" dataKey="Sharpe" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.4} />
                          <Radar name="Sortino Ratio" dataKey="Sortino" stroke="#10B981" fill="#10B981" fillOpacity={0.4} />
                          <Radar name="Beta" dataKey="Beta" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.4} />
                          <Legend />
                          <Tooltip contentStyle={{ backgroundColor: theme === 'dark' ? '#000000' : '#ffffff', border: theme === 'dark' ? '1px solid #1E293B' : '1px solid #E2E8F0', borderRadius: '12px', fontSize: '12px', color: theme === 'dark' ? '#F8FAFC' : '#0F172A' }} />
                        </RadarChart>
                      </ResponsiveContainer>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={assetsChartData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1E293B" />
                          <XAxis dataKey="day" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                          <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: theme === 'dark' ? '#000000' : '#ffffff', border: theme === 'dark' ? '1px solid #1E293B' : '1px solid #E2E8F0', borderRadius: '12px', fontSize: '12px' }}
                          />
                          <Legend verticalAlign="top" height={36} iconType="circle" />
                          {assets.map(asset => (
                            <Line 
                              key={asset.id} type="monotone" dataKey={asset.id} name={asset.name}
                              stroke={asset.color} strokeWidth={3} dot={false}
                            />
                          ))}
                        </LineChart>
                      </ResponsiveContainer>
                    )}
                  </motion.div>
                ) : activeTab === 'advisor' ? (
                  <motion.div 
                    key="advisor"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="space-y-8"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                          <Wallet size={12} /> Investment Budget
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                          <input 
                            type="number"
                            value={advisorBudget}
                            onChange={e => setAdvisorBudget(Number(e.target.value))}
                            className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl pl-8 pr-4 py-3 text-sm font-bold outline-none focus:border-purple-500 transition-colors text-slate-900 dark:text-white"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                          <Target size={12} /> Strategy
                        </label>
                        <select 
                          value={advisorStrategy}
                          onChange={e => setAdvisorStrategy(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-purple-500 transition-colors text-slate-900 dark:text-white"
                        >
                          <option value="conservative">Conservative</option>
                          <option value="growth">Growth</option>
                          <option value="aggressive">Aggressive</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                          <Clock size={12} /> Time Horizon
                        </label>
                        <select 
                          value={advisorHorizon}
                          onChange={e => setAdvisorHorizon(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-purple-500 transition-colors text-slate-900 dark:text-white"
                        >
                          <option value="5 minutes">5 Minutes</option>
                          <option value="1 hour">1 Hour</option>
                          <option value="1 day">1 Day</option>
                          <option value="1 year">1 Year</option>
                          <option value="5 years">5 Years</option>
                          <option value="10 years">10 Years</option>
                          <option value="20+ years">20+ Years</option>
                        </select>
                      </div>
                    </div>

                    <button 
                      onClick={handleGeneratePortfolio}
                      disabled={isGenerating}
                      className="w-full py-4 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-200 dark:disabled:bg-zinc-800 disabled:text-slate-400 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-lg shadow-purple-500/20 transition-all flex items-center justify-center gap-3"
                    >
                      {isGenerating ? (
                        <>
                          <RefreshCw size={18} className="animate-spin" />
                          Consulting Gemini AI...
                        </>
                      ) : (
                        <>
                          <Sparkles size={18} />
                          Generate Diversified Portfolio
                        </>
                      )}
                    </button>

                    {aiPortfolio && (
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-6"
                      >
                        <div className="p-6 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-500/30 rounded-3xl">
                          <h3 className="text-purple-600 dark:text-purple-400 font-bold text-sm mb-2 flex items-center gap-2">
                            <Info size={16} /> Strategy Thesis
                          </h3>
                          <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed italic">
                            "{aiPortfolio.summary}"
                          </p>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                          <div className="lg:col-span-1 h-[300px] bg-slate-50 dark:bg-zinc-900/30 rounded-3xl border border-slate-200 dark:border-zinc-800/50 p-4">
                            <ResponsiveContainer width="100%" height="100%">
                              <RechartsPieChart>
                                <Pie
                                  data={aiPortfolio.stocks}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={60}
                                  outerRadius={80}
                                  paddingAngle={5}
                                  dataKey="allocation"
                                  nameKey="symbol"
                                >
                                  {aiPortfolio.stocks.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={ASSET_COLORS[index % ASSET_COLORS.length]} />
                                  ))}
                                </Pie>
                                <Tooltip 
                                  contentStyle={{ backgroundColor: theme === 'dark' ? '#000000' : '#ffffff', border: theme === 'dark' ? '1px solid #1E293B' : '1px solid #E2E8F0', borderRadius: '12px', fontSize: '10px' }}
                                />
                              </RechartsPieChart>
                            </ResponsiveContainer>
                          </div>
                          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                            {aiPortfolio.stocks.map((stock, idx) => (
                              <div key={stock.symbol} className="p-5 bg-slate-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 rounded-2xl space-y-3">
                                <div className="flex justify-between items-start">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ASSET_COLORS[idx % ASSET_COLORS.length] }} />
                                    <div>
                                      <h4 className="font-black text-slate-900 dark:text-white">{stock.symbol}</h4>
                                      <p className="text-[10px] text-slate-500 font-bold uppercase">{stock.name}</p>
                                    </div>
                                  </div>
                                  <div className="px-3 py-1 bg-purple-100 dark:bg-purple-600/20 text-purple-600 dark:text-purple-400 rounded-full text-[10px] font-black">
                                    {stock.allocation}%
                                  </div>
                                </div>
                                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-tight">
                                  {stock.thesis}
                                </p>
                                <div className="flex gap-4 pt-2 border-t border-slate-200 dark:border-zinc-800/50">
                                  <div>
                                    <p className="text-[8px] font-bold text-slate-500 uppercase">Est. Drift</p>
                                    <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{formatPercent(stock.expectedDrift)}</p>
                                  </div>
                                  <div>
                                    <p className="text-[8px] font-bold text-slate-500 uppercase">Est. Vol</p>
                                    <p className="text-xs font-bold text-amber-600 dark:text-amber-400">{formatPercent(stock.expectedVolatility)}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <button 
                          onClick={importAiPortfolio}
                          className="w-full py-4 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-950 rounded-2xl font-black uppercase tracking-[0.2em] text-xs transition-all flex items-center justify-center gap-3"
                        >
                          Import to Risk Simulator
                          <ArrowRight size={18} />
                        </button>
                      </motion.div>
                    )}
                  </motion.div>
                ) : (
                  <motion.div 
                    key="entry"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="space-y-8"
                  >
                    <div className="max-w-2xl mx-auto space-y-6">
                      <div className="text-center space-y-2">
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white">MARKET Entry Optimizer</h2>
                        <p className="text-slate-600 dark:text-slate-400 text-sm">Analyze valuation and price action to find the perfect entry point.</p>
                      </div>

                      <div className="flex gap-3">
                        <div className="relative flex-1">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold uppercase text-xs">Ticker</span>
                          <input 
                            type="text"
                            placeholder="e.g. NVDA"
                            value={entryTicker}
                            onChange={e => setEntryTicker(e.target.value.toUpperCase())}
                            className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl pl-16 pr-4 py-4 text-sm font-bold outline-none focus:border-emerald-500 transition-colors uppercase text-slate-900 dark:text-white"
                          />
                        </div>
                        <button 
                          onClick={handleAnalyzeEntry}
                          disabled={isAnalyzingEntry || !entryTicker}
                          className="px-8 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-200 dark:disabled:bg-zinc-800 disabled:text-slate-400 text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2"
                        >
                          {isAnalyzingEntry ? <RefreshCw size={16} className="animate-spin" /> : <Target size={16} />}
                          Analyze
                        </button>
                      </div>

                      {entryAnalysis && (
                        <motion.div 
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="space-y-6"
                        >
                          <div className={cn(
                            "p-6 rounded-3xl border flex items-center justify-between",
                            entryAnalysis.recommendation === 'Buy Now' ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-500/30" : 
                            entryAnalysis.recommendation === 'Wait for Pullback' ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-500/30" : 
                            "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-500/30"
                          )}>
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 mb-1 text-slate-700 dark:text-slate-300">Recommendation</p>
                              <h3 className={cn(
                                "text-2xl font-black",
                                entryAnalysis.recommendation === 'Buy Now' ? "text-emerald-600 dark:text-emerald-400" : 
                                entryAnalysis.recommendation === 'Wait for Pullback' ? "text-amber-600 dark:text-amber-400" : 
                                "text-blue-600 dark:text-blue-400"
                              )}>
                                {entryAnalysis.recommendation}
                              </h3>
                            </div>
                            {entryAnalysis.targetPrice && (
                              <div className="text-right">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 mb-1 text-slate-700 dark:text-slate-300">Target Price</p>
                                <p className="text-2xl font-black text-slate-900 dark:text-white">{formatCurrency(entryAnalysis.targetPrice)}</p>
                              </div>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                              <div className="p-5 bg-slate-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 rounded-2xl">
                                <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                  <PieChart size={14} className="text-blue-500 dark:text-blue-400" /> Valuation Analysis
                                </h4>
                                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{entryAnalysis.valuation}</p>
                              </div>
                              <div className="p-5 bg-slate-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 rounded-2xl">
                                <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                  <TrendingUp size={14} className="text-emerald-500 dark:text-emerald-400" /> Price Action
                                </h4>
                                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{entryAnalysis.priceAction}</p>
                              </div>
                            </div>

                            <div className="space-y-4">
                              <div className="p-5 bg-slate-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 rounded-2xl">
                                <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                  <ShieldAlert size={14} className="text-amber-500 dark:text-amber-400" /> Support Levels
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                  {entryAnalysis.supportLevels.map((level, i) => (
                                    <span key={i} className="px-3 py-1 bg-slate-200 dark:bg-zinc-800 text-slate-900 dark:text-white rounded-lg text-xs font-bold border border-slate-300 dark:border-zinc-700">
                                      {level}
                                    </span>
                                  ))}
                                </div>
                              </div>
                              <div className="p-5 bg-slate-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 rounded-2xl">
                                <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                  <Info size={14} className="text-purple-500 dark:text-purple-400" /> Investment Thesis
                                </h4>
                                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed italic">"{entryAnalysis.thesis}"</p>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Asset Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {result?.results.map(res => {
              const asset = assets.find(a => a.id === res.assetId);
              return (
                <div key={res.assetId} className="bg-white dark:bg-zinc-950 rounded-2xl border border-slate-200 dark:border-zinc-800 p-5 shadow-lg">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: asset?.color }} />
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">{asset?.name} Analytics</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-slate-50 dark:bg-zinc-900/50 rounded-xl">
                      <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Expected Price</p>
                      <p className="text-lg font-black text-slate-900 dark:text-white">{formatCurrency(res.stats.mean)}</p>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-zinc-900/50 rounded-xl">
                      <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Value at Risk (95%)</p>
                      <p className="text-lg font-black text-red-500 dark:text-red-400">{formatCurrency(res.stats.var95)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-12 py-12 border-t border-slate-200 dark:border-zinc-800 text-center bg-slate-50/50 dark:bg-black/30">
        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em]">
          SIMBHA • Institutional Grade Risk Management Sumilation BY Aafi-Ur-Rahman
          THIS SUMILATION IS ONE AND ONLY ORIGINAL SUMILATION *IF FACING ANY ISSUE OR BUG CONTACT ME THROUGH MY SOCIALS*
        </p>
      </footer>
    </div>
  );
}

function StatCard({ title, value, icon, subtitle }: { title: string, value: string, icon: React.ReactNode, subtitle: string }) {
  return (
    <div className="bg-white dark:bg-zinc-950 p-6 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xl hover:border-blue-500/50 dark:hover:border-zinc-700 transition-all group">
      <div className="flex justify-between items-start mb-4">
        <div className="p-3 bg-slate-100 dark:bg-zinc-800 rounded-xl group-hover:scale-110 transition-transform">
          {icon}
        </div>
        <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest bg-slate-100 dark:bg-zinc-800 px-2 py-1 rounded">
          Real-Time
        </div>
      </div>
      <h3 className="text-[10px] font-bold text-slate-500 uppercase mb-1 tracking-wider">{title}</h3>
      <p className="text-3xl font-black tracking-tighter text-slate-900 dark:text-white">
        {value}
      </p>
      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-2 uppercase tracking-tight">{subtitle}</p>
    </div>
  );
}
