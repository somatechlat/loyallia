import os
import json
import jwt
from pathlib import Path
import time
from cryptography.hazmat.primitives import serialization

def test_google_wallet_config():
    sa_path = "/app/certs/google_wallet_service_account.json"
    issuer_id = "3388000000023113505"
    
    print(f"--- Diagnosing Google Wallet Configuration ---")
    print(f"Target Path: {sa_path}")
    
    if not os.path.exists(sa_path):
        print(f"❌ ERROR: File does not exist at {sa_path}")
        return

    print(f"✅ SUCCESS: File exists at {sa_path}")
    
    try:
        with open(sa_path, "r") as f:
            data = json.load(f)
        print(f"✅ SUCCESS: File is valid JSON")
        
        pk = data.get("private_key")
        email = data.get("client_email")
        
        if not pk:
            print("❌ ERROR: 'private_key' is missing from JSON")
        else:
            print("✅ SUCCESS: 'private_key' found")
            
        if not email:
            print("❌ ERROR: 'client_email' is missing from JSON")
        else:
            print(f"✅ SUCCESS: 'client_email' found: {email}")
            
        # Test JWT signing
        claims = {
            "iss": email,
            "aud": "google",
            "typ": "savetowallet",
            "iat": int(time.time()),
            "origins": [],
            "payload": {
                "loyaltyClasses": [],
                "loyaltyObjects": []
            }
        }
        
        token = jwt.encode(claims, pk, algorithm="RS256")
        print(f"✅ SUCCESS: JWT signed successfully with RS256")
        print(f"Token sample: {token[:20]}...")
        
    except Exception as e:
        print(f"❌ ERROR: Exception during diagnostic: {str(e)}")

if __name__ == "__main__":
    test_google_wallet_config()
