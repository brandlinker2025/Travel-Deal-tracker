# Cheap Ticket Finder

Static Bangladesh-friendly search page for **cheapticketfinder.site**. It does **not** sell tickets and it does **not** invent ৳ fares.

## What it does

Pick From / To, then dates on **one empty calendar** (nothing is pre-selected). Cheap Ticket Finder then shows:

- Bangladesh bank/card campaigns quoted from official pages
- Published airline promo codes to enter at checkout
- One official book button per airline with your dates (US-Bangla TTI FrontOffice, never a session GUID)
- One Google Flights cheapest search (`/travel/flights/search?tfs=...`, not empty `q=`)

There is no public fare API without secrets, so this page does not print ৳ on the calendar. Live price is on the provider after you tap through.

Also linked: Google Hotels, Booking.com, GoZayaan dated `flight/list`, official holiday packages.

ShareTrip is not linked: `sharetrip.net/flight/search` returns 404.

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
