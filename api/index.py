import sys
import os

# Add the root and web directories to the Python path
sys.path.append(os.path.dirname(os.path.dirname(__file__)))
sys.path.append(os.path.join(os.path.dirname(os.path.dirname(__file__)), 'web'))

from web.app import app
