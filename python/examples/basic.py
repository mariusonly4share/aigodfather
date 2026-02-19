import os
from aigodfather import AIGodfather

ai = AIGodfather(
    api_key=os.environ['AIGODFATHER_API_KEY'],
    debug=True
)

# Check connection
status = ai.ping()
print(f"Connected: {status['agentName']}")
print(f"Events remaining: {status['limits']['remaining']}")

# Track events
ai.info('App started', {'version': '1.0.0'})
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
