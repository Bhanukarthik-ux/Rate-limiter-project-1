# DynamoDB schema

Table name: `RateLimiterEvents`

Primary key:
- `requestId` — String (partition key)

Attributes:
- `timestamp` — Number
- `statusCode` — Number
- `eventType` — String

For the simplified project, only successful requests that reach Lambda are stored.
If API Gateway throttles a request first, that request returns HTTP 429 before Lambda executes.
The dashboard keeps a client-side log so the demo can show both 200 and 429 results.

Suggested table settings:
- On-demand capacity
- Region: `us-east-1` (unless faculty specifies another supported region)
