# Cheap Ticket Finder

Static Bangladesh-friendly search page for **cheapticketfinder.site**. It does **not** sell tickets and it does **not** invent ৳ fares.

## What it does

Pick From / To, then dates on **one empty calendar** (nothing is pre-selected). Cheap Ticket Finder then shows **one cheap ticket path**:

- Google Flights cheapest `tfs` search
- GoZayaan dated search with official card percents on that OTA (SCB up to 10% international / 7% domestic; City Amex up to 18% international)
- One official book button per airline, with checkout codes only where they actually apply (AIRASTRA15: 15% at AIR ASTRA)
- EBL Stellar codes only on ShareTrip home (not `/flight/search`, which 404s)

There is no public fare API without secrets, so this page does not print a made-up ৳. We show the official **up to X%**. If a real fare is ever known, fare after that percent is labeled an estimate from official %.

Bank/card percents and checkout codes sit **on the cheap-path book button** for the provider they actually book on. There is no separate BANK / CARD CAMPAIGNS grid.

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
