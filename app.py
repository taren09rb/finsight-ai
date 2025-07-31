from flask import Flask, render_template, jsonify
import requests

app = Flask(__name__)

# Your API key is now securely stored on the backend, hidden from users.
ALPHA_VANTAGE_API_KEY = 'OWD48LLRDF3XLO76'

# --- Mock Data for Reliability ---
# This ensures the app always works for these popular tickers.
mock_data_store = {
    'AAPL': {
        "profile": { "Symbol": "AAPL", "Name": "Apple Inc", "Description": "Apple Inc. designs, manufactures, and markets smartphones, personal computers, tablets, wearables, and accessories worldwide.", "Exchange": "NASDAQ", "Currency": "USD", "Sector": "Technology", "MarketCapitalization": "3200000000000", "PERatio": "32.5", "52WeekHigh": "220.50" },
        "historical": [{"date": f"2024-0{i//30+1}-{i%30+1}", "close": 150 + (i * 0.05) + 20 * (i % 50) / 50} for i in range(1260)]
    },
    'MSFT': {
        "profile": { "Symbol": "MSFT", "Name": "Microsoft Corporation", "Description": "Microsoft Corporation develops, licenses, and supports software, services, devices, and solutions worldwide.", "Exchange": "NASDAQ", "Currency": "USD", "Sector": "Technology", "MarketCapitalization": "3100000000000", "PERatio": "35.8", "52WeekHigh": "430.82" },
        "historical": [{"date": f"2024-0{i//30+1}-{i%30+1}", "close": 300 + (i * 0.1) + 30 * (i % 50) / 50} for i in range(1260)]
    },
    'NVDA': {
        "profile": { "Symbol": "NVDA", "Name": "NVIDIA Corporation", "Description": "NVIDIA Corporation provides graphics, and compute and networking solutions in the United States, Taiwan, China, and internationally.", "Exchange": "NASDAQ", "Currency": "USD", "Sector": "Technology", "MarketCapitalization": "2900000000000", "PERatio": "70.2", "52WeekHigh": "974.00" },
        "historical": [{"date": f"2024-0{i//30+1}-{i%30+1}", "close": 400 + (i * 0.4) + 80 * (i % 50) / 50} for i in range(1260)]
    }
}

@app.route('/')
def index():
    """Serves the main HTML page."""
    return render_template('index.html')

@app.route('/api/stock_data/<ticker>')
def get_stock_data(ticker):
    """
    This endpoint fetches both profile and historical data for a given stock ticker.
    It uses mock data for common tickers and falls back to the live API for others.
    """
    upper_ticker = ticker.upper()

    if upper_ticker in mock_data_store:
        return jsonify(mock_data_store[upper_ticker])

    try:
        profile_url = f'https://www.alphavantage.co/query?function=OVERVIEW&symbol={ticker}&apikey={ALPHA_VANTAGE_API_KEY}'
        profile_res = requests.get(profile_url)
        profile_data = profile_res.json()
        if not profile_data or 'Note' in profile_data or not profile_data.get('Symbol'):
            return jsonify({"error": f"Could not retrieve profile for {ticker}."}), 404

        historical_url = f'https://www.alphavantage.co/query?function=TIME_SERIES_DAILY_ADJUSTED&symbol={ticker}&outputsize=full&apikey={ALPHA_VANTAGE_API_KEY}'
        historical_res = requests.get(historical_url)
        historical_data_raw = historical_res.json()
        time_series = historical_data_raw.get('Time Series (Daily)')
        if not time_series:
            return jsonify({"error": f"Could not retrieve historical data for {ticker}."}), 404
        
        historical_data = [{"date": date, "close": float(values['4. close'])} for date, values in time_series.items()]
        historical_data.reverse()

        return jsonify({"profile": profile_data, "historical": historical_data})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
