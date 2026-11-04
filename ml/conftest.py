"""
Pytest configuration for ML workspace.
Adds project root and ml directory to sys.path.
"""
import sys
from pathlib import Path

# Add project root so 'ml.xxx' imports resolve
root_dir = Path(__file__).resolve().parent.parent
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

# Add ml dir so local imports resolve if imported relatively
ml_dir = Path(__file__).resolve().parent
if str(ml_dir) not in sys.path:
    sys.path.insert(0, str(ml_dir))
