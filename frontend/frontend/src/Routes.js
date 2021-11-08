import React from "react";
import { Route, Switch } from "react-router-dom";
import Register from "./Register";
import Login from "./Login";
import Main from "./Main";
import Dashboard from "./Dashboard";
import StripePayment from "./StripePayment";

const Routes = () => {
  return (
    <Switch>
      <Route exact path="/" component={Main} />
      <Route exact path="/register" component={Register} />
      <Route exact path="/login" component={Login} />
      <Route exact path="/dashboard" component={Dashboard} />
      <Route exact path="/payment" component={StripePayment} />
    </Switch>
  );
};
export default Routes;
