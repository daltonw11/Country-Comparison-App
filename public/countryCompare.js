const searchInput = document.getElementById('searchInput');
const searchButton = document.getElementById('searchButton');
const clearButton = document.getElementById('clearButton');
const resultsContainer = document.getElementById('results');
const compareContent = document.getElementById('compareContent');
const errorBox = document.getElementById('errorBox');
const loadingBox = document.getElementById('loadingBox');

let selectedCountries = [];

function showError(message) {
  errorBox.textContent = message;
  errorBox.style.display = 'block';
}

function hideError() {
  errorBox.style.display = 'none';
  errorBox.textContent = '';
}

function showLoading() {
  loadingBox.style.display = 'block';
}

function hideLoading() {
  loadingBox.style.display = 'none';
}

function formatLanguages(languages) {
  if (!languages) {
    return 'N/A';
  }

  return Object.values(languages).join(', ');
}

function formatCurrencies(currencies) {
  if (!currencies) {
    return 'N/A';
  }

  return Object.values(currencies)
    .map((currency) => currency.name)
    .join(', ');
}

function addCountry(country) {
  const alreadySelected = selectedCountries.some(
    (selectedCountry) => selectedCountry.name.common === country.name.common
  );

  if (alreadySelected) {
    return;
  }

  if (selectedCountries.length >= 4) {
    showError('You can compare up to 4 countries at a time.');
    return;
  }

  hideError();
  selectedCountries.push(country);
  renderComparison();

  document.getElementById('compare').scrollIntoView({
    behavior: 'smooth',
  });
}

function removeCountry(countryName) {
  selectedCountries = selectedCountries.filter(
    (country) => country.name.common !== countryName
  );

  renderComparison();
}

function clearSelection() {
  selectedCountries = [];
  renderComparison();
  hideError();
}

function renderResults(countries) {
  resultsContainer.innerHTML = '';

  if (!countries.length) {
    resultsContainer.innerHTML = `
      <div class="empty-state">
        <h3>No results yet</h3>
        <p>Search for a country to see matching results here.</p>
      </div>
    `;
    return;
  }

  countries.forEach((country) => {
    const card = document.createElement('div');
    card.className = 'card';

    card.innerHTML = `
      <img class="flag" src="${country.flags?.png || ''}" alt="${country.name.common} flag">

      <div class="card-body">
        <div class="result-header">
          <div>
            <h3>${country.name.common}</h3>
            <p class="muted">${country.region || 'N/A'}</p>
          </div>

          <button class="btn btn-outline add-btn">Add</button>
        </div>

        <div class="detail-grid">
          <div class="detail-box">
            <strong>Capital</strong>
            <span>${country.capital?.[0] || 'N/A'}</span>
          </div>

          <div class="detail-box">
            <strong>Population</strong>
            <span>${Number(country.population || 0).toLocaleString()}</span>
          </div>

          <div class="detail-box">
            <strong>Area</strong>
            <span>${Number(country.area || 0).toLocaleString()} km²</span>
          </div>

          <div class="detail-box">
            <strong>Subregion</strong>
            <span>${country.subregion || 'N/A'}</span>
          </div>
        </div>
      </div>
    `;

    card.querySelector('.add-btn').addEventListener('click', () => {
      addCountry(country);
    });

    resultsContainer.appendChild(card);
  });
}

function renderChart() {
  if (!selectedCountries.length) {
    return '';
  }

  const maxPopulation = Math.max(
    ...selectedCountries.map((country) => country.population || 0),
    1
  );

  return `
    <div class="chart-wrap">
      <h3 style="margin-bottom: 10px;">Population Comparison</h3>
      <p class="muted" style="margin-bottom: 12px;">
        Bar height is scaled relative to the largest selected population.
      </p>

      <div class="chart">
        ${selectedCountries
          .map((country) => {
            const height = Math.max(
              ((country.population || 0) / maxPopulation) * 220,
              10
            );

            return `
              <div class="bar-group">
                <div class="bar-value">
                  ${Number(country.population || 0).toLocaleString()}
                </div>

                <div class="bar" style="height: ${height}px;"></div>

                <div class="bar-label">${country.name.common}</div>
              </div>
            `;
          })
          .join('')}
      </div>
    </div>
  `;
}

function renderComparison() {
  if (!selectedCountries.length) {
    compareContent.innerHTML = `
      <div class="empty-state">
        <h3>No countries selected yet</h3>
        <p>Search for a country above and click Add to place it in the comparison section.</p>
      </div>
    `;
    return;
  }

  compareContent.innerHTML = `
    <div class="compare-grid">
      ${selectedCountries
        .map(
          (country) => `
            <div class="card">
              <img class="flag" src="${country.flags?.png || ''}" alt="${country.name.common} flag">

              <div class="card-body">
                <div class="result-header">
                  <div>
                    <h3>${country.name.common}</h3>
                    <p class="muted">${country.capital?.[0] || 'N/A'}</p>
                  </div>

                  <button class="btn btn-outline remove-btn" data-name="${country.name.common}">
                    Remove
                  </button>
                </div>

                <div class="detail-grid">
                  <div class="detail-box">
                    <strong>Region</strong>
                    <span>${country.region || 'N/A'}</span>
                  </div>

                  <div class="detail-box">
                    <strong>Population</strong>
                    <span>${Number(country.population || 0).toLocaleString()}</span>
                  </div>

                  <div class="detail-box">
                    <strong>Area</strong>
                    <span>${Number(country.area || 0).toLocaleString()} km²</span>
                  </div>

                  <div class="detail-box">
                    <strong>Time Zones</strong>
                    <span>${country.timezones?.join(', ') || 'N/A'}</span>
                  </div>
                </div>

                <div class="long-detail">
                  <strong>Languages</strong>
                  <span>${formatLanguages(country.languages)}</span>
                </div>

                <div class="long-detail">
                  <strong>Currencies</strong>
                  <span>${formatCurrencies(country.currencies)}</span>
                </div>

                <div class="long-detail">
                  <strong>Borders</strong>
                  <span>${country.borders?.join(', ') || 'None'}</span>
                </div>
              </div>
            </div>
          `
        )
        .join('')}
    </div>

    <div style="margin-top: 24px;">
      ${renderChart()}
    </div>
  `;

  document.querySelectorAll('.remove-btn').forEach((button) => {
    button.addEventListener('click', () => {
      removeCountry(button.dataset.name);
    });
  });
}

async function searchCountries() {
  const query = searchInput.value.trim();

  if (!query) {
    showError('Please enter a country name.');
    return;
  }

  hideError();
  showLoading();

  try {
    const response = await fetch(
  `https://restcountries.com/v3.1/name/${encodeURIComponent(query)}?fields=name,flags,capital,region,subregion,population,area,languages,currencies,timezones,borders`
);

    if (!response.ok) {
      throw new Error('Country search failed.');
    }

    const data = await response.json();
    renderResults(Array.isArray(data) ? data : []);
  } catch (error) {
    renderResults([]);
    showError('No countries found. Try another search.');
  } finally {
    hideLoading();
  }
}

searchButton.addEventListener('click', searchCountries);

clearButton.addEventListener('click', clearSelection);

searchInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    searchCountries();
  }
});

renderResults([]);
renderComparison();