import React from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Common/Sidebar";
import Header from "./Common/Header";

const Layout = () => {
  return (
    <div className="main-wrapper">
      <Sidebar />
      <Header />

      <Outlet />
    </div>
  );
};

export default Layout;
