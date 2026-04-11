/**
 * Moderation Rules — Risk scoring & keyword detection
 * Used by BALAPOR auto-moderation
 */

export const BLACKLIST_KEYWORDS = [
  // Sensitive political terms
  'korupsi', 'suap', 'pungli',
  // Violence
  'bunuh', 'ancam', 'intimidasi',
  // Defamation risk
  'penipuan', 'penipu', 'tipu',
  // Ethnic/SARA
  'sara', 'rasis',
];

const HIGH_RISK_KEYWORDS = [
  'korupsi', 'suap', 'bunuh', 'ancam', 'intimidasi',
];

const MEDIUM_RISK_KEYWORDS = [
  'pungli', 'penipuan', 'penipu', 'tipu', 'mafia',
  'ilegal', 'kriminal',
];

/**
 * Calculate risk score 0-100 based on content analysis
 * Higher = more risky = needs priority moderation
 */
export function calculateRiskScore(title: string, body: string): number {
  const text = `${title} ${body}`.toLowerCase();
  let score = 0;

  // High risk keywords: +20 each (max 60)
  const highHits = HIGH_RISK_KEYWORDS.filter((k) => text.includes(k));
  score += Math.min(highHits.length * 20, 60);

  // Medium risk keywords: +10 each (max 30)
  const medHits = MEDIUM_RISK_KEYWORDS.filter((k) => text.includes(k));
  score += Math.min(medHits.length * 10, 30);

  // Mentions specific person names (ALL CAPS pattern): +15
  const capsPattern = /\b[A-Z]{3,}\b/g;
  const capsMatches = text.match(capsPattern);
  if (capsMatches && capsMatches.length > 0) score += 15;

  // Very long body (potential legal risk): +5
  if (body.length > 2000) score += 5;

  // Contains phone number or address (doxxing risk): +10
  const phonePattern = /08\d{8,12}/;
  if (phonePattern.test(text)) score += 10;

  return Math.min(score, 100);
}

/**
 * Determine moderation priority based on risk score
 */
export function getModerationPriority(riskScore: number): 'low' | 'medium' | 'high' | 'critical' {
  if (riskScore >= 70) return 'critical';
  if (riskScore >= 50) return 'high';
  if (riskScore >= 30) return 'medium';
  return 'low';
}

/**
 * Check if content should be auto-held for review
 */
export function shouldAutoHold(riskScore: number): boolean {
  return riskScore >= 50;
}
