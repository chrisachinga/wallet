from django.contrib import admin
from django.conf import settings
from django.conf.urls.static import static
from django.urls import path, include

urlpatterns = [
    path('', include('app.urls')),
    path('admin/', admin.site.urls),
    path('accounts/', include('allauth.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)


SITE_NAME = "Django Stater Template"
admin.site.site_header = SITE_NAME
admin.site.index_title = SITE_NAME + "Dashboard"
admin.site.site_title = SITE_NAME + "Dashboard"