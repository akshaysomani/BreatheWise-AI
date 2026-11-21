import sqlite3
import psycopg2
import psycopg2.extras
from datetime import datetime, timezone
import sys
import json

def parse_datetime(val):
    if val is None:
        return None
    if isinstance(val, (int, float)):
        return datetime.fromtimestamp(val / 1000.0, tz=timezone.utc).replace(tzinfo=None)
    if isinstance(val, str):
        try:
            # Check if string of digits
            if val.isdigit():
                return datetime.fromtimestamp(int(val) / 1000.0, tz=timezone.utc).replace(tzinfo=None)
            # Try ISO format
            dt = datetime.fromisoformat(val.replace('Z', '+00:00'))
            return dt.astimezone(timezone.utc).replace(tzinfo=None)
        except Exception:
            return None
    return val

def parse_bool(val):
    if val is None:
        return None
    if isinstance(val, bool):
        return val
    if isinstance(val, (int, float)):
        return bool(val)
    if isinstance(val, str):
        return val.lower() in ('1', 'true', 't', 'yes')
    return bool(val)

def main():
    print("--- BreatheWise AI: SQLite to PostgreSQL Migration ---")
    
    # 1. Connect to SQLite
    sqlite_conn = sqlite3.connect('prisma/dev.db')
    sqlite_cursor = sqlite_conn.cursor()
    
    # 2. Connect to PostgreSQL (Reads DATABASE_URL or defaults to challenge_6)
    import os
    db_url = os.environ.get("DATABASE_URL")
    if db_url:
        pg_conn = psycopg2.connect(db_url)
    else:
        pg_conn = psycopg2.connect(
            dbname=os.environ.get("PGDATABASE", "challenge_6"),
            user=os.environ.get("PGUSER", "postgres"),
            password=os.environ.get("PGPASSWORD", ""),
            host=os.environ.get("PGHOST", "127.0.0.1"),
            port=int(os.environ.get("PGPORT", 5432))
        )
    pg_conn.autocommit = False
    pg_cursor = pg_conn.cursor()
    pg_cursor.execute("SET TIME ZONE 'UTC';")
    
    table_order = [
        # Level 0
        'User',
        'AirQualitySnapshot',
        # Level 1
        'Session',
        'PasswordResetToken',
        'HouseholdProfile',
        'SavedRoutine',
        'ImpactLog',
        'CommunityReport',
        'RecommendationRecord',
        'Conversation',
        # Level 2
        'HouseholdMember',
        'CommunityUpvote',
        'RecommendationFeedback',
        'ConversationMessage'
    ]
    
    # Clean PostgreSQL target tables before migration
    print("Truncating target PostgreSQL tables...")
    for t in reversed(table_order):
        pg_cursor.execute(f'TRUNCATE TABLE "{t}" CASCADE;')
    pg_conn.commit()
    print("All target tables truncated successfully.")

    reconciliation_results = {}

    for table in table_order:
        print(f"\nMigrating table '{table}'...")
        sqlite_cursor.execute(f'PRAGMA table_info("{table}");')
        col_info = sqlite_cursor.fetchall()
        col_names = [col[1] for col in col_info]
        col_types = {col[1]: col[2].upper() for col in col_info}

        sqlite_cursor.execute(f'SELECT COUNT(*) FROM "{table}";')
        sqlite_count = sqlite_cursor.fetchone()[0]

        if sqlite_count == 0:
            print(f"  Empty table in SQLite (0 rows). Skipping data transfer.")
            reconciliation_results[table] = {
                'sqlite_count': 0,
                'pg_count': 0,
                'status': 'PASS'
            }
            continue

        sqlite_cursor.execute(f'SELECT * FROM "{table}";')
        rows = sqlite_cursor.fetchall()

        transformed_rows = []
        for row in rows:
            transformed_row = []
            for col_name, val in zip(col_names, row):
                ctype = col_types[col_name]
                if 'DATETIME' in ctype or col_name.endswith('At') or col_name == 'date' or col_name == 'measurementTimestamp':
                    transformed_row.append(parse_datetime(val))
                elif 'BOOLEAN' in ctype or col_name.startswith('has') or col_name.startswith('is'):
                    transformed_row.append(parse_bool(val))
                else:
                    transformed_row.append(val)
            transformed_rows.append(tuple(transformed_row))

        # Insert into PostgreSQL
        cols_str = ', '.join([f'"{c}"' for c in col_names])
        placeholders = ', '.join(['%s'] * len(col_names))
        insert_query = f'INSERT INTO "{table}" ({cols_str}) VALUES ({placeholders});'

        psycopg2.extras.execute_batch(pg_cursor, insert_query, transformed_rows, page_size=500)
        pg_conn.commit()

        # Verify count in PostgreSQL
        pg_cursor.execute(f'SELECT COUNT(*) FROM "{table}";')
        pg_count = pg_cursor.fetchone()[0]

        status = 'PASS' if pg_count == sqlite_count else 'FAIL'
        print(f"  Migrated {pg_count}/{sqlite_count} rows. Status: {status}")

        reconciliation_results[table] = {
            'sqlite_count': sqlite_count,
            'pg_count': pg_count,
            'status': status
        }

    sqlite_conn.close()
    pg_conn.close()

    print("\n--- Migration Reconciliation Summary ---")
    all_passed = True
    total_sqlite = 0
    total_pg = 0
    for tbl, res in reconciliation_results.items():
        print(f"  {tbl:25} SQLite: {res['sqlite_count']:6} | PG: {res['pg_count']:6} | Status: {res['status']}")
        total_sqlite += res['sqlite_count']
        total_pg += res['pg_count']
        if res['status'] != 'PASS':
            all_passed = False

    print(f"\nTOTAL ROWS MIGRATED: {total_pg} / {total_sqlite}")
    print(f"OVERALL RECONCILIATION RESULT: {'ALL TABLES PASSED (100% RECONCILED)' if all_passed else 'FAILED'}")

    # Save reconciliation report as JSON for documentation
    with open('scripts/reconciliation_results.json', 'w') as f:
        json.dump(reconciliation_results, f, indent=2)

    if not all_passed:
        sys.exit(1)

if __name__ == '__main__':
    main()
