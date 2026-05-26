import json
import logging
from fastapi import APIRouter, WebSocket
from services.waveform_service import WaveformService
from models import WebSocketRequest

router = APIRouter()
logger = logging.getLogger("scryer.websocket")

# Instantiate global service (for now hardcoded to the sample VCD)
# In a real app, the user would upload or select this file.
waveform_service = WaveformService("tests/example_waveforms/swerv1.vcd")

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for real-time waveform data streaming.
    The Electron frontend connects here to request metadata and lazy-load signal transitions.
    """
    await websocket.accept()
    logger.debug("WebSocket client connected.")
    try:
        while True:
            text_data = await websocket.receive_text()
            logger.debug(f"Received JSON: {text_data}")
            try:
                data = json.loads(text_data)
                req = WebSocketRequest(**data)
            except Exception as e:
                logger.error(f"Error parsing JSON payload: {e}")
                await websocket.send_json({"error": "Invalid JSON payload"})
                continue
                
            if req.type == "get_all_signals":
                # Called once on frontend startup to populate the Left Pane tree
                logger.debug("Processing get_all_signals request...")
                signals = waveform_service.get_all_signals()
                time_unit = waveform_service.get_time_unit()

                logger.debug(f"Sending {len(signals)} signals back to client. TimeUnit: {time_unit}")
                await websocket.send_json({
                    "type": "all_signals", 
                    "data": [s.model_dump() for s in signals],
                    "time_unit": time_unit
                })
            elif req.type == "get_transitions":
                # Called dynamically by the frontend when a signal scrolls into view (lazy loading)
                logger.debug(f"Processing get_transitions for {req.signal_path} ({req.time_start} to {req.time_end})...")
                transitions = waveform_service.get_transitions(req.signal_path, req.time_start, req.time_end)
                logger.debug(f"Sending {len(transitions)} transitions back for {req.signal_path}.")
                await websocket.send_json({
                    "type": "transitions",
                    "signal_path": req.signal_path,
                    "data": [t.model_dump() for t in transitions]
                })
            else:
                logger.warning(f"Unknown request type: {req.type}")
                await websocket.send_json({"error": f"Unknown request type: {req.type}"})
                
    except Exception as e:
        logger.error(f"WebSocket Error or Disconnection: {e}")
