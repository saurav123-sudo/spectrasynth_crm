import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { useParams, useNavigate } from "react-router-dom";
import axiosInstance from "../../apis/axiosConfig";
import { STANDARD_TERMS_AND_CONDITIONS } from "../../constants/termsAndConditions";

const initialItem = {
  product_name: "",
  cas_no: "",
  hsn_no: "",
  qty: "",
  price: "",
  lead_time: "",
  company_name: "",
};

const CreateQuotation = () => {
  const navigate = useNavigate();
  const { inquiry_number } = useParams();

  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [quotationNo, setQuotationNo] = useState("");
  const [quotedBy, setQuotedBy] = useState("Spectrasynth Pharmachem");
  const [items, setItems] = useState([]);
  const [remarks, setRemarks] = useState("");
  const [technicalStatus, setTechnicalStatus] = useState("pending");

  // Modal state for companies
  const [showModal, setShowModal] = useState(false);
  const [modalCompanies, setModalCompanies] = useState([]);
  const [modalIndex, setModalIndex] = useState(null);

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

    const fetchInquiryProducts = async () => {
      try {
        const res = await axiosInstance.get(`/api/inquiries/${inquiry_number}`);
        const data = res.data;

        setTechnicalStatus(data.technical_status || "pending");

        if (data.inquiries) {
          const productsFromInquiry = data.inquiries.map((p) => ({
            product_name: p.ProductName,
            cas_no: p.cas_number,
            hsn_no: p.product_code || "",
            qty: p.quantity_required,
            price: "",
            lead_time: "",
            company_name: "",
          }));
          setItems(productsFromInquiry);
        }
      } catch (err) {
        console.error("Error fetching inquiry products:", err);
        Swal.fire(
          "Error",
          err.response?.data?.message || "Failed to fetch inquiry products",
          "error"
        );
      }
    };

    const fetchQuotationNumber = async () => {
      try {
        const res = await axiosInstance.get(
          "/api/quotations/lastQuotationNumber"
        );
        const data = res.data;

        const now = new Date();
        const yearYY = now.getFullYear().toString().slice(-2);
        const monthMM = String(now.getMonth() + 1).padStart(2, "0");
        const currentDatePart = `${yearYY}${monthMM}`;
        let nextSequentialNumber = 1;

        if (data.lastQuotationNumber) {
          const parts = data.lastQuotationNumber.split("-");
          if (parts.length === 4) {
            const lastDatePart = parts[2];
            const lastSequentialPart = parseInt(parts[3], 10);
            if (lastDatePart === currentDatePart) {
              nextSequentialNumber = lastSequentialPart + 1;
            }
          }
        }

        const newSequentialPart = String(nextSequentialNumber).padStart(3, "0");
        setQuotationNo(`SS-Q-${currentDatePart}-${newSequentialPart}`);
      } catch (err) {
        console.error(err);
        const now = new Date();
        const yearYY = now.getFullYear().toString().slice(-2);
        const monthMM = String(now.getMonth() + 1).padStart(2, "0");
        const currentDatePart = `${yearYY}${monthMM}`;
        setQuotationNo(`SS-Q-${currentDatePart}-001`);
      }
    };

    fetchLeadTimes();
    fetchInquiryProducts();
    fetchQuotationNumber();
  }, [inquiry_number]);

  const openCompanyModal = async (index) => {
    const productName = items[index].product_name;
    if (!productName) return;

    setModalIndex(index);
    setShowModal(true);
    setModalCompanies([]);

    try {
      const casNo = items[index].cas_no || "";
      const params = casNo ? `?cas_no=${encodeURIComponent(casNo)}` : "";
      const res = await axiosInstance.get(`/api/product_prices/${encodeURIComponent(productName)}${params}`);
      setModalCompanies(res.data.product?.prices || []);
    } catch (err) {
      console.error(err);
      setModalCompanies([]);
    }
  };

  const handleInputChange = (index, field, value) => {
    setItems((prev) => {
      const newItems = [...prev];
      newItems[index][field] = value;
      return newItems;
    });
  };

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

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (technicalStatus === "forwarded") {
      Swal.fire(
        "Access Denied",
        "Cannot create quotation. Technical status already forwarded.",
        "error"
      );
      return;
    }

    const productsToSend = items
      .filter((i) => i.product_name && i.price)
      .map((i) => ({
        product_name: i.product_name,
        cas_no: i.cas_no,
        hsn_no: i.hsn_no,
        quantity: i.qty,
        price: i.price,
        lead_time: i.lead_time,
        quantity_unit: i.quantity_unit,
      }));

    if (!productsToSend.length) {
      Swal.fire(
        "Warning",
        "Please enter price for at least one product",
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
      navigate("/technical");
    } catch (err) {
      console.error(err);
      Swal.fire(
        "Error",
        err.response?.data?.message ||
        "Something went wrong creating quotation",
        "error"
      );
    }
  };

  // ✅ Total price is sum of prices only (no multiplication with quantity)
  const totalPrice = items.reduce(
    (sum, i) => sum + (parseFloat(i.price) || 0),
    0
  );
  const gstAmount = totalPrice * 0.18;

  return (
    <div className="page-wrapper">
      <div className="content">
        <h2>Create Quotation</h2>

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
                onChange={(e) => setQuotedBy(e.target.value)}
                required
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
                <th>Other Company price</th>
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
                  <td>{item.qty}</td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-outline-primary"
                      onClick={() => openCompanyModal(idx)}
                    >
                      {item.company_name || "View Companies"}
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

          {technicalStatus === "pending" ? (
            <form onSubmit={handleSubmit}>
              {/* All your form fields and table */}
              <button type="submit" className="btn btn-primary">
                Submit Quotation
              </button>
            </form>
          ) : (
            <p className="text-danger">
              Cannot create quotation. Quotation is already created".
            </p>
          )}
        </form>

        {/* Modal for Companies */}
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
                    <ul className="list-group">
                      {modalCompanies.map((c, i) => (
                        <li
                          key={i}
                          className="list-group-item d-flex justify-content-between"
                        >
                          <span>{c.company}</span>
                          <span>{c.currency === 'USD' ? '$' : '₹'}{c.price}</span>
                        </li>
                      ))}
                    </ul>
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

export default CreateQuotation;
