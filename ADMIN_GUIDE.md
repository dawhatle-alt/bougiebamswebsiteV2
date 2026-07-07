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
- **Status**: `confirmed` = attending (paid, or a free event); `pending` = started paid checkout but payment never completed.
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
- Spots left decreases automatically as registrations are confirmed.

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

- **Edit** (pencil icon) opens the full form: name, description, price, category, in-stock, and **"Shipping included in price"** — turning that on shows a gold *Shipping included* badge next to the price on the product page and quick view (instead of the standard "Free shipping over $150" note).
- **Upload/replace product images** via the image button on each row.
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

## Announcement Bar

The message bar across the top of every page (e.g. "Complimentary shipping on all orders over $150").

- **Toggle** it on or off site-wide, edit the **message** (140 characters max), and check the live **preview** before saving.

## Chat Assistant

The floating chat bubble in the bottom-right corner of the site.

- **Toggle** it on or off for all visitors.
- Note: the assistant needs the `OPENAI_API_KEY` server setting to actually answer questions. If that isn't configured, keep the toggle **off** so visitors don't see a broken chat.

---

# Behind the Scenes (quick reference)

| What | Where it goes |
|---|---|
| New product order | Recorded in **Orders** + emailed to patsy@bougiebams.com |
| Event registration (paid) | Confirmed automatically once Square payment completes; guest gets a confirmation email |
| Event registration (free) | Confirmed instantly; guest gets a confirmation email |
| Event reminders | Emailed automatically per the event's reminder setting |
| Check-in report | On demand from Registrations (download or email) |
| Welcome popup signup | Adds a Subscriber + shows the BOUGIE15 code |
| Contact form | Emailed to hello@bougiebams.com |

**Emails** are sent via Resend from noreply@bougiebams.com and include the BougieBams logo. **Payments** are processed entirely by Square — card details never touch the website's servers.
