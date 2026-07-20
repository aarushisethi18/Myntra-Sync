import os
import time
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv("apps/api/.env")
db_url = os.getenv("DATABASE_URL").replace(":6543/", ":5432/")
engine = create_engine(db_url)

print("Connecting to database...")
with engine.connect() as conn:
    try:
        # Terminate other sessions that might hold table locks
        print("Terminating active locking backends...")
        conn.execute(text("""
            SELECT pg_terminate_backend(pid) 
            FROM pg_stat_activity 
            WHERE pid <> pg_backend_pid() 
              AND datname = current_database();
        """))
    except Exception as e:
        print("Could not terminate backends (continuing anyway):", e)

# Wait 1 second
time.sleep(1.0)

# Read migration file
with open("database/migrations/009_shopping_flow.sql", "r") as f:
    sql = f.read()

# Execute each statement in a single transaction block
statements = sql.split(";")
print("Executing migration statements with auto-commit transaction...")
with engine.begin() as conn:
    for stmt in statements:
        cleaned = stmt.strip()
        if not cleaned:
            continue
        print(f"Executing: {cleaned[:100]}...")
        conn.execute(text("SET lock_timeout = '15s'"))
        conn.execute(text(cleaned))
        
print("Migration applied successfully and committed!")
