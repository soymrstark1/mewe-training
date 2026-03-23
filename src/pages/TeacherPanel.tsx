import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ArrowLeft, Menu } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import ClassManager from '@/components/teacher/ClassManager';
import CourseManager from '@/components/teacher/CourseManager';
import StudentManager from '@/components/teacher/StudentManager';
import TeacherProfileEditor from '@/components/teacher/TeacherProfileEditor';
import ExamResults from '@/components/teacher/ExamResults';
import FeedbackManager from '@/components/teacher/FeedbackManager';
import StudentProgressView from '@/components/teacher/StudentProgressView';
import defaultLogo from '@/assets/mewe-logo.png';
import { useAcademyBrand } from '@/hooks/useAcademyBrand';

const TAB_OPTIONS = [
  { value: 'classes', label: '📚 Clases' },
  { value: 'courses', label: '📦 Cursos' },
  { value: 'students', label: '👥 Estudiantes' },
  { value: 'progress', label: '📈 Progreso' },
  { value: 'grades', label: '📊 Calificaciones' },
  { value: 'feedback', label: '💬 Feedback' },
  { value: 'settings', label: '⚙️ Ajustes' },
];

export default function TeacherPanel() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [teacherName, setTeacherName] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('classes');
  const [menuOpen, setMenuOpen] = useState(false);
  const { logoUrl } = useAcademyBrand();

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/login'); return; }

      const { data: teacher } = await supabase
        .from('teachers')
        .select('id, name')
        .eq('auth_user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      const { data: role } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .in('role', ['teacher', 'superadmin'])
        .maybeSingle();

      if (!teacher && !role) {
        navigate('/dashboard');
        return;
      }

      if (teacher) {
        setTeacherId(teacher.id);
        const { data: fullTeacher } = await supabase
          .from('teachers')
          .select('brand_name')
          .eq('id', teacher.id)
          .single();
        setTeacherName(fullTeacher?.brand_name || teacher.name);
      }
      setLoading(false);
    };
    init();
  }, [navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Cargando...</div>
      </div>
    );
  }

  if (!teacherId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">No se encontró registro de maestro.</p>
      </div>
    );
  }

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            {isMobile ? (
              <Button variant="ghost" size="icon" onClick={() => setMenuOpen(true)}>
                <Menu className="h-5 w-5" />
              </Button>
            ) : (
              <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
            <img src={logoUrl || defaultLogo} alt="Logo" className="h-8 w-auto" />
            <h1 className="text-xl font-bold text-foreground">
              {isMobile ? 'Maestro' : 'Panel del Maestro'}
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">{teacherName}</p>
        </div>
      </header>

      {/* Mobile menu Sheet */}
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="w-[75%] sm:max-w-xs">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <img src={logoUrl || defaultLogo} alt="Logo" className="h-6 w-auto" />
              Panel del Maestro
            </SheetTitle>
          </SheetHeader>
          <nav className="mt-6 flex flex-col gap-1">
            {TAB_OPTIONS.map(tab => (
              <button
                key={tab.value}
                onClick={() => handleTabChange(tab.value)}
                className={`w-full text-left px-4 py-3 rounded-lg text-base font-medium transition-colors ${
                  activeTab === tab.value
                    ? 'bg-primary text-primary-foreground'
                    : 'text-foreground hover:bg-accent'
                }`}
              >
                {tab.label}
              </button>
            ))}
            <div className="my-4 border-t border-border" />
            <button
              onClick={() => { setMenuOpen(false); navigate('/dashboard'); }}
              className="w-full text-left px-4 py-3 rounded-lg text-base font-medium text-muted-foreground hover:bg-accent flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" /> Volver al Dashboard
            </button>
          </nav>
        </SheetContent>
      </Sheet>

      <main className="container mx-auto p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          {!isMobile && (
            <TabsList className="grid w-full grid-cols-7">
              {TAB_OPTIONS.map(tab => (
                <TabsTrigger key={tab.value} value={tab.value}>{tab.label}</TabsTrigger>
              ))}
            </TabsList>
          )}

          <TabsContent value="classes">
            <ClassManager teacherId={teacherId} />
          </TabsContent>

          <TabsContent value="courses">
            <CourseManager teacherId={teacherId} />
          </TabsContent>

          <TabsContent value="students">
            <StudentManager teacherId={teacherId} />
          </TabsContent>

          <TabsContent value="progress">
            <StudentProgressView teacherId={teacherId} />
          </TabsContent>

          <TabsContent value="grades">
            <ExamResults teacherId={teacherId} />
          </TabsContent>

          <TabsContent value="feedback">
            <FeedbackManager teacherId={teacherId} />
          </TabsContent>

          <TabsContent value="settings">
            <TeacherProfileEditor teacherId={teacherId} onProfileUpdate={(name, brandName) => setTeacherName(brandName || name)} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
