import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, MessageCircle, FileText, Clock } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import LiveChat from './LiveChat';
import SlideNotes from './SlideNotes';

interface Props {
  classId: string;
  className: string;
  roomName: string;
  authUserId: string;
  canTakeNotes: boolean;
  onBack: () => void;
  scheduledDate?: string | null;
}

export default function LiveClassView({ classId, className, roomName, authUserId, canTakeNotes, onBack, scheduledDate }: Props) {
  const isMobile = useIsMobile();
  const [senderName, setSenderName] = useState('');
  const [activeTab, setActiveTab] = useState('chat');
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const loadName = async () => {
      const { data } = await supabase
        .from('users')
        .select('name')
        .eq('auth_user_id', authUserId)
        .maybeSingle();
      setSenderName(data?.name || 'Anónimo');
    };
    loadName();
  }, [authUserId]);

  // Load initial status + subscribe to realtime changes
  useEffect(() => {
    const loadStatus = async () => {
      const { data } = await supabase
        .from('teacher_classes')
        .select('is_live_active')
        .eq('id', classId)
        .maybeSingle();
      if (data) setIsLiveActive((data as any).is_live_active || false);
      setChecking(false);
    };
    loadStatus();

    const channel = supabase
      .channel(`live-class-${classId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'teacher_classes', filter: `id=eq.${classId}` },
        (payload) => {
          const newData = payload.new as any;
          if (typeof newData.is_live_active === 'boolean') {
            setIsLiveActive(newData.is_live_active);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [classId]);

  if (checking) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Verificando estado...</div>
      </div>
    );
  }

  // Waiting room when class is not live
  if (!isLiveActive) {
    const formattedDate = scheduledDate
      ? new Date(scheduledDate).toLocaleString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      : null;

    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center gap-6 bg-background p-6">
        <div className="flex flex-col items-center gap-4 text-center max-w-md">
          <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center">
            <Clock className="h-10 w-10 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">{className}</h1>
          <p className="text-muted-foreground">La clase aún no ha comenzado. Espera a que el maestro inicie la transmisión.</p>
          {formattedDate && (
            <div className="bg-muted px-4 py-2 rounded-lg">
              <p className="text-sm font-medium text-foreground">📅 Programada: {formattedDate}</p>
            </div>
          )}
          <div className="flex items-center gap-2 mt-2">
            <span className="h-2 w-2 rounded-full bg-muted-foreground animate-pulse" />
            <span className="text-xs text-muted-foreground">Esperando al maestro...</span>
          </div>
        </div>
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Volver
        </Button>
      </div>
    );
  }

  // Active class view
  const jitsiUrl = `https://meet.jit.si/${roomName}#config.startWithAudioMuted=true&config.startWithVideoMuted=true&config.prejoinPageEnabled=false`;

  if (isMobile) {
    return (
      <div className="flex flex-col h-screen w-screen bg-background">
        <div className="flex items-center gap-2 p-3 border-b border-border bg-background shrink-0">
          <Button variant="ghost" size="sm" onClick={onBack} className="gap-1 px-2">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-destructive animate-pulse text-lg">●</span>
            <h1 className="text-sm font-semibold truncate text-foreground">{className}</h1>
          </div>
        </div>

        <div className="w-full" style={{ height: '50vh', touchAction: 'none' }}>
          <iframe src={jitsiUrl} className="w-full h-full border-0" allow="camera;microphone;display-capture;autoplay;clipboard-write" allowFullScreen />
        </div>

        <div className="flex-1 flex flex-col min-h-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
            <TabsList className="w-full rounded-none border-b border-border shrink-0">
              <TabsTrigger value="chat" className="flex-1 gap-1"><MessageCircle className="h-3.5 w-3.5" /> Chat</TabsTrigger>
              {canTakeNotes && <TabsTrigger value="notes" className="flex-1 gap-1"><FileText className="h-3.5 w-3.5" /> Notas</TabsTrigger>}
            </TabsList>
            <TabsContent value="chat" className="flex-1 m-0 min-h-0">
              <LiveChat classId={classId} authUserId={authUserId} senderName={senderName} />
            </TabsContent>
            {canTakeNotes && (
              <TabsContent value="notes" className="flex-1 m-0 min-h-0">
                <SlideNotes classId={classId} slideNumber={1} slideTitle="Clase en Vivo" totalSlides={1} authUserId={authUserId} onClose={() => setActiveTab('chat')} embedded />
              </TabsContent>
            )}
          </Tabs>
        </div>
      </div>
    );
  }

  // Desktop
  return (
    <div className="flex flex-col h-screen w-screen bg-background">
      <div className="flex items-center gap-3 px-4 py-2 border-b border-border bg-background shrink-0">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1">
          <ArrowLeft className="h-4 w-4" /> Volver
        </Button>
        <div className="flex items-center gap-2">
          <span className="text-destructive animate-pulse text-lg">●</span>
          <h1 className="text-base font-semibold text-foreground">{className}</h1>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        <div className="flex-[7] min-w-0">
          <iframe src={jitsiUrl} className="w-full h-full border-0" allow="camera;microphone;display-capture;autoplay;clipboard-write" allowFullScreen />
        </div>

        <div className="flex-[3] border-l border-border flex flex-col min-h-0" style={{ minWidth: 280, maxWidth: 400 }}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
            <TabsList className="w-full rounded-none border-b border-border shrink-0">
              <TabsTrigger value="chat" className="flex-1 gap-1"><MessageCircle className="h-3.5 w-3.5" /> Chat</TabsTrigger>
              {canTakeNotes && <TabsTrigger value="notes" className="flex-1 gap-1"><FileText className="h-3.5 w-3.5" /> Notas</TabsTrigger>}
            </TabsList>
            <TabsContent value="chat" className="flex-1 m-0 min-h-0">
              <LiveChat classId={classId} authUserId={authUserId} senderName={senderName} />
            </TabsContent>
            {canTakeNotes && (
              <TabsContent value="notes" className="flex-1 m-0 min-h-0">
                <SlideNotes classId={classId} slideNumber={1} slideTitle="Clase en Vivo" totalSlides={1} authUserId={authUserId} onClose={() => setActiveTab('chat')} embedded />
              </TabsContent>
            )}
          </Tabs>
        </div>
      </div>
    </div>
  );
}
