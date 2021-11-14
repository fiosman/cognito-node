const express = require("express");
const path = require("path");
const app = express();
const AmazonCognitoIdentity = require("amazon-cognito-identity-js");
const cognitoConfig = require("./config.json");
const cookieParser = require("cookie-parser");
const multer = require("multer");
const cors = require("cors");
const { validateJWT } = require("./services/jwtValidation");
const stripe = require("stripe")("enter sk here");

const poolData = {
  UserPoolId: cognitoConfig.cognito.userpoolId,
  ClientId: cognitoConfig.cognito.clientId,
};

const userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
//keep track of authenticated user. In the /change-password route handler we cannot create a new cognito user object.
//We must use the same user that was authenticated in /login.
let cognitoUser = "";

app.post("/create-payment-intent", async (req, res) => {
  const { items } = req.body;
  // Create a PaymentIntent with the order amount and currency
  const paymentIntent = await stripe.paymentIntents.create({
    amount: 1000,
    currency: "cad",
    payment_method_types: ["card"],
    receipt_email: "",
  });

  return res.json({
    clientSecret: paymentIntent.client_secret,
  });
});

app.get("/", (req, res) => {
  res.render("landing_page");
});

// const checkIfAuthenticated = (req, res, next) => {
//   const accessTokenFromClient = req.headers.accesstoken;
//   if (!accessTokenFromClient)
//     return res.status(401).json({ err: "Access token missing from headers" });

//   cognitoExpress.validate(accessTokenFromClient, function (err, res) {
//     if (err) {
//       return res.status(401).json({ err: err });
//     } else {
//       next();
//     }
//   });

// const currentUser = userPool.getCurrentUser();

// if (currentUser) {
//   currentUser.getSession((err, session) => {
//     if (err) {
//       res.json(err);
//       return;
//     } else {
//       next();
//     }
//   });
// } else {
//   res.send("NO USER SIGNED IN");
// }
// };

const isAuthenticated = (req, res, next) => {
  // let config = {
  //   poolRegion: cognitoConfig.cognito.region,
  //   userPoolId: cognitoConfig.cognito.userpoolId,
  //   tokenType: "access",
  //   token: req.headers.accesstoken,
  // };

  // if (!config.token) return res.status(401).send("Access Token missing from header");

  // validateJWT(config, function (err, response) {
  //   if (err) {
  //     return res.status(401).json({ err: err.message });
  //   }

  //   cognitoUser.getSession((err, data) => {
  //     if (err) {
  //       return res.status(401).json({ err: err.message });
  //     } else {
  //       next();
  //     }
  //   });
  // });

  if (!cognitoUser) {
    return res.status(401).json({ err: "Could not retrieve the current user" });
  }

  cognitoUser.getSession((err, session) => {
    console.log(session.getAccessToken().getJwtToken());
    console.log("------------------");
    console.log(session.getRefreshToken().getToken());
    console.log("------------------");
    if (err) {
      return res.status(401).json({ err: err });
    }

    if (session.isValid()) {
      next();
    } else {
      return res.status(401).json({ err: "Session is not valid" });
    }
  });
};

app.get("/secret", isAuthenticated, (req, res) => {
  return res.json("This is the secret page");
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
      res.status(400).json({ err: err.message });
      return;
    }
    const cognitoUser = result;
    const sub = cognitoUser.userSub;
    return res.json({ sub: sub });
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
      return res.json(loggedInUserData);
    },
    onFailure: (err) => {
      if (err) return res.status(401).json({ err: err.message });
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

//get currentUser
app.get("/current_user", isAuthenticated, (req, res) => {
  if (cognitoUser) {
    cognitoUser.getSession((err, session) => {
      if (err) {
        return res.json(err);
      } else {
        cognitoUser.getUserAttributes((err, data) => {
          if (err) {
            return res.json(err);
          } else {
            return res.json(data);
          }
        });
      }
    });
  } else {
    return res.status(400).json({ err: "Something went wrong" });
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

app.listen("8081", () => console.log("Now listening on port 8081"));
