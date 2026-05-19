import { useState, useEffect } from 'react';
import { useAuth } from '../components/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '../components/ui/dialog';
import { Settings, User, Trash2, ShieldCheck, Mail } from 'lucide-react';
import { db, auth } from '../lib/firebase';
import { doc, setDoc, collection, getDocs, writeBatch } from 'firebase/firestore';
import { deleteUser, signOut } from 'firebase/auth';
import { toast } from 'sonner';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

export default function SettingsPage() {
  const { profile, refreshProfile } = useAuth();
  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [grade, setGrade] = useState(profile?.grade || '');
  const [geminiApiKey, setGeminiApiKey] = useState(profile?.geminiApiKey || '');
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Sync form when profile loads from Firestore (profile starts null on mount)
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || '');
      setGrade(profile.grade || '');
      setGeminiApiKey(profile.geminiApiKey || '');
    }
  }, [profile]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const uid = profile?.uid || auth.currentUser?.uid;
    if (!uid) {
      toast.error('No hay sesión activa. Volvé a iniciar sesión.');
      return;
    }
    setLoading(true);
    const userRef = doc(db, 'users', uid);
    const path = `users/${uid}`;
    try {
      await setDoc(userRef, { displayName, grade, geminiApiKey, uid, email: auth.currentUser?.email || '' }, { merge: true });
      await refreshProfile();
      toast.success('Perfil actualizado correctamente');
    } catch (err: any) {
      console.error('Error guardando perfil:', err);
      toast.error('Error al guardar: ' + (err?.message || 'Verificá tu conexión y permisos de Firestore'));
    } finally {
      setLoading(false);
    }
  };

  const clearHistory = async () => {
    if (!confirm('¿Estás seguro de que quieres borrar todo tu historial de consultas y quizzes? Esta acción no se puede deshacer.')) return;
    
    setLoading(true);
    const path = `users/${profile!.uid}`;
    try {
      const batch = writeBatch(db);
      
      const historySnap = await getDocs(collection(db, 'users', profile!.uid, 'history'));
      historySnap.forEach(doc => batch.delete(doc.ref));
      
      const quizSnap = await getDocs(collection(db, 'users', profile!.uid, 'quizzes'));
      quizSnap.forEach(doc => batch.delete(doc.ref));
      
      await batch.commit();
      toast.success('Historial borrado con éxito');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      const user = auth.currentUser;
      if (user) {
        // First delete all data
        const batch = writeBatch(db);
        const historySnap = await getDocs(collection(db, 'users', profile!.uid, 'history'));
        historySnap.forEach(doc => batch.delete(doc.ref));
        const quizSnap = await getDocs(collection(db, 'users', profile!.uid, 'quizzes'));
        quizSnap.forEach(doc => batch.delete(doc.ref));
        batch.delete(doc(db, 'users', profile!.uid));
        await batch.commit();

        // Then delete auth user
        await deleteUser(user);
        toast.success('Cuenta eliminada con éxito');
      }
    } catch (err: any) {
      if (err.code === 'auth/requires-recent-login') {
        toast.error('Por seguridad, debes cerrar sesión e iniciarla de nuevo para eliminar tu cuenta.');
        await signOut(auth);
      } else {
        toast.error('Error al eliminar la cuenta');
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="p-4 max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500 relative">
      {/* Background decorations */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full pointer-events-none -z-10 opacity-40">
        <div className="absolute top-0 right-0 w-80 h-80 bg-rose-100/30 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-100/30 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-1/4 w-60 h-60 bg-amber-100/40 rounded-full blur-[100px]" />
      </div>

      <header className="flex flex-col items-center text-center gap-2 py-2 relative z-10">
        <div className="p-3 bg-indigo-600 rounded-2xl shadow-2xl shadow-indigo-200 rotate-6">
          <Settings className="h-6 w-6 text-white" />
        </div>
        <div className="space-y-1 mt-3">
          <h1 className="text-3xl font-black tracking-tighter text-slate-800 leading-none">
            Ajustes de Cuenta
          </h1>
          <p className="text-slate-400 font-bold text-[9px] uppercase tracking-[0.4em] mt-2">Gestiona tu identidad y datos</p>
        </div>
      </header>

      <div className="grid grid-cols-12 gap-5 relative z-10">
        {/* Profile Card */}
        <div className="col-span-12 lg:col-span-8 space-y-5">
          <Card className="border-none shadow-xl ring-1 ring-slate-100 rounded-[2rem] bg-white/80 backdrop-blur-md overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 w-full" />
            <CardHeader className="p-6 pb-2 text-center">
              <CardTitle className="text-lg font-black flex items-center justify-center gap-3">
                <div className="p-2 bg-indigo-50 rounded-lg">
                  <User className="h-5 w-5 text-indigo-600" />
                </div>
                Información del Perfil
              </CardTitle>
              <CardDescription className="font-bold text-slate-400 uppercase tracking-widest text-[8px] mt-1">Personaliza tu identidad académica</CardDescription>
            </CardHeader>
            <CardContent className="p-6 pt-4">
              <form onSubmit={handleUpdateProfile} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Nombre de Usuario</Label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                    <Input 
                      id="name" 
                      value={displayName} 
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="pl-11 font-bold h-11 rounded-xl bg-slate-50 border-slate-100 text-sm" 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Nivel Educativo</Label>
                  <Select onValueChange={setGrade} value={grade}>
                    <SelectTrigger className="font-bold h-11 rounded-xl bg-slate-50 border-slate-100 px-5 text-sm">
                      <SelectValue placeholder="Selecciona tu grado" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="Primaria">Primaria</SelectItem>
                      <SelectItem value="Secundaria">Secundaria</SelectItem>
                      <SelectItem value="Preparatoria">Preparatoria/Bachillerato</SelectItem>
                      <SelectItem value="Universidad">Universidad</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider pl-1 italic">
                    Gemini adaptará su lenguaje a este nivel.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="apiKey" className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Gemini API Key (Personal)</Label>
                  <div className="relative">
                    <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                    <Input 
                      id="apiKey" 
                      type="password"
                      value={geminiApiKey} 
                      onChange={(e) => setGeminiApiKey(e.target.value)}
                      placeholder="Introduce tu propia API Key de Gemini"
                      className="pl-11 font-bold h-11 rounded-xl bg-slate-50 border-slate-100 text-sm" 
                    />
                  </div>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider pl-1 italic">
                    Si se proporciona, se usará tu propia cuota para todas las interacciones. Mantén esta clave privada.
                  </p>
                </div>

                <Button type="submit" className="w-full font-black h-12 rounded-2xl text-sm shadow-xl shadow-indigo-100 flex items-center justify-center leading-none bg-indigo-600 hover:bg-slate-900" disabled={loading}>
                  <span className="flex items-center justify-center">
                    {loading ? 'Guardando...' : 'Guardar Cambios de Perfil'}
                  </span>
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl ring-1 ring-slate-100 rounded-[2rem] bg-white/80 backdrop-blur-md overflow-hidden">
            <CardHeader className="p-6 pb-2">
              <CardTitle className="text-sm font-black flex items-center gap-2 text-slate-400 uppercase tracking-[0.2em]">
                <ShieldCheck className="h-4 w-4" />
                Seguridad & Datos
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-4 space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                    <Mail className="h-4 w-4 text-slate-400" />
                  </div>
                  <div>
                    <p className="text-[8px] font-black uppercase tracking-wider text-slate-400">Email Cloud</p>
                    <p className="text-xs font-bold text-slate-700">{profile?.email}</p>
                  </div>
                </div>
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              
              <div className="p-6 rounded-[2rem] bg-slate-50/50 border border-slate-100 space-y-4 mt-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button 
                    variant="outline" 
                    className="flex-1 bg-white border-slate-200 text-slate-600 hover:bg-slate-50 font-black h-11 rounded-xl shadow-sm flex items-center justify-center leading-none text-xs"
                    onClick={clearHistory}
                    disabled={loading}
                  >
                    <span>Limpiar Historial</span>
                  </Button>
                  
                  <Dialog>
                    <DialogTrigger
                      render={
                        <Button variant="ghost" className="flex-1 font-black h-11 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center border border-dashed border-slate-200 leading-none text-xs">
                          <span>Eliminar Cuenta</span>
                        </Button>
                      }
                    />
                    <DialogContent className="sm:max-w-[400px] rounded-[2rem] p-8 border-none shadow-2xl">
                      <DialogHeader className="text-center">
                        <div className="mx-auto bg-red-50 p-3 rounded-full w-fit mb-3">
                          <Trash2 className="h-8 w-8 text-red-500" />
                        </div>
                        <DialogTitle className="text-xl font-black text-slate-800">
                          ¿Confirmas eliminación?
                        </DialogTitle>
                        <DialogDescription className="font-bold pt-1 text-slate-500 text-xs text-center">
                          Todos tus quizzes, reportes de IA y consultas se borrarán permanentemente del servidor.
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter className="pt-6 flex flex-col gap-2">
                        <Button variant="ghost" className="font-black w-full text-xs" disabled={deleting}>
                          No, quiero quedarme
                        </Button>
                        <Button 
                          variant="destructive" 
                          className="font-black w-full h-11 rounded-xl text-xs" 
                          onClick={handleDeleteAccount}
                          disabled={deleting}
                        >
                          {deleting ? 'Eliminando...' : 'Sí, borrar definitivamente'}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar help */}
        <div className="col-span-12 lg:col-span-4 h-full">
          <div className="p-6 bg-white/50 backdrop-blur-sm rounded-[2rem] border-2 border-dashed border-slate-200/60 flex flex-col items-center text-center justify-center h-full min-h-[250px] group transition-all hover:bg-white/80">
            <div className="p-4 bg-indigo-50 rounded-2xl mb-4 group-hover:rotate-12 transition-transform">
              <Settings className="h-8 w-8 text-indigo-300" />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] leading-loose max-w-[140px]">
              Personaliza tu entorno académico
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
