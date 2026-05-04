# Getting Started with the API

Guide to getting started with the API. Covers authentication, requests, responses, common errors.

## Prerequisites

Before you begin, install and configure following prerequisites:

- Node.js version 18 or higher
- npm version 9 or higher
- Valid API key (obtain from developer portal at https://api.example.com/keys)
- Basic knowledge of REST APIs and HTTP protocols

## Authentication

All API requests need valid auth token. Two methods supported:

### API Key Authentication

Authenticate with API key in `Authorization` header:

```http
Authorization: Bearer YOUR_API_KEY_HERE
```

API key properties:
- Do not expire unless manually revoked
- Tied to specific permission scopes
- Create up to 10 API keys per account
- Each key can be restricted to specific IP addresses

### OAuth 2.0

Applications accessing API on behalf of users: OAuth 2.0 authorization code flow. Steps:

1. Redirect user to authorization URL: `https://auth.example.com/oauth/authorize`
2. Include following parameters in redirect: `client_id`, `redirect_uri`, `scope`, `state`
3. After authorization, user redirected back to your `redirect_uri` with authorization code
4. Exchange authorization code for access token by making POST request to `https://auth.example.com/oauth/token`
5. Use access token to make API requests on behalf of user

## Making Requests

### Base URL

All API requests to base URL:

```
https://api.example.com/v2
```

Version 1 API deprecated, removed January 15, 2027.

### Request Format

Requests use JSON format. Include `Content-Type: application/json` header for requests with body.

### Rate Limiting

API rate limits:

| Plan | Requests per minute | Requests per day |
|------|---------------------|------------------|
| Free | 60 | 10,000 |
| Pro | 300 | 100,000 |
| Enterprise | 1,000 | Unlimited |

Exceeding rate limit returns `429 Too Many Requests`. Response includes `Retry-After` header with seconds to wait.

## Common Endpoints

### List Resources

```http
GET /resources
```

Paginated list of resources. Query parameters:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)
- `sort`: Sort field (default: `created_at`)
- `order`: Sort order (`asc` or `desc`)

### Create Resource

```http
POST /resources
Content-Type: application/json

{
  "name": "My Resource",
  "description": "A description of the resource",
  "tags": ["tag1", "tag2"]
}
```

## Error Handling

API uses standard HTTP status codes. Error responses include JSON body with following fields:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request body is invalid",
    "details": [
      {
        "field": "name",
        "message": "Name is required"
      }
    ]
  }
}
```
