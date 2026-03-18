import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { useParams, useNavigate } from "react-router-dom";
import axiosInstance from "../../apis/axiosConfig";
import { STANDARD_TERMS_AND_CONDITIONS } from "../../constants/termsAndConditions";

const initialItem = {
  id: null,
  product_name: "",
  cas_no: "",
  hsn_no: "",
  qty: "",
  price: "",
  lead_time: "",
  company_name: "",
};

const ReviceQuotation = () => {
  const navigate = useNavigate();
  const { quotation_number } = useParams();

  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [quotationNo, setQuotationNo] = useState(quotation_number || "");
  const [quotedBy, setQuotedBy] = useState("");
  const [items, setItems] = useState([{ ...initialItem }]);
  const [remarks, setRemarks] = useState("");
  const [managementStatus, setManagementStatus] = useState("pending");
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [modalCompanies, setModalCompanies] = useState([]);
  const [modalIndex, setModalIndex] = useState(null);
  const [submitting, setSubmitting] = useState(false); // Loading state for form submission

  // Lead Time Master state
  const [leadTimes, setLeadTimes] = useState([]);

  // Fetch quotation details
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

        const mappedProducts = (q.products || []).map((p) => ({
          id: p.id,
          product_name: p.product_name,
          cas_no: p.cas_number,
          hsn_no: p.hsn_number || "",
          qty: p.quantity,
          price: p.price,
          lead_time: p.lead_time,
          company_name: p.company_name || "",
        }));

        setItems(mappedProducts.length ? mappedProducts : [{ ...initialItem }]);
      } catch (err) {
        console.error("Error fetching quotation:", err);
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
        console.error("Failed to decode token:", err);
      }
    };

    fetchLeadTimes();
    fetchQuotation();
    decodeUserFromToken();
  }, [quotation_number]);

  // ✅ Handle input field updates
  const handleInputChange = (index, field, value) => {
    setItems((prev) => {
      const newItems = [...prev];
      newItems[index][field] = value;
      return newItems;
    });
  };

  // ✅ Fetch company options for a product
  const openCompanyModal = async (index) => {
    const productName = items[index].product_name;
    if (!productName)
      return Swal.fire("Warning", "Product name required!", "warning");

    setModalIndex(index);
    setShowModal(true);
    setModalCompanies([]);

    try {
      const casNo = items[index].cas_no || "";
      const params = casNo ? `?cas_no=${encodeURIComponent(casNo)}` : "";
      const res = await axiosInstance.get(`/api/product_prices/${encodeURIComponent(productName)}${params}`);
      setModalCompanies(res.data.product?.prices || []);
    } catch (err) {
      console.error("Error fetching company prices:", err);
      setModalCompanies([]);
    }
  };

  // ✅ Remove product row
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

  // ✅ Handle quotation revision submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    setSubmitting(true); // Start loading

    const payload = {
      product_id: null, // null = revise all products
      changes: {
        items: items.map((i) => ({
          id: i.id,
          product_name: i.product_name,
          cas_no: i.cas_no,
          hsn_no: i.hsn_no,
          company_name: i.company_name,
          quantity: i.qty,
          price: i.price,
          lead_time: i.lead_time,
        })),
        remark: remarks,
      },
      changed_by: quotedBy,
    };

    try {
      const res = await axiosInstance.post(
        `/api/quotations/revision/history/${quotation_number}`,
        payload
      );

      Swal.fire("Success", "Revision created successfully!", "success");
      navigate("/dashboard/QuotationManagement");
    } catch (err) {
      console.error("Error creating revision:", err);
      const msg = err.response?.data?.message || "Failed to create revision";
      Swal.fire("Error", msg, "error");
    } finally {
      setSubmitting(false); // Stop loading
    }
  };

  // ✅ Total price is sum of prices only (no multiplication with quantity)
  const totalPrice = items.reduce(
    (sum, i) => sum + (parseFloat(i.price) || 0),
    0
  );
  const gstAmount = totalPrice * 0.18;

  if (loading) return <p>Loading...</p>;

  return (
    <div className="page-wrapper">
      <div className="content">
        <h2>Revise Quotation</h2>

        {/* Editable form */}
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

          <table className="table table-bordered">
            <thead>
              <tr>
                <th>Sr No</th>
                <th>Product Name</th>
                <th>CAS No</th>
                <th>HSN No</th>
                <th>Quantity</th>
                <th>Company</th>
                <th>Price</th>
                <th>Lead Time</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={idx}>
                  <td>{idx + 1}</td>
                  <td>{item.product_name}</td>
                  <td>{item.cas_no}</td>
                  <td>{item.hsn_no}</td>
                  <td>
                    <input
                      type="number"
                      className="form-control"
                      value={item.qty}
                      onChange={(e) =>
                        handleInputChange(idx, "qty", e.target.value)
                      }
                    />
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-outline-primary"
                      onClick={() => openCompanyModal(idx)}
                    >
                      {item.company_name || "Other Companies prices"}
                    </button>
                  </td>
                  <td>
                    <input
                      type="number"
                      className="form-control"
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
                  <td>
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => handleRemoveItem(idx)}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mb-3">
            <strong>Total Price: ₹{totalPrice.toFixed(2)}</strong>
            <br />
            <strong>GST (18%): ₹{gstAmount.toFixed(2)}</strong>
            <br />
            <strong>Grand Total: ₹{(totalPrice + gstAmount).toFixed(2)}</strong>
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

        {/* Company Modal */}
        {showModal && (
          <div className="modal show d-block" tabIndex="-1">
            <div className="modal-dialog">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">
                    Referral price for {items[modalIndex]?.product_name}
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setShowModal(false)}
                  />
                </div>
                <div className="modal-body">
                  {modalCompanies.length > 0 ? (
                    /* --- Converted to Table Format --- */
                    <table className="table table-hover">
                      <thead>
                        <tr>
                          <th scope="col">Company</th>
                          <th scope="col">Quantity</th>
                          <th scope="col">Unit</th>
                          <th scope="col">Price</th>
                        </tr>
                      </thead>
                      <tbody>
                        {modalCompanies.map((c, i) => (
                          <tr
                            key={i}
                            // onClick={() => selectCompanyPrice(c)}
                            style={{ cursor: "pointer" }}
                          >
                            <td>{c.company}</td>
                            <td>{c.quantity}</td>
                            <td>{c.unit}</td>
                            <td>{c.currency === 'USD' ? '$' : '₹'}{c.price}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="text-danger text-center">
                      No companies available for this product.
                    </p>
                  )}
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

export default ReviceQuotation;
