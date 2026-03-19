# Using AIGodfather with n8n

Monitor your n8n workflows with AIGodfather.

## Setup

1. In n8n, add an **HTTP Request** node
2. Configure it as follows:

### Connection Settings

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `https://aigodfather.com/api/v1/events` |

### Headers

| Header | Value |
|--------|-------|
| `Authorization` | `Bearer agf_live_YOUR_KEY` |
| `Content-Type` | `application/json` |

### Body (JSON)

```json
{
  "eventType": "workflow_completed",
  "severity": "low",
  "message": "n8n workflow finished",
  "metadata": {
    "workflowId": "{{ $workflow.id }}",
    "workflowName": "{{ $workflow.name }}",
    "executionId": "{{ $execution.id }}"
  },
  "tags": ["n8n", "automation"]
}
```

## Error Handling

Add an **Error Trigger** node and connect it to an HTTP Request node:

```json
{
  "eventType": "workflow_error",
  "severity": "high",
  "message": "n8n workflow failed: {{ $json.error.message }}",
  "metadata": {
    "workflowId": "{{ $workflow.id }}",
    "workflowName": "{{ $workflow.name }}",
    "errorNode": "{{ $json.error.node }}",
    "errorMessage": "{{ $json.error.message }}"
  },
  "tags": ["n8n", "error"]
}
```

## Severity Mapping

| Scenario | Severity |
|----------|----------|
| Workflow completed | `low` |
| Slow execution (> 30s) | `medium` |
| Workflow failed | `high` |
| Critical workflow failed | `critical` |

## Ping / Test Connection

To test your API key, send a GET request:

| Field | Value |
|-------|-------|
| Method | `GET` |
| URL | `https://aigodfather.com/api/v1/ping` |
| Header | `Authorization: Bearer agf_live_YOUR_KEY` |

A successful response returns your agent info and usage limits.
