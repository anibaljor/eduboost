import { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../components/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { BookOpen, Send, Loader2, Upload, FileText, Trash2, Sparkles, Zap } from 'lucide-react';
import { db, auth } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { toast } from 'sonner';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { cn } from '@/lib/utils';

const subjects = [
  "Matemáticas", "Ciencias", "Historia", "Lengua y Literatura", "Geografía", "Inglés", "Fisica", "Quimica"
];

export default function Homework() {
  const { profile } = useAuth();
  const [message, setMessage] = useState('');
  const [subject, setSubject] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentResponse, setCurrentResponse] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const responseRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (currentResponse && responseRef.current) {
      responseRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [currentResponse]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !subject) {
      toast.error('Por favor selecciona una materia y escribe tu duda.');
      return;
    }

    setLoading(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
          ...(profile?.geminiApiKey ? { 'x-gemini-api-key': profile.geminiApiKey } : {})
        },
        body: JSON.stringify({
          message,
          grade: profile?.grade,
          subject
        }),
      });

      let data: any;
      try {
        data = await res.json();
      } catch {
        throw new Error('Error del servidor. Verificá que la API key de Gemini sea válida en Ajustes.');
      }

      if (!res.ok) {
        throw new Error(data.error || 'Error al procesar la consulta');
      }

      if (data.text) {
        setCurrentResponse(data.text);

        const uid = profile?.uid || auth.currentUser?.uid;
        if (uid) {
          const path = `users/${uid}/history`;
          try {
            await addDoc(collection(db, 'users', uid, 'history'), {
              userId: uid,
              subject,
              grade: profile?.grade || 'Secundaria',
              prompt: message,
              response: data.text,
              timestamp: serverTimestamp()
            });
          } catch (error) {
            handleFirestoreError(error, OperationType.CREATE, path);
          }
        }

        setMessage('');
        toast.success('Consulta procesada con éxito');
      }
    } catch (error: any) {
      toast.error(error.message || 'Ocurrió un error al consultar a la IA');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
      toast.info('Archivo adjuntado (Simulado: la IA analizará el texto pronto)');
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500">
      <header className="flex flex-col items-center text-center gap-2 py-2">
        <motion.div 
          initial={{ scale: 0.8, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          className="p-3 bg-indigo-600 rounded-2xl shadow-2xl shadow-indigo-200"
        >
          <BookOpen className="h-6 w-6 text-white" />
        </motion.div>
        <h1 className="text-3xl font-black tracking-tight text-slate-800">
          Tutor de Tareas IA
        </h1>
      </header>

      <div className="grid grid-cols-1 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border-none shadow-2xl rounded-[2rem] overflow-hidden bg-white ring-1 ring-slate-100 relative group">
            <div className="absolute top-0 right-0 w-96 h-96 bg-rose-100/20 rounded-full blur-[100px] -mr-48 -mt-48 transition-transform group-hover:scale-110 duration-700" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-sky-100/20 rounded-full blur-[100px] -ml-48 -mb-48 transition-transform group-hover:scale-110 duration-700" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-50/30 rounded-full blur-[100px] pointer-events-none" />
            
            <div className="h-2 bg-indigo-600 w-full" />
            
            <CardHeader className="px-8 pt-8 pb-2 relative z-10">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-indigo-500" />
                    <CardTitle className="text-2xl font-black text-slate-800 tracking-tight">Nueva Consulta</CardTitle>
                    <Zap className="w-5 h-5 text-amber-500" />
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="px-3 py-1.5 bg-indigo-50 rounded-xl border border-indigo-100 flex flex-col items-center">
                    <span className="text-[7px] font-black uppercase text-indigo-400 tracking-tighter">Tu Nivel</span>
                    <span className="text-xs font-black text-indigo-700">{profile?.grade}</span>
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="px-8 pb-8 pt-0 relative z-10">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-1 space-y-3">
                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] ml-1 flex items-center gap-1">
                      <BookOpen className="w-3 h-3" /> Materia
                    </Label>
                    <Select onValueChange={setSubject} value={subject}>
                      <SelectTrigger className="font-black rounded-2xl h-12 bg-slate-50/50 border-slate-100 px-6 text-slate-700 text-sm transition-all hover:bg-white hover:shadow-xl hover:ring-2 hover:ring-indigo-50">
                        <SelectValue placeholder="Materia" />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-none shadow-2xl">
                        {subjects.map(s => <SelectItem key={s} value={s} className="rounded-xl font-bold py-3 text-sm">{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="md:col-span-2 space-y-3">
                    <Label htmlFor="prompt" className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] ml-1 flex items-center gap-1">
                      ¿Qué quieres resolver hoy?
                    </Label>
                    <div className="relative group/text">
                      <textarea
                        id="prompt"
                        rows={3}
                        className="w-full rounded-[1.5rem] border-2 border-slate-50 bg-slate-50/50 px-6 py-4 text-sm ring-offset-background placeholder:text-slate-300 focus-visible:outline-none focus:ring-4 focus:ring-indigo-100/50 focus:border-indigo-200 focus:bg-white transition-all text-slate-700 shadow-inner resize-none"
                        placeholder="Escribe aquí tu duda escolar..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                      />
                      
                      <div className="absolute right-6 bottom-6 flex gap-3">
                        <input 
                          type="file" 
                          className="hidden" 
                          ref={fileInputRef}
                          onChange={handleFileChange}
                          accept=".pdf,.png,.jpg,.jpeg,.txt"
                        />
                        <motion.button 
                          type="button"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className={cn(
                            "h-12 w-12 flex items-center justify-center rounded-2xl bg-white border-2 border-slate-100 shadow-lg text-slate-400 hover:text-indigo-600 hover:border-indigo-100 transition-all",
                            file && "bg-indigo-600 text-white border-indigo-600 shadow-indigo-200"
                          )}
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <Upload className="h-6 w-6" />
                        </motion.button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row items-center gap-4">
                  {file && (
                    <motion.div 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center gap-3 text-xs font-black text-indigo-600 bg-indigo-50 p-4 rounded-2xl border border-indigo-100 flex-1 w-full"
                    >
                      <FileText className="h-5 w-5" />
                      <span className="truncate max-w-[300px]">{file.name}</span>
                      <button 
                        onClick={() => setFile(null)} 
                        className="ml-auto text-rose-500 hover:scale-110 transition-transform p-2 hover:bg-rose-50 rounded-xl"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </motion.div>
                  )}

                  <motion.div 
                    whileHover={{ scale: 1.01 }} 
                    whileTap={{ scale: 0.99 }}
                    className={cn("w-full transition-all", file ? "md:w-1/3" : "w-full")}
                  >
                    <Button 
                      type="submit" 
                      className="w-full font-black h-14 rounded-2xl text-lg shadow-2xl shadow-indigo-200 flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 border-none group" 
                      disabled={loading}
                    >
                      {loading ? (
                        <div className="flex items-center justify-center">
                          <Loader2 className="mr-3 h-6 w-6 animate-spin" />
                          <span>Pensando...</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-2">
                          <Send className="h-5 w-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                          <span>Obtener Respuesta</span>
                        </div>
                      )}
                    </Button>
                  </motion.div>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>

        {currentResponse && (
          <motion.div
            ref={responseRef}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', damping: 20 }}
          >
            <Card className="border-none shadow-2xl rounded-[2rem] overflow-hidden bg-white ring-1 ring-slate-100">
              <div className="h-2 bg-indigo-600 w-full" />
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-10 text-center">
                <div className="flex flex-col items-center justify-center gap-4">
                  <div className="p-4 bg-indigo-100 rounded-2xl shadow-inner">
                    <BookOpen className="h-8 w-8 text-indigo-600" />
                  </div>
                  <CardTitle className="text-3xl font-black text-slate-800 tracking-tight">Explicación Paso a Paso</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-10">
                <div className="prose prose-slate max-w-none prose-p:font-medium prose-h1:font-black prose-h2:font-black prose-h3:font-black prose-p:text-slate-700 prose-li:text-slate-700 leading-loose text-lg">
                  <ReactMarkdown 
                    remarkPlugins={[remarkMath]} 
                    rehypePlugins={[rehypeKatex]}
                  >
                    {currentResponse}
                  </ReactMarkdown>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}
