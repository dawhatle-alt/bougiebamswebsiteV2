import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema/index.ts";
import {
  eventsTable,
  productsTable,
  blogPostsTable,
} from "./schema/index.ts";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set.");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

async function seed() {
  console.log("🀄  Seeding BougieBams database...");

  const eventCount = await db.$count(eventsTable);
  if (eventCount === 0) {
    console.log("  Inserting events...");
    await db.insert(eventsTable).values([
      {
        title: "Bougie Bams Game Night — Rooftop Edition",
        description:
          "Join us for an elevated evening of Mahjong under the stars. Cocktails, curated playlists, and competitive tiles on Chicago's most stunning rooftop terrace. All skill levels welcome.",
        date: "2026-08-02",
        time: "7:00 PM",
        location: "The Rooftop at 1 Hotel Chicago, 225 N Wabash Ave, Chicago IL",
        priceCents: 6500,
        category: "In-Person",
        totalSpots: 24,
        spotsLeft: 24,
        host: "BougieBams",
        published: true,
        featured: true,
      },
      {
        title: "Mahjong 101 — Beginner Intensive",
        description:
          "New to Mahjong? This hands-on three-hour workshop covers the full American Mahjong ruleset, scoring basics, and etiquette. Leave ready to play your first real game with confidence.",
        date: "2026-08-16",
        time: "2:00 PM",
        location: "Bougie Bams Studio, 1440 W Taylor St, Suite 204, Chicago IL",
        priceCents: 4500,
        category: "Workshop",
        totalSpots: 16,
        spotsLeft: 16,
        host: "BougieBams",
        published: true,
        featured: false,
      },
      {
        title: "Mah-jongg & Mimosas Brunch",
        description:
          "Sunday Funday meets tile strategy. Bottomless mimosas, a gorgeous brunch spread, and round-robin Mahjong with a curated group of players. Reservations required.",
        date: "2026-08-24",
        time: "11:00 AM",
        location: "Aba Chicago, 302 N Green St, Chicago IL",
        priceCents: 8500,
        category: "In-Person",
        totalSpots: 20,
        spotsLeft: 20,
        host: "BougieBams",
        published: true,
        featured: true,
      },
      {
        title: "Virtual Game Night — Members Only",
        description:
          "Monthly online Mahjong session exclusively for BougieBams community members. Jump on Zoom, connect with players across the country, and enjoy a relaxed evening of tiles from your couch.",
        date: "2026-09-05",
        time: "8:00 PM",
        location: "Online (Zoom link sent after registration)",
        priceCents: null,
        category: "Virtual",
        totalSpots: 40,
        spotsLeft: 40,
        host: "BougieBams",
        published: true,
        featured: false,
      },
      {
        title: "Tiles & Wine — An Evening at the Gallery",
        description:
          "An intimate Mahjong evening inside a private art gallery in the West Loop. Curated natural wines, charcuterie, and four rounds of competitive play in a stunning setting.",
        date: "2026-09-19",
        time: "6:30 PM",
        location: "Spoke & Bird Gallery, 546 N Milwaukee Ave, Chicago IL",
        priceCents: 7500,
        category: "In-Person",
        totalSpots: 20,
        spotsLeft: 20,
        host: "BougieBams",
        published: true,
        featured: false,
      },
    ]);
    console.log("  ✓ Events seeded.");
  } else {
    console.log(`  Skipping events — ${eventCount} already exist.`);
  }

  const productCount = await db.$count(productsTable);
  if (productCount === 0) {
    console.log("  Inserting products...");
    await db.insert(productsTable).values([
      {
        id: "mahjong-set-classic",
        sku: "MJ-SET-001",
        name: "The Classic Ivory Mahjong Set",
        description:
          "166-piece American Mahjong set with hand-painted ivory-finish tiles, four matching racks, and a velvet-lined carry case. The timeless choice for serious players.",
        price: "149.00",
        category: "Mahjong Sets",
        inStock: true,
        featured: true,
      },
      {
        id: "mahjong-set-jade",
        sku: "MJ-SET-002",
        name: "Jade Luxury Mahjong Set",
        description:
          "Our most coveted set. Deep jade-green acrylic tiles with gold-stamped characters, premium weighted racks, and a hand-stitched leather travel case. A statement piece.",
        price: "249.00",
        category: "Mahjong Sets",
        inStock: true,
        featured: true,
      },
      {
        id: "tile-bag-blush",
        sku: "ACC-BAG-001",
        name: "Blush Velvet Tile Bag",
        description:
          "Luxurious blush velvet drawstring pouch designed to hold a full Mahjong tile set. Satin-lined interior keeps tiles scratch-free. Monogramming available.",
        price: "38.00",
        category: "Accessories",
        inStock: true,
        featured: false,
      },
      {
        id: "score-card-pack",
        sku: "ACC-CARD-001",
        name: "BougieBams Scorecard Pack (50 sheets)",
        description:
          "Custom-designed scorecards printed on thick card stock with a gold foil BougieBams logo. 50 sheets per pack. Makes scoring as beautiful as the game.",
        price: "14.00",
        category: "Accessories",
        inStock: true,
        featured: false,
      },
      {
        id: "candle-east-wind",
        sku: "HOME-CND-001",
        name: "East Wind Soy Candle",
        description:
          "Hand-poured soy candle with a custom Mahjong tile lid. Notes of jasmine, white tea, and sandalwood. Burns 55+ hours. The perfect game-night ambiance.",
        price: "42.00",
        category: "Home & Lifestyle",
        inStock: true,
        featured: true,
      },
      {
        id: "tote-bougiebams",
        sku: "APP-TOTE-001",
        name: "BougieBams Canvas Tote",
        description:
          "Heavy-weight natural canvas tote printed with the BougieBams logo. Roomy enough for your tile set, racks, and game-night extras. Interior zip pocket included.",
        price: "28.00",
        category: "Apparel & Totes",
        inStock: true,
        featured: false,
      },
    ]);
    console.log("  ✓ Products seeded.");
  } else {
    console.log(`  Skipping products — ${productCount} already exist.`);
  }

  const postCount = await db.$count(blogPostsTable);
  if (postCount === 0) {
    console.log("  Inserting blog posts...");
    await db.insert(blogPostsTable).values([
      {
        slug: "how-to-host-the-perfect-mahjong-night",
        title: "How to Host the Perfect Mahjong Night",
        excerpt:
          "From the playlist to the snack spread, here's everything you need to throw a game night your guests won't stop talking about.",
        content: `Hosting a Mahjong night is an art form. Done right, it's the kind of evening that gets added to the group chat canon — the night everyone references when they're trying to recreate a vibe.

Here's what we've learned from hosting hundreds of events at BougieBams.

**Set the mood before guests arrive.** Lighting is everything. Dim the overheads, add a few candles (our East Wind soy candle is designed exactly for this), and queue up a lo-fi jazz or bossa nova playlist. Guests should feel the shift in atmosphere the moment they walk in.

**Curate your snack situation.** Skip the chips. Go for a real spread: olives, fruit, a cheese board, and something warm if the evening calls for it. People play better when they're comfortable, not hangry.

**Brief the table.** Even experienced players appreciate a quick five-minute rules recap before the first hand. It levels the field and gets everyone into the game faster.

**Rotate tables if you have more than four players.** Round-robin keeps energy high and prevents anyone from sitting out too long.

The tiles are just the beginning. The magic is in how you hold the space.`,
        category: "Entertaining",
        author: "BougieBams",
        published: true,
        publishedAt: new Date("2026-05-15T10:00:00Z"),
      },
      {
        slug: "american-vs-chinese-mahjong-which-should-you-learn",
        title: "American vs. Chinese Mahjong: Which Should You Learn First?",
        excerpt:
          "Two versions, two very different experiences. We break down the key differences so you can choose the right game for your style.",
        content: `If you've been curious about Mahjong but confused by the different versions floating around, you're not alone. The two most commonly played styles in the U.S. are American Mahjong (also called American Mah-Jongg) and Chinese Mahjong (often Cantonese or Mandarin style). They share the same tile set but play very differently.

**American Mahjong** uses a standardized card — updated annually by the National Mah Jongg League — that dictates exactly which hands win. It's more structured, which makes it beginner-friendly in some ways, though the card can feel overwhelming at first. This is the version most commonly played in social clubs across the country.

**Chinese Mahjong** doesn't rely on a card. Winning hands are more flexible and strategic, and scoring can get complex. It rewards deep game knowledge and is arguably more skill-intensive.

**Our recommendation?** If you're learning with friends who already play, match their version. If you're starting from scratch in a social setting, American Mahjong is typically easier to get into a rhythm with. Once you've got that foundation, Chinese variants open up a whole new dimension.

At BougieBams, we teach both — but we always start with American.`,
        category: "How to Play",
        author: "BougieBams",
        published: true,
        publishedAt: new Date("2026-06-02T10:00:00Z"),
      },
      {
        slug: "5-mahjong-accessories-worth-investing-in",
        title: "5 Mahjong Accessories Worth Actually Investing In",
        excerpt:
          "Not all tile sets are created equal. Here are the accessories that separate a good game from a great one.",
        content: `Mahjong is one of those games where the experience is elevated — or diminished — by the quality of what's on the table. We've played with every configuration imaginable and here's what we've found actually matters.

**1. A weighted tile set.** The click of a heavy, well-balanced tile is half the joy. Lightweight sets feel hollow and move around the table. Invest once, play forever.

**2. Proper racks.** Racks that hold tiles at the right angle without wobbling are non-negotiable. Flimsy plastic racks kill the vibe.

**3. A dedicated carry case.** If you're transporting your set — to a friend's place, a game night, an event — a protective case saves your tiles and your sanity. Velvet-lined is the move.

**4. A scorecard set you actually like looking at.** Scorecards are on the table all night. A beautiful card makes the game feel intentional. Our BougieBams scorecards are printed on thick card stock with a gold foil logo for exactly this reason.

**5. Ambiance accessories.** A candle, a low playlist, a well-set table. These aren't accessories for the game — they're accessories for the experience, and the experience is what makes people want to play again.

Everything we carry in the BougieBams shop has been tested at our own events. Nothing makes the cut until we've played with it.`,
        category: "Gift Guides",
        author: "BougieBams",
        published: true,
        publishedAt: new Date("2026-06-18T10:00:00Z"),
      },
      {
        slug: "building-community-through-mahjong",
        title: "Building Real Community Through Mahjong",
        excerpt:
          "Why a 2,000-year-old game might be the most powerful tool for connection we have right now.",
        content: `There's a reason Mahjong has survived for over two thousand years. It isn't just a game — it's a technology for bringing people together.

Across cultures and generations, Mahjong tables have been the site of real conversation, real laughter, and real relationship-building. You can't play Mahjong distracted. The game demands presence. And presence, shared across a table with three other people, creates something that's increasingly rare: genuine connection.

At BougieBams, we started hosting events because we believed in this. We've watched strangers become regulars, regulars become friends, and friends become communities. We've seen the table become a reason to show up consistently — which is the foundation of any real community.

The game is the container. The community is what grows inside it.

If you've been looking for your people — come to a game night. Bring someone. The tiles will take care of the rest.`,
        category: "Behind the Brand",
        author: "BougieBams",
        published: true,
        publishedAt: new Date("2026-07-04T10:00:00Z"),
      },
    ]);
    console.log("  ✓ Blog posts seeded.");
  } else {
    console.log(`  Skipping blog posts — ${postCount} already exist.`);
  }

  await pool.end();
  console.log("🀄  Seeding complete.");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
