import requests
import json
import os

files = {
    'pitch_deck': ('deck.pdf', b'%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [ 3 0 R ] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page >>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n149\n%%EOF', 'application/pdf'),
    'financials': ('financials.csv', b'Year,Revenue\n2022,1000\n2023,2000', 'text/csv'),
    'founder_profile': ('founder.pdf', b'%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [ 3 0 R ] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page >>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n149\n%%EOF', 'application/pdf')
}

portfolio_data = {
    "investor_type": "EARLY_VC",
    "portfolio_sectors": ["SaaS"],
    "portfolio_stages": ["Seed"],
    "portfolio_geographies": ["US"],
    "check_size_range_usd": [500000, 2000000],
    "total_investments": 10,
    "target_max_sector_concentration_pct": 30.0
}

data = {
    'portfolio': json.dumps(portfolio_data)
}

try:
    response = requests.post('http://localhost:8000/analyze', files=files, data=data)
    print(f"Status Code: {response.status_code}")
except Exception as e:
    print(f"Error: {e}")
