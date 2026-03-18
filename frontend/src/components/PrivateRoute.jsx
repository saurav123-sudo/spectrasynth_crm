// components/PrivateRoute.jsx
import React from "react";
import { Navigate, Outlet } from "react-router-dom";

const PrivateRoute = () => {
  const token = localStorage.getItem("token"); // check if token exists

  return token ? <Outlet /> : <Navigate to="/" />; // redirect to login if no token
};

export default PrivateRoute;
