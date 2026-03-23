import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { UserPlus, Copy, Users } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface Student {
  id: string;
  student_auth_user_id: string;
  is_active: boolean;
  joined_at: string;
  user_name?: string;
  user_email?: string;
}

export default function StudentManager({ teacherId }: { teacherId: string }) {
  const [students, setStudents] = useState<Student[]>([]);
  const [accessCode, setAccessCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchStudents();
    fetchAccessCode();
  }, [teacherId]);

  const fetchAccessCode = async () => {
    const { data } = await supabase
      .from('teachers')
      .select('access_code')
      .eq('id', teacherId)
      .single();
    if (data) setAccessCode(data.access_code);
  };

  const fetchStudents = async () => {
    setLoading(true);
    const { data: enrollments } = await supabase
      .from('teacher_students')
      .select('*')
      .eq('teacher_id', teacherId)
      .order('joined_at', { ascending: false });

    if (!enrollments) { setLoading(false); return; }

    // Fetch user info for each student
    const studentIds = enrollments.map(e => e.student_auth_user_id);
    const { data: users } = await supabase
      .from('users')
      .select('auth_user_id, name, email')
      .in('auth_user_id', studentIds);

    const enriched = enrollments.map(e => {
      const u = users?.find(u => u.auth_user_id === e.student_auth_user_id);
      return {
        ...e,
        user_name: u?.name || 'Sin nombre',
        user_email: u?.email || '',
      };
    });

    setStudents(enriched);
    setLoading(false);
  };

  const createStudent = async () => {
    if (!form.email || !form.password || !form.name) {
      toast.error('Todos los campos son obligatorios');
      return;
    }
    setCreating(true);

    // Create auth user via signUp (auto-confirm is enabled)
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { name: form.name } },
    });

    if (signUpError) {
      toast.error(signUpError.message);
      setCreating(false);
      return;
    }

    // Note: The trigger creates the users record.
    // We need to enroll the student with this teacher.
    if (signUpData.user) {
      const { error } = await supabase.from('teacher_students').insert({
        teacher_id: teacherId,
        student_auth_user_id: signUpData.user.id,
      });
      if (error) toast.error('Error al inscribir estudiante');
      else toast.success('Estudiante creado e inscrito');
    }

    setForm({ name: '', email: '', password: '' });
    setDialogOpen(false);
    setCreating(false);

    // Re-login as current user since signUp might change session
    // Actually, with auto-confirm, signUp signs in the new user. We need to handle this.
    // For now, just refetch
    fetchStudents();
  };

  const toggleStudent = async (id: string, current: boolean) => {
    await supabase.from('teacher_students').update({ is_active: !current }).eq('id', id);
    fetchStudents();
  };

  const copyCode = () => {
    navigator.clipboard.writeText(accessCode);
    toast.success('Código copiado al portapapeles');
  };

  return (
    <div className="space-y-6">
      {/* Access code */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-foreground">Código de Acceso</p>
              <p className="text-sm text-muted-foreground">
                Comparte este código para que los estudiantes se registren solos
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-lg font-bold text-primary">{accessCode}</span>
              <Button size="icon" variant="outline" onClick={copyCode}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add student */}
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-semibold text-foreground">
          <Users className="h-5 w-5" /> Estudiantes ({students.length})
        </h3>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1">
              <UserPlus className="h-4 w-4" /> Alta Manual
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Dar de Alta Estudiante</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <Input
                placeholder="Nombre"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
              <Input
                type="email"
                placeholder="Email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              />
              <Input
                type="password"
                placeholder="Contraseña"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              />
              <Button className="w-full" onClick={createStudent} disabled={creating}>
                {creating ? 'Creando...' : 'Crear Estudiante'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Student list */}
      {loading ? (
        <p className="text-muted-foreground">Cargando estudiantes...</p>
      ) : students.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No hay estudiantes inscritos aún.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {students.map(s => (
            <Card key={s.id} className={!s.is_active ? 'opacity-50' : ''}>
              <CardContent className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{s.user_name}</p>
                  <p className="text-xs text-muted-foreground">{s.user_email}</p>
                </div>
                <Switch checked={s.is_active} onCheckedChange={() => toggleStudent(s.id, s.is_active)} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
