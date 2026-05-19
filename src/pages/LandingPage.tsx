import { useState } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup 
} from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { GraduationCap, Mail, Lock, History, BarChart, BookOpen } from 'lucide-react';
import { toast } from 'sonner';

export default function LandingPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        toast.success('¡Bienvenido de nuevo!');
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
        toast.success('Cuenta creada con éxito');
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      toast.success('¡Sesión iniciada con Google!');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      {/* Left side: Hero & Features */}
      <div className="hidden lg:flex flex-col justify-center p-12 bg-primary text-primary-foreground">
        <div className="max-w-xl mx-auto space-y-8">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm">
              <GraduationCap className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-4xl font-black tracking-tight italic">EduBoost AI</h1>
          </div>
          
          <div className="space-y-4">
            <h2 className="text-6xl font-black leading-tight tracking-tighter">
              Tu futuro académico,<br />
              <span className="text-secondary-foreground opacity-90">potenciado por IA.</span>
            </h2>
            <p className="text-xl opacity-80 font-medium max-w-lg leading-relaxed">
              La plataforma integral que te ayuda a estudiar más inteligente, no más difícil. Todo en un solo lugar.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 pt-12">
            {[
              { icon: BookOpen, title: 'Tutor Personalizado', desc: 'Resuelve tus dudas en tiempo real con IA.' },
              { icon: History, title: 'Historial Académico', desc: 'Guarda todas tus consultas organizadas por materias.' },
              { icon: BarChart, title: 'Stats & Reportes', desc: 'Analizamos tu progreso para que mejores día a día.' }
            ].map((f, i) => (
              <div key={i} className="flex gap-4 items-start bg-white/5 p-4 rounded-xl backdrop-blur-sm border border-white/10">
                <div className="bg-white/10 p-2 rounded-lg">
                  <f.icon className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">{f.title}</h3>
                  <p className="text-sm opacity-70 font-medium">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right side: Auth Form */}
      <div className="flex items-center justify-center p-6 bg-muted/30">
        <Card className="w-full max-w-md shadow-2xl border-none ring-1 ring-black/5">
          <CardHeader className="space-y-2 text-center">
            <div className="lg:hidden flex justify-center mb-4">
              <GraduationCap className="h-12 w-12 text-primary" />
            </div>
            <CardTitle className="text-3xl font-black tracking-tight">
              {isLogin ? '¡Hola otra vez!' : 'Únete a EduBoost'}
            </CardTitle>
            <CardDescription className="text-base font-medium">
              {isLogin ? 'Introduce tus credenciales para continuar' : 'Crea tu cuenta gratis hoy mismo'}
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="estudiante@ejemplo.com" 
                    className="pl-10"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="password" 
                    type="password" 
                    placeholder="••••••••" 
                    className="pl-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required 
                  />
                </div>
              </div>
              <Button type="submit" className="w-full font-bold h-11 text-base" disabled={loading}>
                {loading ? 'Procesando...' : (isLogin ? 'Iniciar Sesión' : 'Registrarse')}
              </Button>
              
              <div className="relative py-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground font-bold tracking-wider">o continuar con</span>
                </div>
              </div>
              
              <Button 
                variant="outline" 
                type="button" 
                onClick={signInWithGoogle}
                className="w-full font-bold h-11"
              >
                <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4 mr-2" />
                Google
              </Button>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4 pt-2">
              <p className="text-sm text-center font-medium text-muted-foreground">
                {isLogin ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}
                {' '}
                <button 
                  type="button" 
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-primary hover:underline font-bold"
                >
                  {isLogin ? 'Regístrate' : 'Inicia sesión'}
                </button>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
