# Cheapest Ticket Finder

A static, Bangladesh-friendly search page. It does **not** sell tickets and it does **not** invent fares.

Search From / To / dates (Dhaka `DAC` is the default origin). Results are dated deep-links to:

- Google Flights `/travel/flights/search?tfs=...` (not the empty `q=` landing page), Skyscanner `sortby=cheapest`, Kayak `sort=price_a`
- A date-wise cheapest path: ±7 days and a month calendar of provider deep-links (no invented ৳ amounts)
- Official airline booking pages for the route
- Official discount intel: BD bank/card campaign pages (SCB, City Amex, EBL, BRAC, bKash) quoted from the official URL, plus published airline/OTA promo codes to enter at checkout. We never subtract a guessed ৳ amount.
- Google Hotels and Booking.com
- Official holiday packages
- GoZayaan dated `flight/list` search and a short list of real free tools

Click a provider to open that site with the same dates and buy there. The live price is always on the provider.

Live site: https://global-travel-tracker.netlify.app

ShareTrip is not linked: `sharetrip.net/flight/search` returns 404 and there is no working dated search URL.

## What this is not

- No estimated fares
- No card-discount or promo-voucher math
- No airline scraping

## Tech

Static `index.html` on Netlify. Dated URLs are built in `js/booking-links.js`.
