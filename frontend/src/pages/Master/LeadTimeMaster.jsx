import React, { useState, useEffect } from "react";
import axiosInstance from "../../apis/axiosConfig";
import Swal from "sweetalert2";

const LeadTimeMaster = () => {
  const [leadTimes, setLeadTimes] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingLeadTime, setEditingLeadTime] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState({
    lead_time: "",
  });

  useEffect(() => {
    fetchLeadTimes();
  }, []);

  // Fetch all lead times
  const fetchLeadTimes = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get("/api/lead-time-master");
      setLeadTimes(response.data.data || []);
    } catch (error) {
      console.error("Error fetching lead times:", error);
      Swal.fire("Error", "Failed to fetch lead times", "error");
    } finally {
      setLoading(false);
    }
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // Add new lead time
  const handleAdd = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.lead_time) {
      Swal.fire("Error", "Lead time is required", "error");
      return;
    }

    try {
      await axiosInstance.post("/api/lead-time-master", formData);
      Swal.fire("Success", "Lead time added successfully", "success");
      fetchLeadTimes();
      setShowAddModal(false);
      resetForm();
    } catch (error) {
      console.error("Error adding lead time:", error);
      Swal.fire(
        "Error",
        error.response?.data?.message || "Error adding lead time",
        "error"
      );
    }
  };

  // Open edit modal
  const handleEdit = (leadTime) => {
    setEditingLeadTime(leadTime);
    setFormData({
      lead_time: leadTime.lead_time,
    });
    setShowEditModal(true);
  };

  // Update lead time
  const handleUpdate = async (e) => {
    e.preventDefault();
    
    if (!formData.lead_time) {
      Swal.fire("Error", "Lead time is required", "error");
      return;
    }

    try {
      await axiosInstance.put(`/api/lead-time-master/${editingLeadTime.id}`, formData);
      Swal.fire("Success", "Lead time updated successfully", "success");
      fetchLeadTimes();
      setShowEditModal(false);
      resetForm();
      setEditingLeadTime(null);
    } catch (error) {
      console.error("Error updating lead time:", error);
      Swal.fire(
        "Error",
        error.response?.data?.message || "Error updating lead time",
        "error"
      );
    }
  };

  // Delete lead time
  const handleDelete = async (id, leadTime) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: `Do you want to delete "${leadTime}"?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!",
    });

    if (result.isConfirmed) {
      try {
        await axiosInstance.delete(`/api/lead-time-master/${id}`);
        Swal.fire("Deleted!", "Lead time has been deleted.", "success");
        fetchLeadTimes();
      } catch (error) {
        console.error("Error deleting lead time:", error);
        Swal.fire("Error", "Failed to delete lead time", "error");
      }
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      lead_time: "",
    });
  };

  // Filter lead times by search term
  const filteredLeadTimes = leadTimes.filter((lt) =>
    lt.lead_time.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="page-wrapper">
      <div className="content">
        <div className="page-header">
          <div className="page-title">
            <h4>
              <i className="ti ti-clock me-2"></i>
              Lead Time Master
            </h4>
            <h6>Manage lead time options for quotations</h6>
          </div>
          <div className="page-btn">
            <button
              className="btn btn-primary"
              onClick={() => setShowAddModal(true)}
            >
              <i className="ti ti-plus me-2"></i>
              Add Lead Time
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="card mb-3">
          <div className="card-body">
            <div className="row g-3">
              <div className="col-md-9">
                <div className="input-group">
                  <span className="input-group-text">
                    <i className="ti ti-search"></i>
                  </span>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search lead time..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <div className="col-md-3">
                <button
                  className="btn btn-secondary w-100"
                  onClick={fetchLeadTimes}
                >
                  <i className="ti ti-refresh me-2"></i>
                  Refresh
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Lead Times Table */}
        <div className="card">
          <div className="card-body">
            {loading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            ) : filteredLeadTimes.length === 0 ? (
              <div className="text-center py-5 text-muted">
                <i className="ti ti-inbox" style={{ fontSize: "48px" }}></i>
                <p className="mt-2">No lead times found</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead className="table-light">
                    <tr>
                      <th width="5%">#</th>
                      <th width="80%">Lead Time</th>
                      <th width="15%">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLeadTimes.map((lt, index) => (
                      <tr key={lt.id}>
                        <td>{index + 1}</td>
                        <td>
                          <strong>{lt.lead_time}</strong>
                        </td>
                        <td>
                          <div className="btn-group btn-group-sm" role="group">
                            <button
                              className="btn btn-outline-primary"
                              onClick={() => handleEdit(lt)}
                              title="Edit"
                            >
                              <i className="ti ti-edit"></i>
                            </button>
                            <button
                              className="btn btn-outline-danger"
                              onClick={() => handleDelete(lt.id, lt.lead_time)}
                              title="Delete"
                            >
                              <i className="ti ti-trash"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Summary */}
            {!loading && filteredLeadTimes.length > 0 && (
              <div className="mt-3 text-muted">
                <small>
                  Showing {filteredLeadTimes.length} of {leadTimes.length} lead time options
                </small>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div
          className="modal fade show d-block"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog">
            <div className="modal-content">
              <form onSubmit={handleAdd}>
                <div className="modal-header">
                  <h5 className="modal-title">
                    <i className="ti ti-plus me-2"></i>
                    Add Lead Time
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => {
                      setShowAddModal(false);
                      resetForm();
                    }}
                  ></button>
                </div>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">
                      Lead Time <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      name="lead_time"
                      className="form-control"
                      placeholder="e.g., 1 week, 2-3 week, 8 week"
                      value={formData.lead_time}
                      onChange={handleInputChange}
                      required
                    />
                    <small className="text-muted">
                      Lead time text (e.g., "1 week", "2-3 week", "8 week")
                    </small>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowAddModal(false);
                      resetForm();
                    }}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    <i className="ti ti-check me-2"></i>
                    Add Lead Time
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div
          className="modal fade show d-block"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog">
            <div className="modal-content">
              <form onSubmit={handleUpdate}>
                <div className="modal-header">
                  <h5 className="modal-title">
                    <i className="ti ti-edit me-2"></i>
                    Edit Lead Time
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => {
                      setShowEditModal(false);
                      resetForm();
                      setEditingLeadTime(null);
                    }}
                  ></button>
                </div>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">
                      Lead Time <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      name="lead_time"
                      className="form-control"
                      placeholder="e.g., 1 week, 2-3 week, 8 week"
                      value={formData.lead_time}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowEditModal(false);
                      resetForm();
                      setEditingLeadTime(null);
                    }}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    <i className="ti ti-check me-2"></i>
                    Update Lead Time
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadTimeMaster;


