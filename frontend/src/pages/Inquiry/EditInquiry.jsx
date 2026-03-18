import React, { useState, useEffect, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import axiosInstance from "../../apis/axiosConfig";

const IMAGE_BASE_URL = import.meta.env.VITE_IMAGE_BASE_URL;

const EditInquiries = () => {
  const { inquiry_number } = useParams();
  const navigate = useNavigate();

  const [inquiries, setInquiries] = useState([]);
  const [customerName, setCustomerName] = useState("");
  const [loading, setLoading] = useState(true);
  const [originalEmail, setOriginalEmail] = useState(null);
  const [showEmail, setShowEmail] = useState(false);

  const [productSuggestions, setProductSuggestions] = useState({});
  const [searchTriggeredBy, setSearchTriggeredBy] = useState({});
  const searchDebounceRef = useRef({});

  // Fetch all inquiries for this inquiry number
  const fetchInquiries = async () => {
    try {
      const response = await axiosInstance.get(
        `/api/inquiries/getByNumber/${inquiry_number}`
      );
      const data = response.data;

      setCustomerName(data.customer_name || "");
      setOriginalEmail(data.original_email || null);

      // Prepare inquiries with editable fields
      const editable = data.inquiries.map((inq) => ({
        ...inq,
        id: inq.id,
        ProductName: inq.ProductName || "",
        cas_number: inq.cas_number || "",
        product_code: inq.product_code || "",
        quantity_required: inq.quantity_required || "",
        quantity_unit: inq.quantity_unit || "",
        package_size: inq.package_size || "",
        image_url: inq.image_url || null,
        has_catalog_match: inq.has_catalog_match || false,
      }));

      setInquiries(editable);
    } catch (error) {
      console.error("Error fetching inquiries:", error);
      Swal.fire(
        "Error",
        error.response?.data?.message || "Failed to fetch inquiries",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInquiries();
  }, [inquiry_number]);

  // Handle field change
  const handleChange = (index, field, value) => {
    setInquiries((prev) =>
      prev.map((inq, i) => (i === index ? { ...inq, [field]: value } : inq))
    );
  };

  const fetchProductSuggestions = async (index, query, field = "ProductName") => {
    if (!query || query.trim().length < 1) {
      setProductSuggestions((prev) => ({ ...prev, [index]: [] }));
      return;
    }

    setSearchTriggeredBy((prev) => ({ ...prev, [index]: field }));

    try {
      const dbField = field === "ProductName" ? "product_name" : "cas_number";
      const res = await axiosInstance.get("/api/products/search", {
        params: { q: query.trim(), searchBy: dbField },
      });

      const list = Array.isArray(res.data) ? res.data : [];

      if (dbField === "cas_number") {
        const exactMatch = list.find(
          (item) =>
            item.cas_number &&
            item.cas_number.trim() === query.trim()
        );

        if (exactMatch) {
          const updatedInquiries = [...inquiries];

          updatedInquiries[index] = {
            ...updatedInquiries[index],
            ProductName: exactMatch.product_name || "",
            cas_number:
              exactMatch.cas_number && exactMatch.cas_number !== "N/A"
                ? exactMatch.cas_number
                : "",
          };

          setInquiries(updatedInquiries);

          setProductSuggestions((prev) => ({
            ...prev,
            [index]: [],
          }));

          if (searchDebounceRef.current[index]) {
            clearTimeout(searchDebounceRef.current[index]);
          }

          return;
        }
      }

      const mapped = list.map((p) => ({
        id: p.id,
        ProductName: p.product_name || "",
        cas_number:
          p.cas_number && p.cas_number !== "N/A"
            ? p.cas_number
            : "N/A",
      }));

      setProductSuggestions((prev) => ({ ...prev, [index]: mapped }));

    } catch (err) {
      console.error("Failed to fetch product suggestions", err);
      setProductSuggestions((prev) => ({ ...prev, [index]: [] }));
    }
  };

  const debouncedFetchSuggestions = (index, query, field = "ProductName") => {
    if (searchDebounceRef.current[index]) {
      clearTimeout(searchDebounceRef.current[index]);
    }
    searchDebounceRef.current[index] = setTimeout(() => {
      fetchProductSuggestions(index, query, field);
    }, 500); // 500ms debounce
  };

  // Submit  updated inquiries
  const handleSubmit = async () => {
    try {
      // Step 1: Upload any pending images for existing products
      for (let inq of inquiries) {
        if (inq._pendingFile && inq.id) {
          const formData = new FormData();
          formData.append("image", inq._pendingFile);
          const imgRes = await axiosInstance.post(
            `/api/inquiries/uploadProductImage/${inq.id}`,
            formData,
            { headers: { "Content-Type": "multipart/form-data" } }
          );
          inq.image_url = imgRes.data.image_url;
        }
      }

      // Step 2: Save all product data
      const response = await axiosInstance.put(
        `/api/inquiries/updateAll/${inquiry_number}`,
        { inquiries }
      );

      Swal.fire(
        "Success",
        response.data.message || "Inquiries updated successfully",
        "success"
      ).then(() => {
        navigate("/dashboard/Inquiry");
      });
    } catch (error) {
      console.error("Error updating inquiries:", error);
      Swal.fire(
        "Error",
        error.response?.data?.message || "Failed to update inquiries",
        "error"
      );
    }
  };

  // Add new product (local only — saved on Update All)
  const handleAddProduct = () => {
    setInquiries((prev) => [
      ...prev,
      {
        id: null, // null = new product, not yet in DB
        isNew: true,
        ProductName: "",
        cas_number: "",
        product_code: "",
        quantity_required: "",
        quantity_unit: "mg",
        package_size: "",
        image_url: null,
      },
    ]);
  };

  // Remove product
  const handleRemoveProduct = async (productId, productName, index) => {
    const result = await Swal.fire({
      title: "Remove Product?",
      text: `Are you sure you want to remove "${productName || "this product"}"?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#6c757d",
      confirmButtonText: "Yes, remove it",
    });

    if (result.isConfirmed) {
      if (!productId) {
        // New product not yet in DB — just remove from local state
        setInquiries((prev) => prev.filter((_, i) => i !== index));
        return;
      }
      try {
        await axiosInstance.delete(`/api/inquiries/deleteProduct/${productId}`);
        Swal.fire("Deleted", "Product removed successfully", "success");
        fetchInquiries();
      } catch (error) {
        console.error("Error removing product:", error);
        Swal.fire("Error", error.response?.data?.message || "Failed to remove product", "error");
      }
    }
  };

  // Stage image locally (uploaded on Update All)
  const handleImageSelect = (index, file) => {
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    setInquiries((prev) =>
      prev.map((inq, i) =>
        i === index ? { ...inq, _pendingFile: file, _previewUrl: previewUrl } : inq
      )
    );
  };

  if (loading)
    return <div className="container mt-4">Loading inquiries...</div>;

  return (
    <div className="page-wrapper">
      <div className="container-fluid mt-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h2>Edit Inquiries - {customerName}</h2>
          <div>
            {originalEmail && (
              <button
                className={`btn me-2 ${showEmail ? "btn-outline-secondary" : "btn-outline-primary"}`}
                onClick={() => setShowEmail(!showEmail)}
              >
                {showEmail ? "✕ Hide Email" : "📧 Show Original Email"}
              </button>
            )}
            <button className="btn btn-warning" onClick={handleAddProduct}>
              + Add Product
            </button>
          </div>
        </div>

        <div className="row">
          {/* Left side: Edit Form */}
          <div className={showEmail ? "col-md-6" : "col-12"}>
            {inquiries.map((inq, index) => (
              <div key={inq.id || `new-${index}`} className="card mb-3 p-3" style={inq.isNew ? { borderLeft: "4px solid #ffc107" } : {}}>
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <strong style={{ fontSize: "0.85rem", color: inq.isNew ? "#ffc107" : "#6c757d" }}>
                    Product #{index + 1} {inq.isNew && <span className="badge bg-warning text-dark ms-1">NEW</span>}
                    {inq.has_catalog_match && (
                      <span
                        className="ms-2"
                        title="Catalog Match Found (Exists in database)"
                        style={{
                          cursor: "pointer",
                          fontSize: "1.8rem",
                          color: "#4ade80", // Lighter vibrant green
                          fontWeight: "bold",
                          lineHeight: "1",
                          display: "inline-block",
                          verticalAlign: "middle"
                        }}
                      >
                        ✔
                      </span>
                    )}
                  </strong>
                  <button
                    className="btn btn-sm btn-outline-danger"
                    onClick={() => handleRemoveProduct(inq.id, inq.ProductName, index)}
                    title="Remove this product"
                  >
                    🗑 Remove
                  </button>
                </div>

                {/* Product Image */}
                <div className="mb-3 d-flex align-items-center gap-3">
                  <div
                    style={{
                      width: "80px",
                      height: "80px",
                      border: "1px solid #dee2e6",
                      borderRadius: "8px",
                      overflow: "hidden",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: "#f8f9fa",
                      flexShrink: 0,
                    }}
                  >
                    {inq._previewUrl ? (
                      <img
                        src={inq._previewUrl}
                        alt="Preview"
                        style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                      />
                    ) : inq.image_url ? (
                      <img
                        src={`${IMAGE_BASE_URL}/${inq.image_url}`}
                        alt="Product"
                        style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                      />
                    ) : (
                      <span style={{ fontSize: "0.75rem", color: "#adb5bd", textAlign: "center" }}>
                        No Image
                      </span>
                    )}
                  </div>
                  <div>
                    <label className="form-label mb-1" style={{ fontSize: "0.85rem" }}>
                      📎 {inq._pendingFile ? `✅ ${inq._pendingFile.name}` : "Upload Image"}
                    </label>
                    <input
                      type="file"
                      className="form-control form-control-sm"
                      accept="image/*"
                      onChange={(e) => handleImageSelect(index, e.target.files[0])}
                    />
                  </div>
                  {(inq.image_url || inq._previewUrl) && (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger"
                      style={{ alignSelf: "center" }}
                      onClick={() =>
                        handleChange(index, "image_url", null) ||
                        setInquiries((prev) =>
                          prev.map((item, i) =>
                            i === index ? { ...item, image_url: null, _previewUrl: null, _pendingFile: null } : item
                          )
                        )
                      }
                      title="Remove image"
                    >
                      ✕ Remove Image
                    </button>
                  )}
                </div>

                <div className="mb-3 position-relative">
                  <label className="form-label">Product Name</label>
                  <input
                    type="text"
                    className="form-control"
                    value={inq.ProductName}
                    onChange={(e) => {
                      const val = e.target.value;
                      handleChange(index, "ProductName", val);
                      debouncedFetchSuggestions(index, val, "ProductName");
                    }}
                    required
                    autoComplete="off"
                  />
                  {/* Suggestions dropdown (Product Name) */}
                  {productSuggestions[index] &&
                    productSuggestions[index].length > 0 &&
                    searchTriggeredBy[index] === "ProductName" && (
                      <div
                        className="list-group position-absolute w-100"
                        style={{
                          zIndex: 1000,
                          maxHeight: "200px",
                          overflowY: "auto",
                        }}
                      >
                        {productSuggestions[index].map((item) => (
                          <button
                            type="button"
                            key={item.id}
                            className="list-group-item list-group-item-action"
                            onClick={() => {
                              const updatedInquiries = [...inquiries];
                              updatedInquiries[index] = {
                                ...updatedInquiries[index],
                                ProductName: item.ProductName || "",
                                cas_number:
                                  item.cas_number && item.cas_number !== "N/A"
                                    ? item.cas_number
                                    : "",
                              };
                              setInquiries(updatedInquiries);
                              setProductSuggestions((prev) => ({
                                ...prev,
                                [index]: [],
                              }));
                            }}
                          >
                            {item.ProductName || "—"}
                          </button>
                        ))}
                      </div>
                    )}
                </div>
                <div className="row">
                  <div className="col-md-6 mb-3 position-relative">
                    <label className="form-label">CAS No</label>
                    <input
                      type="text"
                      className="form-control"
                      value={inq.cas_number}
                      onChange={(e) => {
                        const val = e.target.value;
                        handleChange(index, "cas_number", val);
                        if (val.length >= 5) {
                          debouncedFetchSuggestions(index, val, "cas_number");
                        }
                      }}
                      autoComplete="off"
                    />
                    {/* Suggestions dropdown (CAS Number) */}
                    {productSuggestions[index] &&
                      productSuggestions[index].length > 0 &&
                      searchTriggeredBy[index] === "cas_number" && (
                        <div
                          className="list-group position-absolute w-100"
                          style={{
                            zIndex: 1000,
                            maxHeight: "200px",
                            overflowY: "auto",
                          }}
                        >
                          {productSuggestions[index].map((item) => (
                            <button
                              type="button"
                              key={item.id}
                              className="list-group-item list-group-item-action"
                              onClick={() => {
                                const updatedInquiries = [...inquiries];
                                updatedInquiries[index] = {
                                  ...updatedInquiries[index],
                                  ProductName: item.ProductName || "",
                                  cas_number:
                                    item.cas_number && item.cas_number !== "N/A"
                                      ? item.cas_number
                                      : "",
                                };
                                setInquiries(updatedInquiries);
                                setProductSuggestions((prev) => ({
                                  ...prev,
                                  [index]: [],
                                }));
                              }}
                            >
                              <div className="d-flex justify-content-between">
                                <strong>{item.cas_number}</strong>
                                <small className="text-muted text-truncate w-50 text-end">
                                  {item.ProductName}
                                </small>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">HSN / Product Code</label>
                    <input
                      type="text"
                      className="form-control"
                      value={inq.product_code}
                      onChange={(e) =>
                        handleChange(index, "product_code", e.target.value)
                      }
                    />
                  </div>
                </div>
                <div className="row">
                  <div className="col-md-4 mb-3">
                    <label className="form-label">Quantity</label>
                    <input
                      type="number"
                      className="form-control"
                      value={inq.quantity_required}
                      onChange={(e) =>
                        handleChange(index, "quantity_required", e.target.value)
                      }
                    />
                  </div>
                  <div className="col-md-4 mb-3">
                    <label className="form-label">Unit</label>
                    <select
                      className="form-control"
                      value={inq.quantity_unit}
                      onChange={(e) =>
                        handleChange(index, "quantity_unit", e.target.value)
                      }
                    >
                      <option value="mg">mg</option>
                      <option value="gm">gm</option>
                      <option value="ml">ml</option>
                      <option value="kg">kg</option>
                      <option value="mt">mt</option>
                      <option value="ltr">ltr</option>
                    </select>
                  </div>
                  <div className="col-md-4 mb-3">
                    <label className="form-label">Package Size</label>
                    <input
                      type="text"
                      className="form-control"
                      value={inq.package_size}
                      onChange={(e) =>
                        handleChange(index, "package_size", e.target.value)
                      }
                      placeholder="e.g. 2 packets"
                    />
                  </div>
                </div>
              </div>
            ))}

            <div className="d-flex gap-2 mb-4">
              <button className="btn btn-success" onClick={handleSubmit}>
                ✅ Update All
              </button>
              <button className="btn btn-warning" onClick={handleAddProduct}>
                + Add Product
              </button>
              <Link to="/dashboard/Inquiry" className="btn btn-secondary">
                Cancel
              </Link>
            </div>
          </div>

          {/* Right side: Original Email */}
          {showEmail && originalEmail && (
            <div className="col-md-6">
              <div
                className="card"
                style={{
                  position: "sticky",
                  top: "1rem",
                  maxHeight: "85vh",
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                  <strong>📧 Original Email</strong>
                  <button
                    className="btn btn-sm btn-light"
                    onClick={() => setShowEmail(false)}
                  >
                    ✕
                  </button>
                </div>
                <div className="card-body p-3" style={{ overflow: "hidden", flex: 1 }}>
                  <p className="mb-1">
                    <strong>From:</strong> {originalEmail.sender_email}
                  </p>
                  <p className="mb-1">
                    <strong>Subject:</strong> {originalEmail.subject || "No Subject"}
                  </p>
                  {originalEmail.received_at && (
                    <p className="mb-2 text-muted" style={{ fontSize: "0.85rem" }}>
                      <strong>Date:</strong>{" "}
                      {new Date(originalEmail.received_at).toLocaleString()}
                    </p>
                  )}

                  {/* Attachments (PDFs, docs, etc.) */}
                  {Array.isArray(originalEmail.attachments) &&
                    originalEmail.attachments.length > 0 && (
                      <div className="mt-3">
                        <div className="alert alert-secondary py-2 mb-2">
                          <i className="ti ti-paperclip me-2"></i>
                          <strong>Attachments:</strong>
                        </div>
                        <ul className="list-group">
                          {originalEmail.attachments.map((att) => (
                            <li
                              key={att.id}
                              className="list-group-item d-flex justify-content-between align-items-center"
                            >
                              <div>
                                <i className="ti ti-file-text me-2"></i>
                                {att.filename}
                                {att.mime_type && (
                                  <small className="text-muted ms-2">
                                    ({att.mime_type})
                                  </small>
                                )}
                              </div>
                              <a
                                href={`${IMAGE_BASE_URL.replace(/\/+$/, "")}/${att.storage_path}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-sm btn-outline-primary"
                              >
                                <i className="ti ti-download me-1"></i>
                                Download
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                  <hr />
                  {originalEmail.format === "html" ? (
                    <iframe
                      title="Original Email"
                      srcDoc={originalEmail.body}
                      style={{
                        width: "100%",
                        height: "calc(85vh - 260px)",
                        border: "1px solid #dee2e6",
                        borderRadius: "4px",
                        backgroundColor: "#fff",
                      }}
                      sandbox="allow-same-origin"
                    />
                  ) : (
                    <pre
                      style={{
                        whiteSpace: "pre-wrap",
                        wordWrap: "break-word",
                        maxHeight: "calc(85vh - 260px)",
                        overflowY: "auto",
                        fontSize: "0.9rem",
                        backgroundColor: "#f8f9fa",
                        padding: "1rem",
                        borderRadius: "4px",
                      }}
                    >
                      {originalEmail.body}
                    </pre>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EditInquiries;
