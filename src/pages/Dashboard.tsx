import { useAuth } from '../components/AuthContext';
import { Card } from '../components/ui/card';
import { BookOpen, TrendingUp, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, query, getDocs, limit } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

export default function Dashboard() {
  const { profile } = useAuth();
  const [historyCount, setHistoryCount] = useState(0);

  useEffect(() => {
    async function fetchStats() {
      if (profile?.uid) {
        const path = `users/${profile.uid}/history`;
        try {
          const q = query(
            collection(db, 'users', profile.uid, 'history'),
            limit(50) // Fetch some to show a non-zero count if they have it
          );
          const snap = await getDocs(q);
          setHistoryCount(snap.size); 
        } catch (error) {
          handleFirestoreError(error, OperationType.LIST, path);
        }
      }
    }
    fetchStats();
  }, [profile]);

  return (
    <div className="p-8 grid grid-cols-12 gap-8 max-w-7xl mx-auto animate-in fade-in duration-500">
      {/* Main Stats Card */}
      <Card className="col-span-12 lg:col-span-8 bg-white rounded-[2rem] border-none shadow-2xl p-8 flex flex-col items-center justify-between ring-1 ring-slate-100 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-rose-100/20 rounded-full blur-3xl -mr-32 -mt-32" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-sky-100/20 rounded-full blur-3xl -ml-32 -mb-32" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-50/30 rounded-full blur-[100px] pointer-events-none" />
        <div className="relative z-10 w-full flex flex-col items-center">
          <div className="flex flex-col items-center text-center space-y-3 w-full">
            <div className="space-y-1">
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">Un gusto verte de nuevo, {profile?.displayName || 'Estudiante'}</h2>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Optimizado por Gemini IA</p>
            </div>

          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8 w-full max-w-2xl">
            <div className="bg-emerald-50/50 p-6 rounded-[1.5rem] border border-emerald-100/50 shadow-inner group hover:bg-white hover:shadow-xl transition-all duration-300 flex flex-col items-center text-center">
              <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-[9px] uppercase font-black text-slate-400 mb-1 tracking-widest group-hover:text-emerald-400">Consultas IA</p>
              <p className="text-xl font-black text-slate-800 group-hover:text-emerald-600">{historyCount} <span className="text-xs font-bold text-slate-400 font-sans tracking-normal">total</span></p>
            </div>
            <div className="bg-amber-50/50 p-6 rounded-[1.5rem] border border-amber-100/50 shadow-inner group hover:bg-white hover:shadow-xl transition-all duration-300 flex flex-col items-center text-center">
              <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <TrendingUp className="w-4 h-4 text-amber-600 rotate-90" />
              </div>
              <p className="text-[9px] uppercase font-black text-slate-400 mb-1 tracking-widest group-hover:text-amber-400">Logros Hoy</p>
              <p className="text-xl font-black text-slate-800 group-hover:text-amber-600">85%</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Hero Stats (Sidebar for Desktop) */}
      <div className="col-span-12 lg:col-span-4 flex flex-col gap-4">
        <div className="bg-indigo-600 rounded-[2rem] p-6 text-white flex flex-col items-center justify-center shadow-[0_20px_50px_rgba(79,70,229,0.3)] relative overflow-hidden group min-h-[160px]">
          <div className="absolute inset-0 opacity-10 flex items-center justify-center pointer-events-none">
             <TrendingUp className="w-32 h-32" />
          </div>
          <div className="relative z-10 flex flex-col items-center gap-3 text-center">
            <div className="p-3 bg-white/20 rounded-2xl shadow-lg">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] opacity-70 font-black uppercase tracking-widest">Nivel Académico</p>
              <p className="text-xl font-black tracking-tight">{profile?.grade}</p>
            </div>
          </div>
        </div>

        {/* Quick Action Button Card */}
        <Link to="/homework" className="group">
          <Card className="bg-indigo-600 rounded-[2rem] border-none shadow-[0_20px_50px_rgba(79,70,229,0.3)] p-6 flex flex-col items-center gap-3 hover:scale-[1.02] transition-all cursor-pointer text-center text-white relative overflow-hidden min-h-[160px] justify-center">
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
            <div className="relative z-10 w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
              <BookOpen className="w-6 h-6" />
            </div>
            <div className="relative z-10">
              <h3 className="font-black text-white text-lg leading-tight tracking-tight">Tarea Nueva</h3>
              <p className="text-[9px] text-white/70 font-bold uppercase tracking-[0.2em] mt-1">Sube archivos y pregunta</p>
            </div>
            <div className="relative z-10 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/50 group-hover:bg-white group-hover:text-indigo-600 transition-all">
              <ArrowRight className="w-4 h-4" />
            </div>
          </Card>
        </Link>
      </div>
    </div>
  );
}
