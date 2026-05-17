const express = require('express');
const path = require('path');

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (request, response) => {
  response.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api/countries/:name', async (request, response) => {
  const countryName = request.params.name;

  const fields = [
    'name',
    'flags',
    'capital',
    'region',
    'subregion',
    'population',
    'area',
    'languages',
    'currencies',
    'timezones',
    'borders',
  ].join(',');

  const apiUrl = `https://restcountries.com/v3.1/name/${encodeURIComponent(
    countryName
  )}?fields=${fields}`;

  try {
    const apiResponse = await fetch(apiUrl);

    if (!apiResponse.ok) {
      response.status(apiResponse.status).json({
        message: 'Country search failed.',
      });
      return;
    }

    const countries = await apiResponse.json();
    response.json(countries);
  } catch (error) {
    console.error('Country API error:', error);

    response.status(500).json({
      message: 'Unable to retrieve country data.',
    });
  }
});

module.exports = app;

if (require.main === module) {
  const port = process.env.PORT || 3000;

  app.listen(port, () => {
    console.log(`Country Compare app is available on port ${port}`);
  });
}