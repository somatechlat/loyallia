"""
Tenant slug generation tests.

Tenant.slug is unique and has no default. Creating a Tenant without a slug
must not persist an empty string (which collides on the next create).
"""

from __future__ import annotations

import pytest

from apps.tenants.models import Tenant


@pytest.mark.django_db
def test_tenant_save_generates_slug_when_blank():
    tenant = Tenant.objects.create(
        name="Test Cafe",
        email="slug-a@test.com",
        phone="1234567890",
    )
    assert tenant.slug
    assert tenant.slug != ""


@pytest.mark.django_db
def test_tenant_slug_unique_across_same_name():
    a = Tenant.objects.create(
        name="Same Name", email="slug-b@test.com", phone="1234567890"
    )
    b = Tenant.objects.create(
        name="Same Name", email="slug-c@test.com", phone="1234567890"
    )
    assert a.slug
    assert b.slug
    assert a.slug != b.slug


@pytest.mark.django_db
def test_tenant_slug_preserved_when_provided():
    tenant = Tenant.objects.create(
        name="Explicit",
        slug="explicit-slug-xyz",
        email="slug-d@test.com",
        phone="1234567890",
    )
    assert tenant.slug == "explicit-slug-xyz"
