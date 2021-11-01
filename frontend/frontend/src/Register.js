import React, { useState, useEffect } from "react";
import { Form, Input, Button } from "antd";
import { signupUser } from "./services/Cognito";

const Register = () => {
  const [userInfo, setUserInfo] = useState({ email: "", password: "" });

  const registerHandler = async () => {
    await signupUser(userInfo);
  };

  return (
    <Form
      name="basic"
      labelCol={{
        span: 8,
      }}
      wrapperCol={{
        span: 16,
      }}
      autoComplete="off"
    >
      <Form.Item
        label="Email"
        name="email"
        rules={[
          {
            required: true,
            message: "Email is required",
          },
        ]}
        onBlur={(e) => setUserInfo({ ...userInfo, email: e.target.value })}
      >
        <Input />
      </Form.Item>

      <Form.Item
        label="Password"
        name="password"
        rules={[
          {
            required: true,
            message: "Password is required",
          },
        ]}
        onBlur={(e) => setUserInfo({ ...userInfo, password: e.target.value })}
      >
        <Input.Password />
      </Form.Item>

      <Form.Item
        wrapperCol={{
          offset: 8,
          span: 16,
        }}
      >
        <Button type="primary" htmlType="submit" onClick={registerHandler}>
          Submit
        </Button>
      </Form.Item>
    </Form>
  );
};

export default Register;
