import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../../apis/axiosConfig";
import Swal from "sweetalert2";

const NewInquiry = () => {
  const [emails, setEmails] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    customer_name: "",
    email: "",
    inquiry_number: "",
    products: [
      {
        product_name: "",
        cas_number: "",
        quantity_required: "",
        quantity_unit: "mg",
        image_url: "",
      },
    ],
    image: null,
  });

  // Fetch emails from database
  const fetchEmails = async () => {
    try {
      const response = await axios.get("/api/emails/fetchEmails");
      setEmails(response.data || []);
    } catch (error) {
      console.error("Error fetching emails:", error);
      Swal.fire("Error", "Failed to fetch emails", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmails();
  }, []);

  // Handle email selection
  const handleEmailSelect = (email) => {
    setSelectedEmail(email);
    setFormData({
      ...formData,
      customer_name: email.sender_name || "",
      email: email.sender_email || "",
    });
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  // Handle product changes
  const handleProductChange = (index, field, value) => {
    const updatedProducts = [...formData.products];
    updatedProducts[index][field] = value;
    setFormData({
      ...formData,
      products: updatedProducts,
    });
  };

  // Add new product
  const addProduct = () => {
    setFormData({
      ...formData,
      products: [
        ...formData.products,
        {
          product_name: "",
          cas_number: "",
          quantity_required: "",
          quantity_unit: "mg",
          image_url: "",
        },
      ],
    });
  };

  // Remove product
  const removeProduct = (index) => {
    const updatedProducts = formData.products.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      products: updatedProducts,
    });
  };

  // Handle image upload
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({
        ...formData,
        image: file,
      });
    }
  };

  // Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const submitData = new FormData();

      // Add basic form data
      submitData.append("customer_name", formData.customer_name);
      submitData.append("email", formData.email);
      // Only add inquiry_number if it's not empty
      if (formData.inquiry_number.trim()) {
        submitData.append("inquiry_number", formData.inquiry_number);
      }

      // Add products as JSON string
      submitData.append("products", JSON.stringify(formData.products));

      // Add image if exists
      if (formData.image) {
        submitData.append("image", formData.image);
      }

      const response = await axios.post("/api/email/Add", submitData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      console.log("Response:", response.data); // Debug log
      Swal.fire(
        "Success",
        response.data.message || "Inquiry created successfully!",
        "success"
      );

      // Redirect back to inquiry list
      setTimeout(() => {
        navigate("/dashboard/Inquiry");
        // Optionally refresh the inquiry list data
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error("Error creating inquiry:", error);
      Swal.fire(
        "Error",
        error.response?.data?.message || "Failed to create inquiry",
        "error"
      );
    }
  };

  return (
    <div className="main-wrapper">
      <div className="page-wrapper">
        <div className="content">
          <div className="page-header">
            <div className="row align-items-center">
              <div className="col-md-4">
                <h3 className="page-title">New Inquiry</h3>
              </div>
              <div className="col-md-8 float-end ms-auto">
                <div className="d-flex title-head">
                  <div className="head-icons mb-0">
                    <a
                      href="/inquiry"
                      data-bs-toggle="tooltip"
                      data-bs-placement="top"
                      title="Back to Inquiries"
                    >
                      <i className="ti ti-arrow-left"></i>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="row">
            {/* Left Side - Email List */}
            <div className="col-md-6">
              <div className="card">
                <div className="card-header">
                  <h4 className="card-title">Recent Emails</h4>
                </div>
                <div
                  className="card-body"
                  style={{ maxHeight: "600px", overflowY: "auto" }}
                >
                  {loading ? (
                    <div className="text-center">
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      Loading emails...
                    </div>
                  ) : emails.length > 0 ? (
                    <div className="list-group">
                      {emails.map((email) => (
                        <div
                          key={email.id}
                          className={`list-group-item list-group-item-action ${
                            selectedEmail?.id === email.id ? "active" : ""
                          }`}
                          onClick={() => handleEmailSelect(email)}
                          style={{ cursor: "pointer" }}
                        >
                          <div className="d-flex w-100 justify-content-between">
                            <h6 className="mb-1">{email.subject}</h6>
                            <small>
                              {new Date(email.created_at).toLocaleDateString()}
                            </small>
                          </div>
                          <p className="mb-1">
                            <strong>From:</strong> {email.sender_email}
                          </p>
                          <p className="mb-1">
                            <strong>Subject:</strong> {email.subject}
                          </p>
                          <small className="text-muted">
                            {email.body
                              ? email.body.substring(0, 100) + "..."
                              : "No content"}
                          </small>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-muted">
                      No emails found
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Side - Add Inquiry Form */}
            <div className="col-md-6">
              <div className="card">
                <div className="card-header">
                  <h4 className="card-title">Add Inquiry</h4>
                </div>
                <div
                  className="card-body"
                  style={{ maxHeight: "600px", overflowY: "auto" }}
                >
                  <form onSubmit={handleSubmit}>
                    {/* Customer Name */}
                    <div className="mb-3">
                      <label className="form-label">Customer Name</label>
                      <input
                        type="text"
                        className="form-control"
                        name="customer_name"
                        value={formData.customer_name}
                        onChange={handleInputChange}
                        required
                      />
                    </div>

                    {/* Email */}
                    <div className="mb-3">
                      <label className="form-label">Email</label>
                      <input
                        type="email"
                        className="form-control"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                      />
                    </div>

                    {/* Inquiry Number */}
                    <div className="mb-3">
                      <label className="form-label">Inquiry Number</label>
                      <input
                        type="text"
                        className="form-control"
                        name="inquiry_number"
                        value={formData.inquiry_number}
                        onChange={handleInputChange}
                        placeholder="Auto-generated or enter manually"
                      />
                    </div>

                    {/* Products */}
                    <div className="mb-3">
                      <label className="form-label">Products</label>
                      {formData.products.map((product, index) => (
                        <div key={index} className="border p-3 mb-3 rounded">
                          <div className="row">
                            <div className="col-md-6">
                              <input
                                type="text"
                                className="form-control mb-2"
                                placeholder="Product Name"
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
                            </div>
                            <div className="col-md-6">
                              <input
                                type="text"
                                className="form-control mb-2"
                                placeholder="CAS Number"
                                value={product.cas_number}
                                onChange={(e) =>
                                  handleProductChange(
                                    index,
                                    "cas_number",
                                    e.target.value
                                  )
                                }
                              />
                            </div>
                            <div className="col-md-4">
                              <div className="d-flex">
                                <input
                                  type="number"
                                  className="form-control mb-2 me-2"
                                  placeholder="Quantity"
                                  value={product.quantity_required}
                                  onChange={(e) =>
                                    handleProductChange(
                                      index,
                                      "quantity_required",
                                      e.target.value
                                    )
                                  }
                                  required
                                />
                                {index === 0 && (
                                  <button
                                    type="button"
                                    className="btn btn-outline-primary btn-sm mb-2"
                                    onClick={() => {
                                      const firstQuantity =
                                        formData.products[0].quantity_required;
                                      const firstUnit =
                                        formData.products[0].quantity_unit;
                                      const updatedProducts =
                                        formData.products.map((product) => ({
                                          ...product,
                                          quantity_required: firstQuantity,
                                          quantity_unit: firstUnit,
                                        }));
                                      setFormData({
                                        ...formData,
                                        products: updatedProducts,
                                      });
                                    }}
                                    title="Set this quantity and unit for all products"
                                  >
                                    Set for All
                                  </button>
                                )}
                              </div>
                            </div>
                            <div className="col-md-4">
                              <select
                                className="form-control mb-2"
                                value={product.quantity_unit}
                                onChange={(e) =>
                                  handleProductChange(
                                    index,
                                    "quantity_unit",
                                    e.target.value
                                  )
                                }
                              >
                                <option value="mg">mg</option>
                                <option value="gm">gm</option>
                                <option value="ml">ml</option>
                              </select>
                            </div>
                            <div className="col-md-4">
                              {formData.products.length > 1 && (
                                <button
                                  type="button"
                                  className="btn btn-danger btn-sm"
                                  onClick={() => removeProduct(index)}
                                >
                                  Remove
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={addProduct}
                      >
                        Add Product
                      </button>
                    </div>

                    {/* Image Upload */}
                    <div className="mb-3">
                      <label className="form-label">
                        Upload Image (Optional)
                      </label>
                      <input
                        type="file"
                        className="form-control"
                        accept="image/*"
                        onChange={handleImageUpload}
                      />
                      {formData.image && (
                        <div className="mt-2">
                          <img
                            src={URL.createObjectURL(formData.image)}
                            alt="Preview"
                            style={{ maxWidth: "200px", maxHeight: "200px" }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Submit Button */}
                    <div className="d-flex justify-content-end">
                      <button type="submit" className="btn btn-primary">
                        Create Inquiry
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewInquiry;
