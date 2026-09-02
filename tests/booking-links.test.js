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
assert.ok(qatarRound.includes("departing=2026-09-08"));
assert.ok(qatarRound.includes("returning=2026-09-17"));
assert.ok(qatarRound.includes("tripType=R"));
assert.ok(qatarRound.includes("showBooking.action"));

const comparators = BookingLinks.comparatorLinks(round);
assert.deepStrictEqual(comparators.map((c) => c.id), ["google-flights", "skyscanner", "kayak"]);
assert.strictEqual(comparators[0].cta, "Book these Google Flights results");
assert.ok(comparators[0].url.includes("/travel/flights/search?tfs="));
assert.ok(!comparators[0].url.includes("flights?q="));

const usbOne = BookingLinks.AIRLINE_DIRECTORY.find((a) => a.id === "usbangla").url(oneway);
assert.ok(usbOne.startsWith("https://fo-usba.ttinteractive.com/Zenith/FrontOffice/usbangla/en-GB/"));
assert.ok(usbOne.includes("OriginAirportCode=DAC"));
assert.ok(usbOne.includes("DestinationAirportCode=CAN"));
assert.ok(usbOne.includes("OutboundDate=2026-09-07"));
assert.ok(!usbOne.includes("InboundDate"));
assert.ok(!usbOne.includes("(S("));
assert.ok(!usbOne.includes("usbair.com/search"));
assert.ok(!usbOne.includes("FrontOffice/(S"));
const usbRound = BookingLinks.AIRLINE_DIRECTORY.find((a) => a.id === "usbangla").url(round);
assert.ok(usbRound.includes("InboundDate=2026-09-17"));
assert.ok(!usbRound.includes("(S("));

const astraOne = BookingLinks.AIRLINE_DIRECTORY.find((a) => a.id === "airastra").url(oneway);
assert.ok(astraOne.includes("fo-airastra.ttinteractive.com/Zenith/FrontOffice/Airastra/en-GB/"));
assert.ok(astraOne.includes("OriginAirportCode=DAC"));
assert.ok(astraOne.includes("OutboundDate=2026-09-07"));
assert.ok(!astraOne.includes("(S("));

const novoOne = BookingLinks.AIRLINE_DIRECTORY.find((a) => a.id === "novoair").url(oneway);
assert.ok(novoOne.startsWith("https://secure.flynovoair.com/bookings/flight_selection.aspx"));
assert.ok(novoOne.includes("origin=DAC"));
assert.ok(novoOne.includes("destination=CAN"));
assert.ok(novoOne.includes("departureDate=2026-09-07"));
assert.ok(novoOne.includes("TT=OW"));

const scootOne = BookingLinks.AIRLINE_DIRECTORY.find((a) => a.id === "scoot").url({
    origin: "DAC",
    dest: "SIN",
    depart: "2026-09-07",
    tripType: "oneway"
});
assert.ok(scootOne.includes("booking.flyscoot.com/Book/Flight"));
assert.ok(scootOne.includes("dst1=DAC"));
assert.ok(scootOne.includes("ast1=SIN"));
assert.ok(scootOne.includes("dd=2026-09-07"));
assert.ok(scootOne.includes("type=oneway"));

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
assert.ok(astra15.checkoutUrl.includes("fo-airastra.ttinteractive.com/Zenith/FrontOffice/Airastra"));
assert.ok(astra15.checkoutUrl.includes("OriginAirportCode=DAC"));
assert.ok(astra15.checkoutUrl.includes("OutboundDate=2026-09-03"));
assert.ok(!astra15.checkoutUrl.includes("(S("));
const dacAirlines = BookingLinks.airlinesForRoute(dacCan);
const astraCard = dacAirlines.find((a) => a.id === "airastra");
assert.ok(!astraCard, "AIR ASTRA is domestic-only and must not appear on DAC–CAN");
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
monthDays.forEach((day) => {
    assert.ok(day.google.includes("/travel/flights/search?tfs="));
    assert.ok(day.skyscanner.includes("sortby=cheapest"));
    assert.ok(day.kayak.includes("sort=price_a"));
    assert.ok(day.skyscannerMonth.includes("/transport/flights/dac/can/2609/"));
    assert.ok(!JSON.stringify(day).includes("৳"));
});
const octDays = BookingLinks.flexibleMonthDays(dacCan, 2026, 10);
assert.ok(octDays.every((day) => day.depart.startsWith("2026-10-")));
assert.ok(octDays[0].skyscannerMonth.includes("/transport/flights/dac/can/2610/"));
const overview = BookingLinks.monthOverviewLinks(dacCan);
assert.ok(overview.some((item) => item.url.includes("/travel/flights/search?tfs=")));
assert.ok(overview.some((item) => item.id === "skyscanner-month" && item.url.includes("/2609/")));
assert.ok(overview.some((item) => item.id === "kayak-explore" && item.url.includes("kayak.com/explore/DAC-CAN")));

const dacCanSep4 = { origin: "DAC", dest: "CAN", depart: "2026-09-04", tripType: "oneway" };
const gfSep4 = BookingLinks.googleFlightsUrl(dacCanSep4);
assert.ok(gfSep4.startsWith("https://www.google.com/travel/flights/search?tfs="));
assert.ok(!gfSep4.includes("flights?q="));
const decodedSep4 = decodeTfs(new URL(gfSep4).searchParams.get("tfs"));
assert.deepStrictEqual(decodedSep4.legs[0], { date: "2026-09-04", origin: "DAC", dest: "CAN" });
const usbSep4 = BookingLinks.AIRLINE_DIRECTORY.find((a) => a.id === "usbangla").url(dacCanSep4);
assert.ok(usbSep4.includes("OriginAirportCode=DAC"));
assert.ok(usbSep4.includes("DestinationAirportCode=CAN"));
assert.ok(usbSep4.includes("OutboundDate=2026-09-04"));
assert.ok(!usbSep4.includes("(S("));
assert.ok(!JSON.stringify(BookingLinks.airlinesForRoute(dacCanSep4)).includes("37053"));
assert.ok(!JSON.stringify(BookingLinks.airlinesForRoute(dacCanSep4)).includes("81614"));

const gzIntlSav = BookingLinks.savingsForProvider("gozayaan", dacCan);
assert.ok(gzIntlSav.some((s) => s.headline === "SCB card: official up to 10% on this OTA" && s.percent === 10 && s.how === "up to"));
assert.ok(gzIntlSav.some((s) => s.headline === "City Amex: official up to 18% on this OTA" && s.percent === 18 && s.capBdt === 30000));
assert.ok(!gzIntlSav.some((s) => s.percent === 7));

const dacCxb = { origin: "DAC", dest: "CXB", depart: "2026-09-03", tripType: "oneway" };
const gzDomSav = BookingLinks.savingsForProvider("gozayaan", dacCxb);
assert.ok(gzDomSav.some((s) => s.headline === "SCB card: official up to 7% on this OTA" && s.percent === 7));
assert.ok(!gzDomSav.some((s) => s.id === "city-amex-gozayaan"));
assert.ok(!gzDomSav.some((s) => s.percent === 18));

const astraSav = BookingLinks.savingsForProvider("airastra", dacCan);
assert.strictEqual(astraSav.length, 1);
assert.strictEqual(astraSav[0].code, "AIRASTRA15");
assert.strictEqual(astraSav[0].percent, 15);
assert.strictEqual(astraSav[0].headline, "AIRASTRA15: 15% at airline checkout");
assert.ok(astraSav[0].sourceUrl.includes("airastra.com"));

assert.deepStrictEqual(BookingLinks.savingsForProvider("google-flights", dacCan), []);
assert.deepStrictEqual(BookingLinks.savingsForProvider("biman", dacCan), []);

const shareIntl = BookingLinks.savingsForProvider("sharetrip", dacCan);
assert.strictEqual(shareIntl.length, 1);
assert.strictEqual(shareIntl[0].code, "STLRPIQ326");
assert.strictEqual(shareIntl[0].percent, 15);
assert.strictEqual(shareIntl[0].capBdt, 3000);
const shareDom = BookingLinks.savingsForProvider("sharetrip", dacCxb);
assert.strictEqual(shareDom[0].code, "STLRPDQ326");
assert.strictEqual(shareDom[0].capBdt, 1000);

const qatarDohSav = BookingLinks.savingsForProvider("qatar", { ...dacCan, dest: "DOH" });
assert.ok(qatarDohSav.some((s) => s.code === "F1FANS" && s.percent === 12));
const qatarCanSav = BookingLinks.savingsForProvider("qatar", dacCan);
assert.deepStrictEqual(qatarCanSav, []);

const estTen = BookingLinks.estimateAfterOfficialPercent(10000, { percent: 10 });
assert.ok(estTen);
assert.strictEqual(estTen.afterBdt, 9000);
assert.ok(/estimate from official/i.test(estTen.label));
assert.strictEqual(BookingLinks.estimateAfterOfficialPercent(null, { percent: 10 }), null);
assert.strictEqual(BookingLinks.estimateAfterOfficialPercent(undefined, { percent: 10 }), null);
assert.strictEqual(BookingLinks.estimateAfterOfficialPercent("not-a-fare", { percent: 10 }), null);
const estCap = BookingLinks.estimateAfterOfficialPercent(200000, { percent: 18, capBdt: 30000, how: "up to" });
assert.strictEqual(estCap.afterBdt, 170000);
assert.ok(/estimate from official/i.test(estCap.label));
const estUncapped = BookingLinks.estimateAfterOfficialPercent(100000, { percent: 18, capBdt: 30000, how: "up to" });
assert.strictEqual(estUncapped.afterBdt, 82000);

const path = BookingLinks.cheapBookPath(dacCan);
assert.strictEqual(path[0].id, "google-flights");
assert.strictEqual(path[0].tier, "primary");
assert.strictEqual(path[0].cta, "Open Google Flights");
assert.ok(path[0].url.includes("/travel/flights/search?tfs="));
assert.ok(/authentic airline-issued/i.test(path[0].blurb));
assert.ok(!/\d{3,}/.test(path[0].blurb.replace(/tfs/g, "")), "do not invent a ৳ amount on the Google Flights blurb");
assert.strictEqual(path[1].id, "gozayaan");
assert.strictEqual(path[1].tier, "secondary");
assert.ok(path[1].url.includes("gozayaan.com/flight/list"));
assert.deepStrictEqual(path[0].savings, []);
assert.ok(path[1].savings.some((s) => s.percent === 10));
assert.ok(path[1].savings.some((s) => s.percent === 18));
assert.ok(!path.some((row) => row.id === "airastra"), "AIR ASTRA is not on DAC–CAN");
const bimanPath = path.find((row) => row.id === "biman");
assert.ok(bimanPath);
assert.deepStrictEqual(bimanPath.savings, []);
const usbPath = path.find((row) => row.id === "usbangla");
assert.ok(usbPath);
assert.deepStrictEqual(usbPath.savings, [], "US-Bangla has no published website promo — show none beside that row");
assert.strictEqual(usbPath.tier, "secondary");
assert.strictEqual(usbPath.fareNote, "often Flex");
assert.ok(/flex/i.test(usbPath.blurb || BookingLinks.AIRLINE_DIRECTORY.find((a) => a.id === "usbangla").blurb));
assert.deepStrictEqual(BookingLinks.savingsForProvider("usbangla", dacCan), []);
assert.ok(!JSON.stringify(path[1].savings).toLowerCase().includes("brac"), "BRAC is not mapped to GoZayaan checkout");
assert.ok(path.some((row) => row.id === "sharetrip" && row.url === "https://sharetrip.net/"));
assert.ok(!JSON.stringify(path).includes("USBA15"));
assert.ok(!path.some((row) => /bank \/ card campaign/i.test(JSON.stringify(row))));

const astraRoute = BookingLinks.airlinesForRoute(dacCxb).find((a) => a.id === "airastra");
assert.ok(astraRoute);
assert.ok(astraRoute.savings.some((s) => s.code === "AIRASTRA15"));
assert.ok(astraRoute.url.includes("fo-airastra.ttinteractive.com/Zenith/FrontOffice/Airastra"));
const astraDomPath = BookingLinks.cheapBookPath(dacCxb).find((row) => row.id === "airastra");
assert.ok(astraDomPath);
assert.ok(astraDomPath.savings.some((s) => s.code === "AIRASTRA15" && s.percent === 15));
const bimanRoute = BookingLinks.airlinesForRoute(dacCan).find((a) => a.id === "biman");
assert.deepStrictEqual(bimanRoute.savings, []);

assert.deepStrictEqual(BookingLinks.officialPackagesForRoute({ dest: "BKK", destCountry: "Thailand 🇹🇭" }), []);
const bdPkgs = BookingLinks.officialPackagesForRoute({ dest: "CXB", destCountry: "Bangladesh 🇧🇩" });
assert.strictEqual(bdPkgs.length, 1);
assert.strictEqual(bdPkgs[0].url, "https://airastra.com/holiday-packages");
assert.ok(!bdPkgs[0].name.toLowerCase().includes("qatar"));
const dohPkgs = BookingLinks.officialPackagesForRoute({ dest: "DOH", destCountry: "Qatar" });
assert.ok(dohPkgs.some((p) => p.url === "https://www.qatarairwaysholidays.com/"));
assert.ok(!dohPkgs.some((p) => /astra|flydubai|turkish/i.test(p.name)));
const dxbPkgs = BookingLinks.officialPackagesForRoute({ dest: "DXB", destCountry: "United Arab Emirates 🇦🇪" });
assert.ok(dxbPkgs.some((p) => p.url.includes("holidays.flydubai.com")));
const istPkgs = BookingLinks.officialPackagesForRoute({ dest: "IST", destCountry: "Turkey" });
assert.ok(istPkgs.some((p) => p.url === "https://holidays.turkishairlines.com/"));
assert.ok(!BookingLinks.airlinesForRoute(dacCan).some((a) => a.id === "novoair"));

console.log("booking-links.test.js passed");
