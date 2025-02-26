import requests
from django.conf import settings

class PaystackAPI:
    BASE_URL = "https://api.paystack.co"
    HEADERS = {
        "Authorization": f"Bearer {settings.PAYSTACK_SECRET_KEY}",
        "Content-Type": "application/json",
    }

    @staticmethod
    def initialize_transaction(email, amount, reference, callback_url):
        url = f"{PaystackAPI.BASE_URL}/transaction/initialize"
        data = {
            "email": email,
            "amount": int(amount * 100),  # Paystack uses kobo (cents)
            "currency": "KES",
            "reference": reference,
            "callback_url": callback_url,
        }
        response = requests.post(url, json=data, headers=PaystackAPI.HEADERS)
        return response.json()

    @staticmethod
    def verify_transaction(reference):
        url = f"{PaystackAPI.BASE_URL}/transaction/verify/{reference}"
        response = requests.get(url, headers=PaystackAPI.HEADERS)
        return response.json()