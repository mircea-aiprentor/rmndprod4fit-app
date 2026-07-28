"""Idempotent Stripe catalog setup for Panou Antrenor subscription tiers (RON)."""
import os
import stripe
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).parent / ".env")
stripe.api_key = os.environ["STRIPE_SECRET_KEY"]

CATALOG = [
    {
        "emergent_product_id": "coach_plan",
        "name": "Coach",
        "tax_code": "txcd_10103001",
        "prices": [{"lookup_key": "coach_monthly", "amount": 8900, "currency": "ron", "interval": "month"}],
    },
    {
        "emergent_product_id": "coach_plus_plan",
        "name": "Coach +",
        "tax_code": "txcd_10103001",
        "prices": [{"lookup_key": "coach_plus_monthly", "amount": 33900, "currency": "ron", "interval": "month"}],
    },
    {
        "emergent_product_id": "gym_studio_plan",
        "name": "Gym / Studio",
        "tax_code": "txcd_10103001",
        "prices": [{"lookup_key": "gym_studio_monthly", "amount": 79900, "currency": "ron", "interval": "month"}],
    },
]


def get_or_create_product(entry):
    for p in stripe.Product.list(active=True).auto_paging_iter():
        if p.to_dict().get("metadata", {}).get("emergent_product_id") == entry["emergent_product_id"]:
            return p
    return stripe.Product.create(
        name=entry["name"], tax_code=entry.get("tax_code"),
        metadata={"managed_by": "emergent", "emergent_product_id": entry["emergent_product_id"]},
    )


def run():
    for entry in CATALOG:
        product = get_or_create_product(entry)
        for p in entry["prices"]:
            existing = stripe.Price.list(lookup_keys=[p["lookup_key"]], active=True, limit=1).data
            if existing and (existing[0].unit_amount != p["amount"] or existing[0].currency != p["currency"]):
                stripe.Price.modify(existing[0].id, active=False)
                existing = []
            if not existing:
                stripe.Price.create(
                    product=product.id, unit_amount=p["amount"], currency=p["currency"],
                    lookup_key=p["lookup_key"], transfer_lookup_key=True,
                    recurring={"interval": p["interval"]},
                )
        print(f"OK: {entry['name']}")


if __name__ == "__main__":
    run()
