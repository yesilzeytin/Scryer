import pywellen
from typing import List, Dict, Optional

class WaveformParser:
    def __init__(self, file_path: str):
        """Initializes the waveform parser and loads the waveform file."""
        self.file_path = file_path
        self._waveform = pywellen.Waveform(file_path)
    
    def get_all_signals(self) -> List[Dict]:
        """
        Returns metadata for all available signals in the hierarchy as a nested tree.
        Builds the tree by splitting the full hierarchical path by '.'
        """
        root_nodes = []
        node_map = {}
        
        for var in self._waveform.hierarchy.all_vars():
            full_name = var.full_name(self._waveform.hierarchy)
            name = var.name(self._waveform.hierarchy)
            parts = full_name.split('.')
            
            signal_node = {
                "id": full_name,
                "type": "signal",
                "name": name,
                "full_name": full_name,
                "bitwidth": var.bitwidth() if hasattr(var, "bitwidth") else 1,
            }
            
            current_path = ""
            current_children = root_nodes
            
            for i in range(len(parts) - 1):
                part = parts[i]
                current_path = f"{current_path}.{part}" if current_path else part
                
                if current_path not in node_map:
                    new_group = {
                        "id": current_path,
                        "type": "group",
                        "name": part,
                        "children": []
                    }
                    node_map[current_path] = new_group
                    current_children.append(new_group)
                
                current_children = node_map[current_path]["children"]
                
            current_children.append(signal_node)
            
        return root_nodes

    def get_transitions(self, signal_path: str, time_start: int, time_end: int) -> List[Dict[str, str | int]]:
        """
        Retrieves transitions for a specific signal within a time range.
        
        Args:
            signal_path: The full hierarchical path of the signal.
            time_start: Start time of the window.
            time_end: End time of the window.
        """
        sig = self._waveform.get_signal_from_path(signal_path)
        if not sig:
            return []
        
        # In a real columnar engine we'd transpose this directly, 
        # but for Phase 1 we will return a row-oriented list of changes.
        transitions = []
        for change in sig.all_changes():
            # `change` is provided by the Rust wrapper. Its exact API depends on pywellen version.
            # We attempt multiple fallback strategies to extract time and value safely.
            try:
                time = getattr(change, 'time', change[0] if isinstance(change, tuple) else change)
                val = getattr(change, 'value', change[1] if isinstance(change, tuple) else change)
            except Exception:
                time, val = change.time, change.value  # fallback attempt
                
            if time > time_end:
                break # We've passed the requested window
            if time >= time_start:
                # Store the value as a raw string (e.g. '010x0') to let the frontend's
                # Radix formatter handle binary/hex conversions and Unknown (X/Z) states.
                transitions.append({"time": time, "value": str(val)})
                
        return transitions
