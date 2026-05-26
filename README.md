# Scryer
**An Open-Source Structural Waveform Debugger**

Scryer is an advanced waveform viewer and debugger designed for complex RTL debugging. Unlike traditional viewers that simply parse Value Change Dump (VCD/FST) files, Scryer is aiming to actively parse the structural RTL netlist alongside the waveform database. This would allow for hierarchical grouping, deep structural tracing, and advanced analytics directly within the waveform context.

## Core Features

- **High-Performance Rendering**: Built on WebGL via PixiJS to handle millions of transitions without dropping frames.
- **Hierarchical Signal Explorer**: Natively maps flat signal lists into a traversable hierarchy based on module instantiation.
- **Marker Utilities**: Drop frozen markers, calculate exact cycle periods, frequencies, and track precise edge transition counts between multiple points in time.
- **Dynamic Edge Searching**: Jump between "Value Change", "Assert High", "Deassert Low", or custom hex/binary/ASCII values instantly.
- **Group Management**: Shift-select and logically group signals to manage massive testbenches cleanly.

## Prerequisites

Before starting development or running the application from source, ensure you have the following installed on your system:
- **Python 3.10+** (Required for the backend data server)
- **Node.js v18+ & npm** (Required for the Electron/React frontend)
- **Yosys** (Required for RTL elaboration and generating structural JSON)
- *(Optional)* **Rust / Cargo** (If you need to build the `pywellen` binary parser from source)

The final releases will come as bundled packages, which should allow one-click workflows rather than requiring individual setup and dependency management.

Run the environment check script to verify your setup:
```bash
python scripts/check_env.py
```

## Infrastructure Setup

### Backend (Python)
The backend is a FastAPI headless server that parses wave files and structural netlists.
1. `cd backend`
2. `python -m venv venv`
3. Activate the virtual environment:
   - Windows: `.\venv\Scripts\activate`
   - Linux/macOS: `source venv/bin/activate`
4. `pip install -r requirements.txt`

### Frontend (Electron + React)
The frontend uses Electron and React (bootstrapped via `electron-vite`).
1. Ensure Node.js is installed.
2. `cd frontend`
3. `npm install`

## Development

- **Run Backend:** `cd backend` then run `python main.py`
- **Run Frontend:** `cd frontend` then run `npm run dev`
- **Linting Frontend:** `cd frontend` then run `npm run lint` and `npm run typecheck`
- **Clean Build Artifacts:** Run `./clean_build.bat` at the project root

## Documentation
- **USER_GUIDE.md**: Detailed instructions on how to use Scryer, keyboard shortcuts, and canvas navigation.
- **DEVELOPER_GUIDE.md**: In-depth architectural details, state management patterns, and backend port communication protocols.
- **Future_Goals.md**: Planned roadmap features including protocol decoding and python API integration.
- **CHANGELOG.md**: History of features and bug fixes.
