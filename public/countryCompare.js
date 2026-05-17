const pageName = document.body.dataset.page;

const searchInput = document.getElementById("searchInput");
const searchButton = document.getElementById("searchButton");
const clearButton = document.getElementById("clearButton");
const refreshSavedButton = document.getElementById("refreshSavedButton");

const resultsContainer = document.getElementById("results");
const compareContent = document.getElementById("compareContent");
const savedCountriesContainer = document.getElementById("savedCountries");

const errorBox = document.getElementById("errorBox");
const successBox = document.getElementById("successBox");
const loadingBox = document.getElementById("loadingBox");
const homeStatus = document.getElementById("homeStatus");

let selectedCountries = [];
let countryChart = null;
let countryMap = null;
let countryMarkers = [];

function showMessage(element, message) {
  if (!element) {
    return;
  }

  element.textContent = message;
  element.style.display = "block";
}

function hideMessage(element) {
  if (!element) {
    return;
  }

  element.textContent = "";
  element.style.display = "none";
}

function showError(message) {
  showMessage(errorBox, message);
}

function hideError() {
  hideMessage(errorBox);
}

function showSuccess(message) {
  showMessage(successBox, message);

  setTimeout(() => {
    hideMessage(successBox);
  }, 3000);
}

function showLoading() {
  showMessage(loadingBox, "Loading countries...");
}

function hideLoading() {
  hideMessage(loadingBox);
}

function formatLanguages(languages) {
  if (!languages) {
    return "N/A";
  }

  return Object.values(languages).join(", ");
}

function formatCurrencies(currencies) {
  if (!currencies) {
    return "N/A";
  }

  return Object.values(currencies)
    .map((currency) => currency.name)
    .join(", ");
}

function countryToDatabasePayload(country) {
  return {
    country_name: country.name?.common || "Unknown",
    official_name: country.name?.official || "Unknown",
    capital: country.capital?.[0] || "N/A",
    region: country.region || "N/A",
    subregion: country.subregion || "N/A",
    population: country.population || 0,
    area: country.area || 0,
    flag_url: country.flags?.png || "",
  };
}

/* converts a saved Supabase row into the same shape as a REST Countries result */
function savedCountryToComparisonCountry(savedCountry) {
  return {
    name: {
      common: savedCountry.country_name,
      official: savedCountry.official_name || savedCountry.country_name,
    },
    flags: {
      png: savedCountry.flag_url || "",
    },
    capital: savedCountry.capital ? [savedCountry.capital] : [],
    region: savedCountry.region || "N/A",
    subregion: savedCountry.subregion || "N/A",
    population: savedCountry.population || 0,
    area: savedCountry.area || 0,
    languages: null,
    currencies: null,
    timezones: [],
    borders: [],
    latlng: null,
  };
}

function addSavedCountryToComparison(savedCountry) {
  const comparisonCountry = savedCountryToComparisonCountry(savedCountry);

  if (pageName === "home") {
    sessionStorage.setItem(
      "pendingComparisonCountry",
      JSON.stringify(comparisonCountry),
    );
    window.location.href = "/compare";
    return;
  }

  addCountry(comparisonCountry);
}

/*
  Fetch call 1:
  Gets data from an external provider through the backend.
*/
async function searchCountries() {
  const query = searchInput.value.trim();

  if (!query) {
    showError("Please enter a country name.");
    return;
  }

  hideError();
  hideMessage(successBox);
  showLoading();

  try {
    const response = await fetch(`/api/countries/${encodeURIComponent(query)}`);

    if (!response.ok) {
      throw new Error("Country search failed.");
    }

    const data = await response.json();
    renderResults(Array.isArray(data) ? data : []);
  } catch (error) {
    console.error(error);
    renderResults([]);
    showError("No countries found. Try another search.");
  } finally {
    hideLoading();
  }
}

/*
  Fetch call 2:
  Retrieves database data from Supabase through the backend.
*/
async function loadSavedCountries() {
  if (!savedCountriesContainer) {
    return;
  }

  if (homeStatus) {
    showMessage(homeStatus, "Loading saved countries...");
  }

  try {
    const response = await fetch("/api/favorites");

    if (!response.ok) {
      throw new Error("Saved countries could not be loaded.");
    }

    const savedCountries = await response.json();
    renderSavedCountries(savedCountries);
  } catch (error) {
    console.error(error);

    savedCountriesContainer.innerHTML = `
      <div class="empty-state">
        <h3>Saved countries unavailable</h3>
        <p>Check your Supabase environment variables and database table.</p>
      </div>
    `;
  } finally {
    if (homeStatus) {
      hideMessage(homeStatus);
    }
  }
}

/*
  Fetch call 3:
  Writes selected country data to Supabase through the backend.
*/
async function saveCountry(country) {
  try {
    const response = await fetch("/api/favorites", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(countryToDatabasePayload(country)),
    });

    const result = await response.json();

    if (response.status === 409) {
      showError(result.message || "This country is already saved.");
      return;
    }

    if (!response.ok) {
      throw new Error(result.message || "Country could not be saved.");
    }

    showSuccess(`${country.name.common} was saved to the database.`);
    await loadSavedCountries();
  } catch (error) {
    console.error(error);
    showError("Unable to save this country. Check your Supabase setup.");
  }
}

async function deleteSavedCountry(id) {
  try {
    const response = await fetch(`/api/favorites/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error("Saved country could not be deleted.");
    }

    await loadSavedCountries();
  } catch (error) {
    console.error(error);
    showError("Unable to delete saved country.");
  }
}

function addCountry(country) {
  const alreadySelected = selectedCountries.some(
    (selectedCountry) => selectedCountry.name.common === country.name.common,
  );

  if (alreadySelected) {
    return;
  }

  if (selectedCountries.length >= 4) {
    showError("You can compare up to 4 countries at a time.");
    return;
  }

  hideError();
  selectedCountries.push(country);

  renderComparison();
  renderChartWithLibrary();
  renderMapWithLibrary();
}

function removeCountry(countryName) {
  selectedCountries = selectedCountries.filter(
    (country) => country.name.common !== countryName,
  );

  renderComparison();
  renderChartWithLibrary();
  renderMapWithLibrary();
}

function clearSelection() {
  selectedCountries = [];
  renderComparison();
  renderChartWithLibrary();
  renderMapWithLibrary();
  hideError();
}

function renderResults(countries) {
  if (!resultsContainer) {
    return;
  }

  resultsContainer.innerHTML = "";

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
    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
      <img class="flag" src="${country.flags?.png || ""}" alt="${country.name.common} flag">

      <div class="card-body">
        <div class="result-header">
          <div>
            <h3>${country.name.common}</h3>
            <p class="muted">${country.region || "N/A"}</p>
          </div>
        </div>

        <div class="detail-grid">
          <div class="detail-box">
            <strong>Capital</strong>
            <span>${country.capital?.[0] || "N/A"}</span>
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
            <span>${country.subregion || "N/A"}</span>
          </div>
        </div>

        <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-top: 16px;">
          <button class="btn btn-outline add-btn">Add to Compare</button>
          <button class="btn btn-primary save-btn">Save to Database</button>
        </div>
      </div>
    `;

    card.querySelector(".add-btn").addEventListener("click", () => {
      addCountry(country);
    });

    card.querySelector(".save-btn").addEventListener("click", () => {
      saveCountry(country);
    });

    resultsContainer.appendChild(card);
  });
}

function renderComparison() {
  if (!compareContent) {
    return;
  }

  if (!selectedCountries.length) {
    compareContent.innerHTML = `
      <div class="empty-state">
        <h3>No countries selected yet</h3>
        <p>Search for a country above and click Add to Compare.</p>
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
              <img class="flag" src="${country.flags?.png || ""}" alt="${country.name.common} flag">

              <div class="card-body">
                <div class="result-header">
                  <div>
                    <h3>${country.name.common}</h3>
                    <p class="muted">${country.capital?.[0] || "N/A"}</p>
                  </div>

                  <button class="btn btn-outline remove-btn" data-name="${country.name.common}">
                    Remove
                  </button>
                </div>

                <div class="detail-grid">
                  <div class="detail-box">
                    <strong>Region</strong>
                    <span>${country.region || "N/A"}</span>
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
                    <span>${country.timezones?.join(", ") || "N/A"}</span>
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
                  <span>${country.borders?.join(", ") || "None"}</span>
                </div>
              </div>
            </div>
          `,
        )
        .join("")}
    </div>
  `;

  document.querySelectorAll(".remove-btn").forEach((button) => {
    button.addEventListener("click", () => {
      removeCountry(button.dataset.name);
    });
  });
}

function renderSavedCountries(savedCountries) {
  if (!savedCountriesContainer) {
    return;
  }

  savedCountriesContainer.innerHTML = "";

  if (!savedCountries.length) {
    savedCountriesContainer.innerHTML = `
      <div class="empty-state">
        <h3>No saved countries yet</h3>
        <p>Use the Compare page to save countries to the database.</p>
      </div>
    `;
    return;
  }

  savedCountries.forEach((country) => {
    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
      ${country.flag_url ? `<img class="flag" src="${country.flag_url}" alt="${country.country_name} flag">` : ""}

      <div class="card-body">
        <div class="result-header">
          <div>
            <h3>${country.country_name}</h3>
            <p class="muted">${country.official_name || "Saved country"}</p>
          </div>
        </div>

        <div class="detail-grid">
          <div class="detail-box">
            <strong>Capital</strong>
            <span>${country.capital || "N/A"}</span>
          </div>

          <div class="detail-box">
            <strong>Region</strong>
            <span>${country.region || "N/A"}</span>
          </div>

          <div class="detail-box">
            <strong>Population</strong>
            <span>${Number(country.population || 0).toLocaleString()}</span>
          </div>

          <div class="detail-box">
            <strong>Area</strong>
            <span>${Number(country.area || 0).toLocaleString()} km²</span>
          </div>
        </div>

          <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-top: 16px;">
            <button 
            class="btn btn-outline compare-saved-btn" 
            data-id="${country.id}"
          >
            Add to Compare
          </button>

          ${
            pageName === "compare"
              ? `<button class="btn btn-danger delete-saved-btn" data-id="${country.id}">
                 Delete Saved Entry
               </button>`
              : ""
          }
        </div>
      </div>
    `;

    const compareButton = card.querySelector(".compare-saved-btn");
    const deleteButton = card.querySelector(".delete-saved-btn");

    if (compareButton) {
      compareButton.addEventListener("click", () => {
        addSavedCountryToComparison(country);
      });
    }

    if (deleteButton) {
      deleteButton.addEventListener("click", () => {
        deleteSavedCountry(deleteButton.dataset.id);
      });
    }

    savedCountriesContainer.appendChild(card);
  });
}

/*
  Frontend library 1:
  Chart.js chart for selected country population and area.
*/
function renderChartWithLibrary() {
  const chartCanvas = document.getElementById("countryChart");

  if (!chartCanvas || typeof Chart === "undefined") {
    return;
  }

  if (countryChart) {
    countryChart.destroy();
  }

  const labels = selectedCountries.map((country) => country.name.common);
  const populationData = selectedCountries.map(
    (country) => country.population || 0,
  );

  countryChart = new Chart(chartCanvas, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Population",
          data: populationData,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
        },
        title: {
          display: true,
          text: "Population Comparison",
        },
      },
      scales: {
        y: {
          beginAtZero: true,
        },
      },
    },
  });
}

/*
  Frontend library 2:
  Leaflet map for selected countries.
*/
function renderMapWithLibrary() {
  const mapElement = document.getElementById("countryMap");

  if (!mapElement || typeof L === "undefined") {
    return;
  }

  if (!countryMap) {
    countryMap = L.map("countryMap").setView([20, 0], 2);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(countryMap);
  }

  countryMarkers.forEach((marker) => {
    marker.remove();
  });

  countryMarkers = [];

  selectedCountries.forEach((country) => {
    if (!country.latlng || country.latlng.length < 2) {
      return;
    }

    const marker = L.marker(country.latlng)
      .addTo(countryMap)
      .bindPopup(
        `${country.name.common}<br>${country.capital?.[0] || "No capital listed"}`,
      );

    countryMarkers.push(marker);
  });

  if (countryMarkers.length) {
    const group = L.featureGroup(countryMarkers);
    countryMap.fitBounds(group.getBounds().pad(0.4));
  } else {
    countryMap.setView([20, 0], 2);
  }
}

function setupComparePage() {
  if (searchButton) {
    searchButton.addEventListener("click", searchCountries);
  }

  if (searchInput) {
    searchInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        searchCountries();
      }
    });
  }

  if (clearButton) {
    clearButton.addEventListener("click", clearSelection);
  }

  if (refreshSavedButton) {
    refreshSavedButton.addEventListener("click", loadSavedCountries);
  }

  renderResults([]);
  renderComparison();
  loadSavedCountries();

  const pendingCountry = sessionStorage.getItem("pendingComparisonCountry");

  if (pendingCountry) {
    addCountry(JSON.parse(pendingCountry));
    sessionStorage.removeItem("pendingComparisonCountry");
  }

  setTimeout(() => {
    renderChartWithLibrary();
    renderMapWithLibrary();
  }, 200);
}

function setupHomePage() {
  loadSavedCountries();
}

if (pageName === "compare") {
  setupComparePage();
}

if (pageName === "home") {
  setupHomePage();
}
