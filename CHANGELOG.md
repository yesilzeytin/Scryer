# Changelog

All notable changes to this project will be documented in this file.

## [0.1.0] - 2026-05-25

### Added
- **Backend**: Introduced Pydantic models (`SignalMetadata`, `Transition`, `WebSocketRequest`) to strictly enforce JSON payload typing.
- **Backend**: Added `waveform_service.py` to abstract PyWellen logic away from the API layer.
- **Frontend**: Created `types/waveform.ts` to strictly type the frontend state (removing reliance on `any`).
- **Frontend**: Added `useWaveformState` and `useWaveformWebSocket` hooks to drastically clean up the main React component.
- **Frontend**: Added `canvasRenderer.ts` and `formatters.ts` to isolate procedural Canvas 2D math and radix conversions from component logic.
- **Frontend**: Added `WaveformContextMenus.tsx` to handle right-click dropdowns cleanly.
- **Frontend**: Implemented edge navigation (Ctrl+Left/Right) allowing users to jump to the next/previous transition. Added a toolbar for selecting search mode (`Value Change`, `Assert High`, `Deassert Low`, `Custom Value`).
- **Frontend**: Added a non-blocking `Marker Calculator` modal docked to the bottom-right corner. It dynamically computes Period, Frequency, and Edge Transitions based on the signal actively selected in the Left Pane.
- **Frontend**: Added hovering Tooltips. Hovering over a Marker line physically on the Canvas now renders a precise tooltip displaying the marker's name and exact time.
- **Frontend**: Added `< Marker` and `Marker >` buttons to the Top Toolbar to instantly snap the Active Marker and center the screen onto the closest adjacent marker.
- **Frontend**: Added `Ctrl+A` shortcut to instantly select all visible signals in the Left Pane (respecting collapsed states).
- **Frontend**: Custom Value search now flawlessly parses hex (`'h`), binary (`'b`), decimal, and ASCII strings.
- **Frontend**: Context Menu now includes `Expand`, `Collapse`, `Expand All`, and `Collapse All` for hierarchical groups.
- **Frontend**: Added Mouse Drag Zooming. Left-click drag creates a blue bounding box and zooms in. Right-click drag creates an orange bounding box and calculates zoom out.

### Changed
- **Backend/Frontend**: True Hierarchy Implementation! `parser.py` no longer flattens the hierarchy. It builds a recursive `TreeNode` structure natively.
- **Frontend**: Improved Ruler styling. Gave the time bar a `#222` background and bottom border, and fixed `Time 0` text clipping by left-aligning the first tick.
- **Frontend**: `Group Selected` now auto-increments the `Group_N` name sequentially (like markers) and smartly injects the group into the shared parent node if all selected signals originate from the same parent.

### Fixed
- **Frontend**: Fixed the "Zoom to Fit" black screen crash by strictly clamping `scaleX` calculations to prevent `NaN` or `Infinity` CSS injections.
- **Frontend**: Fixed the Ruler disappearing on Right/Left-Click Zoom by clamping the resulting `offsetX` calculation with `Math.min(0, ...)` to prevent positive offsets from instantly terminating the render loop.
- **Frontend**: Added a Canvas `clip()` region below `RULER_HEIGHT` so vertical scrolling no longer causes signal traces to render over the time bar.
- **Frontend**: Fixed the Context Menu `Expand`/`Collapse` functionality. The Left Pane was passing `nodeIds` (array) to the state, but the context menu was checking `.nodeId`, causing silent failures.
- **Frontend**: Eliminated erratic vertical scroll glitches by severing a circular `useEffect` that continuously re-synced `scrollTop` with React state.
- **Frontend**: Passed `offsetY` to `renderCanvas` to fix the misalignment of Canvas rendering while scrolling.
- **Frontend**: `addMarker` now scans existing markers to claim the lowest available `mN` index, preventing naming collisions. Context menu renaming is also duplicate-protected.
- **Frontend**: Drag & Drop functionality is fully restored. Nodes can now be correctly reordered.
- **Frontend**: `Shift+Select` now computes the interval index distance and selects all signals in between the start and end anchors.
