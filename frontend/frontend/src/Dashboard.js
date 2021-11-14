import React, { useState, useEffect } from "react";
import { getCurrentUser, getDash } from "./services/Cognito";

const Dashboard = () => {
  const [loggedInUser, setLoggedInUser] = useState("");

  // useEffect(() => {
  //   console.log("component mount");
  //   async function fetchData() {
  //     const currentUser = await getCurrentUser();
  //     console.log(currentUser);
  //     if (currentUser) {
  //       setLoggedInUser(currentUser.data[2].Value);
  //     } else {
  //       setLoggedInUser("");
  //     }
  //   }
  //   fetchData();
  // }, []);

  useEffect(() => {
    async function goToDash() {
      const dashBoard = await getDash();
      console.log(dashBoard);
    }
    goToDash();
  }, []);

  return (
    <>
      <h3>{loggedInUser ? `Currenty logged in as ${loggedInUser}` : "No user signed in"}</h3>
    </>
  );
};

export default Dashboard;
