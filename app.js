const express = require("express");
const path = require("path");
const app = express();
const AmazonCognitoIdentity = require("amazon-cognito-identity-js");
const cognitoConfig = require("./config.json");
const cookieParser = require("cookie-parser");
const multer = require("multer");
const { createSecretKey } = require("crypto");

const poolData = {
  UserPoolId: cognitoConfig.cognito.userpoolId,
  ClientId: cognitoConfig.cognito.clientId,
};

const userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
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
app.get("/signup/:accountType", (req, res) => res.render("doctor_signup"));
app.get("/signup/:accountType", (req, res) => res.render("patient_signup"));
app.get("/confirmation", (req, res) => res.render("confirmation"));
app.get("/confirmed", (req, res) => {
  //the below params come from the query string produced by the custom message trigger function we defined in lambda console
  //we bypass URL redirect to aws UI here. Instead the whole flow is through our app UI
  const userData = {
    Username: req.query.email,
    Pool: userPool,
  };
  const verificationCode = req.query.code;
  const dummyCognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);
  dummyCognitoUser.confirmRegistration(verificationCode, true, (err, result) => {
    if (err) {
      res.json({ error: err });
    } else {
      res.json({
        isConfirmed: true,
      });
    }
  });
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
    res.redirect("/confirmation");
  });
});

//log in
app.get("/login", (req, res) => res.render("login"));
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
      if (err.name === "UserNotConfirmedException") {
        return res.json({ isConfirmed: false, userData: userData });
      }
    },
  });
});

app.post("/resend-confirmation", (req, res) => {
  const userData = {
    Username: req.body.email,
    Pool: userPool,
  };
  const dummyCognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);
  dummyCognitoUser.resendConfirmationCode((error, result) => {
    if (error) {
      return res.json({ error: error.message });
    } else {
      return res.json({ message: "Validation email was resent!" });
    }
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

//forgot password
app.get("/forgot_password", (req, res) => res.render("forgot_password"));
app.post("/forgot_password", (req, res) => {
  const userData = {
    Username: req.body.email,
    Pool: userPool,
  };
  const cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);

  cognitoUser.forgotPassword({
    onSuccess: (data) => {
      res.cookie("userEmail", userData.Username, {
        maxAge: 120000,
        secure: true,
        httpOnly: true,
        sameSite: "lax",
      });
      res.redirect("/confirm_password");
    },
    onFailure: (err) => res.json(err),
  });
});
//confirm password reset
app.get("/confirm_password", (req, res) => {
  res.render("confirm_password");
});
app.post("/confirm_password", (req, res) => {
  const userData = {
    Username: req.cookies.userEmail,
    Pool: userPool,
  };
  const verificationCode = req.body.verification_code;
  const newPassword = req.body.new_password;
  const cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);
  cognitoUser.confirmPassword(verificationCode, newPassword, {
    onSuccess: (data) => {
      res.clearCookie("userEmail");
      res.json(data);
    },
    onFailure: (err) => res.json(err),
  });
});

const upload = multer({
  dest: "./uploads",
  fileFilter: (req, file, cb) => {
    if (!file.originalname.match(/\.(jpg|jpeg|png)$/)) {
      return cb(null, false);
    }
    cb(null, true);
  },
});

app.post("/uploadFile", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.json({ err: "Invalid file type uploaded. Only images are allowed." });
  }
  return res.json({ file: req.file });
});

app.listen("3000", () => console.log("Now listening on port 3000"));
