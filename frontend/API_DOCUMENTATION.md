# API Endpoints

## Contractors

**GET** `/api/contractors` - Get all contractors (includes metorial_oauth_session_id)

**GET** `/api/contractors/[id]` - Get a single contractor by ID (includes metorial_oauth_session_id)

**POST** `/api/contractors` - Create a new contractor (optionally include metorialOAuthSessionId)

**PUT** `/api/contractors/[id]` - Update a contractor (optionally update metorialOAuthSessionId)

**DELETE** `/api/contractors/[id]` - Delete a contractor

**GET** `/api/contractors/search?githubLogin=xxx&walletAddress=xxx&repoName=xxx&role=xxx` - Search contractors by filters (includes metorial_oauth_session_id)