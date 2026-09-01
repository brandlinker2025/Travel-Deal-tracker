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
    "Date-wise cheapest path"
];

required.forEach((needle) => {
    assert.ok(html.includes(needle), `index.html is missing required copy: ${needle}`);
});

assert.ok(!links.includes("discount_percent"), "booking-links.js must not invent discount math");
assert.ok(!links.includes("base_price"), "booking-links.js must not invent fares");
assert.ok(!links.includes("travel/flights?q="), "Google Flights must not use the natural-language q= URL");
assert.ok(links.includes("/travel/flights/search?tfs="), "Google Flights must use structured tfs search URLs");
assert.ok(links.includes("sort=price_a"), "Kayak must sort by price");
assert.ok(!links.includes("sharetrip.net/flight/search"), "ShareTrip dead search URLs must be removed");
assert.ok(links.includes("gozayaan.com/flight/list"), "GoZayaan must use dated flight/list search");
assert.ok(html.includes("Official packages"), "index.html should keep official packages");
assert.ok(html.includes("flexibleMonthGrid"), "index.html should render a date-wise cheapest calendar");
assert.ok(html.includes("structured-links-2026-09-01-main"), "index.html should carry the production deploy stamp");
assert.ok(!html.includes("travel/flights?q="), "index.html must not link Google Flights via q=");

console.log("honesty.test.js passed");
