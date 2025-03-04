from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
from django.utils import timezone
from .models import Wallet, Transaction
from .paystack import PaystackAPI
import uuid
from decimal import Decimal
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet
from io import BytesIO

@login_required
def fund_wallet(request):
    if request.method == "POST":
        amount = request.POST.get("amount")
        reference = str(uuid.uuid4())
        callback_url = request.build_absolute_uri('/wallet/callback/')

        response = PaystackAPI.initialize_transaction(
            email=request.user.email,
            amount=float(amount),
            reference=reference,
            callback_url=callback_url
        )

        if response.get("status"):
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
        return redirect("wallet_dashboard")

    response = PaystackAPI.verify_transaction(reference)
    if response.get("status") and response["data"]["status"] == "success":
        transaction = Transaction.objects.get(reference=reference)
        if transaction.status == "pending":
            amount = Decimal(response["data"]["amount"] / 100)
            transaction.status = "completed"
            transaction.save()
            transaction.wallet.balance += amount
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
                    amount = Decimal(payload["data"]["amount"] / 100)
                    transaction.status = "completed"
                    transaction.save()
                    transaction.wallet.balance += amount
                    transaction.wallet.save()
            except Transaction.DoesNotExist:
                pass
        return HttpResponse(status=200)
    return HttpResponse(status=400)

@login_required
def wallet_dashboard(request):
    wallet = request.user.wallet
    transactions = Transaction.objects.filter(wallet=wallet).order_by('-created_at')
    context = {
        "wallet": wallet,
        "transactions": transactions,
    }
    return render(request, "wallet/dashboard.html", context)

@login_required
def preview_receipt(request, transaction_id):
    try:
        transaction = Transaction.objects.get(id=transaction_id, wallet=request.user.wallet)
    except Transaction.DoesNotExist:
        return JsonResponse({"error": "Transaction not found"}, status=404)

    receipt_data = {
        "user_email": request.user.email,
        "type": transaction.transaction_type,
        "amount": str(transaction.amount),
        "currency": transaction.wallet.currency,
        "reference": transaction.reference,
        "status": transaction.status,
        "date": transaction.created_at.strftime('%Y-%m-%d %H:%M:%S'),
    }
    return JsonResponse(receipt_data)

@login_required
def generate_receipt(request, transaction_id):
    try:
        transaction = Transaction.objects.get(id=transaction_id, wallet=request.user.wallet)
    except Transaction.DoesNotExist:
        return HttpResponse("Transaction not found", status=404)

    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    styles = getSampleStyleSheet()
    elements = []

    elements.append(Paragraph("Transaction Receipt", styles['Heading1']))
    elements.append(Spacer(1, 12))
    elements.append(Paragraph(f"User: {request.user.email}", styles['Normal']))
    elements.append(Paragraph(f"Type: {transaction.transaction_type}", styles['Normal']))
    elements.append(Paragraph(f"Amount: {transaction.amount} {transaction.wallet.currency}", styles['Normal']))
    elements.append(Paragraph(f"Reference: {transaction.reference}", styles['Normal']))
    elements.append(Paragraph(f"Status: {transaction.status}", styles['Normal']))
    elements.append(Paragraph(f"Date: {transaction.created_at.strftime('%Y-%m-%d %H:%M:%S')}", styles['Normal']))

    doc.build(elements)
    pdf = buffer.getvalue()
    buffer.close()

    response = HttpResponse(pdf, content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="receipt_{transaction.reference}.pdf"'
    return response

@login_required
def preview_statement(request):
    wallet = request.user.wallet
    transactions = Transaction.objects.filter(wallet=wallet).order_by('-created_at')

    # Statement data for preview
    statement_data = {
        "user_email": request.user.email,
        "balance": str(wallet.balance),
        "currency": wallet.currency,
        "generated_on": timezone.now().strftime('%Y-%m-%d %H:%M:%S'),
        "transactions": [
            {
                "date": tx.created_at.strftime('%Y-%m-%d %H:%M'),
                "type": tx.transaction_type,
                "amount": str(tx.amount),
                "reference": tx.reference,
                "status": tx.status,
            } for tx in transactions
        ],
    }
    return JsonResponse(statement_data)

@login_required
def generate_statement(request):
    wallet = request.user.wallet
    transactions = Transaction.objects.filter(wallet=wallet).order_by('-created_at')

    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    styles = getSampleStyleSheet()
    elements = []

    elements.append(Paragraph("Wallet Statement", styles['Heading1']))
    elements.append(Spacer(1, 12))
    elements.append(Paragraph(f"User: {request.user.email}", styles['Normal']))
    elements.append(Paragraph(f"Balance: {wallet.balance} {wallet.currency}", styles['Normal']))
    elements.append(Paragraph(f"Generated on: {timezone.now().strftime('%Y-%m-%d %H:%M:%S')}", styles['Normal']))
    elements.append(Spacer(1, 24))

    if transactions.exists():
        data = [["Date", "Type", "Amount", "Reference", "Status"]]
        for tx in transactions:
            data.append([
                tx.created_at.strftime('%Y-%m-%d %H:%M'),
                tx.transaction_type,
                f"{tx.amount} {wallet.currency}",
                tx.reference,
                tx.status,
            ])

        table = Table(data)
        table.setStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ])
        elements.append(table)
    else:
        elements.append(Paragraph("No transactions found.", styles['Normal']))

    doc.build(elements)
    pdf = buffer.getvalue()
    buffer.close()

    response = HttpResponse(pdf, content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="statement_{request.user.email}_{timezone.now().strftime('%Y%m%d')}.pdf"'
    return response