# Scryer Waveform Viewer - Developer's Guide

This guide is designed for developers taking over, extending, or maintaining the Scryer Waveform Viewer project. It outlines the architectural decisions, data flow, core modules, and future optimization pathways.

---

## 🏗️ High-Level Architecture

Scryer uses a decoupled Client-Server architecture designed to handle extremely large waveform files (VCD/FST) smoothly.

1. **Backend**: Python + FastAPI + `pywellen` (Rust bindings)
2. **Frontend**: Electron + React + Vite + HTML5 Canvas
3. **Transport**: WebSocket for streaming high-frequency data chunks.

### Why this stack?
- **HTML5 Canvas over DOM**: Rendering thousands of signal transitions as DOM nodes (divs or SVGs) will crush the browser. Native 2D Canvas enables processing 60 FPS redraws for millions of data points.
- **WebSocket over REST**: Transitions are heavy. WebSocket enables keeping a stateful pointer open and allows bi-directional streaming of signals lazily as the user scrolls.
- **Python + Rust (PyWellen)**: Parsing VCD files purely in Javascript is extremely slow for gigabyte-sized files. Rust provides native binary speed, and Python provides a rapid-development wrapper (via FastAPI).

---

## 🐍 Backend Architecture

The backend has been completely modularized into a production-ready FastAPI layout with strict type enforcement.

- **`main.py`**: The entry point. Handles OS port negotiation and binds the FastAPI app to an ephemeral port.
- **`models.py`**: Pydantic dataclasses (`SignalMetadata`, `Transition`, `WebSocketRequest`) enforcing strict typing.
- **`services/waveform_service.py`**: Business logic layer abstracting the raw `pywellen` Rust bindings.
- **`routers/websocket.py`**: Handles the actual WebSocket connections, streaming requested transitions, and catching JSON payload errors.
- **`parser.py`**: The core interaction with `pywellen`. Contains logic for safely extracting `time` and `value` tuples from memory.

---

## 🧩 Frontend Architecture

The frontend (`renderer/src`) has been compartmentalized to separate React UI rendering from standard state management and high-performance Canvas drawing loops.

### Hooks (`hooks/`)
- **`useWaveformState.ts`**: Encapsulates 20+ pieces of state (Canvas Zoom, Pan, Active Markers, Signal Caching, Tree Structure, Edge Search Config, Marker Modals). Keeps the main component perfectly clean.
- **`useWaveformWebSocket.ts`**: Manages the `react-use-websocket` lifecycle. Critically, this hook handles the **Debounced Lazy Loading**—waiting 150ms after the user finishes scrolling before pinging the backend for transition chunks.

### Components (`components/`)
- **`WaveformCanvas.tsx`**: The main orchestration component binding React events to the Canvas render loop. Tracks global hotkeys (`Ctrl+A`, `Ctrl+Left/Right`).
- **`MarkerUtilityModal.tsx`**: A non-blocking, draggable HUD that calculates frequency and edge statistics natively reading `selectedNodeIds`.

### Utilities (`utils/`)
- **`canvasRenderer.ts`**: A pure TypeScript function representing the main 2D render loop. Handles the strict layout bounding (e.g. `ctx.clip` to prevent overlapping the ruler) and strokes the lines.
- **`formatters.ts`**: A pure utility to parse raw binary transitions into `Hex`, `Ascii`, `Decimal`, etc. Gracefully handles `X` and `Z` unknown states.

### Types (`types/`)
- **`waveform.ts`**: Strict TS Interfaces (`TreeNode`, `Marker`, `SignalTransition`) used globally to guarantee no usage of `any`.

---

## 📡 Data Flow & The Lazy-Loading Paradigm

The biggest technical challenge in a waveform viewer is dealing with the sheer volume of data. A modern SoC waveform can contain 50,000+ signals with billions of transitions. 

### Startup Handshake
1. The backend parses the hierarchy and prepares a list of metadata for all signals.
2. The frontend connects to `ws://localhost:<ephemeral_port>/ws` and sends `{"type": "get_all_signals"}`.
3. Backend returns the flat list of signals. The frontend mounts this into `treeData`.

### Lazy Loading & Virtualization (Critical!)
Initially, rendering 50,000 DOM rows in the Left Pane would lock up React (`Maximum update depth exceeded` and layout thrashing).
- **Virtualization**: The Left Pane Tracks `offsetY`. We calculate `startIndex` and `endIndex` and **only render the ~30 rows** that are physically visible on the screen.
- **Debounced Fetching**: We do NOT fetch transitions for all 50,000 signals. We wait 150ms for the user to stop scrolling, and then fire a request *only* for signals currently visible on the screen.

---

## 🚀 Future Roadmap & Next Steps

If you are taking over this project, these are the immediate high-priority architectural upgrades:

2. **Time-Window Chunking (Backend)**
   - *Current Flaw*: When we request transitions for a signal, the backend returns `0 to 1,000,000,000` (all transitions in history). For a 2GB FST file, returning 400,000 transitions over WS will crash the frontend V8 engine.
   - *Fix*: Modify `useWaveformWebSocket` to pass the exact visible bounds (`offsetX` to `canvasWidth`), and have the Python backend only serialize transitions within that exact slice.

3. **Web Worker Canvas Offloading**
   - Move `canvasRenderer.ts` parsing into an `OffscreenCanvas` Web Worker. This guarantees the React UI thread never drops below 60FPS.
