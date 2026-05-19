import { useState, useEffect } from 'react';
import { useAuth } from '../components/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, orderBy, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { History as HistoryIcon, BookOpen, Trash2, Calendar, ChevronRight, Search, Sparkles, Zap } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface HistoryEntry {
  id: string;
  subject: string;
  grade: string;
  prompt: string;
  response: string;
  timestamp?: { seconds: number };
}

export default function HistoryPage() {
  const { profile } = useAuth();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEntry, setSelectedEntry] = useState<HistoryEntry | null>(null);

  useEffect(() => {
    async function fetchHistory() {
      if (!profile?.uid) {
        setLoading(false);
        return;
      }
      
      const path = `users/${profile.uid}/history`;
      try {
        const q = query(
          collection(db, 'users', profile.uid, 'history'),
          orderBy('timestamp', 'desc')
        );
        const snap = await getDocs(q);
        setHistory(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as HistoryEntry)));
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, path);
      } finally {
        setLoading(false);
      }
    }

    fetchHistory();
  }, [profile]);

  const handleDelete = async (e: React.MouseEvent, entryId: string) => {
    e.stopPropagation();
    if (!profile?.uid) return;

    const path = `users/${profile.uid}/history/${entryId}`;
    try {
      await deleteDoc(doc(db, 'users', profile.uid, 'history', entryId));
      setHistory(prev => prev.filter(h => h.id !== entryId));
      if (selectedEntry?.id === entryId) setSelectedEntry(null);
      toast.success('Entrada eliminada correctamente');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const filteredHistory = history.filter(h => 
    h.prompt.toLowerCase().includes(searchTerm.toLowerCase()) ||
    h.subject.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 max-w-6xl mx-auto space-y-4 animate-in fade-in duration-500 relative">
      {/* Background decorations */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full pointer-events-none -z-10 opacity-40">
        <div className="absolute top-0 right-0 w-80 h-80 bg-rose-100/30 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-sky-100/30 rounded-full blur-[100px]" />
        <div className="absolute top-1/4 left-1/3 w-64 h-64 bg-indigo-50/40 rounded-full blur-[80px]" />
      </div>

      <header className="flex flex-col items-center text-center gap-2 py-2">
        <motion.div 
          initial={{ scale: 0.8, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          className="p-3 bg-indigo-600 rounded-2xl shadow-2xl shadow-indigo-200 text-white"
        >
          <HistoryIcon className="h-7 w-7" />
        </motion.div>
        <div className="space-y-0">
          <h1 className="text-4xl font-black tracking-tighter text-slate-800 leading-none">
            Tu Recorrido
          </h1>
          <p className="text-slate-400 font-bold text-[9px] uppercase tracking-[0.5em] mt-2">Explora tus aprendizajes pasados</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 relative z-10">

        {/* List of Previous Consultations */}
        <div className="lg:col-span-5 space-y-3">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <div className="relative group flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
              <input 
                type="text" 
                placeholder="Buscar duda o materia..." 
                className="w-full bg-white border-2 border-slate-100 rounded-2xl py-5 pl-12 pr-4 text-base font-bold shadow-md focus:outline-none focus:ring-4 focus:ring-indigo-50/50 focus:border-indigo-200 transition-all placeholder:text-slate-300"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </motion.div>

          <div className="space-y-2.5 h-[320px] overflow-y-auto pr-2 custom-scrollbar">
            {loading ? (
              Array(4).fill(0).map((_, i) => (
                <div key={i} className="h-28 bg-slate-100 rounded-[2rem] animate-pulse" />
              ))
            ) : filteredHistory.length > 0 ? (
              <AnimatePresence mode="popLayout">
                {filteredHistory.map((h, i) => (
                  <motion.div
                    key={h.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => setSelectedEntry(h)}
                    className={cn(
                      "w-full text-left p-6 rounded-[2rem] border-2 transition-all group flex items-start justify-between cursor-pointer relative overflow-hidden",
                      selectedEntry?.id === h.id 
                        ? "bg-indigo-600 border-indigo-600 text-white shadow-2xl shadow-indigo-100" 
                        : "bg-white border-slate-50 hover:border-indigo-100 hover:bg-slate-50 shadow-sm"
                    )}
                  >
                    {selectedEntry?.id === h.id && (
                      <motion.div 
                        layoutId="activeBg"
                        className="absolute inset-0 bg-indigo-600 -z-10"
                      />
                    )}
                    <div className="flex-1 min-w-0 relative z-10">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={cn(
                          "text-[8px] font-black uppercase tracking-wider px-2 py-1 rounded-lg",
                          selectedEntry?.id === h.id 
                            ? "bg-white/20 text-white" 
                            : h.subject === 'Matemáticas' ? "bg-amber-50 text-amber-600" :
                              h.subject === 'Ciencias' ? "bg-emerald-50 text-emerald-600" :
                              h.subject === 'Historia' ? "bg-rose-50 text-rose-600" :
                              "bg-indigo-50 text-indigo-600"
                        )}>
                          {h.subject}
                        </span>
                        <span className={cn(
                          "text-[8px] font-bold flex items-center gap-1 uppercase tracking-widest",
                          selectedEntry?.id === h.id ? "text-white/60" : "text-slate-300"
                        )}>
                          <Calendar className="h-3 w-3" />
                          {h.timestamp?.seconds ? new Date(h.timestamp.seconds * 1000).toLocaleDateString() : 'Reciente'}
                        </span>
                      </div>
                      <h3 className={cn(
                        "text-[13px] font-black line-clamp-2 leading-tight transition-colors",
                        selectedEntry?.id === h.id ? "text-white" : "text-slate-800"
                      )}>
                        {h.prompt}
                      </h3>
                    </div>
                    <div className="flex flex-col items-end justify-between self-stretch ml-3 relative z-10">
                      <button 
                        onClick={(e) => handleDelete(e, h.id)}
                        className={cn(
                          "p-1.5 rounded-lg transition-all",
                          selectedEntry?.id === h.id 
                            ? "text-white/40 hover:text-white" 
                            : "text-slate-200 hover:text-rose-500"
                        )}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <ChevronRight className={cn(
                        "h-5 w-5 transition-transform",
                        selectedEntry?.id === h.id ? "text-white translate-x-1" : "text-slate-100"
                      )} />
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center opacity-30">
                <HistoryIcon className="h-16 w-16 text-slate-400 mb-4" />
                <p className="text-sm font-black uppercase tracking-[0.2em] text-slate-500">Sin consultas previas</p>
              </div>
            )}
          </div>
        </div>

        {/* Detailed View */}
        <div className="lg:col-span-7">
          {selectedEntry ? (
            <div className="animate-in slide-in-from-right-4 duration-500 h-[320px]">
              <Card className="border-none shadow-2xl rounded-[1.5rem] overflow-hidden bg-white ring-1 ring-slate-100 h-full flex flex-col relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-100/20 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-100/20 rounded-full blur-2xl -ml-16 -mb-16 pointer-events-none" />
                
                <div className="h-1.5 bg-indigo-600 w-full relative z-10" />
                <CardHeader className="p-4 pb-3 border-b border-slate-50 bg-white/40 backdrop-blur-sm relative z-10">
                  <div className="flex flex-row items-center gap-3">
                    <div className="p-2 bg-indigo-600 rounded-lg shadow-lg shadow-indigo-100">
                      <BookOpen className="h-4 w-4 text-white" />
                    </div>
                    <div className="text-left">
                      <CardTitle className="text-lg font-black text-slate-800 tracking-tight">
                        Detalle de Consulta
                      </CardTitle>
                      <div className="flex items-center gap-2 mt-0.5">
                         <span className="text-[7px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                          {selectedEntry.subject}
                        </span>
                        <span className="text-[7px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1">
                          <Zap className="w-2 h-2 text-amber-500" />
                          {selectedEntry.grade}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 flex-1 overflow-y-auto bg-white/20 relative z-10 custom-scrollbar">
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <h4 className="text-[7px] font-black uppercase text-slate-400 tracking-[0.2em] ml-1">Tu duda:</h4>
                      <p className="text-slate-700 font-bold leading-snug text-[11px] italic bg-slate-50 p-3 rounded-lg border border-slate-100">"{selectedEntry.prompt}"</p>
                    </div>

                    <div className="space-y-1">
                      <h4 className="text-[7px] font-black uppercase text-slate-400 tracking-[0.2em] ml-1">Respuesta:</h4>
                      <div className="prose prose-slate max-w-none prose-p:font-medium text-[11px] leading-relaxed p-1">
                        <ReactMarkdown 
                          remarkPlugins={[remarkMath]} 
                          rehypePlugins={[rehypeKatex]}
                        >
                          {selectedEntry.response}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="h-[320px] flex flex-col items-center justify-center p-4 relative overflow-hidden bg-white border-2 border-dashed border-indigo-100 rounded-[2rem]">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  repeatType: "reverse"
                }}
                className="absolute inset-0 bg-gradient-to-br from-indigo-50/10 via-transparent to-purple-50/10"
              />
              
              <div className="relative z-10 flex flex-col items-center">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 rounded-xl shadow-xl shadow-indigo-100 flex items-center justify-center mb-3 rotate-3">
                  <Sparkles className="h-4 w-4 text-white animate-pulse" />
                </div>
                
                <h3 className="text-lg font-black text-slate-800 tracking-tight text-center leading-none">
                  Consultas Guardadas
                </h3>
                <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[7px] mt-2 text-center max-w-[180px] leading-relaxed">
                  Toca una tarjeta para ver los detalles
                </p>
                
                <div className="mt-6 flex gap-2">
                  {[1, 2, 3].map(i => (
                    <motion.div 
                      key={i}
                      animate={{ 
                        y: [0, -6, 0],
                        rotate: [0, 5, 0]
                      }}
                      transition={{ 
                        duration: 3, 
                        delay: i * 0.2, 
                        repeat: Infinity 
                      }}
                      className="w-1.5 h-1.5 rounded-full bg-indigo-200"
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
