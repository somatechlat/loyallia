"""
AI App URL Configuration

Wires up the 4 AI endpoints under /api/v1/ai/.
"""

from django.urls import path

from apps.ai import views

urlpatterns = [
    path("generate-template/", views.generate_template, name="ai_generate_template"),
    path("suggest-colors/", views.suggest_colors, name="ai_suggest_colors"),
    path("critique-design/", views.critique_design, name="ai_critique_design"),
    path("suggest-stamp-icons/", views.suggest_stamp_icons, name="ai_suggest_stamp_icons"),
    path("suggest-layout/", views.suggest_layout, name="ai_suggest_layout"),
]
