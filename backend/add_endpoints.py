import os

# Create Serializer
serializers_content = """
from rest_framework import serializers
from .models import OwnerSettings

class OwnerSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = OwnerSettings
        fields = '__all__'
"""
with open(r'c:\Projects\Cafe_manager\backend\accounts\serializers.py', 'a') as f:
    f.write('\n' + serializers_content + '\n')


# Create View
views_content = """
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import OwnerSettings
from .serializers import OwnerSettingsSerializer
from rest_framework.permissions import IsAuthenticated

class OwnerSettingsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        settings = OwnerSettings.load()
        serializer = OwnerSettingsSerializer(settings)
        return Response(serializer.data)

    def put(self, request):
        settings = OwnerSettings.load()
        serializer = OwnerSettingsSerializer(settings, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
"""
with open(r'c:\Projects\Cafe_manager\backend\accounts\views.py', 'a') as f:
    f.write('\n' + views_content + '\n')


# Add URL
with open(r'c:\Projects\Cafe_manager\backend\accounts\urls.py', 'r') as f:
    urls_content = f.read()

urls_content = urls_content.replace('from .views import (', 'from .views import (\n    OwnerSettingsView,')
urls_content = urls_content.replace("path('auth/branch-manager-login/', BranchManagerLoginView.as_view(), name='auth_branch_manager_login'),", "path('auth/branch-manager-login/', BranchManagerLoginView.as_view(), name='auth_branch_manager_login'),\n    path('owner/settings/', OwnerSettingsView.as_view(), name='owner_settings'),")

with open(r'c:\Projects\Cafe_manager\backend\accounts\urls.py', 'w') as f:
    f.write(urls_content)

print("Added Serializer, View and URL for OwnerSettings.")
