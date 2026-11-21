import sqlite3
import json

conn = sqlite3.connect('prisma/dev.db')
cursor = conn.cursor()

cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';")
tables = [row[0] for row in cursor.fetchall()]

results = {}
for t in sorted(tables):
    cursor.execute(f'SELECT COUNT(*) FROM "{t}";')
    cnt = cursor.fetchone()[0]
    results[t] = cnt

print(json.dumps(results, indent=2))
conn.close()
