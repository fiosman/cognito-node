import React, { useState, useEffect } from "react";
import { getCurrentUser } from "./services/Cognito";

const Dashboard = () => {
  const [loggedInUser, setLoggedInUser] = useState("");

  useEffect(() => {
    console.log("component mount");
    async function fetchData() {
      const currentUser = await getCurrentUser();
      console.log(currentUser);
      if (currentUser) {
        setLoggedInUser(currentUser.data[2].Value);
      } else {
        setLoggedInUser("");
      }
    }
    fetchData();
  }, []);

  return (
    <>
      <h3>{loggedInUser ? `Currenty logged in as ${loggedInUser}` : "No user signed in"}</h3>
    </>
  );
};

export default Dashboard;
