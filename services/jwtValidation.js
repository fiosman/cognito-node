const request = require("request");
const jwkToPem = require("jwk-to-pem");
const jwt = require("jsonwebtoken");

function validateJWT(opts, callback) {
  let { poolRegion, userPoolId, token, tokenType } = opts;
  let iss = "https://cognito-idp." + poolRegion + ".amazonaws.com/" + userPoolId;
  let pems = null;

  //Fetch JWKs and save as PEM
  if (pems === null) {
    request(
      {
        url: iss + "/.well-known/jwks.json",
        json: true,
      },
      function (error, response, body) {
        if (!error && response.statusCode === 200) {
          pems = {};
          const keys = body.keys;
          for (let i = 0; i < keys.length; i++) {
            const key_id = keys[i].kid;
            const modulus = keys[i].n;
            const exponent = keys[i].e;
            const key_type = keys[i].kty;
            const jwk = {
              kty: key_type,
              n: modulus,
              e: exponent,
            };
            const pem = jwkToPem(jwk);
            pems[key_id] = pem;
          }

          //validate the token
          const decodedJwt = jwt.decode(token, {
            complete: true,
          });

          if (!decodedJwt) {
            return callback(new Error("Not a valid JSON web token!"));
          }

          if (decodedJwt.payload.iss != iss) {
            return callback(new Error("Not a valid issuer"));
          }

          if (decodedJwt.payload.token_use != tokenType) {
            return callback(new Error("Not an " + tokenType + " token"));
          }

          const kid = decodedJwt.header.kid;
          const pem = pems[kid];
          if (!pem) {
            return callback(new Error("Invalid access token"));
          }
          jwt.verify(
            token,
            pem,
            {
              issuer: iss,
              ignoreExpiration: false,
            },
            function (err, payload) {
              if (err) {
                return callback(err);
              } else {
                return callback(null, { message: "Token validated" });
              }
            }
          );
        } else {
          return callback(error);
        }
      }
    );
  }
}

module.exports = {
  validateJWT,
};
