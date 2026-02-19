import os, time
from aigodfather import AIGodfather
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

ai = AIGodfather(api_key=os.environ['AIGODFATHER_API_KEY'])
app = FastAPI()

@app.middleware('http')
async def monitor(request: Request, call_next):
    start = time.time()
    try:
        response = await call_next(request)
        ms = (time.time() - start) * 1000
        if ms > 2000:
            ai.warning('Slow request', {
                'path': str(request.url.path),
                'duration_ms': round(ms)
            })
        return response
    except Exception as e:
        ai.critical(str(e), {'path': str(request.url.path)})
        return JSONResponse({'error': 'Internal error'}, 500)

@app.on_event('startup')
async def startup():
    ai.info('FastAPI server started')

@app.on_event('shutdown')
async def shutdown():
    ai.info('FastAPI server stopping')
