import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axiosInstance from "../../apis/axiosConfig";

// Define roles and permissions
const rolesList = [
  "inquiry",
  "technical",
  "marketing",
  "product_maker",
  "admin",
];
const permissionsList = ["create", "read", "update", "delete"];

const EditUser = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const [user, setUser] = useState({
    name: "",
    email: "",
    roles: [],
    permissions: {},
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Fetch user data
  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);
        const response = await axiosInstance.get(`/api/users/${id}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });

        const data = response.data.user;

        // Map roles and permissions
        const roleNames = data.roles?.map((r) => r.role) || [];
        const perms = {};
        roleNames.forEach((role) => {
          perms[role] =
            data.permissions
              ?.filter((p) => p.role === role)
              .map((p) => p.permission) || [];
        });

        setUser({
          name: data.name || "",
          email: data.email || "",
          roles: roleNames,
          permissions: perms,
        });
      } catch (err) {
        setError(err.response?.data?.message || "Error fetching user data");
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [id]);

  // Handle text inputs
  const handleChange = (e) => {
    const { name, value } = e.target;
    setUser((prev) => ({ ...prev, [name]: value }));
  };

  // Handle role checkbox
  const handleRoleChange = (role) => {
    setUser((prev) => {
      const roles = prev.roles.includes(role)
        ? prev.roles.filter((r) => r !== role)
        : [...prev.roles, role];

      // Remove permissions if role unchecked
      const permissions = { ...prev.permissions };
      if (!roles.includes(role)) delete permissions[role];

      return { ...prev, roles, permissions };
    });
  };

  // Handle permission checkbox
  const handlePermissionChange = (role, permission) => {
    setUser((prev) => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [role]: prev.permissions[role]?.includes(permission)
          ? prev.permissions[role].filter((p) => p !== permission)
          : [...(prev.permissions[role] || []), permission],
      },
    }));
  };

  // Submit updated user
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);

      await axiosInstance.put(
        `/api/users/editUser/${id}`,
        {
          name: user.name,
          email: user.email,
          roles: user.roles,
          permissions: user.permissions,
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );

      alert("User updated successfully");
      navigate("/dashboard/IndexUser");
    } catch (err) {
      setError(err.response?.data?.message || "Error updating user");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-center mt-5">Loading...</div>;
  if (error) return <div className="alert alert-danger m-3">{error}</div>;

  return (
    <div className="page-wrapper">
      <div className="content">
        <div className="row justify-content-center">
          <div className="col-md-8">
            <div className="card">
              <div className="card-header">
                <h4>Edit User</h4>
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
                      value={user.name}
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
                      value={user.email}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  {/* Roles */}
                  <div className="mb-3">
                    <label className="form-label">Roles</label>
                    <div className="d-flex flex-wrap gap-3 mt-2">
                      {rolesList.map((role) => (
                        <div className="form-check" key={role}>
                          <input
                            type="checkbox"
                            className="form-check-input"
                            id={role}
                            checked={user.roles.includes(role)}
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
                  <div className="d-flex gap-2">
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={loading}
                    >
                      {loading ? "Updating..." : "Update User"}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => navigate("/dashboard/IndexUser")}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditUser;
