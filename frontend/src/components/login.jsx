import React, { useState } from "react";

import { Link, useNavigate } from "react-router-dom";
import Swal from "sweetalert2"; // import SweetAlert2
import axiosInstance from "../apis/axiosConfig";

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const res = await axiosInstance.post("/api/users/login", {
        email,
        password,
      });

      // Save JWT token and user info
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));

      // Show success popup
      Swal.fire({
        icon: "success",
        title: "Login Successful",
        text: `Welcome, ${res.data.user.name}!`,
        showConfirmButton: false,
        timer: 1500, // automatically close after 1.5 seconds
      }).then(() => {
        navigate("dashboard/Dashboard"); // redirect after popup closes
      });
    } catch (error) {
      console.error("Login failed:", error);
      setErrorMsg(error.response?.data?.message || "Login failed. Try again.");
    }
  };

  return (
    <div className="account-page">
      <div className="main-wrapper">
        <div className="account-content">
          <div className="d-flex flex-wrap w-100 vh-100 overflow-hidden account-bg-01">
            <div className="d-flex align-items-center justify-content-center flex-wrap vh-100 overflow-auto p-4 w-50 bg-backdrop">
              <form onSubmit={handleSubmit} className="flex-fill">
                <div className="mx-auto mw-450">
                  <div className="text-center mb-4">
                    <img
                      src="/assets/img/spect_logo.png"
                      alt="Logo"
                      style={{
                        width: "250px",
                        height: "auto",
                        marginTop: "-90px",
                      }}
                    />
                  </div>
                  <div className="mb-4">
                    <h4 className="mb-2 fs-20">Sign In</h4>
                    <p>Access the CRMS panel using your email and passcode.</p>
                  </div>

                  {errorMsg && (
                    <div className="alert alert-danger">{errorMsg}</div>
                  )}

                  <div className="mb-3">
                    <label className="col-form-label">Email Address</label>
                    <div className="position-relative">
                      <span className="input-icon-addon">
                        <i className="ti ti-mail"></i>
                      </span>
                      <input
                        type="email"
                        className="form-control"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="col-form-label">Password</label>
                    <div className="pass-group">
                      <input
                        type="password"
                        className="pass-input form-control"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="d-flex align-items-center justify-content-between mb-3">
                    <div className="form-check form-check-md d-flex align-items-center">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="checkebox-md"
                      />
                      <label
                        className="form-check-label"
                        htmlFor="checkebox-md"
                      >
                        Remember Me
                      </label>
                    </div>
                    {/* <div className="text-end">
                      <Link
                        to="/ForgotPassword"
                        className="text-primary fw-medium link-hover"
                      >
                        Forgot Password?
                      </Link>
                    </div> */}
                  </div>

                  <div className="mb-3">
                    <button type="submit" className="btn btn-primary w-100">
                      Sign In
                    </button>
                  </div>

                  {/* <div className="mb-3">
                    <h6>
                      New on our platform?
                      <Link
                        to="/Register"
                        className="text-purple link-hover ms-1"
                      >
                        Create an account
                      </Link>
                    </h6>
                  </div>

                  <div className="form-set-login or-text mb-3">
                    <h4>OR</h4>
                  </div> */}

                  <div className="text-center">
                    <p className="fw-medium text-gray">
                      Copyright &copy; 2025 - CRMS
                    </p>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
