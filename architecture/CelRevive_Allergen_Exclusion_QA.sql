-- ============================================================================
-- CelRevive - Allergen / Active Exclusion QA
-- Work item: 1.5 QA scaffolding
-- Target: PostgreSQL
--
-- Run AFTER CelRevive_Allergen_Exclusion_Migration.sql succeeds.
-- No production allergen/exclusion data is inserted by this file.
-- ============================================================================

-- 1. Confirm the new exclusion tables exist.
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('allergen_exclusion_master', 'active_allergen_exclusion')
ORDER BY table_name;

-- Expected: 2 rows.

-- 2. Confirm the questionnaire mapping objects exist.
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 'session_allergen';

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'customer_session'
  AND column_name = 'allergy_status';

-- Expected: session_allergen exists and customer_session.allergy_status exists.

-- 3. Confirm the active master currently contains the 15 CelRevive actives.
SELECT COUNT(*) AS active_count
FROM active;

-- Expected: 15.

-- 4. Confirm every exclusion row points to an existing active/allergen.
-- FK constraints should make this result empty.
SELECT aae.*
FROM active_allergen_exclusion aae
LEFT JOIN allergen_exclusion_master aem
  ON aem.allergen_id = aae.allergen_id
LEFT JOIN active a
  ON a.active_id = aae.active_id
WHERE aem.allergen_id IS NULL
   OR a.active_id IS NULL;

-- Expected: 0 rows.

-- 5. Confirm exclusion pairs are unique.
SELECT allergen_id, active_id, COUNT(*) AS duplicate_count
FROM active_allergen_exclusion
GROUP BY allergen_id, active_id
HAVING COUNT(*) > 1;

-- Expected: 0 rows; the composite PK also enforces this.

-- 6. Coverage report: for each structured allergen, show how many actives
--    have an explicit exclusion mapping.
SELECT
    aem.allergen_id,
    aem.allergen_code,
    aem.allergen_name,
    COUNT(aae.active_id) AS excluded_active_count
FROM allergen_exclusion_master aem
LEFT JOIN active_allergen_exclusion aae
  ON aae.allergen_id = aem.allergen_id
GROUP BY aem.allergen_id, aem.allergen_code, aem.allergen_name
ORDER BY aem.allergen_id;

-- 7. REQUIRED COVERAGE CHECK:
--    Return every active x known allergen pair that has NO exclusion mapping.
--    This is the key QA query for work item 1.5.
--
--    Interpretation:
--      - Before approved domain data is seeded: many rows are expected.
--      - After the approved domain matrix is complete: this result should be
--        empty if the requirement is that every active has been assessed
--        against every known allergen category.
SELECT
    a.active_id,
    a.active_name,
    aem.allergen_id,
    aem.allergen_code,
    aem.allergen_name
FROM active a
CROSS JOIN allergen_exclusion_master aem
LEFT JOIN active_allergen_exclusion aae
  ON aae.active_id = a.active_id
 AND aae.allergen_id = aem.allergen_id
WHERE aae.active_id IS NULL
ORDER BY aem.allergen_id, a.active_id;

-- 8. Coverage summary.
--    This gives the total expected active/allergen combinations versus the
--    number of configured exclusion mappings.
SELECT
    (SELECT COUNT(*) FROM active)
      * (SELECT COUNT(*) FROM allergen_exclusion_master)
      AS expected_active_allergen_pairs,
    (SELECT COUNT(*) FROM active_allergen_exclusion)
      AS configured_exclusion_pairs,
    (
      (SELECT COUNT(*) FROM active)
      * (SELECT COUNT(*) FROM allergen_exclusion_master)
      - (SELECT COUNT(*) FROM active_allergen_exclusion)
    ) AS missing_assessments;

-- Expected after complete domain seeding:
--   missing_assessments = 0
--
-- IMPORTANT:
-- The current allergen master is intentionally empty until approved domain
-- data is supplied. Therefore the current baseline is not a production
-- coverage pass/fail result.

-- 9. Review all configured exclusion mappings with active names.
SELECT *
FROM vw_active_allergen_exclusion_review
ORDER BY allergen_id, active_id;
