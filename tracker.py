import os
import sys
import json

# উইন্ডোজ টার্মিনালে বাংলা ও ইমোজি সাপোর্ট
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8')

# গ্লোবাল ব্যাংক ও কার্ড পার্টনারশিপ ডাটাবেস
BANK_CARD_OFFERS = {
    "City Bank Amex": {"discount_percent": 10, "max_discount": 50, "code": "AMEXTRIPS"},
    "EBL Visa/Mastercard": {"discount_percent": 12, "max_discount": 60, "code": "EBLFLY"},
    "Standard Chartered": {"discount_percent": 15, "max_discount": 75, "code": "SCBTRAVEL"},
    "Standard": {"discount_percent": 0, "max_discount": 0, "code": "NONE"}
}

# গ্লোবাল প্রোমো কোড ডাটাবেস
ACTIVE_PROMO_CODES = [
    {"code": "GLOBALFLY10", "min_spend": 200, "discount_usd": 20, "description": "Global Flight Promo"},
    {"code": "HOTELDEAL25", "min_spend": 150, "discount_usd": 25, "description": "Worldwide Hotel Promo"},
    {"code": "LASTMIN50", "min_spend": 300, "discount_usd": 50, "description": "Last-Minute Deal Promo"}
]

def search_best_travel_deals(origin, destination, travel_type="flight", user_card="Standard"):
    print("=" * 60)
    print(f"🌍 SEARCHING: {origin.upper()} ➡️ {destination.upper()} ({travel_type.upper()})")
    print("=" * 60)

    # নমুনা ডিল সিমুলেশন (API ডেটা স্যাম্পল)
    base_price = 280  # স্ট্যান্ডার্ড মার্কেট প্রাইস (USD)
    last_minute_drop = 40  # লাস্ট মিনিট প্রাইস ড্রপ
    current_lowest = base_price - last_minute_drop

    # ১. ব্যাংক কার্ড ডিসকাউন্ট ক্যালকুলেশন
    card_info = BANK_CARD_OFFERS.get(user_card, BANK_CARD_OFFERS["Standard"])
    card_discount = min((current_lowest * card_info["discount_percent"]) / 100, card_info["max_discount"])
    
    # ২. প্রোমো কোড নির্বাচন
    applied_promo = None
    promo_discount = 0
    for promo in ACTIVE_PROMO_CODES:
        if current_lowest >= promo["min_spend"]:
            applied_promo = promo
            promo_discount = promo["discount_usd"]
            break

    # ৩. ফাইনাল ডিসকাউন্টেড প্রাইস
    final_price = current_lowest - card_discount - promo_discount
    total_saved = (base_price - final_price)

    print(f"\n✈️ Route: {origin} -> {destination}")
    print(f"💰 Standard Airline Price: ${base_price}")
    print(f"🔥 Last-Minute Deal Price: ${current_lowest} (Save ${last_minute_drop})")
    
    if card_discount > 0:
        print(f"💳 Bank Offer ({user_card}): -${card_discount} (Code: {card_info['code']})")
    
    if applied_promo:
        print(f"🏷️ Promo Code Applied ({applied_promo['code']}): -${promo_discount}")

    print("-" * 60)
    print(f"🎯 FINAL LOWEST PAYABLE PRICE: ${final_price}")
    print(f"🎉 TOTAL SAVINGS: ${total_saved} ({(total_saved/base_price)*100:.1f}% OFF)")
    print(f"🔗 Direct Booking Link: https://www.skyscanner.net/transport/flights/{origin.lower()}/{destination.lower()}/")
    print("=" * 60 + "\n")

if __name__ == "__main__":
    # টেস্ট রান: ঢাকা থেকে ব্যাংকক (EBL কার্ড দিয়ে)
    search_best_travel_deals(origin="DAC", destination="BKK", travel_type="flight", user_card="EBL Visa/Mastercard")