require('dotenv').config();

const cors = require('cors');
const axios = require('axios');
const express = require('express');
const querystring = require('querystring');

const PORT = process.env.PORT || 4567;
const CLIENT_ID = process.env.INSTAGRAM_CLIENT_ID;
const CLIENT_SECRET = process.env.INSTAGRAM_CLIENT_SECRET;

const app = express();

app.use(cors());

const buildRedirectUrl = (req) => {
  if (req.hostname.indexOf('localhost') > -1) {
    return `http://${req.hostname}:${PORT}/auth`;
  } else {
    return `https://${req.hostname}/auth`;
  }
}

app.get('/start', (req, res) => {
  const redirectUrl = buildRedirectUrl(req);
  res.redirect(`https://api.instagram.com/oauth/authorize/?client_id=${CLIENT_ID}&redirect_uri=${redirectUrl}&response_type=code`);
});

app.get('/auth', async (req, res) => {
  const code = req.query.code;
  const redirectUrl = buildRedirectUrl(req);

  const params = {
    'client_id': CLIENT_ID,
    'client_secret': CLIENT_SECRET,
    'grant_type': 'authorization_code',
    'redirect_uri': redirectUrl,
    'code': code
  };

  try {
    const { data } = await axios.post(
      'https://api.instagram.com/oauth/access_token',
      querystring.stringify(params)
    );
    await axios.patch(`https://instagram-media-rights.firebaseio.com/users/${data.user.id}.json`, {
      accessToken: data.access_token,
      username: data.user.username
    });
    res.send(data);
  } catch (error) {
    console.error(error);
    res.sendStatus(500);
  }
});

app.get('/ping', (req, res) => {
  res.send('pong');
  res.end();
});

app.listen(PORT, () => { console.log(`Yayyyy! We are running at ${PORT}`) });