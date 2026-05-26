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
    
    print("--- Running Backend Linters ---")
    run_command(["black", "."], cwd=backend_dir)
    run_command(["flake8", "."], cwd=backend_dir)
    run_command(["mypy", "."], cwd=backend_dir)
    print("[OK] Backend linting passed.")
    
    frontend_dir = os.path.join(root_dir, "frontend")
    if os.path.exists(frontend_dir) and os.path.exists(os.path.join(frontend_dir, "package.json")):
        print("--- Running Frontend Linters ---")
        run_command(["npm", "run", "lint"], cwd=frontend_dir)
        print("[OK] Frontend linting passed.")
    else:
        print("[SKIP] Frontend not found or package.json missing. Skipping frontend linting.")

if __name__ == "__main__":
    main()
