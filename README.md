# Product 35 — API Rate Limiting & Throttle Monitor

## Project purpose

A software-only cloud dashboard that lets a user generate API traffic and clearly see when requests are allowed or throttled after the configured request limit is exceeded.

### Hardware-to-software mapping

| Original hardware | Simplified project |
|---|---|
| ESP32 | Browser/dashboard |
| Physical button | Dashboard request buttons |
| Physical LED | Animated dashboard indicator |
| Hardware request generator | Software request simulator |
| AWS IoT Core | Removed from MVP; future scope |

## Main cloud flow

`Dashboard → API Gateway → Lambda → DynamoDB`

Recommended AWS services for the MVP:
- S3 — host the static dashboard
- API Gateway — receive API requests
- Lambda — process allowed requests
- DynamoDB — store allowed-request records

AWS IoT Core, ESP32, physical LED, EC2 and other advanced services are intentionally excluded from the first version.

## Demo flow

1. Open the dashboard.
2. Explain that the default limit is 10 requests/second.
3. Click **Send 1 Request** and show `200 OK`.
4. Click **Send 10 Requests** and show allowed requests.
5. Click **Generate Burst** or **Run Full Demo**.
6. Show `429 THROTTLED` and the blinking indicator.
7. Show the request log.
8. If the AWS backend is deployed, switch to AWS Live API and demonstrate real API Gateway responses.

## Important implementation note

The default Demo Simulation is local browser logic. It is intended for UI/demo development before AWS is connected.

When AWS Live API mode is used:
- API Gateway can enforce a Usage Plan throttle and return `429`.
- Requests that pass API Gateway reach Lambda and can be stored in DynamoDB.
- Requests rejected by API Gateway do not reach Lambda, so they will not appear in DynamoDB. The dashboard log still records the 429 response.

## Suggested Usage Plan

For a classroom demonstration, use a small test value such as:
- Rate: 10 requests/second
- Burst: a small value appropriate for the demo

Keep the dashboard's simulation limit aligned with the AWS Usage Plan when comparing Demo Simulation and AWS Live API modes.

## Learner Lab discipline

Use the course-supported region and avoid unnecessary paid/running resources. S3, Lambda and DynamoDB are suitable small-demo services according to the supplied course guide.

## Future scope

An ESP32, physical button, physical LED and AWS IoT Core can be added later to replace the software simulation. This is intentionally not part of the MVP.
