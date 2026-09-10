-- ============================================================================
-- CelRevive MVP Recommendation Architecture — Primary Data Load Script
-- Version      : 3.0
-- Date         : 2026-08-25
-- Target       : PostgreSQL / CelRevive MVP recommendation + explainability architecture
-- Source       : Existing CelRevive DML + supplied 15-active x 20-benefit matrix
--
-- IMPORTANT
--   concern_benefit mapping_version = 1 is an ANODIAM DESIGN HYPOTHESIS.
--   It is intentionally marked evidence_level = 'HYPOTHESIS'.
--   Theresa / CelRevive domain review is required before production approval.
--
-- Recommendation path:
--   skin_concern -> concern_benefit -> benefit
--                -> active_benefit_score -> active
--
-- Active <-> skin concern scores are DERIVED by the DDL views.
-- No hard-coded active_concern master rows are inserted.
--
-- Run AFTER CelRevive_DDL_updated.sql.
-- The search path supports both the intended 'celrevive' schema and 'public'
-- for compatibility with environments where the DDL was run in public.
-- ============================================================================

BEGIN;

SET LOCAL search_path TO celrevive, public;

-- ---------------------------------------------------------------------------
-- 1. supplier
-- ---------------------------------------------------------------------------
INSERT INTO supplier (supplier_name) VALUES
    ('Bitop'),
    ('Evonik'),
    ('SK Bioland'),
    ('RAHN'),
    ('Mibelle Biochemistry'),
    ('Givaudan'),
    ('DSM-Firmenich'),
    ('Greentech Biotechnologies'),
    ('Sytheon'),
    ('Sinerga')
ON CONFLICT (supplier_name) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. primary_category
-- ---------------------------------------------------------------------------
INSERT INTO primary_category (category_name, ai_matching_notes, identified_by) VALUES
    ('Barrier & Protection', NULL, NULL),
    ('Barrier Repair', 'Compromised barrier, dryness, eczema-prone, TEWL, sensitivity.', 'Image'),
    ('Microbiome', 'Sensitive, reactive, postbiotic/prebiotic needs, dysbiosis, acne-support context.', NULL),
    ('Sensitive Skin', NULL, NULL),
    ('Neurocosmetic', NULL, NULL),
    ('Skin Longevity', 'Prevention, mature skin, biological ageing, radiance, elasticity, healthspan.', 'Questionnaire'),
    ('Senescence', 'Mature skin, chronic inflammation, loss of firmness, senescence markers.', 'Image + Questionnaire'),
    ('Collagen Peptide', NULL, NULL),
    ('Pigmentation', 'Dark spots, melasma-like uneven tone, photoageing, lipofuscin/melanin.', NULL),
    ('Rosacea', 'Flushing, visible redness, rosacea-prone, vascular redness, sensitivity.', NULL),
    ('Retinol Alternative', 'Wrinkles + acne/oily skin, pores, texture, retinoid-sensitive customers.', NULL),
    ('Circadian / Energy', 'Sleep deprivation, fatigue, morning dullness, lifestyle stress, puffy/tired look.', NULL),
    ('Barrier & Ageing', NULL, NULL),
    ('Hydration / Barrier Water Flow', 'Dehydration, tightness, roughness, low water reserves, dry climate.', NULL),
    ('Acne & Sebum Control', 'Oily skin, shine, enlarged pores in oily skin, blackheads, blemishes, C. acnes.', NULL),
    ('Blue Light / Environmental Protection', 'Screen exposure, pollution, urban lifestyle, oxidative stress.', 'Questionnaire'),
    ('Expression Wrinkle Peptide', 'Forehead/crow''s feet expression lines, preventative Botox-alternative positioning.', NULL),
    ('Repair / Remodeling', 'Stretch marks, body care, post-partum, repair/regeneration and ECM support.', NULL),
    ('Botanical Oil / Regeneration', 'Natural oil format, dry/mature skin, glow, emolliency and repair support.', NULL)
ON CONFLICT (category_name) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3. skin_concern
-- ---------------------------------------------------------------------------
INSERT INTO skin_concern
    (concern_id, concern_name, detectable_by_selfie, detectable_by_questionnaire)
VALUES
    ('SC0001', 'Dry Skin', TRUE, TRUE),
    ('SC0002', 'Dehydrated Skin', TRUE, TRUE),
    ('SC0003', 'Compromised Skin Barrier', TRUE, TRUE),
    ('SC0004', 'Sensitive Skin', TRUE, TRUE),
    ('SC0005', 'Redness', TRUE, TRUE),
    ('SC0006', 'Rosacea', TRUE, TRUE),
    ('SC0007', 'Reactive Skin', TRUE, TRUE),
    ('SC0008', 'Acne', TRUE, TRUE),
    ('SC0009', 'Breakouts / Blemishes', TRUE, TRUE),
    ('SC0010', 'Excess Sebum (Oily Skin)', TRUE, TRUE),
    ('SC0011', 'Mature Skin', TRUE, TRUE),
    ('SC0012', 'Uneven Skin Tone', TRUE, TRUE),
    ('SC0013', 'Hyperpigmentation', TRUE, TRUE),
    ('SC0014', 'Melasma-like Pigmentation', TRUE, TRUE),
    ('SC0015', 'Dullness / Poor Radiance', TRUE, TRUE),
    ('SC0016', 'Fatigued Skin', TRUE, TRUE),
    ('SC0017', 'Photoaging', TRUE, TRUE),
    ('SC0018', 'Chronic Skin Inflammation Risk', TRUE, TRUE),
    ('SC0019', 'Skin Ageing / Longevity Risk', TRUE, TRUE),
    ('SC1001', 'Enlarged Pores', TRUE, FALSE),
    ('SC1002', 'Blackheads / Comedones', TRUE, FALSE),
    ('SC1003', 'Fine Lines', TRUE, FALSE),
    ('SC1004', 'Wrinkles', TRUE, FALSE),
    ('SC1005', 'Expression Lines', TRUE, FALSE),
    ('SC1006', 'Loss of Firmness', TRUE, FALSE),
    ('SC1007', 'Age Spots', TRUE, FALSE),
    ('SC1008', 'Stretch Marks', TRUE, FALSE),
    ('SC1009', 'Scar / Repair Needs', TRUE, FALSE),
    ('SC2001', 'Itching / Irritation', FALSE, TRUE),
    ('SC2002', 'Environmental Skin Stress', FALSE, TRUE),
    ('SC2003', 'Blue Light Exposure Risk', FALSE, TRUE),
    ('SC2004', 'Microbiome Imbalance Risk', FALSE, TRUE)
ON CONFLICT (concern_id) DO UPDATE SET
    concern_name = EXCLUDED.concern_name,
    detectable_by_selfie = EXCLUDED.detectable_by_selfie,
    detectable_by_questionnaire = EXCLUDED.detectable_by_questionnaire,
    updated_at = CURRENT_TIMESTAMP;

-- ---------------------------------------------------------------------------
-- 4. base
-- Current DDL stores a compact subset of the source workbook's base fields.
-- Source-only attributes that do not yet have dedicated columns are retained
-- in description so they are not silently discarded.
-- ---------------------------------------------------------------------------
INSERT INTO base
    (base_name, price_tier, age_min, age_max, skin_type, moisture, ph_min, ph_max, description)
VALUES
    ('Light Lotion', '$', 18, 35, 'Oily/Combination', 'Normal to Slightly Oily', 4, 6, 'Source workbook attributes: acne_suitable=TRUE; retinoid_compatible=FALSE; sensory=low viscosity, fast-absorbing, non-occlusive, low residue; spreadability=High; solubility_compatibility=Water/Oil; climate=Hot; layering_rating=Excellent; occlusivity=Low.'),
    ('Moisturiser', '$$', 18, 35, 'Normal skin', 'Normal', 4, 6, 'Source workbook attributes: acne_suitable=TRUE; retinoid_compatible=FALSE; sensory=medium viscosity, balanced emolliency, moderate substantivity, non-greasy finish; spreadability=Medium-High; solubility_compatibility=Water/Oil; climate=Moderate; layering_rating=Good; occlusivity=Medium.'),
    ('Cream', '$$$', 35, NULL, 'Dry / Mature', 'Dry', 4, 6, 'Source workbook attributes: acne_suitable=FALSE; retinoid_compatible=TRUE; sensory=high viscosity, high emolliency, increased substantivity, enhanced occlusivity; spreadability=Medium; solubility_compatibility=Water/Oil; climate=Cold; layering_rating=Fair; occlusivity=High.'),
    ('Serum', '$$$$', NULL, NULL, 'All Skin Type', 'All Moisture Levels', 4, 6, 'Source workbook attributes: acne_suitable=TRUE; retinoid_compatible=TRUE; sensory=low viscosity, rapid absorption, minimal residue, high spreadability; spreadability=Very High; solubility_compatibility=Water/Oil; climate=Any; layering_rating=Excellent; occlusivity=Very Low.'),
    ('Oil', '$$$$', 35, NULL, 'Dry / Mature', 'Dry', 4, 6, 'Source workbook attributes: acne_suitable=FALSE; retinoid_compatible=TRUE; sensory=high slip, high lubricity, lipid-rich, prolonged emolliency, occlusive finish; spreadability=Very High; solubility_compatibility=Oil; climate=Cold; layering_rating=Fair; occlusivity=Very High.')
ON CONFLICT (base_name) DO UPDATE SET
    price_tier = EXCLUDED.price_tier,
    age_min = EXCLUDED.age_min,
    age_max = EXCLUDED.age_max,
    skin_type = EXCLUDED.skin_type,
    moisture = EXCLUDED.moisture,
    ph_min = EXCLUDED.ph_min,
    ph_max = EXCLUDED.ph_max,
    description = EXCLUDED.description;

-- ---------------------------------------------------------------------------
-- 5. active
-- Business IDs 1..15 are preserved exactly as supplied by CelRevive.
-- The updated DDL currently exposes a consolidated description field; detailed
-- source attributes from the earlier DML are retained there with labels.
-- ---------------------------------------------------------------------------
INSERT INTO active
    (active_id, active_name, supplier_id, category_id, cost_per_gram,
     usage_level_min, usage_level_max, description)
VALUES
    (1, 'Ectoin® natural', (SELECT supplier_id FROM supplier WHERE supplier_name = 'Bitop'), (SELECT category_id FROM primary_category WHERE category_name = 'Barrier & Protection'), NULL, 0.3, 2.0, 'Category detail: Barrier Protection / Environmental Defence. Key claims: Ultimate protection and repair: hydration, barrier repair, anti-inflammatory, blue light, anti-pollution, brightening and microbiome support. Mechanism: Extremolyte forms an Ectoin Hydro Complex around proteins, membranes and cells; stabilises biomolecules, lowers inflammatory stress, reduces TEWL and protects against environmental stress. Evidence summary: In vivo, ex vivo and in vitro. Clinical data includes hydration/barrier repair, anti-wrinkle, irritation reduction, anti-pollution, blue light protection, brightening and microbiome support. INCI/composition: -- cost_per_gram: ''TBC'' in source workbook
        ''Ectoin'' Usage (source): 0.3–2% typical; 0.5–2% in studies. Suitable for: Sensitive, rosacea-prone, dehydrated, urban, post-procedure and barrier-impaired skin.. Implementation: Phase 1.'),
    (2, 'Skinmimics® PRO MB', (SELECT supplier_id FROM supplier WHERE supplier_name = 'Evonik'), (SELECT category_id FROM primary_category WHERE category_name = 'Barrier Repair'), NULL, 0.5, 5.0, 'Category detail: Barrier Repair / Ceramide System. Key claims: Skin-identical lipid complex for barrier repair, moisture retention, dryness relief and sensitive-skin support. Mechanism: Replenishes stratum corneum lipid architecture with ceramide-like and cholesterol/fatty-acid components; supports lamellar barrier structure and reduces TEWL. Evidence summary: Supplier technical substantiation expected; scores aligned to ceramide barrier-repair mechanism and comparable skin-identical lipid systems in the library. INCI/composition: -- cost_per_gram: ''TBC'' in source workbook
        ''Ceramide EOP; Ceramide NP; Ceramide NS; Ceramide AP; Cholesterol; Behenic Acid; Polyglyceryl
10 Stearate; Polyglyceryl-6 Behenate; Glycerin; Cetearyl Alcohol; Glyceryl Stearate; Sodium Cetearyl
Sulfate; Triethyl Citrate; Lactic Acid; Aqua'' Usage (source): 0.5–5%. Recommend 2%. Suitable for: Dry, sensitive, eczema-prone, barrier-impaired, post-treatment and compromised skin.. Implementation: Phase 1.'),
    (3, 'Dermabiotics HDB1196 GN', (SELECT supplier_id FROM supplier WHERE supplier_name = 'SK Bioland'), (SELECT category_id FROM primary_category WHERE category_name = 'Microbiome'), NULL, 1.0, 5.0, 'Category detail: Microbiome / Collagen Support. Key claims: Cell-free probiotic lysate platform; microbiome care, inner-skin solution, anti-wrinkle support and collagen synthesis. Mechanism: Low molecular weight cytosol (<2 kDa) from probiotics, post-fermented with HA; designed for penetration without live-cell antagonism; supports S. epidermidis viability. Evidence summary: In vitro microbiome feasibility; SKB1196 maintained/increased S. epidermidis viability; in vitro MMP-1 inhibition and collagen type I upregulation. INCI/composition: -- cost_per_gram: ''TBC'' in source workbook
        ''Glycerine, Lactobacillus Ferment Lysate, Sodium Hyaluronate'' Usage (source): 1–5%, 3% recommended. Suitable for: Sensitive, microbiome-impaired or early-ageing skin.. Implementation: Phase 1.'),
    (4, 'Defensil® Plus', (SELECT supplier_id FROM supplier WHERE supplier_name = 'RAHN'), (SELECT category_id FROM primary_category WHERE category_name = 'Sensitive Skin'), NULL, 1.0, 5.0, 'Category detail: Sensitive Skin / Soothing / Redness. Key claims: Sensitive-skin soothing active for redness, irritation, itch and compromised barrier comfort. Mechanism: Botanical lipid blend rich in soothing/omega-lipid components helps rebalance inflammatory stress, reinforce barrier comfort and calm reactive skin. Evidence summary: Supplier substantiation expected; widely positioned for atopic-prone, irritated and sensitive skin. Scores reflect strong soothing/anti-redness/anti-itch positioning. INCI/composition: -- cost_per_gram: ''TBC'' in source workbook
        ''Octyldodecanol, Ribes Nig rum (Black Currant) Seed Oil, Helianthus Annuus (Sun flower) Seed Oil Unsaponifiables, Cardiospermum Halica cabum Flower/Leaf/Vine Extract, Tocopherol, Helianthus Annuus (Sunflower) Seed Oil, Rosmarinus Officinalis (Rosemary) Leaf Extract'' Usage (source): 1–5%. Suitable for: Sensitive, irritated, itchy, redness-prone, eczema-prone and reactive skin.. Implementation: Phase 1.'),
    (5, 'AmelioSense™', (SELECT supplier_id FROM supplier WHERE supplier_name = 'Mibelle Biochemistry'), (SELECT category_id FROM primary_category WHERE category_name = 'Neurocosmetic'), NULL, 2.0, 2.0, 'Category detail: Rosacea / Redness / Neuro-Inflammation. Key claims: Anti-redness and soothing active targeting pyroptosis, inflammation, visible blood vessels and irritated/flushed skin. Mechanism: Shepherd’s purse extract plus antioxidant liposomal complex inhibits active caspase-1/pyroptosis, reduces free radicals and lowers inflammatory markers linked to rosacea-prone skin. Evidence summary: In vitro and in vivo studies: inhibits active caspase-1, reduces radicals and inflammatory gene expression; visibly reduces appearance of blood vessels, facial redness and blood flow in cheek area. INCI/composition: -- cost_per_gram: ''TBC'' in source workbook
        ''Capsella Bursa-Pastoris Extract (and) Lecithin (and) Carnosine (and) Tocopherol (and) Silybum Marianum Fruit Extract (and) Maltodextrin (and) Aqua/Water'' Usage (source): 2%. Suitable for: Rosacea-prone, flushed, irritated, reactive, sensitive and redness-prone skin.. Implementation: Phase 1.'),
    (6, 'Agefinity™', (SELECT supplier_id FROM supplier WHERE supplier_name = 'Givaudan'), (SELECT category_id FROM primary_category WHERE category_name = 'Skin Longevity'), NULL, 0.1, 4.0, 'Category detail: Skin Longevity / Mitochondrial Energy. Key claims: 3D Y reshaper; mitochondrial energy, matrix restructuring, DEJ reinforcement, deep wrinkles, neck wrinkles and age spots. Mechanism: Reprograms mitochondrial metabolism in older cells, promotes dermal matrix restructuring and collagen fibre organization; supports proteasome activity and reduces oxidized proteins. Evidence summary: In vitro/ex vivo/in vivo data: ATP synthase activity up to 2.9x in mature cells; collagen fibre organisation up to 4.8x better; reticular dermis density +36%; age spot and wrinkle clinical data in dossier. INCI/composition: -- cost_per_gram: ''TBC'' in source workbook
        ''Glycerin, Water, Sodium Mannose Phosphate, Mannose'' Usage (source): 0.1% to 4%, 4% in many ex vivo studies. Suitable for: Mature, sagging, neck/jawline, deep wrinkles and age spots.. Implementation: Phase 1.'),
    (7, 'ETERWELL™ YOUTH', (SELECT supplier_id FROM supplier WHERE supplier_name = 'DSM-Firmenich'), (SELECT category_id FROM primary_category WHERE category_name = 'Senescence'), NULL, 1.0, 3.0, 'Category detail: Senescence / Skin Longevity. Key claims: Senolytic longevity active; reduces appearance of wrinkles, improves elasticity, smoothness, texture and skin resilience. Mechanism: Rare alpine willowherb extract standardized in flavonoids; helps revert damage induced by excess senescent cells and improves collagen-supporting environment. Evidence summary: In vitro and in vivo; supplier states boost collagen in vitro and visible wrinkle/elasticity/texture improvements in vivo. INCI/composition: -- cost_per_gram: ''TBC'' in source workbook
        ''Epilobium Fleischeri Leaf/Stem Extract (and) Glycerin, Water, Citric Acid'' Usage (source): 1–3%; recommended 1.0% when ued with SYN-COLL 1.5%. Suitable for: Mature skin, prevention-focused anti-ageing and loss of firmness.. Implementation: Phase 1.'),
    (8, 'SYN®-COLL CB', (SELECT supplier_id FROM supplier WHERE supplier_name = 'DSM-Firmenich'), (SELECT category_id FROM primary_category WHERE category_name = 'Collagen Peptide'), NULL, 1.0, 5.0, 'Category detail: Peptide / Collagen Support. Key claims: TGF-β boosting collagen peptide; supports collagen reserves, sculpts face/neck, refines pores and protects from UV-induced collagen degradation. Mechanism: Biomimetic palmitoyl tripeptide-5 supports TGF-β activation to stimulate and protect collagen; also shown to inhibit cytokines TNFα and IL-8 in vitro. Evidence summary: In vitro and in vivo; including 55-subject half-face study with ETERWELL YOUTH combination plus collagen, pore and wrinkle assessments. INCI/composition: -- cost_per_gram: ''TBC'' in source workbook
        ''Palmitoyl Tripeptide-5, Aqua, Glycerin'' Usage (source): 1–5%; recommended 1.5% when ued with ETERWELL YOUTH 1.0%. Suitable for: Wrinkles, loss of firmness, mature skin and neck/jawline concerns.. Implementation: Phase 1.'),
    (9, 'ILUMYS®', (SELECT supplier_id FROM supplier WHERE supplier_name = 'Greentech Biotechnologies'), (SELECT category_id FROM primary_category WHERE category_name = 'Pigmentation'), NULL, 0.5, 0.5, 'Category detail: Pigmentation / Age Spots. Key claims: Intensive anti-dark-spot ingredient; targets both melanin and lipofuscin accumulation for age spots and uneven tone. Mechanism: Gingerols inhibit tyrosinase/melanogenesis, reduce oxidative stress, lower inflammatory IL-8 and act on surrounding skin-cell dark spot signals. Evidence summary: In tubo DPPH EC50 0.25%; in vitro IL-8 -46% at 0.03%; literature on 6/8-gingerol tyrosinase/melanin inhibition. INCI/composition: -- cost_per_gram: ''TBC'' in source workbook
        ''Zingiber officinale (ginger) root extract, Triheptanoin'' Usage (source): 0.5%. Suitable for: Hyperpigmentation, age spots, uneven tone and photoaged skin.. Implementation: Phase 1.'),
    (10, 'ENDOTHELYOL®', (SELECT supplier_id FROM supplier WHERE supplier_name = 'Givaudan'), (SELECT category_id FROM primary_category WHERE category_name = 'Rosacea'), NULL, 0.25, 2.5, 'Category detail: Rosacea / Redness. Key claims: 5-in-1 active control of skin redness and rosacea; controls inflammation, neovascularisation and improves skin tone. Mechanism: Plant polyphenol glucosides inhibit redness factors histamine, IL-8, PGE2, TNF-α and VEGF/neo-vessel formation. Evidence summary: In vitro/in-cell data: IL-8 -67%, PGE2 -54%, TNF-α -39%, histamine -19%, VEGF reduction; clinical rosacea improvement 7–12% in 28 days; brightening +11%. INCI/composition: -- cost_per_gram: ''TBC'' in source workbook
        ''Glycerin / Rosmarinyl Glucoside / Caffeoyl Glucoside / Gallyl Glucoside'' Usage (source): 0.25–2.5%; 2% clinical. Suitable for: Rosacea-prone, flushing, visible redness, sensitive and irritated skin.. Implementation: Phase 1.'),
    (11, 'Sytenol® A', (SELECT supplier_id FROM supplier WHERE supplier_name = 'Sytheon'), (SELECT category_id FROM primary_category WHERE category_name = 'Retinol Alternative'), NULL, 0.5, 1.0, 'Category detail: Retinol Alternative / Acne & Ageing. Key claims: Natural retinol alternative; anti-aging and anti-acne; improves wrinkles, skin roughness, tone, elasticity and firmness. Mechanism: Retinol-like gene modulation without retinol instability; stimulates collagen I/III/IV, supports ECM/DEJ genes, antioxidant and anti-inflammatory activity. Evidence summary: In vitro gene expression, collagen stimulation and in vivo 12-week clinical study at 0.5%; published comparative retinol study. INCI/composition: -- cost_per_gram: ''TBC'' in source workbook
        ''Bakuchiol'' Usage (source): 0.5–1.0%. Suitable for: Ageing, acne-prone, oily, sensitive-to-retinoids and uneven texture skin.. Implementation: Phase 1. Formulation cautions: Avoid combining with copper or iron ions or use Disoodium EDTA 0.1% or other chelating agent.'),
    (12, 'NovoRetin™', (SELECT supplier_id FROM supplier WHERE supplier_name = 'Mibelle Biochemistry'), (SELECT category_id FROM primary_category WHERE category_name = 'Retinol Alternative'), NULL, 2.0, 3.0, 'Category detail: Retinol Alternative / Acne & Ageing. Key claims: Natural retinol alternative; boosts endogenous retinoic acid effects, improves elasticity/density, immediate lifting, pores, blemishes, sebum and texture without classic retinoid drawbacks. Mechanism: Inhibits CYP26A1 activity/expression to reduce degradation of naturally occurring retinoic acid, enhancing retinoic-acid signalling and retinol-like effects in skin. Evidence summary: In vitro/RHE and clinical: CYP26A1 gene expression inhibited up to 65%; IVL gene expression +720%; 2% clinical elasticity +20.4%, density +13.8%, immediate wrinkle depth -14.0%, length -13.7%, pore volume -41.7%, blackheads -40%, sebum -11%. INCI/composition: -- cost_per_gram: ''TBC'' in source workbook
        ''Pistacia Lentiscus Gum/Pistacia Lentiscus (Mastic) Gum (and) Lecithin (and) Pentylene Glycol (and) Glyceryl Caprylate/Caprate (and) Caprylic/Capric Triglyceride (and) Aqua/Water'' Usage (source): 2–3%. Suitable for: Ageing, oily, acne-prone, enlarged pores, fine lines and retinoid-sensitive customers.. Implementation: Phase 1.'),
    (13, 'TRI-SOLVE®', (SELECT supplier_id FROM supplier WHERE supplier_name = 'Sinerga'), (SELECT category_id FROM primary_category WHERE category_name = 'Barrier Repair'), NULL, 1.0, 3.0, 'Category detail: Barrier Repair / Ceramide Delivery. Key claims: Skin barrier recovery agent; hydrating/moisturizing, restores intercellular lipids, improves barrier homeostasis. Mechanism: Patented nano-emulsion vehiculation delivers ceramide/cholesterol/trehalose into lower stratum corneum for faster barrier reconstruction and dehydration protection. Evidence summary: Technical/in vitro support in brochure; nano-structure TEM average 209 nm; barrier/hydration efficacy data in deck. INCI/composition: -- cost_per_gram: ''TBC'' in source workbook
        ''Trehalose, Cholesterol, Ceramide NS, Hydrogenated Lecithin'' Usage (source): 1–3%. Suitable for: Very dry, barrier-damaged, sensitive and eczema-prone skin.. Implementation: Phase 1.'),
    (14, 'Glycoin® natural', (SELECT supplier_id FROM supplier WHERE supplier_name = 'Bitop'), (SELECT category_id FROM primary_category WHERE category_name = 'Circadian / Energy'), NULL, 0.5, 2.0, 'Category detail: Circadian / Energy. Key claims: Cell energizer; instant hydration, anti-aging, rejuvenation, blue light protection, microbiome support and brightening. Mechanism: Stress-protection molecule from resurrection plant; stabilises membranes under low hydration, boosts ATP/cell metabolism, AQP3 and growth factors. Evidence summary: In vitro, in vivo and ex vivo studies: ATP, antioxidants, procollagen I, AQP3/blue light, microbiome support, hydration and brightening. INCI/composition: -- cost_per_gram: ''TBC'' in source workbook
        ''Glyceryl Glucoside (and) Aqua/Water'' Usage (source): 0.5-2%. Suitable for: Dull, tired, stressed, dehydrated and lifestyle-fatigued skin.. Implementation: Phase 1.'),
    (15, 'Vetivyne™', (SELECT supplier_id FROM supplier WHERE supplier_name = 'Givaudan'), (SELECT category_id FROM primary_category WHERE category_name = 'Barrier & Ageing'), NULL, 1.0, 3.0, 'Category detail: Barrier & Ageing / Lipid Booster. Key claims: Upcycled fragrance-inspired skin youth booster; improves hydration, barrier lipids, fatigue, wrinkles and firmness. Mechanism: Reactivates skin lipid synthesis across sebocytes, keratinocytes and adipocytes; boosts ceramide precursors, CERT transport, cornified envelope proteins and adipocyte volume. Evidence summary: In vitro/ex vivo/proteomic and clinical data; ceramides/precursors +32–42%, CERT +124.5%, lipids +29.6%, barrier proteins +53–239%, sebum lipids +31%. INCI/composition: -- cost_per_gram: ''TBC'' in source workbook
        ''Propanediol, Water, Vetiveria zizanoides root extract'' Usage (source): 1-3%. Suitable for: Dry, mature, lipid-deficient, fatigued and barrier-impaired skin.. Implementation: Phase 1.')
ON CONFLICT (active_id) DO UPDATE SET
    active_name = EXCLUDED.active_name,
    supplier_id = EXCLUDED.supplier_id,
    category_id = EXCLUDED.category_id,
    cost_per_gram = EXCLUDED.cost_per_gram,
    usage_level_min = EXCLUDED.usage_level_min,
    usage_level_max = EXCLUDED.usage_level_max,
    description = EXCLUDED.description,
    updated_at = CURRENT_TIMESTAMP;

-- ---------------------------------------------------------------------------
-- 6. benefit
-- Explicit business IDs 1..20 are preserved.
-- ---------------------------------------------------------------------------
INSERT INTO benefit (benefit_id, benefit_name) VALUES
    (1, 'Increase hydration'),
    (2, 'Repair barrier'),
    (3, 'Microbiome balance'),
    (4, 'Reduce redness'),
    (5, 'Soothe irritation'),
    (6, 'Reduce itchiness'),
    (7, 'Reduce sebum production'),
    (8, 'Skin brightening'),
    (9, 'Reduce fine lines'),
    (10, 'Reduce wrinkle length/depth'),
    (11, 'Jawline firming'),
    (12, 'Increase collagen production'),
    (13, 'Skin firming'),
    (14, 'Reduce eye bag'),
    (15, 'Reduce under eye dark circle'),
    (16, 'Minimise pores - mature skin'),
    (17, 'Minimise pores - oily skin'),
    (18, 'Anti-blue light'),
    (19, 'Anti-pollution'),
    (20, 'Texture improvement')
ON CONFLICT (benefit_id) DO UPDATE SET
    benefit_name = EXCLUDED.benefit_name;

-- ---------------------------------------------------------------------------
-- 7. active_benefit_score
-- score_version=1 = CelRevive-supplied 0..20 matrix in this project baseline.
-- Zero scores are inserted explicitly so the matrix remains complete/auditable.
-- Expected rows: 15 x 20 = 300.
-- ---------------------------------------------------------------------------
INSERT INTO active_benefit_score
    (active_id, benefit_id, score_version, score, source_note)
VALUES
    (1, 1, 1, 20, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (1, 2, 1, 19, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (1, 3, 1, 16, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (1, 4, 1, 18, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (1, 5, 1, 19, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (1, 6, 1, 18, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (1, 7, 1, 0, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (1, 8, 1, 12, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (1, 9, 1, 14, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (1, 10, 1, 13, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (1, 11, 1, 5, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (1, 12, 1, 5, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (1, 13, 1, 7, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (1, 14, 1, 4, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (1, 15, 1, 5, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (1, 16, 1, 3, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (1, 17, 1, 2, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (1, 18, 1, 19, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (1, 19, 1, 20, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (1, 20, 1, 13, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (2, 1, 1, 17, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (2, 2, 1, 20, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (2, 3, 1, 2, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (2, 4, 1, 10, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (2, 5, 1, 12, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (2, 6, 1, 8, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (2, 7, 1, 0, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (2, 8, 1, 0, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (2, 9, 1, 8, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (2, 10, 1, 6, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (2, 11, 1, 0, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (2, 12, 1, 0, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (2, 13, 1, 2, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (2, 14, 1, 0, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (2, 15, 1, 0, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (2, 16, 1, 2, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (2, 17, 1, 0, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (2, 18, 1, 0, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (2, 19, 1, 0, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (2, 20, 1, 8, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (3, 1, 1, 10, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (3, 2, 1, 14, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (3, 3, 1, 18, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (3, 4, 1, 10, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (3, 5, 1, 12, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (3, 6, 1, 8, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (3, 7, 1, 0, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (3, 8, 1, 0, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (3, 9, 1, 14, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (3, 10, 1, 14, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (3, 11, 1, 0, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (3, 12, 1, 18, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (3, 13, 1, 12, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (3, 14, 1, 0, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (3, 15, 1, 0, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (3, 16, 1, 0, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (3, 17, 1, 0, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (3, 18, 1, 0, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (3, 19, 1, 0, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (3, 20, 1, 10, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (4, 1, 1, 8, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (4, 2, 1, 16, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (4, 3, 1, 0, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (4, 4, 1, 18, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (4, 5, 1, 20, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (4, 6, 1, 18, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (4, 7, 1, 0, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (4, 8, 1, 0, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (4, 9, 1, 3, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (4, 10, 1, 2, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (4, 11, 1, 0, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (4, 12, 1, 0, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (4, 13, 1, 2, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (4, 14, 1, 0, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (4, 15, 1, 0, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (4, 16, 1, 0, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (4, 17, 1, 0, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (4, 18, 1, 0, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (4, 19, 1, 2, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (4, 20, 1, 8, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (5, 1, 1, 4, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (5, 2, 1, 8, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (5, 3, 1, 0, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (5, 4, 1, 20, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (5, 5, 1, 20, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (5, 6, 1, 14, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (5, 7, 1, 0, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (5, 8, 1, 2, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (5, 9, 1, 2, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (5, 10, 1, 0, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (5, 11, 1, 0, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (5, 12, 1, 0, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (5, 13, 1, 2, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (5, 14, 1, 2, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (5, 15, 1, 2, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (5, 16, 1, 0, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (5, 17, 1, 0, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (5, 18, 1, 0, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (5, 19, 1, 8, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (5, 20, 1, 8, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (6, 1, 1, 6, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (6, 2, 1, 8, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (6, 3, 1, 0, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (6, 4, 1, 4, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (6, 5, 1, 3, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (6, 6, 1, 0, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (6, 7, 1, 0, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (6, 8, 1, 16, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (6, 9, 1, 18, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (6, 10, 1, 20, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (6, 11, 1, 18, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (6, 12, 1, 16, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (6, 13, 1, 18, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (6, 14, 1, 6, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (6, 15, 1, 6, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (6, 16, 1, 8, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (6, 17, 1, 0, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (6, 18, 1, 4, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (6, 19, 1, 8, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (6, 20, 1, 18, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (7, 1, 1, 3, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (7, 2, 1, 3, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (7, 3, 1, 0, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (7, 4, 1, 6, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (7, 5, 1, 4, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (7, 6, 1, 2, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (7, 7, 1, 0, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (7, 8, 1, 2, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (7, 9, 1, 18, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (7, 10, 1, 18, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (7, 11, 1, 18, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (7, 12, 1, 19, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (7, 13, 1, 18, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (7, 14, 1, 5, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (7, 15, 1, 2, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (7, 16, 1, 8, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (7, 17, 1, 2, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (7, 18, 1, 5, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (7, 19, 1, 6, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (7, 20, 1, 15, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (8, 1, 1, 1, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (8, 2, 1, 1, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (8, 3, 1, 0, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (8, 4, 1, 4, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (8, 5, 1, 2, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (8, 6, 1, 0, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (8, 7, 1, 0, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (8, 8, 1, 0, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (8, 9, 1, 18, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (8, 10, 1, 20, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (8, 11, 1, 20, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (8, 12, 1, 20, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (8, 13, 1, 19, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (8, 14, 1, 8, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (8, 15, 1, 2, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (8, 16, 1, 15, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (8, 17, 1, 6, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (8, 18, 1, 0, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (8, 19, 1, 0, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (8, 20, 1, 15, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (9, 1, 1, 2, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (9, 2, 1, 2, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (9, 3, 1, 0, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (9, 4, 1, 10, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (9, 5, 1, 10, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (9, 6, 1, 2, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (9, 7, 1, 0, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (9, 8, 1, 20, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (9, 9, 1, 6, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (9, 10, 1, 4, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (9, 11, 1, 0, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (9, 12, 1, 0, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (9, 13, 1, 0, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (9, 14, 1, 0, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (9, 15, 1, 12, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (9, 16, 1, 3, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (9, 17, 1, 2, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (9, 18, 1, 6, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (9, 19, 1, 8, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (9, 20, 1, 10, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (10, 1, 1, 2, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (10, 2, 1, 5, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (10, 3, 1, 0, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (10, 4, 1, 20, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (10, 5, 1, 18, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (10, 6, 1, 14, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (10, 7, 1, 0, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (10, 8, 1, 12, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (10, 9, 1, 4, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (10, 10, 1, 3, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (10, 11, 1, 0, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (10, 12, 1, 0, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (10, 13, 1, 0, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (10, 14, 1, 6, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (10, 15, 1, 8, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (10, 16, 1, 2, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (10, 17, 1, 0, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (10, 18, 1, 0, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (10, 19, 1, 4, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (10, 20, 1, 8, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (11, 1, 1, 8, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (11, 2, 1, 7, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (11, 3, 1, 0, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (11, 4, 1, 10, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (11, 5, 1, 8, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (11, 6, 1, 0, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (11, 7, 1, 16, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (11, 8, 1, 10, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (11, 9, 1, 18, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (11, 10, 1, 18, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (11, 11, 1, 14, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (11, 12, 1, 17, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (11, 13, 1, 15, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (11, 14, 1, 4, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (11, 15, 1, 2, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (11, 16, 1, 12, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (11, 17, 1, 18, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (11, 18, 1, 3, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (11, 19, 1, 5, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (11, 20, 1, 17, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (12, 1, 1, 8, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (12, 2, 1, 8, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (12, 3, 1, 0, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (12, 4, 1, 3, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (12, 5, 1, 1, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (12, 6, 1, 0, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (12, 7, 1, 15, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (12, 8, 1, 6, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (12, 9, 1, 18, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (12, 10, 1, 17, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (12, 11, 1, 8, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (12, 12, 1, 10, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (12, 13, 1, 18, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (12, 14, 1, 8, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (12, 15, 1, 4, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (12, 16, 1, 20, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (12, 17, 1, 20, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (12, 18, 1, 0, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (12, 19, 1, 0, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (12, 20, 1, 18, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (13, 1, 1, 17, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (13, 2, 1, 19, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (13, 3, 1, 0, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (13, 4, 1, 6, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (13, 5, 1, 8, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (13, 6, 1, 5, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (13, 7, 1, 0, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (13, 8, 1, 0, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (13, 9, 1, 8, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (13, 10, 1, 0, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (13, 11, 1, 0, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (13, 12, 1, 0, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (13, 13, 1, 0, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (13, 14, 1, 0, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (13, 15, 1, 0, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (13, 16, 1, 0, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (13, 17, 1, 0, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (13, 18, 1, 0, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (13, 19, 1, 0, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (13, 20, 1, 8, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (14, 1, 1, 18, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (14, 2, 1, 14, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (14, 3, 1, 15, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (14, 4, 1, 12, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (14, 5, 1, 10, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (14, 6, 1, 8, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (14, 7, 1, 0, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (14, 8, 1, 12, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (14, 9, 1, 15, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (14, 10, 1, 14, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (14, 11, 1, 8, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (14, 12, 1, 12, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (14, 13, 1, 11, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (14, 14, 1, 4, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (14, 15, 1, 4, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (14, 16, 1, 3, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (14, 17, 1, 2, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (14, 18, 1, 15, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (14, 19, 1, 12, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (14, 20, 1, 13, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (15, 1, 1, 17, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (15, 2, 1, 18, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (15, 3, 1, 6, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (15, 4, 1, 4, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (15, 5, 1, 4, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (15, 6, 1, 2, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (15, 7, 1, 0, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (15, 8, 1, 2, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (15, 9, 1, 17, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (15, 10, 1, 16, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (15, 11, 1, 16, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (15, 12, 1, 8, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (15, 13, 1, 18, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (15, 14, 1, 4, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (15, 15, 1, 2, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (15, 16, 1, 6, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (15, 17, 1, 0, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (15, 18, 1, 0, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (15, 19, 1, 0, 'CelRevive supplied 0-20 active-benefit score matrix'),
    (15, 20, 1, 12, 'CelRevive supplied 0-20 active-benefit score matrix')
ON CONFLICT (active_id, benefit_id, score_version) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 8. concern_benefit — PROPOSED ANODIAM WEIGHTS FOR CELREVIVE REVIEW
--
-- Weighting principles:
--   * Each concern/version totals exactly 1.00000.
--   * PRIMARY generally represents the dominant observable/mechanistic outcome.
--   * SECONDARY contributes materially to the concern but is not dominant.
--   * SUPPORTING is a smaller contextual/proxy contribution.
--   * All v1 rows are HYPOTHESIS pending Theresa/CelRevive scientific review.
--   * Current benefit vocabulary has known coverage gaps for acne, rosacea,
--     melasma-like pigmentation, photoaging, stretch marks and scar/repair.
--     These mappings use the closest available benefits and MUST NOT be treated
--     as disease-treatment claims.
-- ---------------------------------------------------------------------------
-- SC0001 Dry Skin | coverage=HIGH | B1=0.45, B2=0.35, B5=0.10, B20=0.10
-- SC0002 Dehydrated Skin | coverage=HIGH | B1=0.65, B2=0.20, B20=0.10, B5=0.05
-- SC0003 Compromised Skin Barrier | coverage=HIGH | B2=0.55, B1=0.20, B3=0.10, B5=0.10, B4=0.05
-- SC0004 Sensitive Skin | coverage=HIGH | B5=0.30, B4=0.25, B2=0.20, B6=0.10, B1=0.10, B3=0.05
-- SC0005 Redness | coverage=HIGH | B4=0.60, B5=0.20, B2=0.10, B1=0.05, B6=0.05
-- SC0006 Rosacea | coverage=MEDIUM | B4=0.40, B5=0.25, B2=0.15, B3=0.10, B6=0.05, B1=0.05
-- SC0007 Reactive Skin | coverage=HIGH | B5=0.30, B4=0.25, B2=0.20, B1=0.10, B6=0.10, B19=0.05
-- SC0008 Acne | coverage=MEDIUM | B7=0.35, B17=0.25, B3=0.15, B20=0.10, B4=0.05, B5=0.05, B2=0.05
-- SC0009 Breakouts / Blemishes | coverage=MEDIUM | B7=0.30, B17=0.20, B3=0.15, B4=0.10, B5=0.10, B20=0.10, B2=0.05
-- SC0010 Excess Sebum (Oily Skin) | coverage=HIGH | B7=0.60, B17=0.25, B20=0.10, B3=0.05
-- SC0011 Mature Skin | coverage=HIGH | B9=0.15, B10=0.15, B12=0.15, B13=0.15, B11=0.10, B1=0.10, B20=0.10, B8=0.05, B16=0.05
-- SC0012 Uneven Skin Tone | coverage=HIGH | B8=0.75, B20=0.15, B19=0.05, B1=0.05
-- SC0013 Hyperpigmentation | coverage=HIGH | B8=0.90, B20=0.10
-- SC0014 Melasma-like Pigmentation | coverage=MEDIUM | B8=0.90, B20=0.05, B19=0.05
-- SC0015 Dullness / Poor Radiance | coverage=HIGH | B8=0.40, B20=0.25, B1=0.20, B19=0.10, B2=0.05
-- SC0016 Fatigued Skin | coverage=MEDIUM | B8=0.25, B1=0.20, B14=0.20, B15=0.15, B20=0.10, B9=0.05, B19=0.05
-- SC0017 Photoaging | coverage=MEDIUM | B10=0.15, B12=0.15, B9=0.10, B13=0.10, B8=0.10, B20=0.10, B1=0.10, B19=0.10, B2=0.05, B18=0.05
-- SC0018 Chronic Skin Inflammation Risk | coverage=MEDIUM | B5=0.30, B4=0.25, B2=0.15, B3=0.15, B19=0.10, B6=0.05
-- SC0019 Skin Ageing / Longevity Risk | coverage=MEDIUM | B12=0.20, B13=0.15, B9=0.15, B10=0.15, B1=0.10, B2=0.10, B20=0.10, B19=0.05
-- SC1001 Enlarged Pores | coverage=HIGH | B17=0.35, B16=0.35, B7=0.15, B20=0.15
-- SC1002 Blackheads / Comedones | coverage=MEDIUM | B7=0.40, B17=0.35, B20=0.20, B3=0.05
-- SC1003 Fine Lines | coverage=HIGH | B9=0.60, B12=0.15, B1=0.10, B13=0.05, B10=0.05, B20=0.05
-- SC1004 Wrinkles | coverage=HIGH | B10=0.55, B12=0.20, B9=0.10, B13=0.10, B20=0.05
-- SC1005 Expression Lines | coverage=MEDIUM | B10=0.40, B9=0.20, B12=0.15, B13=0.10, B20=0.10, B1=0.05
-- SC1006 Loss of Firmness | coverage=HIGH | B13=0.40, B11=0.25, B12=0.25, B10=0.05, B20=0.05
-- SC1007 Age Spots | coverage=HIGH | B8=0.80, B20=0.10, B19=0.10
-- SC1008 Stretch Marks | coverage=LOW | B12=0.30, B13=0.25, B20=0.25, B2=0.10, B1=0.10
-- SC1009 Scar / Repair Needs | coverage=LOW-MEDIUM | B20=0.35, B2=0.25, B12=0.25, B5=0.10, B4=0.05
-- SC2001 Itching / Irritation | coverage=HIGH | B6=0.40, B5=0.35, B4=0.10, B2=0.10, B1=0.05
-- SC2002 Environmental Skin Stress | coverage=HIGH | B19=0.50, B2=0.15, B5=0.10, B1=0.10, B4=0.05, B3=0.05, B20=0.05
-- SC2003 Blue Light Exposure Risk | coverage=HIGH | B18=0.75, B19=0.10, B2=0.05, B1=0.05, B20=0.05
-- SC2004 Microbiome Imbalance Risk | coverage=HIGH | B3=0.70, B2=0.15, B5=0.10, B4=0.05
INSERT INTO concern_benefit
    (concern_id, benefit_id, mapping_version, weight,
     relevance_type, evidence_level, rationale)
VALUES
    ('SC0001', 1, 1, 0.45000, 'PRIMARY', 'HYPOTHESIS', '[coverage=HIGH] Dry skin is primarily a hydration and barrier-lipid problem; soothing and texture are supportive cosmetic outcomes. Benefit role: Direct hydration/water-content support.'),
    ('SC0001', 2, 1, 0.35000, 'PRIMARY', 'HYPOTHESIS', '[coverage=HIGH] Dry skin is primarily a hydration and barrier-lipid problem; soothing and texture are supportive cosmetic outcomes. Benefit role: Barrier-integrity and moisture-retention support.'),
    ('SC0001', 5, 1, 0.10000, 'SECONDARY', 'HYPOTHESIS', '[coverage=HIGH] Dry skin is primarily a hydration and barrier-lipid problem; soothing and texture are supportive cosmetic outcomes. Benefit role: Direct soothing/irritation-comfort support.'),
    ('SC0001', 20, 1, 0.10000, 'SECONDARY', 'HYPOTHESIS', '[coverage=HIGH] Dry skin is primarily a hydration and barrier-lipid problem; soothing and texture are supportive cosmetic outcomes. Benefit role: Direct visible texture/roughness improvement.'),
    ('SC0002', 1, 1, 0.65000, 'PRIMARY', 'HYPOTHESIS', '[coverage=HIGH] Dehydrated skin is primarily a water-deficit concern; barrier support helps retain water while texture/soothing are secondary. Benefit role: Direct hydration/water-content support.'),
    ('SC0002', 2, 1, 0.20000, 'SECONDARY', 'HYPOTHESIS', '[coverage=HIGH] Dehydrated skin is primarily a water-deficit concern; barrier support helps retain water while texture/soothing are secondary. Benefit role: Barrier-integrity and moisture-retention support.'),
    ('SC0002', 20, 1, 0.10000, 'SECONDARY', 'HYPOTHESIS', '[coverage=HIGH] Dehydrated skin is primarily a water-deficit concern; barrier support helps retain water while texture/soothing are secondary. Benefit role: Direct visible texture/roughness improvement.'),
    ('SC0002', 5, 1, 0.05000, 'SUPPORTING', 'HYPOTHESIS', '[coverage=HIGH] Dehydrated skin is primarily a water-deficit concern; barrier support helps retain water while texture/soothing are secondary. Benefit role: Direct soothing/irritation-comfort support.'),
    ('SC0003', 2, 1, 0.55000, 'PRIMARY', 'HYPOTHESIS', '[coverage=HIGH] Barrier repair is the dominant objective; hydration, microbiome support and soothing/redness reduction are complementary. Benefit role: Barrier-integrity and moisture-retention support.'),
    ('SC0003', 1, 1, 0.20000, 'SECONDARY', 'HYPOTHESIS', '[coverage=HIGH] Barrier repair is the dominant objective; hydration, microbiome support and soothing/redness reduction are complementary. Benefit role: Direct hydration/water-content support.'),
    ('SC0003', 3, 1, 0.10000, 'SECONDARY', 'HYPOTHESIS', '[coverage=HIGH] Barrier repair is the dominant objective; hydration, microbiome support and soothing/redness reduction are complementary. Benefit role: Microbiome-balance support.'),
    ('SC0003', 5, 1, 0.10000, 'SECONDARY', 'HYPOTHESIS', '[coverage=HIGH] Barrier repair is the dominant objective; hydration, microbiome support and soothing/redness reduction are complementary. Benefit role: Direct soothing/irritation-comfort support.'),
    ('SC0003', 4, 1, 0.05000, 'SUPPORTING', 'HYPOTHESIS', '[coverage=HIGH] Barrier repair is the dominant objective; hydration, microbiome support and soothing/redness reduction are complementary. Benefit role: Direct visible-redness reduction.'),
    ('SC0004', 5, 1, 0.30000, 'PRIMARY', 'HYPOTHESIS', '[coverage=HIGH] Sensitive skin is modeled around soothing, redness reduction and barrier support, with itch/hydration/microbiome as secondary contributors. Benefit role: Direct soothing/irritation-comfort support.'),
    ('SC0004', 4, 1, 0.25000, 'PRIMARY', 'HYPOTHESIS', '[coverage=HIGH] Sensitive skin is modeled around soothing, redness reduction and barrier support, with itch/hydration/microbiome as secondary contributors. Benefit role: Direct visible-redness reduction.'),
    ('SC0004', 2, 1, 0.20000, 'SECONDARY', 'HYPOTHESIS', '[coverage=HIGH] Sensitive skin is modeled around soothing, redness reduction and barrier support, with itch/hydration/microbiome as secondary contributors. Benefit role: Barrier-integrity and moisture-retention support.'),
    ('SC0004', 6, 1, 0.10000, 'SECONDARY', 'HYPOTHESIS', '[coverage=HIGH] Sensitive skin is modeled around soothing, redness reduction and barrier support, with itch/hydration/microbiome as secondary contributors. Benefit role: Direct itch/discomfort reduction.'),
    ('SC0004', 1, 1, 0.10000, 'SECONDARY', 'HYPOTHESIS', '[coverage=HIGH] Sensitive skin is modeled around soothing, redness reduction and barrier support, with itch/hydration/microbiome as secondary contributors. Benefit role: Direct hydration/water-content support.'),
    ('SC0004', 3, 1, 0.05000, 'SUPPORTING', 'HYPOTHESIS', '[coverage=HIGH] Sensitive skin is modeled around soothing, redness reduction and barrier support, with itch/hydration/microbiome as secondary contributors. Benefit role: Microbiome-balance support.'),
    ('SC0005', 4, 1, 0.60000, 'PRIMARY', 'HYPOTHESIS', '[coverage=HIGH] Visible redness is the dominant outcome; soothing and barrier support are secondary, with hydration/itch relief supportive. Benefit role: Direct visible-redness reduction.'),
    ('SC0005', 5, 1, 0.20000, 'SECONDARY', 'HYPOTHESIS', '[coverage=HIGH] Visible redness is the dominant outcome; soothing and barrier support are secondary, with hydration/itch relief supportive. Benefit role: Direct soothing/irritation-comfort support.'),
    ('SC0005', 2, 1, 0.10000, 'SECONDARY', 'HYPOTHESIS', '[coverage=HIGH] Visible redness is the dominant outcome; soothing and barrier support are secondary, with hydration/itch relief supportive. Benefit role: Barrier-integrity and moisture-retention support.'),
    ('SC0005', 1, 1, 0.05000, 'SUPPORTING', 'HYPOTHESIS', '[coverage=HIGH] Visible redness is the dominant outcome; soothing and barrier support are secondary, with hydration/itch relief supportive. Benefit role: Direct hydration/water-content support.'),
    ('SC0005', 6, 1, 0.05000, 'SUPPORTING', 'HYPOTHESIS', '[coverage=HIGH] Visible redness is the dominant outcome; soothing and barrier support are secondary, with hydration/itch relief supportive. Benefit role: Direct itch/discomfort reduction.'),
    ('SC0006', 4, 1, 0.40000, 'PRIMARY', 'HYPOTHESIS', '[coverage=MEDIUM] Rosacea is only partially represented by the current benefit vocabulary; redness and soothing dominate, with barrier/microbiome/itch/hydration as supporting proxies. Benefit role: Direct visible-redness reduction.'),
    ('SC0006', 5, 1, 0.25000, 'PRIMARY', 'HYPOTHESIS', '[coverage=MEDIUM] Rosacea is only partially represented by the current benefit vocabulary; redness and soothing dominate, with barrier/microbiome/itch/hydration as supporting proxies. Benefit role: Direct soothing/irritation-comfort support.'),
    ('SC0006', 2, 1, 0.15000, 'SECONDARY', 'HYPOTHESIS', '[coverage=MEDIUM] Rosacea is only partially represented by the current benefit vocabulary; redness and soothing dominate, with barrier/microbiome/itch/hydration as supporting proxies. Benefit role: Barrier-integrity and moisture-retention support.'),
    ('SC0006', 3, 1, 0.10000, 'SECONDARY', 'HYPOTHESIS', '[coverage=MEDIUM] Rosacea is only partially represented by the current benefit vocabulary; redness and soothing dominate, with barrier/microbiome/itch/hydration as supporting proxies. Benefit role: Microbiome-balance support.'),
    ('SC0006', 6, 1, 0.05000, 'SUPPORTING', 'HYPOTHESIS', '[coverage=MEDIUM] Rosacea is only partially represented by the current benefit vocabulary; redness and soothing dominate, with barrier/microbiome/itch/hydration as supporting proxies. Benefit role: Direct itch/discomfort reduction.'),
    ('SC0006', 1, 1, 0.05000, 'SUPPORTING', 'HYPOTHESIS', '[coverage=MEDIUM] Rosacea is only partially represented by the current benefit vocabulary; redness and soothing dominate, with barrier/microbiome/itch/hydration as supporting proxies. Benefit role: Direct hydration/water-content support.'),
    ('SC0007', 5, 1, 0.30000, 'PRIMARY', 'HYPOTHESIS', '[coverage=HIGH] Reactive skin is modeled around soothing, redness reduction and barrier resilience, with hydration/itch relief and pollution defence supporting. Benefit role: Direct soothing/irritation-comfort support.'),
    ('SC0007', 4, 1, 0.25000, 'PRIMARY', 'HYPOTHESIS', '[coverage=HIGH] Reactive skin is modeled around soothing, redness reduction and barrier resilience, with hydration/itch relief and pollution defence supporting. Benefit role: Direct visible-redness reduction.'),
    ('SC0007', 2, 1, 0.20000, 'SECONDARY', 'HYPOTHESIS', '[coverage=HIGH] Reactive skin is modeled around soothing, redness reduction and barrier resilience, with hydration/itch relief and pollution defence supporting. Benefit role: Barrier-integrity and moisture-retention support.'),
    ('SC0007', 1, 1, 0.10000, 'SECONDARY', 'HYPOTHESIS', '[coverage=HIGH] Reactive skin is modeled around soothing, redness reduction and barrier resilience, with hydration/itch relief and pollution defence supporting. Benefit role: Direct hydration/water-content support.'),
    ('SC0007', 6, 1, 0.10000, 'SECONDARY', 'HYPOTHESIS', '[coverage=HIGH] Reactive skin is modeled around soothing, redness reduction and barrier resilience, with hydration/itch relief and pollution defence supporting. Benefit role: Direct itch/discomfort reduction.'),
    ('SC0007', 19, 1, 0.05000, 'SUPPORTING', 'HYPOTHESIS', '[coverage=HIGH] Reactive skin is modeled around soothing, redness reduction and barrier resilience, with hydration/itch relief and pollution defence supporting. Benefit role: Direct anti-pollution/environmental-stress benefit.'),
    ('SC0008', 7, 1, 0.35000, 'PRIMARY', 'HYPOTHESIS', '[coverage=MEDIUM] Acne is only partially represented: sebum and oily-pore benefits are strongest available proxies, supplemented by microbiome, texture, redness, soothing and barrier support. Benefit role: Direct excess-sebum/shine reduction.'),
    ('SC0008', 17, 1, 0.25000, 'PRIMARY', 'HYPOTHESIS', '[coverage=MEDIUM] Acne is only partially represented: sebum and oily-pore benefits are strongest available proxies, supplemented by microbiome, texture, redness, soothing and barrier support. Benefit role: Direct oily-skin pore appearance support.'),
    ('SC0008', 3, 1, 0.15000, 'SECONDARY', 'HYPOTHESIS', '[coverage=MEDIUM] Acne is only partially represented: sebum and oily-pore benefits are strongest available proxies, supplemented by microbiome, texture, redness, soothing and barrier support. Benefit role: Microbiome-balance support.'),
    ('SC0008', 20, 1, 0.10000, 'SECONDARY', 'HYPOTHESIS', '[coverage=MEDIUM] Acne is only partially represented: sebum and oily-pore benefits are strongest available proxies, supplemented by microbiome, texture, redness, soothing and barrier support. Benefit role: Direct visible texture/roughness improvement.'),
    ('SC0008', 4, 1, 0.05000, 'SUPPORTING', 'HYPOTHESIS', '[coverage=MEDIUM] Acne is only partially represented: sebum and oily-pore benefits are strongest available proxies, supplemented by microbiome, texture, redness, soothing and barrier support. Benefit role: Direct visible-redness reduction.'),
    ('SC0008', 5, 1, 0.05000, 'SUPPORTING', 'HYPOTHESIS', '[coverage=MEDIUM] Acne is only partially represented: sebum and oily-pore benefits are strongest available proxies, supplemented by microbiome, texture, redness, soothing and barrier support. Benefit role: Direct soothing/irritation-comfort support.'),
    ('SC0008', 2, 1, 0.05000, 'SUPPORTING', 'HYPOTHESIS', '[coverage=MEDIUM] Acne is only partially represented: sebum and oily-pore benefits are strongest available proxies, supplemented by microbiome, texture, redness, soothing and barrier support. Benefit role: Barrier-integrity and moisture-retention support.'),
    ('SC0009', 7, 1, 0.30000, 'PRIMARY', 'HYPOTHESIS', '[coverage=MEDIUM] Breakouts/blemishes are modeled using sebum, oily-pore and microbiome proxies, plus inflammation/texture/barrier support. Benefit role: Direct excess-sebum/shine reduction.'),
    ('SC0009', 17, 1, 0.20000, 'SECONDARY', 'HYPOTHESIS', '[coverage=MEDIUM] Breakouts/blemishes are modeled using sebum, oily-pore and microbiome proxies, plus inflammation/texture/barrier support. Benefit role: Direct oily-skin pore appearance support.'),
    ('SC0009', 3, 1, 0.15000, 'SECONDARY', 'HYPOTHESIS', '[coverage=MEDIUM] Breakouts/blemishes are modeled using sebum, oily-pore and microbiome proxies, plus inflammation/texture/barrier support. Benefit role: Microbiome-balance support.'),
    ('SC0009', 4, 1, 0.10000, 'SECONDARY', 'HYPOTHESIS', '[coverage=MEDIUM] Breakouts/blemishes are modeled using sebum, oily-pore and microbiome proxies, plus inflammation/texture/barrier support. Benefit role: Direct visible-redness reduction.'),
    ('SC0009', 5, 1, 0.10000, 'SECONDARY', 'HYPOTHESIS', '[coverage=MEDIUM] Breakouts/blemishes are modeled using sebum, oily-pore and microbiome proxies, plus inflammation/texture/barrier support. Benefit role: Direct soothing/irritation-comfort support.'),
    ('SC0009', 20, 1, 0.10000, 'SECONDARY', 'HYPOTHESIS', '[coverage=MEDIUM] Breakouts/blemishes are modeled using sebum, oily-pore and microbiome proxies, plus inflammation/texture/barrier support. Benefit role: Direct visible texture/roughness improvement.'),
    ('SC0009', 2, 1, 0.05000, 'SUPPORTING', 'HYPOTHESIS', '[coverage=MEDIUM] Breakouts/blemishes are modeled using sebum, oily-pore and microbiome proxies, plus inflammation/texture/barrier support. Benefit role: Barrier-integrity and moisture-retention support.'),
    ('SC0010', 7, 1, 0.60000, 'PRIMARY', 'HYPOTHESIS', '[coverage=HIGH] Excess sebum is directly represented by sebum reduction and oily-pore minimisation; texture and microbiome are supporting. Benefit role: Direct excess-sebum/shine reduction.'),
    ('SC0010', 17, 1, 0.25000, 'PRIMARY', 'HYPOTHESIS', '[coverage=HIGH] Excess sebum is directly represented by sebum reduction and oily-pore minimisation; texture and microbiome are supporting. Benefit role: Direct oily-skin pore appearance support.'),
    ('SC0010', 20, 1, 0.10000, 'SECONDARY', 'HYPOTHESIS', '[coverage=HIGH] Excess sebum is directly represented by sebum reduction and oily-pore minimisation; texture and microbiome are supporting. Benefit role: Direct visible texture/roughness improvement.'),
    ('SC0010', 3, 1, 0.05000, 'SUPPORTING', 'HYPOTHESIS', '[coverage=HIGH] Excess sebum is directly represented by sebum reduction and oily-pore minimisation; texture and microbiome are supporting. Benefit role: Microbiome-balance support.'),
    ('SC0011', 9, 1, 0.15000, 'SECONDARY', 'HYPOTHESIS', '[coverage=HIGH] Mature skin is multi-factorial, emphasizing lines/wrinkles, collagen/firmness, jawline structure, hydration/texture and age-related tone/pore changes. Benefit role: Direct fine-line appearance reduction.'),
    ('SC0011', 10, 1, 0.15000, 'SECONDARY', 'HYPOTHESIS', '[coverage=HIGH] Mature skin is multi-factorial, emphasizing lines/wrinkles, collagen/firmness, jawline structure, hydration/texture and age-related tone/pore changes. Benefit role: Direct wrinkle length/depth appearance reduction.'),
    ('SC0011', 12, 1, 0.15000, 'SECONDARY', 'HYPOTHESIS', '[coverage=HIGH] Mature skin is multi-factorial, emphasizing lines/wrinkles, collagen/firmness, jawline structure, hydration/texture and age-related tone/pore changes. Benefit role: Collagen/dermal-matrix structural support.'),
    ('SC0011', 13, 1, 0.15000, 'SECONDARY', 'HYPOTHESIS', '[coverage=HIGH] Mature skin is multi-factorial, emphasizing lines/wrinkles, collagen/firmness, jawline structure, hydration/texture and age-related tone/pore changes. Benefit role: Direct visible skin-firming support.'),
    ('SC0011', 11, 1, 0.10000, 'SECONDARY', 'HYPOTHESIS', '[coverage=HIGH] Mature skin is multi-factorial, emphasizing lines/wrinkles, collagen/firmness, jawline structure, hydration/texture and age-related tone/pore changes. Benefit role: Lower-face/jawline structural-firmness proxy.'),
    ('SC0011', 1, 1, 0.10000, 'SECONDARY', 'HYPOTHESIS', '[coverage=HIGH] Mature skin is multi-factorial, emphasizing lines/wrinkles, collagen/firmness, jawline structure, hydration/texture and age-related tone/pore changes. Benefit role: Direct hydration/water-content support.'),
    ('SC0011', 20, 1, 0.10000, 'SECONDARY', 'HYPOTHESIS', '[coverage=HIGH] Mature skin is multi-factorial, emphasizing lines/wrinkles, collagen/firmness, jawline structure, hydration/texture and age-related tone/pore changes. Benefit role: Direct visible texture/roughness improvement.'),
    ('SC0011', 8, 1, 0.05000, 'SUPPORTING', 'HYPOTHESIS', '[coverage=HIGH] Mature skin is multi-factorial, emphasizing lines/wrinkles, collagen/firmness, jawline structure, hydration/texture and age-related tone/pore changes. Benefit role: Direct brightening/uneven-pigmentation appearance support.'),
    ('SC0011', 16, 1, 0.05000, 'SUPPORTING', 'HYPOTHESIS', '[coverage=HIGH] Mature skin is multi-factorial, emphasizing lines/wrinkles, collagen/firmness, jawline structure, hydration/texture and age-related tone/pore changes. Benefit role: Direct mature-skin pore appearance support.'),
    ('SC0012', 8, 1, 0.75000, 'PRIMARY', 'HYPOTHESIS', '[coverage=HIGH] Uneven tone is primarily modeled through brightening, with texture and environmental/hydration support secondary. Benefit role: Direct brightening/uneven-pigmentation appearance support.'),
    ('SC0012', 20, 1, 0.15000, 'SECONDARY', 'HYPOTHESIS', '[coverage=HIGH] Uneven tone is primarily modeled through brightening, with texture and environmental/hydration support secondary. Benefit role: Direct visible texture/roughness improvement.'),
    ('SC0012', 19, 1, 0.05000, 'SUPPORTING', 'HYPOTHESIS', '[coverage=HIGH] Uneven tone is primarily modeled through brightening, with texture and environmental/hydration support secondary. Benefit role: Direct anti-pollution/environmental-stress benefit.'),
    ('SC0012', 1, 1, 0.05000, 'SUPPORTING', 'HYPOTHESIS', '[coverage=HIGH] Uneven tone is primarily modeled through brightening, with texture and environmental/hydration support secondary. Benefit role: Direct hydration/water-content support.'),
    ('SC0013', 8, 1, 0.90000, 'PRIMARY', 'HYPOTHESIS', '[coverage=HIGH] Hyperpigmentation is primarily represented by skin brightening; texture is a small supporting appearance benefit. Benefit role: Direct brightening/uneven-pigmentation appearance support.'),
    ('SC0013', 20, 1, 0.10000, 'SECONDARY', 'HYPOTHESIS', '[coverage=HIGH] Hyperpigmentation is primarily represented by skin brightening; texture is a small supporting appearance benefit. Benefit role: Direct visible texture/roughness improvement.'),
    ('SC0014', 8, 1, 0.90000, 'PRIMARY', 'HYPOTHESIS', '[coverage=MEDIUM] Melasma-like pigmentation is only partially represented; brightening is the main available proxy and is not equivalent to a melasma treatment claim. Benefit role: Direct brightening/uneven-pigmentation appearance support.'),
    ('SC0014', 20, 1, 0.05000, 'SUPPORTING', 'HYPOTHESIS', '[coverage=MEDIUM] Melasma-like pigmentation is only partially represented; brightening is the main available proxy and is not equivalent to a melasma treatment claim. Benefit role: Direct visible texture/roughness improvement.'),
    ('SC0014', 19, 1, 0.05000, 'SUPPORTING', 'HYPOTHESIS', '[coverage=MEDIUM] Melasma-like pigmentation is only partially represented; brightening is the main available proxy and is not equivalent to a melasma treatment claim. Benefit role: Direct anti-pollution/environmental-stress benefit.'),
    ('SC0015', 8, 1, 0.40000, 'PRIMARY', 'HYPOTHESIS', '[coverage=HIGH] Dullness/radiance is modeled through brightening, texture and hydration, with pollution/barrier support secondary. Benefit role: Direct brightening/uneven-pigmentation appearance support.'),
    ('SC0015', 20, 1, 0.25000, 'PRIMARY', 'HYPOTHESIS', '[coverage=HIGH] Dullness/radiance is modeled through brightening, texture and hydration, with pollution/barrier support secondary. Benefit role: Direct visible texture/roughness improvement.'),
    ('SC0015', 1, 1, 0.20000, 'SECONDARY', 'HYPOTHESIS', '[coverage=HIGH] Dullness/radiance is modeled through brightening, texture and hydration, with pollution/barrier support secondary. Benefit role: Direct hydration/water-content support.'),
    ('SC0015', 19, 1, 0.10000, 'SECONDARY', 'HYPOTHESIS', '[coverage=HIGH] Dullness/radiance is modeled through brightening, texture and hydration, with pollution/barrier support secondary. Benefit role: Direct anti-pollution/environmental-stress benefit.'),
    ('SC0015', 2, 1, 0.05000, 'SUPPORTING', 'HYPOTHESIS', '[coverage=HIGH] Dullness/radiance is modeled through brightening, texture and hydration, with pollution/barrier support secondary. Benefit role: Barrier-integrity and moisture-retention support.'),
    ('SC0016', 8, 1, 0.25000, 'PRIMARY', 'HYPOTHESIS', '[coverage=MEDIUM] Fatigued skin is a presentation phenotype; radiance, hydration, eye-bag/dark-circle appearance and texture are the strongest available dimensions. Benefit role: Direct brightening/uneven-pigmentation appearance support.'),
    ('SC0016', 1, 1, 0.20000, 'SECONDARY', 'HYPOTHESIS', '[coverage=MEDIUM] Fatigued skin is a presentation phenotype; radiance, hydration, eye-bag/dark-circle appearance and texture are the strongest available dimensions. Benefit role: Direct hydration/water-content support.'),
    ('SC0016', 14, 1, 0.20000, 'SECONDARY', 'HYPOTHESIS', '[coverage=MEDIUM] Fatigued skin is a presentation phenotype; radiance, hydration, eye-bag/dark-circle appearance and texture are the strongest available dimensions. Benefit role: Direct eye-bag/puffiness appearance support.'),
    ('SC0016', 15, 1, 0.15000, 'SECONDARY', 'HYPOTHESIS', '[coverage=MEDIUM] Fatigued skin is a presentation phenotype; radiance, hydration, eye-bag/dark-circle appearance and texture are the strongest available dimensions. Benefit role: Direct under-eye dark-circle appearance support.'),
    ('SC0016', 20, 1, 0.10000, 'SECONDARY', 'HYPOTHESIS', '[coverage=MEDIUM] Fatigued skin is a presentation phenotype; radiance, hydration, eye-bag/dark-circle appearance and texture are the strongest available dimensions. Benefit role: Direct visible texture/roughness improvement.'),
    ('SC0016', 9, 1, 0.05000, 'SUPPORTING', 'HYPOTHESIS', '[coverage=MEDIUM] Fatigued skin is a presentation phenotype; radiance, hydration, eye-bag/dark-circle appearance and texture are the strongest available dimensions. Benefit role: Direct fine-line appearance reduction.'),
    ('SC0016', 19, 1, 0.05000, 'SUPPORTING', 'HYPOTHESIS', '[coverage=MEDIUM] Fatigued skin is a presentation phenotype; radiance, hydration, eye-bag/dark-circle appearance and texture are the strongest available dimensions. Benefit role: Direct anti-pollution/environmental-stress benefit.'),
    ('SC0017', 10, 1, 0.15000, 'SECONDARY', 'HYPOTHESIS', '[coverage=MEDIUM] Photoaging is only partially represented because no UV/photoprotection benefit exists; wrinkle, collagen, firmness, tone, texture and barrier/environmental proxies are used. Benefit role: Direct wrinkle length/depth appearance reduction.'),
    ('SC0017', 9, 1, 0.10000, 'SECONDARY', 'HYPOTHESIS', '[coverage=MEDIUM] Photoaging is only partially represented because no UV/photoprotection benefit exists; wrinkle, collagen, firmness, tone, texture and barrier/environmental proxies are used. Benefit role: Direct fine-line appearance reduction.'),
    ('SC0017', 12, 1, 0.15000, 'SECONDARY', 'HYPOTHESIS', '[coverage=MEDIUM] Photoaging is only partially represented because no UV/photoprotection benefit exists; wrinkle, collagen, firmness, tone, texture and barrier/environmental proxies are used. Benefit role: Collagen/dermal-matrix structural support.'),
    ('SC0017', 13, 1, 0.10000, 'SECONDARY', 'HYPOTHESIS', '[coverage=MEDIUM] Photoaging is only partially represented because no UV/photoprotection benefit exists; wrinkle, collagen, firmness, tone, texture and barrier/environmental proxies are used. Benefit role: Direct visible skin-firming support.'),
    ('SC0017', 8, 1, 0.10000, 'SECONDARY', 'HYPOTHESIS', '[coverage=MEDIUM] Photoaging is only partially represented because no UV/photoprotection benefit exists; wrinkle, collagen, firmness, tone, texture and barrier/environmental proxies are used. Benefit role: Direct brightening/uneven-pigmentation appearance support.'),
    ('SC0017', 20, 1, 0.10000, 'SECONDARY', 'HYPOTHESIS', '[coverage=MEDIUM] Photoaging is only partially represented because no UV/photoprotection benefit exists; wrinkle, collagen, firmness, tone, texture and barrier/environmental proxies are used. Benefit role: Direct visible texture/roughness improvement.'),
    ('SC0017', 1, 1, 0.10000, 'SECONDARY', 'HYPOTHESIS', '[coverage=MEDIUM] Photoaging is only partially represented because no UV/photoprotection benefit exists; wrinkle, collagen, firmness, tone, texture and barrier/environmental proxies are used. Benefit role: Direct hydration/water-content support.'),
    ('SC0017', 2, 1, 0.05000, 'SUPPORTING', 'HYPOTHESIS', '[coverage=MEDIUM] Photoaging is only partially represented because no UV/photoprotection benefit exists; wrinkle, collagen, firmness, tone, texture and barrier/environmental proxies are used. Benefit role: Barrier-integrity and moisture-retention support.'),
    ('SC0017', 19, 1, 0.10000, 'SECONDARY', 'HYPOTHESIS', '[coverage=MEDIUM] Photoaging is only partially represented because no UV/photoprotection benefit exists; wrinkle, collagen, firmness, tone, texture and barrier/environmental proxies are used. Benefit role: Direct anti-pollution/environmental-stress benefit.'),
    ('SC0017', 18, 1, 0.05000, 'SUPPORTING', 'HYPOTHESIS', '[coverage=MEDIUM] Photoaging is only partially represented because no UV/photoprotection benefit exists; wrinkle, collagen, firmness, tone, texture and barrier/environmental proxies are used. Benefit role: Direct anti-blue-light protection benefit.'),
    ('SC0018', 5, 1, 0.30000, 'PRIMARY', 'HYPOTHESIS', '[coverage=MEDIUM] Chronic inflammation risk is only indirectly represented; soothing/redness, barrier and microbiome support dominate, with environmental/itch support. Benefit role: Direct soothing/irritation-comfort support.'),
    ('SC0018', 4, 1, 0.25000, 'PRIMARY', 'HYPOTHESIS', '[coverage=MEDIUM] Chronic inflammation risk is only indirectly represented; soothing/redness, barrier and microbiome support dominate, with environmental/itch support. Benefit role: Direct visible-redness reduction.'),
    ('SC0018', 2, 1, 0.15000, 'SECONDARY', 'HYPOTHESIS', '[coverage=MEDIUM] Chronic inflammation risk is only indirectly represented; soothing/redness, barrier and microbiome support dominate, with environmental/itch support. Benefit role: Barrier-integrity and moisture-retention support.'),
    ('SC0018', 3, 1, 0.15000, 'SECONDARY', 'HYPOTHESIS', '[coverage=MEDIUM] Chronic inflammation risk is only indirectly represented; soothing/redness, barrier and microbiome support dominate, with environmental/itch support. Benefit role: Microbiome-balance support.'),
    ('SC0018', 19, 1, 0.10000, 'SECONDARY', 'HYPOTHESIS', '[coverage=MEDIUM] Chronic inflammation risk is only indirectly represented; soothing/redness, barrier and microbiome support dominate, with environmental/itch support. Benefit role: Direct anti-pollution/environmental-stress benefit.'),
    ('SC0018', 6, 1, 0.05000, 'SUPPORTING', 'HYPOTHESIS', '[coverage=MEDIUM] Chronic inflammation risk is only indirectly represented; soothing/redness, barrier and microbiome support dominate, with environmental/itch support. Benefit role: Direct itch/discomfort reduction.'),
    ('SC0019', 12, 1, 0.20000, 'SECONDARY', 'HYPOTHESIS', '[coverage=MEDIUM] Skin-ageing/longevity risk is multi-factorial, emphasizing collagen, firmness, lines/wrinkles, hydration/barrier and texture, with environmental defence supportive. Benefit role: Collagen/dermal-matrix structural support.'),
    ('SC0019', 13, 1, 0.15000, 'SECONDARY', 'HYPOTHESIS', '[coverage=MEDIUM] Skin-ageing/longevity risk is multi-factorial, emphasizing collagen, firmness, lines/wrinkles, hydration/barrier and texture, with environmental defence supportive. Benefit role: Direct visible skin-firming support.'),
    ('SC0019', 9, 1, 0.15000, 'SECONDARY', 'HYPOTHESIS', '[coverage=MEDIUM] Skin-ageing/longevity risk is multi-factorial, emphasizing collagen, firmness, lines/wrinkles, hydration/barrier and texture, with environmental defence supportive. Benefit role: Direct fine-line appearance reduction.'),
    ('SC0019', 10, 1, 0.15000, 'SECONDARY', 'HYPOTHESIS', '[coverage=MEDIUM] Skin-ageing/longevity risk is multi-factorial, emphasizing collagen, firmness, lines/wrinkles, hydration/barrier and texture, with environmental defence supportive. Benefit role: Direct wrinkle length/depth appearance reduction.'),
    ('SC0019', 1, 1, 0.10000, 'SECONDARY', 'HYPOTHESIS', '[coverage=MEDIUM] Skin-ageing/longevity risk is multi-factorial, emphasizing collagen, firmness, lines/wrinkles, hydration/barrier and texture, with environmental defence supportive. Benefit role: Direct hydration/water-content support.'),
    ('SC0019', 2, 1, 0.10000, 'SECONDARY', 'HYPOTHESIS', '[coverage=MEDIUM] Skin-ageing/longevity risk is multi-factorial, emphasizing collagen, firmness, lines/wrinkles, hydration/barrier and texture, with environmental defence supportive. Benefit role: Barrier-integrity and moisture-retention support.'),
    ('SC0019', 20, 1, 0.10000, 'SECONDARY', 'HYPOTHESIS', '[coverage=MEDIUM] Skin-ageing/longevity risk is multi-factorial, emphasizing collagen, firmness, lines/wrinkles, hydration/barrier and texture, with environmental defence supportive. Benefit role: Direct visible texture/roughness improvement.'),
    ('SC0019', 19, 1, 0.05000, 'SUPPORTING', 'HYPOTHESIS', '[coverage=MEDIUM] Skin-ageing/longevity risk is multi-factorial, emphasizing collagen, firmness, lines/wrinkles, hydration/barrier and texture, with environmental defence supportive. Benefit role: Direct anti-pollution/environmental-stress benefit.'),
    ('SC1001', 17, 1, 0.35000, 'PRIMARY', 'HYPOTHESIS', '[coverage=HIGH] Enlarged pores may present in oily and mature skin; both pore dimensions are therefore weighted equally, with sebum and texture secondary. Benefit role: Direct oily-skin pore appearance support.'),
    ('SC1001', 16, 1, 0.35000, 'PRIMARY', 'HYPOTHESIS', '[coverage=HIGH] Enlarged pores may present in oily and mature skin; both pore dimensions are therefore weighted equally, with sebum and texture secondary. Benefit role: Direct mature-skin pore appearance support.'),
    ('SC1001', 7, 1, 0.15000, 'SECONDARY', 'HYPOTHESIS', '[coverage=HIGH] Enlarged pores may present in oily and mature skin; both pore dimensions are therefore weighted equally, with sebum and texture secondary. Benefit role: Direct excess-sebum/shine reduction.'),
    ('SC1001', 20, 1, 0.15000, 'SECONDARY', 'HYPOTHESIS', '[coverage=HIGH] Enlarged pores may present in oily and mature skin; both pore dimensions are therefore weighted equally, with sebum and texture secondary. Benefit role: Direct visible texture/roughness improvement.'),
    ('SC1002', 7, 1, 0.40000, 'PRIMARY', 'HYPOTHESIS', '[coverage=MEDIUM] Blackheads/comedones are only partially represented; sebum and oily-pore benefits dominate with texture and microbiome as proxies. Benefit role: Direct excess-sebum/shine reduction.'),
    ('SC1002', 17, 1, 0.35000, 'PRIMARY', 'HYPOTHESIS', '[coverage=MEDIUM] Blackheads/comedones are only partially represented; sebum and oily-pore benefits dominate with texture and microbiome as proxies. Benefit role: Direct oily-skin pore appearance support.'),
    ('SC1002', 20, 1, 0.20000, 'SECONDARY', 'HYPOTHESIS', '[coverage=MEDIUM] Blackheads/comedones are only partially represented; sebum and oily-pore benefits dominate with texture and microbiome as proxies. Benefit role: Direct visible texture/roughness improvement.'),
    ('SC1002', 3, 1, 0.05000, 'SUPPORTING', 'HYPOTHESIS', '[coverage=MEDIUM] Blackheads/comedones are only partially represented; sebum and oily-pore benefits dominate with texture and microbiome as proxies. Benefit role: Microbiome-balance support.'),
    ('SC1003', 9, 1, 0.60000, 'PRIMARY', 'HYPOTHESIS', '[coverage=HIGH] Fine lines are directly represented; collagen and hydration are secondary contributors, with firmness/wrinkle/texture support. Benefit role: Direct fine-line appearance reduction.'),
    ('SC1003', 12, 1, 0.15000, 'SECONDARY', 'HYPOTHESIS', '[coverage=HIGH] Fine lines are directly represented; collagen and hydration are secondary contributors, with firmness/wrinkle/texture support. Benefit role: Collagen/dermal-matrix structural support.'),
    ('SC1003', 1, 1, 0.10000, 'SECONDARY', 'HYPOTHESIS', '[coverage=HIGH] Fine lines are directly represented; collagen and hydration are secondary contributors, with firmness/wrinkle/texture support. Benefit role: Direct hydration/water-content support.'),
    ('SC1003', 13, 1, 0.05000, 'SUPPORTING', 'HYPOTHESIS', '[coverage=HIGH] Fine lines are directly represented; collagen and hydration are secondary contributors, with firmness/wrinkle/texture support. Benefit role: Direct visible skin-firming support.'),
    ('SC1003', 10, 1, 0.05000, 'SUPPORTING', 'HYPOTHESIS', '[coverage=HIGH] Fine lines are directly represented; collagen and hydration are secondary contributors, with firmness/wrinkle/texture support. Benefit role: Direct wrinkle length/depth appearance reduction.'),
    ('SC1003', 20, 1, 0.05000, 'SUPPORTING', 'HYPOTHESIS', '[coverage=HIGH] Fine lines are directly represented; collagen and hydration are secondary contributors, with firmness/wrinkle/texture support. Benefit role: Direct visible texture/roughness improvement.'),
    ('SC1004', 10, 1, 0.55000, 'PRIMARY', 'HYPOTHESIS', '[coverage=HIGH] Wrinkles are directly represented; collagen is the main structural secondary benefit, followed by fine-line/firming/texture support. Benefit role: Direct wrinkle length/depth appearance reduction.'),
    ('SC1004', 12, 1, 0.20000, 'SECONDARY', 'HYPOTHESIS', '[coverage=HIGH] Wrinkles are directly represented; collagen is the main structural secondary benefit, followed by fine-line/firming/texture support. Benefit role: Collagen/dermal-matrix structural support.'),
    ('SC1004', 9, 1, 0.10000, 'SECONDARY', 'HYPOTHESIS', '[coverage=HIGH] Wrinkles are directly represented; collagen is the main structural secondary benefit, followed by fine-line/firming/texture support. Benefit role: Direct fine-line appearance reduction.'),
    ('SC1004', 13, 1, 0.10000, 'SECONDARY', 'HYPOTHESIS', '[coverage=HIGH] Wrinkles are directly represented; collagen is the main structural secondary benefit, followed by fine-line/firming/texture support. Benefit role: Direct visible skin-firming support.'),
    ('SC1004', 20, 1, 0.05000, 'SUPPORTING', 'HYPOTHESIS', '[coverage=HIGH] Wrinkles are directly represented; collagen is the main structural secondary benefit, followed by fine-line/firming/texture support. Benefit role: Direct visible texture/roughness improvement.'),
    ('SC1005', 10, 1, 0.40000, 'PRIMARY', 'HYPOTHESIS', '[coverage=MEDIUM] Expression lines are only partially represented; wrinkle/fine-line scores dominate with collagen/firming/texture/hydration supporting. Benefit role: Direct wrinkle length/depth appearance reduction.'),
    ('SC1005', 9, 1, 0.20000, 'SECONDARY', 'HYPOTHESIS', '[coverage=MEDIUM] Expression lines are only partially represented; wrinkle/fine-line scores dominate with collagen/firming/texture/hydration supporting. Benefit role: Direct fine-line appearance reduction.'),
    ('SC1005', 12, 1, 0.15000, 'SECONDARY', 'HYPOTHESIS', '[coverage=MEDIUM] Expression lines are only partially represented; wrinkle/fine-line scores dominate with collagen/firming/texture/hydration supporting. Benefit role: Collagen/dermal-matrix structural support.'),
    ('SC1005', 13, 1, 0.10000, 'SECONDARY', 'HYPOTHESIS', '[coverage=MEDIUM] Expression lines are only partially represented; wrinkle/fine-line scores dominate with collagen/firming/texture/hydration supporting. Benefit role: Direct visible skin-firming support.'),
    ('SC1005', 20, 1, 0.10000, 'SECONDARY', 'HYPOTHESIS', '[coverage=MEDIUM] Expression lines are only partially represented; wrinkle/fine-line scores dominate with collagen/firming/texture/hydration supporting. Benefit role: Direct visible texture/roughness improvement.'),
    ('SC1005', 1, 1, 0.05000, 'SUPPORTING', 'HYPOTHESIS', '[coverage=MEDIUM] Expression lines are only partially represented; wrinkle/fine-line scores dominate with collagen/firming/texture/hydration supporting. Benefit role: Direct hydration/water-content support.'),
    ('SC1006', 13, 1, 0.40000, 'PRIMARY', 'HYPOTHESIS', '[coverage=HIGH] Loss of firmness is directly represented by skin firming, jawline firming and collagen production; wrinkle/texture are supporting. Benefit role: Direct visible skin-firming support.'),
    ('SC1006', 11, 1, 0.25000, 'PRIMARY', 'HYPOTHESIS', '[coverage=HIGH] Loss of firmness is directly represented by skin firming, jawline firming and collagen production; wrinkle/texture are supporting. Benefit role: Lower-face/jawline structural-firmness proxy.'),
    ('SC1006', 12, 1, 0.25000, 'PRIMARY', 'HYPOTHESIS', '[coverage=HIGH] Loss of firmness is directly represented by skin firming, jawline firming and collagen production; wrinkle/texture are supporting. Benefit role: Collagen/dermal-matrix structural support.'),
    ('SC1006', 10, 1, 0.05000, 'SUPPORTING', 'HYPOTHESIS', '[coverage=HIGH] Loss of firmness is directly represented by skin firming, jawline firming and collagen production; wrinkle/texture are supporting. Benefit role: Direct wrinkle length/depth appearance reduction.'),
    ('SC1006', 20, 1, 0.05000, 'SUPPORTING', 'HYPOTHESIS', '[coverage=HIGH] Loss of firmness is directly represented by skin firming, jawline firming and collagen production; wrinkle/texture are supporting. Benefit role: Direct visible texture/roughness improvement.'),
    ('SC1007', 8, 1, 0.80000, 'PRIMARY', 'HYPOTHESIS', '[coverage=HIGH] Age spots are primarily represented by brightening; texture and environmental defence are supporting appearance dimensions. Benefit role: Direct brightening/uneven-pigmentation appearance support.'),
    ('SC1007', 20, 1, 0.10000, 'SECONDARY', 'HYPOTHESIS', '[coverage=HIGH] Age spots are primarily represented by brightening; texture and environmental defence are supporting appearance dimensions. Benefit role: Direct visible texture/roughness improvement.'),
    ('SC1007', 19, 1, 0.10000, 'SECONDARY', 'HYPOTHESIS', '[coverage=HIGH] Age spots are primarily represented by brightening; texture and environmental defence are supporting appearance dimensions. Benefit role: Direct anti-pollution/environmental-stress benefit.'),
    ('SC1008', 12, 1, 0.30000, 'PRIMARY', 'HYPOTHESIS', '[coverage=LOW] Stretch marks are poorly represented by the current benefit vocabulary; collagen, firmness and texture are used as proxies with barrier/hydration support. Benefit role: Collagen/dermal-matrix structural support.'),
    ('SC1008', 13, 1, 0.25000, 'PRIMARY', 'HYPOTHESIS', '[coverage=LOW] Stretch marks are poorly represented by the current benefit vocabulary; collagen, firmness and texture are used as proxies with barrier/hydration support. Benefit role: Direct visible skin-firming support.'),
    ('SC1008', 20, 1, 0.25000, 'PRIMARY', 'HYPOTHESIS', '[coverage=LOW] Stretch marks are poorly represented by the current benefit vocabulary; collagen, firmness and texture are used as proxies with barrier/hydration support. Benefit role: Direct visible texture/roughness improvement.'),
    ('SC1008', 2, 1, 0.10000, 'SECONDARY', 'HYPOTHESIS', '[coverage=LOW] Stretch marks are poorly represented by the current benefit vocabulary; collagen, firmness and texture are used as proxies with barrier/hydration support. Benefit role: Barrier-integrity and moisture-retention support.'),
    ('SC1008', 1, 1, 0.10000, 'SECONDARY', 'HYPOTHESIS', '[coverage=LOW] Stretch marks are poorly represented by the current benefit vocabulary; collagen, firmness and texture are used as proxies with barrier/hydration support. Benefit role: Direct hydration/water-content support.'),
    ('SC1009', 20, 1, 0.35000, 'PRIMARY', 'HYPOTHESIS', '[coverage=LOW-MEDIUM] Scar/repair needs are poorly represented; texture, barrier repair and collagen are the strongest available proxies with soothing/redness support. Benefit role: Direct visible texture/roughness improvement.'),
    ('SC1009', 2, 1, 0.25000, 'PRIMARY', 'HYPOTHESIS', '[coverage=LOW-MEDIUM] Scar/repair needs are poorly represented; texture, barrier repair and collagen are the strongest available proxies with soothing/redness support. Benefit role: Barrier-integrity and moisture-retention support.'),
    ('SC1009', 12, 1, 0.25000, 'PRIMARY', 'HYPOTHESIS', '[coverage=LOW-MEDIUM] Scar/repair needs are poorly represented; texture, barrier repair and collagen are the strongest available proxies with soothing/redness support. Benefit role: Collagen/dermal-matrix structural support.'),
    ('SC1009', 5, 1, 0.10000, 'SECONDARY', 'HYPOTHESIS', '[coverage=LOW-MEDIUM] Scar/repair needs are poorly represented; texture, barrier repair and collagen are the strongest available proxies with soothing/redness support. Benefit role: Direct soothing/irritation-comfort support.'),
    ('SC1009', 4, 1, 0.05000, 'SUPPORTING', 'HYPOTHESIS', '[coverage=LOW-MEDIUM] Scar/repair needs are poorly represented; texture, barrier repair and collagen are the strongest available proxies with soothing/redness support. Benefit role: Direct visible-redness reduction.'),
    ('SC2001', 6, 1, 0.40000, 'PRIMARY', 'HYPOTHESIS', '[coverage=HIGH] Itching/irritation is directly represented by itch reduction and soothing, with redness/barrier/hydration support. Benefit role: Direct itch/discomfort reduction.'),
    ('SC2001', 5, 1, 0.35000, 'PRIMARY', 'HYPOTHESIS', '[coverage=HIGH] Itching/irritation is directly represented by itch reduction and soothing, with redness/barrier/hydration support. Benefit role: Direct soothing/irritation-comfort support.'),
    ('SC2001', 4, 1, 0.10000, 'SECONDARY', 'HYPOTHESIS', '[coverage=HIGH] Itching/irritation is directly represented by itch reduction and soothing, with redness/barrier/hydration support. Benefit role: Direct visible-redness reduction.'),
    ('SC2001', 2, 1, 0.10000, 'SECONDARY', 'HYPOTHESIS', '[coverage=HIGH] Itching/irritation is directly represented by itch reduction and soothing, with redness/barrier/hydration support. Benefit role: Barrier-integrity and moisture-retention support.'),
    ('SC2001', 1, 1, 0.05000, 'SUPPORTING', 'HYPOTHESIS', '[coverage=HIGH] Itching/irritation is directly represented by itch reduction and soothing, with redness/barrier/hydration support. Benefit role: Direct hydration/water-content support.'),
    ('SC2002', 19, 1, 0.50000, 'PRIMARY', 'HYPOTHESIS', '[coverage=HIGH] Environmental stress is primarily represented by anti-pollution, with barrier, soothing, hydration and smaller redness/microbiome/texture support. Benefit role: Direct anti-pollution/environmental-stress benefit.'),
    ('SC2002', 2, 1, 0.15000, 'SECONDARY', 'HYPOTHESIS', '[coverage=HIGH] Environmental stress is primarily represented by anti-pollution, with barrier, soothing, hydration and smaller redness/microbiome/texture support. Benefit role: Barrier-integrity and moisture-retention support.'),
    ('SC2002', 5, 1, 0.10000, 'SECONDARY', 'HYPOTHESIS', '[coverage=HIGH] Environmental stress is primarily represented by anti-pollution, with barrier, soothing, hydration and smaller redness/microbiome/texture support. Benefit role: Direct soothing/irritation-comfort support.'),
    ('SC2002', 1, 1, 0.10000, 'SECONDARY', 'HYPOTHESIS', '[coverage=HIGH] Environmental stress is primarily represented by anti-pollution, with barrier, soothing, hydration and smaller redness/microbiome/texture support. Benefit role: Direct hydration/water-content support.'),
    ('SC2002', 4, 1, 0.05000, 'SUPPORTING', 'HYPOTHESIS', '[coverage=HIGH] Environmental stress is primarily represented by anti-pollution, with barrier, soothing, hydration and smaller redness/microbiome/texture support. Benefit role: Direct visible-redness reduction.'),
    ('SC2002', 3, 1, 0.05000, 'SUPPORTING', 'HYPOTHESIS', '[coverage=HIGH] Environmental stress is primarily represented by anti-pollution, with barrier, soothing, hydration and smaller redness/microbiome/texture support. Benefit role: Microbiome-balance support.'),
    ('SC2002', 20, 1, 0.05000, 'SUPPORTING', 'HYPOTHESIS', '[coverage=HIGH] Environmental stress is primarily represented by anti-pollution, with barrier, soothing, hydration and smaller redness/microbiome/texture support. Benefit role: Direct visible texture/roughness improvement.'),
    ('SC2003', 18, 1, 0.75000, 'PRIMARY', 'HYPOTHESIS', '[coverage=HIGH] Blue-light exposure risk is directly represented by anti-blue-light; anti-pollution and barrier/hydration/texture are supporting. Benefit role: Direct anti-blue-light protection benefit.'),
    ('SC2003', 19, 1, 0.10000, 'SECONDARY', 'HYPOTHESIS', '[coverage=HIGH] Blue-light exposure risk is directly represented by anti-blue-light; anti-pollution and barrier/hydration/texture are supporting. Benefit role: Direct anti-pollution/environmental-stress benefit.'),
    ('SC2003', 2, 1, 0.05000, 'SUPPORTING', 'HYPOTHESIS', '[coverage=HIGH] Blue-light exposure risk is directly represented by anti-blue-light; anti-pollution and barrier/hydration/texture are supporting. Benefit role: Barrier-integrity and moisture-retention support.'),
    ('SC2003', 1, 1, 0.05000, 'SUPPORTING', 'HYPOTHESIS', '[coverage=HIGH] Blue-light exposure risk is directly represented by anti-blue-light; anti-pollution and barrier/hydration/texture are supporting. Benefit role: Direct hydration/water-content support.'),
    ('SC2003', 20, 1, 0.05000, 'SUPPORTING', 'HYPOTHESIS', '[coverage=HIGH] Blue-light exposure risk is directly represented by anti-blue-light; anti-pollution and barrier/hydration/texture are supporting. Benefit role: Direct visible texture/roughness improvement.'),
    ('SC2004', 3, 1, 0.70000, 'PRIMARY', 'HYPOTHESIS', '[coverage=HIGH] Microbiome imbalance risk is directly represented by microbiome balance, with barrier and soothing/redness support. Benefit role: Microbiome-balance support.'),
    ('SC2004', 2, 1, 0.15000, 'SECONDARY', 'HYPOTHESIS', '[coverage=HIGH] Microbiome imbalance risk is directly represented by microbiome balance, with barrier and soothing/redness support. Benefit role: Barrier-integrity and moisture-retention support.'),
    ('SC2004', 5, 1, 0.10000, 'SECONDARY', 'HYPOTHESIS', '[coverage=HIGH] Microbiome imbalance risk is directly represented by microbiome balance, with barrier and soothing/redness support. Benefit role: Direct soothing/irritation-comfort support.'),
    ('SC2004', 4, 1, 0.05000, 'SUPPORTING', 'HYPOTHESIS', '[coverage=HIGH] Microbiome imbalance risk is directly represented by microbiome balance, with barrier and soothing/redness support. Benefit role: Direct visible-redness reduction.')
ON CONFLICT (concern_id, benefit_id, mapping_version) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 9. tag + active_tag
-- Retained from the supplied DML.
-- ---------------------------------------------------------------------------
INSERT INTO tag (tag_text, tag_type) VALUES
    ('Barrier', 'primary_concern'),
    ('Redness', 'primary_concern'),
    ('Pollution Protection', 'primary_concern'),
    ('Hydration', 'primary_concern'),
    ('redness', 'ai_tag'),
    ('sensitive', 'ai_tag'),
    ('barrier', 'ai_tag'),
    ('blue-light', 'ai_tag'),
    ('sensitive skin', 'ai_tag'),
    ('rosacea', 'ai_tag'),
    ('blue light', 'ai_tag'),
    ('pollution', 'ai_tag'),
    ('hydration', 'ai_tag'),
    ('ectoin', 'ai_tag'),
    ('Barrier Repair', 'primary_concern'),
    ('Sensitive Skin', 'primary_concern'),
    ('Dry Skin', 'primary_concern'),
    ('lipid repair', 'ai_tag'),
    ('compromised barrier', 'ai_tag'),
    ('repair', 'ai_tag'),
    ('TEWL', 'ai_tag'),
    ('ceramide', 'ai_tag'),
    ('dry skin', 'ai_tag'),
    ('Microbiome', 'primary_concern'),
    ('wrinkle', 'ai_tag'),
    ('microbiome', 'ai_tag'),
    ('collagen', 'ai_tag'),
    ('probiotic lysate', 'ai_tag'),
    ('Itch', 'primary_concern'),
    ('irritation', 'ai_tag'),
    ('itch', 'ai_tag'),
    ('reactive skin', 'ai_tag'),
    ('barrier comfort', 'ai_tag'),
    ('eczema-prone', 'ai_tag'),
    ('Neurogenic Redness', 'primary_concern'),
    ('Reactive Skin', 'primary_concern'),
    ('visible vessels', 'ai_tag'),
    ('pyroptosis', 'ai_tag'),
    ('reactive', 'ai_tag'),
    ('flushing', 'ai_tag'),
    ('Longevity', 'primary_concern'),
    ('Wrinkles', 'primary_concern'),
    ('Firmness', 'primary_concern'),
    ('neck wrinkles', 'ai_tag'),
    ('longevity', 'ai_tag'),
    ('age spots', 'ai_tag'),
    ('fatigue', 'ai_tag'),
    ('mitochondria', 'ai_tag'),
    ('firmness', 'ai_tag'),
    ('deep wrinkles', 'ai_tag'),
    ('energy', 'ai_tag'),
    ('wrinkles', 'ai_tag'),
    ('Senescence', 'primary_concern'),
    ('Rejuvenation', 'primary_concern'),
    ('mature skin', 'ai_tag'),
    ('senescence', 'ai_tag'),
    ('ageing', 'ai_tag'),
    ('Collagen', 'primary_concern'),
    ('jawline', 'ai_tag'),
    ('firming', 'ai_tag'),
    ('peptide', 'ai_tag'),
    ('Pigmentation', 'primary_concern'),
    ('Age Spots', 'primary_concern'),
    ('Brightening', 'primary_concern'),
    ('melanin', 'ai_tag'),
    ('uneven tone', 'ai_tag'),
    ('pigmentation', 'ai_tag'),
    ('brightening', 'ai_tag'),
    ('lipofuscin', 'ai_tag'),
    ('dark spots', 'ai_tag'),
    ('Rosacea', 'primary_concern'),
    ('Flushing', 'primary_concern'),
    ('VEGF', 'ai_tag'),
    ('histamine', 'ai_tag'),
    ('Acne', 'primary_concern'),
    ('Pores', 'primary_concern'),
    ('sebum', 'ai_tag'),
    ('pores', 'ai_tag'),
    ('acne', 'ai_tag'),
    ('bakuchiol', 'ai_tag'),
    ('retinol alternative', 'ai_tag'),
    ('Sebum', 'primary_concern'),
    ('elasticity', 'ai_tag'),
    ('texture', 'ai_tag'),
    ('barrier repair', 'ai_tag'),
    ('cholesterol', 'ai_tag'),
    ('Fatigue', 'primary_concern'),
    ('Radiance', 'primary_concern'),
    ('radiance', 'ai_tag'),
    ('sleep deprivation', 'ai_tag'),
    ('dull skin', 'ai_tag'),
    ('Mature Skin', 'primary_concern'),
    ('ceramides', 'ai_tag'),
    ('lipids', 'ai_tag')
ON CONFLICT (tag_text, tag_type) DO NOTHING;

INSERT INTO active_tag (active_id, tag_id) VALUES
    ((SELECT active_id FROM active WHERE active_name = 'Ectoin® natural'), (SELECT tag_id FROM tag WHERE tag_text = 'Barrier' AND tag_type = 'primary_concern')),
    ((SELECT active_id FROM active WHERE active_name = 'Ectoin® natural'), (SELECT tag_id FROM tag WHERE tag_text = 'Redness' AND tag_type = 'primary_concern')),
    ((SELECT active_id FROM active WHERE active_name = 'Ectoin® natural'), (SELECT tag_id FROM tag WHERE tag_text = 'Pollution Protection' AND tag_type = 'primary_concern')),
    ((SELECT active_id FROM active WHERE active_name = 'Ectoin® natural'), (SELECT tag_id FROM tag WHERE tag_text = 'Hydration' AND tag_type = 'primary_concern')),
    ((SELECT active_id FROM active WHERE active_name = 'Ectoin® natural'), (SELECT tag_id FROM tag WHERE tag_text = 'redness' AND tag_type = 'ai_tag')),
    ((SELECT active_id FROM active WHERE active_name = 'Ectoin® natural'), (SELECT tag_id FROM tag WHERE tag_text = 'sensitive' AND tag_type = 'ai_tag')),
    ((SELECT active_id FROM active WHERE active_name = 'Ectoin® natural'), (SELECT tag_id FROM tag WHERE tag_text = 'barrier' AND tag_type = 'ai_tag')),
    ((SELECT active_id FROM active WHERE active_name = 'Ectoin® natural'), (SELECT tag_id FROM tag WHERE tag_text = 'blue-light' AND tag_type = 'ai_tag')),
    ((SELECT active_id FROM active WHERE active_name = 'Ectoin® natural'), (SELECT tag_id FROM tag WHERE tag_text = 'sensitive skin' AND tag_type = 'ai_tag')),
    ((SELECT active_id FROM active WHERE active_name = 'Ectoin® natural'), (SELECT tag_id FROM tag WHERE tag_text = 'rosacea' AND tag_type = 'ai_tag')),
    ((SELECT active_id FROM active WHERE active_name = 'Ectoin® natural'), (SELECT tag_id FROM tag WHERE tag_text = 'blue light' AND tag_type = 'ai_tag')),
    ((SELECT active_id FROM active WHERE active_name = 'Ectoin® natural'), (SELECT tag_id FROM tag WHERE tag_text = 'pollution' AND tag_type = 'ai_tag')),
    ((SELECT active_id FROM active WHERE active_name = 'Ectoin® natural'), (SELECT tag_id FROM tag WHERE tag_text = 'hydration' AND tag_type = 'ai_tag')),
    ((SELECT active_id FROM active WHERE active_name = 'Ectoin® natural'), (SELECT tag_id FROM tag WHERE tag_text = 'ectoin' AND tag_type = 'ai_tag')),
    ((SELECT active_id FROM active WHERE active_name = 'Skinmimics® PRO MB'), (SELECT tag_id FROM tag WHERE tag_text = 'Barrier Repair' AND tag_type = 'primary_concern')),
    ((SELECT active_id FROM active WHERE active_name = 'Skinmimics® PRO MB'), (SELECT tag_id FROM tag WHERE tag_text = 'Sensitive Skin' AND tag_type = 'primary_concern')),
    ((SELECT active_id FROM active WHERE active_name = 'Skinmimics® PRO MB'), (SELECT tag_id FROM tag WHERE tag_text = 'Dry Skin' AND tag_type = 'primary_concern')),
    ((SELECT active_id FROM active WHERE active_name = 'Skinmimics® PRO MB'), (SELECT tag_id FROM tag WHERE tag_text = 'lipid repair' AND tag_type = 'ai_tag')),
    ((SELECT active_id FROM active WHERE active_name = 'Skinmimics® PRO MB'), (SELECT tag_id FROM tag WHERE tag_text = 'barrier' AND tag_type = 'ai_tag')),
    ((SELECT active_id FROM active WHERE active_name = 'Skinmimics® PRO MB'), (SELECT tag_id FROM tag WHERE tag_text = 'compromised barrier' AND tag_type = 'ai_tag')),
    ((SELECT active_id FROM active WHERE active_name = 'Skinmimics® PRO MB'), (SELECT tag_id FROM tag WHERE tag_text = 'sensitive skin' AND tag_type = 'ai_tag')),
    ((SELECT active_id FROM active WHERE active_name = 'Skinmimics® PRO MB'), (SELECT tag_id FROM tag WHERE tag_text = 'repair' AND tag_type = 'ai_tag')),
    ((SELECT active_id FROM active WHERE active_name = 'Skinmimics® PRO MB'), (SELECT tag_id FROM tag WHERE tag_text = 'TEWL' AND tag_type = 'ai_tag')),
    ((SELECT active_id FROM active WHERE active_name = 'Skinmimics® PRO MB'), (SELECT tag_id FROM tag WHERE tag_text = 'ceramide' AND tag_type = 'ai_tag')),
    ((SELECT active_id FROM active WHERE active_name = 'Skinmimics® PRO MB'), (SELECT tag_id FROM tag WHERE tag_text = 'dry skin' AND tag_type = 'ai_tag')),
    ((SELECT active_id FROM active WHERE active_name = 'Dermabiotics HDB1196 GN'), (SELECT tag_id FROM tag WHERE tag_text = 'Microbiome' AND tag_type = 'primary_concern')),
    ((SELECT active_id FROM active WHERE active_name = 'Dermabiotics HDB1196 GN'), (SELECT tag_id FROM tag WHERE tag_text = 'Barrier Repair' AND tag_type = 'primary_concern')),
    ((SELECT active_id FROM active WHERE active_name = 'Dermabiotics HDB1196 GN'), (SELECT tag_id FROM tag WHERE tag_text = 'Sensitive Skin' AND tag_type = 'primary_concern')),
    ((SELECT active_id FROM active WHERE active_name = 'Dermabiotics HDB1196 GN'), (SELECT tag_id FROM tag WHERE tag_text = 'wrinkle' AND tag_type = 'ai_tag')),
    ((SELECT active_id FROM active WHERE active_name = 'Dermabiotics HDB1196 GN'), (SELECT tag_id FROM tag WHERE tag_text = 'sensitive' AND tag_type = 'ai_tag')),
    ((SELECT active_id FROM active WHERE active_name = 'Dermabiotics HDB1196 GN'), (SELECT tag_id FROM tag WHERE tag_text = 'microbiome' AND tag_type = 'ai_tag')),
    ((SELECT active_id FROM active WHERE active_name = 'Dermabiotics HDB1196 GN'), (SELECT tag_id FROM tag WHERE tag_text = 'barrier' AND tag_type = 'ai_tag')),
    ((SELECT active_id FROM active WHERE active_name = 'Dermabiotics HDB1196 GN'), (SELECT tag_id FROM tag WHERE tag_text = 'sensitive skin' AND tag_type = 'ai_tag')),
    ((SELECT active_id FROM active WHERE active_name = 'Dermabiotics HDB1196 GN'), (SELECT tag_id FROM tag WHERE tag_text = 'collagen' AND tag_type = 'ai_tag')),
    ((SELECT active_id FROM active WHERE active_name = 'Dermabiotics HDB1196 GN'), (SELECT tag_id FROM tag WHERE tag_text = 'probiotic lysate' AND tag_type = 'ai_tag')),
    ((SELECT active_id FROM active WHERE active_name = 'Defensil® Plus'), (SELECT tag_id FROM tag WHERE tag_text = 'Redness' AND tag_type = 'primary_concern')),
    ((SELECT active_id FROM active WHERE active_name = 'Defensil® Plus'), (SELECT tag_id FROM tag WHERE tag_text = 'Itch' AND tag_type = 'primary_concern')),
    ((SELECT active_id FROM active WHERE active_name = 'Defensil® Plus'), (SELECT tag_id FROM tag WHERE tag_text = 'Sensitive Skin' AND tag_type = 'primary_concern')),
    ((SELECT active_id FROM active WHERE active_name = 'Defensil® Plus'), (SELECT tag_id FROM tag WHERE tag_text = 'redness' AND tag_type = 'ai_tag')),
    ((SELECT active_id FROM active WHERE active_name = 'Defensil® Plus'), (SELECT tag_id FROM tag WHERE tag_text = 'sensitive' AND tag_type = 'ai_tag')),
    ((SELECT active_id FROM active WHERE active_name = 'Defensil® Plus'), (SELECT tag_id FROM tag WHERE tag_text = 'irritation' AND tag_type = 'ai_tag')),
    ((SELECT active_id FROM active WHERE active_name = 'Defensil® Plus'), (SELECT tag_id FROM tag WHERE tag_text = 'itch' AND tag_type = 'ai_tag')),
    ((SELECT active_id FROM active WHERE active_name = 'Defensil® Plus'), (SELECT tag_id FROM tag WHERE tag_text = 'reactive skin' AND tag_type = 'ai_tag')),
    ((SELECT active_id FROM active WHERE active_name = 'Defensil® Plus'), (SELECT tag_id FROM tag WHERE tag_text = 'sensitive skin' AND tag_type = 'ai_tag')),
    ((SELECT active_id FROM active WHERE active_name = 'Defensil® Plus'), (SELECT tag_id FROM tag WHERE tag_text = 'barrier comfort' AND tag_type = 'ai_tag')),
    ((SELECT active_id FROM active WHERE active_name = 'Defensil® Plus'), (SELECT tag_id FROM tag WHERE tag_text = 'eczema-prone' AND tag_type = 'ai_tag')),
    ((SELECT active_id FROM active WHERE active_name = 'AmelioSense™'), (SELECT tag_id FROM tag WHERE tag_text = 'Neurogenic Redness' AND tag_type = 'primary_concern')),
    ((SELECT active_id FROM active WHERE active_name = 'AmelioSense™'), (SELECT tag_id FROM tag WHERE tag_text = 'Itch' AND tag_type = 'primary_concern')),
    ((SELECT active_id FROM active WHERE active_name = 'AmelioSense™'), (SELECT tag_id FROM tag WHERE tag_text = 'Reactive Skin' AND tag_type = 'primary_concern')),
    ((SELECT active_id FROM active WHERE active_name = 'AmelioSense™'), (SELECT tag_id FROM tag WHERE tag_text = 'redness' AND tag_type = 'ai_tag')),
    ((SELECT active_id FROM active WHERE active_name = 'AmelioSense™'), (SELECT tag_id FROM tag WHERE tag_text = 'visible vessels' AND tag_type = 'ai_tag')),
    ((SELECT active_id FROM active WHERE active_name = 'AmelioSense™'), (SELECT tag_id FROM tag WHERE tag_text = 'irritation' AND tag_type = 'ai_tag')),
    ((SELECT active_id FROM active WHERE active_name = 'AmelioSense™'), (SELECT tag_id FROM tag WHERE tag_text = 'pyroptosis' AND tag_type = 'ai_tag')),
    ((SELECT active_id FROM active WHERE active_name = 'AmelioSense™'), (SELECT tag_id FROM tag WHERE tag_text = 'itch' AND tag_type = 'ai_tag')),
    ((SELECT active_id FROM active WHERE active_name = 'AmelioSense™'), (SELECT tag_id FROM tag WHERE tag_text = 'reactive skin' AND tag_type = 'ai_tag')),
    ((SELECT active_id FROM active WHERE active_name = 'AmelioSense™'), (SELECT tag_id FROM tag WHERE tag_text = 'sensitive skin' AND tag_type = 'ai_tag')),
    ((SELECT active_id FROM active WHERE active_name = 'AmelioSense™'), (SELECT tag_id FROM tag WHERE tag_text = 'rosacea' AND tag_type = 'ai_tag')),
    ((SELECT active_id FROM active WHERE active_name = 'AmelioSense™'), (SELECT tag_id FROM tag WHERE tag_text = 'reactive' AND tag_type = 'ai_tag')),
    ((SELECT active_id FROM active WHERE active_name = 'AmelioSense™'), (SELECT tag_id FROM tag WHERE tag_text = 'flushing' AND tag_type = 'ai_tag')),
    ((SELECT active_id FROM active WHERE active_name = 'Agefinity™'), (SELECT tag_id FROM tag WHERE tag_text = 'Longevity' AND tag_type = 'primary_concern')),
    ((SELECT active_id FROM active WHERE active_name = 'Agefinity™'), (SELECT tag_id FROM tag WHERE tag_text = 'Wrinkles' AND tag_type = 'primary_concern')),
    ((SELECT active_id FROM active WHERE active_name = 'Agefinity™'), (SELECT tag_id FROM tag WHERE tag_text = 'Firmness' AND tag_type = 'primary_concern')),
    ((SELECT active_id FROM active WHERE active_name = 'Agefinity™'), (SELECT tag_id FROM tag WHERE tag_text = 'neck wrinkles' AND tag_type = 'ai_tag')),
    ((SELECT active_id FROM active WHERE active_name = 'Agefinity™'), (SELECT tag_id FROM tag WHERE tag_text = 'longevity' AND tag_type = 'ai_tag')),
    ((SELECT active_id FROM active WHERE active_name = 'Agefinity™'), (SELECT tag_id FROM tag WHERE tag_text = 'age spots' AND tag_type = 'ai_tag')),
    ((SELECT active_id FROM active WHERE active_name = 'Agefinity™'), (SELECT tag_id FROM tag WHERE tag_text = 'fatigue' AND tag_type = 'ai_tag')),
    ((SELECT active_id FROM active WHERE active_name = 'Agefinity™'), (SELECT tag_id FROM tag WHERE tag_text = 'mitochondria' AND tag_type = 'ai_tag')),
    ((SELECT active_id FROM active WHERE active_name = 'Agefinity™'), (SELECT tag_id FROM tag WHERE tag_text = 'firmness' AND tag_type = 'ai_tag')),
    ((SELECT active_id FROM active WHERE active_name = 'Agefinity™'), (SELECT tag_id FROM tag WHERE tag_text = 'deep wrinkles' AND tag_type = 'ai_tag')),
    ((SELECT active_id FROM active WHERE active_name = 'Agefinity™'), (SELECT tag_id FROM tag WHERE tag_text = 'energy' AND tag_type = 'ai_tag')),
    ((SELECT active_id FROM active WHERE active_name = 'Agefinity™'), (SELECT tag_id FROM tag WHERE tag_text = 'wrinkles' AND tag_type = 'ai_tag')),
    ((SELECT active_id FROM active WHERE active_name = 'ETERWELL™ YOUTH'), (SELECT tag_id FROM tag WHERE tag_text = 'Senescence' AND tag_type = 'primary_concern')),
    ((SELECT active_id FROM active WHERE active_name = 'ETERWELL™ YOUTH'), (SELECT tag_id FROM tag WHERE tag_text = 'Firmness' AND tag_type = 'primary_concern')),
    ((SELECT active_id FROM active WHERE active_name = 'ETERWELL™ YOUTH'), (SELECT tag_id FROM tag WHERE tag_text = 'Rejuvenation' AND tag_type = 'primary_concern')),
    ((SELECT active_id FROM active WHERE active_name = 'ETERWELL™ YOUTH'), (SELECT tag_id FROM tag WHERE tag_text = 'longevity' AND tag_type = 'ai_tag')),
    ((SELECT active_id FROM active WHERE active_name = 'ETERWELL™ YOUTH'), (SELECT tag_id FROM tag WHERE tag_text = 'mature skin' AND tag_type = 'ai_tag')),
    ((SELECT active_id FROM active WHERE active_name = 'ETERWELL™ YOUTH'), (SELECT tag_id FROM tag WHERE tag_text = 'collagen' AND tag_type = 'ai_tag')),
    ((SELECT active_id FROM active WHERE active_name = 'ETERWELL™ YOUTH'), (SELECT tag_id FROM tag WHERE tag_text = 'senescence' AND tag_type = 'ai_tag')),
    ((SELECT active_id FROM active WHERE active_name = 'ETERWELL™ YOUTH'), (SELECT tag_id FROM tag WHERE tag_text = 'firmness' AND tag_type = 'ai_tag')),
    ((SELECT active_id FROM active WHERE active_name = 'ETERWELL™ YOUTH'), (SELECT tag_id FROM tag WHERE tag_text = 'ageing' AND tag_type = 'ai_tag')),
    ((SELECT active_id FROM active WHERE active_name = 'ETERWELL™ YOUTH'), (SELECT tag_id FROM tag WHERE tag_text = 'wrinkles' AND tag_type = 'ai_tag')),
    ((SELECT active_id FROM active WHERE active_name = 'SYN®-COLL CB'), (SELECT tag_id FROM tag WHERE tag_text = 'Collagen' AND tag_type = 'primary_concern')),
    ((SELECT active_id FROM active WHERE active_name = 'SYN®-COLL CB'), (SELECT tag_id FROM tag WHERE tag_text = 'Wrinkles' AND tag_type = 'primary_concern')),
    ((SELECT active_id FROM active WHERE active_name = 'SYN®-COLL CB'), (SELECT tag_id FROM tag WHERE tag_text = 'Firmness' AND tag_type = 'primary_concern')),
    ((SELECT active_id FROM active WHERE active_name = 'SYN®-COLL CB'), (SELECT tag_id FROM tag WHERE tag_text = 'jawline' AND tag_type = 'ai_tag')),
    ((SELECT active_id FROM active WHERE active_name = 'SYN®-COLL CB'), (SELECT tag_id FROM tag WHERE tag_text = 'mature skin' AND tag_type = 'ai_tag')),
    ((SELECT active_id FROM active WHERE active_name = 'SYN®-COLL CB'), (SELECT tag_id FROM tag WHERE tag_text = 'collagen' AND tag_type = 'ai_tag')),
    ((SELECT active_id FROM active WHERE active_name = 'SYN®-COLL CB'), (SELECT tag_id FROM tag WHERE tag_text = 'firmness' AND tag_type = 'ai_tag')),
    ((SELECT active_id FROM active WHERE active_name = 'SYN®-COLL CB'), (SELECT tag_id FROM tag WHERE tag_text = 'firming' AND tag_type = 'ai_tag')),
    ((SELECT active_id FROM active WHERE active_name = 'SYN®-COLL CB'), (SELECT tag_id FROM tag WHERE tag_text = 'wrinkles' AND tag_type = 'ai_tag')),
    ((SELECT active_id FROM active WHERE active_name = 'SYN®-COLL CB'), (SELECT tag_id FROM tag WHERE tag_text = 'peptide' AND tag_type = 'ai_tag')),
    ((SELECT active_id FROM active WHERE active_name = 'ILUMYS®'), (SELECT tag_id FROM tag WHERE tag_text = 'Pigmentation' AND tag_type = 'primary_concern')),
    ((SELECT active_id FROM active WHERE active_name = 'ILUMYS®'), (SELECT tag_id FROM tag WHERE tag_text = 'Age Spots' AND tag_type = 'primary_concern')),
    ((SELECT active_id FROM active WHERE active_name = 'ILUMYS®'), (SELECT tag_id FROM tag WHERE tag_text = 'Brightening' AND tag_type = 'primary_concern')),
    ((SELECT active_id FROM active WHERE active_name = 'ILUMYS®'), (SELECT tag_id FROM tag WHERE tag_text = 'melanin' AND tag_type = 'ai_tag')),
    ((SELECT active_id FROM active WHERE active_name = 'ILUMYS®'), (SELECT tag_id FROM tag WHERE tag_text = 'uneven tone' AND tag_type = 'ai_tag')),
    ((SELECT active_id FROM active WHERE active_name = 'ILUMYS®'), (SELECT tag_id FROM tag WHERE tag_text = 'age spots' AND tag_type = 'ai_tag')),
    ((SELECT active_id FROM active WHERE active_name = 'ILUMYS®'), (SELECT tag_id FROM tag WHERE tag_text = 'pigmentation' AND tag_type = 'ai_tag')),
    ((SELECT active_id FROM active WHERE active_name = 'ILUMYS®'), (SELECT tag_id FROM tag WHERE tag_text = 'brightening' AND tag_type = 'ai_tag')),
    ((SELECT active_id FROM active WHERE active_name = 'ILUMYS®'), (SELECT tag_id FROM tag WHERE tag_text = 'lipofuscin' AND tag_type = 'ai_tag')),
    ((SELECT active_id FROM active WHERE active_name = 'ILUMYS®'), (SELECT tag_id FROM tag WHERE tag_text = 'dark spots' AND tag_type = 'ai_tag')),
    ((SELECT active_id FROM active WHERE active_name = 'ENDOTHELYOL®'), (SELECT tag_id FROM tag WHERE tag_text = 'Rosacea' AND tag_type = 'primary_concern')),
    ((SELECT active_id FROM active WHERE active_name = 'ENDOTHELYOL®'), (SELECT tag_id FROM tag WHERE tag_text = 'Redness' AND tag_type = 'primary_concern')),
    ((SELECT active_id FROM active WHERE active_name = 'ENDOTHELYOL®'), (SELECT tag_id FROM tag WHERE tag_text = 'Flushing' AND tag_type = 'primary_concern')),
    ((SELECT active_id FROM active WHERE active_name = 'ENDOTHELYOL®'), (SELECT tag_id FROM tag WHERE tag_text = 'redness' AND tag_type = 'ai_tag')),
    ((SELECT active_id FROM active WHERE active_name = 'ENDOTHELYOL®'), (SELECT tag_id FROM tag WHERE tag_text = 'VEGF' AND tag_type = 'ai_tag')),
    ((SELECT active_id FROM active WHERE active_name = 'ENDOTHELYOL®'), (SELECT tag_id FROM tag WHERE tag_text = 'itch' AND tag_type = 'ai_tag')),
    ((SELECT active_id FROM active WHERE active_name = 'ENDOTHELYOL®'), (SELECT tag_id FROM tag WHERE tag_text = 'sensitive skin' AND tag_type = 'ai_tag')),
    ((SELECT active_id FROM active WHERE active_name = 'ENDOTHELYOL®'), (SELECT tag_id FROM tag WHERE tag_text = 'histamine' AND tag_type = 'ai_tag')),
    ((SELECT active_id FROM active WHERE active_name = 'ENDOTHELYOL®'), (SELECT tag_id FROM tag WHERE tag_text = 'rosacea' AND tag_type = 'ai_tag')),
    ((SELECT active_id FROM active WHERE active_name = 'ENDOTHELYOL®'), (SELECT tag_id FROM tag WHERE tag_text = 'flushing' AND tag_type = 'ai_tag')),
    ((SELECT active_id FROM active WHERE active_name = 'Sytenol® A'), (SELECT tag_id FROM tag WHERE tag_text = 'Wrinkles' AND tag_type = 'primary_concern')),
    ((SELECT active_id FROM active WHERE active_name = 'Sytenol® A'), (SELECT tag_id FROM tag WHERE tag_text = 'Acne' AND tag_type = 'primary_concern')),
    ((SELECT active_id FROM active WHERE active_name = 'Sytenol® A'), (SELECT tag_id FROM tag WHERE tag_text = 'Pores' AND tag_type = 'primary_concern')),
    ((SELECT active_id FROM active WHERE active_name = 'Sytenol® A'), (SELECT tag_id FROM tag WHERE tag_text = 'sebum' AND tag_type = 'ai_tag')),
    ((SELECT active_id FROM active WHERE active_name = 'Sytenol® A'), (SELECT tag_id FROM tag WHERE tag_text = 'pores' AND tag_type = 'ai_tag')),
    ((SELECT active_id FROM active WHERE active_name = 'Sytenol® A'), (SELECT tag_id FROM tag WHERE tag_text = 'collagen' AND tag_type = 'ai_tag')),
    ((SELECT active_id FROM active WHERE active_name = 'Sytenol® A'), (SELECT tag_id FROM tag WHERE tag_text = 'acne' AND tag_type = 'ai_tag')),
    ((SELECT active_id FROM active WHERE active_name = 'Sytenol® A'), (SELECT tag_id FROM tag WHERE tag_text = 'bakuchiol' AND tag_type = 'ai_tag')),
    ((SELECT active_id FROM active WHERE active_name = 'Sytenol® A'), (SELECT tag_id FROM tag WHERE tag_text = 'retinol alternative' AND tag_type = 'ai_tag')),
    ((SELECT active_id FROM active WHERE active_name = 'Sytenol® A'), (SELECT tag_id FROM tag WHERE tag_text = 'wrinkles' AND tag_type = 'ai_tag')),
    ((SELECT active_id FROM active WHERE active_name = 'NovoRetin™'), (SELECT tag_id FROM tag WHERE tag_text = 'Wrinkles' AND tag_type = 'primary_concern')),
    ((SELECT active_id FROM active WHERE active_name = 'NovoRetin™'), (SELECT tag_id FROM tag WHERE tag_text = 'Acne' AND tag_type = 'primary_concern')),
    ((SELECT active_id FROM active WHERE active_name = 'NovoRetin™'), (SELECT tag_id FROM tag WHERE tag_text = 'Sebum' AND tag_type = 'primary_concern')),
    ((SELECT active_id FROM active WHERE active_name = 'NovoRetin™'), (SELECT tag_id FROM tag WHERE tag_text = 'Pores' AND tag_type = 'primary_concern')),
    ((SELECT active_id FROM active WHERE active_name = 'NovoRetin™'), (SELECT tag_id FROM tag WHERE tag_text = 'sebum' AND tag_type = 'ai_tag')),
    ((SELECT active_id FROM active WHERE active_name = 'NovoRetin™'), (SELECT tag_id FROM tag WHERE tag_text = 'pores' AND tag_type = 'ai_tag')),
    ((SELECT active_id FROM active WHERE active_name = 'NovoRetin™'), (SELECT tag_id FROM tag WHERE tag_text = 'acne' AND tag_type = 'ai_tag')),
    ((SELECT active_id FROM active WHERE active_name = 'NovoRetin™'), (SELECT tag_id FROM tag WHERE tag_text = 'elasticity' AND tag_type = 'ai_tag')),
    ((SELECT active_id FROM active WHERE active_name = 'NovoRetin™'), (SELECT tag_id FROM tag WHERE tag_text = 'retinol alternative' AND tag_type = 'ai_tag')),
    ((SELECT active_id FROM active WHERE active_name = 'NovoRetin™'), (SELECT tag_id FROM tag WHERE tag_text = 'texture' AND tag_type = 'ai_tag')),
    ((SELECT active_id FROM active WHERE active_name = 'NovoRetin™'), (SELECT tag_id FROM tag WHERE tag_text = 'wrinkles' AND tag_type = 'ai_tag')),
    ((SELECT active_id FROM active WHERE active_name = 'TRI-SOLVE®'), (SELECT tag_id FROM tag WHERE tag_text = 'Barrier Repair' AND tag_type = 'primary_concern')),
    ((SELECT active_id FROM active WHERE active_name = 'TRI-SOLVE®'), (SELECT tag_id FROM tag WHERE tag_text = 'Dry Skin' AND tag_type = 'primary_concern')),
    ((SELECT active_id FROM active WHERE active_name = 'TRI-SOLVE®'), (SELECT tag_id FROM tag WHERE tag_text = 'Hydration' AND tag_type = 'primary_concern')),
    ((SELECT active_id FROM active WHERE active_name = 'TRI-SOLVE®'), (SELECT tag_id FROM tag WHERE tag_text = 'barrier repair' AND tag_type = 'ai_tag')),
    ((SELECT active_id FROM active WHERE active_name = 'TRI-SOLVE®'), (SELECT tag_id FROM tag WHERE tag_text = 'cholesterol' AND tag_type = 'ai_tag')),
    ((SELECT active_id FROM active WHERE active_name = 'TRI-SOLVE®'), (SELECT tag_id FROM tag WHERE tag_text = 'irritation' AND tag_type = 'ai_tag')),
    ((SELECT active_id FROM active WHERE active_name = 'TRI-SOLVE®'), (SELECT tag_id FROM tag WHERE tag_text = 'barrier' AND tag_type = 'ai_tag')),
    ((SELECT active_id FROM active WHERE active_name = 'TRI-SOLVE®'), (SELECT tag_id FROM tag WHERE tag_text = 'itch' AND tag_type = 'ai_tag')),
    ((SELECT active_id FROM active WHERE active_name = 'TRI-SOLVE®'), (SELECT tag_id FROM tag WHERE tag_text = 'eczema-prone' AND tag_type = 'ai_tag')),
    ((SELECT active_id FROM active WHERE active_name = 'TRI-SOLVE®'), (SELECT tag_id FROM tag WHERE tag_text = 'ceramide' AND tag_type = 'ai_tag')),
    ((SELECT active_id FROM active WHERE active_name = 'TRI-SOLVE®'), (SELECT tag_id FROM tag WHERE tag_text = 'repair' AND tag_type = 'ai_tag')),
    ((SELECT active_id FROM active WHERE active_name = 'TRI-SOLVE®'), (SELECT tag_id FROM tag WHERE tag_text = 'hydration' AND tag_type = 'ai_tag')),
    ((SELECT active_id FROM active WHERE active_name = 'TRI-SOLVE®'), (SELECT tag_id FROM tag WHERE tag_text = 'dry skin' AND tag_type = 'ai_tag')),
    ((SELECT active_id FROM active WHERE active_name = 'Glycoin® natural'), (SELECT tag_id FROM tag WHERE tag_text = 'Hydration' AND tag_type = 'primary_concern')),
    ((SELECT active_id FROM active WHERE active_name = 'Glycoin® natural'), (SELECT tag_id FROM tag WHERE tag_text = 'Fatigue' AND tag_type = 'primary_concern')),
    ((SELECT active_id FROM active WHERE active_name = 'Glycoin® natural'), (SELECT tag_id FROM tag WHERE tag_text = 'Radiance' AND tag_type = 'primary_concern')),
    ((SELECT active_id FROM active WHERE active_name = 'Glycoin® natural'), (SELECT tag_id FROM tag WHERE tag_text = 'radiance' AND tag_type = 'ai_tag')),
    ((SELECT active_id FROM active WHERE active_name = 'Glycoin® natural'), (SELECT tag_id FROM tag WHERE tag_text = 'fatigue' AND tag_type = 'ai_tag')),
    ((SELECT active_id FROM active WHERE active_name = 'Glycoin® natural'), (SELECT tag_id FROM tag WHERE tag_text = 'sleep deprivation' AND tag_type = 'ai_tag')),
    ((SELECT active_id FROM active WHERE active_name = 'Glycoin® natural'), (SELECT tag_id FROM tag WHERE tag_text = 'dull skin' AND tag_type = 'ai_tag')),
    ((SELECT active_id FROM active WHERE active_name = 'Glycoin® natural'), (SELECT tag_id FROM tag WHERE tag_text = 'energy' AND tag_type = 'ai_tag')),
    ((SELECT active_id FROM active WHERE active_name = 'Glycoin® natural'), (SELECT tag_id FROM tag WHERE tag_text = 'hydration' AND tag_type = 'ai_tag')),
    ((SELECT active_id FROM active WHERE active_name = 'Vetivyne™'), (SELECT tag_id FROM tag WHERE tag_text = 'Barrier' AND tag_type = 'primary_concern')),
    ((SELECT active_id FROM active WHERE active_name = 'Vetivyne™'), (SELECT tag_id FROM tag WHERE tag_text = 'Firmness' AND tag_type = 'primary_concern')),
    ((SELECT active_id FROM active WHERE active_name = 'Vetivyne™'), (SELECT tag_id FROM tag WHERE tag_text = 'Mature Skin' AND tag_type = 'primary_concern')),
    ((SELECT active_id FROM active WHERE active_name = 'Vetivyne™'), (SELECT tag_id FROM tag WHERE tag_text = 'mature skin' AND tag_type = 'ai_tag')),
    ((SELECT active_id FROM active WHERE active_name = 'Vetivyne™'), (SELECT tag_id FROM tag WHERE tag_text = 'barrier' AND tag_type = 'ai_tag')),
    ((SELECT active_id FROM active WHERE active_name = 'Vetivyne™'), (SELECT tag_id FROM tag WHERE tag_text = 'fatigue' AND tag_type = 'ai_tag')),
    ((SELECT active_id FROM active WHERE active_name = 'Vetivyne™'), (SELECT tag_id FROM tag WHERE tag_text = 'firmness' AND tag_type = 'ai_tag')),
    ((SELECT active_id FROM active WHERE active_name = 'Vetivyne™'), (SELECT tag_id FROM tag WHERE tag_text = 'ceramides' AND tag_type = 'ai_tag')),
    ((SELECT active_id FROM active WHERE active_name = 'Vetivyne™'), (SELECT tag_id FROM tag WHERE tag_text = 'lipids' AND tag_type = 'ai_tag')),
    ((SELECT active_id FROM active WHERE active_name = 'Vetivyne™'), (SELECT tag_id FROM tag WHERE tag_text = 'wrinkles' AND tag_type = 'ai_tag')),
    ((SELECT active_id FROM active WHERE active_name = 'Vetivyne™'), (SELECT tag_id FROM tag WHERE tag_text = 'dry skin' AND tag_type = 'ai_tag'))
ON CONFLICT (active_id, tag_id) DO NOTHING;

-- ---------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 10. source_document + active_source_document
-- source_document currently has no UNIQUE(filename) constraint in the updated
-- DDL, so inserts use NOT EXISTS rather than ON CONFLICT(filename).
-- ---------------------------------------------------------------------------
INSERT INTO source_document (filename)
SELECT v.filename
FROM (VALUES
        ('19_SOFW_Ectoin fights pollution induced skin pigmentation _EN.pdf'),
        ('22_Ectoin_natural_Factsheet_bitop AG_44p.pdf'),
        ('Ectoin TDS.pdf'),
        ('SKINMIMICS PRO - PDR .pdf'),
        ('SKINMIMICS PRO MB_TI_A0323.pdf'),
        ('DERMABIOTICS v. 1.0..pdf'),
        ('DERMABIOTICS SKB1196 GN - COMPOSITION copy.pdf'),
        ('Dermabiotics PowerPoint.pdf'),
        ('pd_marketing_leaflet_defensil-plus_summary_enp000001877.pdf'),
        ('Defensil Plus.pdf'),
        ('DEFENSIL-PLUS Datasheet.pdf'),
        ('Brochure_AmelioSense.pdf'),
        ('PPT_AmelioSense.pdf'),
        ('AmelioSense Datasheet.pdf'),
        ('Agefinity.pdf'),
        ('Agefinity™_TLV20190409.pdf'),
        ('RMIP V10 - AGEFINITY - 34161 - 20190322.pdf'),
        ('ETERWELL YOUTH customer presentation 2024.pdf'),
        ('ETERWELL-YOUTH_Teaser_2024Mar.pdf'),
        ('ETERWELL™ YOUTH Datasheet.pdf'),
        ('ETERWELL__YOUTH___SYN_-COLL_CB_presentation_10.2025[58888].pdf'),
        ('SYN®-COLL Datasheet.pdf'),
        ('ILUMYS.pdf'),
        ('34148 ENDOTHELYOL Technical Data Sheet 20240320.pdf'),
        ('Active Beauty_Endothelyol_TPV171211.pdf'),
        ('ENDOTHELYOL-2.pdf'),
        ('SF_Endothelyol_10072018.pdf'),
        ('2022-04 Sytenol A-Raw Material Information Profile.pdf'),
        ('2022-05 Sytenol A vs generic Bakuchi extracts.pdf'),
        ('Brochure - Sytenol A Acne 2016.pdf'),
        ('Brochure - Sytenol A Anti Aging 2016.pdf'),
        ('Formulation Guidelines for Sytenol A - PDF Free Download.pdf'),
        ('Presentation - 2022 Sytenol A.pdf'),
        ('Study - Sytenol A vs Retinol Clinical Trial British J.Derm June 2018.pdf'),
        ('Sytenol A formulation guide.pdf'),
        ('Sytenol® A Anti-aging brochure 2022 DIGITAL.pdf'),
        ('Brochure_NovoRetin.pdf'),
        ('PPT_NovoRetin.pdf'),
        ('NovoRetin.pdf'),
        ('trisolve-brochure.pdf'),
        ('Tri-Solve P TDS rev.11 0724.pdf'),
        ('tri-solve-general-statements-rmi-0519.pdf'),
        ('tri-solve-p-general-statements-rmi-0322.pdf'),
        ('TRI-SOLVE-P-SDS.pdf'),
        ('22_Glycoin_natural_Factsheet_bitop AG_24p.pdf'),
        ('Publication_EuroCosmetics Glycoin natural_Bitop_final.pdf'),
        ('Glycoin® Natural Datasheet.pdf'),
        ('Active Beauty Leaflet_Vetivyne™_TLV180322.pdf'),
        ('Active Beauty Presentation_Vetivyne™_TPV180410'),
        ('Vetivyne.pdf')
     ) AS v(filename)
WHERE NOT EXISTS (
    SELECT 1
    FROM source_document sd
    WHERE sd.filename = v.filename
);

INSERT INTO active_source_document (active_id, doc_id) VALUES
    ((SELECT active_id FROM active WHERE active_name = 'Ectoin® natural'), (SELECT MIN(doc_id) FROM source_document WHERE filename = '19_SOFW_Ectoin fights pollution induced skin pigmentation _EN.pdf')),
    ((SELECT active_id FROM active WHERE active_name = 'Ectoin® natural'), (SELECT MIN(doc_id) FROM source_document WHERE filename = '22_Ectoin_natural_Factsheet_bitop AG_44p.pdf')),
    ((SELECT active_id FROM active WHERE active_name = 'Ectoin® natural'), (SELECT MIN(doc_id) FROM source_document WHERE filename = 'Ectoin TDS.pdf')),
    ((SELECT active_id FROM active WHERE active_name = 'Skinmimics® PRO MB'), (SELECT MIN(doc_id) FROM source_document WHERE filename = 'SKINMIMICS PRO - PDR .pdf')),
    ((SELECT active_id FROM active WHERE active_name = 'Skinmimics® PRO MB'), (SELECT MIN(doc_id) FROM source_document WHERE filename = 'SKINMIMICS PRO MB_TI_A0323.pdf')),
    ((SELECT active_id FROM active WHERE active_name = 'Dermabiotics HDB1196 GN'), (SELECT MIN(doc_id) FROM source_document WHERE filename = 'DERMABIOTICS v. 1.0..pdf')),
    ((SELECT active_id FROM active WHERE active_name = 'Dermabiotics HDB1196 GN'), (SELECT MIN(doc_id) FROM source_document WHERE filename = 'DERMABIOTICS SKB1196 GN - COMPOSITION copy.pdf')),
    ((SELECT active_id FROM active WHERE active_name = 'Dermabiotics HDB1196 GN'), (SELECT MIN(doc_id) FROM source_document WHERE filename = 'Dermabiotics PowerPoint.pdf')),
    ((SELECT active_id FROM active WHERE active_name = 'Defensil® Plus'), (SELECT MIN(doc_id) FROM source_document WHERE filename = 'pd_marketing_leaflet_defensil-plus_summary_enp000001877.pdf')),
    ((SELECT active_id FROM active WHERE active_name = 'Defensil® Plus'), (SELECT MIN(doc_id) FROM source_document WHERE filename = 'Defensil Plus.pdf')),
    ((SELECT active_id FROM active WHERE active_name = 'Defensil® Plus'), (SELECT MIN(doc_id) FROM source_document WHERE filename = 'DEFENSIL-PLUS Datasheet.pdf')),
    ((SELECT active_id FROM active WHERE active_name = 'AmelioSense™'), (SELECT MIN(doc_id) FROM source_document WHERE filename = 'Brochure_AmelioSense.pdf')),
    ((SELECT active_id FROM active WHERE active_name = 'AmelioSense™'), (SELECT MIN(doc_id) FROM source_document WHERE filename = 'PPT_AmelioSense.pdf')),
    ((SELECT active_id FROM active WHERE active_name = 'AmelioSense™'), (SELECT MIN(doc_id) FROM source_document WHERE filename = 'AmelioSense Datasheet.pdf')),
    ((SELECT active_id FROM active WHERE active_name = 'Agefinity™'), (SELECT MIN(doc_id) FROM source_document WHERE filename = 'Agefinity.pdf')),
    ((SELECT active_id FROM active WHERE active_name = 'Agefinity™'), (SELECT MIN(doc_id) FROM source_document WHERE filename = 'Agefinity™_TLV20190409.pdf')),
    ((SELECT active_id FROM active WHERE active_name = 'Agefinity™'), (SELECT MIN(doc_id) FROM source_document WHERE filename = 'RMIP V10 - AGEFINITY - 34161 - 20190322.pdf')),
    ((SELECT active_id FROM active WHERE active_name = 'ETERWELL™ YOUTH'), (SELECT MIN(doc_id) FROM source_document WHERE filename = 'ETERWELL YOUTH customer presentation 2024.pdf')),
    ((SELECT active_id FROM active WHERE active_name = 'ETERWELL™ YOUTH'), (SELECT MIN(doc_id) FROM source_document WHERE filename = 'ETERWELL-YOUTH_Teaser_2024Mar.pdf')),
    ((SELECT active_id FROM active WHERE active_name = 'ETERWELL™ YOUTH'), (SELECT MIN(doc_id) FROM source_document WHERE filename = 'ETERWELL™ YOUTH Datasheet.pdf')),
    ((SELECT active_id FROM active WHERE active_name = 'SYN®-COLL CB'), (SELECT MIN(doc_id) FROM source_document WHERE filename = 'ETERWELL__YOUTH___SYN_-COLL_CB_presentation_10.2025[58888].pdf')),
    ((SELECT active_id FROM active WHERE active_name = 'SYN®-COLL CB'), (SELECT MIN(doc_id) FROM source_document WHERE filename = 'SYN®-COLL Datasheet.pdf')),
    ((SELECT active_id FROM active WHERE active_name = 'ILUMYS®'), (SELECT MIN(doc_id) FROM source_document WHERE filename = 'ILUMYS.pdf')),
    ((SELECT active_id FROM active WHERE active_name = 'ENDOTHELYOL®'), (SELECT MIN(doc_id) FROM source_document WHERE filename = '34148 ENDOTHELYOL Technical Data Sheet 20240320.pdf')),
    ((SELECT active_id FROM active WHERE active_name = 'ENDOTHELYOL®'), (SELECT MIN(doc_id) FROM source_document WHERE filename = 'Active Beauty_Endothelyol_TPV171211.pdf')),
    ((SELECT active_id FROM active WHERE active_name = 'ENDOTHELYOL®'), (SELECT MIN(doc_id) FROM source_document WHERE filename = 'ENDOTHELYOL-2.pdf')),
    ((SELECT active_id FROM active WHERE active_name = 'ENDOTHELYOL®'), (SELECT MIN(doc_id) FROM source_document WHERE filename = 'SF_Endothelyol_10072018.pdf')),
    ((SELECT active_id FROM active WHERE active_name = 'Sytenol® A'), (SELECT MIN(doc_id) FROM source_document WHERE filename = '2022-04 Sytenol A-Raw Material Information Profile.pdf')),
    ((SELECT active_id FROM active WHERE active_name = 'Sytenol® A'), (SELECT MIN(doc_id) FROM source_document WHERE filename = '2022-05 Sytenol A vs generic Bakuchi extracts.pdf')),
    ((SELECT active_id FROM active WHERE active_name = 'Sytenol® A'), (SELECT MIN(doc_id) FROM source_document WHERE filename = 'Brochure - Sytenol A Acne 2016.pdf')),
    ((SELECT active_id FROM active WHERE active_name = 'Sytenol® A'), (SELECT MIN(doc_id) FROM source_document WHERE filename = 'Brochure - Sytenol A Anti Aging 2016.pdf')),
    ((SELECT active_id FROM active WHERE active_name = 'Sytenol® A'), (SELECT MIN(doc_id) FROM source_document WHERE filename = 'Formulation Guidelines for Sytenol A - PDF Free Download.pdf')),
    ((SELECT active_id FROM active WHERE active_name = 'Sytenol® A'), (SELECT MIN(doc_id) FROM source_document WHERE filename = 'Presentation - 2022 Sytenol A.pdf')),
    ((SELECT active_id FROM active WHERE active_name = 'Sytenol® A'), (SELECT MIN(doc_id) FROM source_document WHERE filename = 'Study - Sytenol A vs Retinol Clinical Trial British J.Derm June 2018.pdf')),
    ((SELECT active_id FROM active WHERE active_name = 'Sytenol® A'), (SELECT MIN(doc_id) FROM source_document WHERE filename = 'Sytenol A formulation guide.pdf')),
    ((SELECT active_id FROM active WHERE active_name = 'Sytenol® A'), (SELECT MIN(doc_id) FROM source_document WHERE filename = 'Sytenol® A Anti-aging brochure 2022 DIGITAL.pdf')),
    ((SELECT active_id FROM active WHERE active_name = 'NovoRetin™'), (SELECT MIN(doc_id) FROM source_document WHERE filename = 'Brochure_NovoRetin.pdf')),
    ((SELECT active_id FROM active WHERE active_name = 'NovoRetin™'), (SELECT MIN(doc_id) FROM source_document WHERE filename = 'PPT_NovoRetin.pdf')),
    ((SELECT active_id FROM active WHERE active_name = 'NovoRetin™'), (SELECT MIN(doc_id) FROM source_document WHERE filename = 'NovoRetin.pdf')),
    ((SELECT active_id FROM active WHERE active_name = 'TRI-SOLVE®'), (SELECT MIN(doc_id) FROM source_document WHERE filename = 'trisolve-brochure.pdf')),
    ((SELECT active_id FROM active WHERE active_name = 'TRI-SOLVE®'), (SELECT MIN(doc_id) FROM source_document WHERE filename = 'Tri-Solve P TDS rev.11 0724.pdf')),
    ((SELECT active_id FROM active WHERE active_name = 'TRI-SOLVE®'), (SELECT MIN(doc_id) FROM source_document WHERE filename = 'tri-solve-general-statements-rmi-0519.pdf')),
    ((SELECT active_id FROM active WHERE active_name = 'TRI-SOLVE®'), (SELECT MIN(doc_id) FROM source_document WHERE filename = 'tri-solve-p-general-statements-rmi-0322.pdf')),
    ((SELECT active_id FROM active WHERE active_name = 'TRI-SOLVE®'), (SELECT MIN(doc_id) FROM source_document WHERE filename = 'TRI-SOLVE-P-SDS.pdf')),
    ((SELECT active_id FROM active WHERE active_name = 'Glycoin® natural'), (SELECT MIN(doc_id) FROM source_document WHERE filename = '22_Glycoin_natural_Factsheet_bitop AG_24p.pdf')),
    ((SELECT active_id FROM active WHERE active_name = 'Glycoin® natural'), (SELECT MIN(doc_id) FROM source_document WHERE filename = 'Publication_EuroCosmetics Glycoin natural_Bitop_final.pdf')),
    ((SELECT active_id FROM active WHERE active_name = 'Glycoin® natural'), (SELECT MIN(doc_id) FROM source_document WHERE filename = 'Glycoin® Natural Datasheet.pdf')),
    ((SELECT active_id FROM active WHERE active_name = 'Vetivyne™'), (SELECT MIN(doc_id) FROM source_document WHERE filename = 'Active Beauty Leaflet_Vetivyne™_TLV180322.pdf')),
    ((SELECT active_id FROM active WHERE active_name = 'Vetivyne™'), (SELECT MIN(doc_id) FROM source_document WHERE filename = 'Active Beauty Presentation_Vetivyne™_TPV180410')),
    ((SELECT active_id FROM active WHERE active_name = 'Vetivyne™'), (SELECT MIN(doc_id) FROM source_document WHERE filename = 'Vetivyne.pdf'))
ON CONFLICT (active_id, doc_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 11. base_active_compatibility
-- Retained from supplied Compatibility sheet load. Absence of a row means
-- 'not assessed', not 'incompatible'. No active-vs-active incompatibility rows
-- were supplied in the source DML.
-- ---------------------------------------------------------------------------
INSERT INTO base_active_compatibility (base_id, active_id, is_compatible) VALUES
    ((SELECT base_id FROM base WHERE base_name = 'Oil'), (SELECT active_id FROM active WHERE active_name = 'Agefinity™'), TRUE),
    ((SELECT base_id FROM base WHERE base_name = 'Oil'), (SELECT active_id FROM active WHERE active_name = 'AmelioSense™'), TRUE),
    ((SELECT base_id FROM base WHERE base_name = 'Oil'), (SELECT active_id FROM active WHERE active_name = 'Dermabiotics HDB1196 GN'), TRUE),
    ((SELECT base_id FROM base WHERE base_name = 'Oil'), (SELECT active_id FROM active WHERE active_name = 'ENDOTHELYOL®'), TRUE),
    ((SELECT base_id FROM base WHERE base_name = 'Oil'), (SELECT active_id FROM active WHERE active_name = 'ETERWELL™ YOUTH'), TRUE),
    ((SELECT base_id FROM base WHERE base_name = 'Oil'), (SELECT active_id FROM active WHERE active_name = 'Ectoin® natural'), TRUE),
    ((SELECT base_id FROM base WHERE base_name = 'Oil'), (SELECT active_id FROM active WHERE active_name = 'Glycoin® natural'), TRUE),
    ((SELECT base_id FROM base WHERE base_name = 'Oil'), (SELECT active_id FROM active WHERE active_name = 'NovoRetin™'), TRUE),
    ((SELECT base_id FROM base WHERE base_name = 'Oil'), (SELECT active_id FROM active WHERE active_name = 'SYN®-COLL CB'), TRUE),
    ((SELECT base_id FROM base WHERE base_name = 'Oil'), (SELECT active_id FROM active WHERE active_name = 'Skinmimics® PRO MB'), TRUE),
    ((SELECT base_id FROM base WHERE base_name = 'Oil'), (SELECT active_id FROM active WHERE active_name = 'TRI-SOLVE®'), TRUE)
ON CONFLICT (base_id, active_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 12. Pre-commit integrity checks
-- ---------------------------------------------------------------------------

-- Force the deferred concern_benefit aggregate-weight constraint now so a bad
-- mapping fails before COMMIT.
SET CONSTRAINTS ALL IMMEDIATE;

DO $$
DECLARE
    v_active_count INTEGER;
    v_benefit_count INTEGER;
    v_concern_count INTEGER;
    v_score_count INTEGER;
    v_cb_concern_count INTEGER;
    v_bad_weight_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_active_count FROM active WHERE active_id BETWEEN 1 AND 15;
    SELECT COUNT(*) INTO v_benefit_count FROM benefit WHERE benefit_id BETWEEN 1 AND 20;
    SELECT COUNT(*) INTO v_concern_count FROM skin_concern;
    SELECT COUNT(*) INTO v_score_count
      FROM active_benefit_score
     WHERE score_version = 1
       AND active_id BETWEEN 1 AND 15
       AND benefit_id BETWEEN 1 AND 20;
    SELECT COUNT(DISTINCT concern_id) INTO v_cb_concern_count
      FROM concern_benefit
     WHERE mapping_version = 1;
    SELECT COUNT(*) INTO v_bad_weight_count
      FROM vw_invalid_concern_benefit_weight_sum
     WHERE mapping_version = 1;

    IF v_active_count <> 15 THEN
        RAISE EXCEPTION 'Expected 15 baseline actives, found %', v_active_count;
    END IF;
    IF v_benefit_count <> 20 THEN
        RAISE EXCEPTION 'Expected 20 baseline benefits, found %', v_benefit_count;
    END IF;
    IF v_concern_count < 32 THEN
        RAISE EXCEPTION 'Expected at least 32 skin concerns, found %', v_concern_count;
    END IF;
    IF v_score_count <> 300 THEN
        RAISE EXCEPTION 'Expected 300 version-1 active-benefit score rows, found %', v_score_count;
    END IF;
    IF v_cb_concern_count <> 32 THEN
        RAISE EXCEPTION 'Expected v1 concern-benefit mappings for 32 concerns, found %', v_cb_concern_count;
    END IF;
    IF v_bad_weight_count <> 0 THEN
        RAISE EXCEPTION 'Invalid concern-benefit weight totals detected: % concern/version groups', v_bad_weight_count;
    END IF;
END;
$$;

COMMIT;

-- ============================================================================
-- POST-LOAD QA / REVIEW QUERIES
-- Run after COMMIT.
-- ============================================================================

-- A. Every v1 concern should sum to 1.00000.
SELECT
    cb.concern_id,
    sc.concern_name,
    cb.mapping_version,
    ROUND(SUM(cb.weight), 5) AS weight_sum,
    COUNT(*) AS mapped_benefit_count
FROM concern_benefit cb
JOIN skin_concern sc ON sc.concern_id = cb.concern_id
WHERE cb.mapping_version = 1
GROUP BY cb.concern_id, sc.concern_name, cb.mapping_version
ORDER BY cb.concern_id;

-- B. Should return zero rows.
SELECT * FROM vw_invalid_concern_benefit_weight_sum;

-- C. Should return zero rows for the complete baseline 15 x 20 matrix.
SELECT * FROM vw_missing_active_benefit_score;

-- D. Review top 3 actives produced by the proposed concern-benefit weights.
SELECT
    concern_id,
    concern_name,
    active_rank,
    active_id,
    active_name,
    relevance_score_0_100,
    mapping_evidence_floor
FROM vw_ranked_active_concern_score
WHERE active_rank <= 3
ORDER BY concern_id, active_rank, active_id;

-- ============================================================================
-- GOVERNANCE AFTER THERESA / CELREVIVE REVIEW
-- ============================================================================
-- 1. Do NOT change evidence_level to VALIDATED merely because the SQL loads.
-- 2. Once reviewed/agreed, create mapping_version=2 with the approved weights,
--    evidence_level='EXPERT' or 'VALIDATED' as CelRevive determines, and set
--    approved_by / approved_at.
-- 3. Preserve mapping_version=1 as the Anodiam design hypothesis/audit baseline.
-- 4. Any future change to CelRevive's 0-20 active-benefit scores should use
--    score_version=2 (or later), rather than overwriting version 1.
-- ============================================================================


-- ============================================================================
-- MVP OPERATIONAL DATA NOTE
-- ============================================================================
-- The following tables are intentionally NOT seeded with customer/session data:
--
--   customer_session
--   session_profile
--   skin_image
--   questionnaire_response
--   session_skin_concern_detection
--   session_skin_concern
--   recommendation_run
--   recommendation_base
--   recommendation_active
--   recommendation_output
--
-- These are runtime transaction/workflow tables. Rows are created by the
-- application as a logged-in Shopify customer executes the recommendation
-- widget. The master/reference data above is the reusable RAG knowledge base.
--
-- The supplied questionnaire_user_answer.json, image_detection.json,
-- questionnaire_detection.json, skin_concerns.json, bases.json and
-- actives.json are runtime JSON contracts, not primary master-data seed files.
-- ============================================================================

-- ============================================================================
-- MVP POST-LOAD STRUCTURAL QA
-- ============================================================================
-- These queries do not modify data. They verify that the reference data needed
-- by the MVP workflow is present before the application is started.

-- A. The supplied base master contains five base types.
SELECT base_id, base_name
FROM base
ORDER BY base_id;

-- B. The supplied active master contains the 15 CelRevive actives.
SELECT active_id, active_name
FROM active
ORDER BY active_id;

-- C. The supplied concern master includes the selfie-only, shared and
-- questionnaire-only concern groups.
SELECT
    concern_id,
    concern_name,
    detectable_by_selfie,
    detectable_by_questionnaire
FROM skin_concern
ORDER BY concern_id;

-- D. Runtime workflow tables should remain empty after the primary master-data
-- load. This is informational only; existing runtime data must not be deleted.
SELECT
    'customer_session' AS table_name,
    COUNT(*) AS row_count
FROM customer_session
UNION ALL
SELECT 'session_profile', COUNT(*) FROM session_profile
UNION ALL
SELECT 'skin_image', COUNT(*) FROM skin_image
UNION ALL
SELECT 'questionnaire_response', COUNT(*) FROM questionnaire_response
UNION ALL
SELECT 'recommendation_run', COUNT(*) FROM recommendation_run
UNION ALL
SELECT 'recommendation_output', COUNT(*) FROM recommendation_output;

-- ============================================================================
-- MVP DATA-OWNERSHIP RULES
-- ============================================================================
-- 1. Shopify owns authentication, customer identity, cart, checkout and order
--    state. CelRevive stores only correlation identifiers in customer_session.
-- 2. questionnaire_response.response_json stores the submitted
--    questionnaire_user_answer.json payload verbatim.
-- 3. session_skin_concern_detection stores independent IMAGE and QUESTIONNAIRE
--    model outputs, including their explanation strings.
-- 4. session_skin_concern stores the Step-3 OR-combined result and concatenated
--    explanation text.
-- 5. recommendation_run stores Step-4 model/RAG provenance and input context.
-- 6. recommendation_base and recommendation_active store structured Step-4
--    recommendations and explanations.
-- 7. recommendation_output stores the final Step-5 JSON returned to the
--    Shopify widget.
-- 8. Runtime rows must never be inserted into the master/reference tables as a
--    substitute for the operational workflow tables.
-- ============================================================================
