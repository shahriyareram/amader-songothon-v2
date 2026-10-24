import React, { useState } from 'react';
import { getPushDiagnostics, clearPushDiagnostics, PushDiagnosticEvent } from '../services/nativePushService';
import { Terminal, Copy, Check, Trash2, X } from 'lucide-react';

interface PushDiagnosticModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PushDiagnosticModal: React.FC<PushDiagnosticModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [logs, setLogs] = useState<PushDiagnosticEvent[]>(() => getPushDiagnostics());
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleRefresh = () => {
    setLogs(getPushDiagnostics());
  };

  const handleClear = () => {
    clearPushDiagnostics();
    setLogs([]);
  };

  const handleCopy = async () => {
    try {
      const text = logs.length === 0
        ? 'কোনো পুশ নোটিফিকেশন লগ পাওয়া যায়নি।'
        : logs.map((l, i) => `${i + 1}. [${l.time}] [${l.status.toUpperCase()}] ${l.step}${l.details ? ` - ${l.details}` : ''}`).join('\n');
      
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3">
      <div className="bg-white rounded-3xl max-w-md w-full p-5 border border-slate-200 shadow-2xl space-y-3.5 max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-slate-900 text-emerald-400 flex items-center justify-center">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900">
                নোটিফিকেশন ডায়াগনস্টিক লগ
              </h3>
              <p className="text-[10px] text-slate-500">
                সর্বমোট এন্ট্রি: {logs.length} টি
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-1.5 font-mono text-[11px] bg-slate-950 text-slate-200 p-3 rounded-2xl border border-slate-800">
          {logs.length === 0 ? (
            <div className="text-center py-6 text-slate-500 font-sans text-xs">
              এখনো কোনো পুশ ডায়াগনস্টিক লগ রেকর্ড হয়নি।
            </div>
          ) : (
            logs.map((log, index) => {
              const statusColor =
                log.status === 'success'
                  ? 'text-emerald-400'
                  : log.status === 'failed'
                  ? 'text-rose-400'
                  : log.status === 'started'
                  ? 'text-amber-300'
                  : 'text-sky-300';

              return (
                <div key={index} className="border-b border-slate-800/80 pb-1 last:border-b-0">
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>#{index + 1} {log.time}</span>
                    <span className={`font-bold uppercase ${statusColor}`}>{log.status}</span>
                  </div>
                  <div className="text-slate-100 font-semibold mt-0.5">{log.step}</div>
                  {log.details && (
                    <div className="text-slate-400 text-[10px] break-all mt-0.5">
                      {log.details}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={handleCopy}
            className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'কপি হয়েছে!' : 'লগ কপি করুন'}</span>
          </button>
          <button
            type="button"
            onClick={handleClear}
            title="লগ ক্লিয়ার করুন"
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
          >
            বন্ধ
          </button>
        </div>
      </div>
    </div>
  );
};
