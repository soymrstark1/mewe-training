import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { LogOut, Play, Settings, Shield, Pencil, FileText, Settings2, Film, Globe, GraduationCap, BookOpen, ArrowLeft, HelpCircle, Menu, MessageSquare, CheckCircle2, Download, ChevronDown, ChevronUp, Award, School } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useAcademyBrand } from '@/hooks/useAcademyBrand';
import { useLiveClassesEnabled } from '@/hooks/useLiveClassesEnabled';
import UserProfileEditor from '@/components/UserProfileEditor';
import StudentNotesDialog from '@/components/presentation/StudentNotesDialog';
import AllNotesDialog from '@/components/presentation/AllNotesDialog';
import FeedbackDialog from '@/components/presentation/FeedbackDialog';
import defaultLogo from '@/assets/mewe-logo.png';
import { useToast } from '@/hooks/use-toast';
import { useStudentProgress, ProgressData } from '@/hooks/useStudentProgress';
import { useStudentCourses, CourseWithClasses } from '@/hooks/useCourses';
import { Progress } from '@/components/ui/progress';

type UserRole = 'superadmin' | 'teacher' | 'student';

interface TeacherCard {
  id: string;
  name: string;
  brand_name: string;
  avatar_url: string | null;
}

interface ClassCard {
  id: string;
  teacher_id: string;
  name: string;
  cover_image_url: string | null;
  teacher_name: string;
  teacher_brand: string;
  class_type: string;
  video_url: string | null;
  external_url: string | null;
  feedback_enabled: boolean;
}

const getVideoThumbnail = (url: string): string | null => {
  if (!url) return null;
  const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch) return `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`;
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://vumbnail.com/${vimeoMatch[1]}.jpg`;
  return null;
};

const getClassLabel = (classType: string) => {
  switch (classType) {
    case 'video': return { icon: <Film className="h-3 w-3" />, text: 'Ver Video →' };
    case 'tiktok_feed': return { icon: <Film className="h-3 w-3" />, text: 'Ver Videos →' };
    case 'url': return { icon: <Globe className="h-3 w-3" />, text: 'Abrir Página →' };
    case 'exam': return { icon: <FileText className="h-3 w-3" />, text: 'Hacer Examen →' };
    case 'live': return { icon: <Play className="h-3 w-3" />, text: 'Unirse a Clase →' };
    default: return { icon: <Play className="h-3 w-3" />, text: 'Presentar →' };
  }
};

const getClassEmoji = (classType: string) => {
  switch (classType) {
    case 'video': return '🎬';
    case 'tiktok_feed': return '📱';
    case 'url': return '🌐';
    case 'exam': return '📝';
    case 'live': return '🔴';
    default: return '📚';
  }
};

export default function Dashboard() {
  const [userName, setUserName] = useState('');
  const [userAvatarUrl, setUserAvatarUrl] = useState<string | null>(null);
  const [authUserId, setAuthUserId] = useState('');
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [isAcademy, setIsAcademy] = useState(false);
  const [enrolledAcademies, setEnrolledAcademies] = useState<{id: string; name: string; logo_url: string | null}[]>([]);
  const [selectedAcademyId, setSelectedAcademyId] = useState<string | null>(null);
  const [academyTeachers, setAcademyTeachers] = useState<TeacherCard[]>([]);
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [enrolledTeachers, setEnrolledTeachers] = useState<TeacherCard[]>([]);
  const [studentClasses, setStudentClasses] = useState<ClassCard[]>([]);
  const [teacherClasses, setTeacherClasses] = useState<ClassCard[]>([]);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { brandName, logoUrl } = useAcademyBrand();
  const { liveClassesEnabled } = useLiveClassesEnabled();
  const { toast } = useToast();
  const [accessCode, setAccessCode] = useState('');
  const [joiningCode, setJoiningCode] = useState(false);
  const [notesDialog, setNotesDialog] = useState<{ classId: string; className: string } | null>(null);
  const [activePanel, setActivePanel] = useState<'none' | 'teacher' | 'student'>(() => {
    const p = searchParams.get('panel');
    return p === 'student' || p === 'teacher' ? p : 'none';
  });
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(() => searchParams.get('teacher'));
  const [showAllNotes, setShowAllNotes] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [feedbackDialog, setFeedbackDialog] = useState<{ classId: string } | null>(null);
  const [showFeedbackPicker, setShowFeedbackPicker] = useState(false);
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);
  const [generatingCert, setGeneratingCert] = useState<string | null>(null);
  // Clean up URL params after reading them
  useEffect(() => {
    if (searchParams.has('panel') || searchParams.has('teacher')) {
      setSearchParams({}, { replace: true });
    }
  }, []);

  const studentClassIds = studentClasses.map(c => c.id);
  const { data: progressMap } = useStudentProgress(studentClassIds, authUserId || null);
  const enrolledTeacherIds = enrolledTeachers.map(t => t.id);
  const { data: studentCourses } = useStudentCourses(enrolledTeacherIds);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/login'); return; }
      setAuthUserId(user.id);

      // Batch 1: Independent queries that only need user.id
      const [userRes, roleRes, teacherRes, enrollRes] = await Promise.all([
        supabase.from('users').select('name, avatar_url').eq('auth_user_id', user.id).maybeSingle(),
        supabase.from('user_roles').select('role').eq('user_id', user.id),
        supabase.from('teachers').select('id').eq('auth_user_id', user.id).eq('is_active', true).maybeSingle(),
        supabase.from('teacher_students').select('teacher_id').eq('student_auth_user_id', user.id).eq('is_active', true),
      ]);

      setUserName(userRes.data?.name || user.email || 'Usuario');
      setUserAvatarUrl(userRes.data?.avatar_url || null);

      const userRoles: UserRole[] = [];
      if (roleRes.data?.some(r => r.role === 'superadmin')) userRoles.push('superadmin');
      if (roleRes.data?.some(r => r.role === 'admin')) userRoles.push('superadmin');
      if (roleRes.data?.some(r => r.role === 'teacher')) userRoles.push('teacher');
      const hasAcademyRole = roleRes.data?.some(r => r.role === 'academy') ?? false;
      setIsAcademy(hasAcademyRole);

      const teacher = teacherRes.data;
      const enrollments = enrollRes.data;

      // Load academies student is enrolled in
      const { data: academyEnrollments } = await supabase
        .from('academy_students')
        .select('academy_id')
        .eq('student_auth_user_id', user.id)
        .eq('is_active', true);

      if (academyEnrollments && academyEnrollments.length > 0) {
        const academyIds = academyEnrollments.map(a => a.academy_id);
        const { data: academyData } = await supabase
          .from('academies')
          .select('id, name, logo_url')
          .in('id', academyIds)
          .eq('is_active', true);
        if (academyData) setEnrolledAcademies(academyData);
      }

      // Batch 2: Queries that depend on teacher + enrollments (run in parallel)
      const tClassesPromise = teacher
        ? supabase
            .from('teacher_classes')
            .select('id, teacher_id, name, cover_image_url, class_type, video_url, external_url, feedback_enabled')
            .eq('teacher_id', teacher.id)
            .eq('is_active', true)
            .order('sort_order', { ascending: true })
            .then(r => r)
        : Promise.resolve({ data: null });

      if (teacher) setTeacherId(teacher.id);

      // Enrolled teachers query
      const filteredIds = enrollments && enrollments.length > 0
        ? (teacher ? enrollments.map(e => e.teacher_id).filter(id => id !== teacher.id) : enrollments.map(e => e.teacher_id))
        : [];

      if (filteredIds.length > 0 && !userRoles.includes('superadmin') && !userRoles.includes('teacher')) {
        userRoles.push('student');
      }

      const teachersPromise = filteredIds.length > 0
        ? supabase.from('teachers').select('id, name, brand_name, avatar_url').in('id', filteredIds).eq('is_active', true).then(r => r)
        : Promise.resolve({ data: null });

      const [tClassesRes, teachersRes] = await Promise.all([tClassesPromise, teachersPromise]);

      if (teacher && tClassesRes.data) {
        setTeacherClasses(tClassesRes.data.map((c: any) => ({ ...c, teacher_name: '', teacher_brand: '', class_type: c.class_type || 'slides', video_url: c.video_url || null, external_url: c.external_url || null, feedback_enabled: !!c.feedback_enabled })));
      }

      if (teachersRes.data && teachersRes.data.length > 0) {
        const teachers = teachersRes.data;
        setEnrolledTeachers(teachers);

        // Batch 3: Student classes + tiktok feed filter
        const { data: classesData } = await supabase
          .from('teacher_classes')
          .select('id, teacher_id, name, cover_image_url, class_type, video_url, external_url, feedback_enabled')
          .in('teacher_id', teachers.map((t: any) => t.id))
          .eq('is_active', true)
          .order('sort_order', { ascending: true });

        if (classesData) {
          const feedClassIds = classesData.filter((c: any) => c.class_type === 'tiktok_feed').map(c => c.id);
          let feedsWithSlides = new Set<string>();
          if (feedClassIds.length > 0) {
            const { data: slidesCounts } = await supabase
              .from('teacher_slides')
              .select('class_id')
              .in('class_id', feedClassIds)
              .eq('is_active', true);
            if (slidesCounts) feedsWithSlides = new Set(slidesCounts.map(s => s.class_id!));
          }
          setStudentClasses(classesData
            .filter((c: any) => c.class_type !== 'tiktok_feed' || feedsWithSlides.has(c.id))
            .map((c: any) => {
              const t = teachers.find((t: any) => t.id === c.teacher_id);
              return { ...c, teacher_name: t?.name || '', teacher_brand: t?.brand_name || '', class_type: c.class_type || 'slides', video_url: c.video_url || null, external_url: c.external_url || null, feedback_enabled: !!c.feedback_enabled };
            }));
        }
      }

      setRoles(userRoles);
      setLoading(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') navigate('/login');
    });
    checkAuth();
    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => { await supabase.auth.signOut(); navigate('/login'); };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Cargando...</div>
      </div>
    );
  }

  const isSuperadmin = roles.includes('superadmin');
  const isTeacher = roles.includes('teacher');
  const initials = userName?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';

  const renderClassCover = (cls: ClassCard) => {
    if (cls.class_type === 'video' && cls.video_url) {
      const thumb = getVideoThumbnail(cls.video_url);
      if (thumb) return (
        <div className="relative w-full h-full">
          <img src={thumb} alt={cls.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-foreground/20 flex items-center justify-center">
            <Play className="h-8 w-8 text-background drop-shadow-lg" />
          </div>
        </div>
      );
    }
    if (cls.cover_image_url) return <img src={cls.cover_image_url} alt={cls.name} className="w-full h-full object-cover" />;
    if (cls.class_type === 'exam') return (
      <div className="w-full h-full bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] flex flex-col items-center justify-center gap-2">
        <FileText className="h-12 w-12 text-primary-foreground drop-shadow-md" />
        <span className="text-sm font-bold text-primary-foreground tracking-wider uppercase drop-shadow-md">Examen</span>
      </div>
    );
    return <span className="text-3xl">{getClassEmoji(cls.class_type)}</span>;
  };

  const renderClassCard = (cls: ClassCard, isTeacherView: boolean) => {
    const label = getClassLabel(cls.class_type);
    return (
      <button
        key={cls.id}
        onClick={() => navigate(`/presentacion/${isTeacherView ? teacherId : cls.teacher_id}/${cls.id}`)}
        className="relative rounded-2xl border bg-card shadow-md hover:shadow-lg hover:border-primary/40 transition-all overflow-hidden text-left group"
      >
        {isTeacherView && (
          <button
            onClick={(e) => { e.stopPropagation(); navigate('/teacher'); }}
            className="absolute top-2 right-2 z-10 bg-background/80 backdrop-blur-sm rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background shadow-sm"
            title="Editar clase"
          >
            <Settings2 className="h-4 w-4 text-foreground" />
          </button>
        )}
        <div className="aspect-video bg-muted flex items-center justify-center">
          {renderClassCover(cls)}
        </div>
        <div className="p-4">
          <p className="font-semibold text-foreground truncate">{cls.name}</p>
          {!isTeacherView && (
            <p className="text-xs text-muted-foreground truncate">by {cls.teacher_brand || cls.teacher_name}</p>
          )}
          {/* Progress bar for student view */}
          {!isTeacherView && progressMap && (() => {
            const p = progressMap.get(cls.id);
            if (!p) return null;
            const pct = p.totalSlides > 0 ? Math.round((p.lastSlide / p.totalSlides) * 100) : 0;
            return (
              <div className="mt-2 space-y-1">
                {p.completed ? (
                  <div className="flex items-center gap-1 text-xs font-medium text-emerald-600">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Completada
                  </div>
                ) : (
                  <>
                    <Progress value={pct} className="h-1.5" />
                    <p className="text-[10px] text-muted-foreground">{pct}% completado</p>
                  </>
                )}
              </div>
            );
          })()}
          <div className="flex items-center justify-between mt-1">
            <p className="text-xs text-primary flex items-center gap-1">{label.icon} {label.text}</p>
            {!isTeacherView && (
              <div className="flex items-center gap-2">
                {cls.feedback_enabled && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setFeedbackDialog({ classId: cls.id }); }}
                    className="text-xs text-yellow-600 hover:text-yellow-700 flex items-center gap-1 font-medium"
                  >
                    <MessageSquare className="h-3 w-3" /> Feedback
                  </button>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); setNotesDialog({ classId: cls.id, className: cls.name }); }}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  <FileText className="h-3 w-3" /> Notas
                </button>
              </div>
            )}
          </div>
        </div>
      </button>
    );
  };

  const getTeacherInitials = (t: TeacherCard) =>
    (t.brand_name || t.name).split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  const classesForTeacher = (tid: string) => studentClasses.filter(c => c.teacher_id === tid && (liveClassesEnabled || c.class_type !== 'live'));
  const selectedTeacher = enrolledTeachers.find(t => t.id === selectedTeacherId);
  const coursesForTeacher = (tid: string) => (studentCourses || []).filter(c => c.teacher_id === tid);
  const classIdsInCourses = new Set((studentCourses || []).flatMap(c => c.classes.map(cl => cl.id)));
  const looseClassesForTeacher = (tid: string) => classesForTeacher(tid).filter(c => !classIdsInCourses.has(c.id));

  const getCourseProgress = (course: CourseWithClasses) => {
    if (!progressMap || course.classes.length === 0) return { completed: 0, total: course.classes.length, allDone: false };
    let completed = 0;
    for (const cls of course.classes) {
      const p = progressMap.get(cls.id);
      if (p?.completed) completed++;
    }
    return { completed, total: course.classes.length, allDone: completed === course.classes.length };
  };

  const handleDownloadCertificate = async (courseId: string) => {
    setGeneratingCert(courseId);
    try {
      const { data, error } = await supabase.functions.invoke('generate-certificate', {
        body: { course_id: courseId },
      });
      if (error) throw error;
      if (data?.certificate_url) {
        window.open(data.certificate_url, '_blank');
      }
    } catch {
      toast({ title: 'Error', description: 'No se pudo generar el certificado.', variant: 'destructive' });
    } finally {
      setGeneratingCert(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto flex items-center justify-between p-3 md:p-4">
          {/* Logo + Title */}
          <div className="flex items-center gap-2 md:gap-3 min-w-0">
            <img src={logoUrl || defaultLogo} alt="Logo" className="h-8 md:h-10 w-auto object-contain flex-shrink-0" />
            <div className="min-w-0">
              <h1 className="text-lg md:text-xl font-bold text-foreground truncate">The Academy 🎓</h1>
              {brandName && <p className="text-xs text-muted-foreground truncate hidden md:block">by {brandName}</p>}
            </div>
          </div>

          {/* Desktop actions */}
          <div className="hidden md:flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate('/guia')} title="Guía de uso">
              <HelpCircle className="mr-1 h-4 w-4" /> Guía
            </Button>
            <UserProfileEditor userId={authUserId} currentName={userName} currentAvatarUrl={userAvatarUrl} onUpdate={(name, avatar) => { setUserName(name); setUserAvatarUrl(avatar); }}>
              <button className="flex items-center gap-2 rounded-full p-1 hover:bg-accent transition-colors">
                <Avatar className="h-8 w-8">
                  {userAvatarUrl && <AvatarImage src={userAvatarUrl} alt={userName} />}
                  <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">{initials}</AvatarFallback>
                </Avatar>
                <Pencil className="h-3 w-3 text-muted-foreground" />
              </button>
            </UserProfileEditor>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" /> Salir
            </Button>
          </div>

          {/* Mobile: avatar + hamburger */}
          <div className="flex md:hidden items-center gap-2">
            <UserProfileEditor userId={authUserId} currentName={userName} currentAvatarUrl={userAvatarUrl} onUpdate={(name, avatar) => { setUserName(name); setUserAvatarUrl(avatar); }}>
              <button className="rounded-full p-0.5 hover:bg-accent transition-colors">
                <Avatar className="h-8 w-8">
                  {userAvatarUrl && <AvatarImage src={userAvatarUrl} alt={userName} />}
                  <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">{initials}</AvatarFallback>
                </Avatar>
              </button>
            </UserProfileEditor>
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-64 p-0">
                <div className="flex flex-col h-full">
                  <div className="p-5 border-b bg-muted/30">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        {userAvatarUrl && <AvatarImage src={userAvatarUrl} alt={userName} />}
                        <AvatarFallback className="text-sm font-bold bg-primary/10 text-primary">{initials}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground truncate">{userName}</p>
                        {brandName && <p className="text-xs text-muted-foreground truncate">by {brandName}</p>}
                      </div>
                    </div>
                  </div>
                  <nav className="flex flex-col gap-1 p-3 flex-1">
                    <Button variant="ghost" className="justify-start gap-3 h-11" onClick={() => { setMenuOpen(false); navigate('/guia'); }}>
                      <HelpCircle className="h-5 w-5" /> Guía de uso
                    </Button>
                    <Button variant="ghost" className="justify-start gap-3 h-11" onClick={() => { setMenuOpen(false); handleLogout(); }}>
                      <LogOut className="h-5 w-5" /> Cerrar sesión
                    </Button>
                  </nav>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
        {/* Mobile brand subtitle */}
        {brandName && (
          <div className="md:hidden text-center pb-2 -mt-1">
            <p className="text-xs text-muted-foreground">by {brandName}</p>
          </div>
        )}
      </header>

      <main className="container mx-auto p-6 space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold text-foreground">¡Hola, {userName}!</h2>
          <p className="text-muted-foreground">Bienvenido a The Academy 🎓</p>
        </div>

        {/* Superadmin buttons */}
        {isSuperadmin && (
          <div className="flex justify-center gap-4 max-w-lg mx-auto">
            <Button size="lg" variant="outline" className="flex-1 gap-2 px-6 py-6 text-base rounded-2xl shadow-lg" onClick={() => navigate('/admin')}>
              <Shield className="h-5 w-5" /> Gestionar Maestros
            </Button>
            <Button size="lg" variant="outline" className="flex-1 gap-2 px-6 py-6 text-base rounded-2xl shadow-lg" onClick={() => navigate('/plataforma')}>
              <Settings className="h-5 w-5" /> Panel Plataforma
            </Button>
          </div>
        )}

        {/* Panel toggle buttons */}
        <div className="flex justify-center gap-4 max-w-lg mx-auto flex-wrap">
          {(isTeacher || isSuperadmin) && teacherId && (
            <button
              onClick={() => { setActivePanel(activePanel === 'teacher' ? 'none' : 'teacher'); setSelectedTeacherId(null); setSelectedAcademyId(null); }}
              className={`flex-1 min-w-[140px] flex flex-col items-center gap-2 rounded-2xl border-2 p-6 transition-all shadow-md hover:shadow-lg ${
                activePanel === 'teacher'
                  ? 'border-primary bg-primary/10 shadow-primary/20'
                  : 'border-border bg-card hover:border-primary/40'
              }`}
            >
              <GraduationCap className={`h-10 w-10 ${activePanel === 'teacher' ? 'text-primary' : 'text-muted-foreground'}`} />
              <span className={`text-lg font-bold ${activePanel === 'teacher' ? 'text-primary' : 'text-foreground'}`}>
                Panel Maestro
              </span>
            </button>
          )}
          {isAcademy && (
            <button
              onClick={() => navigate('/academy')}
              className="flex-1 min-w-[140px] flex flex-col items-center gap-2 rounded-2xl border-2 p-6 transition-all shadow-md hover:shadow-lg border-border bg-card hover:border-violet-500/40"
            >
              <School className="h-10 w-10 text-muted-foreground" />
              <span className="text-lg font-bold text-foreground">Panel Academia</span>
            </button>
          )}
          <button
            onClick={() => { setActivePanel(activePanel === 'student' ? 'none' : 'student'); setSelectedTeacherId(null); setSelectedAcademyId(null); }}
            className={`flex-1 min-w-[140px] flex flex-col items-center gap-2 rounded-2xl border-2 p-6 transition-all shadow-md hover:shadow-lg ${
              activePanel === 'student'
                ? 'border-emerald-500 bg-emerald-500/10 shadow-emerald-500/20'
                : 'border-border bg-card hover:border-emerald-500/40'
            }`}
          >
            <BookOpen className={`h-10 w-10 ${activePanel === 'student' ? 'text-emerald-600' : 'text-muted-foreground'}`} />
            <span className={`text-lg font-bold ${activePanel === 'student' ? 'text-emerald-600' : 'text-foreground'}`}>
              Panel Alumno
            </span>
          </button>
        </div>

        {/* Teacher Panel */}
        {activePanel === 'teacher' && teacherId && (
          <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex justify-center">
              <Button size="lg" className="gap-2 px-8 py-6 text-lg rounded-2xl" onClick={() => navigate('/teacher')}>
                <Settings className="h-6 w-6" /> Panel de Administración de Maestros
              </Button>
            </div>
            {teacherClasses.length > 0 ? (
              <div className="w-full max-w-2xl mx-auto">
                <h3 className="text-lg font-semibold text-foreground mb-4 text-center">Mis Presentaciones</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {teacherClasses.map(cls => renderClassCard(cls, true))}
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-center">
                Crea tu primera clase desde el <button onClick={() => navigate('/teacher')} className="text-primary underline">Panel del Maestro</button>.
              </p>
            )}
          </div>
        )}

        {/* Student Panel */}
        {activePanel === 'student' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
            {/* Back button when viewing a specific teacher's classes */}
            {selectedTeacherId && selectedTeacher ? (
              <div className="w-full max-w-2xl mx-auto space-y-4">
                <button
                  onClick={() => setSelectedTeacherId(null)}
                  className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" /> Mis Maestros
                </button>
                <div className="flex items-center gap-3 mb-4">
                  <Avatar className="h-12 w-12">
                    {selectedTeacher.avatar_url && <AvatarImage src={selectedTeacher.avatar_url} alt={selectedTeacher.brand_name || selectedTeacher.name} />}
                    <AvatarFallback className="text-sm font-bold bg-emerald-500/10 text-emerald-600">
                      {getTeacherInitials(selectedTeacher)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-xl font-bold text-foreground">{selectedTeacher.brand_name || selectedTeacher.name}</h3>
                    {selectedTeacher.brand_name && <p className="text-sm text-muted-foreground">{selectedTeacher.name}</p>}
                  </div>
                </div>
                {/* Courses */}
                {coursesForTeacher(selectedTeacherId).map(course => {
                  const { completed, total, allDone } = getCourseProgress(course);
                  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
                  const isExp = expandedCourse === course.id;
                  const courseClassCards = classesForTeacher(selectedTeacherId).filter(c => course.classes.some(cc => cc.id === c.id));
                  return (
                    <div key={course.id} className="rounded-2xl border bg-card shadow-md overflow-hidden">
                      <button
                        onClick={() => setExpandedCourse(isExp ? null : course.id)}
                        className="w-full text-left p-4 flex items-center gap-3 hover:bg-muted/50 transition-colors"
                      >
                        <Award className="h-6 w-6 text-primary shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-foreground truncate">{course.name}</p>
                          <div className="mt-1.5 space-y-1">
                            {allDone ? (
                              <div className="flex items-center gap-1 text-xs font-medium text-emerald-600">
                                <CheckCircle2 className="h-3.5 w-3.5" /> Curso completado
                              </div>
                            ) : (
                              <>
                                <Progress value={pct} className="h-1.5" />
                                <p className="text-[10px] text-muted-foreground">{completed}/{total} clases • {pct}%</p>
                              </>
                            )}
                          </div>
                        </div>
                        {isExp ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                      </button>
                      {isExp && (
                        <div className="px-4 pb-4 space-y-3">
                          {allDone && (
                            <Button
                              size="sm"
                              className="w-full gap-2"
                              disabled={generatingCert === course.id}
                              onClick={() => handleDownloadCertificate(course.id)}
                            >
                              <Download className="h-4 w-4" />
                              {generatingCert === course.id ? 'Generando...' : '🎓 Descargar Certificado'}
                            </Button>
                          )}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {courseClassCards.map(cls => renderClassCard(cls, false))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                {/* Loose classes */}
                {looseClassesForTeacher(selectedTeacherId).length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {looseClassesForTeacher(selectedTeacherId).map(cls => renderClassCard(cls, false))}
                  </div>
                ) : coursesForTeacher(selectedTeacherId).length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">Este maestro aún no tiene clases disponibles.</p>
                ) : null}
              </div>
            ) : (
              <>
                {/* Global notes & feedback buttons */}
                <div className="flex justify-center gap-3 flex-wrap">
                  <Button
                    size="lg"
                    variant="outline"
                    className="gap-2 px-8 py-5 text-base rounded-2xl shadow-md border-emerald-500/40 hover:bg-emerald-500/10 hover:text-emerald-700"
                    onClick={() => setShowAllNotes(true)}
                  >
                    <FileText className="h-5 w-5" /> 📝 Ver mis notas
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="gap-2 px-8 py-5 text-base rounded-2xl shadow-md border-yellow-500/40 hover:bg-yellow-500/10 hover:text-yellow-700"
                    onClick={() => setShowFeedbackPicker(true)}
                  >
                    <MessageSquare className="h-5 w-5" /> 💬 Ver mis feedbacks
                  </Button>
                </div>

                {/* Join form */}
                <div className="w-full max-w-md mx-auto space-y-3">
                  <h3 className="text-base font-semibold text-foreground text-center">Unirte a un maestro o academia</h3>
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!accessCode.trim() || joiningCode) return;
                      setJoiningCode(true);
                      const code = accessCode.trim().toLowerCase();

                      // First check if it's an academy code
                      const { data: academyMatch } = await supabase.from('academies').select('id, name').eq('access_code', code).eq('is_active', true).maybeSingle();
                      if (academyMatch) {
                        const { data: existingEnroll } = await supabase.from('academy_students').select('id').eq('academy_id', academyMatch.id).eq('student_auth_user_id', authUserId).maybeSingle();
                        if (existingEnroll) { toast({ title: 'Ya inscrito', description: `Ya estás inscrito en ${academyMatch.name}.` }); setAccessCode(''); setJoiningCode(false); return; }
                        await supabase.from('academy_students').insert({ academy_id: academyMatch.id, student_auth_user_id: authUserId });
                        // Auto-enroll in all academy teachers
                        const { data: acTeachers } = await supabase.from('academy_teachers').select('teacher_id').eq('academy_id', academyMatch.id).eq('is_active', true);
                        if (acTeachers && acTeachers.length > 0) {
                          const enrollments = acTeachers.map(at => ({ teacher_id: at.teacher_id, student_auth_user_id: authUserId }));
                          await supabase.from('teacher_students').upsert(enrollments, { onConflict: 'teacher_id,student_auth_user_id' } as any);
                        }
                        toast({ title: '¡Inscrito!', description: `Te has unido a la academia ${academyMatch.name}.` });
                        setAccessCode(''); setJoiningCode(false); window.location.reload();
                        return;
                      }

                      // Then check teacher code
                      const { data: teacher } = await supabase.from('teachers').select('id, name, brand_name').eq('access_code', code).eq('is_active', true).maybeSingle();
                      if (!teacher) { toast({ title: 'Código no válido', description: 'No se encontró un maestro o academia con ese código.', variant: 'destructive' }); setJoiningCode(false); return; }
                      const { data: existing } = await supabase.from('teacher_students').select('id').eq('teacher_id', teacher.id).eq('student_auth_user_id', authUserId).maybeSingle();
                      if (existing) { toast({ title: 'Ya inscrito', description: `Ya estás inscrito con ${teacher.brand_name || teacher.name}.` }); setAccessCode(''); setJoiningCode(false); return; }
                      const { error } = await supabase.from('teacher_students').insert({ teacher_id: teacher.id, student_auth_user_id: authUserId });
                      if (error) { toast({ title: 'Error', description: 'No se pudo completar la inscripción.', variant: 'destructive' }); setJoiningCode(false); return; }
                      toast({ title: '¡Inscrito!', description: `Te has unido a ${teacher.brand_name || teacher.name}.` });
                      setAccessCode(''); setJoiningCode(false); window.location.reload();
                    }}
                    className="flex gap-2"
                  >
                    <Input value={accessCode} onChange={e => setAccessCode(e.target.value)} placeholder="Código de acceso" maxLength={20} className="flex-1" />
                    <Button type="submit" disabled={!accessCode.trim() || joiningCode}>{joiningCode ? 'Uniendo...' : 'Unirme'}</Button>
                  </form>
                </div>

                {/* Enrolled Academies */}
                {enrolledAcademies.length > 0 && (
                  <div className="w-full max-w-2xl mx-auto">
                    <h3 className="text-lg font-semibold text-foreground mb-4 text-center">🏫 Mis Academias</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {enrolledAcademies.map(ac => (
                        <button
                          key={ac.id}
                          onClick={async () => {
                            setSelectedAcademyId(ac.id);
                            // Load teachers for this academy
                            const { data: atData } = await supabase.from('academy_teachers').select('teacher_id').eq('academy_id', ac.id).eq('is_active', true);
                            if (atData && atData.length > 0) {
                              const tIds = atData.map(a => a.teacher_id);
                              const { data: tData } = await supabase.from('teachers').select('id, name, brand_name, avatar_url').in('id', tIds).eq('is_active', true);
                              setAcademyTeachers(tData || []);
                            } else {
                              setAcademyTeachers([]);
                            }
                          }}
                          className="flex flex-col items-center gap-3 rounded-2xl border bg-card p-6 shadow-md hover:shadow-lg hover:border-violet-500/40 transition-all"
                        >
                          <School className="h-12 w-12 text-violet-500" />
                          <span className="font-semibold text-foreground text-center text-sm leading-tight">{ac.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Academy teachers view */}
                {selectedAcademyId && (
                  <div className="w-full max-w-2xl mx-auto space-y-4">
                    <button
                      onClick={() => { setSelectedAcademyId(null); setAcademyTeachers([]); }}
                      className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ArrowLeft className="h-4 w-4" /> Mis Academias
                    </button>
                    <h3 className="text-lg font-semibold text-foreground">Maestros de {enrolledAcademies.find(a => a.id === selectedAcademyId)?.name}</h3>
                    {academyTeachers.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {academyTeachers.map(t => (
                          <button
                            key={t.id}
                            onClick={() => { setSelectedTeacherId(t.id); setSelectedAcademyId(null); }}
                            className="flex flex-col items-center gap-3 rounded-2xl border bg-card p-6 shadow-md hover:shadow-lg hover:border-emerald-500/40 transition-all"
                          >
                            <Avatar className="h-16 w-16">
                              {t.avatar_url && <AvatarImage src={t.avatar_url} alt={t.brand_name || t.name} />}
                              <AvatarFallback className="text-lg font-bold bg-emerald-500/10 text-emerald-600">
                                {getTeacherInitials(t)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-semibold text-foreground text-center text-sm leading-tight">{t.brand_name || t.name}</span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-4">Esta academia aún no tiene maestros.</p>
                    )}
                  </div>
                )}

                {/* Enrolled teachers grid */}
                {enrolledTeachers.length > 0 ? (
                  <div className="w-full max-w-2xl mx-auto">
                    <h3 className="text-lg font-semibold text-foreground mb-4 text-center">Mis Maestros</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {enrolledTeachers.map(t => {
                        const count = classesForTeacher(t.id).length;
                        return (
                          <button
                            key={t.id}
                            onClick={() => setSelectedTeacherId(t.id)}
                            className="flex flex-col items-center gap-3 rounded-2xl border bg-card p-6 shadow-md hover:shadow-lg hover:border-emerald-500/40 transition-all"
                          >
                            <Avatar className="h-16 w-16">
                              {t.avatar_url && <AvatarImage src={t.avatar_url} alt={t.brand_name || t.name} />}
                              <AvatarFallback className="text-lg font-bold bg-emerald-500/10 text-emerald-600">
                                {getTeacherInitials(t)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-semibold text-foreground text-center text-sm leading-tight">{t.brand_name || t.name}</span>
                            {count > 0 && (
                              <span className="text-xs bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-full font-medium">
                                {count} {count === 1 ? 'clase' : 'clases'}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground text-center">Ingresa el código de acceso que te proporcionó tu maestro.</p>
                )}
              </>
            )}
          </div>
        )}

        {notesDialog && (
          <StudentNotesDialog
            open={!!notesDialog}
            onOpenChange={(open) => { if (!open) setNotesDialog(null); }}
            classId={notesDialog.classId}
            className={notesDialog.className}
            authUserId={authUserId}
          />
        )}

        <AllNotesDialog
          open={showAllNotes}
          onOpenChange={setShowAllNotes}
          authUserId={authUserId}
        />

        {feedbackDialog && (
          <FeedbackDialog
            classId={feedbackDialog.classId}
            authUserId={authUserId}
            open={!!feedbackDialog}
            onOpenChange={(open) => { if (!open) setFeedbackDialog(null); }}
          />
        )}

        <Dialog open={showFeedbackPicker} onOpenChange={setShowFeedbackPicker}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>💬 Mis Feedbacks</DialogTitle>
            </DialogHeader>
            {(() => {
              const fbClasses = studentClasses.filter(c => c.feedback_enabled);
              if (fbClasses.length === 0) return <p className="text-sm text-muted-foreground text-center py-4">No hay clases con feedback habilitado.</p>;
              return (
                <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                  {fbClasses.map(cls => (
                    <button
                      key={cls.id}
                      onClick={() => { setShowFeedbackPicker(false); setFeedbackDialog({ classId: cls.id }); }}
                      className="w-full text-left rounded-xl border p-3 hover:bg-yellow-500/10 hover:border-yellow-500/40 transition-all flex items-center gap-3"
                    >
                      <MessageSquare className="h-5 w-5 text-yellow-600 shrink-0" />
                      <div>
                        <p className="font-medium text-sm text-foreground">{cls.name}</p>
                        <p className="text-xs text-muted-foreground">{cls.teacher_brand || cls.teacher_name}</p>
                      </div>
                    </button>
                  ))}
                </div>
              );
            })()}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
