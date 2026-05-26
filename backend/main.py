import logging
import socket
import uvicorn
import argparse
from fastapi import FastAPI
from routers import health, websocket

parser_args = argparse.ArgumentParser()
parser_args.add_argument("--debug", action="store_true")
args, unknown = parser_args.parse_known_args()

# Configure logging
logging.basicConfig(level=logging.DEBUG if args.debug else logging.INFO)
logger = logging.getLogger("scryer.main")

app = FastAPI(title="Scryer Waveform Debugger API")

# Register Routers
app.include_router(health.router)
app.include_router(websocket.router)

if __name__ == "__main__":
    # OS-assigned ephemeral port negotiation
    # We bind to port 0 to let the OS pick a free port, avoiding collisions if the user
    # runs multiple instances of Scryer.
    sock = socket.socket()
    sock.bind(('127.0.0.1', 0))
    port = sock.getsockname()[1]
    sock.close()
    
    # Write the assigned port to a hidden file so the Electron main process can read it
    # and inject it into the React frontend.
    print(f"SCRYER_PORT={port}", flush=True)
    with open(".scryer_port", "w") as f:
        f.write(str(port))
        
    # Start the ASGI server
    uvicorn.run(app, host="127.0.0.1", port=port)
