import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import axiosInstance from "../../apis/axiosConfig";

function EditProductPrice() {
  const { id } = useParams(); // ProductPrice ID
  const navigate = useNavigate();

  const [company, setCompany] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [price, setPrice] = useState("");
  const [productName, setProductName] = useState(""); // Display-only
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetch product price details
  useEffect(() => {
    const fetchProductPrice = async () => {
      try {
        const res = await axiosInstance.get(`/api/product_prices/get/${id}`);
        const data = res.data?.data;

        if (data) {
          setCompany(data.company || "");
          setCurrency(data.currency || "INR");
          setPrice(data.price || "");
          setProductName(data.product?.product_name || "");
        } else {
          setError("Product price not found.");
        }
      } catch (err) {
        console.error("Error fetching product price:", err);
        setError(
          err.response?.data?.message || "Failed to fetch product price."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchProductPrice();
  }, [id]);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const res = await axiosInstance.put(`/api/product_prices/${id}`, {
        company,
        currency,
        price,
      });

      if (res.status === 200) {
        Swal.fire({
          icon: "success",
          title: "Updated!",
          text: "Product price updated successfully.",
          confirmButtonText: "OK",
        }).then(() => navigate("/dashboard/ProductList"));
      }
    } catch (err) {
      console.error("Error updating product price:", err);
      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: err.response?.data?.message || "Failed to update product price.",
      });
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="alert alert-danger">{error}</div>;

  return (
    <div className="page-wrapper">
      <div className="content">
        <h3>Edit Product Price</h3>
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label>Product Name</label>
            <input
              type="text"
              className="form-control"
              value={productName}
              readOnly
            />
          </div>

          <div className="mb-3">
            <label>Company</label>
            <input
              type="text"
              className="form-control"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              required
            />
          </div>

          <div className="mb-3">
            <label>Price</label>
            <div className="input-group">
              <select
                className="form-select"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                style={{ maxWidth: "100px" }}
              >
                <option value="INR">₹ (INR)</option>
                <option value="USD">$ (USD)</option>
              </select>
              <input
                type="number"
                className="form-control"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary">
            Update Price
          </button>
        </form>
      </div>
    </div>
  );
}

export default EditProductPrice;
