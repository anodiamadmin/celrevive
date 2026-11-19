-- ============================================================================
-- CELRIV | PROPOSED CONTENT SEED FOR MVP DETAIL REPORT + BASE/ACTIVE MODALS
-- DML v1.0   |   Created: 2026-11-19   |   PostgreSQL
--
-- PREREQUISITES (RUN IN ORDER)
--   1. CelRevive_DDL_updated.sql                         (baseline v3.0)
--   2. CelRevive_DML_Primary_Insert_updated.sql          (baseline master data)
--   3. CelRiv_MVP_Detail_Modals_Schema_Migration_v1.sql  (additive schema v1.0)
--   4. THIS SCRIPT
--
-- GOVERNANCE / DATA PROVENANCE
--   * This is proposed editorial/reference data. NOT CelRiv-approved claims.
--   * All new base/active records and benefit/clinical copy remain DRAFT.
--   * Base-to-ingredient links are PROPOSED, including the 5-entry serum
--     example from the UI concept; NO full proprietary INCI was provided.
--   * Other base ingredient maps are POSSIBLE FORMULATION COMPONENTS ONLY.
--     They are not confirmed stock, recipe or label ingredients.
--   * Do not mark mappings VERIFIED or ingredient_list_verified=TRUE without
--     the actual complete formula and regulatory INCI review.
--   * For the active modal, CLINICAL flags indicate that the supplied source
--     SUMMARY mentions human evaluation. The specific claim, dosage, study
--     design, provenance and finished-formula relevance remain to be reviewed.
--   * DRAFT claims do not appear in the approved-content API views.
--   * No customer sessions, fused scores, per-order dosing, or image URLs are
--     invented. Those rows must be provided by real business processes.
--   * This script is transactional/idempotent and preserves approved edits.
--
-- SEED COUNTS: 5 base details, 20 base benefits, 22 candidate ingredients,
--   50 proposed base/ingredient links, 15 active details, 30 mechanisms,
--   40 proposed evidence/result statements. Counts verified at generation.
-- ============================================================================

BEGIN;

DO $celriv_bootstrap$
DECLARE v_schema TEXT;
BEGIN
    SELECT n.nspname INTO v_schema
    FROM pg_namespace n
    WHERE n.nspname IN ('celrevive','public')
      AND to_regclass(format('%I.base', n.nspname)) IS NOT NULL
      AND to_regclass(format('%I.active', n.nspname)) IS NOT NULL
      AND to_regclass(format('%I.base_key_benefit', n.nspname)) IS NOT NULL
      AND to_regclass(format('%I.clinical_result', n.nspname)) IS NOT NULL
    ORDER BY CASE WHEN n.nspname='celrevive' THEN 0 ELSE 1 END
    LIMIT 1;

    IF v_schema IS NULL THEN
        RAISE EXCEPTION 'Required CelRiv baseline/master data or modal-schema migration missing';
    END IF;
    PERFORM set_config('search_path', format('%I, public',v_schema), TRUE);
END;
$celriv_bootstrap$;

-- Fail before any changes if the original master data is missing.
DO $celriv_check_baseline$
DECLARE b_count INTEGER; a_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO b_count FROM base
    WHERE base_name IN ('Light Lotion','Moisturiser','Cream','Serum','Oil');
    SELECT COUNT(*) INTO a_count FROM active WHERE active_id BETWEEN 1 AND 15;
    IF b_count <> 5 OR a_count <> 15 THEN
        RAISE EXCEPTION 'Missing CelRiv masters: bases found %/5; actives found %/15. Load baseline DML first.', b_count,a_count;
    END IF;
END;
$celriv_check_baseline$;

-- ============================================================================
-- 1. Optional match-category reference refresh (dependency: schema migration)
-- ============================================================================

-- Migration already seeds these rows. Upsert for repeatability, but do not
-- replace manually approved level names or thresholds on repeated execution.
INSERT INTO skin_concern_match_level
  (match_level_id, minimum_score, maximum_score, maximum_inclusive, match_label)
VALUES
  (1,0.50,0.60,FALSE,'Possible Match'),
  (2,0.60,0.70,FALSE,'Moderate Match'),
  (3,0.70,0.80,FALSE,'Notable Match'),
  (4,0.80,0.90,FALSE,'Strong Match'),
  (5,0.90,1.00,TRUE,'Very Strong Match')
ON CONFLICT (match_level_id) DO NOTHING;

-- Session-specific customer_explanation, combined_confidence_score and score
-- source provenance are not prefilled. They must come from real AI executions.

-- ============================================================================
-- 2. Base customer-facing fields (UPDATE existing base masters; no duplicate base INSERT)
-- ============================================================================

-- Existing base.description stores historic technical/source-workbook metadata.
-- Only NEW customer-facing columns are populated. Approved records are not
-- overwritten by a later seed run.
UPDATE base b
SET customer_description=v.customer_description,
    texture_and_finish=v.texture_and_finish,
    suitable_skin_types=v.suitable_skin_types,
    note=v.note,
    default_pack_size_g=COALESCE(b.default_pack_size_g,v.default_pack_size_g)
FROM (VALUES
    ('Light Lotion', 'A fluid, everyday lotion base designed for a fresh, lightweight skincare experience and to work alongside your personalised active ingredients.', 'Low-viscosity lotion that spreads easily, absorbs quickly and leaves a light, low-residue, non-heavy finish.', 'Especially suited to oily and combination skin, including those who prefer lighter moisturising textures in warm weather.', 'These details describe the Light Lotion base only. Your personalised formula may also contain active ingredients selected to complement your skincare goals.', NULL),
    ('Moisturiser', 'A balanced everyday moisturiser base combining hydration and a comfortable emollient feel, designed to complement your personalised active ingredients.', 'Medium-weight, smooth cream-lotion texture with balanced softness, comfortable absorption and a finish designed to feel non-greasy.', 'Particularly suited to normal skin and people seeking a balanced moisturising feel without a very light or highly rich finish.', 'These details describe the Moisturiser base only. Your personalised formula may also include active ingredients chosen for your skincare preferences.', NULL),
    ('Cream', 'A richer cream base designed to cushion dry-feeling skin, support lasting softness and complement your personalised active ingredients.', 'Rich, higher-viscosity texture with noticeable emollience, a more substantial skin feel and a protective, moisture-sealing finish.', 'Especially suited to dry or mature-feeling skin, and people who prefer richer moisturising textures during cooler or drier conditions.', 'These details describe the Cream base only. Your personalised formula may also include separately selected active ingredients for your skincare goals.', NULL),
    ('Serum', 'A lightweight, fast-absorbing serum base designed for comfortable everyday application and to complement your personalised active ingredients.', 'Ultra-lightweight, fluid texture with high spreadability, rapid absorption and minimal residue for a non-greasy, matte-looking finish.', 'Suitable for a broad range of skin types, including oily and combination skin, especially when a lightweight, non-greasy skincare texture is preferred.', 'These details describe the Serum base only. Your personalised formula also includes separately selected active ingredients intended to complement your skincare goals.', 50),
    ('Oil', 'A lipid-rich facial oil base designed to replenish the feel of softness and provide an emollient finish, with room for compatible personalised oil-soluble active ingredients.', 'Smooth, high-slip oil with prolonged emollience, a richer skin feel and a noticeable protective, moisture-sealing finish.', 'Especially suited to dry or mature-feeling skin and those who enjoy a richer facial oil, particularly in cool or dry conditions.', 'These details describe the Oil base only. Your personalised formula may also contain separately selected oil-compatible active ingredients.', NULL)
) AS v(base_name,customer_description,texture_and_finish,suitable_skin_types,note,default_pack_size_g)
WHERE b.base_name=v.base_name AND b.content_status='DRAFT';

-- ============================================================================
-- 3. Base benefits (dependency: base)
-- ============================================================================

-- Each benefit is one ordered, DRAFT row.
INSERT INTO base_key_benefit (base_id, display_order, benefit_description,publication_status)
SELECT b.base_id,v.display_order,v.benefit_description,'DRAFT'
FROM (VALUES
    ('Light Lotion', 1, 'Helps provide everyday moisture without a heavy skin feel.'),
    ('Light Lotion', 2, 'Spreads easily for quick, comfortable application.'),
    ('Light Lotion', 3, 'Leaves a light, low-residue finish suited to layering.'),
    ('Light Lotion', 4, 'Designed to complement compatible personalised active ingredients.'),
    ('Moisturiser', 1, 'Helps maintain a comfortable level of everyday skin hydration.'),
    ('Moisturiser', 2, 'Provides balanced emollience so skin feels soft and smooth.'),
    ('Moisturiser', 3, 'Offers a medium-weight moisturising feel without excessive greasiness.'),
    ('Moisturiser', 4, 'Designed to pair with compatible personalised active ingredients.'),
    ('Cream', 1, 'Provides a rich emollient feel for dry-feeling skin.'),
    ('Cream', 2, 'Helps skin feel softer, smoother and more comfortable.'),
    ('Cream', 3, 'Offers a more protective, moisture-sealing finish than lighter bases.'),
    ('Cream', 4, 'Designed to accommodate compatible personalised active ingredients.'),
    ('Serum', 1, 'Provides lightweight hydration for everyday skincare.'),
    ('Serum', 2, 'Helps skin feel soft, smooth and comfortable.'),
    ('Serum', 3, 'Offers a non-heavy base that layers easily with other products.'),
    ('Serum', 4, 'Designed to complement selected personalised active ingredients.'),
    ('Oil', 1, 'Provides rich emollience to soften dry-feeling skin.'),
    ('Oil', 2, 'Helps reduce the feeling of tightness associated with surface dryness.'),
    ('Oil', 3, 'Leaves a smooth, protective, moisture-sealing finish.'),
    ('Oil', 4, 'Designed to complement suitable oil-soluble active ingredients.')
) AS v(base_name,display_order,benefit_description)
JOIN base b ON b.base_name=v.base_name
ON CONFLICT (base_id,display_order) DO UPDATE
SET benefit_description=EXCLUDED.benefit_description,
    updated_at=CURRENT_TIMESTAMP
WHERE base_key_benefit.publication_status='DRAFT';

-- ============================================================================
-- 4. Reusable candidate ingredient library (dependency: new base_ingredient table)
-- ============================================================================

-- Ingredient benefits describe GENERAL cosmetic/formulation function.
-- Presence in an actual CelRiv base is NOT implied by this ingredient library.
INSERT INTO base_ingredient
 (base_ingredient_name,inci_name,base_ingredient_benefit,publication_status)
VALUES
    ('Aqua (Water)', 'Aqua', 'A solvent and carrier that forms the water phase of many skincare bases.', 'DRAFT'),
    ('Glycerin', 'Glycerin', 'A humectant that attracts water to help skin feel hydrated, soft and comfortable.', 'DRAFT'),
    ('Propanediol', 'Propanediol', 'A solvent and humectant that helps ingredients disperse and supports a smooth, hydrated skin feel.', 'DRAFT'),
    ('Sodium Hyaluronate', 'Sodium Hyaluronate', 'A form of hyaluronic acid that binds water, helping skin feel hydrated and supple.', 'DRAFT'),
    ('Panthenol (Pro-Vitamin B5)', 'Panthenol', 'A skin-conditioning humectant that helps support moisturised, comfortable-feeling skin.', 'DRAFT'),
    ('Caprylic/Capric Triglyceride', 'Caprylic/Capric Triglyceride', 'A lightweight emollient that improves slip and helps skin feel soft and smooth.', 'DRAFT'),
    ('Squalane', 'Squalane', 'An emollient that softens skin and helps reduce moisture loss without a waxy feel.', 'DRAFT'),
    ('Glyceryl Stearate Citrate', 'Glyceryl Stearate Citrate', 'An emulsifying ingredient that helps water and oils remain blended in a lotion or cream.', 'DRAFT'),
    ('Glyceryl Stearate', 'Glyceryl Stearate', 'An emollient and co-emulsifier that helps give creams a smooth, cohesive texture.', 'DRAFT'),
    ('Cetearyl Alcohol', 'Cetearyl Alcohol', 'A fatty alcohol that helps thicken emulsions and adds softness; it is not the same as drying ethanol.', 'DRAFT'),
    ('Cetyl Alcohol', 'Cetyl Alcohol', 'A fatty alcohol that helps build creamy texture and contributes an emollient skin feel.', 'DRAFT'),
    ('Xanthan Gum', 'Xanthan Gum', 'A texture and stability aid that gently thickens water-based skincare formulas.', 'DRAFT'),
    ('Allantoin', 'Allantoin', 'A skin-conditioning ingredient commonly used to support a calm and comfortable skin feel.', 'DRAFT'),
    ('Butyrospermum Parkii (Shea) Butter', 'Butyrospermum Parkii Butter', 'A rich plant-derived emollient that helps soften skin and adds a moisture-sealing feel.', 'DRAFT'),
    ('Helianthus Annuus (Sunflower) Seed Oil', 'Helianthus Annuus Seed Oil', 'A plant oil that helps condition skin and contributes softness and emollience.', 'DRAFT'),
    ('Simmondsia Chinensis (Jojoba) Seed Oil', 'Simmondsia Chinensis Seed Oil', 'A liquid-wax emollient that improves slip and leaves skin feeling conditioned.', 'DRAFT'),
    ('Tocopherol (Vitamin E)', 'Tocopherol', 'An antioxidant commonly included to help protect oil-containing formulas from oxidation; it also conditions skin.', 'DRAFT'),
    ('Phenoxyethanol', 'Phenoxyethanol', 'A preservative used to help protect an appropriately formulated product against microbial contamination.', 'DRAFT'),
    ('Ethylhexylglycerin', 'Ethylhexylglycerin', 'A skin-conditioning ingredient often used to support a preservative system.', 'DRAFT'),
    ('Sodium PCA', 'Sodium PCA', 'A humectant associated with skin’s natural moisturising factors that helps attract and retain water.', 'DRAFT'),
    ('Citric Acid', 'Citric Acid', 'A pH-adjusting ingredient used to help bring water-containing formulas into their intended pH range.', 'DRAFT'),
    ('Sodium Hydroxide', 'Sodium Hydroxide', 'A pH-adjusting ingredient used in small amounts to balance suitable water-based formulas.', 'DRAFT')
ON CONFLICT (base_ingredient_name) DO UPDATE
SET inci_name=EXCLUDED.inci_name,
    base_ingredient_benefit=EXCLUDED.base_ingredient_benefit,
    updated_at=CURRENT_TIMESTAMP
WHERE base_ingredient.publication_status='DRAFT';

-- ============================================================================
-- 5. Proposed base-to-ingredient mapping (dependency: base + base_ingredient)
-- ============================================================================

-- CRITICAL: These are illustrative candidate mappings, NOT CelRiv INCI.
-- The serum's 5-item example originated in the UI mockup; it is NOT confirmed
-- to be the complete proprietary composition. All links remain PROPOSED.
-- Using ON CONFLICT DO NOTHING avoids changing a formulation specialist's
-- existing verification/benefit overrides on a subsequent run.
INSERT INTO base_to_base_ingredient
 (base_id,base_ingredient_id,display_order,verification_status)
SELECT b.base_id,bi.base_ingredient_id,v.display_order,'PROPOSED'
FROM (VALUES
    ('Light Lotion', 'Aqua (Water)', 1),
    ('Light Lotion', 'Glycerin', 2),
    ('Light Lotion', 'Propanediol', 3),
    ('Light Lotion', 'Caprylic/Capric Triglyceride', 4),
    ('Light Lotion', 'Squalane', 5),
    ('Light Lotion', 'Glyceryl Stearate Citrate', 6),
    ('Light Lotion', 'Cetearyl Alcohol', 7),
    ('Light Lotion', 'Xanthan Gum', 8),
    ('Light Lotion', 'Panthenol (Pro-Vitamin B5)', 9),
    ('Light Lotion', 'Tocopherol (Vitamin E)', 10),
    ('Light Lotion', 'Phenoxyethanol', 11),
    ('Light Lotion', 'Ethylhexylglycerin', 12),
    ('Moisturiser', 'Aqua (Water)', 1),
    ('Moisturiser', 'Glycerin', 2),
    ('Moisturiser', 'Propanediol', 3),
    ('Moisturiser', 'Caprylic/Capric Triglyceride', 4),
    ('Moisturiser', 'Squalane', 5),
    ('Moisturiser', 'Glyceryl Stearate Citrate', 6),
    ('Moisturiser', 'Cetearyl Alcohol', 7),
    ('Moisturiser', 'Cetyl Alcohol', 8),
    ('Moisturiser', 'Sodium Hyaluronate', 9),
    ('Moisturiser', 'Panthenol (Pro-Vitamin B5)', 10),
    ('Moisturiser', 'Allantoin', 11),
    ('Moisturiser', 'Tocopherol (Vitamin E)', 12),
    ('Moisturiser', 'Phenoxyethanol', 13),
    ('Moisturiser', 'Ethylhexylglycerin', 14),
    ('Cream', 'Aqua (Water)', 1),
    ('Cream', 'Glycerin', 2),
    ('Cream', 'Butyrospermum Parkii (Shea) Butter', 3),
    ('Cream', 'Caprylic/Capric Triglyceride', 4),
    ('Cream', 'Squalane', 5),
    ('Cream', 'Cetearyl Alcohol', 6),
    ('Cream', 'Glyceryl Stearate', 7),
    ('Cream', 'Cetyl Alcohol', 8),
    ('Cream', 'Helianthus Annuus (Sunflower) Seed Oil', 9),
    ('Cream', 'Panthenol (Pro-Vitamin B5)', 10),
    ('Cream', 'Tocopherol (Vitamin E)', 11),
    ('Cream', 'Xanthan Gum', 12),
    ('Cream', 'Phenoxyethanol', 13),
    ('Cream', 'Ethylhexylglycerin', 14),
    ('Serum', 'Aqua (Water)', 1),
    ('Serum', 'Glycerin', 2),
    ('Serum', 'Propanediol', 3),
    ('Serum', 'Sodium Hyaluronate', 4),
    ('Serum', 'Panthenol (Pro-Vitamin B5)', 5),
    ('Oil', 'Squalane', 1),
    ('Oil', 'Simmondsia Chinensis (Jojoba) Seed Oil', 2),
    ('Oil', 'Helianthus Annuus (Sunflower) Seed Oil', 3),
    ('Oil', 'Caprylic/Capric Triglyceride', 4),
    ('Oil', 'Tocopherol (Vitamin E)', 5)
) AS v(base_name,ingredient_name,display_order)
JOIN base b ON b.base_name=v.base_name
JOIN base_ingredient bi ON bi.base_ingredient_name=v.ingredient_name
ON CONFLICT (base_id,base_ingredient_id) DO NOTHING;

-- ============================================================================
-- 6. Active customer-facing fields and reference concentration (UPDATE existing active masters)
-- ============================================================================

-- percentage = grams per 100 g active+base (workbook REFERENCE % w/w),
-- not a validated concentration for an individual order. NEVER backfill
-- recommendation_active.applied_percentage from this reference automatically.
-- Existing active.description (technical material) remains untouched.
UPDATE active a
SET percentage=v.reference_percent,
    very_short_description=v.very_short_description,
    what_it_is=v.what_it_is
FROM (VALUES
    (1, 2.0, 'Hydration and environmental-stress support', 'A naturally derived ectoin molecule produced through biotechnology and used in skincare for its water-binding and skin-conditioning properties.'),
    (2, 2.0, 'Skin-identical ceramide and lipid complex', 'A biomimetic blend of ceramides and other skin-associated lipids designed to complement the lipid structures found in the outer skin barrier.'),
    (3, 3.0, 'Postbiotic-inspired skin-conditioning complex', 'A cell-free Lactobacillus-derived ferment lysate formulation with sodium hyaluronate, developed for cosmetic skin-conditioning and microbiome-focused skincare.'),
    (4, 2.0, 'Botanical complex for skin comfort', 'A botanical oil and extract blend featuring blackcurrant seed oil, sunflower-derived lipids and balloon-vine extract, formulated for sensitive-feeling skin.'),
    (5, 2.0, 'Botanical complex for visible-redness care', 'A shepherd’s-purse botanical extract combined with antioxidant-associated components in a lecithin-based system, created for redness-prone skincare.'),
    (6, 2.0, 'Mannose-based skin-ageing support', 'A mannose and sodium mannose phosphate complex developed for cosmetic care targeting the appearance of mature skin and loss of firmness.'),
    (7, 1.0, 'Alpine botanical for skin smoothness', 'An extract of alpine willowherb (Epilobium fleischeri) developed for cosmetic skin-longevity positioning and the appearance of smooth, resilient skin.'),
    (8, 1.5, 'Biomimetic peptide for firmness', 'A cosmetic peptide ingredient containing palmitoyl tripeptide-5, designed to support the appearance of smoother, firmer-looking skin.'),
    (9, 0.5, 'Ginger-derived uneven-tone care', 'An oil-compatible ginger-root extract in a triheptanoin carrier, developed for cosmetic care of visible dark spots and uneven-looking tone.'),
    (10, 2.0, 'Plant-derived complex for visible redness', 'A blend of plant-derived polyphenol glucosides in glycerin, developed to support the appearance and comfort of redness-prone skin.'),
    (11, 1.0, 'Bakuchiol-based retinol alternative', 'A high-purity bakuchiol ingredient used in cosmetic skincare as a plant-derived alternative to retinol for the appearance of fine lines, texture and uneven tone.'),
    (12, 2.0, 'Plant-derived retinol-alternative complex', 'A plant-derived cosmetic active based on mastic-tree (Pistacia lentiscus) gum from the Mediterranean, designed to support skin texture and the appearance of pores and fine lines.'),
    (13, 2.0, 'Ceramide, cholesterol and trehalose complex', 'A lipid and trehalose-based cosmetic ingredient system combining ceramide, cholesterol and hydrogenated lecithin for moisturising and barrier-comfort support.'),
    (14, 1.0, 'Glyceryl glucoside hydration support', 'A glyceryl glucoside ingredient inspired by water-stress adaptation mechanisms in plants, used in skincare for hydration and skin-conditioning support.'),
    (15, 2.0, 'Upcycled vetiver-derived skin-conditioning active', 'An upcycled vetiver-root extract in a propanediol and water carrier, developed for cosmetic support of the appearance of mature, dry-feeling skin.')
) AS v(active_id,reference_percent,very_short_description,what_it_is)
WHERE a.active_id=v.active_id AND a.content_status='DRAFT';

-- ============================================================================
-- 7. How each active works (dependency: active)
-- ============================================================================

-- Scientific-mechanism descriptions are cautious, accessible summaries
-- of the supplied supplier/source evidence. All remain DRAFT until reviewed.
INSERT INTO how_active_works
 (active_id,display_order,how_active_works_short_desc,how_active_works_desc,publication_status)
VALUES
    (1, 1, 'Water-organising properties', 'Ectoin is described as forming a hydration-associated environment around biological structures; its cosmetic role is to support a moisturised skin feel.', 'DRAFT'),
    (1, 2, 'Environmental-stress support', 'Supplier research describes protection of skin-related structures from environmental stressors; finished-product effects depend on formulation and use.', 'DRAFT'),
    (2, 1, 'Replenishing barrier-like lipids', 'A mixture of ceramides, cholesterol and fatty-acid components is designed to resemble lipids naturally present between outer skin cells.', 'DRAFT'),
    (2, 2, 'Supporting moisture retention', 'These emollient lipids may help reduce the feeling of dryness by supporting the skin surface’s moisture-retaining condition.', 'DRAFT'),
    (3, 1, 'Ferment-derived skin conditioning', 'The ingredient uses a cell-free Lactobacillus ferment lysate, rather than live probiotic organisms, in a skin-conditioning formulation.', 'DRAFT'),
    (3, 2, 'Microbiome-related laboratory research', 'Supplier laboratory work reports effects on skin-related microbes and collagen-associated markers; it does not establish diagnosis or treatment of microbiome imbalance.', 'DRAFT'),
    (4, 1, 'Botanical lipid comfort', 'Plant-derived lipids and botanical extracts are selected to condition skin and support a comfortable surface feel.', 'DRAFT'),
    (4, 2, 'Soothing-focused formulation', 'The supplier positions the combination for sensitive-feeling, reactive-looking skin; specific finished-product outcomes require confirmation.', 'DRAFT'),
    (5, 1, 'Shepherd’s-purse botanical extract', 'The formula combines Capsella bursa-pastoris extract with a lecithin and antioxidant-related delivery system.', 'DRAFT'),
    (5, 2, 'Redness-associated pathways', 'Supplier laboratory studies examine inflammatory and oxidative-stress pathways associated with the appearance of redness; this is not a medical treatment claim.', 'DRAFT'),
    (6, 1, 'Mannose-derived skin support', 'The mannose and sodium mannose phosphate complex is positioned for cosmetic support of mature-looking skin.', 'DRAFT'),
    (6, 2, 'Cell-energy laboratory research', 'Supplier laboratory studies examine mitochondrial and skin-matrix markers; those biological measurements are not themselves proof of a consumer-visible result.', 'DRAFT'),
    (7, 1, 'Alpine willowherb extract', 'The ingredient is based on an alpine willowherb extract selected for its skin-conditioning botanical components.', 'DRAFT'),
    (7, 2, 'Ageing-associated laboratory markers', 'Supplier research explores senescence-associated and collagen-related pathways; these laboratory findings do not imply reversal of skin ageing.', 'DRAFT'),
    (8, 1, 'Biomimetic peptide activity', 'Palmitoyl tripeptide-5 is a short cosmetic peptide studied for its interaction with collagen-related signalling pathways.', 'DRAFT'),
    (8, 2, 'Supporting smoother appearance', 'The peptide is used in cosmetic formulations intended to improve the look of fine lines and loss of firmness, subject to suitable evidence for the final formulation.', 'DRAFT'),
    (9, 1, 'Ginger-derived active components', 'Ginger-root extract contains components studied for their interaction with pigmentation-related pathways.', 'DRAFT'),
    (9, 2, 'Uneven-tone laboratory research', 'Supplier laboratory studies explore oxidative stress and melanin-associated markers; a visible consumer result is not guaranteed.', 'DRAFT'),
    (10, 1, 'Plant polyphenol glucosides', 'The active contains rosmarinyl, caffeoyl and gallyl glucosides in glycerin.', 'DRAFT'),
    (10, 2, 'Redness-related research', 'Supplier studies examine factors associated with visible redness and skin comfort; the cosmetic product does not diagnose or treat rosacea.', 'DRAFT'),
    (11, 1, 'Bakuchiol cosmetic activity', 'Bakuchiol has been studied for effects on skin appearance and some retinol-associated pathways, though it is not retinol.', 'DRAFT'),
    (11, 2, 'Texture and tone support', 'Its cosmetic positioning focuses on the appearance of fine lines, uneven tone and skin texture rather than prescription-retinoid effects.', 'DRAFT'),
    (12, 1, 'Retinoic-acid-associated pathway', 'Supplier laboratory data suggest that mastic-derived components influence CYP26A1, a pathway associated with breakdown of naturally occurring retinoic acid.', 'DRAFT'),
    (12, 2, 'Cosmetic surface improvements', 'The ingredient is positioned for the appearance of pores, oiliness and fine lines; it should not be described as a medical retinoid or acne treatment.', 'DRAFT'),
    (13, 1, 'Barrier-like lipid blend', 'Trehalose, ceramide NS, cholesterol and hydrogenated lecithin are combined in a dispersion intended for the outer skin layer.', 'DRAFT'),
    (13, 2, 'Moisture-supporting design', 'This lipid-containing system is designed to complement the feel of moisturised skin; penetration and barrier-repair claims require formulation-specific substantiation.', 'DRAFT'),
    (14, 1, 'Glyceryl glucoside humectant', 'Glyceryl glucoside is used for skin-conditioning and water-support functions in cosmetic products.', 'DRAFT'),
    (14, 2, 'Hydration-related cellular research', 'Supplier research explores aquaporin-related and cell-energy markers; these are not direct measurements of finished-product results.', 'DRAFT'),
    (15, 1, 'Upcycled vetiver extract', 'The active uses a vetiver-root extract recovered through an upcycling-oriented ingredient process.', 'DRAFT'),
    (15, 2, 'Skin-lipid pathway research', 'Supplier laboratory work explores lipid-production and barrier-associated markers, with cosmetic positioning around softness, hydration and skin appearance.', 'DRAFT')
ON CONFLICT (active_id,display_order) DO UPDATE
SET how_active_works_short_desc=EXCLUDED.how_active_works_short_desc,
    how_active_works_desc=EXCLUDED.how_active_works_desc,
    updated_at=CURRENT_TIMESTAMP
WHERE how_active_works.publication_status='DRAFT';

-- ============================================================================
-- 8. Evidence-labelled result and proposed benefit statements (dependency: active + source_document optional)
-- ============================================================================

-- The table is named clinical_result by user specification, but not
-- every record is clinical. evidence_type avoids promoting in-vitro or
-- supplier statements to human-trial claims. ALL records stay DRAFT.
-- source_doc_id points to source_document only when the baseline source
-- register contains that filename. source_reference is always retained.
-- Evidence label CLINICAL = user-supplied source summary mentions human
-- study; does NOT mean independently verified or publication-approved.
INSERT INTO clinical_result
 (active_id,display_order,clinical_results_short_desc,clinical_results_desc,
  evidence_type,source_doc_id,source_reference,publication_status)
SELECT v.active_id,v.display_order,v.short_heading,v.full_description,
       v.evidence_type,
       (SELECT MIN(sd.doc_id) FROM source_document sd WHERE sd.filename=v.source_filename),
       'CelRiv-supplied supplier source: ' || v.source_filename ||
       '. Draft editorial synthesis; claims, methods and applicability need scientific review.',
       'DRAFT'
FROM (VALUES
    (1, 1, 'Supports moisturised skin', 'Supplier documentation reports skin-hydration benefits in cosmetic studies; the degree of improvement varies by formulation and study conditions.', 'CLINICAL', '22_Ectoin_natural_Factsheet_bitop AG_44p.pdf'),
    (1, 2, 'Supports skin comfort', 'The supplier describes soothing and barrier-comfort benefits in supporting research; confirm the specific human evidence before publishing a quantified claim.', 'SUPPLIER_CLAIM', 'Ectoin TDS.pdf'),
    (1, 3, 'Environmental skin-care support', 'Laboratory and supplier research discuss protection from pollution-associated stress; this should not be expressed as medical or UV protection.', 'IN_VITRO', '19_SOFW_Ectoin fights pollution induced skin pigmentation _EN.pdf'),
    (2, 1, 'Supports a softer skin feel', 'Skin-identical lipid components are positioned to help dry-feeling skin feel more comfortable; a finished-product performance claim requires confirmation.', 'SUPPLIER_CLAIM', 'SKINMIMICS PRO MB_TI_A0323.pdf'),
    (2, 2, 'Supports moisture retention', 'The ceramide-containing system is intended to complement outer-layer skin lipids and help reduce the feel of dryness.', 'SUPPLIER_CLAIM', 'SKINMIMICS PRO - PDR .pdf'),
    (3, 1, 'Microbiome-related laboratory findings', 'Supplier in-vitro research reports effects on the viability of selected skin-associated bacteria; this is not proof of a human microbiome outcome.', 'IN_VITRO', 'DERMABIOTICS v. 1.0..pdf'),
    (3, 2, 'Collagen-related laboratory findings', 'Supplier cell studies report changes in collagen-associated markers; they do not demonstrate wrinkle reduction in a finished consumer product.', 'IN_VITRO', 'Dermabiotics PowerPoint.pdf'),
    (4, 1, 'Supports comfort for sensitive-feeling skin', 'The supplier positions this botanical-lipid blend for soothing cosmetic care; customer-visible effects require substantiation for the final formula.', 'SUPPLIER_CLAIM', 'Defensil Plus.pdf'),
    (4, 2, 'Helps the appearance of redness', 'Supplier materials describe redness-related cosmetic benefits, but the source summary does not confirm a specific human trial endpoint.', 'SUPPLIER_CLAIM', 'pd_marketing_leaflet_defensil-plus_summary_enp000001877.pdf'),
    (4, 3, 'Supports a moisturised surface feel', 'Botanical emollient components are designed to condition skin and improve comfort when it feels dry or reactive.', 'SUPPLIER_CLAIM', 'DEFENSIL-PLUS Datasheet.pdf'),
    (5, 1, 'Redness-associated laboratory findings', 'Supplier laboratory work reports effects on pathways linked to visible redness; these are mechanistic observations, not a diagnosis.', 'IN_VITRO', 'PPT_AmelioSense.pdf'),
    (5, 2, 'Supports a more even-looking complexion', 'Supplier-reported studies describe changes in visible cheek redness; human study design and outcome conditions require review.', 'SUPPLIER_CLAIM', 'Brochure_AmelioSense.pdf'),
    (6, 1, 'Appearance of fine lines', 'Supplier materials refer to cosmetic evaluations involving wrinkles; confirm the exact human study, dose and formulation before publishing quantified results.', 'CLINICAL', 'Agefinity.pdf'),
    (6, 2, 'Appearance of firmness', 'The supplier positions this complex for firmer-looking mature skin with supporting human and laboratory material; results are formulation-dependent.', 'CLINICAL', 'Agefinity™_TLV20190409.pdf'),
    (6, 3, 'Skin-energy laboratory measures', 'Changes in mitochondrial and collagen-fibre laboratory measurements are mechanistic findings, not clinical improvements by themselves.', 'EX_VIVO', 'RMIP V10 - AGEFINITY - 34161 - 20190322.pdf'),
    (7, 1, 'Smoother-looking skin', 'Supplier material describes visible cosmetic improvements in skin texture and wrinkles; human-trial details should be checked before clinical framing.', 'SUPPLIER_CLAIM', 'ETERWELL YOUTH customer presentation 2024.pdf'),
    (7, 2, 'Collagen-related research', 'Laboratory studies discussed by the supplier report changes in collagen-related activity; these are not direct consumer outcomes.', 'IN_VITRO', 'ETERWELL™ YOUTH Datasheet.pdf'),
    (8, 1, 'Fine-line appearance in combination study', 'A supplier-reported 55-participant half-face study assessed a formula combining this peptide with ETERWELL YOUTH; improvements cannot be attributed to this peptide alone.', 'CLINICAL', 'ETERWELL__YOUTH___SYN_-COLL_CB_presentation_10.2025[58888].pdf'),
    (8, 2, 'Firmer-looking skin in combination study', 'The reported combination study assessed firmness-related cosmetic appearance; results should not be presented as an isolated effect of SYN-COLL CB.', 'CLINICAL', 'ETERWELL__YOUTH___SYN_-COLL_CB_presentation_10.2025[58888].pdf'),
    (8, 3, 'Collagen-pathway laboratory research', 'Cell-based supplier research explores collagen-associated signalling; it is distinct from a clinical outcome.', 'IN_VITRO', 'SYN®-COLL Datasheet.pdf'),
    (9, 1, 'Pigmentation-related laboratory research', 'Supplier laboratory work examines tyrosinase and melanin-associated processes relevant to the appearance of uneven tone.', 'IN_VITRO', 'ILUMYS.pdf'),
    (9, 2, 'Antioxidant laboratory findings', 'Supplier tests report antioxidant and inflammation-marker measurements; these do not establish visible improvement in dark spots in people.', 'IN_VITRO', 'ILUMYS.pdf'),
    (9, 3, 'Cosmetic dark-spot positioning', 'The ingredient is proposed for formulas intended to improve the look of uneven tone; the supplied summary does not establish a human efficacy result.', 'SUPPLIER_CLAIM', 'ILUMYS.pdf'),
    (10, 1, 'Visible-redness appearance', 'Supplier materials report a human cosmetic study over 28 days with changes in visible facial redness; confirm population and endpoints before public claims.', 'CLINICAL', 'ENDOTHELYOL-2.pdf'),
    (10, 2, 'More even-looking tone', 'The supplier reports tone-related findings alongside redness-focused research; this is cosmetic appearance guidance, not rosacea treatment.', 'CLINICAL', 'Active Beauty_Endothelyol_TPV171211.pdf'),
    (10, 3, 'Redness-marker laboratory findings', 'In-vitro supplier studies report changes in histamine- and inflammatory-marker pathways; these are not direct clinical outcomes.', 'IN_VITRO', '34148 ENDOTHELYOL Technical Data Sheet 20240320.pdf'),
    (11, 1, 'Fine-line appearance', 'A published 12-week human comparison studied bakuchiol and retinol for photoageing appearance; equivalence for every Sytenol A formulation cannot be assumed.', 'CLINICAL', 'Study - Sytenol A vs Retinol Clinical Trial British J.Derm June 2018.pdf'),
    (11, 2, 'Uneven-tone appearance', 'Human bakuchiol research discusses improvement in aspects of photoaged skin appearance; the final formula and concentration affect results.', 'CLINICAL', 'Study - Sytenol A vs Retinol Clinical Trial British J.Derm June 2018.pdf'),
    (11, 3, 'Blemish-prone skin positioning', 'The supplier promotes bakuchiol in acne-prone skincare; this is not an approved acne-treatment or clearing claim.', 'SUPPLIER_CLAIM', 'Brochure - Sytenol A Acne 2016.pdf'),
    (12, 1, 'Helps the look of enlarged pores', 'Supplier-reported cosmetic studies at 2% describe measured changes in pore appearance and volume; individual results and final-formula performance can differ.', 'CLINICAL', 'PPT_NovoRetin.pdf'),
    (12, 2, 'Helps reduce oily appearance', 'Supplier-reported tests at 2% describe changes in measured sebum; this refers to cosmetic oiliness, not treatment of acne.', 'CLINICAL', 'Brochure_NovoRetin.pdf'),
    (12, 3, 'Supports smoother-looking skin', 'Supplier studies describe texture, fine-line and elasticity-related changes; confirm the precise endpoint and study design before release.', 'CLINICAL', 'NovoRetin.pdf'),
    (13, 1, 'Lipid-barrier laboratory findings', 'Supplier technical data describe a lipid/trehalose delivery system and barrier-related laboratory assessments; these are not clinical recovery claims.', 'IN_VITRO', 'trisolve-brochure.pdf'),
    (13, 2, 'Hydration-support positioning', 'The ingredient system is intended for formulas addressing dry-feeling skin and surface comfort; final-product outcomes require confirmation.', 'SUPPLIER_CLAIM', 'Tri-Solve P TDS rev.11 0724.pdf'),
    (14, 1, 'Hydration-support positioning', 'Supplier documentation describes moisturising cosmetic benefits associated with glyceryl glucoside; study conditions require verification before quantified claims.', 'SUPPLIER_CLAIM', '22_Glycoin_natural_Factsheet_bitop AG_24p.pdf'),
    (14, 2, 'Cell-energy laboratory findings', 'Supplier research reports changes in ATP- and aquaporin-related laboratory markers; these are not direct proof of visible skin rejuvenation.', 'IN_VITRO', 'Publication_EuroCosmetics Glycoin natural_Bitop_final.pdf'),
    (14, 3, 'Radiance-related cosmetic positioning', 'This ingredient is proposed for dull-looking skin formulations, but individual finished-product results have not been established here.', 'SUPPLIER_CLAIM', 'Glycoin® Natural Datasheet.pdf'),
    (15, 1, 'Appearance of moisturised skin', 'Supplier materials describe skin hydration and comfort outcomes in cosmetic research; the final formula requires evidence review.', 'CLINICAL', 'Vetivyne.pdf'),
    (15, 2, 'Appearance of firmness', 'Supplier material refers to firmness and wrinkle-appearance outcomes for mature skin; confirm specific human-study conditions before approval.', 'CLINICAL', 'Active Beauty Leaflet_Vetivyne™_TLV180322.pdf'),
    (15, 3, 'Skin-lipid laboratory measurements', 'Supplier in-vitro and ex-vivo results concern ceramide and skin-lipid markers; they should not be framed as clinical improvements themselves.', 'IN_VITRO', 'Active Beauty Presentation_Vetivyne™_TPV180410.pdf')
) AS v(active_id,display_order,short_heading,full_description,evidence_type,source_filename)
ON CONFLICT (active_id,display_order) DO UPDATE
SET clinical_results_short_desc=EXCLUDED.clinical_results_short_desc,
    clinical_results_desc=EXCLUDED.clinical_results_desc,
    evidence_type=EXCLUDED.evidence_type,
    source_doc_id=EXCLUDED.source_doc_id,
    source_reference=EXCLUDED.source_reference,
    updated_at=CURRENT_TIMESTAMP
WHERE clinical_result.publication_status='DRAFT';

-- ============================================================================
-- 9. No fabricated per-session data, recommended dose, or picture references
-- ============================================================================

-- No INSERT into active_visual_asset: no approved accessible asset URIs
-- or before/after concepts have been supplied/generated yet.
-- No UPDATE of recommendation_active.applied_percentage: set this only from
-- actual reviewed finished-formulation quantities when known.
-- No INSERT into customer_session or session_skin_concern(_detection):
-- user/session AI results cannot be invented in a reference-data seed.
-- No UPDATE of base.ingredient_list_verified: it stays FALSE until the full
-- proprietary INCI for each base has been independently verified.
-- No publication_status/content_status is set to APPROVED by this seed.

-- ============================================================================
-- 10. Post-insert assertions and rollout summary
-- ============================================================================

-- Assert required content/relations are fully represented in the database.
-- This checks existence (including previously approved rows), not row counts
-- of other content that CelRiv might add subsequently.
DO $celriv_assert$
DECLARE v_missing INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_missing FROM base b
  WHERE b.base_name IN ('Light Lotion','Moisturiser','Cream','Serum','Oil')
    AND (b.customer_description IS NULL OR b.texture_and_finish IS NULL
         OR b.suitable_skin_types IS NULL OR b.note IS NULL);
  IF v_missing>0 THEN RAISE EXCEPTION 'Missing base modal descriptions: %',v_missing; END IF;

  SELECT COUNT(*) INTO v_missing FROM active a
  WHERE a.active_id BETWEEN 1 AND 15
    AND (a.percentage IS NULL OR a.very_short_description IS NULL OR a.what_it_is IS NULL);
  IF v_missing>0 THEN RAISE EXCEPTION 'Missing active modal description/percentages: %',v_missing; END IF;

  SELECT COUNT(*) INTO v_missing FROM base b
  WHERE b.base_name IN ('Light Lotion','Moisturiser','Cream','Serum','Oil')
    AND (SELECT COUNT(*) FROM base_key_benefit bb WHERE bb.base_id=b.base_id)<4;
  IF v_missing>0 THEN RAISE EXCEPTION 'Base benefit rows missing for % base(s)',v_missing; END IF;

  SELECT COUNT(*) INTO v_missing FROM base b
  WHERE b.base_name IN ('Light Lotion','Moisturiser','Cream','Serum','Oil')
    AND NOT EXISTS (SELECT 1 FROM base_to_base_ingredient m WHERE m.base_id=b.base_id);
  IF v_missing>0 THEN RAISE EXCEPTION 'Missing proposed ingredient mappings for % base(s)',v_missing; END IF;

  SELECT COUNT(*) INTO v_missing FROM active a
  WHERE a.active_id BETWEEN 1 AND 15
    AND (SELECT COUNT(*) FROM how_active_works w WHERE w.active_id=a.active_id)<2;
  IF v_missing>0 THEN RAISE EXCEPTION 'Missing active mechanism rows for % active(s)',v_missing; END IF;

  SELECT COUNT(*) INTO v_missing FROM active a
  WHERE a.active_id BETWEEN 1 AND 15
    AND (SELECT COUNT(*) FROM clinical_result cr WHERE cr.active_id=a.active_id)<2;
  IF v_missing>0 THEN RAISE EXCEPTION 'Missing active evidence/result rows for % active(s)',v_missing; END IF;
END;
$celriv_assert$;

COMMIT;

-- ============================================================================
-- NON-MUTATING REVIEW QUERIES (execute as desired; example only)
-- ============================================================================
-- SELECT b.base_name,b.customer_description,b.texture_and_finish,
--        b.suitable_skin_types,b.note,b.content_status
-- FROM base b ORDER BY b.base_id;
--
-- SELECT b.base_name,bb.display_order,bb.benefit_description,bb.publication_status
-- FROM base_key_benefit bb JOIN base b USING(base_id)
-- ORDER BY b.base_id,bb.display_order;
--
-- SELECT b.base_name,m.display_order,i.base_ingredient_name,
--        m.verification_status,i.publication_status
-- FROM base_to_base_ingredient m JOIN base b USING(base_id)
-- JOIN base_ingredient i USING(base_ingredient_id)
-- ORDER BY b.base_id,m.display_order;
--
-- SELECT a.active_name,a.percentage,a.very_short_description,a.what_it_is,
--        a.content_status FROM active a ORDER BY a.active_id;
--
-- SELECT a.active_name,cr.display_order,cr.clinical_results_short_desc,
--        cr.evidence_type,cr.publication_status,cr.source_reference
-- FROM clinical_result cr JOIN active a USING(active_id)
-- ORDER BY a.active_id,cr.display_order;
--
-- NOTE: Published views vw_celriv_base_modal_content and
-- vw_celriv_active_modal_content intentionally show only APPROVED content.
-- CelRiv review/approval is a separate controlled workflow, not this DML.
-- ============================================================================

