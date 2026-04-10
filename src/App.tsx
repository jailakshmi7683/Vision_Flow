import { useState, useEffect } from 'react';
import { LayoutDashboard, ClipboardList, BarChart3, Settings, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import DetectionView from './components/DetectionView';
import CaseManagement from './components/CaseManagement';
import AnalyticsView from './components/AnalyticsView';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type Tab = 'detection' | 'cases' | 'analytics';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('detection');
  const [stats, setStats] = useState<any>(null);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/analytics');
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch stats', err);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, []);

  const tabs = [
    { id: 'detection', label: 'AI Detection', icon: AlertTriangle },
    { id: 'cases', label: 'Case Management', icon: ClipboardList },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
            <Settings className="text-white w-6 h-6 animate-spin-slow" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Aura-QA</h1>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-widest">Autonomous PCB Quality Assurance</p>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          {stats && (
            <div className="hidden md:flex items-center gap-4 text-sm font-medium">
              <div className="flex items-center gap-1.5 text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-100">
                <AlertTriangle className="w-4 h-4" />
                <span>{stats.totalCases - stats.completedCases} Pending</span>
              </div>
              <div className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                <CheckCircle2 className="w-4 h-4" />
                <span>{stats.yieldPercentage.toFixed(1)}% Yield</span>
              </div>
            </div>
          )}
          <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-slate-600 font-bold text-xs">
            JD
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-slate-200 p-4 hidden lg:flex flex-col gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as Tab)}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium",
                activeTab === tab.id 
                  ? "bg-indigo-50 text-indigo-700 shadow-sm" 
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <tab.icon className={cn("w-5 h-5", activeTab === tab.id ? "text-indigo-600" : "text-slate-400")} />
              {tab.label}
            </button>
          ))}
          
          <div className="mt-auto p-4 bg-slate-900 rounded-2xl text-white">
            <h3 className="text-sm font-bold mb-1">System Status</h3>
            <div className="flex items-center gap-2 text-xs text-emerald-400 mb-4">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              AI Core Online
            </div>
            <button 
              onClick={async () => {
                await fetch('/api/seed', { method: 'POST' });
                fetchStats();
              }}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all mb-2"
            >
              Seed Demo Data
            </button>
            <button 
              onClick={async () => {
                if (confirm('Are you sure you want to reset the project and remove all cases?')) {
                  await fetch('/api/cases', { method: 'DELETE' });
                  fetchStats();
                  window.location.reload(); // Refresh the page to clear local states if any
                }
              }}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all border border-slate-700"
            >
              Reset Project
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          {/* Mobile Navigation */}
          <div className="lg:hidden flex gap-2 mb-6 overflow-x-auto pb-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as Tab)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-all",
                  activeTab === tab.id 
                    ? "bg-indigo-600 text-white" 
                    : "bg-white text-slate-600 border border-slate-200"
                )}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="max-w-6xl mx-auto">
            {activeTab === 'detection' && <DetectionView onCaseCreated={fetchStats} />}
            {activeTab === 'cases' && <CaseManagement onUpdate={fetchStats} />}
            {activeTab === 'analytics' && <AnalyticsView data={stats} />}
          </div>
        </main>
      </div>
    </div>
  );
}
