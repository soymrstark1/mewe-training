import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnon = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Verify user
    const userClient = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }
    const userId = claimsData.claims.sub as string;

    const { course_id } = await req.json();
    if (!course_id) {
      return new Response(JSON.stringify({ error: 'course_id required' }), { status: 400, headers: corsHeaders });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Check existing certificate
    const { data: existing } = await adminClient
      .from('certificates')
      .select('id, certificate_url')
      .eq('student_auth_user_id', userId)
      .eq('course_id', course_id)
      .maybeSingle();

    if (existing?.certificate_url) {
      return new Response(JSON.stringify({ certificate_url: existing.certificate_url }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Get course info
    const { data: course } = await adminClient
      .from('courses')
      .select('id, name, teacher_id')
      .eq('id', course_id)
      .single();

    if (!course) {
      return new Response(JSON.stringify({ error: 'Course not found' }), { status: 404, headers: corsHeaders });
    }

    // Get teacher info
    const { data: teacher } = await adminClient
      .from('teachers')
      .select('name, brand_name')
      .eq('id', course.teacher_id)
      .single();

    // Get student info
    const { data: student } = await adminClient
      .from('users')
      .select('name')
      .eq('auth_user_id', userId)
      .single();

    // Get course classes
    const { data: courseClasses } = await adminClient
      .from('teacher_classes')
      .select('id')
      .eq('course_id', course_id)
      .eq('is_active', true);

    if (!courseClasses || courseClasses.length === 0) {
      return new Response(JSON.stringify({ error: 'No classes in course' }), { status: 400, headers: corsHeaders });
    }

    // Check all completed
    const classIds = courseClasses.map(c => c.id);
    const { data: progress } = await adminClient
      .from('student_progress')
      .select('class_id, completed')
      .eq('student_auth_user_id', userId)
      .in('class_id', classIds);

    const completedIds = new Set((progress || []).filter(p => p.completed).map(p => p.class_id));
    const allCompleted = classIds.every(id => completedIds.has(id));

    if (!allCompleted) {
      return new Response(JSON.stringify({ error: 'Not all classes completed' }), { status: 400, headers: corsHeaders });
    }

    // Generate simple SVG certificate
    const studentName = student?.name || 'Estudiante';
    const courseName = course.name;
    const teacherName = teacher?.brand_name || teacher?.name || 'Instructor';
    const dateStr = new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
    const certId = crypto.randomUUID().slice(0, 8).toUpperCase();

    const svgCert = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="850" viewBox="0 0 1200 850">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" style="stop-color:#f8fafc"/>
      <stop offset="100%" style="stop-color:#e2e8f0"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="850" fill="url(#bg)"/>
  <rect x="30" y="30" width="1140" height="790" rx="12" fill="none" stroke="#94a3b8" stroke-width="2"/>
  <rect x="40" y="40" width="1120" height="770" rx="8" fill="none" stroke="#cbd5e1" stroke-width="1"/>
  <text x="600" y="160" text-anchor="middle" font-family="Georgia, serif" font-size="48" fill="#1e293b" font-weight="bold">Certificado de Finalización</text>
  <line x1="350" y1="190" x2="850" y2="190" stroke="#94a3b8" stroke-width="1"/>
  <text x="600" y="260" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" fill="#64748b">Se certifica que</text>
  <text x="600" y="330" text-anchor="middle" font-family="Georgia, serif" font-size="42" fill="#0f172a" font-weight="bold">${escapeXml(studentName)}</text>
  <text x="600" y="400" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" fill="#64748b">ha completado satisfactoriamente el curso</text>
  <text x="600" y="470" text-anchor="middle" font-family="Georgia, serif" font-size="36" fill="#1e40af" font-weight="bold">${escapeXml(courseName)}</text>
  <text x="600" y="540" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" fill="#64748b">impartido por ${escapeXml(teacherName)}</text>
  <line x1="400" y1="620" x2="600" y2="620" stroke="#94a3b8" stroke-width="1"/>
  <text x="500" y="650" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="#475569">${escapeXml(teacherName)}</text>
  <text x="500" y="670" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#94a3b8">Instructor</text>
  <text x="600" y="740" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="#475569">${dateStr}</text>
  <text x="600" y="780" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" fill="#94a3b8">ID: ${certId} • The Academy 🎓</text>
</svg>`;

    // Upload SVG as certificate
    const fileName = `${userId}/${course_id}.svg`;
    const { error: uploadError } = await adminClient.storage
      .from('certificates')
      .upload(fileName, new TextEncoder().encode(svgCert), {
        contentType: 'image/svg+xml',
        upsert: true,
      });

    if (uploadError) {
      return new Response(JSON.stringify({ error: 'Upload failed: ' + uploadError.message }), { status: 500, headers: corsHeaders });
    }

    const { data: urlData } = adminClient.storage.from('certificates').getPublicUrl(fileName);
    const certificateUrl = urlData.publicUrl;

    // Upsert certificate record
    await adminClient.from('certificates').upsert({
      student_auth_user_id: userId,
      course_id,
      certificate_url: certificateUrl,
    }, { onConflict: 'student_auth_user_id,course_id' });

    return new Response(JSON.stringify({ certificate_url: certificateUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});

function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}
