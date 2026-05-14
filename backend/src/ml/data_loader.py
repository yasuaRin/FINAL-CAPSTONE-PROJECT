import os
from supabase import create_client
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()

def get_supabase():
    return create_client(
        os.getenv('SUPABASE_URL'),
        os.getenv('SUPABASE_SERVICE_KEY')
    )

def load_daily_revenue(brand_id=None):
    """
    Load daily revenue data from PAST sessions only (excludes future dates)
    """
    supabase = get_supabase()
    
    today = datetime.now().date().isoformat()
    
    # Only fetch dates <= today (past only, no future data)
    query = supabase.table('live_sessions').select(
        'date, revenue_shopee, revenue_tiktok, viewers_shopee, viewers_tiktok, likes_shopee, likes_tiktok, period_id, brand_id'
    ).lte('date', today)
    
    if brand_id:
        query = query.eq('brand_id', brand_id)
    
    # Execute with pagination to get ALL records
    all_data = []
    offset = 0
    page_size = 1000
    
    while True:
        page_query = query.range(offset, offset + page_size - 1)
        response = page_query.execute()
        
        if not response.data or len(response.data) == 0:
            break
            
        all_data.extend(response.data)
        offset += page_size
        
        if len(response.data) < page_size:
            break
    
    print(f" Fetched {len(all_data)} total sessions")
    
    if not all_data or len(all_data) == 0:
        return []
    
    # Group by date
    by_date = {}
    for row in all_data:
        date_key = row.get('date')
        if not date_key:
            continue
        
        revenue = (row.get('revenue_shopee') or 0) + (row.get('revenue_tiktok') or 0)
        viewers = (row.get('viewers_shopee') or 0) + (row.get('viewers_tiktok') or 0)
        likes = (row.get('likes_shopee') or 0) + (row.get('likes_tiktok') or 0)
        
        if date_key not in by_date:
            by_date[date_key] = {
                'date': date_key,
                'revenue': 0,
                'sessions': 0,
                'viewers': 0,
                'likes': 0,
                'period_id': row.get('period_id')
            }
        
        by_date[date_key]['revenue'] += revenue
        by_date[date_key]['viewers'] += viewers
        by_date[date_key]['likes'] += likes
        by_date[date_key]['sessions'] += 1
    
    # Sort by date ascending
    result = list(by_date.values())
    result.sort(key=lambda x: x['date'])
    
    print(f" Final Loaded Data:")
    print(f"   Total unique dates: {len(result)}")
    print(f"   Total sessions represented: {sum(d['sessions'] for d in result)}")
    print(f"   Date range: {result[0]['date']} to {result[-1]['date']}")
    
    return result