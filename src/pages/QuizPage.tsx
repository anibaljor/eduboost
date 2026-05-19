import { useState } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../components/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Progress } from '../components/ui/progress';
import { ClipboardList, Loader2, CheckCircle2, XCircle, Trophy, ArrowRight, RefreshCcw, Zap, Sparkles } from 'lucide-react';
import { db, auth } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { cn } from '@/lib/utils';

interface Question {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

interface Quiz {
  title: string;
  questions: Question[];
}

export default function QuizPage() {
  const { profile } = useAuth();
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('Media');
  const [questionCount, setQuestionCount] = useState('5');
  const [loading, setLoading] = useState(false);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [showResult, setShowResult] = useState(false);

  const generateQuiz = async () => {
    if (!topic) {
      toast.error('Por favor ingresa un tema para el quiz');
      return;
    }
    setLoading(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/generate-quiz', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
          ...(profile?.geminiApiKey ? { 'x-gemini-api-key': profile.geminiApiKey } : {})
        },
        body: JSON.stringify({ topic, difficulty, questionCount, grade: profile?.grade }),
      });
      let data: any;
      try {
        data = await res.json();
      } catch {
        throw new Error('Error del servidor. Verificá que la API key de Gemini sea válida en Ajustes.');
      }

      if (!res.ok) {
        throw new Error(data.error || 'Error al generar el quiz');
      }

      setQuiz(data);
      setCurrentIdx(0);
      setAnswers([]);
      setShowResult(false);
      toast.success('¡Quiz generado con éxito!');
    } catch (err: any) {
      toast.error(err.message || 'Error al generar el quiz');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (idx: number) => {
    const newAnswers = [...answers];
    newAnswers[currentIdx] = idx;
    setAnswers(newAnswers);
  };

  const nextQuestion = () => {
    if (currentIdx < (quiz?.questions.length || 0) - 1) {
      setCurrentIdx(currentIdx + 1);
    } else {
      finishQuiz();
    }
  };

  const finishQuiz = async () => {
    const score = quiz!.questions.reduce((acc, q, i) => {
      return acc + (answers[i] === q.correctAnswer ? 1 : 0);
    }, 0);
    
    const finalScore = (score / quiz!.questions.length) * 100;
    
    setShowResult(true);
    
    // Save to Firestore
    try {
      const path = `users/${profile!.uid}/quizzes`;
      await addDoc(collection(db, 'users', profile!.uid, 'quizzes'), {
        userId: profile!.uid,
        title: quiz!.title,
        topic,
        difficulty,
        questions: quiz!.questions,
        score: finalScore,
        completed: true,
        timestamp: serverTimestamp()
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, `users/${profile!.uid}/quizzes`);
    }
  };

  if (loading) {
    return (
      <div className="h-[80vh] flex flex-col items-center justify-center space-y-6">
        <div className="relative">
          <div className="h-24 w-24 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
          <ClipboardList className="absolute inset-0 m-auto h-8 w-8 text-primary" />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-black italic">Generando tu Quiz...</h2>
          <p className="text-muted-foreground font-medium italic">Gemini está redactando preguntas desafiantes para ti.</p>
        </div>
      </div>
    );
  }

  if (showResult && quiz) {
    const score = quiz.questions.reduce((acc, q, i) => acc + (answers[i] === q.correctAnswer ? 1 : 0), 0);
    const finalScore = (score / quiz.questions.length) * 100;

    return (
      <div className="p-8 max-w-4xl mx-auto space-y-8 animate-in zoom-in-95 duration-500 relative">
        {/* Background decorations */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full pointer-events-none -z-10 opacity-40">
          <div className="absolute top-0 right-0 w-80 h-80 bg-rose-100/30 rounded-full blur-[100px]" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-100/30 rounded-full blur-[100px]" />
        </div>

        <Card className="border-none shadow-2xl rounded-[2.5rem] overflow-hidden bg-white/80 backdrop-blur-sm ring-1 ring-slate-100 relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-100/20 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none" />
          <div className="h-3 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 w-full relative z-10" />
          <CardHeader className="text-center space-y-4 pt-12 relative z-10">
            <div className="mx-auto bg-indigo-600 w-24 h-24 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-indigo-200 rotate-6">
              <Trophy className="h-12 w-12 text-white" />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-4xl font-black tracking-tight text-slate-800">{quiz.title}</CardTitle>
              <CardDescription className="text-xs font-black uppercase tracking-[0.2em] text-indigo-500">¡Reto Académico Superado!</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-10 p-12 relative z-10">
            <div className="bg-slate-50/50 rounded-[3rem] p-10 text-center border-2 border-dashed border-slate-100">
              <div className="text-8xl font-black text-indigo-600 tracking-tighter mb-2">
                {Math.round(finalScore)}%
              </div>
              <p className="text-slate-400 font-bold text-sm">Puntuación Final</p>
              <div className="mt-8 flex justify-center gap-4">
                <div className="px-6 py-3 bg-emerald-50 rounded-2xl border border-emerald-100">
                  <span className="block text-2xl font-black text-emerald-600">{score}</span>
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Correctas</span>
                </div>
                <div className="px-6 py-3 bg-rose-50 rounded-2xl border border-rose-100">
                  <span className="block text-2xl font-black text-rose-600">{quiz.questions.length - score}</span>
                  <span className="text-[10px] font-bold text-rose-400 uppercase tracking-widest">Incorrectas</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100/50 flex flex-col items-center">
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2">Máximo Acierto</p>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  <p className="text-4xl font-black text-slate-800 tracking-tighter">{score}</p>
                </div>
              </div>
              <div className="bg-rose-50 p-6 rounded-3xl border border-rose-100/50 flex flex-col items-center">
                <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest mb-2">Área de Mejora</p>
                <div className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-rose-500" />
                  <p className="text-4xl font-black text-slate-800 tracking-tighter">{quiz.questions.length - score}</p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="font-black text-xl tracking-tight text-slate-800 flex items-center gap-3">
                <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                  <Zap className="h-4 w-4 text-amber-600" />
                </div>
                Análisis Post-Quiz
              </h3>
              <div className="space-y-4">
                {quiz.questions.map((q, i) => (
                  <div key={i} className="p-6 rounded-[2rem] border border-slate-100 bg-white/50 shadow-sm relative overflow-hidden group transition-all hover:shadow-md">
                    <div className={cn(
                      "absolute top-0 left-0 w-2 h-full transition-colors",
                      answers[i] === q.correctAnswer ? "bg-emerald-400" : "bg-rose-400"
                    )} />
                    <div className="flex items-start gap-4">
                      {answers[i] === q.correctAnswer ? (
                        <div className="h-10 w-10 rounded-2xl bg-emerald-50 flex items-center justify-center shrink-0 shadow-sm">
                          <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                        </div>
                      ) : (
                        <div className="h-10 w-10 rounded-2xl bg-rose-50 flex items-center justify-center shrink-0 shadow-sm">
                          <XCircle className="h-6 w-6 text-rose-500" />
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="font-bold text-slate-800 text-base leading-relaxed">
                          <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                            {q.question}
                          </ReactMarkdown>
                        </div>
                        <div className="mt-4 p-4 rounded-2xl bg-slate-50/50 text-xs font-medium text-slate-600 leading-relaxed border border-slate-100 relative group-hover:bg-white transition-colors">
                          <span className="font-black text-indigo-600 uppercase tracking-wider block mb-2 text-[10px]">Dato Correcto:</span>
                          <div className="text-slate-800 font-bold">
                            <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                              {q.options[q.correctAnswer]}
                            </ReactMarkdown>
                          </div>
                        </div>
                        <div className="mt-4 text-[10px] text-slate-400 italic font-bold flex items-start gap-2 bg-amber-50/30 p-3 rounded-xl border border-amber-100/50">
                          <Zap className="h-3 w-3 text-amber-500 shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <span className="text-amber-600 uppercase tracking-widest mr-2">Concepto:</span>
                            <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                              {q.explanation}
                            </ReactMarkdown>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
          <CardFooter className="bg-slate-50 p-8 flex gap-4 border-t border-slate-100">
            <Button variant="outline" className="flex-1 font-black h-14 rounded-2xl border-slate-200 bg-white flex items-center justify-center leading-none" onClick={() => setQuiz(null)}>
              Finalizar Sesión
            </Button>
            <Button className="flex-1 font-black h-14 rounded-2xl shadow-lg shadow-indigo-100 flex items-center justify-center leading-none" onClick={generateQuiz}>
              <RefreshCcw className="h-5 w-5 mr-3" /> 
              Nuevo Quiz IA
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (quiz) {
    const q = quiz.questions[currentIdx];
    const progress = ((currentIdx + 1) / quiz.questions.length) * 100;

    return (
      <div className="p-8 max-w-4xl mx-auto space-y-8 animate-in slide-in-from-right-4 duration-500 relative">
        {/* Background decorations */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full pointer-events-none -z-10 opacity-30">
          <div className="absolute top-0 left-0 w-80 h-80 bg-indigo-100/30 rounded-full blur-[100px]" />
          <div className="absolute bottom-0 right-0 w-80 h-80 bg-purple-100/30 rounded-full blur-[100px]" />
        </div>

        <div className="space-y-6 relative z-10">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="space-y-2">
              <h2 className="text-3xl font-black tracking-tight text-slate-800 drop-shadow-sm">{quiz.title}</h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">
                Pregunta {currentIdx + 1} de {quiz.questions.length}
              </p>
            </div>
            <div className="text-[9px] font-black text-indigo-600 bg-indigo-50/80 backdrop-blur-sm px-6 py-2 rounded-full uppercase tracking-widest border border-indigo-100 shadow-sm">
              Nivel: {difficulty}
            </div>
          </div>
          <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden p-1 shadow-inner ring-1 ring-slate-200">
             <motion.div 
               initial={{ width: 0 }}
               animate={{ width: `${progress}%` }}
               className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full shadow-lg" 
             />
          </div>
        </div>

        <Card className="border-none shadow-2xl rounded-[2.5rem] bg-white ring-1 ring-slate-100 overflow-hidden relative">
          <div className="h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 w-full" />
          <CardContent className="p-12 space-y-10">
            <div className="text-3xl font-black text-slate-800 leading-[1.3] text-center max-w-lg mx-auto">
              <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                {q.question}
              </ReactMarkdown>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {q.options.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => handleAnswer(i)}
                  className={cn(
                    "group relative flex items-center gap-5 p-6 rounded-[1.5rem] border-2 text-left transition-all font-bold text-sm",
                    answers[currentIdx] === i 
                      ? "bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-200 scale-[1.02]" 
                      : "bg-white border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/30 text-slate-700"
                  )}
                >
                  <div className={cn(
                    "h-10 w-10 rounded-2xl flex items-center justify-center font-black text-xs shrink-0 transition-colors shadow-sm",
                    answers[currentIdx] === i ? "bg-white text-indigo-600" : "bg-slate-50 text-slate-400 group-hover:bg-white"
                  )}>
                    {String.fromCharCode(65 + i)}
                  </div>
                  <div className="flex-1">
                    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                      {opt}
                    </ReactMarkdown>
                  </div>
                  {answers[currentIdx] === i && (
                    <div className="h-2 w-2 rounded-full bg-white animate-pulse" />
                  )}
                </button>
              ))}
            </div>
          </CardContent>
          <CardFooter className="p-8 border-t border-slate-100 bg-slate-50/50">
            <Button 
              className="ml-auto font-black h-14 px-10 rounded-2xl shadow-lg shadow-indigo-100 text-lg transition-all active:scale-95 flex items-center justify-center leading-none" 
              onClick={nextQuestion}
              disabled={answers[currentIdx] === undefined}
            >
              <span className="flex items-center">
                {currentIdx === quiz.questions.length - 1 ? 'Finalizar Quiz' : 'Continuar'}
                <ArrowRight className="h-5 w-5 ml-3" />
              </span>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-4 animate-in fade-in duration-500 relative">
      {/* Background decorations */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full pointer-events-none -z-10 opacity-40">
        <div className="absolute top-0 right-0 w-80 h-80 bg-rose-100/30 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-sky-100/30 rounded-full blur-[100px]" />
      </div>

      <header className="flex flex-col items-center text-center gap-2 py-2 relative z-10">
        <div className="p-3 bg-indigo-600 rounded-2xl shadow-2xl shadow-indigo-200 text-white rotate-3">
          <ClipboardList className="h-7 w-7" />
        </div>
        <div className="space-y-1 mt-2">
          <h1 className="text-4xl font-black tracking-tighter text-slate-800 leading-none">
            Crea tu nuevo quiz
          </h1>
        </div>
      </header>

      <Card className="border-none shadow-xl ring-1 ring-slate-100 rounded-[2rem] overflow-hidden bg-white/80 backdrop-blur-md relative z-10">
        <div className="h-2 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 w-full" />
        <CardContent className="p-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="topic" className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Tema del Quiz</Label>
            <Input 
              id="topic" 
              placeholder="Ej: Segunda Guerra Mundial, Cálculo Integral..." 
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="font-bold h-12 rounded-xl bg-slate-50 border-slate-100 px-5 text-base focus:ring-indigo-100 placeholder:text-slate-300"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Dificultad</Label>
              <Select onValueChange={setDifficulty} value={difficulty}>
                <SelectTrigger className="font-bold h-11 rounded-xl bg-slate-50 border-slate-100 px-4 text-sm">
                  <SelectValue placeholder="Dificultad" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="Fácil">Fácil</SelectItem>
                  <SelectItem value="Media">Media</SelectItem>
                  <SelectItem value="Difícil">Difícil</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Cantidad</Label>
              <Select onValueChange={setQuestionCount} value={questionCount}>
                <SelectTrigger className="font-bold h-11 rounded-xl bg-slate-50 border-slate-100 px-4 text-sm">
                  <SelectValue placeholder="Cantidad" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="5">5 preguntas</SelectItem>
                  <SelectItem value="10">10 preguntas</SelectItem>
                  <SelectItem value="15">15 preguntas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="pt-2">
            <Button 
              className="w-full font-black h-16 rounded-2xl text-lg shadow-2xl shadow-indigo-200 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center leading-none bg-indigo-600 hover:bg-slate-900 group" 
              onClick={generateQuiz}
            >
              <Sparkles className="mr-3 h-5 w-5 text-indigo-300 group-hover:animate-pulse" />
              <span>Generar con Inteligencia Artificial</span>
              <ArrowRight className="ml-3 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <div className="mt-8 flex items-center justify-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-[10px] text-slate-400 uppercase font-black tracking-[0.3em]">
                Optimizado para {profile?.grade || 'tu nivel'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
