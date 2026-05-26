# Project Conceptual Specification: Open-Source Structural Waveform Debugger

This document establishes the architectural blueprint, technical stack, and design constraints for a modern, open-source waveform debugger. It is designed to onboard an agentic AI developer to begin implementation while actively avoiding the critical architectural pitfalls typical of EDA software development.

---

## 1. Project Vision & Core Differentiation

The goal is to build an advanced **Waveform Debugger**, not merely a passive waveform viewer (like GTKWave). While it functions as a fast, read-only time-series database visualization tool, its primary value is **design intelligence**.

By parsing the structural RTL netlist *alongside* the waveform database, the tool enables enterprise-grade features (similar to Synopsys Verdi) without requiring an active simulation engine or continuous VPI/DPI communication.

### Core Value Vectors

* **Active Driver & Causal Tracing:** Instead of active simulation, the tool uses a static, parsed structural graph of the RTL evaluated against historical data from the waveform database at a specific timestamp ($t$) to trace logic paths backward through a cone of influence.
* **Transaction-Level Abstraction:** Moving beyond bit-level viewing to reconstruct raw bus toggles (e.g., AXI, PCIe) into chronological transaction blocks.
* **Cross-Probing:** Seamlessly mapping a waveform signal back to its exact line of source hardware description language (HDL) code.

---

## 2. Target Technical Stack

| Layer | Technology Selected | Rationale / Guardrails |
| --- | --- | --- |
| **Frontend UI** | **Electron + React + TypeScript** | Enables rapid UI/UX iteration and crisp design. Massively supported by AI code generation. Allows embedding rich web-native tools (e.g., Monaco Editor for source browsing). |
| **UI Canvas** | **HTML5 Canvas / WebGL (e.g., PixiJS)** | Essential for rendering millions of waveform edges. Must be highly optimized to limit redraw regions. |
| **Backend Core** | **Python (Headless Data Server)** | Fast orchestration, highly compatible with AI generation. Must expose a local **WebSocket or JSON REST API** to communicate with the Electron frontend. |
| **Parsing Engine** | **`pywellen` (Rust Core wrapper)** | Bypasses Python’s Global Interpreter Lock (GIL) and performance limitations by offloading FST/VCD binary parsing to a highly threaded compiled Rust layer. |
| **RTL Elaboration** | **Yosys (with Slang or Surelog/UHDM plugin)** | Used purely as a tool-agnostic elaboration engine. Generates a flat, parameter-resolved structural graph exported as a standardized JSON file (`write_json`). |

---

## 3. Core Architecture & Data Pipeline

The application operates on a strict **Client-Server / Decoupled Backend** pattern. The frontend never accesses the filesystem or parses binary waveform streams directly.

```
+-----------------------------------+
|     Electron Frontend (React)     |
+-----------------+-----------------+
                  |
         WebSockets / JSON API (Localhost)
                  |
+-----------------v-----------------+
|      Python Headless Server       |
|  +-----------------------------+  |
|  | pywellen (Rust Core Engine) |  | ----> Ingests Binary FST / VCD
|  +-----------------------------+  |
|  | Netlist Graph Evaluator     |  | ----> Parses Yosys JSON Structural Netlist
|  +-----------------------------+  |
+-----------------------------------+

```

### Waveform Optimization Flow

1. **Native Binary Focus:** The primary input target is **FST (Fast Signal Trace)**. It is highly compressed, natively indexed, and supports random block access. Users should be encouraged to utilize native FST logging (e.g., Verilator `--trace-fst`) to avoid the disk I/O bottleneck of VCD.
2. **In-Memory Columnar Transposition:** For incoming VCD structures, the backend must parse and transpose row-based data into an optimized, chunked, columnar format in-memory (mimicking Surfer's `Wellen` architecture) to allow fast time-scrubbing.

---

## 4. Addressing Critical Architectural Pitfalls

### Pitfall A: The X11 Forwarding / VNC Scrolling Trap

**The Problem:** Electron apps rely on Chromium, which outputs flat bitmaps. Over remote VNC sessions or X11 forwarding (ubiquitous in corporate/defense server farms), panning a canvas forces VNC to compress and transmit massive pixel grids every frame, causing catastrophic network lag and visual tearing.

**The Architectural Mitigations:**

* **Aggressive Canvas Optimization:** The frontend canvas engine must implement strict view-bounding. If the timeline is scrolled or panned, the engine must calculate delta transformations and redraw *only* the newly exposed edges, maintaining static pixels where possible.
* **VNC Software Rendering Optimization:** The tool must include a launch toggle (e.g., `--vnc-mode`) that calls `app.disableHardwareAcceleration()` and switches Chromium to a CPU-based software renderer (`--use-gl=swiftshader`). This prevents black screens and minimizes anti-aliasing color shifts that bloat VNC delta compression bandwidth.
* **Decoupled Architecture Readiness:** The application's architecture inherently supports running the headless Python backend on a remote Linux server cluster while executing the crisp Electron frontend natively on the engineer's local machine, transmitting only lightweight JSON data over an SSH tunnel.

### Pitfall B: Unresolved ASTs for Causal Tracing

**The Problem:** Trying to find a logic driver using a raw Abstract Syntax Tree (AST) will fail because it contains parameterized modules, generate statements, and unrolled loops.
**The Architectural Mitigation:** The debugger must request an **Elaborated Netlist**. The Python server triggers a background execution of Yosys to process the source file:

```bash
yosys -p "read_slang top.sv; hierarchy -top my_top; proc; opt; write_json netlist.json"

```

The resulting `netlist.json` maps flat, explicit connections where all parameters are resolved, turning logic evaluation into a trivial directed-graph lookup problem.

---

## 5. Implementation Roadmap for AI Agent

### Phase 1: Headless Server & Waveform Queries

* Implement the Python server using FastAPI or WebSockets.
* Integrate `pywellen` to read a sample FST file.
* Expose an endpoint: `get_transitions(signal_id, time_start, time_end)` returning clean JSON payload slices.

### Phase 2: Optimized Canvas Timeline

* Build the Electron frontend with an HTML5 Canvas view.
* Implement time-axis rendering, zooming, and panning behavior.
* Apply viewport clipping so the canvas *only* draws signals currently in the scroll view.

### Phase 3: Structural Integration

* Implement the background execution of Yosys to generate the `netlist.json`.
* Build a Python logic traversal class. When given signal $Y$ and timestamp $t$, it looks up the driving cell in the JSON graph, queries the historical values of control signals (e.g., selecting bits in a mux) from the FST data at that exact tick, and identifies the active driving net.

### Phase 4: IDE Cross-Probing

* Expose a configuration schema to specify external source explorer tools (e.g., VS Code, gvim, or native Monaco editor tab).
* Map structural graph instances back to file and line attributes generated in the Yosys compilation output.

## 6. Edge Case Handling & Configuration Strategy

To ensure stability in real-world enterprise environments containing complex IP and shared Linux servers, the architecture must implement the following safeguards.

### 6.1. Dynamic Backend Port Allocation (Shared Server Safety)
* **Constraint:** The Python headless server must **never** bind to a hardcoded localhost port (e.g., `8080`). Doing so will cause instant crashes on shared grid servers (LSF/Slurm) if multiple users run the tool simultaneously.
* **Implementation:** The backend must bind to port `0`, allowing the OS to assign an ephemeral port. The backend will then communicate this assigned port back to the Electron parent process (via `stdout` or IPC) so the frontend knows where to connect its WebSockets.

### 6.2. Graceful Degradation: Encrypted & Commercial IP
* **Constraint:** Commercial IPs (Synopsys DesignWare, ARM cores) are IEEE 1735 encrypted. Yosys/Slang will fail to elaborate if forced to parse them.
* **Pre-Processing & Sanitization:** The tool must accept standard SystemVerilog file lists (`-f` / `-F`). The Python backend must include a "Sanitizer" step that strips proprietary commercial simulator flags from the file list before passing it to the Yosys/Slang engine.
* **Blackboxing:** Unparseable or encrypted IP must be designated as `(* blackbox *)` during elaboration. 
* **UI Representation:** The Electron canvas must visually distinguish black-boxed modules (e.g., using dashed borders or padlock icons). If a user attempts to trace a driver *into* a black box, the UI must halt the trace and display a non-blocking toast notification: *"Trace Boundary Reached: [Module Name] is encrypted or unparseable. Showing boundary nets only."*

### 6.3. Executable Configuration & Persistence
* **Constraint:** Packaged executables (AppImage, Windows `.exe`) are immutable and read-only. Configuration cannot be saved inside the binary.
* **Implementation:** The tool will use Electron's native `app.getPath('userData')` to store a `config.json` file in the OS-standard configuration directory (e.g., `~/.config/[AppName]/` on Linux). 
* **Configurable Data:** This JSON will store persistent user preferences, such as custom external text editor paths (for cross-probing), default file-list macros, UI themes, and recent waveform database paths.