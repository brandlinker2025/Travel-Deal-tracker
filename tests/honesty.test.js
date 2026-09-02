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
    "Open Flight Search",
    "Cheap fares by date",
    "Compare tickets on these dates",
    "Bangladesh bank / card campaigns",
    "Official airline promo codes",
    "BANK / CARD CAMPAIGNS",
    "flexibleMonthGrid",
    "nearbyDateStrip",
    "monthOverview",
    "priceCalPrev",
    "flightResults",
    "getDate() + 7",
    "getDate() + 16",
    'title="Kayak"',
    "title=\"Skyscanner\"",
];

forbidden.forEach((needle) => {
    assert.ok(!html.includes(needle), `index.html still contains fake/noisy text: ${needle}`);
});

assert.ok(!html.includes("selectedDeptDate = new Date("), "do not pre-select a departure date");
assert.ok(!html.includes("selectedRetDate = new Date("), "do not pre-select a return date");
assert.ok(html.includes("let selectedDeptDate = null"), "calendars must start with no departure date");
assert.ok(html.includes("let selectedRetDate = null"), "calendars must start with no return date");

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
    "Cheap ticket path",
    "cheapPathResults",
    "Official % beside the book row",
    "Open Google Flights",
    "authentic airline-issued",
    "often Flex",
    "SCB card: official up to 10% on this OTA",
    "AIRASTRA15: 15% at airline checkout",
    "estimate from official %",
    "One calendar",
    "dates start empty",
    "No dates yet",
    "tripCalendarGrid",
    "googleBookBar",
    "Official packages",
    "officialPackageResults",
    "gf-nearby-20260902",
    "Includes nearby: BKK, DMK",
    "Cheaper Nearby Airport",
    "LHR + LGW + STN + LTN",
    "Cheap Ticket Finder",
    "cheapticketfinder.site",
];

required.forEach((needle) => {
    assert.ok(html.includes(needle), `index.html is missing required copy: ${needle}`);
});

assert.ok(/one official book button per airline/i.test(html), "cheap path still includes one official book button per airline");

assert.ok(!html.includes('id="departGrid"'), "must not keep a second depart month grid");
assert.ok(!html.includes('id="returnGrid"'), "must not keep a separate return month grid");
assert.ok(!html.includes("returnCalendarBox"), "must not keep a second return calendar");

assert.ok(!html.includes("Bangladesh bank / card campaigns"), "do not keep a separate bank/card campaign grid");
assert.ok(!html.includes("BANK / CARD CAMPAIGNS"), "do not scatter a BANK / CARD CAMPAIGNS heading");
assert.ok(!html.includes("Official airline promo codes"), "promo codes attach to the book button, not a separate grid");
assert.ok(!html.includes("Cheapest live search"), "cheap path replaced the separate cheapest-live-search block");
assert.ok(!html.includes('id="discountResults"'), "do not keep a standalone discountResults grid");
assert.ok(!html.includes('id="promoCodeResults"'), "do not keep a standalone promoCodeResults grid");
assert.ok(!html.includes("cheap-ticket-finder-20260902"), "deploy stamp must move with this ship");
assert.ok(!html.includes("attach-savings-20260902"), "deploy stamp must move with the no-campaign-grid ship");
assert.ok(!html.includes("beside-row-20260902"), "deploy stamp must move with the google-primary ship");
assert.ok(!html.includes("no-campaign-grid-20260902"), "deploy stamp must move with the route-packages ship");
assert.ok(!html.includes("google-primary-20260902"), "deploy stamp must move with the gf-nearby ship");
assert.ok(!html.includes("route-packages-20260902"), "deploy stamp must move with the gf-nearby ship");
assert.ok(!html.includes("Real free tools"), "do not keep an always-on extra tools grid");
assert.ok(!html.includes("https://www.qatarairwaysholidays.com/"), "do not keep a static always-on Qatar packages card");
assert.ok(!html.includes("https://holidays.turkishairlines.com/"), "do not keep a static always-on Turkish packages card");
assert.ok(!html.includes("https://airastra.com/holiday-packages"), "AIR ASTRA packages must not be a static always-on card");

const pathIdx = html.indexOf("Cheap ticket path");
const hotelIdx = html.indexOf("Hotels for these dates");
const pkgIdx = html.indexOf('id="verifiedAgencySection"');
assert.ok(pathIdx > 0 && hotelIdx > pathIdx, "cheap ticket path must sit above hotels");
assert.ok(pkgIdx > hotelIdx, "official packages sit below the cheap path and hotels");

assert.ok(!links.includes("discount_percent"), "booking-links.js must not invent discount math");
assert.ok(!links.includes("base_price"), "booking-links.js must not invent fares");
assert.ok(!links.includes("travel/flights?q="), "Google Flights must not use the natural-language q= URL");
assert.ok(links.includes("cheaperNearbyAirports"), "haversine nearby dests must live in booking-links");
assert.ok(links.includes("LHR") && links.includes("LGW") && links.includes("STN") && links.includes("LTN"), "London metro must include LHR+LGW+STN+LTN");
assert.ok(links.includes("CDG") && links.includes("ORY"), "Paris metro must include CDG+ORY");
assert.ok(links.includes("NRT") && links.includes("HND"), "Tokyo metro must include NRT+HND");
assert.ok(links.includes("fo-usba.ttinteractive.com/Zenith/FrontOffice/usbangla"), "US-Bangla must use the stable TTI FrontOffice booking engine");
assert.ok(!links.includes("FrontOffice/(S("), "US-Bangla must not hard-code a session GUID FrontOffice path");
assert.ok(!links.includes("usbair.com/search"), "stale usbair.com/search schema.org URL 404s");
assert.ok(links.includes("OriginAirportCode"), "TTI booking links must include OriginAirportCode");
assert.ok(links.includes("secure.flynovoair.com/bookings/flight_selection.aspx"), "Novoair must use the official booking page");
assert.ok(links.includes("fo-airastra.ttinteractive.com/Zenith/FrontOffice/Airastra"), "AIR ASTRA must use the stable TTI FrontOffice booking engine");
assert.ok(links.includes("booking.flyscoot.com/Book/Flight"), "Scoot must use the official dated Book/Flight URL");
assert.ok(links.includes("sort=price_a"), "Kayak must sort by price");
assert.ok(!links.includes("sharetrip.net/flight/search"), "ShareTrip dead search URLs must be removed");
assert.ok(links.includes("gozayaan.com/flight/list"), "GoZayaan must use dated flight/list search");
assert.ok(!html.includes("travel/flights?q="), "index.html must not link Google Flights via q=");
assert.ok(links.includes("sortby=cheapest"), "Skyscanner must sort cheapest-first");
assert.ok(links.includes("gozayaan.com/campaign/id/644"), "GoZayaan official campaign URL must be listed");
assert.ok(links.includes("gozayaan.com/campaign/sc"), "SCB GoZayaan campaign must be listed");
assert.ok(links.includes("AIRASTRA15"), "AIR ASTRA official promo code must be listed");
assert.ok(links.includes("STLRPIQ326"), "EBL official Stellar international code must be listed");
assert.ok(links.includes("bkash.com/en/campaign"), "bKash official campaign hub must be listed");
assert.ok(!links.includes("USBA15"), "Do not invent USBA15 without the airline official promo page");
assert.ok(html.includes("cheapPathCard") && html.includes("savingsChips"), "cheap-path rows must attach official savings beside each book control");
assert.ok(html.includes("sm:flex-row sm:items-center"), "promo/card chips sit beside the airline/OTA search/book row");
assert.ok(!html.includes("None — No official card or checkout code mapped"), "airlines with no published promo must not show extra none copy");
assert.ok(html.includes("primaryGoogleCard"), "Google Flights must be the primary cheap-path card");
assert.ok(html.includes("Airline site (often Flex / higher fare family)"), "airline engines must be labeled secondary Flex");
assert.ok(links.includes("Open Google Flights"), "Google Flights CTA is Open Google Flights");
assert.ok(links.includes("authentic airline-issued"), "Google Flights blurb must say the airline ticket there is authentic");
assert.ok(links.includes("SCB card: official up to 10% on this OTA"), "GoZayaan SCB headline must stay mapped to that OTA");
assert.ok(links.includes("officialPackagesForRoute"), "packages must be chosen from the searched destination");
assert.ok(links.includes("airastra.com/holiday-packages"), "AIR ASTRA official holiday URL stays in the destination map");
assert.ok(html.includes('id="verifiedAgencySection"') && html.includes("hidden"), "packages block starts hidden until a matching destination");

assert.ok(!html.includes("Cheapest Ticket Finder"), "product name is Cheap Ticket Finder, not Cheapest Ticket Finder");
assert.ok(!html.includes("Global Travel Tracker"), "do not use Global Travel Tracker as the product name");
assert.ok(!html.includes("Travel Deal Tracker"), "do not use Travel Deal Tracker as the product name");
assert.ok(!html.includes("temporary-swift-ochre"), "do not advertise expired claim-deploys");

const readme = fs.readFileSync(path.join(__dirname, "..", "README.md"), "utf8");
assert.ok(readme.includes("# Cheap Ticket Finder"), "README title must be Cheap Ticket Finder");
assert.ok(!readme.includes("Cheapest Ticket Finder"), "README must not use Cheapest Ticket Finder");
assert.ok(!readme.includes("Global Travel Tracker"), "README must not use Global Travel Tracker");
assert.ok(readme.includes("cheap-ticket-finder.vercel.app"), "README must point at the stable Vercel host");
assert.ok(readme.includes("cheapticketfinder.site"), "README must name the custom domain");

console.log("honesty.test.js passed");
