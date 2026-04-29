"""
Loyallia — Shared Test Fixtures (pytest conftest)
Provides reusable fixtures for pytest-based tests.
Django TestCase setUp methods are used for Django-native tests.
"""

import pytest
from django.test import RequestFactory

from tests.factories import (
    make_card,
    make_customer,
    make_customer_pass,
    make_full_stack,
    make_plan,
    make_subscription,
    make_tenant,
    make_user,
)


@pytest.fixture
def request_factory():
    """Django RequestFactory for unit-testing views/middleware."""
    return RequestFactory()


@pytest.fixture
def tenant(db):
    """Create a tenant."""
    return make_tenant()


@pytest.fixture
def owner_user(tenant, db):
    """Create an OWNER user for the tenant."""
    return make_user(tenant=tenant, role="OWNER")


@pytest.fixture
def plan(db):
    """Create a subscription plan."""
    return make_plan()


@pytest.fixture
def subscription(tenant, plan, db):
    """Create an active subscription."""
    return make_subscription(tenant, plan=plan)


@pytest.fixture
def stamp_card(tenant, db):
    """Create a stamp card."""
    return make_card(tenant, card_type="stamp")


@pytest.fixture
def customer(tenant, db):
    """Create a customer."""
    return make_customer(tenant)


@pytest.fixture
def customer_pass(customer, stamp_card, db):
    """Create a customer pass."""
    return make_customer_pass(customer, stamp_card)


@pytest.fixture
def full_stack(db):
    """Create a complete test stack: tenant, user, subscription, card, customer, pass."""
    return make_full_stack()
