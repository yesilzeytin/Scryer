import subprocess
import sys
import os

def run_command(cmd, cwd=None):
    print(f"Running: {' '.join(cmd)}")
    result = subprocess.run(cmd, cwd=cwd)
    if result.returncode != 0:
        print(f"Command failed with exit code {result.returncode}")
        sys.exit(result.returncode)

def main():
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    backend_dir = os.path.join(root_dir, "backend")
    docs_dir = os.path.join(root_dir, "docs", "backend")
    
    print("--- Generating Backend Docs ---")
    os.makedirs(docs_dir, exist_ok=True)
    run_command(["pdoc", "./", "-o", docs_dir], cwd=backend_dir)
    print("[OK] Backend docs generated.")
    
    frontend_dir = os.path.join(root_dir, "frontend")
    if os.path.exists(frontend_dir) and os.path.exists(os.path.join(frontend_dir, "package.json")):
        print("--- Generating Frontend Docs ---")
        # Ensure TypeDoc is installed in frontend project
        run_command(["npx", "typedoc"], cwd=frontend_dir)
        print("[OK] Frontend docs generated.")
    else:
        print("[SKIP] Frontend not found. Skipping frontend docs.")

if __name__ == "__main__":
    main()
