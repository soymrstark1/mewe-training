import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useSuperadminCheck } from '@/hooks/useSuperadminCheck';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import SlidesUploader from '@/components/SlidesUploader';
import { ArrowLeft, Save, Users, GraduationCap, BookOpen, BarChart3, Upload } from 'lucide-react';
import { toast } from 'sonner';
import defaultLogo from '@/assets/mewe-logo.png';

interface TeacherMetric {
  id: string;
  name: string;
  brand_name: string;
  is_active: boolean;
  student_count: number;
  class_count: number;
}

export default function PlataformaPanel() {
  const navigate = useNavigate();
  const { isSuperadmin, isLoading: checkingRole } = useSuperadminCheck();

  const [loading, setLoading] = useState(true);
  const [totalTeachers, setTotalTeachers] = useState(0);
  const [activeTeachers, setActiveTeachers] = useState(0);
  const [totalStudents, setTotalStudents] = useState(0);
  const [totalClasses, setTotalClasses] = useState(0);
  const [avgStudentsPerTeacher, setAvgStudentsPerTeacher] = useState(0);
  const [teacherMetrics, setTeacherMetrics] = useState<TeacherMetric[]>([]);

  const [liveEnabled, setLiveEnabled] = useState(false);
  const [togglingLive, setTogglingLive] = useState(false);
  const [brandName, setBrandName] = useState('');
  const [savingBrand, setSavingBrand] = useState(false);
  const [subtitle, setSubtitle] = useState('');
  const [savingSubtitle, setSavingSubtitle] = useState(false);
  const [logoUrl, setLogoUrl] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [selectedLang, setSelectedLang] = useState<string | null>(null);

  useEffect(() => {
    if (checkingRole) return;
    if (!isSuperadmin) { navigate('/dashboard'); return; }
    loadAll();
  }, [checkingRole, isSuperadmin]);

  const loadAll = async () => {
    setLoading(true);

    // Parallel fetches
    const [teachersRes, usersRes, classesRes, studentsRes, settingsRes] = await Promise.all([
      supabase.from('teachers').select('id, name, brand_name, is_active'),
      supabase.from('users').select('id', { count: 'exact', head: true }),
      supabase.from('teacher_classes').select('id, teacher_id'),
      supabase.from('teacher_students').select('id, teacher_id, is_active').eq('is_active', true),
      supabase.from('global_settings').select('key, value').in('key', ['academy_brand_name', 'live_classes_enabled', 'academy_subtitle', 'academy_logo_url']),
    ]);

    const teachers = teachersRes.data || [];
    const classes = classesRes.data || [];
    const students = studentsRes.data || [];

    setTotalTeachers(teachers.length);
    setActiveTeachers(teachers.filter(t => t.is_active).length);
    setTotalStudents(usersRes.count || 0);
    setTotalClasses(classes.length);

    // Build per-teacher metrics
    const metrics: TeacherMetric[] = teachers.map(t => ({
      id: t.id,
      name: t.name,
      brand_name: t.brand_name,
      is_active: t.is_active,
      student_count: students.filter(s => s.teacher_id === t.id).length,
      class_count: classes.filter(c => c.teacher_id === t.id).length,
    }));
    setTeacherMetrics(metrics.sort((a, b) => b.student_count - a.student_count));

    const activeWithStudents = metrics.filter(m => m.is_active && m.student_count > 0);
    setAvgStudentsPerTeacher(
      activeWithStudents.length > 0
        ? Math.round(activeWithStudents.reduce((s, m) => s + m.student_count, 0) / activeWithStudents.length)
        : 0
    );

    const settings = settingsRes.data || [];
    for (const s of settings) {
      if (s.key === 'academy_brand_name') setBrandName(s.value || '');
      if (s.key === 'live_classes_enabled') setLiveEnabled(s.value === 'true');
      if (s.key === 'academy_subtitle') setSubtitle(s.value || '');
      if (s.key === 'academy_logo_url') setLogoUrl(s.value || '');
    }
    setLoading(false);
  };

  const toggleLiveClasses = async (checked: boolean) => {
    setTogglingLive(true);
    setLiveEnabled(checked);
    const { error } = await supabase
      .from('global_settings')
      .update({ value: checked ? 'true' : 'false', updated_at: new Date().toISOString() })
      .eq('key', 'live_classes_enabled');
    if (error) { toast.error('Error al guardar'); setLiveEnabled(!checked); }
    else toast.success(checked ? 'Clases en Vivo activadas' : 'Clases en Vivo desactivadas');
    setTogglingLive(false);
  };

  const saveBrandName = async () => {
    setSavingBrand(true);
    const { error } = await supabase
      .from('global_settings')
      .update({ value: brandName, updated_at: new Date().toISOString() })
      .eq('key', 'academy_brand_name');
    if (error) toast.error('Error al guardar');
    else toast.success('Nombre actualizado');
    setSavingBrand(false);
  };

  const saveSubtitle = async () => {
    setSavingSubtitle(true);
    const { error } = await supabase
      .from('global_settings')
      .update({ value: subtitle, updated_at: new Date().toISOString() })
      .eq('key', 'academy_subtitle');
    if (error) toast.error('Error al guardar');
    else toast.success('Subtítulo actualizado');
    setSavingSubtitle(false);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Solo JPG, PNG o WebP');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Máximo 2MB');
      return;
    }
    setUploadingLogo(true);
    const ext = file.name.split('.').pop();
    const path = `platform/logo.${ext}`;
    const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    if (upErr) {
      toast.error('Error al subir logo');
      setUploadingLogo(false);
      return;
    }
    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
    const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;
    const { error: saveErr } = await supabase
      .from('global_settings')
      .update({ value: publicUrl, updated_at: new Date().toISOString() })
      .eq('key', 'academy_logo_url');
    if (saveErr) toast.error('Error al guardar URL');
    else {
      setLogoUrl(publicUrl);
      toast.success('Logo actualizado');
    }
    setUploadingLogo(false);
    if (logoInputRef.current) logoInputRef.current.value = '';
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
        <div className="container mx-auto flex items-center gap-3 p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold text-foreground">⚙️ Panel de Plataforma</h1>
        </div>
      </header>

      <main className="container mx-auto p-4 md:p-6 space-y-6">
        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6 text-center">
              <GraduationCap className="h-8 w-8 mx-auto text-primary mb-2" />
              <p className="text-3xl font-bold text-foreground">{activeTeachers}<span className="text-lg text-muted-foreground">/{totalTeachers}</span></p>
              <p className="text-sm text-muted-foreground">Maestros activos</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <Users className="h-8 w-8 mx-auto text-primary mb-2" />
              <p className="text-3xl font-bold text-foreground">{totalStudents}</p>
              <p className="text-sm text-muted-foreground">Usuarios registrados</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <BookOpen className="h-8 w-8 mx-auto text-primary mb-2" />
              <p className="text-3xl font-bold text-foreground">{totalClasses}</p>
              <p className="text-sm text-muted-foreground">Clases creadas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <BarChart3 className="h-8 w-8 mx-auto text-primary mb-2" />
              <p className="text-3xl font-bold text-foreground">{avgStudentsPerTeacher}</p>
              <p className="text-sm text-muted-foreground">Alumnos/Maestro (prom)</p>
            </CardContent>
          </Card>
        </div>

        {/* Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Configuración de la Plataforma</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Live toggle */}
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium text-foreground">🔴 Clases en Vivo (Jitsi)</p>
                <p className="text-xs text-muted-foreground">Activar videollamadas para maestros</p>
              </div>
              <Switch checked={liveEnabled} onCheckedChange={toggleLiveClasses} disabled={togglingLive} />
            </div>

            {/* Logo upload */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Logo de la plataforma</label>
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-lg border bg-muted flex items-center justify-center overflow-hidden">
                  <img src={logoUrl || defaultLogo} alt="Logo" className="h-full w-full object-contain p-1" />
                </div>
                <input ref={logoInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleLogoUpload} />
                <Button size="sm" variant="outline" onClick={() => logoInputRef.current?.click()} disabled={uploadingLogo}>
                  <Upload className="h-4 w-4 mr-1" /> {uploadingLogo ? 'Subiendo...' : 'Cambiar logo'}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">JPG, PNG o WebP. Máx 2MB.</p>
            </div>

            {/* Subtitle */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Subtítulo (debajo de "The Academy")</label>
              <div className="flex gap-2">
                <Input value={subtitle} onChange={e => setSubtitle(e.target.value)} placeholder="Ej: Tu plataforma de formación" />
                <Button size="sm" onClick={saveSubtitle} disabled={savingSubtitle}>
                  <Save className="h-4 w-4 mr-1" /> Guardar
                </Button>
              </div>
            </div>

            {/* Brand name */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Nombre "by" (debajo del logo)</label>
              <div className="flex gap-2">
                <Input value={brandName} onChange={e => setBrandName(e.target.value)} placeholder="Ej: Mauricio Trachtman" />
                <Button size="sm" onClick={saveBrandName} disabled={savingBrand}>
                  <Save className="h-4 w-4 mr-1" /> Guardar
                </Button>
              </div>
            </div>

            {/* Slides uploader */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-foreground">Diapositivas Globales</label>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant={selectedLang === 'es' ? 'default' : 'outline'}
                  onClick={() => setSelectedLang(selectedLang === 'es' ? null : 'es')}
                >
                  🇪🇸 Español
                </Button>
                <Button
                  variant={selectedLang === 'en' ? 'default' : 'outline'}
                  onClick={() => setSelectedLang(selectedLang === 'en' ? null : 'en')}
                >
                  🇬🇧 English
                </Button>
              </div>
              {selectedLang && <SlidesUploader language={selectedLang} />}
            </div>
          </CardContent>
        </Card>

        {/* Teacher metrics table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Rendimiento por Maestro</CardTitle>
          </CardHeader>
          <CardContent>
            {teacherMetrics.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No hay maestros registrados</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Maestro</TableHead>
                    <TableHead className="text-center">Alumnos</TableHead>
                    <TableHead className="text-center">Clases</TableHead>
                    <TableHead className="text-center">Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teacherMetrics.map(t => (
                    <TableRow key={t.id}>
                      <TableCell>
                        <p className="font-medium text-foreground">{t.name}</p>
                        {t.brand_name && <p className="text-xs text-muted-foreground">{t.brand_name}</p>}
                      </TableCell>
                      <TableCell className="text-center font-semibold">{t.student_count}</TableCell>
                      <TableCell className="text-center font-semibold">{t.class_count}</TableCell>
                      <TableCell className="text-center">
                        <span className={`inline-block h-2.5 w-2.5 rounded-full ${t.is_active ? 'bg-green-500' : 'bg-muted-foreground/40'}`} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
