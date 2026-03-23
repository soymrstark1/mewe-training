import { useState, useCallback, useMemo, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useGestures } from '@/hooks/useGestures';
import { useFullscreen } from '@/hooks/useFullscreen';
import Slide from '@/components/presentation/Slide';
import SlideIndicator from '@/components/presentation/SlideIndicator';
import ActionButtons from '@/components/presentation/ActionButtons';
import ToolModal from '@/components/presentation/ToolModal';
import VideoModal from '@/components/presentation/VideoModal';
import DashboardConfirmation from '@/components/presentation/DashboardConfirmation';
import InteractiveOverlay from '@/components/presentation/InteractiveOverlay';
import SlideNotes from '@/components/presentation/SlideNotes';
import ExamView from '@/components/presentation/ExamView';
import TeacherNotesPanel from '@/components/presentation/TeacherNotesPanel';
import FeedbackDialog from '@/components/presentation/FeedbackDialog';
import FeedbackPromptDialog from '@/components/presentation/FeedbackPromptDialog';
import UrlView from '@/components/presentation/UrlView';
import TikTokFeedView from '@/components/presentation/TikTokFeedView';
import LiveClassView from '@/components/presentation/LiveClassView';
import LiveStudioView from '@/components/presentation/LiveStudioView';
import VideoSlidesView from '@/components/presentation/VideoSlidesView';
import { ActionConfig } from '@/types/presentation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useProgressUpsert } from '@/hooks/useProgressUpsert';

interface SlideData {
  id: string;
  slide_number: number;
  media_url: string | null;
  media_type: string;
  is_active: boolean;
  actions: ActionConfig[];
  title: string;
  content_type: string;
  thumbnail_url?: string | null;
  teacher_notes: string;
}

interface ClassInfo {
  class_type: string;
  video_url: string | null;
  external_url: string | null;
  name: string;
  scheduled_date: string | null;
  teacher_notes: string;
  layout: string;
}

export default function Presentacion() {
  const { isFullscreen, toggleFullscreen } = useFullscreen();
  const navigate = useNavigate();
  const { teacherId, classId } = useParams<{ teacherId: string; classId?: string }>();
  const [slides, setSlides] = useState<SlideData[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [isActionMenuVisible, setIsActionMenuVisible] = useState(false);
  const [toolUrl, setToolUrl] = useState<string | null>(null);
  const [videoState, setVideoState] = useState<{ url: string; label: string; vertical: boolean } | null>(null);
  const [showDashConfirm, setShowDashConfirm] = useState(false);
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [isStudent, setIsStudent] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [canTakeNotes, setCanTakeNotes] = useState(false);
  const [isTeacherOwner, setIsTeacherOwner] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [showTeacherNotes, setShowTeacherNotes] = useState(false);
  const [feedbackEnabled, setFeedbackEnabled] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackPending, setFeedbackPending] = useState(false);
  const [showFeedbackPrompt, setShowFeedbackPrompt] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);

  useEffect(() => {
    const checkStudent = async () => {
      const [{ data: { user } }, teacherRes] = await Promise.all([
        supabase.auth.getUser(),
        teacherId ? supabase.from('teachers').select('auth_user_id').eq('id', teacherId).maybeSingle() : Promise.resolve({ data: null }),
      ]);
      if (!user) { setAuthReady(true); return; }
      setAuthUserId(user.id);
      if (teacherId && teacherRes.data) {
        if (teacherRes.data.auth_user_id === user.id) {
          setIsTeacherOwner(true);
        } else {
          setIsStudent(true);
        }
        setCanTakeNotes(true);
      }
      setAuthReady(true);
    };
    checkStudent();
  }, [teacherId]);

  // Check if student has pending feedback
  useEffect(() => {
    if (!classId || !authUserId || !isStudent || !feedbackEnabled) return;
    const checkFeedback = async () => {
      const { data: qs } = await supabase
        .from('feedback_questions')
        .select('id')
        .eq('class_id', classId)
        .eq('is_active', true);
      if (!qs || qs.length === 0) { setFeedbackPending(false); return; }
      const { data: resps } = await supabase
        .from('feedback_responses')
        .select('id')
        .in('question_id', qs.map(q => q.id))
        .eq('student_auth_user_id', authUserId)
        .limit(1);
      setFeedbackPending(!resps || resps.length === 0);
    };
    checkFeedback();
  }, [classId, authUserId, isStudent, feedbackEnabled]);

  useEffect(() => {
    if (!teacherId) { navigate('/dashboard'); return; }

    const fetchData = async () => {
      if (classId) {
        const { data: cls } = await supabase
          .from('teacher_classes')
          .select('class_type, video_url, external_url, name, scheduled_date, feedback_enabled, teacher_notes, layout')
          .eq('id', classId)
          .maybeSingle();
        if (cls) {
          setFeedbackEnabled(!!(cls as any).feedback_enabled);
          setClassInfo({
            class_type: (cls as any).class_type || 'slides',
            video_url: (cls as any).video_url || null,
            external_url: (cls as any).external_url || null,
            name: cls.name,
            scheduled_date: (cls as any).scheduled_date || null,
            teacher_notes: (cls as any).teacher_notes || '',
            layout: (cls as any).layout || 'video-top',
          });

          const ct = (cls as any).class_type || 'slides';
          if (ct !== 'slides' && ct !== 'tiktok_feed' && ct !== 'video_slides') {
            setLoading(false);
            return;
          }
        }
      }

      let query = supabase
        .from('teacher_slides')
        .select('id, slide_number, media_url, media_type, is_active, title, content_type, thumbnail_url, teacher_notes')
        .eq('teacher_id', teacherId)
        .eq('is_active', true);
      if (classId) query = query.eq('class_id', classId);
      const { data: slideData } = await query.order('slide_number', { ascending: true });

      if (!slideData || slideData.length === 0) {
        setSlides([]);
        setLoading(false);
        return;
      }

      const slideIds = slideData.map(s => s.id);
      const { data: actionsData } = await supabase
        .from('slide_actions')
        .select('*')
        .in('slide_id', slideIds)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      const enrichedSlides: SlideData[] = slideData.map(s => ({
        ...s,
        content_type: (s as any).content_type || 'slide',
        teacher_notes: (s as any).teacher_notes || '',
        actions: (actionsData || [])
          .filter(a => a.slide_id === s.id)
          .map(a => ({
            type: a.action_type === 'question' ? 'question' as const : undefined,
            key: a.action_type === 'question' ? a.id : undefined,
            text: a.action_type === 'question' ? a.label : undefined,
            web: a.action_type === 'web' ? (a.url || undefined) : undefined,
            tool: a.action_type === 'tool' ? (a.url || undefined) : undefined,
            video: a.action_type === 'video' ? (a.url || undefined) : undefined,
            videoLabel: a.action_type === 'video' ? a.label : undefined,
            videoVertical: a.action_type === 'video' ? a.is_vertical : undefined,
            dashboard: a.action_type === 'dashboard' ? true : undefined,
            _emoji: a.emoji,
            _label: a.label,
            _actionType: a.action_type,
          })),
      }));

      setSlides(enrichedSlides);
      setLoading(false);
    };
    fetchData();
  }, [teacherId, classId, navigate]);

  const totalSteps = slides.length;

  const { upsertProgress, upsertImmediate } = useProgressUpsert(classId, authUserId, isStudent);

  // Track progress on slide change
  useEffect(() => {
    if (slides.length > 0 && currentStep >= 0) {
      const isCompleted = currentStep >= totalSteps - 1;
      upsertProgress(currentStep, totalSteps, isCompleted);
    }
  }, [currentStep, totalSteps, slides.length, upsertProgress]);
  const actualGoBack = useCallback(() => {
    if (teacherId) {
      navigate(`/dashboard?panel=student&teacher=${teacherId}`);
    } else {
      navigate('/dashboard');
    }
  }, [navigate, teacherId]);

  const goBack = useCallback(() => {
    if (feedbackEnabled && isStudent && feedbackPending) {
      setPendingNavigation(() => actualGoBack);
      setShowFeedbackPrompt(true);
      return;
    }
    actualGoBack();
  }, [feedbackEnabled, isStudent, feedbackPending, actualGoBack]);

  const nextStep = useCallback(() => {
    setCurrentStep(prev => {
      if (prev + 1 >= totalSteps) {
        // About to leave - check feedback
        if (feedbackEnabled && isStudent && feedbackPending) {
          setPendingNavigation(() => actualGoBack);
          setShowFeedbackPrompt(true);
          return prev;
        }
        actualGoBack();
        return prev;
      }
      setIsActionMenuVisible(false);
      return prev + 1;
    });
  }, [totalSteps, actualGoBack, feedbackEnabled, isStudent, feedbackPending]);

  const prevStep = useCallback(() => {
    setCurrentStep(prev => {
      if (prev > 0) { setIsActionMenuVisible(false); return prev - 1; }
      return prev;
    });
  }, []);

  const toggleActionMenu = useCallback(() => setIsActionMenuVisible(prev => !prev), []);
  const hideActionMenu = useCallback(() => setIsActionMenuVisible(false), []);

  useGestures({ onNext: nextStep, onPrev: prevStep, onShowMenu: toggleActionMenu, onHideMenu: hideActionMenu, disabled: isZoomed });

  const currentSlide = slides[currentStep] || null;
  const currentActions = currentSlide?.actions || [];

  const currentActionConfig: ActionConfig | undefined = useMemo(() => {
    if (!currentActions.length) return undefined;
    const questionAction = currentActions.find((a: any) => a._actionType === 'question');
    if (questionAction) return questionAction;
    const config: ActionConfig = {};
    currentActions.forEach((a: any, i: number) => {
      const suffix = i === 0 ? '' : String(i + 1);
      if (a._actionType === 'web') (config as any)[`web${suffix}`] = a.web;
      else if (a._actionType === 'tool') (config as any)[`tool${suffix}`] = a.tool;
      else if (a._actionType === 'video') { (config as any)[`video${suffix}`] = a.video; (config as any)[`videoLabel${suffix}`] = a.videoLabel; (config as any)[`videoVertical${suffix}`] = a.videoVertical; }
      else if (a._actionType === 'dashboard') config.dashboard = true;
    });
    return Object.keys(config).length > 0 ? config : undefined;
  }, [currentActions]);

  const answerQuestion = useCallback((key: string, answer: string) => {
    localStorage.setItem(`mewe_answer_${key}`, answer);
    setTimeout(() => nextStep(), 500);
  }, [nextStep]);

  const handleFeedbackSubmitted = useCallback(() => {
    setFeedbackPending(false);
  }, []);

  if (loading || !authReady) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Cargando...</div>
      </div>
    );
  }

  // Feedback dialogs (rendered for ALL class types)
  const feedbackDialogs = (
    <>
      {feedbackEnabled && isStudent && classId && authUserId && (
        <FeedbackDialog classId={classId} authUserId={authUserId} open={showFeedback} onOpenChange={setShowFeedback} onSubmitted={handleFeedbackSubmitted} />
      )}
      <FeedbackPromptDialog
        open={showFeedbackPrompt}
        onOpenChange={setShowFeedbackPrompt}
        onFillFeedback={() => {
          setShowFeedbackPrompt(false);
          setShowFeedback(true);
        }}
        onSkip={() => {
          setShowFeedbackPrompt(false);
          if (pendingNavigation) pendingNavigation();
        }}
      />
    </>
  );

  // VIDEO type
  if (classInfo?.class_type === 'video') {
    if (!classInfo.video_url) {
      return (
        <div className="flex h-screen w-screen flex-col items-center justify-center gap-4 bg-background">
          <p className="text-muted-foreground">Este video aún no tiene URL configurada.</p>
          <Button variant="outline" onClick={goBack} className="gap-2"><ArrowLeft className="h-4 w-4" /> Volver</Button>
          {feedbackDialogs}
        </div>
      );
    }
    return (
      <>
        <VideoModal
          videoUrl={classInfo.video_url}
          label={classInfo.name}
          vertical={false}
          onClose={actualGoBack}
          classId={classId}
          authUserId={authUserId || undefined}
          isStudent={canTakeNotes}
          teacherNotes={classInfo.teacher_notes}
        />
        {feedbackDialogs}
      </>
    );
  }

  // URL type
  if (classInfo?.class_type === 'url') {
    if (!classInfo.external_url) {
      return (
        <div className="flex h-screen w-screen flex-col items-center justify-center gap-4 bg-background">
          <p className="text-muted-foreground">Esta página aún no tiene URL configurada.</p>
          <Button variant="outline" onClick={goBack} className="gap-2"><ArrowLeft className="h-4 w-4" /> Volver</Button>
          {feedbackDialogs}
        </div>
      );
    }
    return (
      <>
        <UrlView url={classInfo.external_url} name={classInfo.name} onBack={actualGoBack} classId={classId} authUserId={authUserId || undefined} isStudent={canTakeNotes} teacherNotes={classInfo.teacher_notes} />
        {feedbackDialogs}
      </>
    );
  }

  // TIKTOK FEED type
  if (classInfo?.class_type === 'tiktok_feed') {
    const feedVideos = slides
      .filter(s => s.media_url)
      .map(s => ({ id: s.id, slide_number: s.slide_number, media_url: s.media_url!, title: s.title, thumbnail_url: s.thumbnail_url }));
    if (feedVideos.length === 0) {
      return (
        <div className="flex h-screen w-screen flex-col items-center justify-center gap-4 bg-background">
          <p className="text-muted-foreground">No hay videos disponibles en este feed.</p>
          <Button variant="outline" onClick={goBack} className="gap-2"><ArrowLeft className="h-4 w-4" /> Volver</Button>
          {feedbackDialogs}
        </div>
      );
    }
    return (
      <>
        <TikTokFeedView
          videos={feedVideos}
          onBack={goBack}
          classId={classId}
          authUserId={authUserId || undefined}
          canTakeNotes={canTakeNotes}
        />
        {feedbackDialogs}
      </>
    );
  }

  // VIDEO_SLIDES type
  if (classInfo?.class_type === 'video_slides' && classId) {
    if (!classInfo.video_url) {
      return (
        <div className="flex h-screen w-screen flex-col items-center justify-center gap-4 bg-background">
          <p className="text-muted-foreground">Este video aún no tiene URL configurada.</p>
          <Button variant="outline" onClick={goBack} className="gap-2"><ArrowLeft className="h-4 w-4" /> Volver</Button>
          {feedbackDialogs}
        </div>
      );
    }
    return (
      <>
        <VideoSlidesView
          classId={classId}
          className={classInfo.name}
          videoUrl={classInfo.video_url}
          slides={slides}
          authUserId={authUserId || undefined}
          canTakeNotes={canTakeNotes}
          isStudent={isStudent}
          teacherNotes={classInfo.teacher_notes}
          layout={classInfo.layout}
          onBack={actualGoBack}
        />
        {feedbackDialogs}
      </>
    );
  }

  // LIVE type
  if (classInfo?.class_type === 'live' && classId && authUserId) {
    const roomName = classInfo.external_url || `mewe-live-${classId}`;
    if (isTeacherOwner) {
      return (
        <>
          <LiveStudioView
            classId={classId}
            className={classInfo.name}
            roomName={roomName}
            authUserId={authUserId}
            onBack={goBack}
          />
          {feedbackDialogs}
        </>
      );
    }
    return (
      <>
        <LiveClassView
          classId={classId}
          className={classInfo.name}
          roomName={roomName}
          authUserId={authUserId}
          canTakeNotes={canTakeNotes}
          onBack={goBack}
          scheduledDate={classInfo.scheduled_date}
        />
        {feedbackDialogs}
      </>
    );
  }

  // EXAM type
  if (classInfo?.class_type === 'exam' && classId && authUserId) {
    return (
      <>
        <ExamView classId={classId} className={classInfo.name} authUserId={authUserId} isStudent={isStudent} onBack={goBack} />
        {feedbackDialogs}
      </>
    );
  }

  // SLIDES type (default)
  if (slides.length === 0) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center gap-4 bg-background">
        <p className="text-muted-foreground">No hay diapositivas disponibles.</p>
        <button className="text-primary hover:underline" onClick={goBack}>Volver al Dashboard</button>
        {feedbackDialogs}
      </div>
    );
  }

  const currentTeacherNotes = currentSlide?.teacher_notes || '';
  const hasTeacherNotes = currentTeacherNotes.length > 0;

  return (
    <div className="relative h-screen w-screen overflow-hidden flex flex-col" style={{ backgroundColor: 'hsl(var(--slide-background))' }}>
      {/* Slide area */}
      <div className={`relative ${showTeacherNotes && hasTeacherNotes ? 'h-[55vh] md:h-[62vh]' : 'h-full'} w-full transition-all duration-300 overflow-hidden`}>
        {slides.map((slide, i) => (
          <Slide
            key={slide.id}
            slideNumber={slide.slide_number}
            backgroundImage={slide.content_type === 'slide' ? (slide.media_url || undefined) : undefined}
            isActive={currentStep === i}
            contentType={slide.content_type}
            mediaUrl={slide.media_url || undefined}
            onZoomChange={currentStep === i ? setIsZoomed : undefined}
          />
        ))}
      </div>

      {/* Bottom panels: teacher notes + student notes side by side on desktop */}
      {showTeacherNotes && hasTeacherNotes && (
        <div className={`flex-1 min-h-0 flex ${showNotes && canTakeNotes && classId && authUserId && currentSlide ? 'flex-col md:flex-row' : ''}`}>
          <div className={`${showNotes && canTakeNotes && classId && authUserId && currentSlide ? 'flex-1 md:w-1/2' : 'w-full'} min-h-0 overflow-hidden`}>
            <TeacherNotesPanel
              notes={currentTeacherNotes}
              slideNumber={currentSlide?.slide_number || 0}
              slideTitle={currentSlide?.title || undefined}
              onClose={() => setShowTeacherNotes(false)}
            />
          </div>
          {showNotes && canTakeNotes && classId && authUserId && currentSlide && (
            <div className="flex-1 md:w-1/2 min-h-0 overflow-hidden border-l border-border">
              <SlideNotes
                classId={classId}
                slideNumber={currentSlide.slide_number}
                slideTitle={currentSlide.title || undefined}
                totalSlides={totalSteps}
                authUserId={authUserId}
                onClose={() => setShowNotes(false)}
                embedded
              />
            </div>
          )}
        </div>
      )}

      <SlideIndicator currentStep={currentStep} totalSlides={totalSteps} />

      <ActionButtons
        config={currentActionConfig || {}}
        isVisible={isActionMenuVisible}
        onToggle={toggleActionMenu}
        onOpenTool={url => setToolUrl(url)}
        onOpenVideo={(url, label, vertical) => setVideoState({ url, label, vertical })}
        onDashboard={() => setShowDashConfirm(true)}
        onBack={goBack}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
        onOpenNotes={canTakeNotes && classId ? () => setShowNotes(prev => !prev) : undefined}
        onOpenFeedback={feedbackEnabled && isStudent && classId && authUserId ? () => setShowFeedback(true) : undefined}
        feedbackPending={feedbackPending}
        onToggleTeacherNotes={hasTeacherNotes ? () => setShowTeacherNotes(prev => !prev) : undefined}
        teacherNotesActive={showTeacherNotes}
      />

      {/* Student notes as side panel when teacher notes are NOT shown */}
      {!showTeacherNotes && showNotes && canTakeNotes && classId && authUserId && currentSlide && (
        <SlideNotes
          classId={classId}
          slideNumber={currentSlide.slide_number}
          slideTitle={currentSlide.title || undefined}
          totalSlides={totalSteps}
          authUserId={authUserId}
          onClose={() => setShowNotes(false)}
        />
      )}

      {currentActionConfig?.type === 'question' && currentActionConfig.key && currentActionConfig.text && (
        <InteractiveOverlay questionText={currentActionConfig.text} questionKey={currentActionConfig.key} onAnswer={answerQuestion} />
      )}

      {toolUrl && <ToolModal url={toolUrl} onClose={() => setToolUrl(null)} />}
      {videoState && <VideoModal videoUrl={videoState.url} label={videoState.label} vertical={videoState.vertical} onClose={() => setVideoState(null)} classId={classId} authUserId={authUserId || undefined} isStudent={canTakeNotes} />}
      {showDashConfirm && <DashboardConfirmation onConfirm={actualGoBack} onCancel={() => setShowDashConfirm(false)} />}

      {feedbackDialogs}
    </div>
  );
}
