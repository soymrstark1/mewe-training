import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Maximize2, Minimize2, Printer } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  authUserId: string;
}

interface NoteEntry {
  slide_number: number;
  note_text: string;
}

interface ClassGroup {
  class_id: string;
  class_name: string;
  notes: NoteEntry[];
}

interface TeacherGroup {
  teacher_id: string;
  teacher_name: string;
  classes: ClassGroup[];
}

export default function AllNotesDialog({ open, onOpenChange, authUserId }: Props) {
  const [grouped, setGrouped] = useState<TeacherGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!open || !authUserId) return;
    setLoading(true);

    const load = async () => {
      const { data: notes } = await supabase
        .from('student_notes')
        .select('class_id, slide_number, note_text')
        .eq('student_auth_user_id', authUserId)
        .order('slide_number', { ascending: true });

      if (!notes || notes.length === 0) {
        setGrouped([]);
        setLoading(false);
        return;
      }

      const classIds = [...new Set(notes.map(n => n.class_id))];
      const { data: classes } = await supabase
        .from('teacher_classes')
        .select('id, name, teacher_id')
        .in('id', classIds);

      const teacherIds = [...new Set((classes || []).map(c => c.teacher_id))];
      const { data: teachers } = await supabase
        .from('teachers')
        .select('id, name, brand_name')
        .in('id', teacherIds);

      const teacherMap = new Map<string, string>();
      teachers?.forEach(t => teacherMap.set(t.id, t.brand_name || t.name));

      const classInfo = new Map<string, { name: string; teacher_id: string }>();
      classes?.forEach(c => classInfo.set(c.id, { name: c.name, teacher_id: c.teacher_id }));

      // Build hierarchy: teacher > class > notes
      const teacherGroupMap = new Map<string, TeacherGroup>();

      notes.forEach(n => {
        const ci = classInfo.get(n.class_id);
        const tid = ci?.teacher_id || 'unknown';
        const tName = teacherMap.get(tid) || 'Maestro';
        const cName = ci?.name || 'Clase sin nombre';

        if (!teacherGroupMap.has(tid)) {
          teacherGroupMap.set(tid, { teacher_id: tid, teacher_name: tName, classes: [] });
        }
        const tg = teacherGroupMap.get(tid)!;
        let cg = tg.classes.find(c => c.class_id === n.class_id);
        if (!cg) {
          cg = { class_id: n.class_id, class_name: cName, notes: [] };
          tg.classes.push(cg);
        }
        cg.notes.push({ slide_number: n.slide_number, note_text: n.note_text });
      });

      setGrouped(Array.from(teacherGroupMap.values()));
      setLoading(false);
    };

    load();
  }, [open, authUserId]);

  const totalNotes = grouped.reduce((sum, t) => sum + t.classes.reduce((s, c) => s + c.notes.length, 0), 0);
  const totalClasses = grouped.reduce((sum, t) => sum + t.classes.length, 0);

  const esc = (s: string) => s.replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const printStyles = `
    body { font-family: system-ui, sans-serif; padding: 2rem; max-width: 700px; margin: 0 auto; color: #333; }
    h1 { font-size: 1.5rem; margin-bottom: 0.5rem; }
    h2 { font-size: 1.2rem; color: #333; margin-top: 2rem; border-bottom: 2px solid #333; padding-bottom: 0.5rem; }
    h3 { font-size: 1rem; color: #555; margin-top: 1.5rem; }
    .note { margin: 0.75rem 0; page-break-inside: avoid; }
    .note-label { font-size: 0.85rem; color: #888; margin-bottom: 0.25rem; }
    .note-text { white-space: pre-wrap; line-height: 1.6; }
    .stats { font-size: 0.9rem; color: #666; margin-bottom: 2rem; }
  `;

  const renderNotesHtml = (notes: NoteEntry[]) =>
    notes.map(n => `
      <div class="note">
        <div class="note-label">Diapositiva ${n.slide_number}</div>
        <div class="note-text">${esc(n.note_text)}</div>
      </div>
    `).join('<hr style="border:none;border-top:1px solid #eee;margin:0.5rem 0"/>');

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>Mis Notas - The Academy</title><style>${printStyles}</style></head><body>
      <h1>📝 Mis Notas — The Academy</h1>
      <p class="stats">${totalNotes} nota${totalNotes !== 1 ? 's' : ''} en ${totalClasses} clase${totalClasses !== 1 ? 's' : ''}</p>
      ${grouped.map(t => `
        <h2>👨‍🏫 ${esc(t.teacher_name)}</h2>
        ${t.classes.map(c => `<h3>📚 ${esc(c.class_name)}</h3>${renderNotesHtml(c.notes)}`).join('')}
      `).join('')}
      </body></html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handlePrintClass = (teacherName: string, cg: ClassGroup) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>${esc(cg.class_name)} - Notas</title><style>${printStyles}</style></head><body>
      <h1>📝 ${esc(cg.class_name)}</h1>
      <p class="stats">👨‍🏫 ${esc(teacherName)} · ${cg.notes.length} nota${cg.notes.length !== 1 ? 's' : ''}</p>
      ${renderNotesHtml(cg.notes)}
      </body></html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={
          expanded
            ? 'max-w-4xl w-full h-[90vh] overflow-y-auto transition-all'
            : 'max-w-lg max-h-[80vh] overflow-y-auto transition-all'
        }
      >
        <DialogHeader>
          <div className="flex items-center justify-between pr-6">
            <DialogTitle>📝 Todas mis Notas</DialogTitle>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handlePrint} disabled={grouped.length === 0} title="Imprimir">
                <Printer className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setExpanded(e => !e)} title={expanded ? 'Contraer' : 'Expandir'}>
                {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </DialogHeader>

        {loading ? (
          <p className="text-muted-foreground text-sm animate-pulse py-8 text-center">Cargando notas...</p>
        ) : grouped.length === 0 ? (
          <div className="text-center py-12 space-y-2">
            <p className="text-3xl">📭</p>
            <p className="text-muted-foreground text-sm">Aún no tienes notas.</p>
            <p className="text-muted-foreground text-xs">Toma notas durante las clases y las verás aquí.</p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground text-center">
              {totalNotes} nota{totalNotes !== 1 ? 's' : ''} en {totalClasses} clase{totalClasses !== 1 ? 's' : ''} de {grouped.length} maestro{grouped.length !== 1 ? 's' : ''}
            </p>
            <Accordion type="multiple" className="w-full">
              {grouped.map(t => (
                <AccordionItem key={t.teacher_id} value={t.teacher_id}>
                  <AccordionTrigger className="text-sm font-semibold">
                    <span className="flex items-center gap-2">
                      👨‍🏫 {t.teacher_name}
                      <span className="text-xs font-normal text-muted-foreground">
                        ({t.classes.reduce((s, c) => s + c.notes.length, 0)} nota{t.classes.reduce((s, c) => s + c.notes.length, 0) !== 1 ? 's' : ''})
                      </span>
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <Accordion type="multiple" className="w-full pl-2">
                      {t.classes.map(c => (
                        <AccordionItem key={c.class_id} value={c.class_id}>
                          <AccordionTrigger className="text-sm">
                            <span className="flex items-center gap-2">
                              📚 {c.class_name}
                              <span className="text-xs font-normal text-muted-foreground">
                                ({c.notes.length})
                              </span>
                              <Button variant="ghost" size="icon" className="h-6 w-6 ml-1" title={`Imprimir notas de ${c.class_name}`} onClick={(e) => { e.stopPropagation(); handlePrintClass(t.teacher_name, c); }}>
                                <Printer className="h-3.5 w-3.5" />
                              </Button>
                            </span>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-3 pt-1">
                              {c.notes.map(n => (
                                <div key={n.slide_number} className="rounded-lg border bg-muted/30 p-3 space-y-1">
                                  <p className="text-xs font-medium text-muted-foreground">Diapositiva {n.slide_number}</p>
                                  <p className="text-sm whitespace-pre-wrap text-foreground">{n.note_text}</p>
                                </div>
                              ))}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
