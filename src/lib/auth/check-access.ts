import { createClient } from '@/lib/supabase/server';

/**
 * RBAC — 3 Tier
 * Tier 1: super_admin (Founder only, akses SEMUA)
 * Tier 2: service_admin (Staff per service — journalist, moderator, CS)
 * Tier 3: service_user (Operator, pemilik kos, provider jasa)
 */

export type Role =
  | 'super_admin'
  | 'admin_content'
  | 'admin_transport'
  | 'admin_listing'
  | 'admin_funding'
  | 'operator_speed'
  | 'operator_ship'
  | 'owner_listing'
  | 'provider_service';

export type RoleTier = 1 | 2 | 3;

const ROLE_TIERS: Record<Role, RoleTier> = {
  super_admin: 1,
  admin_content: 2,
  admin_transport: 2,
  admin_listing: 2,
  admin_funding: 2,
  operator_speed: 3,
  operator_ship: 3,
  owner_listing: 3,
  provider_service: 3,
};

export async function checkAccess(requiredRoles: Role[]): Promise<{
  authorized: boolean;
  user: { id: string; role: Role } | null;
}> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { authorized: false, user: null };
  }

  const { data: userRole } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (!userRole) {
    return { authorized: false, user: null };
  }

  const role = userRole.role as Role;

  // Super admin always has access
  if (role === 'super_admin') {
    return { authorized: true, user: { id: user.id, role } };
  }

  // Check if user's role is in the required roles
  const authorized = requiredRoles.includes(role);
  return { authorized, user: { id: user.id, role } };
}

export function getTier(role: Role): RoleTier {
  return ROLE_TIERS[role];
}
