const auth = jwtClient => (req, res, next) => {
  jwtClient.authorize((error, tokens) => {
    if (error) {
      console.log('Error making request to generate access token:', error);
      res.sendStatus(500);
      res.end();
    } else if (tokens.access_token === null) {
      console.log(
        'Provided service account does not have permission to generate access tokens'
      );
      res.sendStatus(401);
      res.end();
    } else {
      const accessToken = tokens.access_token;
      req.firebaseAccessToken = accessToken;
    }
    next();
  });
};

module.exports = { auth };
