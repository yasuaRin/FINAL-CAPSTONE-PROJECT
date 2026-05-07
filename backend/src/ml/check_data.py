from data_loader import load_daily_revenue
from supabase import create_client
import os
from dotenv import load_dotenv
from collections import defaultdict

load_dotenv()

print("=" * 60)
print("DATA DIAGNOSTIC")
print("=" * 60)

# Direct Supabase query to see all dates
supabase = create_client(
    os.getenv('SUPABASE_URL'),
    os.getenv('SUPABASE_SERVICE_KEY')
)

# Check all sessions
response = supabase.table('live_sessions').select('date, revenue_shopee, revenue_tiktok').execute()
all_data = response.data

print(f"\n📊 Supabase Query Results:")
print(f"   Total sessions: {len(all_data)}")

# Group by date
dates_with_revenue = defaultdict(int)
dates_with_zero = defaultdict(int)
dates_total = defaultdict(int)

for row in all_data:
    date = row.get('date')
    if not date:
        continue
    
    revenue = (row.get('revenue_shopee') or 0) + (row.get('revenue_tiktok') or 0)
    dates_total[date] += 1
    
    if revenue > 0:
        dates_with_revenue[date] += 1
    else:
        dates_with_zero[date] += 1

print(f"\n📅 Date Statistics:")
print(f"   Total unique dates in DB: {len(dates_total)}")
print(f"   Dates with revenue > 0: {len(dates_with_revenue)}")
print(f"   Dates with revenue = 0: {len(dates_with_zero)}")

if dates_with_revenue:
    min_date = min(dates_with_revenue.keys())
    max_date = max(dates_with_revenue.keys())
    print(f"   Date range (revenue > 0): {min_date} to {max_date}")

# Check what your loader returns
print(f"\n📊 load_daily_revenue() output:")
daily = load_daily_revenue()
print(f"   Days returned: {len(daily)}")

if daily:
    print(f"   First date: {daily[0]['date']}")
    print(f"   Last date: {daily[-1]['date']}")
    
    # Check revenue distribution
    zero_revenue_days = sum(1 for d in daily if d['revenue'] == 0)
    positive_revenue_days = len(daily) - zero_revenue_days
    print(f"   Days with revenue > 0 in result: {positive_revenue_days}")
    print(f"   Days with revenue = 0 in result: {zero_revenue_days}")

# Check for future dates
from datetime import datetime
today = datetime.now().date().isoformat()
future_dates = [date for date in dates_total.keys() if date > today]
past_dates = [date for date in dates_total.keys() if date <= today]

print(f"\n📅 Date Filtering:")
print(f"   Dates before/on today: {len(past_dates)}")
print(f"   Dates after today (future): {len(future_dates)}")
if future_dates:
    print(f"   Future date range: {min(future_dates)} to {max(future_dates)}")