# API Endpoints

## Contractors

**GET** `/api/contractors` - Get all contractors (includes repo_owner and metorial_oauth_session_id)

**GET** `/api/contractors/[id]` - Get a single contractor by ID (includes repo_owner and metorial_oauth_session_id)

**POST** `/api/contractors` - Create a new contractor (requires repoOwner, optionally include metorialOAuthSessionId)

**PUT** `/api/contractors/[id]` - Update a contractor (optionally update repoOwner and metorialOAuthSessionId)

**DELETE** `/api/contractors/[id]` - Delete a contractor

**GET** `/api/contractors/search?githubLogin=xxx&walletAddress=xxx&repoName=xxx&role=xxx` - Search contractors by filters (includes repo_owner and metorial_oauth_session_id)