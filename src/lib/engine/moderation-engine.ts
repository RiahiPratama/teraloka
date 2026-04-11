import { createClient } from '@/lib/supabase/server';
import { calculateRiskScore, BLACKLIST_KEYWORDS } from '@/lib/domain/moderation-rules';

/**
 * Moderation Engine — BALAPOR
 * Auto-scoring, risk flags, queue priority
 */

export async function submitReport(report: {
  reporter_id?: string;
  anonymity_level: 'anonim' | 'pseudonym' | 'nama_terang';
  pseudonym?: string;
  title: string;
  body: string;
  category: string;
  location?: string;
  city_id?: string;
  photos?: string[];
}) {
  const supabase = await createClient();

  // Auto-calculate risk score
  const risk_score = calculateRiskScore(report.title, report.body);

  const { data, error } = await supabase
    .from('reports')
    .insert({
      ...report,
      risk_score,
      tos_accepted: true,
      status: risk_score > 70 ? 'reviewing' : 'pending',
    })
    .select()
    .single();

  if (error) throw error;

  // Log moderation action
  if (risk_score > 70) {
    await supabase.from('moderation_logs').insert({
      entity_type: 'report',
      entity_id: data.id,
      action: 'flag',
      reason: `Auto-flagged: risk score ${risk_score}`,
      auto_moderated: true,
      metadata: { risk_score },
    });
  }

  return data;
}

export async function getReportsForModeration(params: {
  status?: string;
  page?: number;
  limit?: number;
}) {
  const { status, page = 1, limit = 20 } = params;
  const supabase = await createClient();
  const offset = (page - 1) * limit;

  let query = supabase
    .from('reports')
    .select('*, reporter:profiles!reporter_id(full_name)', { count: 'exact' })
    .order('risk_score', { ascending: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) query = query.eq('status', status);

  const { data, count, error } = await query;
  if (error) throw error;

  return { data: data ?? [], total: count ?? 0, page, limit };
}

export async function moderateReport(
  reportId: string,
  action: 'verify' | 'reject' | 'publish',
  moderatorId: string,
  reason?: string,
) {
  const supabase = await createClient();

  const statusMap = {
    verify: 'verified',
    reject: 'rejected',
    publish: 'published',
  };

  const { data, error } = await supabase
    .from('reports')
    .update({
      status: statusMap[action],
      ...(action === 'reject' && { rejection_reason: reason }),
      ...(action !== 'reject' && {
        verified_by: moderatorId,
        verified_at: new Date().toISOString(),
      }),
    })
    .eq('id', reportId)
    .select()
    .single();

  if (error) throw error;

  // Log moderation
  await supabase.from('moderation_logs').insert({
    entity_type: 'report',
    entity_id: reportId,
    action: action === 'verify' ? 'approve' : action === 'publish' ? 'publish' : 'reject',
    reason,
    moderator_id: moderatorId,
  });

  return data;
}

/**
 * Convert verified report → BAKABAR article
 */
export async function convertReportToArticle(
  reportId: string,
  authorId: string,
  additionalContent?: { title?: string; body?: string },
) {
  const supabase = await createClient();

  const { data: report } = await supabase
    .from('reports')
    .select('*')
    .eq('id', reportId)
    .single();

  if (!report) throw new Error('Report not found');

  const slug = (additionalContent?.title || report.title)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 80) + '-' + Date.now().toString(36).slice(-4);

  const { data: article, error } = await supabase
    .from('articles')
    .insert({
      title: additionalContent?.title || report.title,
      slug,
      body: additionalContent?.body || report.body,
      category: mapReportCategory(report.category),
      source: 'balapor',
      source_report_id: reportId,
      author_id: authorId,
      city_id: report.city_id,
      cover_image_url: report.photos?.[0] || null,
      status: 'draft',
    })
    .select()
    .single();

  if (error) throw error;

  // Update report with linked article
  await supabase
    .from('reports')
    .update({ linked_article_id: article.id, status: 'published' })
    .eq('id', reportId);

  return article;
}

function mapReportCategory(reportCat: string): string {
  const map: Record<string, string> = {
    infrastruktur: 'sosial',
    layanan_publik: 'sosial',
    lingkungan: 'sosial',
    keamanan: 'sosial',
    kesehatan: 'kesehatan',
    pendidikan: 'pendidikan',
    transportasi: 'transportasi',
    lainnya: 'sosial',
  };
  return map[reportCat] || 'sosial';
}
