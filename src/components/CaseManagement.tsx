import { useState, useEffect } from 'react';
import { ClipboardList, CheckCircle2, Clock, AlertTriangle, Eye, ArrowRight, Filter, Search, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CaseManagementProps {
  onUpdate: () => void;
}

export default function CaseManagement({ onUpdate }: CaseManagementProps) {
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCase, setSelectedCase] = useState<any>(null);
  const [filter, setFilter] = useState<'All' | 'Awaiting Rework' | 'Completed'>('All');
  const [search, setSearch] = useState('');

  const fetchCases = async () => {
    try {
      const res = await fetch('/api/cases');
      const data = await res.json();
      setCases(data.reverse());
    } catch (err) {
      console.error('Failed to fetch cases', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, []);

  const markAsFixed = async (id: string) => {
    try {
      await fetch(`/api/cases/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Completed' }),
      });
      fetchCases();
      onUpdate();
      if (selectedCase?.id === id) {
        setSelectedCase((prev: any) => ({ ...prev, status: 'Completed' }));
      }
    } catch (err) {
      console.error('Failed to update case', err);
    }
  };

  const filteredCases = cases.filter(c => {
    const matchesFilter = filter === 'All' || c.status === filter;
    const matchesSearch = c.id.toLowerCase().includes(search.toLowerCase()) || 
                         c.defectType.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Case Management</h2>
          <p className="text-slate-500">Track and manage PCB defect repair workflows in real-time.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all">
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search by Case ID or Defect Type..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-100">
            {['All', 'Awaiting Rework', 'Completed'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f as any)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                  filter === f ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-900"
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Case List */}
        <div className="xl:col-span-2 space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4 text-slate-400">
              <div className="w-10 h-10 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin" />
              <p className="font-medium">Loading cases...</p>
            </div>
          ) : filteredCases.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-20 flex flex-col items-center justify-center text-center gap-4 shadow-sm">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
                <ClipboardList className="w-8 h-8 text-slate-300" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">No cases found</h3>
                <p className="text-sm text-slate-500 max-w-xs mx-auto">
                  There are no defect cases matching your current filters.
                </p>
              </div>
            </div>
          ) : (
            filteredCases.map((c) => (
              <motion.div
                layout
                key={c.id}
                onClick={() => setSelectedCase(c)}
                className={cn(
                  "bg-white p-5 rounded-2xl border transition-all cursor-pointer group hover:shadow-md",
                  selectedCase?.id === c.id ? "border-indigo-600 ring-1 ring-indigo-600" : "border-slate-200"
                )}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                      c.status === 'Completed' ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                    )}>
                      {c.status === 'Completed' ? <CheckCircle2 className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <h4 className="font-bold text-slate-900">{c.defectType}</h4>
                        <span className="text-[10px] font-mono text-slate-400">#{c.id.slice(0, 8)}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{new Date(c.timestamp).toLocaleString()}</span>
                        </div>
                        <div className="w-1 h-1 bg-slate-300 rounded-full" />
                        <span>Station 04</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "hidden md:block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                      c.status === 'Completed' ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                    )}>
                      {c.status}
                    </div>
                    <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* Case Detail Sidebar */}
        <div className="xl:col-span-1">
          <AnimatePresence mode="wait">
            {selectedCase ? (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm sticky top-24 space-y-6"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-900">Case Details</h3>
                  <button 
                    onClick={() => setSelectedCase(null)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <Eye className="w-5 h-5" />
                  </button>
                </div>

                <div className="aspect-video rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 relative">
                  <img src={selectedCase.imageUrl} alt="Defect" className="w-full h-full object-cover" />
                  {selectedCase.location && (
                    <div 
                      className="absolute border-2 border-red-500 bg-red-500/20"
                      style={{
                        top: `${selectedCase.location.ymin / 10}%`,
                        left: `${selectedCase.location.xmin / 10}%`,
                        width: `${(selectedCase.location.xmax - selectedCase.location.xmin) / 10}%`,
                        height: `${(selectedCase.location.ymax - selectedCase.location.ymin) / 10}%`,
                      }}
                    />
                  )}
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Severity</p>
                    <span className={cn(
                      "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                      selectedCase.severity === 'HIGH' ? "bg-red-100 text-red-700" :
                      selectedCase.severity === 'MEDIUM' ? "bg-amber-100 text-amber-700" :
                      "bg-blue-100 text-blue-700"
                    )}>
                      {selectedCase.severity || 'UNKNOWN'}
                    </span>
                  </div>

                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">AI Reason (Explainability)</p>
                    <p className="text-sm text-slate-600 italic bg-slate-50 p-3 rounded-xl border border-slate-100">
                      "{selectedCase.reason || "No AI explanation available."}"
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Smart Repair Suggestions</p>
                    <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 space-y-2">
                      {selectedCase.repairSuggestions && selectedCase.repairSuggestions.length > 0 ? (
                        selectedCase.repairSuggestions.map((s: string, i: number) => (
                          <div key={i} className="flex items-start gap-2 text-xs text-indigo-800">
                            <div className="w-1 h-1 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                            {s}
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-indigo-400 italic">No suggestions available.</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Description</p>
                    <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
                      {selectedCase.description || "No additional description provided."}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Status</p>
                      <p className={cn(
                        "text-xs font-bold",
                        selectedCase.status === 'Completed' ? "text-emerald-600" : "text-amber-600"
                      )}>{selectedCase.status}</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Repair Time</p>
                      <p className="text-xs font-bold text-slate-900">
                        {selectedCase.repairTime ? `${Math.floor(selectedCase.repairTime / 60)}m ${selectedCase.repairTime % 60}s` : '--'}
                      </p>
                    </div>
                  </div>
                </div>

                {selectedCase.status === 'Awaiting Rework' && (
                  <button
                    onClick={() => markAsFixed(selectedCase.id)}
                    className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    Mark as Fixed
                  </button>
                )}
              </motion.div>
            ) : (
              <div className="bg-slate-50 rounded-3xl border border-dashed border-slate-200 p-12 flex flex-col items-center justify-center text-center gap-4 text-slate-400 sticky top-24">
                <Eye className="w-10 h-10 opacity-20" />
                <p className="text-sm font-medium">Select a case to view details and manage workflow.</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
