# shared/supabase_client.py
import os
from dotenv import load_dotenv
from supabase import create_client
import pandas as pd

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')

def get_client():
    return create_client(SUPABASE_URL, SUPABASE_KEY)

def fetch_all(table_name):
    supabase = get_client()
    all_rows = []
    start = 0
    while True:
        result = supabase.table(table_name).select('*').range(start, start + 999).execute()
        if not result.data:
            break
        all_rows.extend(result.data)
        start += 1000
    return pd.DataFrame(all_rows)