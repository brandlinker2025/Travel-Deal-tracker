/**
 * Dated search URLs only. No fare math, no scraping, no invented discounts.
 * Providers confirm the live price on their own pages.
 *
 * Never use Google Flights `?q=` natural-language URLs (empty landing page).
 * ShareTrip `/flight/search` 404s — do not add it back without a working dated URL.
 * Stamp: official-discounts-2026-09-01
 */
(function (root, factory) {
    const api = factory();
    if (typeof module === "object" && module.exports) {
        module.exports = api;
    } else {
        root.BookingLinks = api;
    }
})(typeof self !== "undefined" ? self : this, function () {
    "use strict";

    const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const BD_AIRPORTS = new Set(["dac", "cxb", "cgp", "zyl", "jsr", "spd", "rjh", "bzl", "ird"]);

    function pad(n) {
        return String(n).padStart(2, "0");
    }

    function toISODate(d) {
        if (!d) return "";
        if (typeof d === "string") return d.slice(0, 10);
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    }

    function fromISO(iso) {
        const [y, m, day] = toISODate(iso).split("-").map(Number);
        return { y, m, day };
    }

    function toSkyDate(d) {
        const iso = toISODate(d).replace(/-/g, "");
        return iso.slice(2);
    }

    function toDayMonYear(d) {
        const { y, m, day } = fromISO(d);
        return `${pad(day)}-${MONTH_SHORT[m - 1]}-${y}`;
    }

    function toDmySlash(d) {
        const { y, m, day } = fromISO(d);
        return `${pad(day)}/${pad(m)}/${y}`;
    }

    function toDotDate(d) {
        const { y, m, day } = fromISO(d);
        return `${pad(day)}.${pad(m)}.${y}`;
    }

    function upper(code) {
        return String(code || "").trim().toUpperCase();
    }

    function lower(code) {
        return String(code || "").trim().toLowerCase();
    }

    function pbVarint(value) {
        let n = typeof value === "bigint" ? value : BigInt(value);
        if (n < 0n) n += 1n << 64n;
        const out = [];
        while (n >= 0x80n) {
            out.push(Number(n & 0x7fn) | 0x80);
            n >>= 7n;
        }
        out.push(Number(n));
        return out;
    }

    function pbTag(field, wire) {
        return pbVarint((field << 3) | wire);
    }

    function pbVarintField(field, value) {
        return pbTag(field, 0).concat(pbVarint(value));
    }

    function pbBytesField(field, bytes) {
        return pbTag(field, 2).concat(pbVarint(bytes.length), bytes);
    }

    function pbStringField(field, str) {
        const encoded = [];
        const text = String(str);
        for (let i = 0; i < text.length; i++) {
            encoded.push(text.charCodeAt(i) & 0xff);
        }
        return pbBytesField(field, encoded);
    }

    function toBase64Url(bytes) {
        let bin = "";
        for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
        const b64 = (typeof btoa === "function")
            ? btoa(bin)
            : Buffer.from(bytes).toString("base64");
        return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
    }

    function encodeAirportPlace(iata) {
        return pbVarintField(1, 1).concat(pbStringField(2, upper(iata)));
    }

    function encodeFlightLeg(date, origin, dest) {
        return pbStringField(2, toISODate(date))
            .concat(pbBytesField(13, encodeAirportPlace(origin)))
            .concat(pbBytesField(14, encodeAirportPlace(dest)));
    }

    function encodeGoogleFlightsTfs(opts) {
        const origin = upper(opts.origin);
        const dest = upper(opts.dest);
        const depart = toISODate(opts.depart);
        const ret = opts.returnDate ? toISODate(opts.returnDate) : "";
        const stop = opts.stop ? upper(opts.stop) : "";

        const legs = [];
        let tripType = 1;
        if (opts.tripType === "oneway") {
            tripType = 2;
            legs.push(encodeFlightLeg(depart, origin, dest));
        } else if (opts.tripType === "multicity" && stop && ret) {
            tripType = 3;
            legs.push(encodeFlightLeg(depart, origin, dest));
            legs.push(encodeFlightLeg(ret, dest, stop));
        } else {
            tripType = 1;
            legs.push(encodeFlightLeg(depart, origin, dest));
            legs.push(encodeFlightLeg(ret, dest, origin));
        }

        const allResultsSentinel = pbVarintField(1, -1n);
        const bytes = []
            .concat(pbVarintField(1, 28))
            .concat(pbVarintField(2, 2))
            .concat(legs.flatMap((leg) => pbBytesField(3, leg)))
            .concat(pbVarintField(8, 1))
            .concat(pbVarintField(9, 1))
            .concat(pbVarintField(14, 1))
            .concat(pbBytesField(16, allResultsSentinel))
            .concat(pbVarintField(19, tripType));
        return toBase64Url(bytes);
    }

    function encodeGoogleFlightsTfuCheapest() {
        const state = []
            .concat(pbVarintField(1, 2))
            .concat(pbVarintField(4, 2))
            .concat(pbVarintField(5, 8));
        return toBase64Url(pbBytesField(2, state));
    }

    function googleFlightsUrl(opts) {
        const tfs = encodeGoogleFlightsTfs(opts);
        const tfu = encodeGoogleFlightsTfuCheapest();
        return `https://www.google.com/travel/flights/search?tfs=${tfs}&tfu=${tfu}&hl=en&curr=BDT`;
    }

    function skyscannerUrl(opts) {
        const o = lower(opts.origin);
        const d = lower(opts.dest);
        const dep = toSkyDate(opts.depart);
        const cheap = "adultsv2=1&cabinclass=economy&sortby=cheapest";
        if (opts.tripType === "oneway") {
            return `https://www.skyscanner.net/transport/flights/${o}/${d}/${dep}/?${cheap}`;
        }
        if (opts.tripType === "multicity" && opts.stop && opts.returnDate) {
            const s = lower(opts.stop);
            const ret = toSkyDate(opts.returnDate);
            return `https://www.skyscanner.net/transport/flights/${o}/${d}/${dep}/${d}/${s}/${ret}/?${cheap}`;
        }
        const ret = toSkyDate(opts.returnDate);
        return `https://www.skyscanner.net/transport/flights/${o}/${d}/${dep}/${ret}/?${cheap}`;
    }

    function kayakUrl(opts) {
        const o = upper(opts.origin);
        const d = upper(opts.dest);
        const dep = toISODate(opts.depart);
        if (opts.tripType === "oneway") {
            return `https://www.kayak.com/flights/${o}-${d}/${dep}?sort=price_a`;
        }
        if (opts.tripType === "multicity" && opts.stop && opts.returnDate) {
            const s = upper(opts.stop);
            const ret = toISODate(opts.returnDate);
            return `https://www.kayak.com/flights/${o}-${d}/${dep}/${d}-${s}/${ret}?sort=price_a`;
        }
        const ret = toISODate(opts.returnDate);
        return `https://www.kayak.com/flights/${o}-${d}/${dep}/${ret}?sort=price_a`;
    }

    function googleHotelsUrl(opts) {
        const city = String(opts.city || "").replace(/\([^)]*\)/g, "").trim();
        const checkin = toISODate(opts.checkin);
        const checkout = toISODate(opts.checkout);
        const q = encodeURIComponent(`Hotels in ${city}`);
        const loc = encodeURIComponent(city);
        return `https://www.google.com/travel/hotels/${loc}?q=${q}&checkin=${checkin}&checkout=${checkout}`;
    }

    function bookingUrl(opts) {
        const city = String(opts.city || "").replace(/\([^)]*\)/g, "").trim();
        const checkin = toISODate(opts.checkin);
        const checkout = toISODate(opts.checkout);
        return `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(city)}&checkin=${checkin}&checkout=${checkout}`;
    }

    function gozayaanUrl(opts) {
        const o = upper(opts.origin);
        const d = upper(opts.dest);
        const dep = toISODate(opts.depart);
        if (opts.tripType === "multicity") {
            return "https://gozayaan.com/flight";
        }
        let trips = `${o},${d},${dep}`;
        if (opts.tripType !== "oneway" && opts.returnDate) {
            trips = `${o},${d},${dep},${d},${o},${toISODate(opts.returnDate)}`;
        }
        const params = new URLSearchParams({
            adult: "1",
            cabin_class: "Economy",
            child: "0",
            infant: "0",
            trips
        });
        return `https://gozayaan.com/flight/list?${params.toString()}`;
    }

    function stayLengthDays(opts) {
        if (opts.tripType === "oneway") return 0;
        const dep = toISODate(opts.depart);
        const ret = toISODate(opts.returnDate);
        if (!dep || !ret) return 7;
        const a = Date.parse(`${dep}T00:00:00`);
        const b = Date.parse(`${ret}T00:00:00`);
        return Math.max(1, Math.round((b - a) / 86400000));
    }

    function todayISO() {
        return toISODate(new Date());
    }

    function optsForDepartDate(base, departISO) {
        const stay = stayLengthDays(base);
        const next = {
            origin: base.origin,
            dest: base.dest,
            stop: base.stop,
            tripType: base.tripType,
            knownAirlines: base.knownAirlines,
            depart: departISO
        };
        if (base.tripType !== "oneway") {
            next.returnDate = addDaysISO(departISO, stay || 7);
        }
        return next;
    }

    function dateLinkBundle(base, departISO) {
        const o = optsForDepartDate(base, departISO);
        return {
            depart: toISODate(o.depart),
            returnDate: o.tripType === "oneway" ? null : toISODate(o.returnDate),
            google: googleFlightsUrl(o),
            skyscanner: skyscannerUrl(o),
            kayak: kayakUrl(o),
            gozayaan: gozayaanUrl(o)
        };
    }

    function flexibleNearbyDays(opts, radius = 7) {
        const center = toISODate(opts.depart);
        const today = todayISO();
        const days = [];
        for (let delta = -radius; delta <= radius; delta++) {
            const iso = addDaysISO(center, delta);
            if (iso < today) continue;
            days.push(dateLinkBundle(opts, iso));
        }
        return days;
    }

    function flexibleMonthDays(opts) {
        const { y, m } = fromISO(opts.depart);
        const today = todayISO();
        const last = new Date(y, m, 0).getDate();
        const days = [];
        for (let day = 1; day <= last; day++) {
            const iso = `${y}-${pad(m)}-${pad(day)}`;
            if (iso < today) continue;
            days.push(dateLinkBundle(opts, iso));
        }
        return days;
    }

    function skyscannerMonthUrl(opts) {
        const o = lower(opts.origin);
        const d = lower(opts.dest);
        const ym = toSkyDate(opts.depart).slice(0, 4);
        const cheap = "adultsv2=1&cabinclass=economy&sortby=cheapest";
        if (opts.tripType === "oneway") {
            return `https://www.skyscanner.net/transport/flights/${o}/${d}/${ym}/?${cheap}`;
        }
        const rym = toSkyDate(opts.returnDate || opts.depart).slice(0, 4);
        return `https://www.skyscanner.net/transport/flights/${o}/${d}/${ym}/${rym}/?${cheap}`;
    }

    function kayakExploreUrl(opts) {
        return `https://www.kayak.com/explore/${upper(opts.origin)}-${upper(opts.dest)}`;
    }

    function monthOverviewLinks(opts) {
        const monthDays = flexibleMonthDays(opts);
        const sample = monthDays[0] || dateLinkBundle(opts, toISODate(opts.depart));
        return [
            {
                id: "google-date-grid",
                name: "Google Flights date grid",
                blurb: "Opens a filled Google Flights search for this route. Use Date grid / Cheapest on their page.",
                url: sample.google
            },
            {
                id: "skyscanner-month",
                name: "Skyscanner whole month",
                blurb: "Skyscanner month view for this From/To. Real fares are on their calendar.",
                url: skyscannerMonthUrl(opts)
            },
            {
                id: "kayak-explore",
                name: "Kayak explore",
                blurb: "Kayak flexible-date explorer for this route.",
                url: kayakExploreUrl(opts)
            }
        ];
    }

    function withQuery(base, params) {
        const url = new URL(base);
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== "") {
                url.searchParams.set(key, String(value));
            }
        });
        return url.toString();
    }

    const AIRLINE_DIRECTORY = [
        {
            id: "biman",
            name: "Biman Bangladesh Airlines",
            home: "https://www.biman-airlines.com/",
            match: /biman/i,
            relevant: (o, d) => BD_AIRPORTS.has(o) || BD_AIRPORTS.has(d),
            url(opts) {
                return withQuery("https://www.biman-airlines.com/", {
                    origin: upper(opts.origin),
                    destination: upper(opts.dest),
                    departDate: toISODate(opts.depart),
                    returnDate: opts.tripType === "oneway" ? "" : toISODate(opts.returnDate),
                    tripType: opts.tripType === "oneway" ? "oneway" : "round"
                });
            }
        },
        {
            id: "usbangla",
            name: "US-Bangla Airlines",
            home: "https://usbair.com",
            match: /us-?bangla|usbair/i,
            relevant: (o, d) => BD_AIRPORTS.has(o) || BD_AIRPORTS.has(d),
            url(opts) {
                return withQuery("https://usbair.com", {
                    origin: upper(opts.origin),
                    destination: upper(opts.dest),
                    departureDate: toISODate(opts.depart),
                    returnDate: opts.tripType === "oneway" ? "" : toISODate(opts.returnDate)
                });
            }
        },
        {
            id: "airastra",
            name: "AIR ASTRA",
            home: "https://airastra.com",
            match: /astra/i,
            relevant: (o, d) => BD_AIRPORTS.has(o) || BD_AIRPORTS.has(d),
            url(opts) {
                return withQuery("https://airastra.com", {
                    origin: upper(opts.origin),
                    destination: upper(opts.dest),
                    departDate: toISODate(opts.depart),
                    returnDate: opts.tripType === "oneway" ? "" : toISODate(opts.returnDate)
                });
            }
        },
        {
            id: "novoair",
            name: "Novoair",
            home: "https://www.flynovoair.com",
            match: /novoair/i,
            relevant: (o, d) => BD_AIRPORTS.has(o) || BD_AIRPORTS.has(d),
            url(opts) {
                return withQuery("https://www.flynovoair.com", {
                    origin: upper(opts.origin),
                    destination: upper(opts.dest),
                    departDate: toISODate(opts.depart),
                    returnDate: opts.tripType === "oneway" ? "" : toISODate(opts.returnDate)
                });
            }
        },
        {
            id: "emirates",
            name: "Emirates",
            home: "https://www.emirates.com/bd/english/",
            match: /emirates/i,
            hubs: ["dxb"],
            url(opts) {
                const params = {
                    origin: upper(opts.origin),
                    destination: upper(opts.dest),
                    departing: toDayMonYear(opts.depart),
                    adults: "1",
                    children: "0",
                    class: "Economy",
                    tripType: opts.tripType === "oneway" ? "oneway" : "return"
                };
                if (opts.tripType !== "oneway" && opts.returnDate) {
                    params.returning = toDayMonYear(opts.returnDate);
                }
                return withQuery("https://www.emirates.com/bd/english/book/", params);
            }
        },
        {
            id: "qatar",
            name: "Qatar Airways",
            home: "https://www.qatarairways.com/en-bd/homepage.html",
            match: /qatar/i,
            hubs: ["doh"],
            url(opts) {
                const params = {
                    fromStation: upper(opts.origin),
                    toStation: upper(opts.dest),
                    departing: toDayMonYear(opts.depart),
                    adults: "1",
                    children: "0",
                    infants: "0",
                    bookingClass: "Y",
                    tripType: opts.tripType === "oneway" ? "O" : "R"
                };
                if (opts.tripType !== "oneway" && opts.returnDate) {
                    params.returning = toDayMonYear(opts.returnDate);
                } else if (opts.tripType === "oneway") {
                    params.returning = "";
                }
                return withQuery("https://booking.qatarairways.com/nsp/views/showBooking.action", params);
            }
        },
        {
            id: "flydubai",
            name: "flydubai",
            home: "https://www.flydubai.com/en/",
            match: /flydubai/i,
            hubs: ["dxb"],
            url(opts) {
                return withQuery("https://www.flydubai.com/en/book/", {
                    origin: upper(opts.origin),
                    destination: upper(opts.dest),
                    departureDate: toISODate(opts.depart),
                    returnDate: opts.tripType === "oneway" ? "" : toISODate(opts.returnDate)
                });
            }
        },
        {
            id: "singapore",
            name: "Singapore Airlines",
            home: "https://www.singaporeair.com/",
            match: /singapore/i,
            hubs: ["sin"],
            url(opts) {
                return withQuery("https://www.singaporeair.com/en_UK/bd/home", {
                    origin: upper(opts.origin),
                    destination: upper(opts.dest),
                    departureDate: toISODate(opts.depart),
                    returnDate: opts.tripType === "oneway" ? "" : toISODate(opts.returnDate)
                });
            }
        },
        {
            id: "scoot",
            name: "Scoot",
            home: "https://www.flyscoot.com/",
            match: /scoot/i,
            hubs: ["sin"],
            url(opts) {
                return withQuery("https://www.flyscoot.com/", {
                    origin: upper(opts.origin),
                    destination: upper(opts.dest),
                    departDate: toISODate(opts.depart),
                    returnDate: opts.tripType === "oneway" ? "" : toISODate(opts.returnDate)
                });
            }
        },
        {
            id: "thai",
            name: "Thai Airways",
            home: "https://www.thaiairways.com",
            match: /thai airways/i,
            hubs: ["bkk"],
            url(opts) {
                return withQuery("https://www.thaiairways.com", {
                    origin: upper(opts.origin),
                    destination: upper(opts.dest),
                    departDate: toISODate(opts.depart),
                    returnDate: opts.tripType === "oneway" ? "" : toISODate(opts.returnDate)
                });
            }
        },
        {
            id: "airasia",
            name: "AirAsia",
            home: "https://www.airasia.com",
            match: /airasia|air asia/i,
            hubs: ["dmk", "kul", "bkk"],
            url(opts) {
                const params = {
                    origin: upper(opts.origin),
                    destination: upper(opts.dest),
                    departDate: toDmySlash(opts.depart),
                    tripType: opts.tripType === "oneway" ? "O" : "R",
                    adult: "1",
                    child: "0",
                    infant: "0",
                    locale: "en-gb"
                };
                if (opts.tripType !== "oneway" && opts.returnDate) {
                    params.returnDate = toDmySlash(opts.returnDate);
                }
                return withQuery("https://www.airasia.com/flights/search", params);
            }
        },
        {
            id: "indigo",
            name: "IndiGo",
            home: "https://www.goindigo.in",
            match: /indigo/i,
            hubs: ["del", "ccu", "bom", "maa", "blr", "hyd"],
            url(opts) {
                return withQuery("https://www.goindigo.in/", {
                    origin: upper(opts.origin),
                    destination: upper(opts.dest),
                    departureDate: toDmySlash(opts.depart),
                    returnDate: opts.tripType === "oneway" ? "" : toDmySlash(opts.returnDate)
                });
            }
        },
        {
            id: "airindia",
            name: "Air India",
            home: "https://www.airindia.com",
            match: /air india/i,
            hubs: ["del", "ccu", "bom"],
            url(opts) {
                return withQuery("https://www.airindia.com", {
                    origin: upper(opts.origin),
                    destination: upper(opts.dest),
                    departDate: toISODate(opts.depart),
                    returnDate: opts.tripType === "oneway" ? "" : toISODate(opts.returnDate)
                });
            }
        },
        {
            id: "turkish",
            name: "Turkish Airlines",
            home: "https://www.turkishairlines.com/",
            match: /turkish/i,
            hubs: ["ist"],
            url(opts) {
                const params = {
                    origin: upper(opts.origin),
                    destination: upper(opts.dest),
                    outDate: toDotDate(opts.depart),
                    adult: "1",
                    cabin: "ECONOMY"
                };
                if (opts.tripType !== "oneway" && opts.returnDate) {
                    params.returnDate = toDotDate(opts.returnDate);
                }
                return withQuery("https://www.turkishairlines.com/en-int/flights/booking/", params);
            }
        },
        {
            id: "malaysia",
            name: "Malaysia Airlines",
            home: "https://www.malaysiaairlines.com/",
            match: /malaysia airlines/i,
            hubs: ["kul"],
            url(opts) {
                return withQuery("https://www.malaysiaairlines.com/", {
                    origin: upper(opts.origin),
                    destination: upper(opts.dest),
                    departDate: toISODate(opts.depart),
                    returnDate: opts.tripType === "oneway" ? "" : toISODate(opts.returnDate)
                });
            }
        },
        {
            id: "saudia",
            name: "Saudia",
            home: "https://www.saudia.com/",
            match: /saudia|saudi/i,
            hubs: ["jed", "ruh"],
            url(opts) {
                return withQuery("https://www.saudia.com/", {
                    origin: upper(opts.origin),
                    destination: upper(opts.dest),
                    departDate: toISODate(opts.depart),
                    returnDate: opts.tripType === "oneway" ? "" : toISODate(opts.returnDate)
                });
            }
        }
    ];

    function findAirlineByName(name, website) {
        const blob = `${name || ""} ${website || ""}`;
        return AIRLINE_DIRECTORY.find((airline) => airline.match.test(blob));
    }

    function airlinesForRoute(opts) {
        const o = lower(opts.origin);
        const d = lower(opts.dest);
        const listed = Array.isArray(opts.knownAirlines) ? opts.knownAirlines : [];
        const picked = [];
        const seen = new Set();

        function add(airline) {
            if (!airline || seen.has(airline.id)) return;
            seen.add(airline.id);
            picked.push({
                id: airline.id,
                name: airline.name,
                home: airline.home,
                url: airline.url(opts)
            });
        }

        listed.forEach((item) => {
            const matched = findAirlineByName(item.name, item.website);
            if (matched) add(matched);
        });

        AIRLINE_DIRECTORY.forEach((airline) => {
            if (airline.relevant && airline.relevant(o, d)) add(airline);
            if (Array.isArray(airline.hubs) && (airline.hubs.includes(o) || airline.hubs.includes(d))) {
                add(airline);
            }
        });

        return picked.slice(0, 8);
    }

    function comparatorLinks(opts) {
        return [
            {
                id: "google-flights",
                name: "Google Flights",
                blurb: "Filled From/To/dates via tfs, cheap-first. Live fare is on Google — we do not invent a ৳ amount.",
                url: googleFlightsUrl(opts)
            },
            {
                id: "skyscanner",
                name: "Skyscanner",
                blurb: "Airports and YYMMDD in the path, sorted cheapest. Compare live prices there.",
                url: skyscannerUrl(opts)
            },
            {
                id: "kayak",
                name: "Kayak",
                blurb: "Same airports and dates, sorted cheapest (price_a). Buy on the provider Kayak opens.",
                url: kayakUrl(opts)
            }
        ];
    }

    function bangladeshSearchLinks(opts) {
        return [
            {
                id: "gozayaan",
                name: "GoZayaan",
                blurb: "Official Bangladesh search with these airports and dates. Live fare is on GoZayaan.",
                url: gozayaanUrl(opts)
            }
        ];
    }

    const AIRLINE_OFFER_PAGES = {
        usbangla: {
            name: "US-Bangla official offers",
            url: "https://usbair.com/offers",
            blurb: "Current US-Bangla sale/promo pages. Confirm the live fare and any code on their site."
        },
        novoair: {
            name: "Novoair official offers",
            url: "https://www.flynovoair.com/offers",
            blurb: "Novoair current-offers list. Validity and price are only on Novoair."
        },
        airastra: {
            name: "AIR ASTRA fares & offers",
            url: "https://www.airastra.com/node?field_offers_type_target_id=All",
            blurb: "AIR ASTRA official deals list. Check blackout dates there before you buy."
        },
        qatar: {
            name: "Qatar Airways offers (Bangladesh)",
            url: "https://www.qatarairways.com/en-bd/offers.html",
            blurb: "Official Qatar sale/offers hub for Bangladesh. Live fare is on Qatar Airways."
        },
        emirates: {
            name: "Emirates special offers (Bangladesh)",
            url: "https://www.emirates.com/bd/english/special-offers/",
            blurb: "Official Emirates special-offers page for Bangladesh. Verify the live fare there."
        },
        turkish: {
            name: "Turkish Airlines campaigns",
            url: "https://www.turkishairlines.com/en-int/flights/campaigns/",
            blurb: "Official Turkish Airlines campaign list. Confirm dates and fare on their site."
        },
        flydubai: {
            name: "flydubai offers",
            url: "https://www.flydubai.com/en/offers/",
            blurb: "Official flydubai offers hub. Live price is on flydubai."
        }
    };

    function officialDiscountLinks(opts) {
        const hubs = [
            {
                id: "gozayaan-city-amex",
                name: "GoZayaan × City Bank Amex",
                blurb: "Official GoZayaan campaign (listed valid through 31 Dec 2026). Confirm it still applies at their checkout — we do not subtract it here.",
                url: "https://gozayaan.com/campaign/id/644"
            },
            {
                id: "airastra-bank-bkash",
                name: "AIR ASTRA bank / bKash / Nagad fares",
                blurb: "Official AIR ASTRA page for bank-card, bKash and Nagad base-fare discounts. Verify eligibility there.",
                url: "https://airastra.com/offer/offers-deals/10-discount-base-fare"
            },
            {
                id: "bkash-campaigns",
                name: "bKash campaign list",
                blurb: "Official bKash Find Your Offer page. Check whether a travel/flight campaign is running this week.",
                url: "https://www.bkash.com/en/campaign"
            },
            {
                id: "brac-bank-offers",
                name: "BRAC Bank offers",
                blurb: "Official BRAC Bank offers hub (cards, travel partners). Confirm the live campaign on the bank site.",
                url: "https://www.bracbank.com/en/offers"
            },
            {
                id: "citybank-travel",
                name: "City Bank travel offers",
                blurb: "City Bank official travel/Amex page pointing at GoZayaan. Verify current terms on City Bank.",
                url: "https://www.citybankplc.com/ramadan2026/travel.php"
            }
        ];
        const seen = new Set(hubs.map((item) => item.url));
        airlinesForRoute(opts).forEach((airline) => {
            const offer = AIRLINE_OFFER_PAGES[airline.id];
            if (!offer || seen.has(offer.url)) return;
            seen.add(offer.url);
            hubs.push({
                id: `${airline.id}-offers`,
                name: offer.name,
                blurb: offer.blurb,
                url: offer.url
            });
        });
        return hubs;
    }

    function hotelLinks(opts) {
        return [
            {
                id: "google-hotels",
                name: "Google Hotels",
                blurb: "Compare stays for these check-in / check-out dates.",
                url: googleHotelsUrl(opts)
            },
            {
                id: "booking",
                name: "Booking.com",
                blurb: "Open dated hotel search on Booking.com.",
                url: bookingUrl(opts)
            }
        ];
    }

    function addDaysISO(iso, days) {
        const { y, m, day } = fromISO(iso);
        const dt = new Date(y, m - 1, day);
        dt.setDate(dt.getDate() + days);
        return toISODate(dt);
    }

    return {
        BD_AIRPORTS,
        AIRLINE_DIRECTORY,
        toISODate,
        toSkyDate,
        googleFlightsUrl,
        encodeGoogleFlightsTfs,
        skyscannerUrl,
        kayakUrl,
        googleHotelsUrl,
        bookingUrl,
        gozayaanUrl,
        airlinesForRoute,
        comparatorLinks,
        bangladeshSearchLinks,
        officialDiscountLinks,
        hotelLinks,
        addDaysISO,
        stayLengthDays,
        flexibleNearbyDays,
        flexibleMonthDays,
        skyscannerMonthUrl,
        kayakExploreUrl,
        monthOverviewLinks,
        dateLinkBundle
    };
});
