import axios from "axios";
const instance = axios.create({ baseURL: "http://localhost:8081" });
//Sign up
export const signupUser = (userDetails) => {
  return instance.post("/signup/doctor", userDetails);
};
//Log in
export const loginUser = async (userDetails) => {
  const { data } = await instance.post("/login", userDetails);
  return data;
};
//get current user
export const getCurrentUser = () => {
  return instance.get("/current_user");
};
