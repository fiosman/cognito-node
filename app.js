const express = require("express");
const app = express();
const AmazonCognitoIdentity = require("amazon-cognito-identity-js");
const cognitoConfig = require("./config.json");

const poolData = {
  UserPoolId: cognitoConfig.cognito.userpoolId,
  ClientId: cognitoConfig.cognito.clientId,
};

const userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.json("Hello");
});

//sign up
app.post("/signup", (req, res) => {
  const email = req.body.email;
  const password = req.body.password;

  const dataEmail = {
    Name: "email",
    Value: email,
  };

  const attributeEmail = new AmazonCognitoIdentity.CognitoUserAttribute(dataEmail);

  userPool.signUp(email, password, [attributeEmail], null, (err, result) => {
    if (err) {
      res.json(err.message);
      return;
    }
    const cognitoUser = result;
    const sub = cognitoUser.userSub;
    res.json(sub);
  });
});

//log in
app.post("/login", (req, res) => {
  const loginDetails = {
    Username: req.body.email,
    Password: req.body.password,
  };
  const authenticationDetails = new AmazonCognitoIdentity.AuthenticationDetails(loginDetails);
  const userData = {
    Username: req.body.email,
    Pool: userPool,
  };
  const cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);
  cognitoUser.authenticateUser(authenticationDetails, {
    onSuccess: (result) => {
      const loggedInUserData = result;
      res.send(loggedInUserData);
    },
    onFailure: (err) => {
      res.send(err.message);
      return;
    },
  });
});

app.listen("3000", () => console.log("Now listening on port 30000"));
