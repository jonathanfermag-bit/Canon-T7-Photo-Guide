
import React, { useState, useRef, useEffect } from 'react';
import { analyzeScene } from './services/geminiService';
import { AnalysisState, HistoryItem, CameraSettings, UserLens } from './types';
import SettingsDisplay from './components/SettingsDisplay';

interface Preset {
  l: string;
  icon: string;
  explanation: string;
}

const App: React.FC = () => {
  const [description, setDescription] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [userLenses, setUserLenses] = useState<UserLens[]>([]);
  const [newLensName, setNewLensName] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<Preset | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisState>({
    loading: false,
    error: null,
    result: null
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const savedHistory = localStorage.getItem('t7_photo_history');
    if (savedHistory) setHistory(JSON.parse(savedHistory));
    
    const savedLenses = localStorage.getItem('t7_user_lenses');
    if (savedLenses) {
      setUserLenses(JSON.parse(savedLenses));
    } else {
      const defaults = [
        { id: '1', name: '18-55mm f/3.5-5.6 IS II (Kit)' },
        { id: '2', name: '50mm f/1.8 STM' }
      ];
      setUserLenses(defaults);
      localStorage.setItem('t7_user_lenses', JSON.stringify(defaults));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('t7_photo_history', JSON.stringify(history.slice(0, 10)));
  }, [history]);

  useEffect(() => {
    localStorage.setItem('t7_user_lenses', JSON.stringify(userLenses));
  }, [userLenses]);

  const addLens = () => {
    if (newLensName.trim()) {
      const lens = { id: Date.now().toString(), name: newLensName.trim() };
      setUserLenses(prev => [...prev, lens]);
      setNewLensName('');
    }
  };

  const removeLens = (id: string) => {
    setUserLenses(prev => prev.filter(l => l.id !== id));
  };

  const resizeImage = (dataUrl: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const max_size = 1024;
        if (width > height) {
          if (width > max_size) { height *= max_size / width; width = max_size; }
        } else {
          if (height > max_size) { width *= max_size / height; height = max_size; }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = dataUrl;
    });
  };

  const toggleCamera = async () => {
    if (isCameraActive) {
      const stream = videoRef.current?.srcObject as MediaStream;
      stream?.getTracks().forEach(track => track.stop());
      setIsCameraActive(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment' }, 
          audio: false 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setIsCameraActive(true);
        }
      } catch (err) {
        setAnalysis(prev => ({ ...prev, error: "Câmera não acessível ou permissão negada." }));
      }
    }
  };

  const capturePhoto = async () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(video, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      
      const stream = videoRef.current?.srcObject as MediaStream;
      stream?.getTracks().forEach(track => track.stop());
      setIsCameraActive(false);
      
      const compressed = await resizeImage(dataUrl);
      setPreview(compressed);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const compressed = await resizeImage(reader.result as string);
        setPreview(compressed);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!description && !preview) {
      setAnalysis(prev => ({ ...prev, error: "Forneça uma imagem ou descrição da cena." }));
      return;
    }
    setAnalysis({ loading: true, error: null, result: null });
    try {
      const base64Data = preview ? preview.split(',')[1] : undefined;
      const lensNames = userLenses.map(l => l.name);
      const result = await analyzeScene(description || "Sugira as melhores configurações técnicas", lensNames, base64Data);
      
      setAnalysis({ loading: false, error: null, result });
      
      const newItem: HistoryItem = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        description: description || (preview ? "Análise via foto" : "Cena descrita"),
        image: preview || undefined,
        result
      };
      setHistory(prev => [newItem, ...prev]);
    } catch (err: any) {
      console.error(err);
      setAnalysis({ loading: false, error: "Erro na análise. Tente uma foto mais simples ou descrição curta.", result: null });
    }
  };

  const loadFromHistory = (item: HistoryItem) => {
    setAnalysis({ loading: false, error: null, result: item.result });
    setDescription(item.description);
    setPreview(item.image || null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clearAll = () => {
    setDescription('');
    setPreview(null);
    setAnalysis({ loading: false, error: null, result: null });
    setSelectedPreset(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (isCameraActive) toggleCamera();
  };

  const presets: Preset[] = [
    { 
      l: 'Retrato (Bokeh)', 
      icon: '👤', 
      explanation: 'Foca no assunto e desfoca o fundo. Requer grandes aberturas (f menor) e, se possível, lentes de 50mm ou mais.' 
    },
    { 
      l: 'Ação/Esporte', 
      icon: '⚡', 
      explanation: 'Congela movimentos rápidos. Utiliza velocidades de obturador altas (1/500s ou mais) para evitar borrões.' 
    },
    { 
      l: 'Longo Tempo (Véu)', 
      icon: '💧', 
      explanation: 'Cria o efeito "seda" em águas. Exige tripé e velocidades baixas (1s a 30s), fechando a abertura para f/11 ou mais.' 
    },
    { 
      l: 'Macro / Detalhes', 
      icon: '🔍', 
      explanation: 'Foco em objetos minúsculos. Exige proximidade extrema e profundidade de campo rasa para isolar o detalhe.' 
    },
    { 
      l: 'Astrofotografia', 
      icon: '🌌', 
      explanation: 'Captura estrelas e Via Láctea. Requer tripé, ISO alto (1600-3200) e exposições longas de 15-25 segundos.' 
    },
    { 
      l: 'Pôr do Sol', 
      icon: '🌅', 
      explanation: 'Equilibra as cores quentes. Foca na medição de luz do céu para não "estourar" as altas luzes.' 
    },
    { 
      l: 'Silhueta', 
      icon: '🌑', 
      explanation: 'Objeto preto contra fundo iluminado. Subexpõe o assunto focando na parte mais clara da cena.' 
    },
    { 
      l: 'Comida (Still)', 
      icon: '🍱', 
      explanation: 'Destaca texturas e cores. Geralmente usa luz lateral suave e profundidade de campo moderada.' 
    },
    { 
      l: 'Street / Urbana', 
      icon: '🏙️', 
      explanation: 'Captura momentos espontâneos. Requer configurações ágeis e foco rápido para cenas dinâmicas.' 
    },
    { 
      l: 'Light Painting', 
      icon: '🔦', 
      explanation: 'Desenhar com luz no escuro. Longa exposição em ambiente breu enquanto se move uma fonte de luz.' 
    }
  ];

  const selectPreset = (p: Preset) => {
    setSelectedPreset(p);
    setDescription(p.l);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-gray-200 selection:bg-red-600 selection:text-white">
      <nav className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 group cursor-pointer" onClick={clearAll}>
            <div className="w-8 h-8 bg-red-600 rounded-md flex items-center justify-center font-black italic text-lg text-white shadow-[0_0_15px_rgba(220,38,38,0.4)]">C</div>
            <div className="hidden sm:block">
              <h1 className="text-sm font-black tracking-tighter uppercase leading-none text-white">Canon Rebel T7</h1>
              <p className="text-[8px] text-gray-500 uppercase tracking-[0.2em] font-bold">AI Field Assistant</p>
            </div>
          </div>
          <button onClick={clearAll} className="text-[10px] font-black uppercase text-gray-500 hover:text-red-500 transition-colors tracking-widest">Resetar</button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 pt-12 pb-24 grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-7 space-y-10">
          <section className="space-y-4">
            <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-white leading-[0.9]">
              Configuração <br/><span className="text-red-600">Sob Medida.</span>
            </h2>
            <p className="text-gray-500 text-sm max-w-md">Análise inteligente para sua Rebel T7 com base no seu set de lentes.</p>
          </section>

          {/* Seção Meu Equipamento */}
          <section className="bg-gray-900/40 border border-gray-800 rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-black uppercase text-gray-400 tracking-widest flex items-center gap-2">
                <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/></svg>
                Meu Equipamento (Lentes)
              </h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {userLenses.map(lens => (
                <div key={lens.id} className="flex items-center gap-2 bg-gray-800 border border-gray-700 px-3 py-1.5 rounded-full group hover:border-red-600/50 transition-all">
                  <span className="text-xs font-bold text-gray-300">{lens.name}</span>
                  <button onClick={() => removeLens(lens.id)} className="text-gray-500 hover:text-red-500 transition-colors"><svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/></svg></button>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <input 
                  type="text" 
                  value={newLensName}
                  onChange={(e) => setNewLensName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addLens()}
                  placeholder="Nova Lente..."
                  className="bg-transparent border-b border-gray-800 text-xs px-2 py-1 focus:border-red-600 outline-none text-gray-400 placeholder:text-gray-700 w-24 focus:w-40 transition-all"
                />
                <button onClick={addLens} className="text-red-600 hover:text-red-400"><svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd"/></svg></button>
              </div>
            </div>
          </section>

          <div className="space-y-8">
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest px-1">Entrada Visual</label>
              <div className="relative group overflow-hidden rounded-3xl border border-gray-800 bg-gray-900 shadow-2xl h-80">
                {isCameraActive ? (
                  <div className="h-full w-full relative">
                    <video ref={videoRef} autoPlay playsInline className="h-full w-full object-cover scale-x-[-1]" />
                    <button onClick={capturePhoto} className="absolute bottom-6 left-1/2 -translate-x-1/2 w-16 h-16 bg-white rounded-full border-[6px] border-black/20 flex items-center justify-center active:scale-90 transition-transform"><div className="w-10 h-10 bg-red-600 rounded-full"></div></button>
                  </div>
                ) : preview ? (
                  <div className="h-full w-full relative">
                    <img src={preview} alt="Preview" className="h-full w-full object-cover" />
                    <button onClick={() => setPreview(null)} className="absolute top-4 right-4 bg-black/60 p-2 rounded-lg hover:bg-red-600 transition-colors"><svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
                  </div>
                ) : (
                  <div className="h-full w-full flex flex-col items-center justify-center gap-4 cursor-pointer hover:bg-gray-800/50 transition-colors" onClick={() => fileInputRef.current?.click()}>
                    <div className="w-14 h-14 bg-gray-800 rounded-full flex items-center justify-center text-gray-500 border border-gray-700 shadow-xl"><svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg></div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tire uma foto ou carregue</p>
                  </div>
                )}
              </div>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
              <canvas ref={canvasRef} className="hidden" />
              <div className="flex justify-end">
                <button onClick={toggleCamera} className={`text-[9px] font-bold uppercase px-3 py-1 rounded-full border transition-all ${isCameraActive ? 'bg-red-600 border-red-500 text-white' : 'bg-transparent border-gray-800 text-gray-500'}`}>
                  {isCameraActive ? 'Desativar Câmera' : 'Usar Câmera ao Vivo'}
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest px-1">O que você vê?</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Pássaro voando sob luz forte..."
                className="w-full h-24 bg-gray-900 border border-gray-800 rounded-2xl p-5 text-sm focus:ring-1 focus:ring-red-600 focus:border-red-600 outline-none transition-all resize-none text-gray-200 placeholder:text-gray-700"
              />
            </div>

            <button
              onClick={handleAnalyze}
              disabled={analysis.loading}
              className={`w-full h-16 rounded-2xl font-black uppercase tracking-[0.2em] text-xs transition-all ${analysis.loading ? 'bg-gray-800 text-gray-600 cursor-not-allowed' : 'bg-red-600 hover:bg-red-500 text-white shadow-lg active:scale-[0.98]'}`}
            >
              {analysis.loading ? 'Gerando Setup...' : 'Gerar Setup Fotográfico'}
            </button>

            {analysis.error && <div className="p-4 bg-red-900/10 border border-red-900/30 rounded-xl text-red-500 text-xs font-bold animate-shake">{analysis.error}</div>}
          </div>
        </div>

        {/* Lado Direito: Resultados e Ateliê de Cenas */}
        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-28 space-y-8">
            {analysis.result ? (
              <SettingsDisplay settings={analysis.result} />
            ) : (
              <div className="border border-dashed border-gray-800 rounded-3xl p-12 flex flex-col items-center justify-center text-center bg-gray-900/10 min-h-[300px]">
                <div className="w-16 h-16 bg-gray-900 rounded-full flex items-center justify-center border border-gray-800 mb-4 opacity-30 animate-pulse"><svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg></div>
                <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Painel Técnico</h4>
                <p className="text-[10px] text-gray-700 mt-2 uppercase tracking-tight">Configure a cena e solicite análise</p>
              </div>
            )}
            
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <label className="text-[10px] font-black uppercase text-gray-600 tracking-widest px-1">Biblioteca de Cenas</label>
                <div className="h-px flex-1 bg-gray-800/30"></div>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                {presets.map(p => (
                  <button 
                    key={p.l} 
                    onClick={() => selectPreset(p)} 
                    className={`p-3 rounded-xl text-[10px] font-bold uppercase transition-all flex items-center gap-2 text-left border ${selectedPreset?.l === p.l ? 'bg-red-600 border-red-500 text-white' : 'bg-gray-900/40 border-gray-800/60 text-gray-500 hover:text-white hover:border-red-600/50'}`}
                  >
                    <span className="text-xs">{p.icon}</span><span className="truncate">{p.l}</span>
                  </button>
                ))}
              </div>

              {selectedPreset && (
                <div className="bg-gray-900/60 border border-gray-700/30 p-4 rounded-2xl animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[9px] font-black text-red-500 uppercase tracking-widest">Nota de Campo:</span>
                    <span className="text-[10px] font-bold text-gray-300">{selectedPreset.l}</span>
                  </div>
                  <p className="text-[11px] text-gray-400 leading-relaxed italic">
                    {selectedPreset.explanation}
                  </p>
                </div>
              )}
            </div>
            
            {history.length > 0 && (
              <div className="pt-4 border-t border-gray-800">
                <h3 className="text-[9px] font-black uppercase text-gray-600 tracking-widest mb-4">Últimas Análises</h3>
                <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
                  {history.map((item) => (
                    <button key={item.id} onClick={() => loadFromHistory(item)} className="flex-shrink-0 w-16 h-16 rounded-lg bg-gray-900 border border-gray-800 overflow-hidden hover:border-red-600 transition-colors">
                      {item.image ? <img src={item.image} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[8px] text-gray-700 font-bold">RAW</div>}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <div className="fixed inset-0 pointer-events-none z-[-1] opacity-20">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px]"></div>
      </div>
    </div>
  );
};

export default App;
