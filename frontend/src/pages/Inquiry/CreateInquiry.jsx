import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import axiosInstance from "../../apis/axiosConfig";

const CreateInquiry = () => {
  const navigate = useNavigate();

  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [products, setProducts] = useState([
    { product_name: "", cas_no: "", hsn_no: "", qty: "" },
  ]);

  // Add a new product row
  const addRow = () => {
    setProducts([
      ...products,
      { product_name: "", cas_no: "", hsn_no: "", qty: "" },
    ]);
  };

  // Remove product row
  const removeRow = (index) => {
    setProducts((prev) => prev.filter((_, i) => i !== index));
  };

  // Handle product field change
  const handleProductChange = (index, field, value) => {
    setProducts((prev) =>
      prev.map((product, i) =>
        i === index ? { ...product, [field]: value } : product
      )
    );
  };

  // Submit inquiry
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!customerName.trim() || !customerEmail.trim()) {
      Swal.fire("Warning", "Please fill in all customer details!", "warning");
      return;
    }

    if (
      products.some((p) => !p.product_name || !p.cas_no || !p.hsn_no || !p.qty)
    ) {
      Swal.fire("Warning", "Please fill all product fields!", "warning");
      return;
    }

    try {
      const payload = {
        customer_name: customerName,
        email: customerEmail,
        products: products.map((p) => ({
          ProductName: p.product_name,
          cas_number: p.cas_no,
          quantity_required: p.qty,
          product_code: p.hsn_no, // HSN number used as product code
        })),
      };

      const response = await axiosInstance.post("/api/inquiries/add", payload);

      Swal.fire({
        icon: "success",
        title: "Success",
        text: response.data?.message || "Inquiry added successfully!",
      }).then(() => {
        navigate("/dashboard/Inquiry");
      });

      // Reset form
      setCustomerName("");
      setCustomerEmail("");
      setProducts([{ product_name: "", cas_no: "", hsn_no: "", qty: "" }]);
    } catch (error) {
      console.error("Error submitting inquiry:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text:
          error.response?.data?.message ||
          "Failed to submit inquiry. Please try again.",
      });
    }
  };

  return (
    <div className="page-wrapper">
      <div className="container mt-4">
        <h2>Add New Inquiry</h2>
        <form onSubmit={handleSubmit}>
          {/* Customer Name & Email */}
          <div className="row mb-3">
            <div className="col-md-6">
              <label htmlFor="customer_name">Customer Name</label>
              <input
                type="text"
                id="customer_name"
                className="form-control"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                required
              />
            </div>
            <div className="col-md-6">
              <label htmlFor="customer_email">Customer Email</label>
              <input
                type="email"
                id="customer_email"
                className="form-control"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Products Table */}
          <table className="table table-bordered" id="productTable">
            <thead>
              <tr>
                <th>Sr No.</th>
                <th>Product Name</th>
                <th>CAS No</th>
                <th>HSN / Product Code</th>
                <th>Qty</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product, index) => (
                <tr key={index}>
                  <td>{index + 1}</td>
                  <td>
                    <input
                      type="text"
                      className="form-control"
                      value={product.product_name}
                      onChange={(e) =>
                        handleProductChange(
                          index,
                          "product_name",
                          e.target.value
                        )
                      }
                      required
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      className="form-control"
                      value={product.cas_no}
                      onChange={(e) =>
                        handleProductChange(index, "cas_no", e.target.value)
                      }
                      required
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      className="form-control"
                      value={product.hsn_no}
                      onChange={(e) =>
                        handleProductChange(index, "hsn_no", e.target.value)
                      }
                      required
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      className="form-control"
                      value={product.qty}
                      onChange={(e) =>
                        handleProductChange(index, "qty", e.target.value)
                      }
                      required
                    />
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={() => removeRow(index)}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <button
            type="button"
            className="btn btn-warning me-2"
            onClick={addRow}
          >
            Add More Product
          </button>
          <button type="submit" className="btn btn-primary">
            Submit
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateInquiry;
