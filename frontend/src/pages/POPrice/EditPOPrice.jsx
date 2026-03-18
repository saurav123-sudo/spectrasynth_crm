import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import axiosInstance from "../../apis/axiosConfig";

const EditPOPrice = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);

  const [formData, setFormData] = useState({
    product_name: "",
    cas_number: "",
    quantity: "",
    quantity_unit: "",
    po_price: "",
  });

  const fetchPOPrice = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axiosInstance.get(`/api/poPrice/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setFormData(response.data.data);
    } catch (error) {
      console.error("Error fetching PO price:", error);
      Swal.fire(
        "Error",
        error.response?.data?.message || "Failed to fetch PO price",
        "error"
      );
    } finally {
      setFetchLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      await axiosInstance.put(`/api/poPrice/${id}`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      Swal.fire("Success", "PO Price updated successfully!", "success");
      navigate("/dashboard/po-price");
    } catch (error) {
      console.error("Error updating PO price:", error);
      Swal.fire(
        "Error",
        error.response?.data?.message || "Failed to update PO price",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPOPrice();
  }, [id]);

  if (fetchLoading) {
    return (
      <div className="page-wrapper">
        <div className="container mt-4">
          <div className="text-center">
            <span className="spinner-border spinner-border-sm me-2"></span>{" "}
            Loading...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      <div className="container mt-4">
        <h2>Edit PO Price</h2>
        <div className="card">
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              {/* PRODUCT NAME */}
              <div className="mb-3">
                <label className="form-label">Product Name</label>
                <input
                  type="text"
                  className="form-control"
                  name="product_name"
                  value={formData.product_name}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* CAS NUMBER */}
              <div className="mb-3">
                <label className="form-label">CAS No</label>
                <input
                  type="text"
                  className="form-control"
                  name="cas_number"
                  value={formData.cas_number}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* QUANTITY */}
              <div className="mb-3">
                <label className="form-label">Quantity</label>
                <input
                  type="number"
                  className="form-control"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* QUANTITY UNIT */}
              <div className="mb-3">
                <label className="form-label">Quantity Unit</label>
                <input
                  type="text"
                  className="form-control"
                  name="quantity_unit"
                  value={formData.quantity_unit}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* PO PRICE */}
              <div className="mb-3">
                <label className="form-label">PO Price</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-control"
                  name="po_price"
                  value={formData.po_price}
                  onChange={handleChange}
                  required
                />
              </div>

              <button
                type="submit"
                className="btn btn-success me-2"
                disabled={loading}
              >
                {loading ? "Updating..." : "Update PO Price"}
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => navigate("/dashboard/po-price")}
              >
                Cancel
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditPOPrice;
