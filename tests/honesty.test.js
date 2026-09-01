const assert = require("assert");
const fs = require("fs");
const path = require("path");

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const links = fs.readFileSync(path.join(__dirname, "..", "js", "booking-links.js"), "utf8");

const forbidden = [
    "Promo Code & Voucher Simulator",
    "Card Discount Scenario",
    "FLYGLOBAL15",
    "AGODAPROMO",
    "SKYDEAL",
    "Estimated Payable",
    "Reference Fare Estimate",
    "Monthly Fare + Weather Calendar",
    "applyQuickPromo",
    "appliedPromoDiscount",
    "cardPercent",
    "formatCurrency",
    "Calculating estimated rates",
    "Top 3 Estimated Flight Options",
    "planning estimates, not live quotes",
    "sharetrip.net/flight/search",
    "Open Flight Search"
];

forbidden.forEach((needle) => {
    assert.ok(!html.includes(needle), `index.html still contains fake/noisy text: ${needle}`);
});

const required = [
    "We do not sell tickets",
    "Google Flights",
    "Skyscanner",
    "Kayak",
    "Google Hotels",
    "Booking.com",
    "Hazrat Shahjalal Int. (DAC)",
    "js/booking-links.js",
    "final price is on the provider",
    "Cheap fares by date",
];

required.forEach((needle) => {
    assert.ok(html.includes(needle), `index.html is missing required copy: ${needle}`);
});

assert.ok(!links.includes("discount_percent"), "booking-links.js must not invent discount math");
assert.ok(!links.includes("base_price"), "booking-links.js must not invent fares");
assert.ok(!links.includes("travel/flights?q="), "Google Flights must not use the natural-language q= URL");
assert.ok(links.includes("/travel/flights/search?tfs="), "Google Flights must use structured tfs search URLs");
assert.ok(links.includes("fo-usba.ttinteractive.com/Zenith/FrontOffice/usbangla"), "US-Bangla must use the stable TTI FrontOffice booking engine");
assert.ok(!links.includes("FrontOffice/(S("), "US-Bangla must not hard-code a session GUID FrontOffice path");
assert.ok(!links.includes("usbair.com/search"), "stale usbair.com/search schema.org URL 404s");
assert.ok(links.includes("OriginAirportCode"), "TTI booking links must include OriginAirportCode");
assert.ok(links.includes("secure.flynovoair.com/bookings/flight_selection.aspx"), "Novoair must use the official booking page");
assert.ok(links.includes("fo-airastra.ttinteractive.com/Zenith/FrontOffice/Airastra"), "AIR ASTRA must use the stable TTI FrontOffice booking engine");
assert.ok(links.includes("booking.flyscoot.com/Book/Flight"), "Scoot must use the official dated Book/Flight URL");
assert.ok(links.includes("Book these Google Flights results"), "Google Flights CTA must open bookable tfs results");
assert.ok(links.includes("sort=price_a"), "Kayak must sort by price");
assert.ok(!links.includes("sharetrip.net/flight/search"), "ShareTrip dead search URLs must be removed");
assert.ok(links.includes("gozayaan.com/flight/list"), "GoZayaan must use dated flight/list search");
assert.ok(html.includes("Official packages"), "index.html should keep official packages");
assert.ok(html.includes("flexibleMonthGrid"), "index.html should render a date-wise cheapest calendar");
assert.ok(html.includes("Official discounts to verify"), "index.html should list official discount paths separately");
assert.ok(html.includes("discountResults"), "index.html should render official discount cards");
assert.ok(html.includes("promoCodeResults"), "index.html should render published promo-code cards");
assert.ok(html.includes("Published promo codes"), "index.html should label promo codes as checkout intel");
assert.ok(html.includes("authentic-book-urls-20260901"), "index.html should carry the production deploy stamp");
assert.ok(html.includes("Book these Google Flights results"), "Google Flights must have a book button using the same tfs results URL");
assert.ok(html.includes("googleBookBar"), "index.html should render a Google Flights book bar");
assert.ok(html.includes("Prices show after you click"), "calendar must say prices appear on the provider after click");
assert.ok(html.includes("priceCalPrev"), "month calendar should allow paging months");
assert.ok(html.includes("title=\"Kayak\""), "each calendar day should include a Kayak price link");
assert.ok(html.includes("No published code"), "airline cards must label missing official codes");
assert.ok(html.includes("airlineBookingCard") || html.includes("Official promo at airline checkout"), "airline cards must surface checkout promo codes");
assert.ok(!html.includes("travel/flights?q="), "index.html must not link Google Flights via q=");
assert.ok(links.includes("sortby=cheapest"), "Skyscanner must sort cheapest-first");
assert.ok(links.includes("gozayaan.com/campaign/id/644"), "GoZayaan official campaign URL must be listed");
assert.ok(links.includes("gozayaan.com/campaign/sc"), "SCB GoZayaan campaign must be listed");
assert.ok(links.includes("AIRASTRA15"), "AIR ASTRA official promo code must be listed");
assert.ok(links.includes("STLRPIQ326"), "EBL official Stellar international code must be listed");
assert.ok(links.includes("bkash.com/en/campaign"), "bKash official campaign hub must be listed");
assert.ok(!links.includes("USBA15"), "Do not invent USBA15 without the airline official promo page");

console.log("honesty.test.js passed");
