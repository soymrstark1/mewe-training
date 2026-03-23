import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { ArrowLeft, UserPlus, Pencil, Check, X, Clock, Link, Search, MoreVertical, Shield, GraduationCap, UserCheck, Sparkles } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import ClassManager from '@/components/teacher/ClassManager';
import defaultLogo from '@/assets/mewe-logo.png';
import { useAcademyBrand } from '@/hooks/useAcademyBrand';

interface Teacher {
  id: string;
  auth_user_id: string;
  name: string;
  brand_name: string;
  access_code: string;
  is_active: boolean;
  created_at: string;
}

interface TeacherRequest {
  id: string;
  auth_user_id: string;
  name: string;
  email: string;
  brand_name: string;
  status: string;
  created_at: string;
}

interface UserRow {
  id: string;
  auth_user_id: string;
  name: string;
  email: string;
  is_active: boolean | null;
  created_at: string | null;
  reviewed_at: string | null;
}

export default function AdminPanel() {
  const navigate = useNavigate();
  const { hasAdminAccess, isSuperadmin, isLoading: checkingRole } = useAdminCheck();
  const { logoUrl } = useAcademyBrand();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [requests, setRequests] = useState<TeacherRequest[]>([]);
  const [historyRequests, setHistoryRequests] = useState<TeacherRequest[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', brand_name: '' });
  const [creating, setCreating] = useState(false);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [editForm, setEditForm] = useState({ name: '', brand_name: '' });
  const [savingEdit, setSavingEdit] = useState(false);
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);
  const [promoting, setPromoting] = useState<string | null>(null);

  // Search states
  const [teacherSearch, setTeacherSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [newUserSearch, setNewUserSearch] = useState('');
  const [requestSubTab, setRequestSubTab] = useState<'pending' | 'history'>('pending');

  useEffect(() => {
    if (!checkingRole && !hasAdminAccess) navigate('/dashboard');
  }, [checkingRole, hasAdminAccess, navigate]);

  useEffect(() => {
    fetchTeachers();
    fetchRequests();
    fetchUsers();
  }, []);

  const fetchTeachers = async () => {
    const { data, error } = await supabase
      .from('teachers')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error) setTeachers(data || []);
    setLoading(false);
  };

  const fetchRequests = async () => {
    const { data: pending } = await supabase
      .from('teacher_requests')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    if (pending) setRequests(pending as any);

    const { data: history } = await supabase
      .from('teacher_requests')
      .select('*')
      .neq('status', 'pending')
      .order('created_at', { ascending: false });
    if (history) setHistoryRequests(history as any);
  };

  const fetchUsers = async () => {
    const { data } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setUsers(data);
  };

  const createTeacher = async () => {
    if (!form.name || !form.email || !form.password) {
      toast.error('Todos los campos son obligatorios');
      return;
    }
    if (form.password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    setCreating(true);
    const res = await supabase.functions.invoke('create-teacher', {
      body: {
        email: form.email,
        password: form.password,
        name: form.name,
        brand_name: form.brand_name || form.name,
      },
    });
    if (res.error || res.data?.error) {
      toast.error(res.data?.error || res.error?.message || 'Error al crear maestro');
    } else {
      toast.success('Maestro creado exitosamente');
      setForm({ name: '', email: '', password: '', brand_name: '' });
      setDialogOpen(false);
      fetchTeachers();
    }
    setCreating(false);
  };

  const toggleTeacherActive = async (id: string, currentActive: boolean) => {
    await supabase.from('teachers').update({ is_active: !currentActive }).eq('id', id);
    fetchTeachers();
  };

  const openEditDialog = (teacher: Teacher) => {
    setEditForm({ name: teacher.name, brand_name: teacher.brand_name });
    setEditingTeacher(teacher);
  };

  const saveEdit = async () => {
    if (!editingTeacher || !editForm.name.trim()) return;
    setSavingEdit(true);
    const { error } = await supabase
      .from('teachers')
      .update({ name: editForm.name.trim(), brand_name: editForm.brand_name.trim() })
      .eq('id', editingTeacher.id);
    if (error) toast.error('Error al guardar');
    else {
      toast.success('Maestro actualizado');
      setEditingTeacher(null);
      fetchTeachers();
    }
    setSavingEdit(false);
  };

  const handleRequest = async (requestId: string, action: 'approve' | 'reject') => {
    setProcessingRequest(requestId);
    const res = await supabase.functions.invoke('approve-teacher', {
      body: { request_id: requestId, action },
    });
    if (res.error || res.data?.error) {
      toast.error(res.data?.error || res.error?.message || 'Error al procesar solicitud');
    } else {
      toast.success(action === 'approve' ? 'Maestro aprobado' : 'Solicitud rechazada');
      fetchRequests();
      if (action === 'approve') fetchTeachers();
    }
    setProcessingRequest(null);
  };

  const promoteUser = async (userId: string, role: 'teacher' | 'admin') => {
    setPromoting(userId);
    const res = await supabase.functions.invoke('promote-user', {
      body: { user_id: userId, role },
    });
    if (res.error || res.data?.error) {
      toast.error(res.data?.error || res.error?.message || 'Error al promover usuario');
    } else {
      toast.success(role === 'teacher' ? 'Usuario promovido a Maestro' : 'Usuario promovido a Admin');
      fetchTeachers();
      fetchUsers();
    }
    setPromoting(null);
  };

  const teacherAuthIds = new Set(teachers.map(t => t.auth_user_id));

  const filteredTeachers = teachers.filter(t =>
    t.name.toLowerCase().includes(teacherSearch.toLowerCase()) ||
    t.brand_name.toLowerCase().includes(teacherSearch.toLowerCase()) ||
    t.access_code.toLowerCase().includes(teacherSearch.toLowerCase())
  );

  // Exclude teachers from student lists
  const nonTeacherUsers = users.filter(u => !teacherAuthIds.has(u.auth_user_id));

  // "Nuevos": registered < 72h ago AND not reviewed
  const now = Date.now();
  const SEVENTY_TWO_HOURS = 72 * 60 * 60 * 1000;
  const newUsers = nonTeacherUsers.filter(u => {
    if (!u.created_at) return false;
    const age = now - new Date(u.created_at).getTime();
    return age < SEVENTY_TWO_HOURS && !u.reviewed_at;
  });

  const filteredNewUsers = newUsers.filter(u =>
    u.name.toLowerCase().includes(newUserSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(newUserSearch.toLowerCase())
  );

  const filteredUsers = nonTeacherUsers.filter(u =>
    u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  const reviewUser = async (userId: string) => {
    const { error } = await supabase
      .from('users')
      .update({ reviewed_at: new Date().toISOString() } as any)
      .eq('id', userId);
    if (error) toast.error('Error al marcar como revisado');
    else {
      toast.success('Usuario marcado como revisado');
      fetchUsers();
    }
  };

  if (checkingRole || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <img src={logoUrl || defaultLogo} alt="Logo" className="h-8 w-auto" />
            <h1 className="text-xl font-bold text-foreground">Panel de Administración</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => {
                const link = `${window.location.origin}/login?modo=maestro`;
                navigator.clipboard.writeText(link);
                toast.success('Link de registro copiado al portapapeles');
              }}
            >
              <Link className="h-4 w-4" /> Copiar Link de Registro
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <UserPlus className="h-4 w-4" /> Nuevo Maestro
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Crear Nuevo Maestro</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <Input placeholder="Nombre del maestro" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                  <Input placeholder='Nombre "by" (debajo del logo)' value={form.brand_name} onChange={e => setForm(f => ({ ...f, brand_name: e.target.value }))} />
                  <Input type="email" placeholder="Email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                  <Input type="password" placeholder="Contraseña (mín. 6 caracteres)" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
                  <Button className="w-full" onClick={createTeacher} disabled={creating}>
                    {creating ? 'Creando...' : 'Crear Maestro'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-6 space-y-4">
        {selectedTeacherId ? (
          <div className="space-y-4">
            <Button variant="ghost" onClick={() => setSelectedTeacherId(null)} className="gap-1">
              <ArrowLeft className="h-4 w-4" /> Volver
            </Button>
            <h2 className="text-lg font-semibold text-foreground">
              Clases de {teachers.find(t => t.id === selectedTeacherId)?.name}
            </h2>
            <ClassManager teacherId={selectedTeacherId} />
          </div>
        ) : (
          <Tabs defaultValue="teachers">
            <TabsList className="mb-4">
              <TabsTrigger value="teachers">Maestros</TabsTrigger>
              <TabsTrigger value="new" className="gap-1">
                Nuevos
                {newUsers.length > 0 && (
                  <span className="ml-1 rounded-full bg-accent px-2 py-0.5 text-xs text-accent-foreground">
                    {newUsers.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="users">Alumnos</TabsTrigger>
              <TabsTrigger value="requests" className="gap-1">
                Solicitudes
                {requests.length > 0 && (
                  <span className="ml-1 rounded-full bg-destructive px-2 py-0.5 text-xs text-destructive-foreground">
                    {requests.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            {/* ===== MAESTROS TAB ===== */}
            <TabsContent value="teachers" className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar maestro por nombre, marca o código..."
                  value={teacherSearch}
                  onChange={e => setTeacherSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              {filteredTeachers.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    {teacherSearch ? 'No se encontraron maestros.' : 'No hay maestros. Crea el primero con el botón de arriba.'}
                  </CardContent>
                </Card>
              ) : (
                filteredTeachers.map(teacher => (
                  <Card
                    key={teacher.id}
                    className={`cursor-pointer hover:border-primary/40 transition-all ${!teacher.is_active ? 'opacity-60' : ''}`}
                    onClick={() => setSelectedTeacherId(teacher.id)}
                  >
                    <CardContent className="flex items-center justify-between py-4">
                      <div className="space-y-1">
                        <p className="font-semibold text-foreground">{teacher.name}</p>
                        <p className="text-sm text-muted-foreground">by {teacher.brand_name}</p>
                        <p className="text-xs text-muted-foreground font-mono">
                          Código: {teacher.access_code}
                        </p>
                      </div>
                      <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(teacher)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">Activo</span>
                          <Switch
                            checked={teacher.is_active}
                            onCheckedChange={() => toggleTeacherActive(teacher.id, teacher.is_active)}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            {/* ===== NUEVOS TAB ===== */}
            <TabsContent value="new" className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar nuevo usuario por nombre o email..."
                  value={newUserSearch}
                  onChange={e => setNewUserSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              {filteredNewUsers.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    {newUserSearch ? 'No se encontraron usuarios nuevos.' : 'No hay usuarios nuevos por revisar.'}
                  </CardContent>
                </Card>
              ) : (
                filteredNewUsers.map(user => (
                  <Card key={user.id} className="border-l-4 border-l-accent bg-accent/5">
                    <CardContent className="flex items-center justify-between py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-foreground">{user.name}</p>
                          <span className="inline-flex items-center gap-1 rounded-full bg-accent/20 px-2 py-0.5 text-xs font-medium text-accent-foreground">
                            <Sparkles className="h-3 w-3" /> Nuevo
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {user.created_at && new Date(user.created_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1"
                          onClick={() => reviewUser(user.id)}
                        >
                          <UserCheck className="h-4 w-4" /> Revisado
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" disabled={promoting === user.auth_user_id}>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => promoteUser(user.auth_user_id, 'teacher')}>
                              <GraduationCap className="mr-2 h-4 w-4" /> Hacer Maestro
                            </DropdownMenuItem>
                            {isSuperadmin && (
                              <DropdownMenuItem onClick={() => promoteUser(user.auth_user_id, 'admin')}>
                                <Shield className="mr-2 h-4 w-4" /> Hacer Admin
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            {/* ===== ALUMNOS TAB ===== */}
            <TabsContent value="users" className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar alumno por nombre o email..."
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              {filteredUsers.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    {userSearch ? 'No se encontraron alumnos.' : 'No hay alumnos registrados.'}
                  </CardContent>
                </Card>
              ) : (
                filteredUsers.map(user => (
                  <Card key={user.id}>
                    <CardContent className="flex items-center justify-between py-4">
                      <div className="space-y-1">
                        <p className="font-semibold text-foreground">{user.name}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" disabled={promoting === user.auth_user_id}>
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => promoteUser(user.auth_user_id, 'teacher')}>
                            <GraduationCap className="mr-2 h-4 w-4" /> Hacer Maestro
                          </DropdownMenuItem>
                          {isSuperadmin && (
                            <DropdownMenuItem onClick={() => promoteUser(user.auth_user_id, 'admin')}>
                              <Shield className="mr-2 h-4 w-4" /> Hacer Admin
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            {/* ===== SOLICITUDES TAB ===== */}
            <TabsContent value="requests" className="space-y-4">
              <div className="flex gap-2 mb-2">
                <Button
                  variant={requestSubTab === 'pending' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setRequestSubTab('pending')}
                >
                  Pendientes ({requests.length})
                </Button>
                <Button
                  variant={requestSubTab === 'history' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setRequestSubTab('history')}
                >
                  Historial ({historyRequests.length})
                </Button>
              </div>

              {requestSubTab === 'pending' && (
                <>
                  {requests.length === 0 ? (
                    <Card>
                      <CardContent className="py-12 text-center text-muted-foreground">
                        No hay solicitudes pendientes.
                      </CardContent>
                    </Card>
                  ) : (
                    requests.map(req => (
                      <Card key={req.id}>
                        <CardContent className="flex items-center justify-between py-4">
                          <div className="space-y-1">
                            <p className="font-semibold text-foreground">{req.name}</p>
                            <p className="text-sm text-muted-foreground">{req.email}</p>
                            {req.brand_name && <p className="text-xs text-muted-foreground">Marca: {req.brand_name}</p>}
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(req.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1 text-destructive border-destructive/30 hover:bg-destructive/10"
                              onClick={() => handleRequest(req.id, 'reject')}
                              disabled={processingRequest === req.id}
                            >
                              <X className="h-4 w-4" /> Rechazar
                            </Button>
                            <Button
                              size="sm"
                              className="gap-1"
                              onClick={() => handleRequest(req.id, 'approve')}
                              disabled={processingRequest === req.id}
                            >
                              <Check className="h-4 w-4" /> Aprobar
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </>
              )}

              {requestSubTab === 'history' && (
                <>
                  {historyRequests.length === 0 ? (
                    <Card>
                      <CardContent className="py-12 text-center text-muted-foreground">
                        No hay solicitudes procesadas.
                      </CardContent>
                    </Card>
                  ) : (
                    historyRequests.map(req => (
                      <Card key={req.id} className="opacity-75">
                        <CardContent className="flex items-center justify-between py-4">
                          <div className="space-y-1">
                            <p className="font-semibold text-foreground">{req.name}</p>
                            <p className="text-sm text-muted-foreground">{req.email}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(req.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                            req.status === 'approved'
                              ? 'bg-primary/10 text-primary'
                              : 'bg-destructive/10 text-destructive'
                          }`}>
                            {req.status === 'approved' ? 'Aprobada' : 'Rechazada'}
                          </span>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </>
              )}
            </TabsContent>
          </Tabs>
        )}
      </main>

      {/* Edit Teacher Dialog */}
      <Dialog open={!!editingTeacher} onOpenChange={(open) => !open && setEditingTeacher(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Maestro</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <label className="text-sm font-medium text-foreground">Nombre</label>
              <Input className="mt-1" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Nombre "by" (marca)</label>
              <Input className="mt-1" value={editForm.brand_name} onChange={e => setEditForm(f => ({ ...f, brand_name: e.target.value }))} />
            </div>
            <Button className="w-full" onClick={saveEdit} disabled={savingEdit}>
              {savingEdit ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
