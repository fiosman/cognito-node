import axios from "axios";
const instance = axios.create({ baseURL: "http://2437-72-138-224-233.ngrok.io" });
//Sign up
export const signupUser = (userDetails) => {
  return instance.post("/signup/doctor", userDetails);
};
//Log in
export const loginUser = (userDetails) => {
  return instance.post("/login", userDetails);
};
//get current user
export const getCurrentUser = () => {
  return instance.get("/current_user");
};

export const getDash = () => {
  return instance.get("/secret");
};
