from fastapi import APIRouter

router = APIRouter()

@router.get("/")
def read_root() -> dict[str, str]:
    """
    Root endpoint for basic health check. 
    Can be used by the frontend to verify the backend is alive before opening a WebSocket.
    """
    return {"status": "ok", "service": "Scryer Backend"}
