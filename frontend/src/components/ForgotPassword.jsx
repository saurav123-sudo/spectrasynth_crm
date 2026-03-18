import React from "react";
import { Link } from "react-router-dom";

const ForgotPassword = () => {
  return (
    <>
      <div className="account-page">
        {/* <!-- Main Wrapper --> */}
        <div className="main-wrapper">
          <div className="account-content">
            <div className="d-flex flex-wrap w-100 vh-100 overflow-hidden account-bg-03">
              <div className="d-flex align-items-center justify-content-center flex-wrap vh-100 overflow-auto p-4 w-50 bg-backdrop">
                <form
                  action="https://crms.dreamstechnologies.com/html/template/login.html"
                  className="flex-fill"
                >
                  <div className="mx-auto mw-450">
                    <div className="text-center mb-4">
                      <img
                        src="/assets/img/logo.svg"
                        className="img-fluid"
                        alt="Logo"
                      />
                    </div>
                    <div className="mb-4">
                      <h4 className="mb-2 fs-20">Forgot Password?</h4>
                      <p>
                        If you forgot your password, well, then we’ll email you
                        instructions to reset your password.
                      </p>
                    </div>
                    <div className="mb-3">
                      <label className="col-form-label">Email Address</label>
                      <div className="position-relative">
                        <span className="input-icon-addon">
                          <i className="ti ti-mail"></i>
                        </span>
                        <input type="text" value="" className="form-control" />
                      </div>
                    </div>
                    <div className="mb-3">
                      <button type="submit" className="btn btn-primary w-100">
                        Submit
                      </button>
                    </div>
                    <div className="mb-3 text-center">
                      <span>
                        Return to{" "}
                        <Link to="/" className="text-purple link-hover">
                          {" "}
                          Login
                        </Link>
                      </span>
                    </div>
                    <div className="form-set-login or-text mb-3">
                      <h4>OR</h4>
                    </div>
                    <div className="text-center">
                      <p className="fw-medium text-gray">
                        Copyright &copy; 2024 - CRMS
                      </p>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
        {/* <!-- /Main Wrapper --> */}
      </div>
    </>
  );
};

export default ForgotPassword;
