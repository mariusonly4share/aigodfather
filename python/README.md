# AIGodfather Python SDK

Official Python SDK for [AIGodfather](https://aigodfather.ai) —
AI Agent Monitoring & EU AI Act Compliance Platform.

## Installation

```bash
pip install aigodfather
```

## Quick Start

```python
from aigodfather import AIGodfather

ai = AIGodfather(api_key='agf_live_...')

# Check connection
status = ai.ping()
print(f"Connected: {status['agentName']}")
print(f"Events remaining: {status['limits']['remaining']}")

# Track events
ai.info('Server started', {'version': '1.0.0'})
ai.warning('High memory', {'percent': 87})
ai.error('Payment failed', {'order_id': 'ord_123'})
ai.critical('Database down')

# Custom event
ai.track(
    'user_signup',
    severity='low',
    message='New user registered',
    metadata={'plan': 'trial', 'country': 'RO'},
    user_id='user_456',
    tags=['signup']
)
```

## Configuration

```python
ai = AIGodfather(
    api_key='agf_live_...',                  # required
    base_url='https://api.aigodfather.ai',   # optional
    debug=False,                              # optional — enable debug logging
    timeout=10,                               # optional — request timeout in seconds
    default_tags=['production'],              # optional — tags added to every event
    default_metadata={'env': 'prod'}          # optional — metadata merged into every event
)
```

## API

| Method | Description |
|--------|-------------|
| `ai.ping()` | Test connection, get agent info & limits |
| `ai.track(event_type, ...)` | Send a custom event |
| `ai.info(message, metadata?)` | Info-level event (severity: low) |
| `ai.warning(message, metadata?)` | Warning event (severity: medium) |
| `ai.error(message, metadata?)` | Error event (severity: high) |
| `ai.critical(message, metadata?)` | Critical event (severity: critical) |

## Framework Examples

- [Basic usage](./examples/basic.py)
- [FastAPI middleware](./examples/fastapi_example.py)
- [Django middleware](./examples/django_example.py)

## Get Your API Key

1. Sign up at [https://aigodfather.ai](https://aigodfather.ai)
2. Create an agent
3. Go to Agent → Connection → API Keys
4. Generate key → copy it

## License

MIT — see [LICENSE](../LICENSE)
