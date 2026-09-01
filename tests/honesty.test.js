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
    "Calculating estimated rates"
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
    "final price is on the provider"
];

required.forEach((needle) => {
    assert.ok(html.includes(needle), `index.html is missing required copy: ${needle}`);
});

assert.ok(!links.includes("discount_percent"), "booking-links.js must not invent discount math");
assert.ok(!links.includes("base_price"), "booking-links.js must not invent fares");
assert.ok(html.includes("Official packages"), "index.html should keep official packages");

console.log("honesty.test.js passed");
