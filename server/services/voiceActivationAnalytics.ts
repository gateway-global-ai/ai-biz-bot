/**
 * Aggregates voice_client_heartbeat passages for admin analytics (activation signal, not token billing).
 */

import { db } from "../db";
import { sql } from "drizzle-orm";

export type VoiceActivationSeriesRow = {
  dayUtc: string;
  siteConfigId: string | null;
  siteName: string;
  count: number;
};

/**
 * Daily buckets of post-audio-pipeline voice heartbeats, optionally scoped to one site.
 */
export async function getVoiceActivationStats(opts: {
  days: number;
  siteConfigId?: string | null;
}): Promise<VoiceActivationSeriesRow[]> {
  const days = Math.min(Math.max(1, Math.floor(opts.days)), 90);
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - days);
  since.setUTCHours(0, 0, 0, 0);

  const siteClause =
    opts.siteConfigId && opts.siteConfigId.length > 0
      ? sql`AND e.site_config_id = ${opts.siteConfigId}`
      : sql``;

  const result = await db.execute(sql`
    SELECT
      (date_trunc('day', e.created_at AT TIME ZONE 'UTC'))::date::text AS day_utc,
      e.site_config_id,
      COALESCE(sc.name, 'Unknown') AS site_name,
      COUNT(*)::int AS count
    FROM verification_gate_passage_events e
    LEFT JOIN site_configs sc ON sc.id = e.site_config_id
    WHERE e.passage_kind = 'voice_client_heartbeat'
      AND e.created_at >= ${since}
      AND e.rate_limited = false
      AND e.http_status IN (200, 204)
      ${siteClause}
    GROUP BY
      (date_trunc('day', e.created_at AT TIME ZONE 'UTC'))::date,
      e.site_config_id,
      sc.name
    ORDER BY day_utc ASC, count DESC
  `);

  type PgRow = {
    day_utc?: string;
    site_config_id?: string | null;
    site_name?: string | null;
    count?: string | number;
  };
  const rows = (result as { rows: PgRow[] }).rows ?? [];

  return rows.map((r) => ({
    dayUtc: String(r.day_utc ?? ""),
    siteConfigId: r.site_config_id ?? null,
    siteName: String(r.site_name ?? "Unknown"),
    count: Number(r.count ?? 0),
  }));
}
