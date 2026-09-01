import sys

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")


def sky_date(iso_date):
    year, month, day = iso_date.split("-")
    return f"{year[2:]}{month}{day}"


def search_links(origin, destination, depart, return_date=None, trip_type="round"):
    origin = origin.upper()
    destination = destination.upper()
    o = origin.lower()
    d = destination.lower()

    if trip_type == "oneway":
        google = (
            "https://www.google.com/travel/flights?q="
            f"Flights%20to%20{destination}%20from%20{origin}%20on%20{depart}%20oneway"
        )
        skyscanner = (
            f"https://www.skyscanner.net/transport/flights/{o}/{d}/{sky_date(depart)}/"
            "?adultsv2=1&cabinclass=economy"
        )
        kayak = f"https://www.kayak.com/flights/{origin}-{destination}/{depart}?sort=bestflight_a"
    else:
        google = (
            "https://www.google.com/travel/flights?q="
            f"Flights%20to%20{destination}%20from%20{origin}%20on%20{depart}%20through%20{return_date}"
        )
        skyscanner = (
            f"https://www.skyscanner.net/transport/flights/{o}/{d}/"
            f"{sky_date(depart)}/{sky_date(return_date)}/?adultsv2=1&cabinclass=economy"
        )
        kayak = (
            f"https://www.kayak.com/flights/{origin}-{destination}/{depart}/{return_date}"
            "?sort=bestflight_a"
        )

    print("=" * 60)
    print(f"Route: {origin} -> {destination} ({trip_type})")
    print("This tool does not sell tickets or invent fares.")
    print("Open a provider with these dates and compare the live price there.")
    print("-" * 60)
    print(f"Google Flights: {google}")
    print(f"Skyscanner:     {skyscanner}")
    print(f"Kayak:          {kayak}")
    print(f"Biman official: https://www.biman-airlines.com/?origin={origin}&destination={destination}&departDate={depart}")
    print("=" * 60)


if __name__ == "__main__":
    search_links(origin="DAC", destination="BKK", depart="2026-09-08", return_date="2026-09-17")
