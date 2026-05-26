from pydantic import BaseModel

class TreeNode(BaseModel):
    """
    Data model representing a nested scope or a single signal.
    """
    id: str
    type: str  # 'group' or 'signal'
    name: str
    full_name: str = ""
    bitwidth: int = 1
    children: list['TreeNode'] | None = None

class Transition(BaseModel):
    """
    Data model representing a single value change at a specific timestamp.
    """
    time: int
    value: str

class WebSocketRequest(BaseModel):
    """
    Data model for parsing incoming WebSocket JSON requests from the frontend.
    """
    type: str
    signal_path: str = ""
    time_start: int = 0
    time_end: int = 0
