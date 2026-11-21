import sqlite3
import json

conn = sqlite3.connect('prisma/dev.db')
cursor = conn.cursor()

tables = [
    'User', 'Session', 'PasswordResetToken', 'HouseholdProfile', 'HouseholdMember',
    'AirQualitySnapshot', 'SavedRoutine', 'ImpactLog', 'CommunityReport', 'CommunityUpvote',
    'RecommendationRecord', 'RecommendationFeedback', 'Conversation', 'ConversationMessage'
]

schema_info = {}
for t in tables:
    cursor.execute(f'PRAGMA table_info("{t}");')
    cols = [(col[1], col[2]) for col in cursor.fetchall()]
    # Fetch 1 sample row
    cursor.execute(f'SELECT * FROM "{t}" LIMIT 1;')
    sample = cursor.fetchone()
    schema_info[t] = {
        'columns': cols,
        'sample': sample
    }

print(json.dumps(schema_info, indent=2, default=str))
conn.close()
