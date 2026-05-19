import { useEffect, useState } from 'react';
import { useAuth } from '../components/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { db, auth } from '../lib/firebase';
import { collection, query, getDocs, orderBy, limit } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { BarChart3, TrendingUp, Award, Target, Loader2, Sparkles } from 'lucide-react';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';

interface Analysis {
  strengths: string[];
  improvements: string[];
  recommendations: string[];
  progressScore: number;
}

interface QuizResult {
  id: string;
  topic: string;
  score: number;
  date: string;
  timestamp?: { seconds: number };
}

interface HistoryItem {
  prompt: string;
}

export default function StatsPage() {
  const { profile } = useAuth();
  const [quizzes, setQuizzes] = useState<QuizResult[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    async function fetchData() {
      if (profile?.uid) {
        const path = `users/${profile.uid}`;
        try {
          const qSnap = await getDocs(query(collection(db, 'users', profile.uid, 'quizzes'), orderBy('timestamp', 'asc')));
          const hSnap = await getDocs(query(collection(db, 'users', profile.uid, 'history'), orderBy('timestamp', 'desc'), limit(10)));
          
          setQuizzes(qSnap.docs.map(doc => {
            const data = doc.data();
            return { 
              ...data, 
              id: doc.id, 
              topic: data.topic,
              score: data.score,
              date: data.timestamp?.seconds ? new Date(data.timestamp.seconds * 1000).toLocaleDateString() : 'Reciente'
            } as QuizResult;
          }));
          setHistory(hSnap.docs.map(doc => doc.data() as HistoryItem));
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, path);
        }
      }
    }
    fetchData();
  }, [profile]);

  const generateAnalysis = async () => {
    if (quizzes.length === 0 && history.length === 0) {
      toast.error('Necesitamos algunos datos (quizzes o consultas) para analizar tu progreso.');
      return;
    }
    setAnalyzing(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/analyze-progress', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
          ...(profile?.geminiApiKey ? { 'x-gemini-api-key': profile.geminiApiKey } : {})
        },
        body: JSON.stringify({
          history: history.map(h => h.prompt),
          grades: quizzes.map(q => ({ subject: q.topic, score: q.score }))
        }),
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Error al generar el reporte de progreso');
      }

      setAnalysis(data);
      toast.success('Análisis completado con IA');
    } catch (err: any) {
      toast.error(err.message || 'Error al generar el reporte de progreso');
    } finally {
      setAnalyzing(false);
    }
  };

  const chartData = quizzes.slice(-7); // Last 7 quizzes

  return (
    <div className="p-4 max-w-6xl mx-auto space-y-6 animate-in fade-in duration-700 relative">
      {/* Background decorations */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full pointer-events-none -z-10 opacity-40">
        <div className="absolute top-0 right-0 w-80 h-80 bg-rose-100/30 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-100/30 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-1/4 w-60 h-60 bg-amber-100/40 rounded-full blur-[100px]" />
      </div>

      <header className="flex flex-col items-center text-center gap-4 relative z-10">
        <div className="flex flex-col items-center gap-2">
          <div className="p-3 bg-indigo-600 rounded-2xl shadow-2xl shadow-indigo-200 rotate-6">
            <BarChart3 className="h-6 w-6 text-white" />
          </div>
          <div className="space-y-1 mt-2">
            <h1 className="text-3xl font-black tracking-tighter text-slate-800 leading-none">
              Progreso Académico
            </h1>
            <p className="text-slate-400 font-bold text-[9px] uppercase tracking-[0.4em] mt-2">Tu evolución en tiempo real</p>
          </div>
        </div>
        <Button 
          onClick={generateAnalysis} 
          disabled={analyzing}
          className="font-black h-12 px-8 rounded-xl shadow-2xl shadow-indigo-100 transition-all hover:scale-105 active:scale-95 text-sm flex items-center justify-center leading-none bg-indigo-600 hover:bg-slate-900 group"
        >
          <div className="flex items-center justify-center">
            {analyzing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2 text-indigo-300 group-hover:animate-pulse" />}
            <span>Gemini Insights</span>
          </div>
        </Button>
      </header>

      <div className="grid grid-cols-12 gap-5">
        {/* Charts Section */}
        <div className="col-span-12 lg:col-span-8 space-y-5">
          <Card className="border-none shadow-xl rounded-[2rem] bg-white overflow-hidden ring-1 ring-slate-100 relative">
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50/50 rounded-full blur-2xl -mr-12 -mt-12" />
            <CardHeader className="px-6 pt-6 pb-2 relative z-10">
              <CardTitle className="text-lg font-black text-slate-800 flex items-center gap-3">
                <div className="p-2 bg-indigo-50 rounded-lg shadow-sm border border-indigo-100">
                  <TrendingUp className="h-5 w-5 text-indigo-600" />
                </div>
                Curva de Aprendizaje
              </CardTitle>
              <CardDescription className="font-bold text-slate-400 uppercase tracking-[0.2em] text-[8px] mt-1">Desempeño en quizzes</CardDescription>
            </CardHeader>
            <CardContent className="px-6 pb-6 pt-2 relative z-10">
              <div className="h-[260px] w-full bg-white/50 backdrop-blur-sm rounded-2xl p-4 border border-slate-100 shadow-inner">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.4} />
                      <XAxis 
                        dataKey="date" 
                        stroke="#94A3B8" 
                        fontSize={11} 
                        fontWeight="800"
                        tickLine={false} 
                        axisLine={false} 
                        dy={10}
                      />
                      <YAxis 
                        stroke="#94A3B8" 
                        fontSize={11} 
                        fontWeight="800"
                        tickLine={false} 
                        axisLine={false} 
                        domain={[0, 100]}
                        tickFormatter={(v) => `${v}%`}
                      />
                      <Tooltip 
                        cursor={{ fill: '#F5F3FF' }}
                        contentStyle={{ 
                          borderRadius: '16px', 
                          border: 'none', 
                          boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                          fontWeight: '800',
                          fontSize: '12px',
                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                          backdropFilter: 'blur(8px)'
                        }}
                      />
                      <Bar dataKey="score" radius={[6, 6, 6, 6]} barSize={32}>
                        {chartData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={entry.score >= 80 ? '#10B981' : entry.score >= 60 ? '#6366F1' : '#F59E0B'} 
                            fillOpacity={0.9}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-300 text-sm font-black gap-3 italic">
                    <Target className="h-10 w-10 opacity-10" />
                    Completa quizzes para ver estadísticas.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-none shadow-xl ring-1 ring-slate-100 rounded-2xl bg-indigo-600 text-white overflow-hidden relative group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none" />
              <div className="absolute bottom-0 left-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
                <Award className="h-16 w-16" />
              </div>
              <CardContent className="p-5 flex flex-col justify-between h-full relative z-10">
                <p className="text-[8px] font-black uppercase tracking-widest text-indigo-100/70">Récord Máximo</p>
                <div className="mt-2 text-center sm:text-left">
                  <p className="text-2xl font-black drop-shadow-sm">
                    {quizzes.length > 0 ? (Math.max(...quizzes.map(q => q.score || 0)) || 0).toFixed(0) : '0'}
                    <span className="text-sm opacity-50 ml-1">%</span>
                  </p>
                  <p className="text-[9px] font-bold mt-1 opacity-80 leading-snug">Tu mejor marca registrada.</p>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-none shadow-xl ring-1 ring-slate-100 rounded-2xl bg-white overflow-hidden group relative">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-full blur-2xl -mr-12 -mt-12 pointer-events-none" />
              <CardContent className="p-5 flex flex-col justify-between h-full relative z-10">
                <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Media de Grupo</p>
                <div className="mt-2 flex items-end justify-center sm:justify-start gap-2">
                  <p className="text-2xl font-black text-slate-800">
                    {quizzes.length > 0 ? (quizzes.reduce((acc, q) => acc + (q.score || 0), 0) / quizzes.length).toFixed(0) : '0'}
                    <span className="text-sm text-slate-300 ml-1">%</span>
                  </p>
                  <div className="h-7 w-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 mb-0.5 shadow-sm border border-emerald-100">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                </div>
                <p className="text-[9px] font-bold mt-1 text-slate-500 leading-snug">Rendimiento actual ponderado.</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* AI Analysis Section */}
        <div className="col-span-12 lg:col-span-4">
          {analysis ? (
            <Card className="border-none shadow-2xl rounded-[2rem] bg-white h-full ring-1 ring-slate-200/50 flex flex-col overflow-hidden relative group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
              <div className="bg-slate-900 p-6 text-white relative z-10">
                <CardTitle className="text-base font-black flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-amber-400" />
                  IA Analytics
                </CardTitle>
                <p className="text-[8px] font-bold opacity-40 mt-0.5 uppercase tracking-widest leading-none">Perfil Estudiantil Optimizado</p>
              </div>
              <CardContent className="p-6 space-y-5 flex-1 relative z-10">
                <div className="flex flex-col items-center justify-center p-5 bg-indigo-50/50 rounded-[2rem] space-y-2 border border-indigo-100/50 shadow-inner">
                  <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">Rating de Aprendizaje</span>
                  <p className="text-4xl font-black text-indigo-600 tracking-tighter">
                    {(analysis.progressScore ?? 0).toFixed(0)}
                  </p>
                  <div className="w-full bg-white/80 h-2 rounded-full overflow-hidden p-0.5 shadow-sm border border-indigo-100">
                    <div 
                      className="bg-gradient-to-r from-indigo-500 to-purple-600 h-full rounded-full transition-all duration-1000" 
                      style={{ width: `${analysis.progressScore ?? 0}%` }} 
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <section className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[8px] font-black uppercase text-emerald-600 tracking-widest flex items-center gap-2">
                         Fortalezas
                      </h4>
                      <div className="h-1 w-8 bg-emerald-100 rounded-full" />
                    </div>
                    <div className="space-y-1.5">
                      {analysis.strengths.slice(0, 3).map((s, i) => (
                        <div key={i} className="text-[10px] font-bold text-slate-700 bg-emerald-50/50 px-3 py-2 rounded-xl border border-emerald-100/50 flex items-center gap-2 leading-tight transition-all hover:bg-emerald-100/50">
                          <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                          {s}
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[8px] font-black uppercase text-amber-600 tracking-widest flex items-center gap-2">
                         Zonas de Mejora
                      </h4>
                      <div className="h-1 w-8 bg-amber-100 rounded-full" />
                    </div>
                    <div className="space-y-1.5">
                      {analysis.improvements.slice(0, 3).map((s, i) => (
                        <div key={i} className="text-[10px] font-bold text-slate-700 bg-amber-50/50 px-3 py-2 rounded-xl border border-amber-100/50 flex items-center gap-2 leading-tight transition-all hover:bg-amber-100/50">
                          <div className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                          {s}
                        </div>
                      ))}
                    </div>
                  </section>

                  <div className="p-4 rounded-2xl bg-slate-50 text-slate-600 italic text-[10px] font-medium leading-relaxed relative mt-2 border border-slate-100 shadow-sm">
                    <p className="relative z-10">“{analysis.recommendations[0]}”</p>
                    <div className="absolute -top-2 -left-1 bg-amber-400 p-1 rounded-lg shadow-lg rotate-[-10deg]">
                      <Target className="h-3 w-3 text-white" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="h-full border-4 border-dashed border-indigo-50 rounded-[2.5rem] bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center space-y-4 ring-1 ring-slate-100">
              <div className="bg-indigo-600 p-4 rounded-2xl shadow-2xl shadow-indigo-200 rotate-3 group overflow-hidden">
                <Sparkles className="h-8 w-8 text-white group-hover:scale-110 transition-transform" />
              </div>
              <div className="space-y-2">
                <p className="font-black text-xl text-slate-800">Reporte IA</p>
                <p className="text-[11px] text-slate-400 font-bold leading-relaxed px-4 opacity-80">
                  Calculamos tu perfil académico con algoritmos de IA de última generación.
                </p>
              </div>
              <Button 
                variant="outline"
                size="sm" 
                className="font-black text-indigo-600 border-indigo-100 hover:bg-indigo-50 hover:text-indigo-700 transition-all rounded-xl h-12 px-8 text-xs shadow-sm"
                onClick={generateAnalysis}
                disabled={analyzing}
              >
                {analyzing ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Calculando...</span>
                  </div>
                ) : (
                  <span>Obtener Análisis</span>
                )}
              </Button>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
