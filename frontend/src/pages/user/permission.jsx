import React, { useState, useEffect } from "react";
import axiosInstance from "../../apis/axiosConfig";
import { useParams, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

const Permission = () => {
  const { id: userId } = useParams();
  const navigate = useNavigate();
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);

  const defaultPermissions = [
    "inquiry",
    "technical_person",
    "marketing_person",
    "product",
    "company_price",
    "quotation",
    "users",
    "purchase_order",
    "reminder_history",
    "reminder_followup",
  ].map((formName, index) => ({
    permissionId: index + 1,
    formName,
    addNew: false,
    edit: false,
    delete: false,
    read: false,
  }));

  // ✅ Fetch existing permissions
  const fetchPermissions = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axiosInstance.get(
        `/api/users/fetch-permissions/${userId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const dbPerms = res.data.permissions || [];

      // Merge with defaultPermissions
      const merged = defaultPermissions.map((d) => {
        const found = dbPerms.find((p) => p.module_name === d.formName);
        if (found) {
          return {
            ...d,
            addNew: found.can_create,
            edit: found.can_update,
            delete: found.can_delete,
            read: found.can_read,
          };
        }
        return d;
      });

      setPermissions(merged);
    } catch (error) {
      console.error("Error fetching permissions:", error);
      setPermissions(defaultPermissions);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Save permissions
  const savePermissions = async () => {
    try {
      const token = localStorage.getItem("token");
      const formatted = permissions.map((p) => ({
        module_name: p.formName,
        can_create: p.addNew,
        can_read: p.read,
        can_update: p.edit,
        can_delete: p.delete,
      }));

      const res = await axiosInstance.post(
        `/api/users/create-permissions/${userId}`,
        { permissions: formatted },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // ✅ SweetAlert success popup
      Swal.fire({
        title: "Success!",
        text: res.data.message || "Permissions saved successfully.",
        icon: "success",
        confirmButtonText: "OK",
      }).then(() => {
        navigate("/dashboard/indexUser"); // ✅ Redirect after OK
      });
    } catch (error) {
      console.error("Error saving permissions:", error);
      Swal.fire({
        title: "Error!",
        text: error.response?.data?.message || "Failed to save permissions.",
        icon: "error",
        confirmButtonText: "OK",
      });
    }
  };

  const handleCheckboxChange = (permissionId, field, checked) => {
    setPermissions((prev) =>
      prev.map((perm) =>
        perm.permissionId === permissionId
          ? { ...perm, [field]: checked }
          : perm
      )
    );
  };

  useEffect(() => {
    if (userId) fetchPermissions();
  }, [userId]);

  if (loading) return <div className="text-center mt-5">Loading...</div>;

  return (
    <div className="page-wrapper">
      <div className="content">
        <div className="page-header">
          <h4 className="page-title">Manage Permissions</h4>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="table-responsive custom-table">
              <table className="table">
                <thead className="thead-light">
                  <tr>
                    <th>#</th>
                    <th>Form Name</th>
                    <th>Add New</th>
                    <th>Edit</th>
                    <th>Delete</th>
                    <th>Read</th>
                  </tr>
                </thead>
                <tbody>
                  {permissions.map((perm) => (
                    <tr key={perm.permissionId}>
                      <td>{perm.permissionId}</td>
                      <td>{perm.formName}</td>
                      <td>
                        <input
                          type="checkbox"
                          checked={perm.addNew}
                          onChange={(e) =>
                            handleCheckboxChange(
                              perm.permissionId,
                              "addNew",
                              e.target.checked
                            )
                          }
                        />
                      </td>
                      <td>
                        <input
                          type="checkbox"
                          checked={perm.edit}
                          onChange={(e) =>
                            handleCheckboxChange(
                              perm.permissionId,
                              "edit",
                              e.target.checked
                            )
                          }
                        />
                      </td>
                      <td>
                        <input
                          type="checkbox"
                          checked={perm.delete}
                          onChange={(e) =>
                            handleCheckboxChange(
                              perm.permissionId,
                              "delete",
                              e.target.checked
                            )
                          }
                        />
                      </td>
                      <td>
                        <input
                          type="checkbox"
                          checked={perm.read}
                          onChange={(e) =>
                            handleCheckboxChange(
                              perm.permissionId,
                              "read",
                              e.target.checked
                            )
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="text-end mt-3">
              <button className="btn btn-primary" onClick={savePermissions}>
                Save Permissions
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Permission;
