require('dotenv').config();

const cors = require('cors');
const axios = require('axios');
const express = require('express');
const { auth } = require('./auth');
const Sentry = require('@sentry/node');
const { google } = require('googleapis');
const { AES, enc } = require('crypto-js');
const bodyParser = require('body-parser');
const querystring = require('querystring');

const PORT = process.env.PORT || 4567;
const CRYPTO_SECRET = process.env.CRYPTO_SECRET;
const CLIENT_ID = process.env.INSTAGRAM_CLIENT_ID;
const CLIENT_SECRET = process.env.INSTAGRAM_CLIENT_SECRET;
const serviceAccount = require('../DO_NOT_COMMIT_IT_OR_BE_FIRED.json');

const scopes = [
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/firebase.database'
];

const jwtClient = new google.auth.JWT(
  serviceAccount.client_email,
  null,
  serviceAccount.private_key,
  scopes
);

Sentry.init({
  dsn: 'https://08fcc7335f9346f191c1f17b744b67dc@sentry.io/1537378'
});

const app = express();

app.use(Sentry.Handlers.requestHandler());
app.use(bodyParser.json());
app.use(auth(jwtClient));
app.use(cors());

const isLocalhost = req => req.hostname.indexOf('localhost') > -1;

const buildServiceRedirectUrl = req => {
  if (req.hostname.indexOf('localhost') > -1) {
    return `http://${req.hostname}:${PORT}/auth`;
  } else {
    return `https://${req.hostname}/auth`;
  }
};

const buildThankYouPageUrl = userId => {
  const hash = AES.encrypt(userId, CRYPTO_SECRET).toString();

  return `https://www.copyrightproject.org/thanks?id=${hash}`;
};

app.get('/start', (req, res) => {
  const redirectUrl = buildServiceRedirectUrl(req);
  res.redirect(
    `https://api.instagram.com/oauth/authorize/?client_id=${CLIENT_ID}&redirect_uri=${redirectUrl}&response_type=code`
  );
});

app.get('/auth', async (req, res) => {
  const code = req.query.code;
  const redirectUrl = buildServiceRedirectUrl(req);

  const params = {
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    grant_type: 'authorization_code',
    redirect_uri: redirectUrl,
    code: code
  };

  try {
    const { data } = await axios.post(
      'https://api.instagram.com/oauth/access_token',
      querystring.stringify(params)
    );
    await axios.patch(
      `https://instagram-media-rights.firebaseio.com/users/${data.user.id}.json?access_token=${req.firebaseAccessToken}`,
      {
        accessToken: data.access_token,
        copyrightAttribution: data.user.full_name
      }
    );
    if (isLocalhost(req)) {
      res.send(data);
    } else {
      res.redirect(buildThankYouPageUrl(data.user.id));
    }
  } catch (error) {
    console.error(error);
    res.sendStatus(500);
  }
});

app.post('/copyright', async (req, res) => {
  const { attribution, id } = req.body;
  if (!attribution || !id) {
    res.sendStatus(422);

    return;
  }
  const userId = AES.decrypt(id, CRYPTO_SECRET).toString(enc.Utf8);
  await axios.patch(
    `https://instagram-media-rights.firebaseio.com/users/${userId}.json?access_token=${req.firebaseAccessToken}`,
    {
      copyrightAttribution: attribution
    }
  );
  res.sendStatus(200);
});

app.get('/ping', (req, res) => {
  res.send('pong');
});

app.use(Sentry.Handlers.errorHandler());

app.listen(PORT, () => {
  console.log(`Yayyyy! We are running at ${PORT}`);
});
