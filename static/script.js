document.addEventListener('DOMContentLoaded', () => {
    const tickerInput = document.getElementById('ticker-input');
    const searchBtn = document.getElementById('search-btn');
    const mainContent = document.getElementById('main-content');
    const loadingIndicator = document.getElementById('loading-indicator');
    const errorMessage = document.getElementById('error-message');
    const timeRangeSelector = document.getElementById('time-range-selector');

    let chartInstance = null;
    let currentTicker = 'AAPL';
    let currentRange = '1Y';
    let fullData = [];
    let currentProfile = {};

    const ui = {
        showLoading: () => {
            mainContent.classList.add('hidden');
            errorMessage.classList.add('hidden');
            loadingIndicator.classList.remove('hidden');
            loadingIndicator.classList.add('flex');
        },
        hideLoading: () => {
            loadingIndicator.classList.add('hidden');
            loadingIndicator.classList.remove('flex');
        },
        showError: (message) => {
            errorMessage.textContent = message;
            errorMessage.classList.remove('hidden');
            mainContent.classList.add('hidden');
        },
        showContent: () => {
            mainContent.classList.remove('hidden');
            errorMessage.classList.add('hidden');
        },
        updateInfoPanel: (profile) => {
            currentProfile = profile;
            document.getElementById('company-name').textContent = profile.Name || 'N/A';
            const marketCap = parseInt(profile.MarketCapitalization, 10);
            document.getElementById('market-cap').textContent = marketCap ? `$${(marketCap / 1_000_000_000).toFixed(2)}B` : 'N/A';
            document.getElementById('sector').textContent = profile.Sector || 'N/A';
            document.getElementById('pe-ratio').textContent = profile.PERatio || 'N/A';
            document.getElementById('52-week-high').textContent = profile['52WeekHigh'] ? `$${profile['52WeekHigh']}` : 'N/A';
            document.getElementById('company-summary').textContent = profile.Description || 'No summary available.';
            document.getElementById('chart-title').textContent = `${profile.Name} (${profile.Symbol})`;
            document.getElementById('chart-subtitle').textContent = `${profile.Exchange} | ${profile.Currency}`;
        }
    };

    const calculateMA = (data, windowSize) => {
        let r_avg = [];
        for (let i = 0; i < data.length; i++) {
            if (i < windowSize - 1) {
                r_avg.push(null);
            } else {
                let sum = 0;
                for (let j = 0; j < windowSize; j++) {
                    sum += data[i - j];
                }
                r_avg.push(sum / windowSize);
            }
        }
        return r_avg;
    };

    const renderChart = (range) => {
        if (!chartInstance) {
            const ctx = document.getElementById('stockChart').getContext('2d');
            chartInstance = new Chart(ctx, {
                type: 'line',
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: { ticks: { color: '#64748b' }, grid: { color: 'rgba(203, 213, 225, 0.2)' } },
                        y: { ticks: { color: '#64748b' }, grid: { color: 'rgba(203, 213, 225, 0.2)' } }
                    },
                    plugins: { legend: { labels: { color: '#475569' } } },
                    interaction: { intersect: false, mode: 'index' }
                }
            });
        }
        
        currentRange = range;
        let dataSlice = [];
        const daysInYear = 252; 
        
        switch(range) {
            case '1M': dataSlice = fullData.slice(-21); break;
            case '6M': dataSlice = fullData.slice(-126); break;
            case '5Y': dataSlice = fullData.slice(-daysInYear * 5); break;
            default: // 1Y
                dataSlice = fullData.slice(-daysInYear);
        }

        const labels = dataSlice.map(d => d.date);
        const closePrices = dataSlice.map(d => d.close);
        const movingAverage = calculateMA(fullData.map(d=>d.close), 50).slice(fullData.length - dataSlice.length);

        chartInstance.data = {
            labels: labels,
            datasets: [
                {
                    label: 'Close Price',
                    data: closePrices,
                    borderColor: 'rgb(14, 165, 233)',
                    backgroundColor: 'rgba(14, 165, 233, 0.1)',
                    borderWidth: 2,
                    pointRadius: 0,
                    tension: 0.1,
                    fill: true,
                },
                {
                    label: '50-Day MA',
                    data: movingAverage,
                    borderColor: 'rgb(249, 115, 22)',
                    borderWidth: 1.5,
                    pointRadius: 0,
                    borderDash: [5, 5],
                }
            ]
        };
        chartInstance.update();
    };

    const fetchAndDisplayData = async (ticker) => {
        ui.showLoading();
        try {
            // This now calls our own backend server instead of the external API directly
            const response = await fetch(`/api/stock_data/${ticker}`);
            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Failed to fetch stock data.');
            }
            const data = await response.json();
            
            fullData = data.historical;
            ui.updateInfoPanel(data.profile);
            renderChart(currentRange); 
            
            ui.hideLoading();
            ui.showContent();

        } catch (error) {
            console.error(error);
            ui.hideLoading();
            ui.showError(error.message);
        }
    };
    
    const handleSearch = () => {
        const ticker = tickerInput.value.trim().toUpperCase();
        if (ticker && ticker !== currentTicker) {
            currentTicker = ticker;
            fetchAndDisplayData(ticker);
        }
    };

    searchBtn.addEventListener('click', handleSearch);
    tickerInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
    });

    timeRangeSelector.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            const newRange = e.target.dataset.range;
            if (newRange !== currentRange) {
                document.querySelectorAll('.time-btn').forEach(btn => {
                    btn.classList.remove('bg-white', 'text-sky-700');
                });
                e.target.classList.add('bg-white', 'text-sky-700');
                renderChart(newRange);
            }
        }
    });

    fetchAndDisplayData(currentTicker);
});