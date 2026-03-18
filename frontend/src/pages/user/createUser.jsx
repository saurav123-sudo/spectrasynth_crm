import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Swal from "sweetalert2";
import axiosInstance from "../../apis/axiosConfig"; // ✅ Use your configured axios

const rolesList = [
  "inquiry",
  "technical",
  "marketing",
  "product_maker",
  "admin",
];

const AddUserPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    password_confirmation: "",
    roles: [],
  });

  const [loading, setLoading] = useState(false);

  // Handle input change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle role checkbox toggle
  const handleRoleChange = (role) => {
    setFormData((prev) => ({
      ...prev,
      roles: prev.roles.includes(role)
        ? prev.roles.filter((r) => r !== role)
        : [...prev.roles, role],
    }));
  };

  // Submit handler
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.password_confirmation) {
      Swal.fire("Error", "Passwords do not match!", "warning");
      return;
    }

    setLoading(true);

    try {
      const response = await axiosInstance.post(
        "/api/users/add-user",
        {
          name: formData.name,
          email: formData.email,
          password: formData.password,
          roles: formData.roles,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      Swal.fire("Success", response.data.message, "success");

      // Redirect to user list
      navigate("/dashboard/IndexUser");
    } catch (error) {
      console.error("Error creating user:", error);
      Swal.fire(
        "Error",
        error.response?.data?.message || "Failed to create user",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-wrapper">
      <div className="content">
        <div className="row justify-content-center">
          <div className="col-md-8">
            <div className="card">
              <div className="card-header d-flex justify-content-between align-items-center">
                <h2>Add User</h2>
              </div>
              <div className="card-body">
                <form onSubmit={handleSubmit}>
                  {/* Name */}
                  <div className="mb-3">
                    <label className="form-label">Name</label>
                    <input
                      type="text"
                      name="name"
                      className="form-control"
                      value={formData.name}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  {/* Email */}
                  <div className="mb-3">
                    <label className="form-label">Email</label>
                    <input
                      type="email"
                      name="email"
                      className="form-control"
                      value={formData.email}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  {/* Password */}
                  <div className="mb-3">
                    <label className="form-label">Password</label>
                    <input
                      type="password"
                      name="password"
                      className="form-control"
                      value={formData.password}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  {/* Confirm Password */}
                  <div className="mb-3">
                    <label className="form-label">Confirm Password</label>
                    <input
                      type="password"
                      name="password_confirmation"
                      className="form-control"
                      value={formData.password_confirmation}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  {/* Roles */}
                  <div className="mb-3">
                    <label className="form-label">Roles:</label>
                    <div className="d-flex flex-wrap gap-3 mt-2">
                      {rolesList.map((role) => (
                        <div className="form-check" key={role}>
                          <input
                            type="checkbox"
                            className="form-check-input"
                            id={role}
                            checked={formData.roles.includes(role)}
                            onChange={() => handleRoleChange(role)}
                          />
                          <label className="form-check-label" htmlFor={role}>
                            {role}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Buttons */}
                  <button
                    type="submit"
                    className="btn btn-primary mt-3 me-2"
                    disabled={loading}
                  >
                    {loading ? "Creating..." : "Create"}
                  </button>
                  <Link
                    to="/dashboard/IndexUser"
                    className="btn btn-secondary mt-3"
                  >
                    Back
                  </Link>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddUserPage;
