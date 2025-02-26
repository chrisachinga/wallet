# wallet/views.py
from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
from .models import Wallet, Transaction
from .paystack import PaystackAPI
import uuid
from decimal import Decimal  # Import Decimal

@login_required
def fund_wallet(request):
    if request.method == "POST":
        amount = request.POST.get("amount")
        reference = str(uuid.uuid4())
        callback_url = request.build_absolute_uri('/wallet/callback/')

        # Initialize Paystack transaction
        response = PaystackAPI.initialize_transaction(
            email=request.user.email,
            amount=float(amount),
            reference=reference,
            callback_url=callback_url
        )

        if response.get("status"):
            # Save transaction
            Transaction.objects.create(
                wallet=request.user.wallet,
                amount=amount,
                transaction_type="DEPOSIT",
                reference=reference
            )
            return redirect(response["data"]["authorization_url"])
        return JsonResponse({"error": "Failed to initialize payment"}, status=400)

    return render(request, "wallet/fund_wallet.html")

@login_required
def payment_callback(request):
    reference = request.GET.get("reference")
    if not reference:
        return redirect("wallet_balance")

    # Verify transaction with Paystack
    response = PaystackAPI.verify_transaction(reference)
    if response.get("status") and response["data"]["status"] == "success":
        transaction = Transaction.objects.get(reference=reference)
        if transaction.status == "pending":
            amount = Decimal(response["data"]["amount"] / 100)  # Convert float to Decimal
            transaction.status = "completed"
            transaction.save()
            transaction.wallet.balance += amount  # Now both are Decimal
            transaction.wallet.save()
            return render(request, "wallet/success.html")
    return render(request, "wallet/failure.html")

@csrf_exempt
def paystack_webhook(request):
    if request.method == "POST":
        event = request.body.decode("utf-8")
        import json
        payload = json.loads(event)
        
        if payload["event"] == "charge.success":
            reference = payload["data"]["reference"]
            try:
                transaction = Transaction.objects.get(reference=reference)
                if transaction.status == "pending":
                    amount = Decimal(payload["data"]["amount"] / 100)  # Convert float to Decimal
                    transaction.status = "completed"
                    transaction.save()
                    transaction.wallet.balance += amount  # Now both are Decimal
                    transaction.wallet.save()
            except Transaction.DoesNotExist:
                pass
        return HttpResponse(status=200)
    return HttpResponse(status=400)

@login_required
def wallet_balance(request):
    wallet = request.user.wallet
    return render(request, "wallet/balance.html", {"wallet": wallet})