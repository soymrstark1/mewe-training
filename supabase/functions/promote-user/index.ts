import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller
    const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: claimsData, error: claimsError } = await callerClient.auth.getClaims(
      authHeader.replace("Bearer ", "")
    );
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerId = claimsData.claims.sub;

    // Check admin/superadmin
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: roles } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .in("role", ["superadmin", "admin"]);

    if (!roles || roles.length === 0) {
      return new Response(JSON.stringify({ error: "No tienes permisos" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { user_id, role, name, brand_name } = await req.json();

    if (!user_id || !role) {
      return new Response(JSON.stringify({ error: "user_id y role son requeridos" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only superadmins can assign admin role
    if (role === "admin") {
      const isSuperadmin = roles.some((r: any) => r.role === "superadmin");
      if (!isSuperadmin) {
        return new Response(
          JSON.stringify({ error: "Solo superadmins pueden asignar rol admin" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Upsert role
    const { error: roleError } = await adminClient
      .from("user_roles")
      .upsert(
        { user_id, role },
        { onConflict: "user_id,role" }
      );

    if (roleError) {
      return new Response(JSON.stringify({ error: roleError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If promoting to teacher, also create teacher record
    if (role === "teacher") {
      // Get user info for name
      const { data: userInfo } = await adminClient
        .from("users")
        .select("name, email")
        .eq("auth_user_id", user_id)
        .single();

      const teacherName = name || userInfo?.name || "Maestro";
      const teacherBrand = brand_name || teacherName;

      // Check if teacher record already exists
      const { data: existing } = await adminClient
        .from("teachers")
        .select("id")
        .eq("auth_user_id", user_id)
        .maybeSingle();

      if (!existing) {
        const { error: teacherError } = await adminClient
          .from("teachers")
          .insert({
            auth_user_id: user_id,
            name: teacherName,
            brand_name: teacherBrand,
            created_by: callerId,
          });

        if (teacherError) {
          return new Response(JSON.stringify({ error: teacherError.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
