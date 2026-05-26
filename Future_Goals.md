# Future Goals & Roadmap for Scryer

Scryer is being developed to potentially provide an alternative to commercial-grade EDA waveform viewers and debuggers. Here are the missing features and planned expansions for the roadmap:

### 1. Advanced Signal Analytics & Protocol Decoding
- **Protocol Decoding**: Auto-detect or manually map signals to standard protocols (I2C, SPI, UART, PCIe, AXI, APB) and decode their data packets directly in the waveform viewer.
- **Analog Signal Rendering**: Render multi-bit digital signals as interpolated analog waveforms for DSP and mixed-signal debugging.
- **Custom Expression Engine**: Add support to define custom signals based on mathematical or logical expressions of existing signals (e.g., `SigC = SigA & SigB`).

### 2. High-Performance Navigation & Viewport Features
- **Minimap / Radar View**: A high-level, macro-scale view of the entire simulation time domain at the bottom of the screen, highlighting the currently zoomed viewport and marker locations.
- **Bookmarks & Snapshots**: Save and load specific viewport zoom levels and marker combinations as "Snapshots" for rapid context switching during complex debug sessions.
- **Waveform Comparison**: Overlay or side-by-side comparison of two different `.fst` files to trace logic regressions across different simulation runs.

### 3. Deep Search & Tracing
- **Causality Tracing**: "Why did this signal change?" Double clicking a transition could back-trace through the RTL source map to identify the driving logic (requires deep integration with a synthesis/elaboration backend).
- **Advanced Edge/Value Search Engine**: Multi-condition searches (e.g., find when `clk = 1` AND `rst = 0` AND `data = 'hFF`).
- **Glitch Detection**: Automated scanning for zero-delay or delta-cycle glitches that shouldn't exist in RTL but might appear in gate-level simulations.

### 4. Enterprise Integrations & Scripting
- **Python API**: Expose a Python scripting layer for users to write custom automation scripts to scan waveforms, validate assertions, or generate reports headless.
- **TCL Support**: Native support for standard TCL commands often used in commercial EDA flows (e.g., Verdi or ModelSim scripts).
- **VCD to FST Auto-Conversion**: Dragging a `.vcd` file into Scryer could automatically trigger a highly optimized background conversion to `.fst` for performance.

### 5. UI/UX Polishing
- **Detachable Tabs & Multi-Monitor Support**: Pop out multiple waveform views or signal explorers into native OS windows.
- **Customizable Color Themes**: Allow users to assign colors to specific signals or groups, color code logic levels (e.g., `Z` = blue, `X` = red), and load custom CSS themes.
- **Export to Image/PDF**: Export high-resolution SVGs or PDFs of the current viewport for use in engineering reports or documentation.
