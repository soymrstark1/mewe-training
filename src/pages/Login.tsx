import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { useAcademyBrand } from '@/hooks/useAcademyBrand';
import defaultLogo from '@/assets/mewe-logo.png';

type Mode = 'login' | 'signup' | 'access-code' | 'teacher-signup';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [brandName2, setBrandName2] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [mode, setMode] = useState<Mode>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('modo') === 'maestro' ? 'teacher-signup' : 'login';
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { brandName, subtitle, logoUrl } = useAcademyBrand();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error?.message?.includes('refresh_token_not_found')) {
        supabase.auth.signOut();
      }
      if (session) navigate('/dashboard');
    });
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) toast.error(error.message);
    else navigate('/dashboard');
    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin, data: { name: name || email } },
    });
    if (error) toast.error(error.message);
    else {
      toast.success('Cuenta creada exitosamente');
      navigate('/dashboard');
    }
    setLoading(false);
  };

  const handleTeacherSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (!name.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }
    setLoading(true);

    // First try to sign up
    const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });

    if (signUpErr) {
      toast.error(signUpErr.message);
      setLoading(false);
      return;
    }

    if (signUpData.user) {
      // Insert teacher request
      await supabase.from('teacher_requests').insert({
        auth_user_id: signUpData.user.id,
        name: name.trim(),
        email,
        brand_name: brandName2.trim() || name.trim(),
        status: 'pending',
      });

      toast.success('¡Solicitud enviada! Un administrador la revisará pronto. Mientras tanto puedes acceder como alumno.');
      navigate('/dashboard');
    }
    setLoading(false);
  };

  const handleAccessCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessCode || !email || !password || !name) {
      toast.error('Completa todos los campos');
      return;
    }
    setLoading(true);

    // First check if it's an academy code
    const { data: academyMatch } = await supabase
      .from('academies')
      .select('id, name')
      .eq('access_code', accessCode.trim().toLowerCase())
      .eq('is_active', true)
      .maybeSingle();

    if (academyMatch) {
      // Sign up the student
      const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
        email, password, options: { data: { name } },
      });
      if (signUpErr) { toast.error(signUpErr.message); setLoading(false); return; }
      if (signUpData.user) {
        // Enroll in academy
        await supabase.from('academy_students').insert({
          academy_id: academyMatch.id,
          student_auth_user_id: signUpData.user.id,
        });
        // Auto-enroll in all academy teachers
        const { data: acTeachers } = await supabase.from('academy_teachers').select('teacher_id').eq('academy_id', academyMatch.id).eq('is_active', true);
        if (acTeachers && acTeachers.length > 0) {
          const enrollments = acTeachers.map(at => ({ teacher_id: at.teacher_id, student_auth_user_id: signUpData.user!.id }));
          await supabase.from('teacher_students').upsert(enrollments, { onConflict: 'teacher_id,student_auth_user_id' } as any);
        }
        toast.success(`¡Inscripción exitosa en ${academyMatch.name}!`);
        navigate('/dashboard');
      }
      setLoading(false);
      return;
    }

    // Find teacher by access code
    const { data: teacher, error: teacherErr } = await supabase
      .from('teachers')
      .select('id')
      .eq('access_code', accessCode)
      .eq('is_active', true)
      .maybeSingle();

    if (teacherErr || !teacher) {
      toast.error('Código de acceso inválido');
      setLoading(false);
      return;
    }

    // Sign up the student
    const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });

    if (signUpErr) {
      toast.error(signUpErr.message);
      setLoading(false);
      return;
    }

    if (signUpData.user) {
      // Enroll with teacher
      await supabase.from('teacher_students').insert({
        teacher_id: teacher.id,
        student_auth_user_id: signUpData.user.id,
      });
      toast.success('¡Inscripción exitosa!');
      navigate('/dashboard');
    }
    setLoading(false);
  };

  const modeConfig = {
    login: { title: 'Iniciar Sesión', handler: handleLogin },
    signup: { title: 'Crear Cuenta', handler: handleSignUp },
    'access-code': { title: 'Registrarse con Código', handler: handleAccessCode },
    'teacher-signup': { title: 'Registrarse como Maestro', handler: handleTeacherSignUp },
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <img src={logoUrl || defaultLogo} alt="Logo" className="mx-auto mb-3 h-16 w-auto object-contain" />
          <CardTitle className="text-2xl">The Academy 🎓</CardTitle>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
          {brandName && (
            <p className="text-sm text-muted-foreground">by {brandName}</p>
          )}
          <p className="mt-3 text-lg font-medium text-foreground">
            {modeConfig[mode].title}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={modeConfig[mode].handler} className="space-y-4">
            {mode === 'teacher-signup' && (
              <>
                <Input
                  placeholder="Tu nombre"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                />
                <Input
                  placeholder='Nombre de marca (aparece debajo del logo)'
                  value={brandName2}
                  onChange={e => setBrandName2(e.target.value)}
                />
              </>
            )}
            {mode === 'access-code' && (
              <>
                <Input
                  placeholder="Código de acceso del maestro"
                  value={accessCode}
                  onChange={e => setAccessCode(e.target.value)}
                  required
                  className="text-center font-mono text-lg tracking-wider"
                />
                <Input
                  placeholder="Tu nombre"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                />
              </>
            )}
            {mode === 'signup' && (
              <Input
                placeholder="Tu nombre"
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            )}
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
            <Input
              type="password"
              placeholder="Contraseña (mín. 6 caracteres)"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
            />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Cargando...' : modeConfig[mode].title}
            </Button>
          </form>

          <div className="mt-4 space-y-2 text-center text-sm text-muted-foreground">
            {mode === 'login' && (
              <>
                <p>
                  ¿No tienes cuenta?{' '}
                  <button type="button" className="text-primary hover:underline" onClick={() => setMode('signup')}>
                    Crear Cuenta
                  </button>
                </p>
                <p>
                  ¿Tienes un código de acceso?{' '}
                  <button type="button" className="text-primary hover:underline" onClick={() => setMode('access-code')}>
                    Registrarse con Código
                  </button>
                </p>
                <p>
                  ¿Eres maestro?{' '}
                  <button type="button" className="text-primary hover:underline" onClick={() => setMode('teacher-signup')}>
                    Registrarse como Maestro
                  </button>
                </p>
              </>
            )}
            {mode === 'signup' && (
              <p>
                ¿Ya tienes cuenta?{' '}
                <button type="button" className="text-primary hover:underline" onClick={() => setMode('login')}>
                  Iniciar Sesión
                </button>
              </p>
            )}
            {(mode === 'access-code' || mode === 'teacher-signup') && (
              <p>
                <button type="button" className="text-primary hover:underline" onClick={() => setMode('login')}>
                  Volver a Iniciar Sesión
                </button>
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
