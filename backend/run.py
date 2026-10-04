import os
import sys

# Add directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app

app = create_app()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print(f"Starting Hospital POS & Billing System Backend API on port {port}...")
    app.run(host='0.0.0.0', port=port, debug=True)
