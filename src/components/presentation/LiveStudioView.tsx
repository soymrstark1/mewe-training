import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, MessageCircle, FileText, Radio, Square } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';
import LiveChat from './LiveChat';
import SlideNotes from './SlideNotes';

interface Props {
  classId: string;
  className: string;
  roomName: string;
  authUserId: string;
  onBack: () => void;
}

export default function LiveStudioView({ classId, className, roomName, authUserId, onBack }: Props) {
  const isMobile = useIsMobile();
  const [senderName, setSenderName] = useState('');
  const [activeTab, setActiveTab] = useState('chat');
  const [isLive, setIsLive] = useState(false);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    const loadName = async () => {
      const { data } = await supabase
        .from('users')
        .select('name')
        .eq('auth_user_id', authUserId)
        .maybeSingle();
      setSenderName(data?.name || 'Maestro');
    };
    loadName();
  }, [authUserId]);

  useEffect(() => {
    const loadStatus = async () => {
      const { data } = await supabase
        .from('teacher_classes')
        .select('is_live_active')
        .eq('id', classId)
        .maybeSingle();
      if (data) setIsLive((data as any).is_live_active || false);
    };
    loadStatus();
  }, [classId]);

  const toggleLive = async () => {
    setToggling(true);
    const newState = !isLive;
    const { error } = await supabase
      .from('teacher_classes')
      .update({ is_live_active: newState } as any)
      .eq('id', classId);
    if (error) {
      toast.error('Error al cambiar estado');
    } else {
      setIsLive(newState);
      toast.success(newState ? '🔴 Transmisión iniciada — los estudiantes ya pueden entrar' : 'Transmisión finalizada');
    }
    setToggling(false);
  };

  const handleBack = async () => {
    if (isLive) {
      await supabase.from('teacher_classes').update({ is_live_active: false } as any).eq('id', classId);
    }
    onBack();
  };

  const jitsiUrl = `https://meet.jit.si/${roomName}#config.startWithAudioMuted=true&config.startWithVideoMuted=true&config.prejoinPageEnabled=false`;

  const statusBadge = (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${isLive ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'}`}>
      <span className={`h-2.5 w-2.5 rounded-full ${isLive ? 'bg-destructive animate-pulse' : 'bg-muted-foreground'}`} />
      {isLive ? 'EN VIVO' : 'Pre-aire'}
    </div>
  );

  const broadcastButton = (
    <Button
      onClick={toggleLive}
      disabled={toggling}
      size="sm"
      className={`gap-2 w-full ${isLive
        ? 'bg-muted text-foreground hover:bg-muted/80'
        : 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
      }`}
    >
      {isLive ? <Square className="h-4 w-4" /> : <Radio className="h-4 w-4" />}
      {isLive ? 'Finalizar Transmisión' : 'Comenzar Transmisión'}
    </Button>
  );

  if (isMobile) {
    return (
      <div className="flex flex-col h-screen w-screen bg-background">
        <div className="flex items-center gap-2 p-3 border-b border-border bg-background shrink-0">
          <Button variant="ghost" size="sm" onClick={handleBack} className="gap-1 px-2">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {statusBadge}
            <h1 className="text-sm font-semibold truncate text-foreground">{className}</h1>
          </div>
        </div>

        <div className="w-full" style={{ height: '40vh', touchAction: 'none' }}>
          <iframe src={jitsiUrl} className="w-full h-full border-0" allow="camera;microphone;display-capture;autoplay;clipboard-write" allowFullScreen />
        </div>

        <div className="px-3 py-2 shrink-0">{broadcastButton}</div>

        <div className="flex-1 flex flex-col min-h-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
            <TabsList className="w-full rounded-none border-b border-border shrink-0">
              <TabsTrigger value="chat" className="flex-1 gap-1"><MessageCircle className="h-3.5 w-3.5" /> Chat</TabsTrigger>
              <TabsTrigger value="notes" className="flex-1 gap-1"><FileText className="h-3.5 w-3.5" /> Notas</TabsTrigger>
            </TabsList>
            <TabsContent value="chat" className="flex-1 m-0 min-h-0">
              <LiveChat classId={classId} authUserId={authUserId} senderName={senderName} />
            </TabsContent>
            <TabsContent value="notes" className="flex-1 m-0 min-h-0">
              <SlideNotes classId={classId} slideNumber={1} slideTitle="Clase en Vivo" totalSlides={1} authUserId={authUserId} onClose={() => setActiveTab('chat')} embedded />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    );
  }

  // Desktop
  return (
    <div className="flex flex-col h-screen w-screen bg-background">
      <div className="flex items-center gap-3 px-4 py-2 border-b border-border bg-background shrink-0">
        <Button variant="ghost" size="sm" onClick={handleBack} className="gap-1">
          <ArrowLeft className="h-4 w-4" /> Volver
        </Button>
        <div className="flex items-center gap-2">
          {statusBadge}
          <h1 className="text-base font-semibold text-foreground">{className}</h1>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        <div className="flex-[7] min-w-0">
          <iframe src={jitsiUrl} className="w-full h-full border-0" allow="camera;microphone;display-capture;autoplay;clipboard-write" allowFullScreen />
        </div>

        <div className="flex-[3] border-l border-border flex flex-col min-h-0" style={{ minWidth: 280, maxWidth: 400 }}>
          <div className="p-3 border-b border-border shrink-0">{broadcastButton}</div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 min-h-0">
            <TabsList className="w-full rounded-none border-b border-border shrink-0">
              <TabsTrigger value="chat" className="flex-1 gap-1"><MessageCircle className="h-3.5 w-3.5" /> Chat</TabsTrigger>
              <TabsTrigger value="notes" className="flex-1 gap-1"><FileText className="h-3.5 w-3.5" /> Notas</TabsTrigger>
            </TabsList>
            <TabsContent value="chat" className="flex-1 m-0 min-h-0">
              <LiveChat classId={classId} authUserId={authUserId} senderName={senderName} />
            </TabsContent>
            <TabsContent value="notes" className="flex-1 m-0 min-h-0">
              <SlideNotes classId={classId} slideNumber={1} slideTitle="Clase en Vivo" totalSlides={1} authUserId={authUserId} onClose={() => setActiveTab('chat')} embedded />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
