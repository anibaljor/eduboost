import { NavLink } from 'react-router-dom';
import {
  BookOpen,
  LayoutDashboard,
  ClipboardList,
  BarChart3,
  Settings,
  LogOut,
  GraduationCap,
  History
} from 'lucide-react';
import { cn } from '../lib/utils';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { useAuth } from './AuthContext';

const items = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: BookOpen, label: 'Tutor IA', path: '/homework' },
  { icon: History, label: 'Historial', path: '/history' },
  { icon: ClipboardList, label: 'Quizzes', path: '/quiz' },
  { icon: BarChart3, label: 'Progreso', path: '/stats' },
  { icon: Settings, label: 'Ajustes', path: '/settings' },
];

export default function Sidebar() {
  const { profile } = useAuth();

  return (
    <>
      {/* Sidebar — solo en desktop */}
      <aside className="hidden md:flex w-64 bg-white border-r border-slate-200 flex-col p-6 shrink-0 h-full">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white font-bold text-xl ring-4 ring-primary/10">
            <GraduationCap className="h-6 w-6" />
          </div>
          <span className="font-bold text-xl tracking-tight text-slate-800">EduBoost AI</span>
        </div>

        <nav className="flex-1 space-y-2">
          {items.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 p-3.5 rounded-2xl transition-all font-bold text-sm tracking-tight",
                  isActive
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                )
              }
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="pt-6 border-t border-slate-100 space-y-4">
          <div className="flex items-center gap-3 p-2">
            <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-500 text-xs">
              {profile?.displayName?.[0] || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold truncate text-slate-800">{profile?.displayName}</p>
              <p className="text-[10px] text-slate-500 truncate">{profile?.grade}</p>
            </div>
          </div>

          <button
            onClick={() => signOut(auth)}
            className="w-full text-left text-xs font-semibold text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors flex items-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Bottom nav — solo en mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 flex justify-around items-center h-16 px-2">
        {items.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl transition-all",
                isActive ? "text-indigo-600" : "text-slate-400"
              )
            }
          >
            <item.icon className="h-5 w-5" />
            <span className="text-[9px] font-bold">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </>
  );
}
