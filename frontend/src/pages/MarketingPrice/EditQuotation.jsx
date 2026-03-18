import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { useParams, useNavigate } from "react-router-dom";
import axiosInstance from "../../apis/axiosConfig";
import { STANDARD_TERMS_AND_CONDITIONS } from "../../constants/termsAndConditions";
import { formatInquiryNumberForDisplay } from "../../utils/inquiryNumberUtils";

const initialItem = {
  qp_id: null,
  product_name: "",
  cas_no: "",
  hsn_no: "",
  qty: "",
  quantity_unit: "",
  price: "",
  lead_time: "",
  company_name: "",
};

const EditQuotation = () => {
  const navigate = useNavigate();
  const { quotation_number } = useParams();

  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [quotationNo, setQuotationNo] = useState(quotation_number || "");
  const [quotedBy, setQuotedBy] = useState("");
  const [items, setItems] = useState([]);
  const [remarks, setRemarks] = useState("");
  const [managementStatus, setManagementStatus] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [inquiryNo, setInquiryNo] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  const [existingQuotation, setExistingQuotation] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalCompanies, setModalCompanies] = useState([]);
  const [modalIndex, setModalIndex] = useState(null);
  const [gst, setGst] = useState(0);
  const [submitting, setSubmitting] = useState(false); // Loading state for form submission

  const IMAGE_BASE_URL = import.meta.env.VITE_IMAGE_BASE_URL;

  // --- ADD THESE ---
  const [modalCurrentPage, setModalCurrentPage] = useState(1);
  const [modalItemsPerPage, setModalItemsPerPage] = useState(5); // You can change 5 to any number

  // Lead Time Master state
  const [leadTimes, setLeadTimes] = useState([]);

  // Fetch quotation & decode user
  useEffect(() => {
    const fetchLeadTimes = async () => {
      try {
        const res = await axiosInstance.get("/api/lead-time-master/active");
        setLeadTimes(res.data.data || []);
      } catch (err) {
        console.error("Error fetching lead times:", err);
      }
    };

    const fetchQuotation = async () => {
      try {
        const res = await axiosInstance.get(
          `/api/quotations/byNumber/${quotation_number}`
        );
        const q = res.data.data;

        setRemarks(q.remark || "");
        setDate(
          q.date?.split("T")[0] || new Date().toISOString().split("T")[0]
        );
        setQuotationNo(q.quotation_number);
        setQuotedBy(q.quotation_by);
        setManagementStatus(q.inquiry?.management_status || "pending");
        setInquiryNo(q.inquiry?.inquiry_number || "");
        setCompanyName(q.company_name || "");
        setCompanyEmail(q.company_email_id || "");
        setGst(q.gst || 0);

        const mappedProducts = (q.products || []).map((p) => ({
          qp_id: p.id || null,
          product_name: p.product_name,
          cas_no: p.cas_number,
          hsn_no: p.hsn_number || "",
          qty: p.quantity,
          quantity_unit: p.quantity_unit || "",
          package_size: p.package_size || "",
          stock: p.stock || "",
          stock_unit: p.stock_unit || "",
          price: p.price,
          lead_time: p.lead_time,
          company_name: p.company_name || "",
          image_url: p.image_url || null,
        }));

        setItems(mappedProducts.length ? mappedProducts : [{ ...initialItem }]);
        if (q.inquiry?.management_status === "forwarded")
          setExistingQuotation(q);
      } catch (err) {
        console.error(err);
        Swal.fire("Error", "Failed to fetch quotation data", "error");
      } finally {
        setLoading(false);
      }
    };

    const decodeUserFromToken = () => {
      const token = localStorage.getItem("token");
      if (!token) return;
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        if (payload?.name) setQuotedBy(payload.name);
      } catch (err) {
        console.error(err);
      }
    };

    fetchLeadTimes();
    fetchQuotation();
    decodeUserFromToken();
  }, [quotation_number]);

  const handleInputChange = (index, field, value) => {
    setItems((prev) => {
      const newItems = [...prev];
      newItems[index][field] = value;
      return newItems;
    });
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

  // Select company from modal
  // Select company from modal
  const selectCompanyPrice = (company) => {
    if (modalIndex !== null) {
      const updatedItems = [...items];
      updatedItems[modalIndex].company_name = company.company;
      updatedItems[modalIndex].price = company.price; // --- ADDED --- // Update quantity and unit if they are provided by the API response

      if (company.quantity !== undefined) {
        updatedItems[modalIndex].qty = company.quantity;
      }
      if (company.unit !== undefined) {
        updatedItems[modalIndex].unit = company.unit;
      } // --- END OF ADDED SECTION ---
      setItems(updatedItems);
      setShowModal(false);
    }
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
  // --- Move this ABOVE handleSubmit ---
  // ✅ Total price is sum of prices only (no multiplication with quantity)
  const totalPrice = items.reduce(
    (sum, i) => sum + (parseFloat(i.price) || 0),
    0
  );
  const gstAmount = parseFloat(gst) || 0;

  // -------------------------------------

  // Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (managementStatus === "forwarded") {
      Swal.fire(
        "Access Denied",
        "Cannot edit quotation. Status is forwarded.",
        "error"
      );
      return;
    }

    setSubmitting(true); // Start loading

    const payload = {
      quotation_by: quotedBy,
      date,
      // ✅ Use the same totalPrice (sum of prices only) for payload
      total_price: totalPrice,
      gst: gstAmount,

      products: items.map((i) => ({
        qp_id: i.qp_id || null,
        product_name: i.product_name,
        cas_no: i.cas_no,
        product_code: i.hsn_no,
        quantity: i.qty,
        quantity_unit: i.quantity_unit || "",
        price: i.price,
        lead_time: i.lead_time,
        company_name: i.company_name,
      })),
      remark: remarks,
      company_name: companyName,
      company_email_id: companyEmail,
    };

    try {
      await axiosInstance.put(`/api/quotations/${quotation_number}`, payload);
      Swal.fire("Success", "Quotation updated successfully!", "success");
      navigate("/dashboard/QuotationManagement");
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Something went wrong updating quotation", "error");
    } finally {
      setSubmitting(false); // Stop loading
    }
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div className="page-wrapper">
      <div className="content">
        <h2>Edit Quotation</h2>

        {managementStatus === "forwarded" && existingQuotation ? (
          <div className="card p-4 shadow-sm mt-3">
            <h4>Quotation Already Generated (View Only)</h4>
            <p>
              <strong>Quotation No:</strong>{" "}
              {existingQuotation.quotation_number} <br />
              <strong>Inquiry No:</strong> {formatInquiryNumberForDisplay(existingQuotation.inquiry_number, existingQuotation.date)}{" "}
              <br />
              <strong>Date:</strong> {existingQuotation.date} <br />
              <strong>Quoted By:</strong> {existingQuotation.quotation_by}
              <br />
              <strong>Company_Name:</strong>
              {existingQuotation.company_name} <br />
              <strong>Company_Email:</strong>
              {existingQuotation.company_email_id} <br />
            </p>
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
                    <td>{p.product_name}</td>
                    <td>{p.cas_number}</td>
                    <td>{p.hsn_number || "-"}</td>
                    <td>{`${p.quantity}${p.quantity_unit ? ` (${p.quantity_unit})` : ""
                      }`}</td>
                    <td>₹{p.price}</td>
                    <td>{p.lead_time}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mb-3">
              <strong>Total Price: ₹{totalPrice.toFixed(2)}</strong> <br />
              {/* ✅ Recalculate GST as 18% of the currently displayed total price */}
              <strong>
                GST (18%): ₹{(totalPrice * 0.18).toFixed(2)}
              </strong>{" "}
              <br />
              <strong>
                Grand Total: ₹{(totalPrice + totalPrice * 0.18).toFixed(2)}
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
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="row mb-3">
              <div className="col-md-2">
                <label>Date:</label>
                <input
                  type="date"
                  className="form-control"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
              <div className="col-md-2">
                <label>Inquiry No. :</label>
                <input
                  type="text"
                  className="form-control"
                  value={formatInquiryNumberForDisplay(inquiryNo, date)}
                  readOnly
                />
              </div>
              <div className="col-md-2">
                <label>Quotation No:</label>
                <input
                  type="text"
                  className="form-control"
                  value={quotationNo}
                  readOnly
                />
              </div>
              <div className="col-md-2">
                <label>Quoted By:</label>
                <input
                  type="text"
                  className="form-control"
                  value={quotedBy}
                  readOnly
                />
              </div>
              <div className="col-md-3">
                <label>Company Name:</label>
                <input
                  type="text"
                  className="form-control"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
              </div>
              <div className="col-md-3">
                <label>Company Email:</label>
                <input
                  type="email"
                  className="form-control"
                  value={companyEmail}
                  onChange={(e) => setCompanyEmail(e.target.value)}
                />
              </div>
            </div>

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
                  {/* <th>Unit</th> */}
                  <th>Reference Price</th>
                  <th>Price</th>
                  <th style={{ width: "9%" }}>Lead Time</th>

                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={idx}>
                    <td>{idx + 1}</td>
                    <td>{item.product_name}</td>
                    <td>{item.cas_no}</td>
                    <td>{item.hsn_no}</td>
                    <td>{`${item.qty}${item.quantity_unit ? ` (${item.quantity_unit})` : ""
                      }`}</td>
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
                        style={{ width: "90px" }}
                        value={item.price}
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

            <div className="mb-3">
              <strong>Total Price: ₹{totalPrice.toFixed(2)}</strong> <br />
              <label className="me-2">GST Amount (₹):</label>
              <input
                type="number"
                className="form-control form-control-sm d-inline-block w-auto"
                style={{ maxWidth: "120px" }} // Optional: control width
                value={gst}
                onChange={(e) => setGst(e.target.value)}
              />
              <br />
              {/* <strong>GST: ₹{(parseFloat(gst) || 0).toFixed(2)}</strong> <br /> */}
              <strong>
                Grand Total: ₹{(totalPrice + (parseFloat(gst) || 0)).toFixed(2)}
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

            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Processing...
                </>
              ) : (
                "Finalise Quotation"
              )}
            </button>
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
      </div>
    </div>
  );
};

export default EditQuotation;
