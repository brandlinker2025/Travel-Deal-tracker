# Cheap Ticket Finder

Static Bangladesh-friendly search page for **cheapticketfinder.site**. It does **not** sell tickets and it does **not** invent ৳ fares.

## What it does

Pick From / To, then dates on **one empty calendar** (nothing is pre-selected). Cheap Ticket Finder then shows **one cheap ticket path**:

- Google Flights cheapest `tfs` search
- GoZayaan dated search, with SCB / City Amex **beside that OTA row** when they apply at GoZayaan checkout (SCB up to 10% international / 7% domestic; City Amex up to 18% international). BRAC is omitted unless that checkout publishes a BRAC offer.
- One official search/book row per airline. A published checkout code sits **beside that airline** (AIRASTRA15: 15% at AIR ASTRA). If the airline has no published code, the row is only the book button — we do not invent USBA15.
- EBL Stellar codes only beside ShareTrip home (not `/flight/search`, which 404s)

There is no public fare API without secrets, so this page does not print a made-up ৳. We show the official **up to X%**. If a real fare is ever known, fare after that percent is labeled an estimate from official %.

There is **one place**: beside each airline/OTA search/book row. There is no separate BANK / CARD CAMPAIGNS grid.

ShareTrip dated `/flight/search` is not linked (404). EBL Stellar codes use ShareTrip home only.

## What this is not

- No estimated fares
- No extra month calendar, nearby ±7 strip, or Google/Skyscanner/Kayak triplet
- No card-discount or promo-voucher math
- No airline scraping

## Live

- Production: https://cheap-ticket-finder.vercel.app
- Custom domain: https://cheapticketfinder.site (attach this Vercel project)

## Tech

Static `index.html` on Vercel. Dated URLs are built in `js/booking-links.js`.
