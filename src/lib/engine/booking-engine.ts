import { createClient } from '@/lib/supabase/server';

/**
 * Booking Engine — Speed Boat Queue System
 * Phase 0: Info Layer (lihat antrian, operator update manual)
 * Phase 1: Seat Claims (FASE 5)
 */

// ============================================================
// PUBLIC: Get live queue per port
// ============================================================
export async function getPortQueue(portSlug: string) {
  const supabase = await createClient();

  const { data: port } = await supabase
    .from('ports')
    .select('*, city:cities!city_id(name)')
    .eq('slug', portSlug)
    .single();

  if (!port) return null;

  const { data: queue } = await supabase
    .from('queue_entries')
    .select(`
      *,
      operator:operators!operator_id(name, boat_name, capacity, phone),
      route:routes!route_id(
        destination:ports!destination_port_id(name, slug)
      )
    `)
    .eq('port_id', port.id)
    .in('status', ['queuing', 'boarding'])
    .order('queue_position', { ascending: true });

  return { port, queue: queue ?? [] };
}

// ============================================================
// PUBLIC: Get all ports with active queue count
// ============================================================
export async function getAllPorts() {
  const supabase = await createClient();

  const { data: ports } = await supabase
    .from('ports')
    .select('*')
    .contains('port_type', ['speed'])
    .eq('is_active', true)
    .order('name');

  if (!ports) return [];

  // Get queue counts per port
  const portsWithQueue = await Promise.all(
    ports.map(async (port) => {
      const { count } = await supabase
        .from('queue_entries')
        .select('id', { count: 'exact', head: true })
        .eq('port_id', port.id)
        .in('status', ['queuing', 'boarding']);

      return { ...port, active_queue: count ?? 0 };
    }),
  );

  return portsWithQueue;
}

// ============================================================
// PUBLIC: Get all speed routes
// ============================================================
export async function getSpeedRoutes() {
  const supabase = await createClient();

  const { data } = await supabase
    .from('routes')
    .select(`
      *,
      origin:ports!origin_port_id(name, slug, city:cities!city_id(name)),
      destination:ports!destination_port_id(name, slug, city:cities!city_id(name))
    `)
    .eq('transport_type', 'speed')
    .eq('is_active', true);

  return data ?? [];
}

// ============================================================
// OPERATOR: Update passenger count (walk-in)
// ============================================================
export async function updatePassengerCount(
  queueEntryId: string,
  delta: number, // +1, +2, +3, -1
  operatorUserId: string,
) {
  const supabase = await createClient();

  // Verify operator owns this queue entry
  const { data: entry } = await supabase
    .from('queue_entries')
    .select('*, operator:operators!operator_id(user_id, capacity)')
    .eq('id', queueEntryId)
    .single();

  if (!entry) throw new Error('Queue entry not found');
  if (entry.operator.user_id !== operatorUserId) throw new Error('Not your queue');
  if (entry.status === 'departed') throw new Error('Already departed');

  const newCount = Math.max(0, entry.passenger_count + delta);
  if (newCount > entry.operator.capacity) throw new Error('Exceeds capacity');

  const { data, error } = await supabase
    .from('queue_entries')
    .update({
      passenger_count: newCount,
      status: newCount > 0 ? 'boarding' : 'queuing',
    })
    .eq('id', queueEntryId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================================
// OPERATOR: Register in queue
// ============================================================
export async function registerInQueue(
  operatorId: string,
  routeId: string,
  portId: string,
) {
  const supabase = await createClient();

  // Get next queue position
  const { count } = await supabase
    .from('queue_entries')
    .select('id', { count: 'exact', head: true })
    .eq('port_id', portId)
    .in('status', ['queuing', 'boarding']);

  const position = (count ?? 0) + 1;

  const { data, error } = await supabase
    .from('queue_entries')
    .insert({
      operator_id: operatorId,
      route_id: routeId,
      port_id: portId,
      queue_position: position,
      passenger_count: 0,
      status: 'queuing',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================================
// OPERATOR: Depart (lepas tali)
// ============================================================
export async function departQueue(
  queueEntryId: string,
  operatorUserId: string,
) {
  const supabase = await createClient();

  const { data: entry } = await supabase
    .from('queue_entries')
    .select('*, operator:operators!operator_id(id, user_id)')
    .eq('id', queueEntryId)
    .single();

  if (!entry) throw new Error('Queue entry not found');
  if (entry.operator.user_id !== operatorUserId) throw new Error('Not your queue');
  if (entry.status === 'departed') throw new Error('Already departed');

  // Phase 0: no seat claims to check
  // Phase 1 (FASE 5): will block if unresolved claims exist

  // Update queue entry
  await supabase
    .from('queue_entries')
    .update({ status: 'departed', departed_at: new Date().toISOString() })
    .eq('id', queueEntryId);

  // Create departure record
  const { data: departure } = await supabase
    .from('departures')
    .insert({
      queue_entry_id: queueEntryId,
      operator_id: entry.operator.id,
      route_id: entry.route_id,
      total_passengers: entry.passenger_count,
      walk_in_passengers: entry.passenger_count,
      digital_passengers: 0,
      manifest: [],
    })
    .select()
    .single();

  // Reorder queue positions
  const { data: remaining } = await supabase
    .from('queue_entries')
    .select('id')
    .eq('port_id', entry.port_id)
    .in('status', ['queuing', 'boarding'])
    .order('queue_position', { ascending: true });

  if (remaining) {
    await Promise.all(
      remaining.map((r, i) =>
        supabase.from('queue_entries').update({ queue_position: i + 1 }).eq('id', r.id),
      ),
    );
  }

  return departure;
}

// ============================================================
// PHASE 1: Create Seat Claim (FASE 5)
// ============================================================
export async function createSeatClaim(
  queueEntryId: string,
  passengerId: string,
  passengerName: string,
  passengerPhone: string,
) {
  const supabase = await createClient();

  // Verify queue entry exists and is active
  const { data: entry } = await supabase
    .from('queue_entries')
    .select('*, operator:operators!operator_id(capacity)')
    .eq('id', queueEntryId)
    .in('status', ['queuing', 'boarding'])
    .single();

  if (!entry) throw new Error('Speed tidak tersedia');

  // Check capacity (walk-in + digital claims)
  const { count: claimCount } = await supabase
    .from('seat_claims')
    .select('id', { count: 'exact', head: true })
    .eq('queue_entry_id', queueEntryId)
    .eq('status', 'active');

  const totalOccupied = entry.passenger_count + (claimCount ?? 0);
  if (totalOccupied >= entry.operator.capacity) {
    throw new Error('Seat sudah penuh');
  }

  // Check duplicate claim
  const { data: existing } = await supabase
    .from('seat_claims')
    .select('id')
    .eq('queue_entry_id', queueEntryId)
    .eq('passenger_id', passengerId)
    .eq('status', 'active')
    .single();

  if (existing) throw new Error('Kamu sudah claim seat di speed ini');

  // Create claim — NO expires_at, NO cancel button
  const { data: claim, error } = await supabase
    .from('seat_claims')
    .insert({
      queue_entry_id: queueEntryId,
      passenger_id: passengerId,
      passenger_name: passengerName,
      passenger_phone: passengerPhone,
      status: 'active',
    })
    .select()
    .single();

  if (error) throw error;
  return claim;
}

// ============================================================
// OPERATOR: Confirm boarding ([✅ NAIK] / [❌ TIDAK ADA])
// ============================================================
export async function confirmBoarding(
  claimId: string,
  action: 'boarded' | 'no_show',
  operatorUserId: string,
) {
  const supabase = await createClient();

  // Verify operator owns the queue
  const { data: claim } = await supabase
    .from('seat_claims')
    .select('*, queue_entry:queue_entries!queue_entry_id(operator:operators!operator_id(user_id))')
    .eq('id', claimId)
    .eq('status', 'active')
    .single();

  if (!claim) throw new Error('Claim not found');
  if (claim.queue_entry?.operator?.user_id !== operatorUserId) throw new Error('Not your queue');

  const update = action === 'boarded'
    ? { status: 'boarded', boarded_at: new Date().toISOString() }
    : { status: 'expired', expired_at: new Date().toISOString(), expired_reason: 'no_show' };

  const { data } = await supabase
    .from('seat_claims')
    .update(update)
    .eq('id', claimId)
    .select()
    .single();

  return data;
}

// ============================================================
// Check if departure is blocked (unresolved claims)
// ============================================================
export async function checkDepartureBlocked(queueEntryId: string): Promise<{
  blocked: boolean;
  unresolvedCount: number;
}> {
  const supabase = await createClient();

  const { count } = await supabase
    .from('seat_claims')
    .select('id', { count: 'exact', head: true })
    .eq('queue_entry_id', queueEntryId)
    .eq('status', 'active');

  return {
    blocked: (count ?? 0) > 0,
    unresolvedCount: count ?? 0,
  };
}

// ============================================================
// Generate manifest for departure (SAR safety)
// ============================================================
export async function generateManifest(queueEntryId: string) {
  const supabase = await createClient();

  const { data: claims } = await supabase
    .from('seat_claims')
    .select('passenger_name, passenger_phone, status')
    .eq('queue_entry_id', queueEntryId)
    .eq('status', 'boarded');

  return (claims ?? []).map((c) => ({
    name: c.passenger_name,
    phone: c.passenger_phone,
    type: 'digital' as const,
  }));
}
