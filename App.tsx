import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { 
  User, 
  Lock, 
  RefreshCw, 
  Play, 
  Github, 
  ShieldAlert, 
  Globe,
  Settings,
  Download,
  List,
  Terminal as TerminalIcon,
  AlertTriangle,
  Info,
  Wifi,
  WifiOff
} from 'lucide-react';
import { ConsoleLog } from './components/ConsoleLog';
import { AccountFormData, Gender, LogEntry, CreatedAccount } from './types';
import { generateStrongPassword, validateForm, simulateAccountCreation, createAccountViaBackend } from './services/spotifyService';

// Determine Backend URL: Use Env var if available, otherwise default to localhost
// On Vercel, you will set REACT_APP_BACKEND_URL to your Render/Railway URL
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';

const App: React.FC = () => {
  // --- State ---
  const [formData, setFormData] = useState<AccountFormData>({
    email: '',
    password: '',
    birthDay: '01',
    birthMonth: '01',
    birthYear: '2000',
    gender: Gender.MALE
  });

  const [proxyText, setProxyText] = useState('');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [results, setResults] = useState<CreatedAccount[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'logs' | 'results'>('logs');
  
  // Backend Status
  const [backendStatus, setBackendStatus] = useState<'online' | 'offline' | 'checking'>('checking');

  // --- Effects ---
  useEffect(() => {
    const checkBackend = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/status`);
        if (res.ok) {
            setBackendStatus('online');
        } else {
            setBackendStatus('offline');
        }
      } catch (e) {
        setBackendStatus('offline');
      }
    };
    checkBackend();
    const interval = setInterval(checkBackend, 10000); 
    return () => clearInterval(interval);
  }, []);

  // --- Derived State ---
  const proxyCount = useMemo(() => {
    return proxyText.split('\n').filter(line => line.trim().length > 0).length;
  }, [proxyText]);

  // --- Handlers ---
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const addLog = useCallback((message: string, type: LogEntry['type'] = 'info') => {
    setLogs(prev => [...prev, {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      message,
      type
    }]);
  }, []);

  const handleGeneratePassword = () => {
    const newPass = generateStrongPassword();
    setFormData(prev => ({ ...prev, password: newPass }));
    addLog('Generated strong password', 'info');
  };

  const handleCreateAccount = async () => {
    if (isProcessing) return;

    const error = validateForm(formData);
    if (error) {
      addLog(error, 'error');
      return;
    }

    setIsProcessing(true);
    setActiveTab('logs');
    addLog(`--- STARTING TASK (${backendStatus === 'online' ? 'Real' : 'Sim'}) ---`, 'info');

    const proxies = proxyText.split('\n').filter(p => p.trim() !== '');
    let selectedProxy = null;
    if (proxies.length > 0) {
      selectedProxy = proxies[Math.floor(Math.random() * proxies.length)];
    }

    let result: CreatedAccount | null = null;

    if (backendStatus === 'online') {
        try {
            // Need to update service to use dynamic URL
            addLog(`Connecting to Backend: ${BACKEND_URL}`, "network");
            const response = await fetch(`${BACKEND_URL}/api/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...formData, proxy: selectedProxy })
            });
            const data = await response.json();
            
            // Merge logs
            if (data.logs) {
                data.logs.forEach((l: any) => setTimeout(() => addLog(l.message, l.type), 100));
            }

            if (data.success) {
                result = {
                    email: formData.email,
                    pass: formData.password,
                    birth: `${formData.birthYear}-${formData.birthMonth}-${formData.birthDay}`,
                    gender: formData.gender,
                    country: 'US'
                };
            } else {
                 addLog(`Failed: ${data.error}`, 'error');
            }

        } catch (e: any) {
            addLog(`Connection Error: ${e.message}`, "error");
        }
    } else {
        addLog("Backend Offline. Using Simulation Driver.", "warning");
        result = await simulateAccountCreation(formData, selectedProxy, addLog);
    }
    
    if (result) {
      setResults(prev => [result!, ...prev]);
      addLog("Account saved to Success list.", "success");
    }
    
    setIsProcessing(false);
  };

  const handleClearLogs = () => setLogs([]);

  const handleDownload = () => {
    if (results.length === 0) return;
    const content = results.map(r => `${r.email}:${r.pass}|${r.birth}|${r.gender}|${r.country}`).join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `spotify_accounts_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 p-4 md:p-8 flex items-center justify-center font-inter">
      
      {/* Main Container */}
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Controls */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          {/* Header */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-600 to-green-400"></div>
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-2xl font-bold text-white tracking-tight">Spotify Gen-Z</h1>
              <div className="flex flex-col items-end">
                <span className="bg-green-500/10 text-green-500 px-2 py-0.5 rounded text-[10px] font-bold uppercase border border-green-500/20 tracking-wider">
                    v5.0 (Puppeteer)
                </span>
              </div>
            </div>
            
            {/* Server Status Indicator */}
            <div className={`flex items-center gap-3 mt-4 p-3 rounded-lg border transition-colors ${
                backendStatus === 'online' 
                ? 'bg-green-500/5 border-green-500/20' 
                : 'bg-red-500/5 border-red-500/20'
            }`}>
                <div className={`h-2 w-2 rounded-full animate-pulse ${
                    backendStatus === 'online' ? 'bg-green-500' : 'bg-red-500'
                }`}></div>
                <div className="flex-1">
                    <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Backend Server</div>
                    <div className={`text-xs font-mono font-medium ${
                        backendStatus === 'online' ? 'text-green-400' : 'text-red-400'
                    }`}>
                        {backendStatus === 'online' ? 'Connected' : 'Disconnected (Using Mock)'}
                    </div>
                </div>
                {backendStatus === 'online' ? <Wifi size={16} className="text-green-500" /> : <WifiOff size={16} className="text-red-500" />}
            </div>
            {backendStatus === 'offline' && (
                <div className="mt-2 text-[10px] text-zinc-600 font-mono pl-1">
                    Frontend: Ready for Vercel<br/>Backend: Deploy to Render/Railway
                </div>
            )}
          </div>

          {/* Form */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-2xl flex-1">
            <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-6 flex items-center gap-2">
              <Settings size={14} /> Task Configuration
            </h2>

            <div className="space-y-5">
              
              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400 ml-1">Email Address</label>
                <div className="relative group">
                  <User className="absolute left-3 top-2.5 text-zinc-500 group-focus-within:text-green-500 transition-colors" size={18} />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="Enter email..."
                    className="w-full bg-black border border-zinc-700 text-zinc-100 rounded-lg py-2 pl-10 pr-4 focus:ring-1 focus:ring-green-600 focus:border-green-600 outline-none transition-all placeholder-zinc-700 font-mono text-sm"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400 ml-1">Password</label>
                <div className="flex gap-2">
                  <div className="relative flex-1 group">
                    <Lock className="absolute left-3 top-2.5 text-zinc-500 group-focus-within:text-green-500 transition-colors" size={18} />
                    <input
                      type="text"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder="Password"
                      className="w-full bg-black border border-zinc-700 text-zinc-100 rounded-lg py-2 pl-10 pr-4 focus:ring-1 focus:ring-green-600 focus:border-green-600 outline-none transition-all placeholder-zinc-700 font-mono text-sm"
                    />
                  </div>
                  <button
                    onClick={handleGeneratePassword}
                    className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-4 rounded-lg border border-zinc-700 transition-colors"
                  >
                    <RefreshCw size={18} className={isProcessing ? 'animate-spin' : ''} />
                  </button>
                </div>
              </div>

              {/* DOB */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400 ml-1">Date of Birth</label>
                <div className="grid grid-cols-3 gap-2">
                  {['birthDay', 'birthMonth', 'birthYear'].map((field, i) => (
                    <input
                      key={field}
                      type="text"
                      name={field}
                      value={(formData as any)[field]}
                      onChange={handleInputChange}
                      placeholder={['DD', 'MM', 'YYYY'][i]}
                      className="bg-black border border-zinc-700 text-zinc-100 rounded-lg py-2 px-3 text-center focus:ring-1 focus:ring-green-600 focus:border-green-600 outline-none font-mono text-sm"
                    />
                  ))}
                </div>
              </div>

              {/* Gender */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400 ml-1">Gender</label>
                <div className="grid grid-cols-3 gap-2">
                  {[Gender.MALE, Gender.FEMALE, Gender.NON_BINARY].map((g) => (
                    <button
                      key={g}
                      onClick={() => setFormData(prev => ({ ...prev, gender: g }))}
                      className={`py-2 rounded-lg text-xs font-semibold border transition-all ${
                        formData.gender === g
                          ? 'bg-green-600 border-green-500 text-white'
                          : 'bg-black border-zinc-700 text-zinc-500 hover:bg-zinc-800'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={handleCreateAccount}
                disabled={isProcessing}
                className={`w-full py-4 mt-4 rounded-xl font-bold text-sm uppercase tracking-wider transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg ${
                  isProcessing
                    ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700'
                    : 'bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-black border border-green-400 shadow-green-900/20'
                }`}
              >
                {isProcessing ? <RefreshCw className="animate-spin" size={18} /> : <Play size={18} />}
                {isProcessing ? 'Processing...' : backendStatus === 'online' ? 'Start (Real Backend)' : 'Start (Simulation)'}
              </button>

            </div>
          </div>

        </div>

        {/* Right Column: Proxy & Output */}
        <div className="lg:col-span-7 flex flex-col gap-6 h-[650px] lg:h-auto">
          
          {/* Proxy Input */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 shadow-xl flex flex-col h-1/3">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                <Globe size={14} /> Proxy List
              </h2>
              <span className="text-[10px] font-mono text-green-500 bg-green-500/10 px-2 py-0.5 rounded border border-green-500/20">
                {proxyCount} Loaded
              </span>
            </div>
            <textarea
              value={proxyText}
              onChange={(e) => setProxyText(e.target.value)}
              placeholder="ip:port:user:pass"
              className="flex-1 w-full bg-black border border-zinc-700 rounded-lg p-3 text-xs font-mono text-zinc-300 focus:ring-1 focus:ring-green-600 focus:border-green-600 outline-none resize-none custom-scrollbar placeholder-zinc-700 leading-relaxed"
            />
          </div>

          {/* Console / Results Tabs */}
          <div className="flex-1 flex flex-col bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl overflow-hidden h-2/3">
            
            {/* Tab Header */}
            <div className="flex border-b border-zinc-800">
              <button
                onClick={() => setActiveTab('logs')}
                className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${
                  activeTab === 'logs' ? 'bg-zinc-800 text-white border-b-2 border-green-500' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
                }`}
              >
                <TerminalIcon size={14} /> Live Logs
              </button>
              <button
                onClick={() => setActiveTab('results')}
                className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${
                  activeTab === 'results' ? 'bg-zinc-800 text-white border-b-2 border-green-500' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
                }`}
              >
                <List size={14} /> Success ({results.length})
              </button>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-hidden relative">
              
              {activeTab === 'logs' ? (
                <div className="h-full">
                  <ConsoleLog logs={logs} onClear={handleClearLogs} />
                </div>
              ) : (
                <div className="h-full flex flex-col">
                  {backendStatus === 'offline' && (
                    <div className="bg-yellow-500/10 border-b border-yellow-500/20 p-2 text-center text-xs text-yellow-500 font-mono">
                      Running in Simulation Mode. Connect Backend for Real Results.
                    </div>
                  )}

                  <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
                    {results.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-zinc-600 gap-2">
                        <Info size={24} />
                        <span className="text-sm">No accounts generated yet.</span>
                      </div>
                    ) : (
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-zinc-950 text-zinc-500 text-[10px] uppercase font-bold sticky top-0">
                          <tr>
                            <th className="p-3 border-b border-zinc-800">Email</th>
                            <th className="p-3 border-b border-zinc-800">Password</th>
                            <th className="p-3 border-b border-zinc-800">Status</th>
                          </tr>
                        </thead>
                        <tbody className="text-xs font-mono text-zinc-300 divide-y divide-zinc-800/50">
                          {results.map((acc, i) => (
                            <tr key={i} className="hover:bg-zinc-800/30">
                              <td className="p-3">{acc.email}</td>
                              <td className="p-3 text-zinc-500">{acc.pass}</td>
                              <td className="p-3">
                                {backendStatus === 'online' ? (
                                    <span className="text-[10px] bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-0.5 rounded font-bold">
                                        VERIFIED
                                    </span>
                                ) : (
                                    <span className="text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded font-bold">
                                        MOCK
                                    </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                  
                  {/* Export Footer */}
                  <div className="p-3 bg-zinc-950 border-t border-zinc-800 flex justify-end">
                    <button 
                      onClick={handleDownload}
                      disabled={results.length === 0}
                      className={`flex items-center gap-2 px-4 py-2 rounded text-xs font-bold uppercase ${
                        results.length === 0 
                          ? 'bg-zinc-900 text-zinc-600 cursor-not-allowed' 
                          : 'bg-green-600 text-black hover:bg-green-500'
                      }`}
                    >
                      <Download size={14} /> Download .txt
                    </button>
                  </div>
                </div>
              )}

            </div>

          </div>

        </div>

      </div>
    </div>
  );
};

export default App;