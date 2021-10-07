const express = require("express");
const path = require("path");
const app = express();
const AmazonCognitoIdentity = require("amazon-cognito-identity-js");
const cognitoConfig = require("./config.json");

const poolData = {
  UserPoolId: cognitoConfig.cognito.userpoolId,
  ClientId: cognitoConfig.cognito.clientId,
};

const userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//keep track of authenticated user. In the /change-password route handler we cannot create a new cognito user object.
//We must use the same user that was authenticated in /login.
let cognitoUser = "";

app.get("/", (req, res) => {
  res.render("landing_page");
});

const checkIfAuthenticated = (req, res, next) => {
  const currentUser = userPool.getCurrentUser();

  if (currentUser) {
    currentUser.getSession((err, session) => {
      if (err) {
        res.json(err);
        return;
      } else {
        next();
      }
    });
  } else {
    res.send("NO USER SIGNED IN");
  }
};

app.get("/secret", checkIfAuthenticated, (req, res) => {
  res.json("This is the secret page");
});

//sign up
app.get("/signup/:accountType", (req, res) => {
  res.render("doctor_signup");
});
app.get("/signup/:accountType", (req, res) => {
  res.render("patient_signup");
});
app.post("/signup/:accountType", (req, res) => {
  const email = req.body.email;
  const password = req.body.password;

  // ** WE CURRENTLY DO NOT HAVE ANY ATTRIBUTES SET UP... ***
  // const dataEmail = {
  //   Name: "email",
  //   Value: email,
  // };
  // const attributeEmail = new AmazonCognitoIdentity.CognitoUserAttribute(dataEmail);

  userPool.signUp(email, password, [], null, (err, result) => {
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
app.get("/login", (req, res) => {
  res.render("login");
});
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
  cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);

  cognitoUser.authenticateUser(authenticationDetails, {
    onSuccess: (result) => {
      const loggedInUserData = result;
      res.json(loggedInUserData);
    },
    onFailure: (err) => {
      res.json(err.message);
      return;
    },
  });
});

app.post("/signout", (req, res) => {
  cognitoUser.globalSignOut({
    onSuccess: (data) => res.send(data),
    onFailure: (err) => res.json(err),
  });
});

app.post("/change-password", (req, res) => {
  if (cognitoUser != null) {
    cognitoUser.getSession((err, session) => {
      if (err) {
        res.json(err);
        return;
      }
    });
    cognitoUser.changePassword(req.body.oldPassword, req.body.newPassword, (err, data) => {
      if (err) {
        res.json(err);
      } else {
        res.json(data);
      }
    });
  }
});

app.listen("3000", () => console.log("Now listening on port 3000"));
