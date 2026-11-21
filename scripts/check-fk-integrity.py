import sqlite3

conn = sqlite3.connect('prisma/dev.db')
c = conn.cursor()

# Check User FKs
checks = [
    ('Session', 'userId'),
    ('PasswordResetToken', 'userId'),
    ('HouseholdProfile', 'userId'),
    ('SavedRoutine', 'userId'),
    ('ImpactLog', 'userId'),
    ('CommunityReport', 'userId'),
    ('CommunityUpvote', 'userId'),
    ('RecommendationRecord', 'userId'),
    ('RecommendationFeedback', 'userId'),
    ('Conversation', 'userId')
]

for child, col in checks:
    c.execute(f'SELECT COUNT(*) FROM "{child}" WHERE "{col}" IS NOT NULL AND "{col}" NOT IN (SELECT id FROM "User");')
    orphans = c.fetchone()[0]
    print(f'{child}.{col} orphaned: {orphans}')

# Check HouseholdMember FK
c.execute('SELECT COUNT(*) FROM "HouseholdMember" WHERE "householdId" NOT IN (SELECT id FROM "HouseholdProfile");')
print('HouseholdMember.householdId orphaned:', c.fetchone()[0])

# Check CommunityUpvote FK
c.execute('SELECT COUNT(*) FROM "CommunityUpvote" WHERE "reportId" NOT IN (SELECT id FROM "CommunityReport");')
print('CommunityUpvote.reportId orphaned:', c.fetchone()[0])

# Check RecommendationFeedback FK
c.execute('SELECT COUNT(*) FROM "RecommendationFeedback" WHERE "recommendationId" IS NOT NULL AND "recommendationId" NOT IN (SELECT id FROM "RecommendationRecord");')
print('RecommendationFeedback.recommendationId orphaned:', c.fetchone()[0])

# Check ConversationMessage FK
c.execute('SELECT COUNT(*) FROM "ConversationMessage" WHERE "conversationId" NOT IN (SELECT id FROM "Conversation");')
print('ConversationMessage.conversationId orphaned:', c.fetchone()[0])

conn.close()
