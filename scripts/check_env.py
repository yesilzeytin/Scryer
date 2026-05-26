import subprocess
import sys
import shutil

def check_command(cmd_name: str, display_name: str, required_version: str = "") -> bool:
    """Checks if a command is available on the system."""
    path = shutil.which(cmd_name)
    if path:
        print(f"[OK] {display_name} found at {path}")
        return True
    else:
        print(f"[FAIL] {display_name} is missing. {required_version}")
        return False

def check_python_version() -> bool:
    """Checks if python version is at least 3.10."""
    version = sys.version_info
    if version.major >= 3 and version.minor >= 10:
        print(f"[OK] Python version {version.major}.{version.minor}.{version.micro} is >= 3.10")
        return True
    else:
        print(f"[FAIL] Python version is {version.major}.{version.minor}. Requires >= 3.10")
        return False

def main():
    print("--- Scryer Environment Check ---")
    all_good = True
    
    if not check_python_version():
        all_good = False
        
    if not check_command("node", "Node.js", "Requires v18+"):
        all_good = False
        
    if not check_command("npm", "npm", "Required for frontend dependencies"):
        all_good = False
        
    if not check_command("yosys", "Yosys", "Required for RTL elaboration"):
        all_good = False
        
    if not check_command("cargo", "Rust/Cargo", "(Optional, needed if building pywellen from source)"):
        print("     Note: Rust is optional unless you need to compile pywellen from source.")
        
    print("--------------------------------")
    if all_good:
        print("All required dependencies are installed! You are good to go.")
    else:
        print("Some dependencies are missing. Please install them before proceeding.")
        sys.exit(1)

if __name__ == "__main__":
    main()
