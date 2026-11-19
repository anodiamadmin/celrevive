-- ============================================================================
-- CELRIV MVP | SKIN ANALYSIS + BASE DETAILS + ACTIVE DETAILS
-- Additive PostgreSQL schema migration, version 1.0 (2026-11-19)
-- Baseline: CelRevive_DDL_updated.sql, version 3.0 (2026-08-25)
--
-- PURPOSE
--  A. Skin Analysis Result Details: confidence/provenance, five match labels,
--     top-five qualifying concerns for the recommendation report.
--  B. Recommended Base Details: customer copy, benefits, reusable base
--     ingredient library and verified many-to-many base/ingredient mappings.
--  C. Recommended Active Details: customer copy, reference and recommended
--     concentration, mechanisms, evidence-backed results and visual assets.
--
-- IMPORTANT
--  * Run AFTER the baseline DDL. This does NOT contain all master-data DML.
--  * Existing base.description and active.description are technical records.
--    They are PRESERVED. New customer_description / what_it_is fields are added.
--  * This file does not invent ingredient lists, clinical claims or imagery.
--  * Newly authored claims/content default to DRAFT; publication requires review.
--  * Customer-facing 'Clinical Results' should only contain approved claims
--    supported by suitable human clinical evidence.
--  * AI detection confidence is NOT skin severity and is not, by itself,
--    evidence of a calibrated probability.
--  * The script works with a baseline installed in celrevive OR public.
--  * Safe to re-run on the same schema without deleting existing data.
-- ============================================================================

BEGIN;

-- Resolve the real schema containing BOTH baseline master tables.
-- Use the same transaction-local search_path for all new objects/views.
DO $celriv_bootstrap$
DECLARE
    v_schema TEXT;
BEGIN
    SELECT n.nspname INTO v_schema
    FROM pg_namespace n
    WHERE n.nspname IN ('celrevive', 'public')
      AND to_regclass(format('%I.base', n.nspname)) IS NOT NULL
      AND to_regclass(format('%I.active', n.nspname)) IS NOT NULL
      AND to_regclass(format('%I.session_skin_concern', n.nspname)) IS NOT NULL
    ORDER BY CASE WHEN n.nspname = 'celrevive' THEN 0 ELSE 1 END
    LIMIT 1;

    IF v_schema IS NULL THEN
        RAISE EXCEPTION 'CelRiv baseline tables not found in celrevive or public; run CelRevive_DDL_updated.sql first';
    END IF;

    PERFORM set_config('search_path', format('%I, public', v_schema), TRUE);
END;
$celriv_bootstrap$;

-- ============================================================================
-- 1. SKIN ANALYSIS RESULT DETAILS
-- ============================================================================

-- The baseline stores independent IMAGE/QUESTIONNAIRE confidence scores on
-- session_skin_concern_detection and OR-combined existence on
-- session_skin_concern. Retain those source measurements and the OR logic.
-- A genuine fused score can be stored separately when the application has one.
ALTER TABLE session_skin_concern
    ADD COLUMN IF NOT EXISTS combined_confidence_score DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS confidence_calculation_method VARCHAR(150),
    ADD COLUMN IF NOT EXISTS customer_explanation TEXT;

COMMENT ON COLUMN session_skin_concern.combined_confidence_score IS
'Optional genuinely combined/fused AI score on [0,1]. Do not populate by treating MAX(image, questionnaire) as a fused probability.';
COMMENT ON COLUMN session_skin_concern.confidence_calculation_method IS
'Name/version of the score-fusion method, if combined_confidence_score is supplied.';
COMMENT ON COLUMN session_skin_concern.customer_explanation IS
'Reviewed customer-facing explanation; separate from if_skin_concern_true_why, which may contain internal AI reasoning.';

DO $celriv_constraints$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'session_skin_concern'::regclass
          AND conname = 'ck_celriv_combined_confidence_range'
    ) THEN
        ALTER TABLE session_skin_concern
            ADD CONSTRAINT ck_celriv_combined_confidence_range
            CHECK (combined_confidence_score IS NULL
                   OR combined_confidence_score BETWEEN 0 AND 1);
    END IF;
END;
$celriv_constraints$;

-- Customer-facing levels previously agreed for CelRiv.
-- Keep thresholds in reference data so labels can be revised without a view
-- or API migration. Note: 100% is explicitly included in the last band.
CREATE TABLE IF NOT EXISTS skin_concern_match_level (
    match_level_id    SMALLINT PRIMARY KEY,
    minimum_score     NUMERIC(4,2) NOT NULL,
    maximum_score     NUMERIC(4,2) NOT NULL,
    maximum_inclusive BOOLEAN NOT NULL DEFAULT FALSE,
    match_label       VARCHAR(80) NOT NULL,
    CONSTRAINT uq_celriv_match_label UNIQUE (match_label),
    CONSTRAINT ck_celriv_match_level_range CHECK (
        minimum_score >= 0 AND maximum_score <= 1
        AND minimum_score < maximum_score
    )
);

COMMENT ON TABLE skin_concern_match_level IS
'AI match-strength labels, NOT skin-condition severity or medical diagnosis.';

-- Only reference/configuration inserts are included in this migration.
INSERT INTO skin_concern_match_level
    (match_level_id, minimum_score, maximum_score, maximum_inclusive, match_label)
VALUES
    (1, 0.50, 0.60, FALSE, 'Possible Match'),
    (2, 0.60, 0.70, FALSE, 'Moderate Match'),
    (3, 0.70, 0.80, FALSE, 'Notable Match'),
    (4, 0.80, 0.90, FALSE, 'Strong Match'),
    (5, 0.90, 1.00, TRUE,  'Very Strong Match')
ON CONFLICT (match_level_id) DO NOTHING;

-- ============================================================================
-- 2. RECOMMENDED BASE DETAILS
-- ============================================================================

ALTER TABLE base
    ADD COLUMN IF NOT EXISTS customer_description TEXT,
    ADD COLUMN IF NOT EXISTS texture_and_finish TEXT,
    ADD COLUMN IF NOT EXISTS suitable_skin_types TEXT,
    ADD COLUMN IF NOT EXISTS note TEXT,
    ADD COLUMN IF NOT EXISTS default_pack_size_g NUMERIC(9,2),
    ADD COLUMN IF NOT EXISTS ingredient_list_verified BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS content_status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    ADD COLUMN IF NOT EXISTS content_reviewed_by VARCHAR(255),
    ADD COLUMN IF NOT EXISTS content_reviewed_at TIMESTAMPTZ;

COMMENT ON COLUMN base.description IS
'Existing technical/source-workbook metadata. Do not overwrite when populating the customer-facing modal.';
COMMENT ON COLUMN base.customer_description IS
'Customer-friendly base overview; e.g. lightweight water-based serum designed to complement personalised actives.';
COMMENT ON COLUMN base.texture_and_finish IS
'Customer-facing sensory description of how the base applies and feels.';
COMMENT ON COLUMN base.suitable_skin_types IS
'Non-diagnostic base suitability copy, scientifically reviewed.';
COMMENT ON COLUMN base.note IS
'Plain-language note about the base versus separately selected active ingredients; do not use UI jargon such as modal.';
COMMENT ON COLUMN base.default_pack_size_g IS
'Optional default finished-product package size in grams, not an assertion that the base alone weighs this amount.';
COMMENT ON COLUMN base.ingredient_list_verified IS
'True only after the FULL base ingredient list has been validated against the actual proprietary formulation/INCI record.';

-- Each benefit is its own ordered row for the modal's bullet-list section.
CREATE TABLE IF NOT EXISTS base_key_benefit (
    base_benefit_id     BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    base_id             BIGINT NOT NULL,
    benefit_description TEXT NOT NULL,
    display_order       INTEGER NOT NULL,
    publication_status  VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_celriv_base_key_benefit_base FOREIGN KEY (base_id)
        REFERENCES base(base_id) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT uq_celriv_base_key_benefit_order UNIQUE (base_id, display_order),
    CONSTRAINT ck_celriv_base_key_benefit_order CHECK (display_order >= 1),
    CONSTRAINT ck_celriv_base_key_benefit_status CHECK (
        publication_status IN ('DRAFT', 'APPROVED', 'RETIRED')
    )
);

-- A canonical ingredient can occur in many base formulas. Benefits here are
-- GENERAL ingredient functions; base-specific roles may be overridden in the
-- mapping table. These rows are not proof an ingredient is in any given base.
CREATE TABLE IF NOT EXISTS base_ingredient (
    base_ingredient_id      BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    base_ingredient_name    VARCHAR(255) NOT NULL,
    inci_name               VARCHAR(255),
    base_ingredient_benefit TEXT NOT NULL,
    publication_status      VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    created_at              TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_celriv_base_ingredient_name UNIQUE (base_ingredient_name),
    CONSTRAINT ck_celriv_base_ingredient_status CHECK (
        publication_status IN ('DRAFT', 'APPROVED', 'RETIRED')
    )
);

-- Many-to-many relationship: a base contains multiple ingredients, and the
-- same ingredient can be used in more than one base. Only VERIFIED mappings
-- should be shown to customers as actual formula components.
CREATE TABLE IF NOT EXISTS base_to_base_ingredient (
    base_id                     BIGINT NOT NULL,
    base_ingredient_id          BIGINT NOT NULL,
    display_order               INTEGER NOT NULL,
    benefit_description_override TEXT,
    verification_status         VARCHAR(20) NOT NULL DEFAULT 'PROPOSED',
    verified_by                 VARCHAR(255),
    verified_at                 TIMESTAMPTZ,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (base_id, base_ingredient_id),
    CONSTRAINT fk_celriv_b2bi_base FOREIGN KEY (base_id)
        REFERENCES base(base_id) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_celriv_b2bi_ingredient FOREIGN KEY (base_ingredient_id)
        REFERENCES base_ingredient(base_ingredient_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT uq_celriv_b2bi_display_order UNIQUE (base_id, display_order),
    CONSTRAINT ck_celriv_b2bi_display_order CHECK (display_order >= 1),
    CONSTRAINT ck_celriv_b2bi_status CHECK (
        verification_status IN ('PROPOSED', 'VERIFIED', 'REJECTED')
    )
);

COMMENT ON TABLE base_to_base_ingredient IS
'Proposed/verified base-to-ingredient composition. Never treat suggested candidate lists as confirmed proprietary ingredients.';

DO $celriv_base_constraints$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conrelid = 'base'::regclass
        AND conname = 'ck_celriv_base_pack_size'
    ) THEN
        ALTER TABLE base ADD CONSTRAINT ck_celriv_base_pack_size
            CHECK (default_pack_size_g IS NULL OR default_pack_size_g > 0);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conrelid = 'base'::regclass
        AND conname = 'ck_celriv_base_content_status'
    ) THEN
        ALTER TABLE base ADD CONSTRAINT ck_celriv_base_content_status
            CHECK (content_status IN ('DRAFT', 'APPROVED', 'RETIRED'));
    END IF;
END;
$celriv_base_constraints$;

-- ============================================================================
-- 3. RECOMMENDED ACTIVE DETAILS
-- ============================================================================

ALTER TABLE active
    ADD COLUMN IF NOT EXISTS percentage NUMERIC(6,3),
    ADD COLUMN IF NOT EXISTS very_short_description VARCHAR(180),
    ADD COLUMN IF NOT EXISTS what_it_is TEXT,
    ADD COLUMN IF NOT EXISTS content_status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    ADD COLUMN IF NOT EXISTS content_reviewed_by VARCHAR(255),
    ADD COLUMN IF NOT EXISTS content_reviewed_at TIMESTAMPTZ;

COMMENT ON COLUMN active.description IS
'Original technical evidence/composition narrative. Preserve it; populate the customer-facing fields separately.';
COMMENT ON COLUMN active.percentage IS
'Reference % w/w from the source workbook field "Grams per 100g total active + base" (e.g. 2.0). It is NOT guaranteed to be the concentration used in an individual order.';
COMMENT ON COLUMN active.very_short_description IS
'Concise UI badge/subtitle, e.g. Natural Retinol Alternative.';
COMMENT ON COLUMN active.what_it_is IS
'Plain-language ingredient identity/origin description for the customer-facing active modal.';

-- Persist a per-recommendation concentration when the actual recommended
-- formulation differs from the master reference value.
ALTER TABLE recommendation_active
    ADD COLUMN IF NOT EXISTS applied_percentage NUMERIC(6,3);

COMMENT ON COLUMN recommendation_active.applied_percentage IS
'% w/w selected for THIS recommended active+base combination. When NULL, active.percentage is a reference value only.';

DO $celriv_active_constraints$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conrelid = 'active'::regclass
        AND conname = 'ck_celriv_active_reference_percentage'
    ) THEN
        ALTER TABLE active ADD CONSTRAINT ck_celriv_active_reference_percentage
            CHECK (percentage IS NULL OR (percentage > 0 AND percentage <= 100));
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conrelid = 'active'::regclass
        AND conname = 'ck_celriv_active_content_status'
    ) THEN
        ALTER TABLE active ADD CONSTRAINT ck_celriv_active_content_status
            CHECK (content_status IN ('DRAFT', 'APPROVED', 'RETIRED'));
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'recommendation_active'::regclass
        AND conname = 'ck_celriv_recommendation_active_applied_pct'
    ) THEN
        ALTER TABLE recommendation_active
            ADD CONSTRAINT ck_celriv_recommendation_active_applied_pct
            CHECK (applied_percentage IS NULL
                OR (applied_percentage > 0 AND applied_percentage <= 100));
    END IF;
END;
$celriv_active_constraints$;

-- The user specification said "shot_desc"; corrected to "short_desc" to
-- avoid a persistent spelling error in the production API/database contract.
CREATE TABLE IF NOT EXISTS how_active_works (
    how_active_works_id         BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    active_id                   INTEGER NOT NULL,
    how_active_works_short_desc VARCHAR(180) NOT NULL,
    how_active_works_desc       TEXT NOT NULL,
    display_order               INTEGER NOT NULL,
    publication_status          VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_celriv_haw_active FOREIGN KEY (active_id)
        REFERENCES active(active_id) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT uq_celriv_haw_order UNIQUE (active_id, display_order),
    CONSTRAINT ck_celriv_haw_order CHECK (display_order >= 1),
    CONSTRAINT ck_celriv_haw_status CHECK (
        publication_status IN ('DRAFT', 'APPROVED', 'RETIRED')
    )
);

-- The table name is kept as requested. Evidence type prevents non-clinical
-- laboratory findings from being misrepresented as human clinical outcomes.
CREATE TABLE IF NOT EXISTS clinical_result (
    clinical_result_id         BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    active_id                  INTEGER NOT NULL,
    clinical_results_short_desc VARCHAR(180) NOT NULL,
    clinical_results_desc      TEXT NOT NULL,
    evidence_type              VARCHAR(30) NOT NULL DEFAULT 'UNVERIFIED',
    source_doc_id              BIGINT,
    source_reference           TEXT,
    display_order              INTEGER NOT NULL,
    publication_status         VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    reviewed_by                VARCHAR(255),
    reviewed_at                TIMESTAMPTZ,
    created_at                 TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                 TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_celriv_cr_active FOREIGN KEY (active_id)
        REFERENCES active(active_id) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_celriv_cr_source FOREIGN KEY (source_doc_id)
        REFERENCES source_document(doc_id) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT uq_celriv_cr_order UNIQUE (active_id, display_order),
    CONSTRAINT ck_celriv_cr_order CHECK (display_order >= 1),
    CONSTRAINT ck_celriv_cr_evidence_type CHECK (
        evidence_type IN ('UNVERIFIED', 'SUPPLIER_CLAIM', 'IN_VITRO',
                          'EX_VIVO', 'PRECLINICAL', 'CLINICAL')
    ),
    CONSTRAINT ck_celriv_cr_status CHECK (
        publication_status IN ('DRAFT', 'APPROVED', 'RETIRED')
    ),
    CONSTRAINT ck_celriv_cr_approval_evidence CHECK (
        publication_status <> 'APPROVED' OR
        (evidence_type <> 'UNVERIFIED' AND
         (source_doc_id IS NOT NULL OR NULLIF(BTRIM(source_reference), '') IS NOT NULL))
    )
);

COMMENT ON COLUMN clinical_result.evidence_type IS
'CLINICAL = evidence from human clinical evaluation; other types are supplier/research findings and must not be displayed under a clinical-results heading.';

-- Future optional support for supplier/proprietary imagery and clearly labelled
-- BEFORE/AFTER CONCEPTUAL ILLUSTRATIONS (not actual clinical outcomes).
-- Store a URI/reference only, never binary images in this master-data table.
CREATE TABLE IF NOT EXISTS active_visual_asset (
    active_visual_asset_id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    active_id              INTEGER NOT NULL,
    asset_kind             VARCHAR(40) NOT NULL,
    asset_uri              TEXT NOT NULL,
    alt_text               TEXT,
    is_ai_generated        BOOLEAN NOT NULL DEFAULT FALSE,
    disclaimer             TEXT,
    rights_verified        BOOLEAN NOT NULL DEFAULT FALSE,
    display_order          INTEGER NOT NULL DEFAULT 1,
    publication_status     VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    created_at             TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_celriv_ava_active FOREIGN KEY (active_id)
        REFERENCES active(active_id) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT ck_celriv_ava_kind CHECK (
        asset_kind IN ('SUPPLIER_REFERENCE', 'CONCEPTUAL_BEFORE_AFTER')
    ),
    CONSTRAINT ck_celriv_ava_status CHECK (
        publication_status IN ('DRAFT', 'APPROVED', 'RETIRED')
    ),
    CONSTRAINT ck_celriv_ava_order CHECK (display_order >= 1),
    CONSTRAINT ck_celriv_ava_conceptual_disclaimer CHECK (
        asset_kind <> 'CONCEPTUAL_BEFORE_AFTER'
        OR NULLIF(BTRIM(disclaimer), '') IS NOT NULL
    )
);

COMMENT ON TABLE active_visual_asset IS
'Artwork for actives; conceptual before/after media must carry clear illustrative-only labelling and never be presented as actual trial results.';

-- ============================================================================
-- 4. INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_celriv_base_key_benefit_base_order
    ON base_key_benefit(base_id, display_order);
CREATE INDEX IF NOT EXISTS idx_celriv_b2bi_ingredient_id
    ON base_to_base_ingredient(base_ingredient_id);
CREATE INDEX IF NOT EXISTS idx_celriv_haw_active_order
    ON how_active_works(active_id, display_order);
CREATE INDEX IF NOT EXISTS idx_celriv_cr_active_order
    ON clinical_result(active_id, display_order);
CREATE INDEX IF NOT EXISTS idx_celriv_cr_source_doc
    ON clinical_result(source_doc_id);
CREATE INDEX IF NOT EXISTS idx_celriv_ava_active_kind
    ON active_visual_asset(active_id, asset_kind);
CREATE INDEX IF NOT EXISTS idx_celriv_ssc_positive_session
    ON session_skin_concern(session_id, concern_id)
    WHERE skin_concern_exists = TRUE;
CREATE INDEX IF NOT EXISTS idx_celriv_detection_latest
    ON session_skin_concern_detection
       (session_id, concern_id, detection_source, detected_at DESC);

-- ============================================================================
-- 5. CUSTOMER-FACING / API VIEWS
-- ============================================================================

-- One row per detected concern. 'BOTH' retains separate source scores.
-- For BOTH, if there is no genuine combined score yet, MAX(source scores)
-- is used solely for MVP RANKING, transparently marked MAX_SOURCE_FALLBACK.
-- It must NOT be described as a statistically fused confidence probability.
CREATE OR REPLACE VIEW vw_celriv_skin_analysis_detail AS
WITH source_data AS (
    SELECT
        ssc.session_id,
        ssc.concern_id,
        sc.concern_name,
        COALESCE(NULLIF(sc.skin_concern_display_name, ''), sc.concern_name)
            AS concern_display_name,
        ssc.image_skin_concern_exists,
        ssc.questionnaire_skin_concern_exists,
        CASE
            WHEN ssc.image_skin_concern_exists AND ssc.questionnaire_skin_concern_exists THEN 'BOTH'
            WHEN ssc.image_skin_concern_exists THEN 'IMAGE'
            WHEN ssc.questionnaire_skin_concern_exists THEN 'QUESTIONNAIRE'
            ELSE 'UNKNOWN'
        END AS detected_by,
        CASE WHEN img.skin_concern_exists THEN img.confidence_score END
            AS image_confidence_score,
        CASE WHEN ques.skin_concern_exists THEN ques.confidence_score END
            AS questionnaire_confidence_score,
        ssc.combined_confidence_score,
        ssc.confidence_calculation_method,
        ssc.customer_explanation,
        ssc.if_skin_concern_true_why AS internal_explanation,
        img.if_skin_concern_true_why AS image_explanation,
        ques.if_skin_concern_true_why AS questionnaire_explanation
    FROM session_skin_concern ssc
    JOIN skin_concern sc ON sc.concern_id = ssc.concern_id
    LEFT JOIN LATERAL (
        SELECT d.skin_concern_exists, d.confidence_score,
               d.if_skin_concern_true_why
        FROM session_skin_concern_detection d
        WHERE d.session_id = ssc.session_id
          AND d.concern_id = ssc.concern_id
          AND d.detection_source = 'IMAGE'
        ORDER BY d.detected_at DESC, d.detection_id DESC
        LIMIT 1
    ) img ON TRUE
    LEFT JOIN LATERAL (
        SELECT d.skin_concern_exists, d.confidence_score,
               d.if_skin_concern_true_why
        FROM session_skin_concern_detection d
        WHERE d.session_id = ssc.session_id
          AND d.concern_id = ssc.concern_id
          AND d.detection_source = 'QUESTIONNAIRE'
        ORDER BY d.detected_at DESC, d.detection_id DESC
        LIMIT 1
    ) ques ON TRUE
    WHERE ssc.skin_concern_exists = TRUE
), scored AS (
    SELECT s.*,
        CASE
            WHEN s.detected_by = 'BOTH' AND s.combined_confidence_score IS NOT NULL
                THEN s.combined_confidence_score
            WHEN s.detected_by = 'BOTH'
                THEN GREATEST(s.image_confidence_score, s.questionnaire_confidence_score)
            WHEN s.detected_by = 'IMAGE' THEN s.image_confidence_score
            WHEN s.detected_by = 'QUESTIONNAIRE' THEN s.questionnaire_confidence_score
        END AS ranking_confidence_score,
        CASE
            WHEN s.detected_by = 'BOTH' AND s.combined_confidence_score IS NOT NULL
                THEN 'FUSED_COMBINED'
            WHEN s.detected_by = 'BOTH' THEN 'MAX_SOURCE_FALLBACK'
            WHEN s.detected_by = 'IMAGE' THEN 'IMAGE'
            WHEN s.detected_by = 'QUESTIONNAIRE' THEN 'QUESTIONNAIRE'
            ELSE 'UNKNOWN'
        END AS score_basis
    FROM source_data s
)
SELECT
    s.*,
    ROUND((s.ranking_confidence_score * 100)::NUMERIC, 2)
        AS ranking_score_percent,
    ml.match_level_id,
    ml.match_label
FROM scored s
LEFT JOIN skin_concern_match_level ml
  ON s.ranking_confidence_score >= ml.minimum_score
 AND (s.ranking_confidence_score < ml.maximum_score
      OR (ml.maximum_inclusive AND s.ranking_confidence_score = ml.maximum_score));

COMMENT ON VIEW vw_celriv_skin_analysis_detail IS
'Per concern/source AI observation with separate confidence provenance. MAX_SOURCE_FALLBACK supports ranking only; never claim it is true score fusion or condition severity.';

-- Top FIVE per customer session, only score >= 50%.
-- Missing/null scores are excluded (not silently treated as zero).
CREATE OR REPLACE VIEW vw_celriv_top5_skin_concerns AS
SELECT ranked.*
FROM (
    SELECT
        d.*,
        ROW_NUMBER() OVER (
            PARTITION BY d.session_id
            ORDER BY d.ranking_confidence_score DESC, d.concern_id
        ) AS result_rank
    FROM vw_celriv_skin_analysis_detail d
    WHERE d.ranking_confidence_score >= 0.50
) ranked
WHERE ranked.result_rank <= 5;

COMMENT ON VIEW vw_celriv_top5_skin_concerns IS
'CelRiv report top five detected cosmetic concerns scoring >=0.50, ordered descending. The score does not measure condition severity.';

-- Optional one-row-per-session report payload: skin type + ordered top five.
-- Keeps the Shopify/frontend report simple while preserving detailed provenance.
CREATE OR REPLACE VIEW vw_celriv_skin_analysis_report AS
SELECT
    cs.session_id,
    cs.shopify_customer_id,
    cs.shopify_customer_name,
    sp.skin_type,
    COALESCE((
        SELECT JSONB_AGG(
            JSONB_BUILD_OBJECT(
                'rank', d.result_rank,
                'concern_id', d.concern_id,
                'concern_name', d.concern_display_name,
                'detected_by', d.detected_by,
                'ranking_score_percent', d.ranking_score_percent,
                'match_category', d.match_label,
                'score_basis', d.score_basis,
                'image_confidence_score', d.image_confidence_score,
                'questionnaire_confidence_score', d.questionnaire_confidence_score,
                'combined_confidence_score', d.combined_confidence_score,
                'customer_explanation', d.customer_explanation
            ) ORDER BY d.result_rank
        )
        FROM vw_celriv_top5_skin_concerns d
        WHERE d.session_id = cs.session_id
    ), '[]'::JSONB) AS top_skin_concerns
FROM customer_session cs
LEFT JOIN session_profile sp ON sp.session_id = cs.session_id;

COMMENT ON VIEW vw_celriv_skin_analysis_report IS
'Session skin-type and top-five AI cosmetic-concern insights, structured for the customer-facing details report.';

-- Base modal: only reviewed, customer-approved base content and verified
-- ingredient memberships. Frontend can switch heading from "Base Ingredients"
-- to "Full Base Ingredients" ONLY if ingredient_list_verified is TRUE.
CREATE OR REPLACE VIEW vw_celriv_base_modal_content AS
SELECT
    b.base_id,
    b.base_name,
    b.default_pack_size_g,
    b.customer_description,
    b.texture_and_finish,
    b.suitable_skin_types,
    b.note,
    b.ingredient_list_verified,
    COALESCE((
        SELECT JSONB_AGG(
            JSONB_BUILD_OBJECT(
                'base_benefit_id', bb.base_benefit_id,
                'description', bb.benefit_description,
                'display_order', bb.display_order
            ) ORDER BY bb.display_order, bb.base_benefit_id
        )
        FROM base_key_benefit bb
        WHERE bb.base_id = b.base_id
          AND bb.publication_status = 'APPROVED'
    ), '[]'::JSONB) AS key_benefits,
    COALESCE((
        SELECT JSONB_AGG(
            JSONB_BUILD_OBJECT(
                'base_ingredient_id', bi.base_ingredient_id,
                'name', bi.base_ingredient_name,
                'inci_name', bi.inci_name,
                'benefit', COALESCE(bi_map.benefit_description_override,
                                    bi.base_ingredient_benefit),
                'display_order', bi_map.display_order
            ) ORDER BY bi_map.display_order, bi.base_ingredient_id
        )
        FROM base_to_base_ingredient bi_map
        JOIN base_ingredient bi
          ON bi.base_ingredient_id = bi_map.base_ingredient_id
        WHERE bi_map.base_id = b.base_id
          AND bi_map.verification_status = 'VERIFIED'
          AND bi.publication_status = 'APPROVED'
    ), '[]'::JSONB) AS base_ingredients
FROM base b
WHERE b.content_status = 'APPROVED';

COMMENT ON VIEW vw_celriv_base_modal_content IS
'Approved customer-facing base details with ordered approved benefits and verified base-ingredient composition.';

-- Active modal content is separately approved. Only approved human-trial
-- claims appear under "clinical_results"; approved laboratory and other
-- findings appear separately under "other_research_findings".
CREATE OR REPLACE VIEW vw_celriv_active_modal_content AS
SELECT
    a.active_id,
    a.active_name,
    a.percentage AS reference_percentage,
    a.very_short_description,
    a.what_it_is,
    COALESCE((
        SELECT JSONB_AGG(
            JSONB_BUILD_OBJECT(
                'how_active_works_id', haw.how_active_works_id,
                'short_description', haw.how_active_works_short_desc,
                'description', haw.how_active_works_desc,
                'display_order', haw.display_order
            ) ORDER BY haw.display_order, haw.how_active_works_id
        )
        FROM how_active_works haw
        WHERE haw.active_id = a.active_id
          AND haw.publication_status = 'APPROVED'
    ), '[]'::JSONB) AS how_it_works,
    COALESCE((
        SELECT JSONB_AGG(
            JSONB_BUILD_OBJECT(
                'clinical_result_id', cr.clinical_result_id,
                'short_description', cr.clinical_results_short_desc,
                'description', cr.clinical_results_desc,
                'source_doc_id', cr.source_doc_id,
                'source_reference', cr.source_reference,
                'display_order', cr.display_order
            ) ORDER BY cr.display_order, cr.clinical_result_id
        )
        FROM clinical_result cr
        WHERE cr.active_id = a.active_id
          AND cr.publication_status = 'APPROVED'
          AND cr.evidence_type = 'CLINICAL'
    ), '[]'::JSONB) AS clinical_results,
    COALESCE((
        SELECT JSONB_AGG(
            JSONB_BUILD_OBJECT(
                'result_id', cr.clinical_result_id,
                'short_description', cr.clinical_results_short_desc,
                'description', cr.clinical_results_desc,
                'evidence_type', cr.evidence_type,
                'source_doc_id', cr.source_doc_id,
                'source_reference', cr.source_reference,
                'display_order', cr.display_order
            ) ORDER BY cr.display_order, cr.clinical_result_id
        )
        FROM clinical_result cr
        WHERE cr.active_id = a.active_id
          AND cr.publication_status = 'APPROVED'
          AND cr.evidence_type <> 'CLINICAL'
    ), '[]'::JSONB) AS other_research_findings,
    COALESCE((
        SELECT JSONB_AGG(
            JSONB_BUILD_OBJECT(
                'asset_id', ava.active_visual_asset_id,
                'asset_kind', ava.asset_kind,
                'asset_uri', ava.asset_uri,
                'alt_text', ava.alt_text,
                'disclaimer', ava.disclaimer,
                'display_order', ava.display_order
            ) ORDER BY ava.display_order, ava.active_visual_asset_id
        )
        FROM active_visual_asset ava
        WHERE ava.active_id = a.active_id
          AND ava.publication_status = 'APPROVED'
          AND ava.rights_verified = TRUE
    ), '[]'::JSONB) AS visual_assets
FROM active a
WHERE a.content_status = 'APPROVED';

COMMENT ON VIEW vw_celriv_active_modal_content IS
'Approved active detail records; evidence levels remain distinct so non-human findings are not presented as clinical trials.';

-- One row per base recommendation, ready for the recommendation page.
CREATE OR REPLACE VIEW vw_celriv_recommended_base_modal AS
SELECT
    rb.recommendation_id,
    rb.recommendation_rank,
    rb.if_base_selected_why,
    b.*
FROM recommendation_base rb
JOIN vw_celriv_base_modal_content b ON b.base_id = rb.base_id
WHERE rb.base_selected = TRUE;

-- One row per recommended active + base, ready for the link/modal.
-- If applied_percentage is null, reference_percentage is a fallback only.
-- The "percentage_basis" field explicitly records this distinction.
CREATE OR REPLACE VIEW vw_celriv_recommended_active_modal AS
SELECT
    ra.recommendation_id,
    ra.base_id,
    ra.recommendation_rank,
    ra.if_active_selected_why,
    ra.applied_percentage,
    COALESCE(ra.applied_percentage, a.reference_percentage)
        AS displayed_percentage,
    CASE
        WHEN ra.applied_percentage IS NOT NULL THEN 'RECOMMENDATION_APPLIED'
        WHEN a.reference_percentage IS NOT NULL THEN 'MASTER_REFERENCE_FALLBACK'
        ELSE 'UNKNOWN'
    END AS percentage_basis,
    a.*
FROM recommendation_active ra
JOIN vw_celriv_active_modal_content a ON a.active_id = ra.active_id
WHERE ra.active_selected = TRUE;

COMMENT ON VIEW vw_celriv_recommended_active_modal IS
'Concentration is per recommended product when applied_percentage is set; otherwise displayed_percentage is only the workbook reference percentage.';

COMMIT;

-- ============================================================================
-- POST-MIGRATION / DEVELOPMENT GUIDANCE (NOT EXECUTED)
-- ============================================================================
-- 1. Populate customer copy/benefits/ingredients/claims in a separate DML file.
-- 2. Do not derive base ingredient membership from typical cosmetic recipes:
--    obtain the actual CelRiv proprietary INCI lists and formulation sign-off.
-- 3. Set publication_status/content_status to APPROVED only after review by
--    Theresa/Lindsey or CelRiv's authorised formulation/claims reviewer.
-- 4. For base ingredients set verification_status=VERIFIED only when genuinely
--    present; mark base.ingredient_list_verified=TRUE only when complete.
-- 5. In skin analysis, BOTH with no model-calculated combined score displays
--    a ranking score based on the strongest source; its score_basis says so.
-- 6. Consider separately validating calibration before treating AI scores
--    as probabilities. Match labels do NOT indicate disease severity.
-- 7. For dynamic UI, consume the new views. Existing immutable
--    recommendation_output.output_json snapshots are NOT rewritten here.
-- 8. The current recommendation_active.applied_percentage should come from
--    final agreed formulation, subject to compatibility and dose validation.
-- 9. If an active has no approved CLINICAL claims, use a cautious heading
--    such as "Research & Reported Benefits" rather than "Clinical Results".
-- 10. Conceptual Before & After images must have an explicit disclaimer, not
--     be presented as actual outcomes, and have verified usage rights.
-- ============================================================================
--
-- OPTIONAL READ-ONLY SMOKE TESTS (uncomment after deploying and seeding):
-- SELECT match_level_id, match_label, minimum_score, maximum_score
--   FROM skin_concern_match_level ORDER BY match_level_id;
-- SELECT * FROM vw_celriv_top5_skin_concerns LIMIT 10;
-- SELECT * FROM vw_celriv_skin_analysis_report LIMIT 2;
-- SELECT * FROM vw_celriv_base_modal_content WHERE base_name = 'Serum';
-- SELECT * FROM vw_celriv_active_modal_content WHERE active_name = 'NovoRetin™';
-- SELECT * FROM vw_celriv_recommended_active_modal LIMIT 5;
