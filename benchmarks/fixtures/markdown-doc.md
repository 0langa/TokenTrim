# Getting Started with the API

This document provides a comprehensive guide to getting started with the API. It covers authentication, making requests, handling responses, and common error scenarios.

## Prerequisites

Before you begin, please make sure you have the following prerequisites installed and configured on your system:

- Node.js version 18 or higher
- npm version 9 or higher
- A valid API key (obtain one from the developer portal at https://api.example.com/keys)
- Basic knowledge of REST APIs and HTTP protocols

## Authentication

All API requests must include a valid authentication token. There are two methods of authentication that are currently supported:

### API Key Authentication

To authenticate using an API key, include the key in the `Authorization` header of your request:

```http
Authorization: Bearer YOUR_API_KEY_HERE
```

API keys are associated with your account and have the following properties:
- They do not expire unless you manually revoke them
- They are tied to specific permission scopes
- You can create up to 10 API keys per account
- Each key can be restricted to specific IP addresses

### OAuth 2.0

For applications that need to access the API on behalf of users, we support the OAuth 2.0 authorization code flow. The following steps describe the process:

1. Redirect the user to the authorization URL: `https://auth.example.com/oauth/authorize`
2. Include the following parameters in the redirect: `client_id`, `redirect_uri`, `scope`, `state`
3. After authorization, the user will be redirected back to your `redirect_uri` with an authorization code
4. Exchange the authorization code for an access token by making a POST request to `https://auth.example.com/oauth/token`
5. Use the access token to make API requests on behalf of the user

## Making Requests

### Base URL

All API requests should be made to the following base URL:

```
https://api.example.com/v2
```

Note: Version 1 of the API is deprecated and will be removed on January 15, 2027.

### Request Format

Requests should be made using JSON format. Include the `Content-Type: application/json` header for all requests that include a body.

### Rate Limiting

The API enforces the following rate limits:

| Plan | Requests per minute | Requests per day |
|------|---------------------|------------------|
| Free | 60 | 10,000 |
| Pro | 300 | 100,000 |
| Enterprise | 1,000 | Unlimited |

When you exceed a rate limit, the API returns a `429 Too Many Requests` status code. The response includes a `Retry-After` header indicating how many seconds to wait before retrying.

## Common Endpoints

### List Resources

```http
GET /resources
```

Returns a paginated list of resources. Supports the following query parameters:
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

The API uses standard HTTP status codes to indicate the success or failure of a request. Error responses include a JSON body with the following fields:

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
