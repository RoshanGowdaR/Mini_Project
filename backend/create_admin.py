import getpass
import os

import bcrypt
from dotenv import load_dotenv
from supabase import create_client

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"), override=True)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
  raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_KEY are required")

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

email = input("Admin email: ").strip().lower()
full_name = input("Full name: ").strip()
password = getpass.getpass("Password: ")
confirm = getpass.getpass("Confirm password: ")

if password != confirm:
  raise ValueError("Passwords do not match")

password_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds=12)).decode("utf-8")

supabase.table("admin_users").insert({
  "email": email,
  "full_name": full_name,
  "password_hash": password_hash,
}).execute()

print("Admin user created.")
