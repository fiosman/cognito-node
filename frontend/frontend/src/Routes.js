import React from "react";
import { Route, Switch } from "react-router-dom";
import Register from "./Register";
import Login from "./Login";
import Main from "./Main";

const Routes = () => {
  return (
    <Switch>
      <Route exact path="/" component={Main} />
      <Route exact path="/register" component={Register} />
      <Route exact path="/login" component={Login} />
    </Switch>
  );
};
export default Routes;
