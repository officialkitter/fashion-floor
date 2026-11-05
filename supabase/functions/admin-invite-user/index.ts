import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Use POST to invite a team member.' }, 405);

  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) return json({ error: 'Sign in before inviting a team member.' }, 401);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const publishableKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !publishableKey || !serviceRoleKey) {
    console.error('Invite function is missing Supabase runtime configuration.');
    return json({ error: 'Secure invitations are not configured. Contact the platform administrator.' }, 500);
  }

  const callerClient = createClient(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userError } = await callerClient.auth.getUser();
  if (userError || !userData.user) return json({ error: 'Your sign-in has expired. Sign in again and retry.' }, 401);

  const [teamPermission, rolePermission] = await Promise.all([
    callerClient.rpc('has_permission', { permission_key: 'team.manage' }),
    callerClient.rpc('has_permission', { permission_key: 'roles.edit' }),
  ]);
  if (teamPermission.error || rolePermission.error) {
    console.error('Could not verify invitation permissions.', teamPermission.error ?? rolePermission.error);
    return json({ error: 'Could not verify your team-management permission. Retry or contact the platform administrator.' }, 503);
  }
  if (!teamPermission.data || !rolePermission.data) {
    return json({ error: 'You do not have permission to invite team members.' }, 403);
  }

  let input: {
    email?: unknown;
    displayName?: unknown;
    platformRole?: unknown;
    departmentId?: unknown;
    accessRoleId?: unknown;
    vendorId?: unknown;
  };
  try {
    input = await request.json();
  } catch {
    return json({ error: 'The invitation details are not valid JSON.' }, 400);
  }

  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
  const displayName = typeof input.displayName === 'string' ? input.displayName.trim() : '';
  const allowedRoles = ['admin', 'finance', 'support', 'supplier', 'provider'];
  const platformRole = typeof input.platformRole === 'string' ? input.platformRole : '';
  const departmentId = typeof input.departmentId === 'string' ? input.departmentId : null;
  const accessRoleId = typeof input.accessRoleId === 'string' ? input.accessRoleId : null;
  const vendorId = typeof input.vendorId === 'string' ? input.vendorId : null;

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return json({ error: 'Enter a valid email address.' }, 400);
  }
  if (!displayName || displayName.length > 120) {
    return json({ error: 'Enter a name of 1 to 120 characters.' }, 400);
  }
  if (!allowedRoles.includes(platformRole)) {
    return json({ error: 'Choose a supported team role. Owner access cannot be assigned by invitation.' }, 400);
  }
  if (!accessRoleId && !departmentId && !vendorId) {
    return json({ error: 'Choose a department or a linked partner account.' }, 400);
  }

  const redirectTo = Deno.env.get('ADMIN_INVITE_REDIRECT_URL');
  const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
    data: { display_name: displayName },
    ...(redirectTo ? { redirectTo } : {}),
  });
  if (inviteError || !inviteData.user) {
    console.error('Supabase could not create the requested team invitation.', inviteError);
    return json({ error: inviteError?.message ?? 'Supabase did not return an invited account.' }, 400);
  }

  const { error: assignmentError } = await callerClient.rpc('assign_team_access', {
    target_user_id: inviteData.user.id,
    target_role: platformRole,
    target_department_id: departmentId,
    target_access_role_id: accessRoleId,
    target_vendor_id: vendorId,
  });
  if (assignmentError) {
    const { error: cleanupError } = await adminClient.auth.admin.deleteUser(inviteData.user.id);
    if (cleanupError) console.error('Could not remove the invited account after role assignment failed.', cleanupError);
    console.error('Could not assign access to the invited account.', assignmentError);
    return json({ error: `The invitation could not be completed: ${assignmentError.message}` }, 400);
  }

  const { error: profileError } = await adminClient
    .from('profiles')
    .upsert({ id: inviteData.user.id, display_name: displayName, email }, { onConflict: 'id' });
  if (profileError) {
    console.error('Could not save the invited team member profile.', profileError);
    return json({ error: 'The invitation was sent and access assigned, but the display name could not be saved.' }, 500);
  }

  return json({ userId: inviteData.user.id, invited: true });
});
