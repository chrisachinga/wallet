from django.urls import path
from . import views

app_name = "wallet"
urlpatterns = [
    path("fund/", views.fund_wallet, name="fund_wallet"),
    path("callback/", views.payment_callback, name="payment_callback"),
    path("webhook/", views.paystack_webhook, name="paystack_webhook"),
    path("balance/", views.wallet_balance, name="wallet_balance"),
]