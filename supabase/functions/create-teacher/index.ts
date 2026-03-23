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

    // Verify caller is superadmin
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
      .in("role", ["superadmin", "admin"]);

    if (!roleData || roleData.length === 0) throw new Error("Not authorized - admin only");

    const { email, password, name, brand_name } = await req.json();
    if (!email || !password || !name) throw new Error("Missing required fields");

    // Create auth user
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
    });
    if (createError) throw createError;

    // Assign teacher role
    await adminClient.from("user_roles").insert({
      user_id: newUser.user.id,
      role: "teacher",
    });

    // Create teacher record
    const { data: teacher, error: teacherError } = await adminClient
      .from("teachers")
      .insert({
        auth_user_id: newUser.user.id,
        name,
        brand_name: brand_name || name,
        created_by: caller.id,
      })
      .select()
      .single();

    if (teacherError) throw teacherError;

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
