import sqlite3

def init_db():
    conn = sqlite3.connect("cache.db", check_same_thread=False)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS cache (
            prompt TEXT PRIMARY KEY,
            response TEXT
        )
    """)
    conn.commit()
    return conn

db = init_db()

def get_cached_response(prompt: str):
    cursor = db.execute("SELECT response FROM cache WHERE prompt = ?", (prompt,))
    row = cursor.fetchone()
    return row[0] if row else None

def set_cached_response(prompt: str, response: str):
    db.execute("INSERT OR REPLACE INTO cache (prompt, response) VALUES (?, ?)", (prompt, response))
    db.commit()