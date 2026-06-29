import pg from "pg";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set.");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function count(table) {
  const { rows } = await pool.query(`SELECT COUNT(*) AS n FROM ${table}`);
  return parseInt(rows[0].n, 10);
}

async function seed() {
  console.log("🀄  Seeding BougieBams database...");

  const eventCount = await count("events");
  if (eventCount === 0) {
    console.log("  Inserting events...");
    await pool.query(`
      INSERT INTO events
        (title, description, date, time, location, price_cents, category,
         total_spots, spots_left, host, published, featured)
      VALUES
        ('Bougie Bams Game Night — Rooftop Edition',
         'Join us for an elevated evening of Mahjong under the stars. Cocktails, curated playlists, and competitive tiles on Chicago''s most stunning rooftop terrace. All skill levels welcome.',
         '2026-08-02', '7:00 PM',
         'The Rooftop at 1 Hotel Chicago, 225 N Wabash Ave, Chicago IL',
         6500, 'In-Person', 24, 24, 'BougieBams', true, true),

        ('Mahjong 101 — Beginner Intensive',
         'New to Mahjong? This hands-on three-hour workshop covers the full American Mahjong ruleset, scoring basics, and etiquette. Leave ready to play your first real game with confidence.',
         '2026-08-16', '2:00 PM',
         'Bougie Bams Studio, 1440 W Taylor St, Suite 204, Chicago IL',
         4500, 'Workshop', 16, 16, 'BougieBams', true, false),

        ('Mah-jongg & Mimosas Brunch',
         'Sunday Funday meets tile strategy. Bottomless mimosas, a gorgeous brunch spread, and round-robin Mahjong with a curated group of players. Reservations required.',
         '2026-08-24', '11:00 AM',
         'Aba Chicago, 302 N Green St, Chicago IL',
         8500, 'In-Person', 20, 20, 'BougieBams', true, true),

        ('Virtual Game Night — Members Only',
         'Monthly online Mahjong session exclusively for BougieBams community members. Jump on Zoom, connect with players across the country, and enjoy a relaxed evening of tiles from your couch.',
         '2026-09-05', '8:00 PM',
         'Online (Zoom link sent after registration)',
         NULL, 'Virtual', 40, 40, 'BougieBams', true, false),

        ('Tiles & Wine — An Evening at the Gallery',
         'An intimate Mahjong evening inside a private art gallery in the West Loop. Curated natural wines, charcuterie, and four rounds of competitive play in a stunning setting.',
         '2026-09-19', '6:30 PM',
         'Spoke & Bird Gallery, 546 N Milwaukee Ave, Chicago IL',
         7500, 'In-Person', 20, 20, 'BougieBams', true, false)
    `);
    console.log("  ✓ Events seeded.");
  } else {
    console.log(`  Skipping events — ${eventCount} already exist.`);
  }

  console.log("  Upserting real BougieBams products...");
  await pool.query(`
    DELETE FROM products
    WHERE id IN (
      'mahjong-set-classic','mahjong-set-jade','tile-bag-blush',
      'score-card-pack','candle-east-wind','tote-bougiebams'
    )
  `);
  await pool.query(`
    INSERT INTO products
      (id, sku, name, description, price, category, in_stock, featured)
    VALUES
      ('tiles_debutante', 'tiles_debutante', 'The Debutante Set',
       'Our signature Mahjong set — beautifully crafted tiles in a velvet-lined case. Perfect for the modern player who refuses to compromise on style.',
       325.00, 'Tiles', true, true),

      ('tiles_ohmyrummi', 'tiles_ohmyrummi', 'Oh My Rummikub',
       'A Rummikub set reimagined with BougieBams flair. Classic game, elevated aesthetic.',
       89.00, 'Tiles', true, false),

      ('tiles_travelsets', 'tiles_travelsets', 'Travel Mini Set',
       'A compact Mahjong set for the player on the go. Full game, half the footprint.',
       195.00, 'Tiles', true, false),

      ('tiles_playingcards', 'tiles_playingcards', 'Mahjong Playing Cards',
       'A deck of standard playing cards featuring iconic Mahjong tile artwork.',
       28.00, 'Tiles', true, false),

      ('mats_rackpushers', 'mats_rackpushers', 'The Rack Pusher Mat',
       'A luxurious game mat that keeps your tiles in place and your table protected. Available in four signature colorways.',
       145.00, 'Mats', true, true),

      ('mats_tablecloths', 'mats_tablecloths', 'Game Night Tablecloth',
       'A beautiful tablecloth designed for game night. Spill-resistant and machine washable.',
       75.00, 'Mats', true, false),

      ('mats_aquajong', 'mats_aquajong', 'AquaJong Pool Float Mat',
       'Waterproof game mat for poolside play. Summer just got more interesting.',
       110.00, 'Mats', true, false),

      ('storage_acrylicboxes', 'storage_acrylicboxes', 'Acrylic Tile Display Box',
       'Keep your tiles on display and dust-free in this sleek acrylic box. Doubles as a conversation piece.',
       58.00, 'Storage', true, false),

      ('storage_zipperedbags', 'storage_zipperedbags', 'Zippered Tile Bag',
       'A chic zippered bag for travel. Holds a full set of tiles, racks, and dice.',
       32.00, 'Storage', true, false),

      ('acc_book', 'acc_book', 'The BougieBams Card Book',
       'The official National Mah Jongg League card, curated and shipped in a protective sleeve.',
       42.00, 'Accessories', true, true),

      ('acc_napkins', 'acc_napkins', 'Game Night Cocktail Napkins',
       'Elegant cocktail napkins with Mahjong motifs. A thoughtful gift for any player.',
       18.00, 'Accessories', true, false),

      ('acc_babies', 'acc_babies', 'Tile Babies Keychains',
       'Adorable miniature tile keychains — collect all the suits. A perfect stocking stuffer.',
       14.00, 'Accessories', true, false)

    ON CONFLICT (id) DO UPDATE SET
      sku         = EXCLUDED.sku,
      name        = EXCLUDED.name,
      description = EXCLUDED.description,
      price       = EXCLUDED.price,
      category    = EXCLUDED.category,
      in_stock    = EXCLUDED.in_stock,
      featured    = EXCLUDED.featured,
      updated_at  = NOW()
  `);
  console.log("  ✓ Products seeded (12 BougieBams products).");

  const postCount = await count("blog_posts");
  if (postCount === 0) {
    console.log("  Inserting blog posts...");
    await pool.query(`
      INSERT INTO blog_posts
        (slug, title, excerpt, content, category, author, published, published_at)
      VALUES
        ('how-to-host-the-perfect-mahjong-night',
         'How to Host the Perfect Mahjong Night',
         'From the playlist to the snack spread, here''s everything you need to throw a game night your guests won''t stop talking about.',
         'Hosting a Mahjong night is an art form. Done right, it''s the kind of evening that gets added to the group chat canon. Set the mood before guests arrive — lighting is everything. Dim the overheads, add a few candles, and queue a lo-fi jazz playlist. Curate your snack situation: skip the chips, go for olives, fruit, a cheese board. Brief the table with a quick five-minute rules recap. Rotate tables if you have more than four players. The tiles are just the beginning. The magic is in how you hold the space.',
         'Entertaining', 'BougieBams', true, '2026-05-15 10:00:00+00'),

        ('american-vs-chinese-mahjong-which-should-you-learn',
         'American vs. Chinese Mahjong: Which Should You Learn First?',
         'Two versions, two very different experiences. We break down the key differences so you can choose the right game for your style.',
         'American Mahjong uses a standardized card updated annually by the National Mah Jongg League that dictates exactly which hands win. It''s more structured and beginner-friendly. Chinese Mahjong doesn''t rely on a card — winning hands are more flexible and strategic, rewarding deep game knowledge. Our recommendation: if you''re starting from scratch in a social setting, American Mahjong is typically easier to get into a rhythm with. At BougieBams, we teach both — but always start with American.',
         'How to Play', 'BougieBams', true, '2026-06-02 10:00:00+00'),

        ('5-mahjong-accessories-worth-investing-in',
         '5 Mahjong Accessories Worth Actually Investing In',
         'Not all tile sets are created equal. Here are the accessories that separate a good game from a great one.',
         'Mahjong is one of those games where the experience is elevated by the quality of what''s on the table. What actually matters: 1) A weighted tile set — the click of a heavy, well-balanced tile is half the joy. 2) Proper racks that hold tiles at the right angle without wobbling. 3) A dedicated carry case — velvet-lined is the move. 4) A scorecard set you actually like looking at, since scorecards are on the table all night. 5) Ambiance accessories — a candle, a low playlist, a well-set table. Everything we carry in the BougieBams shop has been tested at our own events.',
         'Gift Guides', 'BougieBams', true, '2026-06-18 10:00:00+00'),

        ('building-community-through-mahjong',
         'Building Real Community Through Mahjong',
         'Why a 2,000-year-old game might be the most powerful tool for connection we have right now.',
         'There''s a reason Mahjong has survived for over two thousand years. It isn''t just a game — it''s a technology for bringing people together. Across cultures and generations, Mahjong tables have been the site of real conversation, real laughter, and real relationship-building. You can''t play Mahjong distracted. The game demands presence. And presence, shared across a table with three other people, creates something increasingly rare: genuine connection. At BougieBams, we''ve watched strangers become regulars, regulars become friends, and friends become communities. The game is the container. The community is what grows inside it.',
         'Behind the Brand', 'BougieBams', true, '2026-07-04 10:00:00+00')
    `);
    console.log("  ✓ Blog posts seeded.");
  } else {
    console.log(`  Migrating blog post categories to match site taxonomy...`);
    await pool.query(`
      UPDATE blog_posts SET category = 'How to Play'
        WHERE slug = 'american-vs-chinese-mahjong-which-should-you-learn'
          AND category = 'Education';
      UPDATE blog_posts SET category = 'Gift Guides'
        WHERE slug = '5-mahjong-accessories-worth-investing-in'
          AND category = 'Shopping';
      UPDATE blog_posts SET category = 'Behind the Brand'
        WHERE slug = 'building-community-through-mahjong'
          AND category = 'Community';
    `);
    console.log(`  ✓ Blog post categories updated (${postCount} posts exist).`);
  }

  await pool.end();
  console.log("🀄  Seeding complete.");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
