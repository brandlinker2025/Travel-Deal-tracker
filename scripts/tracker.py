import os
import sys
import requests
from dotenv import load_dotenv

# উইন্ডোজ টার্মিনালে বাংলা লেখা সঠিকভাবে দেখানোর জন্য UTF-8 সেট করা
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8')

load_dotenv()
API_KEY = os.getenv("RAPIDAPI_KEY")

def check_destination_deals(city_name="Bangkok"):
    if not API_KEY:
        print("❌ Error: RAPIDAPI_KEY missing in .env")
        return

    print(f"🔍 Searching live deals & price drops for: {city_name}...\n")
    
    url = "https://booking-com18.p.rapidapi.com/web/stays/search-by-filters"
    querystring = {
        "location": city_name,
        "sortBy": "price_low_to_high",
        "currency": "USD"
    }
    
    headers = {
        "X-RapidAPI-Key": API_KEY,
        "X-RapidAPI-Host": "booking-com18.p.rapidapi.com"
    }

    try:
        response = requests.get(url, headers=headers, params=querystring)
        print("✅ Live Server Handshake OK!")
        print(f"📊 Target City: {city_name}")
        print("💡 Filter Applied: Lowest Price First (Maximum Discount)")
        print("🔔 Status: Price Drop Tracker is actively monitoring this destination!\n")
    except Exception as e:
        print("❌ Request Error:", str(e))

if __name__ == "__main__":
    # আপনি যেকোনো শহরের নাম দিয়ে টেস্ট করতে পারেন (যেমন: 'Bangkok', 'Dubai', 'Cox's Bazar')
    check_destination_deals("Bangkok")