import React from 'react';
import { Link } from 'react-router-dom';

const Register = () => {
    return (
        <>
            <div className="account-page">


                {/* <!-- Main Wrapper --> */}
    <div className="main-wrapper">

        <div className="account-content">
            <div className="d-flex flex-wrap w-100 vh-100 overflow-hidden account-bg-02">
                <div
                    className="d-flex align-items-center justify-content-center flex-wrap vh-100 overflow-auto p-4 w-50 bg-backdrop">
                    <form action="https://crms.dreamstechnologies.com/html/template/login.html" className="flex-fill">
                        <div className="mx-auto mw-450">
                            <div className="text-center mb-4">
                                <img src="/assets/img/logo.svg" className="img-fluid" alt="Logo"/>
                            </div>
                            <div className="mb-4">
                                <h4 className="mb-2 fs-20">Register</h4>
                                <p>Create new CRMS account</p>
                            </div>
                            <div className="mb-3">
                                <label className="col-form-label">Name</label>
                                <div className="position-relative">
                                    <span className="input-icon-addon">
                                        <i className="ti ti-user"></i>
                                    </span>
                                    <input type="text" value="" className="form-control" />
                                </div>
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
                                <label className="col-form-label">Password</label>
                                <div className="pass-group">
                                    <input type="password" className="pass-input form-control" />
                                    <span className="ti toggle-password ti-eye-off"></span>
                                </div>
                            </div>
                            <div className="mb-3">
                                <label className="col-form-label">Confirm Password</label>
                                <div className="pass-group">
                                    <input type="password" className="pass-inputs form-control" />
                                    <span className="ti toggle-passwords ti-eye-off"></span>
                                </div>
                            </div>
                            <div className="d-flex align-items-center justify-content-between mb-3">
                                <div className="form-check form-check-md d-flex align-items-center">
                                    <input className="form-check-input" type="checkbox" value="" id="checkebox-md"
                                        checked="" />
                                    <label className="form-check-label" for="checkebox-md">
                                        I agree to the <a href="javascript:void(0);"
                                            className="text-primary link-hover">Terms & Privacy</a>
                                    </label>
                                </div>
                            </div>
                            <div className="mb-3">
                                <button type="submit" className="btn btn-primary w-100">Sign Up</button>
                            </div>
                            <div className="mb-3">
                                <h6>Already have an account? <Link to="/login" className="text-purple link-hover"> Sign
                                        In Instead</Link></h6>
                            </div>
                            <div className="form-set-login or-text mb-3">
                                <h4>OR</h4>
                            </div>
                            <div className="text-center">
                                <p className="fw-medium text-gray">Copyright &copy; 2024 - CRMS</p>
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
    )
}

export default  Register;