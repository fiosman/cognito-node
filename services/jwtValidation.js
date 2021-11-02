const request = require("request");
const jwkToPem = require("jwk-to-pem");
const jwt = require("jsonwebtoken");
const poolRegion = require("../config.json").cognito.region;
const userPoolId = require("../config.json").cognito.userpoolId;

function verify(opts) {
  let { poolRegion, userPoolId, token } = opts;
  let iss = "https://cognito-idp." + poolRegion + ".amazonaws.com/" + userPoolId;
  let pems;

  if (!pems) {
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
          const jwtValidOpts = {
            iss,
            tokenType: "access",
            ignoreExpiry: "false",
            token,
            pems,
          };
          const isValid = ValidateToken({
            iss,
            tokenType: "access",
            ignoreExpiry: "false",
            token,
            pems,
          });
          console.log("Is token valid?");
          console.log(isValid);
        } else {
          console.log("Error downloading JWK!");
        }
      }
    );
  } else {
    const isValid = ValidateToken({
      iss,
      tokenType: "access",
      ignoreExpiry: "false",
      token,
      pems,
    });
    console.log("Is token valid?");
    console.log(isValid);
  }
}

function ValidateToken(opts) {
  var isValid = false;
  var decodedJwt = jwt.decode(opts.token, {
    complete: true,
  });
  if (!decodedJwt) {
    console.log("Not a valid JWT token");
    return;
  }

  if (decodedJwt.payload.iss != opts.iss) {
    console.log("invalid issuer");
    return;
  }

  if (decodedJwt.payload.token_use != opts.tokenType) {
    console.log(opts.tokenType);
    console.log("Not an " + opts.tokenType + " token");
    return;
  }

  var kid = decodedJwt.header.kid;
  var pem = opts.pems[kid];
  if (!pem) {
    console.log("Invalid access token");
    return;
  }

  console.log("Ignore expiry?\n" + opts.ignoreExpiry);
  if (opts.ignoreExpiry == "true") {
    console.log("Skipping expiration check...");
    jwt.verify(
      opts.token,
      pem,
      {
        issuer: opts.iss,
        ignoreExpiration: true,
      },
      function (err, payload) {
        if (err) {
          console.log(err);
        } else {
          console.log(payload);
          isValid = true;
        }
      }
    );
  } else {
    console.log("Also checking token expiration...");
    jwt.verify(
      opts.token,
      pem,
      {
        issuer: opts.iss,
        ignoreExpiration: false,
      },
      function (err, payload) {
        if (err) {
          console.log("Error verifying token: " + err.name + ":" + err.message);
        } else {
          console.log(payload);
          isValid = true;
        }
      }
    );
  }
  return isValid;
}

module.exports = {
  verify,
};
