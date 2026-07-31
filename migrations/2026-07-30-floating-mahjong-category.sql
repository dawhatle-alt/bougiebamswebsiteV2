-- New "Floating Mahjong" shop category for the pool line: the two Boujee
-- Besties floating boards (previously Mats) and the five LiteMahj floating
-- tile sets (previously Tiles & Accessories).
--
-- The category name must match SHOP_CATEGORIES in
-- artifacts/bougiebams/src/data/categories.ts exactly, or the products won't
-- group under the new filter.

UPDATE products
SET category = 'Floating Mahjong', updated_at = now()
WHERE name ILIKE '%floating%';

-- Expect 7 rows. Verify:
-- SELECT id, name, category FROM products WHERE category = 'Floating Mahjong' ORDER BY name;
