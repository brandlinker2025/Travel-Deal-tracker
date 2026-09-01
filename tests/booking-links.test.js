const assert = require("assert");
const BookingLinks = require("../js/booking-links");

const round = {
    origin: "DAC",
    dest: "BKK",
    depart: "2026-09-08",
    returnDate: "2026-09-17",
    tripType: "round"
};

const oneway = {
    origin: "DAC",
    dest: "DXB",
    depart: "2026-10-02",
    tripType: "oneway"
};

const multi = {
    origin: "DAC",
    dest: "BKK",
    stop: "HKT",
    depart: "2026-11-01",
    returnDate: "2026-11-08",
    tripType: "multicity"
};

assert.strictEqual(BookingLinks.toISODate("2026-09-08"), "2026-09-08");
assert.strictEqual(BookingLinks.toSkyDate("2026-09-08"), "260908");

const gf = BookingLinks.googleFlightsUrl(round);
assert.ok(gf.includes("google.com/travel/flights"));
assert.ok(gf.includes("DAC"));
assert.ok(gf.includes("BKK"));
assert.ok(decodeURIComponent(gf).includes("2026-09-08"));
assert.ok(decodeURIComponent(gf).includes("2026-09-17"));

const sky = BookingLinks.skyscannerUrl(round);
assert.ok(sky.includes("/flights/dac/bkk/260908/260917/"));

const kayak = BookingLinks.kayakUrl(round);
assert.strictEqual(kayak, "https://www.kayak.com/flights/DAC-BKK/2026-09-08/2026-09-17?sort=bestflight_a");

const kayakOne = BookingLinks.kayakUrl(oneway);
assert.ok(kayakOne.includes("/flights/DAC-DXB/2026-10-02"));
assert.ok(!kayakOne.includes("2026-10-02/2026"));

const kayakMulti = BookingLinks.kayakUrl(multi);
assert.ok(kayakMulti.includes("DAC-BKK/2026-11-01/BKK-HKT/2026-11-08"));

const hotels = BookingLinks.googleHotelsUrl({
    city: "Bangkok (Main Hub)",
    checkin: "2026-09-08",
    checkout: "2026-09-17"
});
assert.ok(hotels.includes("google.com/travel/hotels"));
assert.ok(hotels.includes("checkin=2026-09-08"));
assert.ok(hotels.includes("checkout=2026-09-17"));
assert.ok(!hotels.includes("("));

const booking = BookingLinks.bookingUrl({
    city: "Bangkok",
    checkin: "2026-09-08",
    checkout: "2026-09-17"
});
assert.ok(booking.includes("booking.com/searchresults.html"));
assert.ok(booking.includes("checkin=2026-09-08"));
assert.ok(booking.includes("checkout=2026-09-17"));

const airlines = BookingLinks.airlinesForRoute({
    ...round,
    knownAirlines: [
        { name: "US-Bangla Airlines", website: "https://usbair.com" },
        { name: "Thai Airways", website: "https://www.thaiairways.com" }
    ]
});
const names = airlines.map((a) => a.name);
assert.ok(names.includes("US-Bangla Airlines"));
assert.ok(names.includes("Thai Airways"));
assert.ok(names.includes("Biman Bangladesh Airlines"));
assert.ok(airlines.every((a) => a.url.startsWith("https://")));
assert.ok(airlines.find((a) => a.id === "emirates") === undefined || airlines.length <= 8);

const emirates = BookingLinks.AIRLINE_DIRECTORY.find((a) => a.id === "emirates");
const emUrl = emirates.url(oneway);
assert.ok(emUrl.includes("emirates.com"));
assert.ok(emUrl.includes("origin=DAC"));
assert.ok(emUrl.includes("destination=DXB"));
assert.ok(emUrl.includes("02-Oct-2026"));

const comparators = BookingLinks.comparatorLinks(round);
assert.deepStrictEqual(comparators.map((c) => c.id), ["google-flights", "skyscanner", "kayak"]);

const plusOne = BookingLinks.addDaysISO("2026-09-08", 1);
assert.strictEqual(plusOne, "2026-09-09");

console.log("booking-links.test.js passed");
