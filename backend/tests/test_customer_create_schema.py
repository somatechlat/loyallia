"""CustomerCreateIn name mapping — FormBuilder `name` → first/last.

FormBuilder default fields submit `name` (single field). The public enroll
page still sends empty first_name/last_name alongside it. The schema must
split `name` instead of returning 422.
"""

import pytest
from pydantic import ValidationError

from apps.customers.schemas import CustomerCreateIn


@pytest.mark.django_db
class TestCustomerCreateInNameMapping:
    def test_formbuilder_name_splits_into_first_and_last(self):
        data = CustomerCreateIn.model_validate(
            {
                "first_name": "",
                "last_name": "",
                "email": "maria@example.com",
                "name": "Maria Lopez",
                "privacy_accepted": True,
            }
        )
        assert data.first_name == "Maria"
        assert data.last_name == "Lopez"
        # Original `name` is preserved for form_fields required checks.
        assert data.model_dump().get("name") == "Maria Lopez"

    def test_single_word_name_allows_empty_last_name(self):
        data = CustomerCreateIn.model_validate(
            {
                "first_name": "",
                "last_name": "",
                "email": "madonna@example.com",
                "name": "Madonna",
            }
        )
        assert data.first_name == "Madonna"
        assert data.last_name == ""

    def test_classic_first_last_still_works(self):
        data = CustomerCreateIn.model_validate(
            {
                "first_name": "Ana",
                "last_name": "Ruiz",
                "email": "ana@example.com",
            }
        )
        assert data.first_name == "Ana"
        assert data.last_name == "Ruiz"

    def test_first_name_only_is_accepted(self):
        data = CustomerCreateIn.model_validate(
            {
                "first_name": "Solo",
                "last_name": "",
                "email": "solo@example.com",
            }
        )
        assert data.first_name == "Solo"
        assert data.last_name == ""

    def test_all_names_empty_rejected(self):
        with pytest.raises(ValidationError):
            CustomerCreateIn.model_validate(
                {
                    "first_name": "",
                    "last_name": "",
                    "email": "none@example.com",
                }
            )

    def test_whitespace_name_rejected(self):
        with pytest.raises(ValidationError):
            CustomerCreateIn.model_validate(
                {
                    "first_name": "   ",
                    "last_name": "   ",
                    "email": "none@example.com",
                    "name": "   ",
                }
            )

    def test_explicit_first_name_wins_over_name(self):
        data = CustomerCreateIn.model_validate(
            {
                "first_name": "Explicit",
                "last_name": "Person",
                "email": "exp@example.com",
                "name": "Ignored Name",
            }
        )
        assert data.first_name == "Explicit"
        assert data.last_name == "Person"
