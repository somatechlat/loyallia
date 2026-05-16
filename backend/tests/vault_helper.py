"""
Loyallia — Test Vault Credential Helper

Vault stores SYSTEM secrets only:
  - Twilio credentials, Apple certs, Google Wallet secrets, API keys

User passwords are managed by Django/RBAC in the database.
NEVER fetch user passwords from Vault.
"""
