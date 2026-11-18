import json
import os
import time
import uuid
import boto3

TABLE_NAME = os.environ.get("TABLE_NAME", "RateLimiterEvents")
dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(TABLE_NAME)

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,X-Api-Key",
    "Access-Control-Allow-Methods": "GET,OPTIONS"
}

def handler(event, context):
    if event and event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 204, "headers": CORS_HEADERS, "body": ""}

    request_id = str(uuid.uuid4())
    timestamp = int(time.time())

    item = {
        "requestId": request_id,
        "timestamp": timestamp,
        "statusCode": 200,
        "eventType": "ALLOWED"
    }

    try:
        table.put_item(Item=item)
    except Exception as exc:
        print(f"WARNING: DynamoDB logging failed: {exc}")

    return {
        "statusCode": 200,
        "headers": {**CORS_HEADERS, "Content-Type": "application/json"},
        "body": json.dumps({
            "requestId": request_id,
            "message": "Request accepted",
            "timestamp": timestamp
        })
    }
