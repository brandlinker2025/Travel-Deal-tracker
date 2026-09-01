const assert = require("assert");
const BookingLinks = require("../js/booking-links");

function decodeTfs(tfs) {
    const b64 = tfs.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (tfs.length % 4)) % 4);
    const buf = Buffer.from(b64, "base64");
    const legs = [];
    let tripType = null;
    let i = 0;
    function varint() {
        let v = 0n, s = 0n, b;
        do {
            b = BigInt(buf[i++]);
            v |= (b & 0x7fn) << s;
            s += 7n;
        } while (b & 0x80n);
        return v;
    }
    function bytes() {
        const len = Number(varint());
        const slice = buf.subarray(i, i + len);
        i += len;
        return slice;
    }
    function decodeLeg(slice) {
        let j = 0;
        const leg = {};
        while (j < slice.length) {
            let tag = 0, sh = 0, b;
            do {
                b = slice[j++];
                tag |= (b & 0x7f) << sh;
                sh += 7;
            } while (b & 0x80);
            const field = tag >>> 3, wt = tag & 7;
            if (wt === 2) {
                let len = 0, s = 0;
                do {
                    b = slice[j++];
                    len |= (b & 0x7f) << s;
                    s += 7;
                } while (b & 0x80);
                const inner = slice.subarray(j, j + len);
                j += len;
                if (field === 2) leg.date = inner.toString("utf8");
                if (field === 13 || field === 14) {
                    let k = 0, code = "";
                    while (k < inner.length) {
                        let t = 0, ss = 0, bb;
                        do {
                            bb = inner[k++];
                            t |= (bb & 0x7f) << ss;
                            ss += 7;
                        } while (bb & 0x80);
                        const f = t >>> 3, w = t & 7;
                        if (w === 2) {
                            let ln = 0, s2 = 0;
                            do {
                                bb = inner[k++];
                                ln |= (bb & 0x7f) << s2;
                                s2 += 7;
                            } while (bb & 0x80);
                            const val = inner.subarray(k, k + ln).toString("utf8");
                            k += ln;
                            if (f === 2) code = val;
                        } else if (w === 0) {
                            while (inner[k++] & 0x80) { /* skip varint */ }
                        }
                    }
                    if (field === 13) leg.origin = code;
                    if (field === 14) leg.dest = code;
                }
            }
        }
        return leg;
    }
    while (i < buf.length) {
        const tag = Number(varint());
        const field = tag >>> 3, wt = tag & 7;
        if (wt === 0) {
            const v = Number(varint());
            if (field === 19) tripType = v;
        } else if (wt === 2) {
            const slice = bytes();
            if (field === 3) legs.push(decodeLeg(slice));
        }
    }
    return { tripType, legs };
}

const round = {
    origin: "DAC",
    dest: "BKK",
    depart: "2026-09-08",
    returnDate: "2026-09-17",
    tripType: "round"
};

const oneway = {
    origin: "DAC",
    dest: "CAN",
    depart: "2026-09-07",
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

const knownOneWay = BookingLinks.encodeGoogleFlightsTfs({
    origin: "JFK",
    dest: "LHR",
    depart: "2026-02-18",
    tripType: "oneway"
});
assert.strictEqual(
    knownOneWay,
    "CBwQAhoeEgoyMDI2LTAyLTE4agcIARIDSkZLcgcIARIDTEhSQAFIAXABggELCP___________wGYAQI"
);

const gfOne = BookingLinks.googleFlightsUrl(oneway);
assert.ok(gfOne.startsWith("https://www.google.com/travel/flights/search?tfs="));
assert.ok(!gfOne.includes("?q="));
assert.ok(!gfOne.includes("&q="));
assert.ok(!gfOne.includes("flights?q="));
assert.ok(gfOne.includes("curr=BDT"));
const tfsOne = new URL(gfOne).searchParams.get("tfs");
const decodedOne = decodeTfs(tfsOne);
assert.strictEqual(decodedOne.tripType, 2);
assert.strictEqual(decodedOne.legs.length, 1);
assert.deepStrictEqual(decodedOne.legs[0], { date: "2026-09-07", origin: "DAC", dest: "CAN" });

const gfRound = BookingLinks.googleFlightsUrl(round);
assert.ok(gfRound.includes("/travel/flights/search?tfs="));
assert.ok(!gfRound.includes("flights?q="));
const decodedRound = decodeTfs(new URL(gfRound).searchParams.get("tfs"));
assert.strictEqual(decodedRound.tripType, 1);
assert.strictEqual(decodedRound.legs.length, 2);
assert.deepStrictEqual(decodedRound.legs[0], { date: "2026-09-08", origin: "DAC", dest: "BKK" });
assert.deepStrictEqual(decodedRound.legs[1], { date: "2026-09-17", origin: "BKK", dest: "DAC" });

const sky = BookingLinks.skyscannerUrl(round);
assert.ok(sky.includes("/flights/dac/bkk/260908/260917/"));
const skyOne = BookingLinks.skyscannerUrl(oneway);
assert.strictEqual(
    skyOne,
    "https://www.skyscanner.net/transport/flights/dac/can/260907/?adultsv2=1&cabinclass=economy&sortby=cheapest"
);
assert.ok(sky.includes("sortby=cheapest"));
assert.ok(!skyOne.includes("260907/26"));

const kayak = BookingLinks.kayakUrl(round);
assert.strictEqual(kayak, "https://www.kayak.com/flights/DAC-BKK/2026-09-08/2026-09-17?sort=price_a");

const kayakOne = BookingLinks.kayakUrl(oneway);
assert.strictEqual(kayakOne, "https://www.kayak.com/flights/DAC-CAN/2026-09-07?sort=price_a");
assert.ok(!kayakOne.includes("2026-09-07/20"));

const kayakMulti = BookingLinks.kayakUrl(multi);
assert.ok(kayakMulti.includes("DAC-BKK/2026-11-01/BKK-HKT/2026-11-08"));
assert.ok(kayakMulti.includes("sort=price_a"));

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
const usbPromo = airlines.find((a) => a.id === "usbangla");
assert.ok(usbPromo);
assert.strictEqual(usbPromo.promo, null, "do not invent a US-Bangla checkout code");
assert.ok(!JSON.stringify(airlines).includes("USBA15"));
const thaiPromo = airlines.find((a) => a.id === "thai");
assert.ok(thaiPromo);
assert.strictEqual(thaiPromo.promo, null);

const bimanOne = BookingLinks.AIRLINE_DIRECTORY.find((a) => a.id === "biman").url(oneway);
assert.ok(bimanOne.includes("origin=DAC"));
assert.ok(bimanOne.includes("destination=CAN"));
assert.ok(bimanOne.includes("departDate=2026-09-07"));
assert.ok(bimanOne.includes("tripType=oneway"));
assert.ok(!bimanOne.includes("returnDate=2026"));

const emirates = BookingLinks.AIRLINE_DIRECTORY.find((a) => a.id === "emirates");
const emUrl = emirates.url({ ...oneway, dest: "DXB" });
assert.ok(emUrl.includes("emirates.com"));
assert.ok(emUrl.includes("origin=DAC"));
assert.ok(emUrl.includes("destination=DXB"));
assert.ok(emUrl.includes("07-Sep-2026"));
assert.ok(emUrl.includes("tripType=oneway"));
assert.ok(!emUrl.includes("returning="));

const qatarRound = BookingLinks.AIRLINE_DIRECTORY.find((a) => a.id === "qatar").url(round);
assert.ok(qatarRound.includes("fromStation=DAC"));
assert.ok(qatarRound.includes("toStation=BKK"));
assert.ok(qatarRound.includes("departing=08-Sep-2026"));
assert.ok(qatarRound.includes("returning=17-Sep-2026"));
assert.ok(qatarRound.includes("tripType=R"));

const comparators = BookingLinks.comparatorLinks(round);
assert.deepStrictEqual(comparators.map((c) => c.id), ["google-flights", "skyscanner", "kayak"]);

const plusOne = BookingLinks.addDaysISO("2026-09-08", 1);
assert.strictEqual(plusOne, "2026-09-09");

const dacCan = { origin: "DAC", dest: "CAN", depart: "2026-09-03", tripType: "oneway" };
const gfDacCan = BookingLinks.googleFlightsUrl(dacCan);
assert.ok(gfDacCan.startsWith("https://www.google.com/travel/flights/search?tfs="));
assert.ok(!gfDacCan.includes("flights?q="));
assert.ok(gfDacCan.includes("tfs=CBwQAhoeEgoyMDI2LTA5LTAzagcIARIDREFDcgcIARIDQ0FO"));
const decodedDacCan = decodeTfs(new URL(gfDacCan).searchParams.get("tfs"));
assert.strictEqual(decodedDacCan.tripType, 2);
assert.deepStrictEqual(decodedDacCan.legs[0], { date: "2026-09-03", origin: "DAC", dest: "CAN" });
assert.strictEqual(
    BookingLinks.skyscannerUrl(dacCan),
    "https://www.skyscanner.net/transport/flights/dac/can/260903/?adultsv2=1&cabinclass=economy&sortby=cheapest"
);
assert.strictEqual(
    BookingLinks.kayakUrl(dacCan),
    "https://www.kayak.com/flights/DAC-CAN/2026-09-03?sort=price_a"
);
const gz = BookingLinks.gozayaanUrl(dacCan);
assert.ok(gz.includes("gozayaan.com/flight/list"));
assert.ok(gz.includes("trips=DAC%2CCAN%2C2026-09-03") || gz.includes("trips=DAC,CAN,2026-09-03"));
assert.ok(!gz.includes("sharetrip"));

const bd = BookingLinks.bangladeshSearchLinks(dacCan);
assert.strictEqual(bd.length, 1);
assert.strictEqual(bd[0].id, "gozayaan");
assert.ok(!JSON.stringify(bd).toLowerCase().includes("sharetrip"));

const skyMonth = BookingLinks.skyscannerMonthUrl(dacCan);
assert.ok(skyMonth.includes("/transport/flights/dac/can/2609/"));
assert.ok(skyMonth.includes("sortby=cheapest"));
assert.ok(!skyMonth.includes("2609/260"));

const offers = BookingLinks.officialDiscountLinks(dacCan);
const offerUrls = offers.map((item) => item.url).join(" ");
assert.ok(offers.length >= 5);
assert.ok(offerUrls.includes("gozayaan.com/campaign/id/644"));
assert.ok(offerUrls.includes("gozayaan.com/campaign/sc"));
assert.ok(offerUrls.includes("bkash.com/en/campaign"));
assert.ok(offerUrls.includes("bracbank.com/en/offers"));
assert.ok(offerUrls.includes("usbair.com/offers") || offerUrls.includes("airastra.com"));
assert.ok(!offerUrls.toLowerCase().includes("sharetrip.net/flight/search"));
assert.ok(!JSON.stringify(offers).includes("FLYGLOBAL15"));
assert.ok(!JSON.stringify(offers).includes("discount_percent"));
const scb = offers.find((item) => item.id === "scb-gozayaan");
assert.ok(scb.claim.includes("10%"));
assert.ok(scb.validity.includes("31 October 2026"));
const brac = offers.find((item) => item.id === "brac-offers");
assert.ok(brac.claim.toLowerCase().includes("no available offer"));

const promos = BookingLinks.publishedPromoCodes(dacCan);
const promoCodes = promos.map((item) => item.code);
assert.ok(promoCodes.includes("AIRASTRA15"));
assert.ok(promoCodes.includes("STLRPIQ326"));
assert.ok(promoCodes.includes("STLRPDQ326"));
assert.ok(!promoCodes.includes("USBA15"), "do not invent USBA15 without the airline official page");
assert.ok(!promoCodes.includes("FLYGLOBAL15"));
const astra15 = promos.find((item) => item.code === "AIRASTRA15");
assert.ok(astra15.checkoutUrl.includes("airastra.com"));
assert.ok(astra15.checkoutUrl.includes("origin=DAC"));
assert.ok(astra15.checkoutUrl.includes("departDate=2026-09-03"));
const dacAirlines = BookingLinks.airlinesForRoute(dacCan);
const astraCard = dacAirlines.find((a) => a.id === "airastra");
assert.ok(astraCard);
assert.strictEqual(astraCard.promo.code, "AIRASTRA15");
assert.ok(astraCard.promo.sourceUrl.includes("airastra.com"));
const bimanCard = dacAirlines.find((a) => a.id === "biman");
assert.ok(bimanCard);
assert.strictEqual(bimanCard.promo, null);
const qatarCard = BookingLinks.airlinesForRoute({ ...dacCan, dest: "DOH" }).find((a) => a.id === "qatar");
assert.ok(qatarCard);
assert.strictEqual(qatarCard.promo.code, "F1FANS");
assert.ok(qatarCard.promo.summary.toLowerCase().includes("f1"));
const eblIntl = promos.find((item) => item.code === "STLRPIQ326");
assert.strictEqual(eblIntl.checkoutUrl, "https://sharetrip.net/");
assert.ok(!eblIntl.checkoutUrl.includes("/flight/search"));

const nearby = BookingLinks.flexibleNearbyDays(dacCan, 3);
assert.ok(nearby.length >= 1);
nearby.forEach((day) => {
    assert.ok(day.google.includes("/travel/flights/search?tfs="));
    assert.ok(!day.google.includes("flights?q="));
    assert.ok(day.skyscanner.includes(`/transport/flights/dac/can/${day.depart.slice(2).replace(/-/g, "")}/`));
    assert.ok(day.skyscanner.includes("sortby=cheapest"));
    assert.ok(day.kayak.includes(`/flights/DAC-CAN/${day.depart}`));
    assert.ok(day.kayak.includes("sort=price_a"));
    assert.ok(!day.kayak.split(day.depart)[1].includes("2026-"));
});
const exact = nearby.find((day) => day.depart === "2026-09-03");
assert.ok(exact);
assert.ok(exact.google.includes("tfs="));
const decodedFlexible = decodeTfs(new URL(exact.google).searchParams.get("tfs"));
assert.deepStrictEqual(decodedFlexible.legs[0], { date: "2026-09-03", origin: "DAC", dest: "CAN" });

const monthDays = BookingLinks.flexibleMonthDays(dacCan);
assert.ok(monthDays.some((day) => day.depart === "2026-09-03"));
assert.ok(monthDays.every((day) => day.depart.startsWith("2026-09-")));

console.log("booking-links.test.js passed");
