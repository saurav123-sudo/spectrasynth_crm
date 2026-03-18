import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axiosInstance from "../../apis/axiosConfig";

const IndexUser = () => {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch users from API
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await axiosInstance.get("/api/users", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`, // if auth needed
          },
        });
        setUsers(response.data); // assuming API returns an array of users
      } catch (error) {
        console.error("Error fetching users:", error.response?.data || error);
      }
    };

    fetchUsers();
  }, []);

  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to delete this user?")) {
      // Call API to delete user
      axiosInstance
        .delete(`/api/users/${id}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        })
        .then(() => {
          setUsers(users.filter((user) => user.id !== id));
        })
        .catch((error) => {
          console.error("Error deleting user:", error.response?.data || error);
        });
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="page-wrapper">
      <div className="content">
        <div className="row">
          <div className="col-md-12">
            <div className="page-header">
              <div className="row align-items-center">
                <div className="col-8">
                  <h4 className="page-title">
                    Users{" "}
                    <span className="count-title">
                      ({filteredUsers.length})
                    </span>
                  </h4>
                </div>
                <div className="col-4 text-end">
                  <Link to="CreateUser" className="btn btn-primary">
                    <i className="ti ti-square-rounded-plus me-2"></i>Add New
                    User
                  </Link>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <div className="row align-items-center">
                  <div className="col-sm-4">
                    <div className="icon-form mb-3 mb-sm-0">
                      <span className="form-icon">
                        <i className="ti ti-search"></i>
                      </span>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Search Users"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="card-body">
                <div className="table-responsive custom-table">
                  <table className="table" id="user_list">
                    <thead className="thead-light">
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Roles</th>
                        <th>Permissions</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((user) => (
                        <tr key={user.id}>
                          <td>{user.name}</td>
                          <td>{user.email}</td>
                          <td>
                            {user.roles?.map((role) => role.role).join(", ")}
                          </td>
                          <td>
                            {/* Show permissions list */}
                            {user.permissions
                              ?.map((perm) => perm.name)
                              .join(", ")}
                            {/* Add Manage Permission link */}
                            <Link
                              to={`Permission/${user.id}`}
                              className="btn btn-sm btn-warning ms-2"
                            >
                              Manage
                            </Link>
                          </td>
                          <td>
                            <div className="dropdown table-action">
                              <button
                                className="btn btn-light btn-sm action-icon"
                                type="button"
                                data-bs-toggle="dropdown"
                                aria-expanded="false"
                              >
                                <i className="fa fa-ellipsis-v"></i>
                              </button>
                              <div className="dropdown-menu dropdown-menu-end">
                                <Link
                                  className="dropdown-item"
                                  to={`EditUser/${user.id}`}
                                >
                                  <i className="fa-solid fa-pencil text-primary me-2"></i>
                                  Edit
                                </Link>
                                <button
                                  type="button"
                                  className="dropdown-item text-danger"
                                  onClick={() => handleDelete(user.id)}
                                >
                                  <i className="fa-regular fa-trash-can me-2"></i>
                                  Delete
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredUsers.length === 0 && (
                        <tr>
                          <td colSpan="5" className="text-center">
                            No users found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IndexUser;
