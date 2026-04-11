import { createClient } from '@/lib/supabase/server';

/**
 * Content Engine — Article lifecycle
 * draft → review → published → archived
 */

export async function getPublishedArticles(params: {
  page?: number;
  limit?: number;
  category?: string;
  city_id?: string;
  search?: string;
}) {
  const { page = 1, limit = 20, category, city_id, search } = params;
  const supabase = await createClient();
  const offset = (page - 1) * limit;

  let query = supabase
    .from('articles')
    .select('*, author:profiles!author_id(full_name, avatar_url)', { count: 'exact' })
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (category) query = query.eq('category', category);
  if (city_id) query = query.eq('city_id', city_id);
  if (search) query = query.ilike('title', `%${search}%`);

  const { data, count, error } = await query;
  if (error) throw error;

  return { data: data ?? [], total: count ?? 0, page, limit };
}

export async function getArticleBySlug(slug: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('articles')
    .select('*, author:profiles!author_id(full_name, avatar_url)')
    .eq('slug', slug)
    .eq('status', 'published')
    .single();

  if (error) return null;

  // Increment view count (fire and forget)
  supabase
    .from('articles')
    .update({ view_count: (data.view_count || 0) + 1 })
    .eq('id', data.id)
    .then(() => {});

  return data;
}

export async function getBreakingNews() {
  const supabase = await createClient();

  const { data } = await supabase
    .from('articles')
    .select('id, title, slug, excerpt, cover_image_url, published_at')
    .eq('status', 'published')
    .eq('is_breaking', true)
    .order('published_at', { ascending: false })
    .limit(5);

  return data ?? [];
}

export async function createArticle(article: {
  title: string;
  body: string;
  excerpt?: string;
  category: string;
  cover_image_url?: string;
  tags?: string[];
  city_id?: string;
  is_breaking?: boolean;
  is_ticker?: boolean;
  author_id: string;
}) {
  const supabase = await createClient();
  const slug = generateSlug(article.title);

  const { data, error } = await supabase
    .from('articles')
    .insert({
      ...article,
      slug,
      status: 'draft',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function publishArticle(articleId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('articles')
    .update({
      status: 'published',
      published_at: new Date().toISOString(),
    })
    .eq('id', articleId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getArticlesAdmin(params: {
  status?: string;
  page?: number;
  limit?: number;
}) {
  const { status, page = 1, limit = 20 } = params;
  const supabase = await createClient();
  const offset = (page - 1) * limit;

  let query = supabase
    .from('articles')
    .select('*, author:profiles!author_id(full_name)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) query = query.eq('status', status);

  const { data, count, error } = await query;
  if (error) throw error;

  return { data: data ?? [], total: count ?? 0, page, limit };
}

function generateSlug(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
  const suffix = Date.now().toString(36).slice(-4);
  return `${base}-${suffix}`;
}
