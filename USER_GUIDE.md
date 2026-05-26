# Scryer Waveform Viewer - User Guide

Welcome to the **Scryer Waveform Viewer**! Scryer is a blazingly fast, modern web-based waveform viewer designed to help hardware engineers and developers debug their VCD/FST simulation outputs with unparalleled speed and a sleek interface.

## 🚀 Getting Started

### 1. Launching the Backend
Scryer operates using a Python FastAPI backend that parses waveform files efficiently using Rust (`pywellen`). 
To start the backend and load a waveform file (e.g., `swerv1.vcd`):
```bash
cd backend
python main.py --debug
```
*Note: The backend automatically assigns a free port and writes it to `.scryer_port` for the frontend to pick up.*

### 2. Launching the Frontend
The frontend is a desktop-class Electron + React application.
```bash
cd frontend
npm run dev
```

---

## 🖥️ User Interface Overview

The Scryer interface is divided into two primary regions, separated by a draggable splitter:

1. **The Left Pane (Signal Explorer)**: Displays the full hierarchy of your waveform file.
2. **The Waveform Canvas**: A high-performance canvas where signal transitions are drawn natively.

### The Signal Explorer (Left Pane)
- **Hierarchy & Grouping**: Signals are parsed natively into their Verilog/SystemVerilog nested scopes (e.g., `TOP.tb_top.rvtop`). Groups can be collapsed or expanded.
- **Value Column**: Shows the exact data value of the signal at the time indicated by your **Active Marker** (the white vertical line on the canvas).
- **Customizable Widths**: You can drag the vertical divider between "Signal Name" and "Value" to adjust their proportions. If text is too long, it will gracefully truncate with an ellipsis (`...`).
- **Lazy Loading**: Scryer easily handles waveforms with hundreds of thousands of signals. Data is intelligently requested from the backend *only* when a signal is scrolled into view.

### The Waveform Canvas
- **X / Z State Warnings**: 
  - If a signal value is entirely unknown/uninitialized (`x`, `u`, `w`, `-`), the hex-box will render solid **Red**.
  - If a signal has partial unknown bits (e.g., `001x`), the hex-box outline will render **Yellow**.
  - High impedance states (`z`) render as a single yellow line down the middle of the track.

---

## 🛠️ Features & Controls

### 🖱️ Navigation & Zoom
- **Scroll Wheel**: Use the mouse wheel to scroll vertically through the signals. 
- **Middle/Left Click Drag**: Click and drag on the Canvas background (outside of a zoom region) to freely pan the waveform left and right.
- **Left-Click Box Zoom (Zoom In)**: Left-click and drag to draw a blue region box on the Canvas. Upon releasing, the view will zoom in to perfectly fit the selected time interval.
- **Right-Click Box Zoom (Zoom Out)**: Right-click and drag to draw an orange region box on the Canvas. Upon releasing, the view will zoom out using the box's size as a ratio.

### 📌 Markers
- **Active Marker**: Left-click anywhere on the canvas to place the Active Marker (a white line labeled `A`). The values in the Left Pane will instantly update to show the state of all signals at that exact nanosecond.
- **Freeze Marker**: Press `Shift + S` to save a frozen marker (Yellow line) at the current Active Marker position. Frozen markers are automatically given names like `m0`, `m1` and track specific times of interest.
- **Marker Menu**: Right-click on a frozen marker's line to pop up a context menu where you can rename it or remove it entirely.
- **Hover Tooltips**: Hover your mouse over any marker line on the canvas to see its exact name and time.
- **Marker Navigation**: Use the `< Marker` and `Marker >` buttons in the Top Toolbar to rapidly jump between your markers.

### 🧮 Marker Calculator
Click the **Marker Calculator** button in the Top Toolbar to open the analysis HUD:
- The Modal is completely non-blocking, so you can leave it docked in the corner while you click around.
- Select any two markers as **Point A** and **Point B**.
- The calculator instantly shows the **Period (|A - B|)**.
- **Dynamic Frequency**: Click on *any* signal in the Left Pane explorer. The Calculator will instantly scan that signal's history and compute its exact **Frequency** as well as count how many edge transitions (times changed) occurred within that specific interval.

### 🔎 Edge Search
You can search through signal transitions instantly! 
1. Select a signal.
2. Select a search mode in the Top Toolbar (`Value Change`, `Assert High`, `Deassert Low`, or `Custom Value`).
3. Press **Ctrl + Right Arrow** (Next) or **Ctrl + Left Arrow** (Previous) to snap the active cursor exactly to the timestamp of that transition!
*Note: Custom Value search supports inputs like `'hA54`, `'b0101`, `1234` (decimal), and ASCII.*

### 🎨 Signal Customization
Right-click any signal in the Left Pane to open the **Signal Context Menu**:
- **Change Radix**: View data in `Binary`, `Hex`, `Octal`, `Decimal`, `Unsigned`, or `ASCII`. The radix updates both the Left Pane value column and the physical Canvas Hex Boxes instantly.
- **Change Color**: Select a custom color to highlight specific signal traces.
- **Remove**: Hide the signal from the view.
- **Expand/Collapse**: Quickly expand or collapse nested hierarchical folders.

### 🗂️ Grouping & Drag-and-Drop
- **Select All**: Press `Ctrl+A` to instantly select all signals that are currently visible (expanded) in the left pane.
- **Sorting**: Click and drag any signal in the Left Pane to move it up or down the list. 
- **Shift+Select**: Select multiple contiguous signals by clicking one, holding Shift, and clicking another.
- **Creating Groups**: Select multiple signals. Right click the selection and choose **Group Selected**. A new collapsible group will be auto-generated (`Group_N`) and placed intelligently into your hierarchy. 

### 💾 State Management
Spent 20 minutes perfectly coloring, arranging, grouping, and placing markers on your complex CPU pipeline? 
- Click **Save State** in the top-left toolbar. Scryer will prompt you to save a `.json` file containing your exact layout, zoom level, marker placements, radix choices, and colors.
- Click **Load State** later to instantly restore your entire debugging environment!
