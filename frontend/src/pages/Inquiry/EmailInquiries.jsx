import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Swal from "sweetalert2";
import axiosInstance from "../../apis/axiosConfig";

const EmailInquiries = () => {
  const { inquiry_number } = useParams();
  const [inquiries, setInquiries] = useState([]);
  const [customerName, setCustomerName] = useState("");
  const [loading, setLoading] = useState(true);
  const [originalEmail, setOriginalEmail] = useState(null);
  const [showEmail, setShowEmail] = useState(false);
  const IMAGE_BASE_URL = import.meta.env.VITE_IMAGE_BASE_URL;

  const fetchInquiries = async () => {
    try {
      const response = await axiosInstance.get(
        `/api/inquiries/getByNumber/${inquiry_number}`,
      );
      const data = response.data;

      // Debug log to check received data
      console.log("📦 Received inquiry data:", data);
      console.log(
        "📦 First product package_size:",
        data.inquiries?.[0]?.package_size,
      );

      setCustomerName(data.customer_name || "");
      setOriginalEmail(data.original_email || null);
      setInquiries(data.inquiries || []);
    } catch (error) {
      console.error("Error fetching inquiries:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: error.response?.data?.message || "Failed to fetch inquiries",
      });
    } finally {
      setLoading(false);
    }
  };
  const showImagePopup = (imageUrl) => {
    Swal.fire({
      html: `
      <div style="
        width: 60vh;
        height: 60vh;
        background: white;
        display: flex;
        justify-content: center;
        align-items: center;
        border-radius: 12px;
        overflow: hidden;
        margin: auto;
      ">
        <img src="${imageUrl}" 
             style="width: 100%; height: 100%; object-fit: contain;" />
      </div>
    `,
      width: "auto",
      padding: 0,
      background: "transparent",
      showConfirmButton: false,
      showCloseButton: true,
    });
  };

  useEffect(() => {
    fetchInquiries();
  }, [inquiry_number]);

  if (loading) {
    return (
      <div className="page-wrapper">
        <div className="container mt-4">Loading inquiries...</div>
      </div>
    );
  }
  return (
    <div className="page-wrapper">
      <div className="content">
        <div className="row">
          <div className="col-md-12">
            <div className="page-header">
              <div className="row align-items-center">
                <div className="container mt-4">
                  <div className="d-flex justify-content-between align-items-center mb-4">
                    <h1 className="mb-0">Email Inquiries - {customerName}</h1>
                    {originalEmail && (
                      <button
                        className={`btn ${showEmail ? "btn-outline-secondary" : "btn-outline-primary"}`}
                        onClick={() => setShowEmail(!showEmail)}
                      >
                        {showEmail ? "✕ Hide Email" : "📧 Show Original Email"}
                      </button>
                    )}
                  </div>

                  <div className="row">
                  {/* Left side: Products table */}
                  <div className={showEmail ? "col-md-6" : "col-12"}>
                  <div className="table-responsive">
                    <table className="table table-striped table-bordered">
                      <thead className="table-dark">
                        <tr>
                          <th>Product Image</th>
                          <th>Product Name</th>
                          <th>CAS No</th>
                          <th>Quantity</th>
                          <th>Unit</th>
                          <th>Package Size</th>
                          <th>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inquiries.map((inquiry, index) => (
                          <tr key={index}>
                            <td
                              style={{
                                height: "80px",
                                verticalAlign: "middle",
                              }}
                            >
                              <div
                                className="d-flex justify-content-center align-items-center"
                                style={{ height: "100%" }}
                              >
                                <img
                                  src={
                                    inquiry.image_url
                                      ? `${IMAGE_BASE_URL}/${inquiry.image_url}`
                                      : "https://via.placeholder.com/80"
                                  }
                                  alt={inquiry.ProductName}
                                  className="img-fluid"
                                  style={{
                                    maxWidth: "80px",
                                    maxHeight: "80px",
                                    objectFit: "contain",
                                    cursor: "pointer",
                                  }}
                                  onClick={() =>
                                    showImagePopup(
                                      inquiry.image_url
                                        ? `${IMAGE_BASE_URL}/${inquiry.image_url}`
                                        : "https://via.placeholder.com/80",
                                    )
                                  }
                                />
                              </div>
                            </td>

                            <td>
                              {inquiry.ProductName}
                              {inquiry.has_catalog_match && (
                                <span
                                  className="ms-2"
                                  title="Catalog Match Found (Exists in database)"
                                  style={{
                                    color: "#198754",
                                    fontSize: "1.2rem",
                                    fontWeight: "bold",
                                  }}
                                >
                                  ✓
                                </span>
                              )}
                            </td>
                            <td>{inquiry.cas_number}</td>
                            <td>{inquiry.quantity_required}</td>
                            <td>{inquiry.quantity_unit || "N/A"}</td>
                            <td>{inquiry.package_size || "-"}</td>
                            <td>
                              {new Date(inquiry.createdAt).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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

                          {/* Attachments */}
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
                  </div> {/* end row */}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailInquiries;
