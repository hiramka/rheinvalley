import os
import sys
import re
import urllib.parse

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def parse_full_url(raw_text):
    """
    Parses full connection string and extracts exact host, ref, password, port, db name
    """
    raw_text = raw_text.strip().replace('DATABASE_URL=', '').replace('"', '').replace("'", "")
    
    if 'postgres://' in raw_text or 'postgresql://' in raw_text:
        # Match postgresql://user:pass@host:port/dbname
        match = re.search(r'postgres(?:ql)?://([^:]+):([^@]+)@([^:/]+)(?::(\d+))?/(.+)', raw_text)
        if match:
            user = match.group(1)
            raw_pass = urllib.parse.unquote_plus(match.group(2))
            host = match.group(3)
            port = match.group(4) or '5432'
            dbname = match.group(5)

            # Re-encode password safely
            encoded_pass = urllib.parse.quote_plus(raw_pass)
            clean_url = f"postgresql://{user}:{encoded_pass}@{host}:{port}/{dbname}"
            return clean_url, host, user

    return None, None, None

def main():
    print("=" * 65)
    print(" 🏥 CityCare Hospital — Supabase PostgreSQL Setup Wizard")
    print("=" * 65)
    print("\nPaste your full Supabase Connection String.\n")

    user_input = input("Paste your Supabase Connection String: ").strip()

    if not user_input:
        print("❌ Input cannot be empty!")
        sys.exit(1)

    clean_url, host, user = parse_full_url(user_input)

    if not clean_url:
        print("❌ Invalid connection string format.")
        print("Please copy the complete connection string from Supabase Settings -> Database -> Connection String.")
        sys.exit(1)

    # Save to backend/.env
    env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env')
    with open(env_path, 'w') as f:
        f.write(f"DATABASE_URL={clean_url}\n")
        f.write("FLASK_ENV=development\n")
        f.write("SECRET_KEY=prod-secret-citycare-hospital-pos-kenya-2026-strong\n")
        f.write("JWT_SECRET_KEY=prod-jwt-secret-citycare-hospital-pos-kenya-2026-strong\n")

    print(f"\n✓ Saved database URL to backend/.env")
    print(f"Connecting to Supabase Host: {host}...")

    os.environ['DATABASE_URL'] = clean_url

    from app import create_app
    from app.models import db

    app = create_app()

    with app.app_context():
        try:
            print("Creating database schema and tables on Supabase...")
            db.create_all()
            print("✓ Database tables created successfully on Supabase!")

            from seed import seed_database
            seed_database()

            print("\n" + "=" * 65)
            print(" 🎉 SUCCESS! Supabase PostgreSQL Database Seeded & Connected!")
            print("=" * 65)

        except Exception as e:
            print(f"\n❌ Connection or Database Error: {e}")
            print("\nPlease verify your Supabase Database Password and try running `py backend/setup_supabase.py` again.")

if __name__ == '__main__':
    main()
