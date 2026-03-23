import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller is superadmin, admin, or academy
    const callerClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) throw new Error("Not authenticated");

    const adminClient = createClient(supabaseUrl, serviceKey);
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .in("role", ["superadmin", "admin", "academy"]);

    if (!roleData || roleData.length === 0) throw new Error("Not authorized - admin/academy only");

    const { email, password, name, brand_name, academy_id } = await req.json();
    if (!name) throw new Error("Missing required field: name");

    let authUserId: string | null = null;

    // If email and password provided, create auth user
    if (email && password) {
      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name },
      });
      if (createError) throw createError;
      authUserId = newUser.user.id;

      // Assign teacher role
      await adminClient.from("user_roles").insert({
        user_id: authUserId,
        role: "teacher",
      });
    }

    // Create teacher record (auth_user_id can be null for placeholder teachers)
    const teacherInsert: Record<string, unknown> = {
      name,
      brand_name: brand_name || name,
      created_by: caller.id,
    };
    if (authUserId) {
      teacherInsert.auth_user_id = authUserId;
    }

    const { data: teacher, error: teacherError } = await adminClient
      .from("teachers")
      .insert(teacherInsert)
      .select()
      .single();

    if (teacherError) throw teacherError;

    // If academy_id provided, link teacher to academy
    if (academy_id) {
      await adminClient.from("academy_teachers").insert({
        academy_id,
        teacher_id: teacher.id,
      });
    }

    return new Response(JSON.stringify({ teacher }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
