
import React, { useState } from 'react';
import { CameraSettings } from '../types';

interface SettingsDisplayProps {
  settings: CameraSettings;
}

const SettingsDisplay: React.FC<SettingsDisplayProps> = ({ settings }) => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    const text = `
Canon T7 Suggestion:
Mode: ${settings.mode}
ISO: ${settings.iso}
Aperture: ${settings.aperture}
Shutter: ${settings.shutterSpeed}
White Balance: ${settings.whiteBalance}
Focus: ${settings.focusMode}
Lens: ${settings.lensSuggestion}
    `.trim();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-700/50 overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="bg-gradient-to-r from-red-700 to-red-600 px-6 py-4 flex justify-between items-center border-b border-red-500/20">
        <div>
          <h2 className="text-xl font-black text-white tracking-tighter uppercase leading-none">Configuração Ideal</h2>
          <p className="text-[10px] text-red-200 uppercase font-bold tracking-widest mt-1">Status: Otimizado para T7</p>
        </div>
        <button 
          onClick={copyToClipboard}
          className="bg-black/20 hover:bg-black/40 p-2 rounded-lg transition-colors text-white"
          title="Copiar Configurações"
        >
          {copied ? (
            <span className="text-[10px] font-bold uppercase">Copiado!</span>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
            </svg>
          )}
        </button>
      </div>
      
      <div className="p-6">
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { label: 'ISO', val: settings.iso },
            { label: 'Abertura', val: settings.aperture },
            { label: 'Obturador', val: settings.shutterSpeed }
          ].map((item, i) => (
            <div key={i} className="flex flex-col items-center p-3 bg-black/40 rounded-xl border border-gray-700/50 shadow-inner">
              <span className="text-gray-500 text-[9px] font-black uppercase mb-1 tracking-widest">{item.label}</span>
              <span className="text-xl font-black text-red-500 font-mono">{item.val}</span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="space-y-4">
            <div className="group">
              <p className="text-gray-500 text-[9px] uppercase font-black tracking-widest mb-1 group-hover:text-red-400 transition-colors">Modo de Exposição</p>
              <p className="text-sm font-bold text-gray-200 border-l-2 border-red-600 pl-2">{settings.mode}</p>
            </div>
            <div className="group">
              <p className="text-gray-500 text-[9px] uppercase font-black tracking-widest mb-1 group-hover:text-red-400 transition-colors">Balanço de Branco</p>
              <p className="text-sm font-bold text-gray-200 border-l-2 border-red-600 pl-2">{settings.whiteBalance}</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="group">
              <p className="text-gray-500 text-[9px] uppercase font-black tracking-widest mb-1 group-hover:text-red-400 transition-colors">Foco (AF)</p>
              <p className="text-sm font-bold text-gray-200 border-l-2 border-red-600 pl-2">{settings.focusMode}</p>
            </div>
            <div className="group">
              <p className="text-gray-500 text-[9px] uppercase font-black tracking-widest mb-1 group-hover:text-red-400 transition-colors">Lente Sugerida</p>
              <p className="text-sm font-bold text-gray-200 border-l-2 border-red-600 pl-2">{settings.lensSuggestion}</p>
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t border-gray-800">
          <div>
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-red-600 rounded-full animate-pulse"></span>
              Análise Técnica
            </h3>
            <p className="text-gray-300 text-sm leading-relaxed italic bg-gray-800/30 p-3 rounded-lg border border-gray-700/30">
              "{settings.explanation}"
            </p>
          </div>
          
          <div>
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Checklist de Campo</h3>
            <div className="grid grid-cols-1 gap-2">
              {settings.tips.map((tip, idx) => (
                <div key={idx} className="flex items-start gap-3 text-xs text-gray-400 bg-gray-800/20 p-2 rounded-md hover:bg-gray-800/40 transition-colors cursor-default">
                  <span className="text-red-600 font-bold">0{idx + 1}</span>
                  <span>{tip}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsDisplay;
