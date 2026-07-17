# BougieBams Admin Panel Guide

A practical overview of every section of the admin panel at **bougiebams.com/admin** — what it does, how to use it, and what happens behind the scenes.

---

## Signing In & Out

- Go to **bougiebams.com/admin** and enter the admin password (the `ADMIN_TOKEN` configured on the server).
- Your session persists until you sign out or it expires. If a page suddenly kicks you back to the login screen, just sign in again.
- **Sign out** with the logout button in the sidebar.

> Changes made in the admin panel take effect on the live site **immediately** — no redeploy needed.

---

# Overview

## Dashboard

Your at-a-glance business pulse. Everything on it is clickable and jumps to the relevant section.

- **Revenue cards** — Total Revenue (all time), This Month, and This Week, with order counts. Figures come from completed Square orders and sync directly from Square, so they stay accurate.
- **Needs attention** *(only appears when something's off)* — pending registrations (checkout started but never paid), out-of-stock products still visible in the shop, sold-out events, and published events with zero registrations.
- **Upcoming Events** — every future event with a fill bar ("14/20 spots filled · $560 collected"). Sold-out events show in amber; unpublished ones are marked *draft*.
- **Recent Activity** — the latest orders, event registrations, and email subscribers in one feed, newest first.
- **Bottom row** — content counts (Subscribers, Events, Products, Blog Posts).

---

# Community

## Subscribers

Everyone who joined the mailing list (mostly via the 15%-off welcome popup).

- Table shows email, signup source, discount code (— means none was stored), and date joined.
- **Export CSV** downloads the full list — useful for importing into an email tool.

## Registrations

Every event signup, across all events.

- **Sort any column** by clicking its header (Event, Name, Email, Status, Paid, Date).
- **Status**: `confirmed` = attending (paid, or a free event); `pending` = started paid checkout but payment never completed on that attempt. A **Verify** link appears next to pending rows — it checks Square for a completed payment on that registration's checkout and confirms it on the spot if the money is there.
- **Paid column**: reflects payments made through the website's checkout. If someone paid another way (a Square invoice, a manual payment link, at the door) — or registered while the event was briefly priced $0 — they'll show *Free* even though Square has their money. **Click the Paid/Free badge to fix it**: clicking *Free* marks them paid; clicking *Paid* un-marks it, but only for manual marks — registrations with a real Square checkout payment can't be un-marked.
- **Add Registration** (top bar): manually add a guest who paid outside the website — a Square invoice, a manual payment link, or at the door — and so never appears in the list on their own. Pick the event, enter their name and email, optionally tick *Mark as paid*. The registration takes a spot on the event; no confirmation email is sent.
- **Delete a registration** with the trash icon. Deleting a *confirmed* registration automatically frees up one spot on that event (capped at the event's capacity). Pending registrations never held a spot, so deleting them changes nothing.
- **Check-in report** (top bar): pick an event from the dropdown, then:
  - **Download CSV** — an alphabetical participant list with a blank *Checked In* column, made for confirming guests at the door (print it or open on a phone).
  - **Email Report** — sends the same list (in the email body **and** as a CSV attachment) to any address; defaults to patsy@bougiebams.com.
  - Picking an event also filters the table below, and **Export CSV** respects that filter.

---

# Content

## Blog

Create, edit, and delete blog posts (title, summary, body, image). Each post has a **published** toggle — drafts stay hidden from the public blog until published.

## Events

Create and manage the events shown on the site.

- **Fields**: title, description, **date** (use the format `2026-07-14` — year-month-day — so dates display correctly everywhere), time, location, category, host, price, total spots / spots left, and a **cover image** upload.
- **Reminder emails**: choose when registered guests get an automatic reminder (1 hour to 1 week before the event), or no reminder.
- **Published** controls whether the event appears on the public Events page.
- **Archive** (box icon on each row) tidies up finished events: an archived event disappears from the public Events page (upcoming *and* past lists), stops sending reminders, and is hidden from this list by default — tick **Show archived** to see and unarchive them. Its registrations, orders, and Community Moments photo album are all kept.
- The **Spots** column in the events list shows how full the event is — e.g. `16/20 filled`, with the remaining count underneath. Spots left decreases automatically as registrations are confirmed.
- When editing an event, **Spots Left** is the remaining availability (not the registration count). If you raise Total Spots on an existing event, raise Spots Left by the same amount.
- **External Registration Link** (optional): paste a URL (e.g. an Eventbrite page) and the event's Register button will send guests there instead of the built-in registration and payment flow. Guests don't need to sign in, and the built-in checkout is disabled for that event. Note that spots and the registration list are *not* tracked for external registrations — manage attendance on the external site. Clear the field to switch back to built-in registration.
- **Collect registration details** (toggle): when on, the registration form also asks three standard questions — *sit with someone you know?* (names), *play with blanks and 10 jokers?* (Yes / No / Open to either), and *skill level* (learn / still learning / intermediate / advanced). Answers appear under each guest's name in **Registrations** and in its CSV export.
- **Comp Code(s)**: for paid events, enter one or more codes (comma-separated, not case-sensitive, e.g. `HOSTESS2026, VIP-GUEST`). The registration form then shows an optional **Coupon Code** field; a guest entering a valid code registers **free** (confirmed instantly, no Square checkout) and the code used is recorded on their registration. A wrong code shows an error rather than charging them. Leave empty for no comp codes.
- **Use Limit** (next to Comp Codes): caps how many free registrations *each* code allows for this event — e.g. limit 5 with two codes means each code works 5 times. Once a code hits its limit, further guests see "already been used the maximum number of times." Removing a registration that used a comp code gives that redemption back. Empty = unlimited.
- **Display Order**: controls the event's position on the public Events page — 1 shows first, 2 second, and so on. Events without a number appear after all numbered ones, sorted by date. Leave empty for automatic date order.

## Education

Video lessons for the Learn page. Each lesson has a title, category, a YouTube/Vimeo URL, and a description.

---

# Shop

## Orders

Every completed payment, synced from Square — both **product purchases** and **event registration payments**, each tagged with its type.

- **Filter tabs**: All / Products / Events.
- **Summary cards**: Product Orders total, Event Payments total, the overall **Running Total**, and — when filtering or searching — a filtered total.
- **Table**: date, type badge, customer (name/email/phone), full shipping address (products only), items, and amount — with the **discount code and amount saved** shown under the total when one was used.
- **Search** filters across everything: name, email, address, items, amount, date, type, order ID.
- **Export CSV** downloads whatever the current search shows.
- Opening this page (or hitting Refresh) pulls the latest orders straight from Square, so it's always current even if a notification was missed.
- **Behind the scenes**: each new order also triggers an email to **patsy@bougiebams.com** with the items, total, customer contact info, and ship-to address. Square collects the shipping address during checkout.

## Products

The shop catalog. Each row has three quick toggles:

| Toggle | What it does |
|---|---|
| **In Stock** | Off = shows "Sold Out" and can't be added to the cart |
| **Visible** | Off = product is hidden from the shop entirely |
| **Build Set** | Off = product doesn't appear as an option in Build Your Set |

- **Edit** (pencil icon) opens the full form: name, description, price, category, in-stock, and **"Shipping included in price"** — turning that on shows a gold *Shipping included* badge next to the price on the product page and quick view.
- **Detail Page Tabs** (in the edit form): each product has three optional tabs on its page — *Product Details*, *Care Instructions*, and *Shipping & Returns*. Write your own content for each (line breaks are kept), and use the small toggle to hide a tab. A tab that is switched off **or left empty** doesn't appear; if all three are empty, the whole tab section is hidden. New products start with all three empty.
- **Photo Gallery** (gallery icon on each row): each product can have **multiple photos**. Click the icon to expand the gallery panel — add photos, remove them, and arrange the order with the arrows. **The first photo is the main image** used on the shop grid, Facebook catalog, and link previews; the rest appear as thumbnails on the product page. Shoppers can click any product photo to zoom into a full-screen view.
- The small image square on each row also adds a photo to the gallery (quick path for the first photo).
- Deleting a product removes it permanently.
- **Categories manage themselves**: a category appears in the shop menu and shop-page filters only while it has at least one *visible* product. Hide or delete everything in a category and its section disappears everywhere; add a product to a new category and the section shows up automatically.

## Discount Codes

Create and manage promo codes customers enter in the cart.

- Each code has a **percent off**, what it **applies to** (products, events, or both), an optional description, and an **active** toggle to turn it off without deleting it.
- **BOUGIE15** is the welcome-popup code (15% off). It creates itself automatically the first time someone uses it, and then appears here where you can manage it like any other code.
- **Single-use per email**: when a customer applies a code they must enter the email they claimed it with. Once they complete a *paid* order with that code, the same code + same email combination is blocked from reuse. Abandoned checkouts don't burn the code, and a different email can still use a shared code like BOUGIE15.
- The discount appears as a line item on the Square payment page and the customer's receipt.
- **Code Usage panel** (below the codes table): one row per code + email pair, with a status badge — *Used [date]* means a paid order consumed the code (this is what blocks reuse); *Checkout started* means payment was never completed (doesn't block anything). Use the **search box** to find an email, and the **reset button (↺)** to remove a redemption so that email can use the code again — handy for test orders or helping a customer who was blocked by mistake.

## Favorites

Curated third-party product recommendations for the Favorites page — each with a name, category, description, image, and **affiliate link**.

- **Add Product** (top-right button) opens the form for a new item: name, category, description, affiliate URL, and an image upload. New items appear on the public Favorites page immediately.
- Two tabs: **Catalog Products** — the built-in list, where you can upload/replace each item's photo; **Custom Products** — everything you've added yourself, with edit and delete on each card.

---

# Site

## Homepage Images

The rotating hero photos on the homepage. Upload new images and **drag to reorder**; the homepage follows this order.

## Curated Collections

The three (or more) large linked cards in the homepage "Curated Collections" section.

- Each card has an **image**, a **title**, and a **link** (e.g. `/shop?category=Complete+Sets`).
- Add, remove, and reorder cards (↑/↓), then **Save** — changes appear on the homepage immediately.
- If you remove all cards, the homepage falls back to its built-in default set, so the section is never empty.

## Event Gallery

Photos for the "From the Table" section on the Events page. Upload multiple photos at once, click a caption to edit it, and **drag to reorder**.

Photos can be **assigned to an event** to build that event's album on the Tile Wall (the row of mahjong-tile album covers above the photo grid):

- **Assign on upload:** pick an event in the "Uploads → …" dropdown before clicking Upload Photos — every photo in that batch is filed under that event. Leave it on "no event (general)" for photos that should only appear in All Moments.
- **Assign later:** each photo card has its own event dropdown; change it any time.
- **Choose the cover shot:** hover a photo and click the **star** in its top-right corner. The starred photo becomes the album's tile face and gets a gold COVER badge. Starring a different photo moves the cover — one cover per event. If you never star one, the first photo in the album is used.
- **Filter:** use the "Show:" dropdown to see one event's photos (or the unassigned ones) while you work.

On the Events page, each event with photos becomes a flip tile: the cover photo on the front, event details on the back, and clicking it filters the grid to that night. Each open album shows a shareable link (e.g. `bougiebams.com/events?moments=12`) — put it in a post-event email so guests can jump straight to their night's photos. Recent past events with no photos yet show as a "Photos coming soon" bam tile for 45 days.

## Featured In

The "As Featured In" strip on the homepage (the row of publication names below the hero).

- **Toggle** it on or off — when off, the section disappears from the homepage entirely.
- **Edit the list**: add, remove, rename, and reorder (↑/↓) publication names, then **Save**. Up to 12 names, and the live **preview** shows how the strip will look.
- If the list is empty, the section stays hidden even when the toggle is on.

## Announcement Bar

The message bar across the top of every page (e.g. "Complimentary shipping on all orders over $150").

- **Toggle** it on or off site-wide, edit the **message** (140 characters max), and check the live **preview** before saving.

## Welcome Popup

The 15%-off offer shown to first-time visitors shortly after they arrive.

- **Toggle** it on or off site-wide, and edit every line of the wording: the small top line, the headline (press Enter to split it across two lines), the message, the button text, and the "no thanks" link.
- A live preview shows your changes in the popup's real colors before you save.
- Visitors who have dismissed or claimed the offer won't see it again on the same device.
- **Discount Code**: the code the signup issues (default `BOUGIE15`) is editable here. Renaming it automatically creates the new code under **Discount Codes** (seeded at 15% if new) — set the new code's percentage there so it matches the popup's wording, and deactivate the old code if you don't want it honored anymore.

## Chat Assistant

The floating chat bubble in the bottom-right corner of the site.

- **Toggle** it on or off for all visitors.
- Note: the assistant needs the `OPENAI_API_KEY` server setting to actually answer questions. If that isn't configured, keep the toggle **off** so visitors don't see a broken chat.

## Build Your Set (under Shop)

The custom set-building experience where shoppers hand-pick pieces into a bundled set.

- **Toggle** it on or off site-wide. When off: the homepage "Build Your Own Set" teaser and the shop-menu "Build Your Set" card are hidden, and anyone visiting the page directly sees a "coming soon" message with a link to the shop.
- Use this while inventory or marketing collateral isn't ready — flip it back on when you're ready for folks to curate sets.
- Which products appear inside Build Your Set is controlled separately, per product, via the **Build Set** toggle in Products.

---

# Behind the Scenes (quick reference)

| What | Where it goes |
|---|---|
| New product order | Recorded in **Orders** + emailed to patsy@bougiebams.com |
| Event registration (paid) | Confirmed automatically once Square payment completes; guest gets a confirmation email |
| Event registration (free) | Confirmed instantly; guest gets a confirmation email |
| Event reminders | Emailed automatically per the event's reminder setting |
| Registration reconciliation | Paid Square orders automatically repair the registration list (stuck-pending confirmed, "Free" mislabels stamped, missing rows restored with a "Restored from Square order …" note) — on every payment webhook, whenever the admin dashboard loads, and once daily |
| Check-in report | On demand from Registrations (download or email) |
| Welcome popup signup | Adds a Subscriber + shows the BOUGIE15 code |
| Contact form | Emailed to hello@bougiebams.com |
| Facebook shop catalog | Auto-generated feed at `bougiebams.com/api/facebook/catalog.csv` — published products plus upcoming paid events, refetched by Meta on its schedule. Edit products/events here and the Facebook shop follows; no manual updates in Commerce Manager. |

**Emails** are sent via Resend from noreply@bougiebams.com and include the BougieBams logo. **Payments** are processed entirely by Square — card details never touch the website's servers.
