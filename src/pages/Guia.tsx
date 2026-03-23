import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ArrowLeft, GraduationCap, BookOpen, ExternalLink } from 'lucide-react';
import defaultLogo from '@/assets/mewe-logo.png';
import { useAcademyBrand } from '@/hooks/useAcademyBrand';
import { supabase } from '@/integrations/supabase/client';

export default function Guia() {
  const navigate = useNavigate();
  const [isTeacher, setIsTeacher] = useState(false);
  const { logoUrl } = useAcademyBrand();

  useEffect(() => {
    const checkRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .in('role', ['teacher', 'superadmin', 'admin']);
      if (data && data.length > 0) setIsTeacher(true);
    };
    checkRole();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <img src={logoUrl || defaultLogo} alt="Logo" className="h-10 w-auto object-contain" />
            <h1 className="text-xl font-bold text-foreground">Guía de Uso 📖</h1>
          </div>
          <Button variant="outline" onClick={() => navigate('/dashboard')} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Volver
          </Button>
        </div>
      </header>

      <main className="container mx-auto p-6 max-w-3xl space-y-10">
        <div className="text-center space-y-3">
          <h2 className="text-2xl font-bold text-foreground">¡Bienvenido a The Academy! 🎓</h2>
          <p className="text-muted-foreground text-lg">
            Esta guía te ayudará paso a paso a usar la plataforma. Es muy fácil, ¡ya verás!
          </p>
        </div>

        {/* FOR TEACHERS — only visible to teachers/admins */}
        {isTeacher && <TeacherGuide />}

        {/* FOR STUDENTS — visible to everyone */}
        <StudentGuide />

        <div className="text-center space-y-2 py-6 border-t">
          <p className="text-muted-foreground">¿Necesitas más ayuda? 🤝</p>
          <p className="text-sm text-muted-foreground">Contacta a tu administrador de la plataforma para soporte adicional.</p>
        </div>
      </main>
    </div>
  );
}

function TeacherGuide() {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
          <GraduationCap className="h-7 w-7 text-primary" />
        </div>
        <h3 className="text-2xl font-bold text-foreground">Para Maestros</h3>
      </div>

      <Accordion type="single" collapsible className="space-y-2">
        {/* 1 — Panel de maestro */}
        <AccordionItem value="t1" className="rounded-xl border bg-card px-4 shadow-sm">
          <AccordionTrigger className="text-base font-semibold hover:no-underline">
            1️⃣ ¿Cómo entro a mi panel de maestro?
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground space-y-3 pb-4">
            <p>Cuando inicias sesión, verás tu <strong>Dashboard</strong> (pantalla principal). Si eres maestro, aparecerá un botón grande que dice <strong>"Panel Maestro"</strong>.</p>
            <div className="rounded-lg bg-muted p-4 text-sm">
              <p>📱 <strong>En el teléfono:</strong> Abre el menú de hamburguesa (☰) arriba a la derecha para encontrar todas las opciones.</p>
              <p>💻 <strong>En la computadora:</strong> Aparece junto al botón "Panel Alumno".</p>
            </div>
            <p>👉 Haz clic en <strong>"Panel Maestro"</strong> y entrarás a tu espacio donde puedes crear clases, ver estudiantes y más.</p>
          </AccordionContent>
        </AccordionItem>

        {/* 2 — Crear clase */}
        <AccordionItem value="t2" className="rounded-xl border bg-card px-4 shadow-sm">
          <AccordionTrigger className="text-base font-semibold hover:no-underline">
            2️⃣ ¿Cómo creo una clase nueva?
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground space-y-3 pb-4">
            <p>Dentro del <strong>Panel Maestro</strong>, ve a la sección <strong>"Clases"</strong>.</p>
            <ol className="list-decimal ml-6 space-y-2">
              <li>Haz clic en el botón <strong>"+ Nueva Clase"</strong>.</li>
              <li>Elige el <strong>tipo de clase</strong> que quieres crear:</li>
            </ol>

            {/* Slides */}
            <div className="rounded-lg border p-4 space-y-2">
              <p className="font-semibold text-foreground">📊 Diapositivas</p>
              <p>Sube imágenes que se presentan una por una como una presentación.</p>
              <ol className="list-decimal ml-6 space-y-1 text-sm">
                <li>Después de crear la clase, haz clic en ella para abrirla.</li>
                <li>Usa el botón <strong>"Subir Diapositivas"</strong> para agregar imágenes.</li>
                <li>Puedes subir <strong>varias imágenes a la vez</strong>.</li>
                <li>Las diapositivas se ordenan automáticamente por número.</li>
              </ol>
              <div className="rounded-lg bg-muted p-4 text-sm space-y-2">
                <p>⚠️ <strong>Importante — Optimiza tus imágenes:</strong></p>
                <p>Las imágenes muy pesadas hacen que la clase cargue lento. Te recomendamos:</p>
                <ul className="list-disc ml-6 space-y-1">
                  <li>Usa imágenes de <strong>menos de 500 KB</strong> cada una (máximo 2 MB).</li>
                  <li>El formato <strong>WebP</strong> es ideal porque pesa muy poco y se ve bien.</li>
                  <li>Usa imágenes <strong>horizontales</strong> (panorámicas) para que se vean mejor.</li>
                </ul>
                <p>📌 Para convertir tus imágenes a WebP y reducir su peso, usa esta herramienta gratuita:</p>
                <a
                  href="https://squoosh.app/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-primary font-semibold hover:underline"
                >
                  Ir a Squoosh.app <ExternalLink className="h-4 w-4" />
                </a>
                <p className="text-xs">Abre la página → arrastra tu imagen → elige formato <strong>"WebP"</strong> → ajusta la calidad → descarga la imagen optimizada.</p>
              </div>
            </div>

            {/* Video */}
            <div className="rounded-lg border p-4 space-y-2">
              <p className="font-semibold text-foreground">🎬 Video</p>
              <p>Pega el link de un video de YouTube, Vimeo o TikTok para que tus alumnos lo vean.</p>
              <p className="text-sm font-semibold">¿Cómo obtengo el link del video?</p>
              <div className="text-sm space-y-2">
                <div className="rounded-lg bg-muted p-3">
                  <p className="font-semibold">YouTube:</p>
                  <ol className="list-decimal ml-6 space-y-1">
                    <li>Ve al video en YouTube.</li>
                    <li><strong>Opción A:</strong> Copia la URL de la barra de direcciones del navegador (ej: <code className="bg-background px-1 rounded">https://www.youtube.com/watch?v=xxxxx</code>).</li>
                    <li><strong>Opción B:</strong> Haz clic en <strong>"Compartir"</strong> debajo del video → <strong>"Copiar enlace"</strong>.</li>
                  </ol>
                </div>
                <div className="rounded-lg bg-muted p-3">
                  <p className="font-semibold">Vimeo:</p>
                  <ol className="list-decimal ml-6 space-y-1">
                    <li>Ve al video en Vimeo.</li>
                    <li>Copia la URL de la barra de direcciones (ej: <code className="bg-background px-1 rounded">https://vimeo.com/123456789</code>).</li>
                  </ol>
                </div>
                <div className="rounded-lg bg-muted p-3">
                  <p className="font-semibold">TikTok:</p>
                  <ol className="list-decimal ml-6 space-y-1">
                    <li>Abre el video en TikTok.</li>
                    <li>Toca <strong>"Compartir"</strong> → <strong>"Copiar enlace"</strong>.</li>
                    <li>El link será algo como: <code className="bg-background px-1 rounded">https://www.tiktok.com/@usuario/video/123...</code></li>
                  </ol>
                </div>
              </div>
              <p className="text-sm">👉 Pega el link en el campo <strong>"URL del Video"</strong> de tu clase y listo.</p>
            </div>

            {/* Web */}
            <div className="rounded-lg border p-4 space-y-2">
              <p className="font-semibold text-foreground">🌐 Página Web</p>
              <p>Muestra cualquier sitio web a tus alumnos directamente en la plataforma.</p>
              <ol className="list-decimal ml-6 space-y-1 text-sm">
                <li>Abre la página web que quieres compartir en tu navegador.</li>
                <li>Haz clic en la <strong>barra de direcciones</strong> (donde dice https://...) y copia la URL completa.</li>
                <li>Pega la URL en el campo <strong>"URL"</strong> de tu clase.</li>
              </ol>
            </div>

            {/* Exam */}
            <div className="rounded-lg border p-4 space-y-2">
              <p className="font-semibold text-foreground">📝 Examen</p>
              <p>Crea preguntas para evaluar a tus alumnos. Ver la sección detallada más abajo.</p>
            </div>

            {/* Videos Cortos (TikTok Feed) */}
            <div className="rounded-lg border p-4 space-y-2">
              <p className="font-semibold text-foreground">📱 Videos Cortos (Feed)</p>
              <p>Crea un feed vertical de videos cortos estilo TikTok. Tus alumnos navegan deslizando hacia arriba y abajo.</p>
              <ol className="list-decimal ml-6 space-y-1 text-sm">
                <li>Crea una clase tipo <strong>"Videos Cortos"</strong>.</li>
                <li>Agrega elementos — cada uno es una URL de TikTok, YouTube o Vimeo.</li>
                <li>Los alumnos verán los videos uno por uno a pantalla completa.</li>
                <li>Deslizando hacia arriba pasan al siguiente video.</li>
              </ol>
            </div>

            <ol className="list-decimal ml-6 space-y-2" start={3}>
              <li>Escribe el <strong>nombre</strong> de tu clase (ej: "Introducción al Marketing").</li>
              <li>¡Listo! Tu clase ya está disponible para tus alumnos.</li>
            </ol>
          </AccordionContent>
        </AccordionItem>

        {/* 3 — Exámenes detallado */}
        <AccordionItem value="t3" className="rounded-xl border bg-card px-4 shadow-sm">
          <AccordionTrigger className="text-base font-semibold hover:no-underline">
            3️⃣ ¿Cómo creo y administro un examen?
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground space-y-3 pb-4">
            <p>Después de crear una clase tipo <strong>"Examen"</strong>, ábrela haciendo clic en ella. Verás el editor de preguntas.</p>

            <div className="rounded-lg border p-4 space-y-3">
              <p className="font-semibold text-foreground">Crear una pregunta:</p>
              <ol className="list-decimal ml-6 space-y-2">
                <li>Haz clic en <strong>"+ Agregar Pregunta"</strong>.</li>
                <li>Escribe el texto de tu pregunta.</li>
                <li>Elige el tipo de pregunta con el selector:</li>
              </ol>
              <div className="ml-6 space-y-2">
                <div className="rounded-lg bg-muted p-3">
                  <p className="font-semibold">Opción múltiple:</p>
                  <ul className="list-disc ml-6 space-y-1 text-sm">
                    <li>Puedes agregar de <strong>2 a 6 opciones</strong> de respuesta.</li>
                    <li>Escribe el texto de cada opción.</li>
                    <li>Para marcar la respuesta correcta, haz clic en el <strong>círculo</strong> a la izquierda de la opción — se pondrá <strong>verde</strong> ✅.</li>
                    <li>Solo puede haber <strong>una respuesta correcta</strong> por pregunta.</li>
                    <li>Usa los botones <strong>"+"</strong> y <strong>"🗑️"</strong> para agregar o quitar opciones.</li>
                  </ul>
                </div>
                <div className="rounded-lg bg-muted p-3">
                  <p className="font-semibold">Pregunta abierta:</p>
                  <ul className="list-disc ml-6 space-y-1 text-sm">
                    <li>El alumno escribe su respuesta en un campo de texto libre.</li>
                    <li>Este tipo de pregunta <strong>no se califica automáticamente</strong> — tú la revisas y calificas manualmente.</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-4 text-sm space-y-2">
              <p className="font-semibold text-foreground">⚠️ Guardado de preguntas — MUY IMPORTANTE:</p>
              <p>Las preguntas <strong>NO se guardan automáticamente</strong>. Después de escribir o editar cada pregunta, debes hacer clic en el botón <strong>"Guardar"</strong> (💾) de esa pregunta.</p>
              <p>Si no das clic en "Guardar", <strong>perderás los cambios</strong> de esa pregunta.</p>
              <p>Cuando guardas correctamente, verás un mensaje de confirmación ✅.</p>
            </div>

            <div className="rounded-lg border p-4 space-y-2">
              <p className="font-semibold text-foreground">Eliminar una pregunta:</p>
              <ul className="list-disc ml-6 space-y-1 text-sm">
                <li>Haz clic en el botón <strong>"Eliminar"</strong> (🗑️) de la pregunta.</li>
                <li>Te pedirá <strong>confirmación</strong> antes de borrarla.</li>
                <li>Una vez eliminada, <strong>no se puede recuperar</strong>.</li>
              </ul>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* 4 — Agregar alumnos */}
        <AccordionItem value="t4" className="rounded-xl border bg-card px-4 shadow-sm">
          <AccordionTrigger className="text-base font-semibold hover:no-underline">
            4️⃣ ¿Cómo agrego alumnos?
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground space-y-3 pb-4">
            <p>Hay dos formas de agregar alumnos:</p>
            <div className="space-y-3">
              <div className="rounded-lg border p-4">
                <p className="font-semibold text-foreground">Opción A: Código de acceso (más fácil)</p>
                <ol className="list-decimal ml-6 mt-2 space-y-1">
                  <li>Ve a <strong>"Ajustes"</strong> en tu Panel Maestro.</li>
                  <li>Copia tu <strong>código de acceso</strong> (es un código corto como "a3f2b1c8").</li>
                  <li>Comparte ese código con tus alumnos.</li>
                  <li>Ellos lo ingresan en su Dashboard y ¡listo! Quedan inscritos.</li>
                </ol>
              </div>
              <div className="rounded-lg border p-4">
                <p className="font-semibold text-foreground">Opción B: Desde el Panel</p>
                <ol className="list-decimal ml-6 mt-2 space-y-1">
                  <li>Ve a la sección <strong>"Estudiantes"</strong> en tu Panel Maestro.</li>
                  <li>Ahí puedes ver quién está inscrito y gestionar a tus alumnos.</li>
                </ol>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* 5 — Calificaciones */}
        <AccordionItem value="t5" className="rounded-xl border bg-card px-4 shadow-sm">
          <AccordionTrigger className="text-base font-semibold hover:no-underline">
            5️⃣ ¿Cómo veo y califico los exámenes de mis alumnos?
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground space-y-3 pb-4">
            <p>En tu <strong>Panel Maestro</strong>, ve a la pestaña <strong>"Calificaciones"</strong>.</p>
            <ol className="list-decimal ml-6 space-y-2">
              <li>Selecciona el <strong>examen</strong> que quieres revisar.</li>
              <li>Verás la lista de alumnos que lo han contestado, con un resumen de sus respuestas.</li>
              <li>Haz clic en un alumno para ver el <strong>detalle pregunta por pregunta</strong>.</li>
            </ol>
            <div className="space-y-2">
              <div className="rounded-lg bg-muted p-4 text-sm">
                <p className="font-semibold">📊 Opción múltiple — Calificación automática:</p>
                <p>Las respuestas de opción múltiple se califican <strong>automáticamente</strong>. Verás si el alumno acertó (✅) o falló (❌) en cada pregunta.</p>
              </div>
              <div className="rounded-lg bg-muted p-4 text-sm">
                <p className="font-semibold">✍️ Pregunta abierta — Calificación manual:</p>
                <p>Tú revisas lo que escribió el alumno y puedes dejarle una <strong>calificación o comentario</strong> en el campo de texto. Haz clic en <strong>"Guardar"</strong> para registrar tu calificación.</p>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </section>
  );
}

function StudentGuide() {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/30">
          <BookOpen className="h-7 w-7 text-accent-foreground" />
        </div>
        <h3 className="text-2xl font-bold text-foreground">Para Alumnos</h3>
      </div>

      <Accordion type="single" collapsible className="space-y-2">
        <AccordionItem value="s1" className="rounded-xl border bg-card px-4 shadow-sm">
          <AccordionTrigger className="text-base font-semibold hover:no-underline">
            1️⃣ ¿Cómo me inscribo con un maestro?
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground space-y-3 pb-4">
            <ol className="list-decimal ml-6 space-y-2">
              <li>Inicia sesión en la plataforma.</li>
              <li>En tu Dashboard, busca el botón <strong>"Panel Alumno"</strong> y ábrelo.</li>
              <li>Verás un campo que dice <strong>"Código de acceso"</strong>.</li>
              <li>Escribe el código que te dio tu maestro.</li>
              <li>Haz clic en <strong>"Unirme"</strong>.</li>
              <li>¡Ya estás inscrito! Las clases de tu maestro aparecerán en tu pantalla.</li>
            </ol>
            <div className="rounded-lg bg-muted p-4 text-sm">
              💡 <strong>¿No tienes código?</strong> Pídeselo a tu maestro. Es un código corto que él te puede compartir por mensaje o en clase.
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="s2" className="rounded-xl border bg-card px-4 shadow-sm">
          <AccordionTrigger className="text-base font-semibold hover:no-underline">
            2️⃣ ¿Cómo veo las clases de mi maestro?
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground space-y-3 pb-4">
            <p>Después de inscribirte, ve a tu <strong>Dashboard</strong>.</p>
            <ol className="list-decimal ml-6 space-y-2">
              <li>Haz clic en el <strong>nombre de tu maestro</strong> para ver sus clases.</li>
              <li>Aparecerán tarjetas con cada clase disponible.</li>
              <li>Haz clic en la clase que quieras ver.</li>
            </ol>
            <p>Cada clase tiene un icono que te dice de qué tipo es:</p>
            <ul className="list-disc ml-6 space-y-1">
              <li>📊 Diapositivas — Desliza para avanzar</li>
              <li>🎬 Video — Se abre el reproductor</li>
              <li>📱 Videos Cortos — Desliza arriba/abajo para navegar</li>
              <li>🌐 Página Web — Se muestra el sitio</li>
              <li>📝 Examen — Contestas las preguntas</li>
            </ul>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="s3" className="rounded-xl border bg-card px-4 shadow-sm">
          <AccordionTrigger className="text-base font-semibold hover:no-underline">
            3️⃣ ¿Cómo uso el bloc de notas? 📝
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground space-y-3 pb-4">
            <p>¡Esta es una de las mejores funciones! Puedes tomar notas <strong>mientras ves cualquier clase</strong>.</p>
            <div className="space-y-3">
              <div className="rounded-lg border p-4">
                <p className="font-semibold text-foreground">En Diapositivas:</p>
                <ol className="list-decimal ml-6 mt-1 space-y-1">
                  <li>Abre el menú de acciones (toca la pantalla o presiona la barra espaciadora).</li>
                  <li>Busca el botón <strong>"Notas"</strong> 📝.</li>
                  <li>Se abre un panel donde puedes escribir.</li>
                  <li>Tus notas se guardan <strong>automáticamente</strong> para cada diapositiva.</li>
                </ol>
              </div>
              <div className="rounded-lg border p-4">
                <p className="font-semibold text-foreground">En Videos:</p>
                <ol className="list-decimal ml-6 mt-1 space-y-1">
                  <li>Busca el botón amarillo <strong>"Notas"</strong> en la parte superior.</li>
                  <li>Al abrirlo, el video se <strong>pausa automáticamente</strong> para que escribas tranquilo.</li>
                  <li>Al cerrar las notas, el video <strong>continúa</strong> donde te quedaste.</li>
                </ol>
              </div>
              <div className="rounded-lg border p-4">
                <p className="font-semibold text-foreground">En Páginas Web:</p>
                <ol className="list-decimal ml-6 mt-1 space-y-1">
                  <li>Busca el botón <strong>"Notas"</strong> en la barra superior.</li>
                  <li>Se abre un panel lateral donde puedes escribir.</li>
                </ol>
              </div>
            </div>
            <div className="rounded-lg bg-muted p-4 text-sm">
              💡 <strong>Tip:</strong> Puedes ver un <strong>resumen de todas tus notas</strong> con el botón "Ver Resumen" dentro del bloc de notas. ¡Muy útil para repasar!
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="s4" className="rounded-xl border bg-card px-4 shadow-sm">
          <AccordionTrigger className="text-base font-semibold hover:no-underline">
            4️⃣ ¿Cómo hago un examen?
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground space-y-3 pb-4">
            <ol className="list-decimal ml-6 space-y-2">
              <li>Abre la clase tipo <strong>"Examen"</strong> desde tu Dashboard.</li>
              <li>Lee cada pregunta con calma.</li>
              <li>Para preguntas de <strong>opción múltiple</strong>: selecciona la respuesta correcta.</li>
              <li>Para preguntas <strong>abiertas</strong>: escribe tu respuesta en el campo de texto.</li>
              <li>Haz clic en <strong>"Enviar"</strong> cuando termines.</li>
            </ol>
            <div className="rounded-lg bg-muted p-4 text-sm">
              ⚠️ <strong>Importante:</strong> Una vez que envías tus respuestas, tu maestro las puede ver. ¡Asegúrate de revisar antes de enviar!
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="s5" className="rounded-xl border bg-card px-4 shadow-sm">
          <AccordionTrigger className="text-base font-semibold hover:no-underline">
            5️⃣ ¿Cómo navego en las diapositivas?
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground space-y-3 pb-4">
            <p>Es muy sencillo:</p>
            <div className="space-y-2">
              <div className="rounded-lg border p-4">
                <p className="font-semibold text-foreground">📱 En el teléfono:</p>
                <ul className="list-disc ml-6 space-y-1">
                  <li><strong>Desliza a la izquierda</strong> → Siguiente diapositiva</li>
                  <li><strong>Desliza a la derecha</strong> → Diapositiva anterior</li>
                  <li><strong>Desliza hacia arriba</strong> → Abrir menú de acciones</li>
                </ul>
              </div>
              <div className="rounded-lg border p-4">
                <p className="font-semibold text-foreground">💻 En la computadora:</p>
                <ul className="list-disc ml-6 space-y-1">
                  <li><strong>Flecha derecha</strong> o <strong>clic</strong> → Siguiente</li>
                  <li><strong>Flecha izquierda</strong> → Anterior</li>
                  <li><strong>Barra espaciadora</strong> → Abrir/cerrar menú</li>
                </ul>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="s6" className="rounded-xl border bg-card px-4 shadow-sm">
          <AccordionTrigger className="text-base font-semibold hover:no-underline">
            6️⃣ ¿Cómo se actualiza la app? 🔄
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground space-y-3 pb-4">
            <p>La app <strong>se actualiza automáticamente</strong>. Cada vez que abras la app, buscará actualizaciones y las aplicará en segundo plano.</p>
            <div className="rounded-lg bg-muted p-4 text-sm">
              💡 <strong>Tip:</strong> Si notas algo raro o la app no se ve bien, simplemente <strong>cierra la app completamente</strong> (no solo minimizarla) y <strong>ábrela de nuevo</strong>. Eso forzará la actualización.
            </div>
            <div className="rounded-lg border p-4">
              <p className="font-semibold text-foreground">¿Cómo cerrar completamente?</p>
              <ul className="list-disc ml-6 space-y-1">
                <li><strong>iPhone:</strong> Desliza hacia arriba desde abajo y mantén, luego desliza la app hacia arriba para cerrarla.</li>
                <li><strong>Android:</strong> Toca el botón de apps recientes y desliza la app para cerrarla.</li>
              </ul>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </section>
  );
}
