from django.shortcuts import render
from django.contrib.auth.decorators import login_required

def landing_page(request):
    return render(request, "index.html")

# protected view
@login_required
def dashboard_landing_page(request):
    return render(request, "dashboard.html")