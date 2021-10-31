import React from "react";
import { useHistory } from "react-router";
import { Button } from "antd";
const Main = () => {
  let history = useHistory();
  return (
    <>
      <Button type="link" onClick={() => history.push("/register")}>
        Register
      </Button>
      <Button type="link" onClick={() => history.push("/login")}>
        Login
      </Button>
    </>
  );
};

export default Main;
