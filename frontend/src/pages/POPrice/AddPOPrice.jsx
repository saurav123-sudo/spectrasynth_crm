import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import axiosInstance from "../../apis/axiosConfig";

const AddPOPrice = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const [formData, setFormData] = useState({
    product_name: "",
    cas_number: "",
    quantity: "",
    quantity_unit: "",
    po_price: "",
  });

  // Fetch product list (same as AddProduct)
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await axiosInstance.get("/api/products", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        setProducts(res.data.data);
      } catch (error) {
        console.error("Error loading products:", error);
      }
    };

    fetchProducts();
  }, []);

  // Select product handler
  const handleProductSelect = (productName) => {
    const found = products.find((p) => p.product_name === productName);

    setSelectedProduct(found || null);

    setFormData((prev) => ({
      ...prev,
      product_name: productName,
      cas_number: found?.cas_number || "",
    }));
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

      await axiosInstance.post("/api/poPrice", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      Swal.fire("Success", "PO Price added successfully!", "success");
      navigate("/dashboard/po-price");
    } catch (error) {
      Swal.fire(
        "Error",
        error.response?.data?.message || "Failed to add PO price",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-wrapper">
      <div className="container mt-4">
        <h2>Add PO Price</h2>

        <div className="card">
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              {/* Product Name Dropdown */}
              <div className="mb-3">
                <label className="form-label">Product Name</label>
                <select
                  className="form-control"
                  value={formData.product_name}
                  onChange={(e) => handleProductSelect(e.target.value)}
                  required
                >
                  <option value="">Select Product</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.product_name}>
                      {p.product_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Auto-Filled CAS No */}
              <div className="mb-3">
                <label className="form-label">CAS No</label>
                <input
                  type="text"
                  className="form-control"
                  name="cas_number"
                  value={formData.cas_number}
                  readOnly
                  style={{ backgroundColor: "#f8f9fa" }}
                />
              </div>

              {/* Quantity */}
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

              {/* Quantity Unit */}
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

              {/* PO Price */}
              <div className="mb-3">
                <label className="form-label">PO Price</label>
                <input
                  type="number"
                  className="form-control"
                  step="0.01"
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
                {loading ? "Adding..." : "Add PO Price"}
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

export default AddPOPrice;
