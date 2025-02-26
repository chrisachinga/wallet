from django.db.models.signals import post_save
from django.dispatch import receiver
from django.conf import settings
from .models import Wallet

@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def create_user_wallet(sender, instance, created, **kwargs):
    """
    Automatically create a wallet for a new user upon registration.
    """
    print(f"Signal triggered for {instance.email}, created={created}")
    if created and not hasattr(instance, 'wallet'):
        Wallet.objects.create(user=instance)
        print(f"Wallet created for {instance.email}")