/**
 * Dated search URLs only. No fare math, no scraping, no invented discounts.
 * Providers confirm the live price on their own pages.
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

    function googleFlightsUrl(opts) {
        const o = upper(opts.origin);
        const d = upper(opts.dest);
        const dep = toISODate(opts.depart);
        const ret = opts.returnDate ? toISODate(opts.returnDate) : "";
        const stop = opts.stop ? upper(opts.stop) : "";
        let q;
        if (opts.tripType === "oneway") {
            q = `Flights to ${d} from ${o} on ${dep} oneway`;
        } else if (opts.tripType === "multicity" && stop && ret) {
            q = `Multi-city flights ${o} to ${d} on ${dep}, ${d} to ${stop} on ${ret}`;
        } else {
            q = `Flights to ${d} from ${o} on ${dep} through ${ret}`;
        }
        return `https://www.google.com/travel/flights?q=${encodeURIComponent(q)}`;
    }

    function skyscannerUrl(opts) {
        const o = lower(opts.origin);
        const d = lower(opts.dest);
        const dep = toSkyDate(opts.depart);
        if (opts.tripType === "oneway") {
            return `https://www.skyscanner.net/transport/flights/${o}/${d}/${dep}/?adultsv2=1&cabinclass=economy`;
        }
        if (opts.tripType === "multicity" && opts.stop && opts.returnDate) {
            const s = lower(opts.stop);
            const ret = toSkyDate(opts.returnDate);
            return `https://www.skyscanner.net/transport/flights/${o}/${d}/${dep}/${d}/${s}/${ret}/?adultsv2=1&cabinclass=economy`;
        }
        const ret = toSkyDate(opts.returnDate);
        return `https://www.skyscanner.net/transport/flights/${o}/${d}/${dep}/${ret}/?adultsv2=1&cabinclass=economy`;
    }

    function kayakUrl(opts) {
        const o = upper(opts.origin);
        const d = upper(opts.dest);
        const dep = toISODate(opts.depart);
        if (opts.tripType === "oneway") {
            return `https://www.kayak.com/flights/${o}-${d}/${dep}?sort=bestflight_a`;
        }
        if (opts.tripType === "multicity" && opts.stop && opts.returnDate) {
            const s = upper(opts.stop);
            const ret = toISODate(opts.returnDate);
            return `https://www.kayak.com/flights/${o}-${d}/${dep}/${d}-${s}/${ret}?sort=bestflight_a`;
        }
        const ret = toISODate(opts.returnDate);
        return `https://www.kayak.com/flights/${o}-${d}/${dep}/${ret}?sort=bestflight_a`;
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

    function shareTripUrl(opts) {
        const o = upper(opts.origin);
        const d = upper(opts.dest);
        const dep = toISODate(opts.depart);
        if (opts.tripType === "oneway") {
            return `https://sharetrip.net/flight/search?tripType=OneWay&origin=${o}&destination=${d}&departDate=${dep}&adults=1`;
        }
        if (opts.tripType === "multicity") {
            return "https://sharetrip.net/flight";
        }
        const ret = toISODate(opts.returnDate);
        return `https://sharetrip.net/flight/search?tripType=RoundTrip&origin=${o}&destination=${d}&departDate=${dep}&returnDate=${ret}&adults=1`;
    }

    function gozayaanUrl(opts) {
        const o = upper(opts.origin);
        const d = upper(opts.dest);
        const dep = toISODate(opts.depart);
        const params = new URLSearchParams({
            origin: o,
            destination: d,
            departDate: dep,
            adult: "1"
        });
        if (opts.tripType === "oneway") {
            params.set("tripType", "1");
        } else if (opts.tripType === "multicity") {
            return "https://gozayaan.com/";
        } else {
            params.set("tripType", "2");
            params.set("returnDate", toISODate(opts.returnDate));
        }
        return `https://gozayaan.com/?${params.toString()}`;
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
                const departing = toDayMonYear(opts.depart);
                const params = {
                    origin: upper(opts.origin),
                    destination: upper(opts.dest),
                    departing,
                    adults: "1",
                    children: "0",
                    class: "Economy"
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
                blurb: "Compare airlines on Google with these dates pre-filled.",
                url: googleFlightsUrl(opts)
            },
            {
                id: "skyscanner",
                name: "Skyscanner",
                blurb: "Meta-search the same route and dates.",
                url: skyscannerUrl(opts)
            },
            {
                id: "kayak",
                name: "Kayak",
                blurb: "Another independent comparison of the same search.",
                url: kayakUrl(opts)
            }
        ];
    }

    function bangladeshSearchLinks(opts) {
        return [
            {
                id: "sharetrip",
                name: "ShareTrip",
                blurb: "Bangladesh OTA — open their search with these dates.",
                url: shareTripUrl(opts)
            },
            {
                id: "gozayaan",
                name: "GoZayaan",
                blurb: "Bangladesh OTA — confirm live fare on their site.",
                url: gozayaanUrl(opts)
            }
        ];
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
        skyscannerUrl,
        kayakUrl,
        googleHotelsUrl,
        bookingUrl,
        shareTripUrl,
        gozayaanUrl,
        airlinesForRoute,
        comparatorLinks,
        bangladeshSearchLinks,
        hotelLinks,
        addDaysISO
    };
});
