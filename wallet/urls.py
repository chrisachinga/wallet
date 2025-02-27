from django.urls import path
from . import views

app_name = "wallet"
urlpatterns = [
    path("fund/", views.fund_wallet, name="fund_wallet"),
    path("callback/", views.payment_callback, name="payment_callback"),
    path("webhook/", views.paystack_webhook, name="paystack_webhook"),
    path("dashboard/", views.wallet_dashboard, name="wallet_dashboard"),
    path("preview/<int:transaction_id>/", views.preview_receipt, name="preview_receipt"),
    path("receipt/<int:transaction_id>/", views.generate_receipt, name="generate_receipt"),
    path("statement/preview/", views.preview_statement, name="preview_statement"),  # New preview endpoint
    path("statement/", views.generate_statement, name="generate_statement"),
]