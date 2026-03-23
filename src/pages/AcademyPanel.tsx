import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { ArrowLeft, Copy, Users, GraduationCap, BarChart3, Settings, Plus, Trash2, BookOpen, Pencil, Camera, UserPlus } from 'lucide-react';
import ClassManager from '@/components/teacher/ClassManager';
import StudentProgressView from '@/components/teacher/StudentProgressView';
import { useAcademyBrand } from '@/hooks/useAcademyBrand';
import defaultLogo from '@/assets/mewe-logo.png';

interface Academy {
  id: string;
  name: string;
  logo_url: string | null;
  access_code: string;
  is_active: boolean;
}

interface AcademyTeacher {
  id: string;
  teacher_id: string;
  is_active: boolean;
  teacher_name: string;
  teacher_brand: string;
  teacher_avatar: string | null;
}

interface AcademyStudent {
  id: string;
  student_auth_user_id: string;
  is_active: boolean;
  joined_at: string;
  student_name?: string;
  student_email?: string;
}

export default function AcademyPanel() {
  const [loading, setLoading] = useState(true);
  const [academy, setAcademy] = useState<Academy | null>(null);
  const [teachers, setTeachers] = useState<AcademyTeacher[]>([]);
  const [students, setStudents] = useState<AcademyStudent[]>([]);
  const [activeTab, setActiveTab] = useState('teachers');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);
  const [addTeacherCode, setAddTeacherCode] = useState('');
  const [addingTeacher, setAddingTeacher] = useState(false);
  const [showAddTeacher, setShowAddTeacher] = useState(false);
  const [editName, setEditName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const navigate = useNavigate();
  const { logoUrl } = useAcademyBrand();

  // Create teacher state
  const [showCreateTeacher, setShowCreateTeacher] = useState(false);
  const [creatingTeacher, setCreatingTeacher] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', brand_name: '' });

  // Edit teacher state
  const [editingTeacher, setEditingTeacher] = useState<AcademyTeacher | null>(null);
  const [editTeacherForm, setEditTeacherForm] = useState({ name: '', brand_name: '' });
  const [savingTeacher, setSavingTeacher] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/login'); return; }

      // Check academy role
      const { data: roles } = await supabase.from('user_roles').select('role').eq('user_id', user.id);
      const hasAcademyRole = roles?.some(r => r.role === 'academy');
      if (!hasAcademyRole) { navigate('/dashboard'); return; }

      // Get academy
      const { data: academyData } = await supabase
        .from('academies')
        .select('*')
        .eq('admin_user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (!academyData) {
        // Create academy automatically
        const { data: userData } = await supabase.from('users').select('name').eq('auth_user_id', user.id).maybeSingle();
        const { data: newAcademy } = await supabase
          .from('academies')
          .insert({ name: userData?.name || 'Mi Academia', admin_user_id: user.id })
          .select()
          .single();
        if (newAcademy) {
          setAcademy(newAcademy);
          setEditName(newAcademy.name);
        }
      } else {
        setAcademy(academyData);
        setEditName(academyData.name);
      }
      setLoading(false);
    };
    init();
  }, [navigate]);

  useEffect(() => {
    if (academy) {
      fetchTeachers();
      fetchStudents();
    }
  }, [academy?.id]);

  const fetchTeachers = async () => {
    if (!academy) return;
    const { data } = await supabase
      .from('academy_teachers')
      .select('id, teacher_id, is_active')
      .eq('academy_id', academy.id);
    if (!data || data.length === 0) { setTeachers([]); return; }

    const teacherIds = data.map(d => d.teacher_id);
    const { data: teacherData } = await supabase
      .from('teachers')
      .select('id, name, brand_name, avatar_url')
      .in('id', teacherIds);

    setTeachers(data.map(at => {
      const t = teacherData?.find(td => td.id === at.teacher_id);
      return {
        ...at,
        teacher_name: t?.name || '',
        teacher_brand: t?.brand_name || '',
        teacher_avatar: t?.avatar_url || null,
      };
    }));
  };

  const fetchStudents = async () => {
    if (!academy) return;
    const { data } = await supabase
      .from('academy_students')
      .select('id, student_auth_user_id, is_active, joined_at')
      .eq('academy_id', academy.id);
    if (!data || data.length === 0) { setStudents([]); return; }

    const userIds = data.map(d => d.student_auth_user_id);
    const { data: userData } = await supabase
      .from('users')
      .select('auth_user_id, name, email')
      .in('auth_user_id', userIds);

    setStudents(data.map(s => {
      const u = userData?.find(ud => ud.auth_user_id === s.student_auth_user_id);
      return { ...s, student_name: u?.name, student_email: u?.email };
    }));
  };

  const handleAddTeacher = async () => {
    if (!academy || !addTeacherCode.trim()) return;
    setAddingTeacher(true);

    const { data: teacher } = await supabase
      .from('teachers')
      .select('id, name, brand_name')
      .eq('access_code', addTeacherCode.trim().toLowerCase())
      .eq('is_active', true)
      .maybeSingle();

    if (!teacher) {
      toast.error('No se encontró un maestro con ese código');
      setAddingTeacher(false);
      return;
    }

    const existing = teachers.find(t => t.teacher_id === teacher.id);
    if (existing) {
      toast.error('Este maestro ya está en la academia');
      setAddingTeacher(false);
      return;
    }

    const { error } = await supabase.from('academy_teachers').insert({
      academy_id: academy.id,
      teacher_id: teacher.id,
    });

    if (error) {
      toast.error('Error al agregar maestro');
    } else {
      toast.success(`${teacher.brand_name || teacher.name} agregado a la academia`);
      setAddTeacherCode('');
      setShowAddTeacher(false);
      // Auto-enroll existing academy students with this teacher
      if (students.length > 0) {
        const enrollments = students
          .filter(s => s.is_active)
          .map(s => ({
            teacher_id: teacher.id,
            student_auth_user_id: s.student_auth_user_id,
          }));
        if (enrollments.length > 0) {
          await supabase.from('teacher_students').upsert(enrollments, { onConflict: 'teacher_id,student_auth_user_id' }).select();
        }
      }
      fetchTeachers();
    }
    setAddingTeacher(false);
  };

  const createTeacher = async () => {
    if (!academy) return;
    const { name, brand_name } = createForm;
    if (!name.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }
    setCreatingTeacher(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke('create-teacher', {
        body: { name: name.trim(), brand_name: brand_name.trim() || name.trim(), academy_id: academy.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Maestro "${brand_name.trim() || name.trim()}" creado y vinculado`);
      setCreateForm({ name: '', brand_name: '' });
      setShowCreateTeacher(false);
      // Auto-enroll existing students
      if (data?.teacher?.id && students.length > 0) {
        const enrollments = students
          .filter(s => s.is_active)
          .map(s => ({ teacher_id: data.teacher.id, student_auth_user_id: s.student_auth_user_id }));
        if (enrollments.length > 0) {
          await supabase.from('teacher_students').upsert(enrollments, { onConflict: 'teacher_id,student_auth_user_id' }).select();
        }
      }
      fetchTeachers();
    } catch (err: any) {
      toast.error(err.message || 'Error al crear maestro');
    }
    setCreatingTeacher(false);
  };

  const openEditTeacher = (t: AcademyTeacher) => {
    setEditingTeacher(t);
    setEditTeacherForm({ name: t.teacher_name, brand_name: t.teacher_brand });
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editingTeacher || !e.target.files?.[0]) return;
    const file = e.target.files[0];
    if (file.size > 2 * 1024 * 1024) { toast.error('Máximo 2MB'); return; }
    setUploadingAvatar(true);
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const path = `teacher-${editingTeacher.teacher_id}/avatar.${ext}`;
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    if (error) { toast.error('Error al subir avatar'); setUploadingAvatar(false); return; }
    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
    const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;
    await supabase.from('teachers').update({ avatar_url: avatarUrl }).eq('id', editingTeacher.teacher_id);
    setEditingTeacher({ ...editingTeacher, teacher_avatar: avatarUrl });
    toast.success('Avatar actualizado');
    setUploadingAvatar(false);
    fetchTeachers();
  };

  const saveTeacherEdit = async () => {
    if (!editingTeacher) return;
    setSavingTeacher(true);
    const { error } = await supabase.from('teachers').update({
      name: editTeacherForm.name.trim(),
      brand_name: editTeacherForm.brand_name.trim(),
    }).eq('id', editingTeacher.teacher_id);
    if (error) { toast.error('Error al guardar'); } else {
      toast.success('Maestro actualizado');
      // Also update users table
      const { data: teacherRow } = await supabase.from('teachers').select('auth_user_id').eq('id', editingTeacher.teacher_id).single();
      if (teacherRow?.auth_user_id) {
        await supabase.from('users').update({ name: editTeacherForm.name.trim() }).eq('auth_user_id', teacherRow.auth_user_id);
      }
      setEditingTeacher(null);
      fetchTeachers();
    }
    setSavingTeacher(false);
  };

  const removeTeacher = async (atId: string) => {
    await supabase.from('academy_teachers').delete().eq('id', atId);
    toast.success('Maestro removido');
    fetchTeachers();
    if (selectedTeacherId) setSelectedTeacherId(null);
  };

  const copyCode = () => {
    if (academy?.access_code) {
      navigator.clipboard.writeText(academy.access_code);
      toast.success('Código copiado');
    }
  };

  const saveName = async () => {
    if (!academy || !editName.trim()) return;
    setSavingName(true);
    await supabase.from('academies').update({ name: editName.trim() }).eq('id', academy.id);
    setAcademy({ ...academy, name: editName.trim() });
    toast.success('Nombre actualizado');
    setSavingName(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Cargando...</div>
      </div>
    );
  }

  if (!academy) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">No se encontró academia.</p>
      </div>
    );
  }

  const getInitials = (name: string) => name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  // If a teacher is selected for class management
  if (selectedTeacherId) {
    const teacher = teachers.find(t => t.teacher_id === selectedTeacherId);
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card">
          <div className="container mx-auto flex items-center gap-3 p-3 md:p-4">
            <Button variant="ghost" size="sm" onClick={() => setSelectedTeacherId(null)}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Volver
            </Button>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-foreground truncate">
                {teacher?.teacher_brand || teacher?.teacher_name || 'Maestro'}
              </h1>
              <p className="text-xs text-muted-foreground">Gestión de clases</p>
            </div>
          </div>
        </header>
        <main className="container mx-auto p-4">
          <Tabs defaultValue="classes">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="classes">Clases</TabsTrigger>
              <TabsTrigger value="progress">Rendimiento</TabsTrigger>
            </TabsList>
            <TabsContent value="classes">
              <ClassManager teacherId={selectedTeacherId} />
            </TabsContent>
            <TabsContent value="progress">
              <StudentProgressView teacherId={selectedTeacherId} />
            </TabsContent>
          </Tabs>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto flex items-center justify-between p-3 md:p-4">
          <div className="flex items-center gap-2 md:gap-3 min-w-0">
            <img src={academy.logo_url || logoUrl || defaultLogo} alt="Logo" className="h-8 md:h-10 w-auto object-contain flex-shrink-0" />
            <div className="min-w-0">
              <h1 className="text-lg md:text-xl font-bold text-foreground truncate">🏫 {academy.name}</h1>
              <p className="text-xs text-muted-foreground">Panel de Academia</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Dashboard
          </Button>
        </div>
      </header>

      <main className="container mx-auto p-4 md:p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full justify-start flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="teachers" className="gap-1"><GraduationCap className="h-4 w-4" /> Maestros</TabsTrigger>
            <TabsTrigger value="students" className="gap-1"><Users className="h-4 w-4" /> Alumnos</TabsTrigger>
            <TabsTrigger value="performance" className="gap-1"><BarChart3 className="h-4 w-4" /> Rendimiento</TabsTrigger>
            <TabsTrigger value="settings" className="gap-1"><Settings className="h-4 w-4" /> Ajustes</TabsTrigger>
          </TabsList>

          {/* Teachers Tab */}
          <TabsContent value="teachers" className="space-y-4 mt-4">
            <div className="flex justify-between items-center flex-wrap gap-2">
              <h2 className="text-lg font-semibold">Maestros inscritos</h2>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setShowAddTeacher(true)} className="gap-1">
                  <Plus className="h-4 w-4" /> Agregar
                </Button>
                <Button size="sm" onClick={() => setShowCreateTeacher(true)} className="gap-1">
                  <UserPlus className="h-4 w-4" /> Crear Maestro
                </Button>
              </div>
            </div>

            {teachers.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  <GraduationCap className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No hay maestros inscritos aún.</p>
                  <p className="text-sm mt-1">Crea un maestro o agrégalo con su código de acceso.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {teachers.map(t => (
                  <Card key={t.id} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setSelectedTeacherId(t.teacher_id)}>
                    <CardContent className="p-4 flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        {t.teacher_avatar && <AvatarImage src={t.teacher_avatar} alt={t.teacher_brand || t.teacher_name} />}
                        <AvatarFallback className="text-sm font-bold bg-primary/10 text-primary">
                          {getInitials(t.teacher_brand || t.teacher_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground truncate">{t.teacher_brand || t.teacher_name}</p>
                        {t.teacher_brand && <p className="text-xs text-muted-foreground truncate">{t.teacher_name}</p>}
                      </div>
                      <Button variant="ghost" size="icon" className="shrink-0" onClick={(e) => { e.stopPropagation(); openEditTeacher(t); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="shrink-0 text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); removeTeacher(t.id); }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Add teacher by code dialog */}
            <Dialog open={showAddTeacher} onOpenChange={setShowAddTeacher}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Agregar Maestro Existente</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">Ingresa el código de acceso del maestro que deseas agregar a la academia.</p>
                  <Input
                    placeholder="Código de acceso del maestro"
                    value={addTeacherCode}
                    onChange={e => setAddTeacherCode(e.target.value)}
                    className="font-mono text-center tracking-wider"
                  />
                  <Button className="w-full" disabled={!addTeacherCode.trim() || addingTeacher} onClick={handleAddTeacher}>
                    {addingTeacher ? 'Agregando...' : 'Agregar Maestro'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Create teacher dialog */}
            <Dialog open={showCreateTeacher} onOpenChange={setShowCreateTeacher}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Crear Nuevo Maestro</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">Crea la ficha del maestro. Él podrá registrarse después con su propio email y contraseña.</p>
                  <div>
                    <label className="text-sm font-medium">Nombre completo *</label>
                    <Input value={createForm.name} onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))} placeholder="Ej: Manuel Pineda" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Nombre de marca</label>
                    <Input value={createForm.brand_name} onChange={e => setCreateForm(f => ({ ...f, brand_name: e.target.value }))} placeholder="Ej: Fitness by Manuel" />
                  </div>
                  <Button className="w-full" disabled={creatingTeacher || !createForm.name.trim()} onClick={createTeacher}>
                    {creatingTeacher ? 'Creando...' : 'Crear Maestro'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Edit teacher dialog */}
            <Dialog open={!!editingTeacher} onOpenChange={open => { if (!open) setEditingTeacher(null); }}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Editar Maestro</DialogTitle>
                </DialogHeader>
                {editingTeacher && (
                  <div className="space-y-4">
                    {/* Avatar */}
                    <div className="flex justify-center">
                      <div className="relative cursor-pointer group" onClick={() => avatarInputRef.current?.click()}>
                        <Avatar className="h-20 w-20">
                          {editingTeacher.teacher_avatar && <AvatarImage src={editingTeacher.teacher_avatar} />}
                          <AvatarFallback className="text-lg font-bold bg-primary/10 text-primary">
                            {getInitials(editingTeacher.teacher_brand || editingTeacher.teacher_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Camera className="h-6 w-6 text-white" />
                        </div>
                        {uploadingAvatar && <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center"><div className="animate-spin h-6 w-6 border-2 border-white border-t-transparent rounded-full" /></div>}
                      </div>
                      <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Nombre</label>
                      <Input value={editTeacherForm.name} onChange={e => setEditTeacherForm(f => ({ ...f, name: e.target.value }))} />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Nombre de marca</label>
                      <Input value={editTeacherForm.brand_name} onChange={e => setEditTeacherForm(f => ({ ...f, brand_name: e.target.value }))} />
                    </div>
                    <Button className="w-full" disabled={savingTeacher || !editTeacherForm.name.trim()} onClick={saveTeacherEdit}>
                      {savingTeacher ? 'Guardando...' : 'Guardar Cambios'}
                    </Button>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* Students Tab */}
          <TabsContent value="students" className="space-y-4 mt-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Alumnos inscritos ({students.filter(s => s.is_active).length})</h2>
            </div>

            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="flex-1">
                  <p className="text-sm font-medium">Código de acceso de la academia</p>
                  <p className="font-mono text-lg tracking-wider text-primary">{academy.access_code}</p>
                </div>
                <Button variant="outline" size="sm" onClick={copyCode} className="gap-1">
                  <Copy className="h-4 w-4" /> Copiar
                </Button>
              </CardContent>
            </Card>

            {students.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No hay alumnos inscritos aún.</p>
                  <p className="text-sm mt-1">Comparte el código de acceso con tus alumnos.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {students.map(s => (
                  <Card key={s.id}>
                    <CardContent className="p-3 flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                          {getInitials(s.student_name || '?')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{s.student_name || 'Sin nombre'}</p>
                        <p className="text-xs text-muted-foreground truncate">{s.student_email || ''}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${s.is_active ? 'bg-emerald-500/10 text-emerald-600' : 'bg-muted text-muted-foreground'}`}>
                        {s.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-4 mt-4">
            <h2 className="text-lg font-semibold">Rendimiento consolidado</h2>
            {teachers.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Agrega maestros para ver el rendimiento de sus alumnos.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {teachers.map(t => (
                  <div key={t.id}>
                    <h3 className="text-base font-semibold mb-2 flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        {t.teacher_avatar && <AvatarImage src={t.teacher_avatar} />}
                        <AvatarFallback className="text-[10px]">{getInitials(t.teacher_brand || t.teacher_name)}</AvatarFallback>
                      </Avatar>
                      {t.teacher_brand || t.teacher_name}
                    </h3>
                    <StudentProgressView teacherId={t.teacher_id} />
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-4 mt-4">
            <h2 className="text-lg font-semibold">Ajustes de la academia</h2>
            <Card>
              <CardContent className="p-4 space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground">Nombre de la academia</label>
                  <div className="flex gap-2 mt-1">
                    <Input value={editName} onChange={e => setEditName(e.target.value)} />
                    <Button onClick={saveName} disabled={savingName || editName.trim() === academy.name}>
                      {savingName ? 'Guardando...' : 'Guardar'}
                    </Button>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Código de acceso</label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="font-mono text-lg tracking-wider text-primary bg-muted px-3 py-1 rounded">{academy.access_code}</code>
                    <Button variant="outline" size="sm" onClick={copyCode}><Copy className="h-4 w-4" /></Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Los alumnos usan este código para inscribirse en la academia.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
