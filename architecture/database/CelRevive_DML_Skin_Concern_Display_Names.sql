-- ---------------------------------------------------------------------------
-- Skin concern display-name overrides
-- ---------------------------------------------------------------------------
-- These values are the customer-facing labels that should be returned by the
-- backend when skin concerns are sent to the frontend.
--
-- Run after the base skin_concern seed has been loaded.
-- ---------------------------------------------------------------------------

SET search_path TO celrevive, public;

UPDATE skin_concern
SET skin_concern_display_name = CASE concern_id
    WHEN 'SC0001' THEN concern_name
    WHEN 'SC0002' THEN concern_name
    WHEN 'SC0003' THEN 'Weakened Skin Barrier'
    WHEN 'SC0004' THEN concern_name
    WHEN 'SC0005' THEN concern_name
    WHEN 'SC0006' THEN 'Flushing & Visible Blood Vessels'
    WHEN 'SC0007' THEN concern_name
    WHEN 'SC0008' THEN concern_name
    WHEN 'SC0009' THEN concern_name
    WHEN 'SC0010' THEN 'Oily Skin'
    WHEN 'SC0011' THEN concern_name
    WHEN 'SC0012' THEN concern_name
    WHEN 'SC0013' THEN 'Dark Spots & Discoloration'
    WHEN 'SC0014' THEN 'Stubborn Pigmentation Patches'
    WHEN 'SC0015' THEN 'Dullness & Lack of Glow'
    WHEN 'SC0016' THEN concern_name
    WHEN 'SC0017' THEN 'Sun-Related Aging Signs'
    WHEN 'SC0018' THEN 'Risk Skin Inflammation & Irritation'
    WHEN 'SC0019' THEN 'Overall Skin Aging'
    WHEN 'SC1001' THEN concern_name
    WHEN 'SC1002' THEN 'Blackheads'
    WHEN 'SC1003' THEN concern_name
    WHEN 'SC1004' THEN concern_name
    WHEN 'SC1005' THEN concern_name
    WHEN 'SC1006' THEN concern_name
    WHEN 'SC1007' THEN concern_name
    WHEN 'SC1008' THEN concern_name
    WHEN 'SC1009' THEN 'Scars & Marks'
    WHEN 'SC2001' THEN 'Itching & Irritation'
    WHEN 'SC2002' THEN 'Environmental Stress & Damage'
    WHEN 'SC2003' THEN 'Screen & Blue Light Exposure'
    WHEN 'SC2004' THEN 'Skin Microbiome Imbalance'
    ELSE skin_concern_display_name
END
WHERE concern_id IN (
    'SC0001','SC0002','SC0003','SC0004','SC0005','SC0006','SC0007','SC0008','SC0009','SC0010',
    'SC0011','SC0012','SC0013','SC0014','SC0015','SC0016','SC0017','SC0018','SC0019','SC1001',
    'SC1002','SC1003','SC1004','SC1005','SC1006','SC1007','SC1008','SC1009','SC2001','SC2002',
    'SC2003','SC2004'
);
