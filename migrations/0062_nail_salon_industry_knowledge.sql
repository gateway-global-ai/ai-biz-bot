-- Optional: append Nail Salon industry research summary to knowledge_library for demo slugs.
-- Idempotent: skips if a doc with title prefix "Nail Salon Industry Research" already exists.
DO $$
DECLARE
  doc jsonb := jsonb_build_object(
    'id', gen_random_uuid()::text,
    'title', 'Nail Salon Industry Research (summary)',
    'content', $CONTENT$
Salon and beauty services are a large, fragmented market with thin margins and labor-heavy operations. Key points for AI front-desk positioning:

- Scale: Global salon services are a large and growing market; U.S. spend is in the tens of billions annually; many independent and franchise locations compete locally.
- Margins: Rent, labor, supplies, and tips pressure leave many salons in single-digit net margins; every missed call or no-show hits revenue directly.
- Labor: Long hours, commission vs booth-rent models, turnover, and emotional load on staff and owners are common pain points.
- Platform leverage: Booking marketplaces and modern salon software show that automation (24/7 capture, reminders, messaging) can improve utilization and revenue when applied to clear operational problems.

Use this as evidence for bold claims about missed demand and operational load — not as a spec sheet to read aloud. Cite one statistic at a time when it helps the owner decide.
$CONTENT$,
    'addedAt', to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
  );
  r RECORD;
BEGIN
  FOR r IN SELECT id, knowledge_library FROM site_configs WHERE slug IN ('nail-salon-demo', 'ai-biz-bots')
  LOOP
    IF EXISTS (
      SELECT 1 FROM jsonb_array_elements(COALESCE(r.knowledge_library, '[]'::jsonb)) AS e(elem)
      WHERE elem->>'title' LIKE 'Nail Salon Industry Research%'
    ) THEN
      CONTINUE;
    END IF;
    UPDATE site_configs
    SET knowledge_library = COALESCE(r.knowledge_library, '[]'::jsonb) || jsonb_build_array(doc)
    WHERE id = r.id;
  END LOOP;
END $$;
