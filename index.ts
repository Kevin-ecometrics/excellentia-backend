require('dotenv').config();
const express = require('express');
const OAuthClient = require('intuit-oauth');

const app = express();
const port = 3000;

const oauthClient = new OAuthClient({
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  environment: process.env.ENVIRONMENT,
  redirectUri: 'http://localhost:8000/callback',
  logging: true,
  token: {
    access_token: process.env.ACCESS_TOKEN,
    refresh_token: process.env.REFRESH_TOKEN,
    realmId: process.env.REALM_ID,
    expires_in: parseInt(process.env.EXPIRES_IN),
    x_refresh_token_expires_in: parseInt(process.env.X_REFRESH_TOKEN_EXPIRES_IN),
  }
});

async function refreshToken() {
  try {
    const authResponse = await oauthClient.refresh();
    const token = authResponse.getToken();
    console.log('Token refreshed successfully');
    return token;
  } catch (err) {
    console.error('Failed to refresh token:', err.message);
    return null;
  }
}

async function apiCall(endpoint) {
  if (!oauthClient.isAccessTokenValid()) {
    const refreshed = await refreshToken();
    if (!refreshed) {
      throw new Error('Token expired and could not be refreshed');
    }
  }
  const response = await oauthClient.makeApiCall({ url: endpoint });
  return response.json;
}

app.get('/', (req, res) => {
  res.json({ status: 'ok', environment: process.env.ENVIRONMENT, realmId: process.env.REALM_ID });
});

app.get('/api/company', async (req, res) => {
  try {
    const data = await apiCall(`/v3/company/${process.env.REALM_ID}/companyinfo/${process.env.REALM_ID}`);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/customers', async (req, res) => {
  try {
    const data = await apiCall(`/v3/company/${process.env.REALM_ID}/query?query=select * from Customer`);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/accounts', async (req, res) => {
  try {
    const data = await apiCall(`/v3/company/${process.env.REALM_ID}/query?query=select * from Account`);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/items', async (req, res) => {
  try {
    const data = await apiCall(
      `/v3/company/${process.env.REALM_ID}/query?query=select * from Item`
    );
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});