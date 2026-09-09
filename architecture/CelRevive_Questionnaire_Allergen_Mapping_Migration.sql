-- ============================================================================
-- CelRevive - Questionnaire -> Structured Allergen Mapping Migration
-- Work item: 1.2 Map questionnaire allergen field -> exclusion structure
-- Target: PostgreSQL
--
-- Source-aligned design
--   The current questionnaire contains the question id
--     'allergies-sensitivities'
--   with structured status options: Yes / No / Unsure.
--   When Yes is selected, the current UI also collects additionalDetails as
--   free text. That text MUST NOT be used as a safety/exclusion key.
--
--   The authoritative allergen vocabulary is still expected from domain input.
--   Therefore this migration creates the relational mapping structure only;
--   it does not invent or seed allergen values.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Persist the structured answer to the questionnaire allergy question.
-- ---------------------------------------------------------------------------
ALTER TABLE customer_session
    ADD COLUMN IF NOT EXISTS allergy_status VARCHAR(10);

ALTER TABLE customer_session
    DROP CONSTRAINT IF EXISTS chk_customer_session_allergy_status;

ALTER TABLE customer_session
    ADD CONSTRAINT chk_customer_session_allergy_status
    CHECK (allergy_status IS NULL OR allergy_status IN ('YES', 'NO', 'UNSURE'));

COMMENT ON COLUMN customer_session.allergy_status IS
'Structured response to questionnaire question allergies-sensitivities: YES, NO, or UNSURE. Free-text notes are not used as a safety key.';

-- ---------------------------------------------------------------------------
-- 2. Store the structured allergens selected for a session.
--    Only approved allergen master rows can be referenced.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS session_allergen (
    session_id   UUID NOT NULL,
    allergen_id  BIGINT NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_session_allergen
        PRIMARY KEY (session_id, allergen_id),

    CONSTRAINT fk_session_allergen_session
        FOREIGN KEY (session_id)
        REFERENCES customer_session(session_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_session_allergen_master
        FOREIGN KEY (allergen_id)
        REFERENCES allergen_exclusion_master(allergen_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

COMMENT ON TABLE session_allergen IS
'Structured allergens selected by a customer session. This table is the relational bridge from questionnaire answers to CelRevive exclusion rules.';

COMMENT ON COLUMN session_allergen.allergen_id IS
'Canonical allergen/contraindication identifier. Never derive this value from free-text allergyDetails.';

-- ---------------------------------------------------------------------------
-- 3. Index for reverse lookup: sessions affected by an allergen.
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_session_allergen_allergen_id
    ON session_allergen(allergen_id);

-- ---------------------------------------------------------------------------
-- 4. Safety-oriented helper view.
--    It resolves a session's structured allergens to excluded actives.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_session_excluded_active AS
SELECT DISTINCT
    sa.session_id,
    sa.allergen_id,
    aae.active_id,
    a.active_name,
    aae.exclusion_reason,
    aae.source_note
FROM session_allergen sa
JOIN active_allergen_exclusion aae
  ON aae.allergen_id = sa.allergen_id
JOIN active a
  ON a.active_id = aae.active_id
JOIN allergen_exclusion_master aem
  ON aem.allergen_id = sa.allergen_id
WHERE aem.is_active = TRUE;

COMMIT;

-- ============================================================================
-- Verification queries
-- ============================================================================
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_schema = 'public'
--   AND table_name = 'customer_session'
--   AND column_name = 'allergy_status';
--
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_schema = 'public'
--   AND table_name = 'session_allergen'
-- ORDER BY ordinal_position;
--
-- SELECT COUNT(*) AS session_allergen_count FROM session_allergen;
-- SELECT * FROM vw_session_excluded_active;
--
-- Expected immediately after migration:
--   allergy_status column exists;
--   session_allergen exists with session_id -> customer_session and
--   allergen_id -> allergen_exclusion_master foreign keys;
--   session_allergen_count = 0 until structured questionnaire data is wired;
--   no allergen vocabulary or exclusion mappings are invented/seeded here.
-- ============================================================================
