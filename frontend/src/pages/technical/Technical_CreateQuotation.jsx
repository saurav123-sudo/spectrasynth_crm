import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { useParams, useNavigate } from "react-router-dom";
import axiosInstance from "../../apis/axiosConfig";
import { STANDARD_TERMS_AND_CONDITIONS } from "../../constants/termsAndConditions";
import { formatInquiryNumberForDisplay } from "../../utils/inquiryNumberUtils";

const initialItem = {
  product_name: "",
  cas_no: "",
  hsn_no: "",
  qty: "",
  price: "",
  lead_time: "",
  company_name: "",
  quantity_unit: "",
  image_url: "",
};

const Technical_CreateQuotation = () => {
  const navigate = useNavigate();
  const { inquiry_number } = useParams();

  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [quotationNo, setQuotationNo] = useState("");
  const [quotedBy, setQuotedBy] = useState("");
  const [inquiryDetails, setInquiryDetails] = useState(null);
  const [items, setItems] = useState([]);
  const [remarks, setRemarks] = useState("");
  const [technicalStatus, setTechnicalStatus] = useState("pending");
  const [existingQuotation, setExistingQuotation] = useState(null);
  const [reverting, setReverting] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [modalCompanies, setModalCompanies] = useState([]);
  const [modalIndex, setModalIndex] = useState(null);
  // --- ADD THESE ---
  const [modalCurrentPage, setModalCurrentPage] = useState(1);
  const [modalItemsPerPage, setModalItemsPerPage] = useState(5); // You can change 5 to any number
  const [imageModalUrl, setImageModalUrl] = useState(null);
  const IMAGE_BASE_URL = import.meta.env.VITE_IMAGE_BASE_URL;

  // Lead Time Master state
  const [leadTimes, setLeadTimes] = useState([]);

  useEffect(() => {
    const fetchLeadTimes = async () => {
      try {
        const res = await axiosInstance.get("/api/lead-time-master/active");
        setLeadTimes(res.data.data || []);
      } catch (err) {
        console.error("Error fetching lead times:", err);
      }
    };

    fetchLeadTimes();
    fetchInquiryProducts();
    fetchQuotationNumber();
    decodeUserFromToken();
  }, [inquiry_number]);

  // Fetch inquiry products
  const fetchInquiryProducts = async () => {
    try {
      const res = await axiosInstance.get(
        `/api/inquiries/getByNumber/${inquiry_number}`
      );
      const data = res.data;

      setTechnicalStatus(data.technical_status || "pending");

      if (data.technical_status === "forwarded") {
        fetchExistingQuotation();
        return;
      }

      if (data.inquiries?.length) {
        setInquiryDetails(data);
        const productsFromInquiry = data.inquiries.map((p) => ({
          product_name: p.ProductName,
          cas_no: p.cas_number,
          hsn_no: p.product_code || "",
          qty: p.quantity_required,
          quantity_unit: p.quantity_unit || "",
          package_size: p.package_size || "",
          stock: p.stock || "",
          stock_unit: p.stock_unit || "",
          price: "",
          lead_time: "",
          company_name: "",
          image_url: p.image_url || "",
        }));
        setItems(productsFromInquiry);
      }
    } catch (err) {
      console.error("Error fetching inquiry products:", err);
      Swal.fire("Error", "Failed to fetch inquiry details", "error");
    }
  };

  // Fetch latest quotation number
  const fetchQuotationNumber = async () => {
    try {
      const res = await axiosInstance.get(
        "/api/quotations/lastQuotationNumber"
      );
      const now = new Date();
      const yearYY = now.getFullYear().toString().slice(-2);
      const monthMM = String(now.getMonth() + 1).padStart(2, "0");
      const currentDatePart = `${yearYY}${monthMM}`;
      let nextSequentialNumber = 1;

      if (res.data.lastQuotationNumber) {
        const parts = res.data.lastQuotationNumber.split("-");
        const lastDatePart = parts[2];
        const lastSequentialPart = parseInt(parts[3], 10);

        if (lastDatePart === currentDatePart) {
          nextSequentialNumber = lastSequentialPart + 1;
        }
      }

      const newSequentialPart = String(nextSequentialNumber).padStart(3, "0");
      setQuotationNo(`SS-Q-${currentDatePart}-${newSequentialPart}`);
    } catch (err) {
      console.error("Error fetching quotation number:", err);
      const now = new Date();
      const yearYY = now.getFullYear().toString().slice(-2);
      const monthMM = String(now.getMonth() + 1).padStart(2, "0");
      const currentDatePart = `${yearYY}${monthMM}`;
      setQuotationNo(`SS-Q-${currentDatePart}-001`);
    }
  };

  const handleRevertInquiry = async () => {
    const confirm = await Swal.fire({
      title: "Revert Inquiry?",
      text: "Are you sure you want to send this inquiry back to the main dashboard? This removes it from the Technical queue.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#f39c12",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, Revert it",
    });

    if (confirm.isConfirmed) {
      setReverting(true);
      try {
        await axiosInstance.patch(`/api/inquiries/${inquiry_number}/status`, {
          current_stage: "inquiry_received",
          inquiry_status: "pending",
          technical_status: "pending",
        });

        Swal.fire("Reverted!", "Inquiry has been reverted.", "success");
        navigate("/dashboard/Technical");
      } catch (error) {
        console.error("Error reverting inquiry:", error);
        Swal.fire({
          icon: "error",
          title: "Error",
          text: error.response?.data?.message || "Failed to revert inquiry",
        });
      } finally {
        setReverting(false);
      }
    }
  };

  // Decode logged-in user from token
  const decodeUserFromToken = () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const base64Url = token.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const payload = JSON.parse(atob(base64));
      if (payload?.name) setQuotedBy(payload.name);
    } catch (err) {
      console.error("Error decoding token:", err);
    }
  };

  // Fetch existing quotation (if forwarded)
  const fetchExistingQuotation = async () => {
    try {
      const res = await axiosInstance.get(
        `/api/quotations/byInquiryNumber/${inquiry_number}`
      );
      setExistingQuotation(res.data.data);
    } catch (err) {
      console.error("Error fetching existing quotation:", err);
      Swal.fire("Error", "Failed to fetch existing quotation", "error");
    }
  };

  // Open company modal
  const openCompanyModal = async (index) => {
    const productName = items[index].product_name;
    if (!productName) return;

    setModalIndex(index);
    setShowModal(true);
    setModalCompanies([]);
    setModalCurrentPage(1); // --- ADD THIS LINE ---

    try {
      const casNo = items[index].cas_no || "";
      const params = casNo ? `?cas_no=${encodeURIComponent(casNo)}` : "";
      const res = await axiosInstance.get(`/api/product_prices/${encodeURIComponent(productName)}${params}`);
      let fetchedCompanies = res.data.product?.prices || [];

      // Format specific companies as requested
      const companyMap = {
        "tcichemicals": "TCI",
        "ambeed": "Ambeed",
        "sigmaaldrich": "Sigma",
        "bldpharm": "BLD"
      };

      fetchedCompanies = fetchedCompanies.map(c => {
        const lowerComp = (c.company || "").toLowerCase();
        return {
          ...c,
          company: companyMap[lowerComp] || c.company
        };
      });

      // Custom Sorting: BLD -> Ambeed -> Sigma -> TCI -> Others
      const sortOrder = ["PO Price", "Ref.Quo.Price", "R&D", "bld", "ambeed", "sigma", "tci"];

      fetchedCompanies.sort((a, b) => {
        const compA = (a.company || "").toLowerCase();
        const compB = (b.company || "").toLowerCase();

        const indexA = sortOrder.indexOf(compA);
        const indexB = sortOrder.indexOf(compB);

        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;

        // If neither are in the custom list, sort alphabetically by company name
        return (a.company || "").localeCompare(b.company || "");
      });

      setModalCompanies(fetchedCompanies);
    } catch (err) {
      console.error(err);
      setModalCompanies([]);
    }
  };

  // Handle input changes
  const handleInputChange = (index, field, value) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index][field] = value;
      return updated;
    });
  };

  // Remove product
  const handleRemoveItem = (index) => {
    Swal.fire({
      title: "Are you sure?",
      text: "This product will be removed from the quotation.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, remove it!",
    }).then((result) => {
      if (result.isConfirmed) {
        setItems((prev) => prev.filter((_, i) => i !== index));
        Swal.fire("Removed!", "The product has been removed.", "success");
      }
    });
  };

  const [submitting, setSubmitting] = useState(false);

  // Submit quotation
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (technicalStatus === "forwarded") {
      Swal.fire("Access Denied", "Quotation already forwarded.", "error");
      return;
    }

    if (submitting) return;
    setSubmitting(true);

    const companyNameDefault = "R&D";

    const productsToSend = items
      .filter((i) => i.product_name && i.price)
      .map((i) => ({
        product_name: i.product_name,
        cas_no: i.cas_no,
        product_code: i.hsn_no,
        quantity: i.qty,
        quantity_unit: i.quantity_unit || "",
        price: i.price,
        lead_time: i.lead_time,
        company: companyNameDefault, // default company for backend storag
      }));

    if (productsToSend.length === 0) {
      setSubmitting(false);
      Swal.fire(
        "Warning",
        "Please enter price for at least one product.",
        "warning"
      );
      return;
    }

    // ✅ Total price is sum of prices only (no multiplication with quantity)
    const totalPrice = productsToSend.reduce(
      (sum, i) => sum + (parseFloat(i.price) || 0),
      0
    );
    const gstAmount = totalPrice * 0.18;

    const payload = {
      quotation_number: quotationNo,
      quotation_by: quotedBy,
      date,
      total_price: totalPrice,
      gst: gstAmount,
      products: productsToSend,
      remark: remarks,
    };

    try {
      await axiosInstance.post(
        `/api/technical/createQuotation/${inquiry_number}`,
        payload
      );
      Swal.fire("Success", "Quotation created successfully!", "success");
      setItems(items.map((i) => ({ ...i, price: "" })));
      navigate("/dashboard/technical");
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Failed to create quotation", "error");
    }
  };

  // ✅ Total price & GST for display - sum of prices only (no multiplication with quantity)
  const totalPrice = items.reduce(
    (sum, i) => sum + (parseFloat(i.price) || 0),
    0
  );
  const gstAmount = totalPrice * 0.18;

  return (
    <div className="page-wrapper">
      <div className="content">
        <h2>Create / View Quotation</h2>

        {/* Case: Forwarded → Show existing quotation */}
        {technicalStatus === "forwarded" && existingQuotation ? (
          <div className="card p-4 shadow-sm mt-3">
            <h4>Quotation Already Generated</h4>
            <p>
              <strong>Quotation No:</strong>{" "}
              {existingQuotation.quotation_number}
              <br />
              <strong>Inquiry No:</strong> {formatInquiryNumberForDisplay(existingQuotation.inquiry_number, existingQuotation.date)}
              <br />
              <strong>Date:</strong> {existingQuotation.date}
              <br />
              <strong>Quoted By:</strong> {existingQuotation.quotation_by}
            </p>

            <div style={{ overflowX: "auto" }}>
              <table className="table table-bordered">
                <thead>
                  <tr>
                    <th>Sr No</th>
                    <th>Product Name</th>
                    <th>CAS No</th>
                    <th>HSN No</th>
                    <th>Quantity</th>
                    <th>Price</th>
                    <th>Lead Time</th>
                  </tr>
                </thead>

                <tbody>
                  {existingQuotation.products.map((p, i) => (
                    <tr key={i}>
                      <td>{i + 1}</td>
                      <td
                        title={p.product_name}
                        style={{
                          maxWidth: "200px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {p.product_name}
                      </td>
                      <td>{p.cas_number}</td>
                      <td>{p.hsn_number}</td>
                      <td>{`${p.quantity} ${p.quantity_unit || ""}`}</td>
                      <td>₹{p.price}</td>
                      <td>{p.lead_time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mb-3">
              <strong>Total Price:</strong> ₹{existingQuotation.total_price}
              <br />
              <strong>GST (18%):</strong> ₹{existingQuotation.gst}
              <br />
              <strong>Grand Total:</strong> ₹
              {(
                parseFloat(existingQuotation.total_price) +
                parseFloat(existingQuotation.gst)
              ).toFixed(2)}
            </div>

            <div className="mb-3">
              <label>Terms & Conditions</label>
              <textarea
                className="form-control"
                rows="6"
                value={STANDARD_TERMS_AND_CONDITIONS}
                readOnly
                style={{ backgroundColor: "#f8f9fa", cursor: "not-allowed" }}
              />
              <small className="text-muted">
                <i className="ti ti-lock me-1"></i>
                Standard terms and conditions (read-only)
              </small>
            </div>

            <div className="mb-3">
              <label>Remarks</label>
              <textarea
                className="form-control"
                rows="4"
                value={existingQuotation.remark || ""}
                readOnly
                style={{ backgroundColor: "#f8f9fa", cursor: "not-allowed" }}
                placeholder="No remarks added"
              />
              <small className="text-muted">
                <i className="ti ti-info-circle me-1"></i>
                Custom remarks (view-only)
              </small>
            </div>
          </div>
        ) : technicalStatus === "forwarded" && !existingQuotation ? (
          <p className="text-danger">Quotation forwarded but not found.</p>
        ) : (
          // Case: Pending → Create new quotation
          <form onSubmit={handleSubmit}>
            <div className="row mb-3">
              <div className="col-md-3">
                <label>Date:</label>
                <input
                  type="date"
                  className="form-control"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
              <div className="col-md-3">
                <label>Inquiry No:</label>
                <input
                  type="text"
                  className="form-control"
                  value={formatInquiryNumberForDisplay(inquiryDetails?.inquiry_number || inquiry_number, inquiryDetails?.createdAt)}
                  readOnly
                />
              </div>
              <div className="col-md-4">
                <label>Quotation No:</label>
                <input
                  type="text"
                  className="form-control"
                  value={quotationNo}
                  readOnly
                />
              </div>
              <div className="col-md-5">
                <label>Quoted By:</label>
                <input
                  type="text"
                  className="form-control"
                  value={quotedBy}
                  readOnly
                />
              </div>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table className="table table-bordered">
                <thead>
                  <tr>
                    <th>Sr No</th>
                    <th>Product Name</th>
                    <th>CAS No</th>
                    <th>HSN No</th>
                    <th>Quantity</th>
                    <th>Pkt Size</th>
                    <th>Stock</th>
                    <th>Reference Price</th>
                    <th>Price</th>
                    <th style={{ width: "9%" }}>Lead Time</th>

                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={idx}>
                      <td>{idx + 1}</td>
                      <td
                        title={item.product_name}
                        style={{
                          maxWidth: "200px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {item.product_name}
                      </td>
                      <td>{item.cas_no}</td>
                      <td>{item.hsn_no}</td>
                      <td>{`${item.qty} ${item.quantity_unit || ""}`}</td>
                      <td>{item.package_size || "-"}</td>
                      <td>{item.stock ? `${item.stock}${item.stock_unit ? `(${item.stock_unit})` : ""}` : "-"}</td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-outline-primary"
                          onClick={() => openCompanyModal(idx)}
                        >
                          {item.company_name || "View Prices"}
                        </button>
                      </td>
                      <td>
                        <input
                          type="number"
                          className="form-control"
                          value={item.price}
                          style={{ width: "80px" }}
                          onChange={(e) =>
                            handleInputChange(idx, "price", e.target.value)
                          }
                        />
                      </td>
                      <td>
                        <select
                          className="form-select"
                          value={item.lead_time}
                          onChange={(e) =>
                            handleInputChange(idx, "lead_time", e.target.value)
                          }
                        >
                          <option value="">Select Lead Time</option>
                          {leadTimes.map((lt) => (
                            <option key={lt.id} value={lt.lead_time}>
                              {lt.lead_time}
                            </option>
                          ))}
                        </select>
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mb-3">
              <strong>Total Price: ₹{totalPrice.toFixed(2)}</strong>
              <br />
              <strong>GST (18%): ₹{gstAmount.toFixed(2)}</strong>
              <br />
              <strong>
                Grand Total: ₹{(totalPrice + gstAmount).toFixed(2)}
              </strong>
            </div>

            <div className="mb-3">
              <label>Terms & Conditions</label>
              <textarea
                className="form-control"
                rows="6"
                value={STANDARD_TERMS_AND_CONDITIONS}
                readOnly
                style={{ backgroundColor: "#f8f9fa", cursor: "not-allowed" }}
              />
              <small className="text-muted">
                <i className="ti ti-lock me-1"></i>
                Standard terms and conditions (read-only)
              </small>
            </div>

            <div className="mb-3">
              <label>Remarks</label>
              <textarea
                className="form-control"
                rows="4"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Enter any additional remarks or notes for this quotation..."
              />
              <small className="text-muted">
                <i className="ti ti-edit me-1"></i>
                Custom remarks (editable)
              </small>
            </div>

            <div className="d-flex gap-3 mt-4 mb-3">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting || reverting}
              >
                {submitting ? "Submitting..." : "Submit Quotation"}
              </button>

              <button
                type="button"
                className="btn btn-warning"
                onClick={handleRevertInquiry}
                disabled={submitting || reverting}
              >
                {reverting ? "Reverting..." : "Revert to Inquiry"}
              </button>
            </div>
          </form>
        )}

        {/* Company Modal */}
        {showModal && (
          <div className="modal show d-block" tabIndex="-1">
            <div className="modal-dialog">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">
                    Reference Price for {items[modalIndex]?.product_name}
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setShowModal(false)}
                  />
                </div>
                <div className="modal-body">
                  {/* --- Pagination Logic --- */}
                  {(() => {
                    const indexOfLastItem =
                      modalCurrentPage * modalItemsPerPage;
                    const indexOfFirstItem =
                      indexOfLastItem - modalItemsPerPage;
                    const currentModalCompanies = modalCompanies.slice(
                      indexOfFirstItem,
                      indexOfLastItem
                    );
                    const totalModalPages = Math.ceil(
                      modalCompanies.length / modalItemsPerPage
                    );

                    return (
                      <>
                        {modalCompanies.length > 0 ? (
                          /* --- Converted to Table Format --- */
                          <table className="table table-hover">
                            <thead>
                              <tr>
                                <th scope="col">Company</th>
                                <th scope="col">Quantity</th>
                                <th scope="col">Unit</th>
                                <th scope="col">Price</th>
                                <th scope="col">Last Updated</th>
                              </tr>
                            </thead>
                            <tbody>
                              {currentModalCompanies.map((c, i) => (
                                <tr
                                  key={i}
                                  // onClick={() => selectCompanyPrice(c)}
                                  style={{ cursor: "pointer" }}
                                >
                                  <td>{c.company}</td>
                                  <td>{c.quantity}</td>
                                  <td>{c.unit}</td>
                                  <td>
                                    <span style={{ fontSize: "1.2rem", fontWeight: "600", marginRight: "2px" }}>
                                      {c.currency === 'USD' ? '$' : '₹'}
                                    </span>
                                    {c.price}
                                  </td>
                                  <td>{c.updatedAt ? new Date(c.updatedAt).toLocaleDateString('en-GB') : '-'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        ) : (
                          <p className="text-danger text-center">
                            No companies available for this product.
                          </p>
                        )}

                        {/* --- Pagination Controls --- */}
                        {modalCompanies.length > modalItemsPerPage && (
                          <nav>
                            <ul
                              className="pagination justify-content-center"
                              style={{ margin: 0 }}
                            >
                              <li
                                className={`page-item ${modalCurrentPage === 1 ? "disabled" : ""
                                  }`}
                              >
                                <button
                                  className="page-link"
                                  onClick={() =>
                                    setModalCurrentPage((prev) =>
                                      Math.max(prev - 1, 1)
                                    )
                                  }
                                >
                                  Previous
                                </button>
                              </li>
                              <li className="page-item disabled">
                                <span className="page-link">
                                  Page {modalCurrentPage} of {totalModalPages}
                                </span>
                              </li>
                              <li
                                className={`page-item ${modalCurrentPage === totalModalPages
                                  ? "disabled"
                                  : ""
                                  }`}
                              >
                                <button
                                  className="page-link"
                                  onClick={() =>
                                    setModalCurrentPage((prev) =>
                                      Math.min(prev + 1, totalModalPages)
                                    )
                                  }
                                >
                                  Next
                                </button>
                              </li>
                            </ul>
                          </nav>
                        )}
                      </>
                    );
                  })()}
                </div>
                <div className="modal-footer">
                  <button
                    className="btn btn-secondary"
                    onClick={() => setShowModal(false)}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* IMAGE VIEW MODAL */}
        {imageModalUrl && (
          <div className="modal show d-block" tabIndex="-1">
            <div
              className="modal-dialog modal-dialog-centered"
              style={{ maxWidth: "600px" }}
            >
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Product Image</h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setImageModalUrl(null)}
                  ></button>
                </div>
                <div className="modal-body text-center">
                  <img
                    src={imageModalUrl}
                    alt="Large View"
                    style={{
                      width: "60%",
                      height: "auto",
                      borderRadius: "6px",
                      objectFit: "contain",
                    }}
                  />
                </div>
                <div className="modal-footer">
                  <button
                    className="btn btn-secondary"
                    onClick={() => setImageModalUrl(null)}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Technical_CreateQuotation;
