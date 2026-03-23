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

    // Verify caller is superadmin or admin
    const callerClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) throw new Error("Not authenticated");

    const adminClient = createClient(supabaseUrl, serviceKey);

    // Check superadmin or admin role
    const { data: roles } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .in("role", ["superadmin", "admin"]);

    if (!roles || roles.length === 0) throw new Error("Not authorized - admin only");

    const { request_id, action } = await req.json();
    if (!request_id || !action) throw new Error("Missing request_id or action");

    if (action === "reject") {
      await adminClient
        .from("teacher_requests")
        .update({ status: "rejected", reviewed_by: caller.id, reviewed_at: new Date().toISOString() })
        .eq("id", request_id);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "approve") {
      // Get the request
      const { data: request, error: reqErr } = await adminClient
        .from("teacher_requests")
        .select("*")
        .eq("id", request_id)
        .eq("status", "pending")
        .single();

      if (reqErr || !request) throw new Error("Request not found or already processed");

      // Assign teacher role
      await adminClient.from("user_roles").upsert(
        { user_id: request.auth_user_id, role: "teacher" },
        { onConflict: "user_id,role" }
      );

      // Create teacher record
      const { data: teacher, error: teacherError } = await adminClient
        .from("teachers")
        .insert({
          auth_user_id: request.auth_user_id,
          name: request.name,
          brand_name: request.brand_name || request.name,
          created_by: caller.id,
        })
        .select()
        .single();

      if (teacherError) throw teacherError;

      // Update request status
      await adminClient
        .from("teacher_requests")
        .update({ status: "approved", reviewed_by: caller.id, reviewed_at: new Date().toISOString() })
        .eq("id", request_id);

      return new Response(JSON.stringify({ teacher }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Invalid action");
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
