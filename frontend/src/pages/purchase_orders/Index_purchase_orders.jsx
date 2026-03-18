import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Swal from "sweetalert2";
import axiosInstance from "../../apis/axiosConfig";

const Index_purchase_orders = () => {
  const [orders, setOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewOrder, setViewOrder] = useState(null);

  // Fetch all purchase orders from API
  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get("/api/purchaseOrder");
      setOrders(res.data.data || []);
    } catch (err) {
      console.error(err);
      Swal.fire(
        "Error",
        err.response?.data?.message || "Failed to fetch orders",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // Cancel purchase order
  const handleCancel = async (po_number) => {
    try {
      await axiosInstance.patch(`/api/purchaseOrder/cancel/${po_number}`);
      Swal.fire("Success", "Purchase Order canceled", "success");
      fetchOrders();
    } catch (err) {
      console.error(err);
      Swal.fire(
        "Error",
        err.response?.data?.message || "Failed to cancel PO",
        "error"
      );
    }
  };

  // Confirm purchase order
  const handleConfirm = async (po_number) => {
    try {
      await axiosInstance.patch(`/api/purchaseOrder/${po_number}/confirm`);
      Swal.fire("Success", "Purchase Order confirmed", "success");
      fetchOrders();
    } catch (err) {
      console.error(err);
      Swal.fire(
        "Error",
        err.response?.data?.message || "Failed to confirm PO",
        "error"
      );
    }
  };

  const filteredOrders = orders.filter(
    (order) =>
      order.po_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.CompanyName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <p>Loading...</p>;
  return (
    <div className="page-wrapper">
      <div className="content">
        <div className="row">
          <div className="col-md-12">
            {/* Page Header */}
            <div className="page-header">
              <div className="row align-items-center">
                <div className="col-8">
                  <h4 className="page-title">
                    Purchase Orders ({filteredOrders.length})
                  </h4>
                </div>
                <div className="col-4 text-end">
                  <Link
                    to="/Create_purchase_orders"
                    className="btn btn-primary"
                  >
                    <i className="ti ti-square-rounded-plus me-2"></i>Add
                    Purchase Order
                  </Link>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search Purchase Orders"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="card-body">
                <div className="table-responsive custom-table">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>PO No</th>
                        <th>Date</th>
                        <th>Customer</th>
                        <th>Quotation</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOrders.map((order) => (
                        <tr key={order.po_number}>
                          <td>{order.po_number}</td>
                          <td>{order.po_date}</td>
                          <td>{order.CompanyName}</td>
                          <td>{order.quotation?.quotation_number || ""}</td>
                          <td>
                            {order.po_status === "active" && (
                              <span className="badge bg-success">Active</span>
                            )}
                            {order.po_status === "confirm" && (
                              <span className="badge bg-primary">Confirm</span>
                            )}
                            {order.po_status === "cancel" && (
                              <span className="badge bg-danger">Cancel</span>
                            )}
                          </td>
                          <td>
                            <button
                              className="btn btn-sm btn-primary me-1"
                              onClick={() => handleConfirm(order.po_number)}
                              disabled={order.po_status !== "active"}
                            >
                              Confirm
                            </button>
                            <button
                              className="btn btn-sm btn-danger me-1"
                              onClick={() => handleCancel(order.po_number)}
                              disabled={order.po_status === "cancel"}
                            >
                              Cancel
                            </button>
                            <button
                              className="btn btn-sm btn-info"
                              onClick={() => {
                                setViewOrder(order);
                                setShowViewModal(true);
                              }}
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* View Modal */}
      {showViewModal && viewOrder && (
        <div className="modal fade show" style={{ display: "block" }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Purchase Order Details</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowViewModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <table className="table table-bordered">
                  <tbody>
                    <tr>
                      <th>PO No</th>
                      <td>{viewOrder.po_number}</td>
                    </tr>
                    <tr>
                      <th>Date</th>
                      <td>{viewOrder.po_date}</td>
                    </tr>
                    <tr>
                      <th>Company</th>
                      <td>{viewOrder.CompanyName}</td>
                    </tr>
                    <tr>
                      <th>Quotation</th>
                      <td>{viewOrder.quotation?.quotation_number || ""}</td>
                    </tr>
                    <tr>
                      <th>Total Amount</th>
                      <td>{viewOrder.total_amount}</td>
                    </tr>
                    <tr>
                      <th>GST</th>
                      <td>{viewOrder.quotation?.gst || 0}</td>
                    </tr>
                    <tr>
                      <th>Grand Total</th>
                      <td>
                        {(
                          parseFloat(viewOrder.total_amount || 0) +
                          parseFloat(viewOrder.quotation?.gst || 0)
                        ).toFixed(2)}
                      </td>
                    </tr>
                    <tr>
                      <th>Status</th>
                      <td>{viewOrder.po_status}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowViewModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Index_purchase_orders;
