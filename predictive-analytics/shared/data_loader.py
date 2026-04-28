# shared/data_loader.py -> is for data preparation 
from shared.supabase_client import fetch_all
import pandas as pd

def get_live_sessions():
    df = fetch_all('live_sessions')
    brands = fetch_all('brands')
    brand_map = dict(zip(brands['brand_id'], brands['brand_name']))
    df['brand_name'] = df['brand_id'].map(brand_map)
    df['total_revenue'] = df['revenue_shopee'].fillna(0) + df['revenue_tiktok'].fillna(0)
    return df

def get_revenue_by_period():
    df = get_live_sessions()
    summary = df.groupby(['brand_id', 'brand_name', 'period_id']).agg(
        total_revenue=('total_revenue', 'sum'),
        total_sessions=('id', 'count')
    ).reset_index()
    return summary