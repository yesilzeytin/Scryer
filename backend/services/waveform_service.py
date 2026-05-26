from typing import List
from parser import WaveformParser
from models import TreeNode, Transition

class WaveformService:
    """
    Service layer to handle business logic and interactions with the raw PyWellen parser.
    Ensures all outgoing data is strictly typed using Pydantic models.
    """
    def __init__(self, file_path: str):
        """Initializes the waveform service with a specific VCD/FST file."""
        self.parser = WaveformParser(file_path)

    def get_all_signals(self) -> List[TreeNode]:
        """Fetches all signals from the parser and returns strongly typed nested models."""
        raw_signals = self.parser.get_all_signals()
        return [TreeNode(**sig) for sig in raw_signals]

    def get_transitions(self, signal_path: str, time_start: int, time_end: int) -> List[Transition]:
        """Fetches transitions for a signal and returns strongly typed models."""
        raw_transitions = self.parser.get_transitions(signal_path, time_start, time_end)
        return [Transition(**t) for t in raw_transitions]

    def get_time_unit(self) -> str:
        """Attempts to retrieve the timescale unit from the parser."""
        try:
            ts = self.parser._waveform.hierarchy.timescale()
            if ts is not None:
                return str(ts)
        except Exception:
            pass
        return "1 ns"
