import os
from aigodfather import AIGodfather

ai = AIGodfather(api_key=os.environ['AIGODFATHER_API_KEY'])

# middleware.py
class AIGodfatherMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        if response.status_code >= 500:
            ai.error(f'HTTP {response.status_code}', {
                'path': request.path,
                'method': request.method
            })
        return response

# Add to MIDDLEWARE in settings.py:
# 'yourapp.middleware.AIGodfatherMiddleware'
