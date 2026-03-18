import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { useParams, useNavigate } from "react-router-dom";
import axiosInstance from "../../apis/axiosConfig";

const EditPurchaseOrder = () => {
  const navigate = useNavigate();
  const { quotation_number } = useParams();

  const [poNumber, setPoNumber] = useState("");
  const [poDate, setPoDate] = useState(new Date().toISOString().split("T")[0]);
  const [companyName, setCompanyName] = useState("");
  const [quotation, setQuotation] = useState(null);
  const [totalAmount, setTotalAmount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Utility to handle numeric parsing safely
  const parseNumber = (val) => parseFloat(val) || 0;

  // Fetch quotation data using axiosConfig for consistent headers/baseURL
  useEffect(() => {
    const fetchQuotation = async () => {
      try {
        const res = await axiosInstance.get(
          `/api/quotations/byNumber/${quotation_number}`
        );
        const data = res.data;

        setQuotation(data.data);
        setTotalAmount(
          parseNumber(data.data.total_price) + parseNumber(data.data.gst)
        );
      } catch (err) {
        console.error("Error fetching quotation:", err);
        Swal.fire("Error", "Failed to fetch quotation", "error");
      } finally {
        setLoading(false);
      }
    };

    fetchQuotation();
  }, [quotation_number]);

  // ✅ Handle PO creation
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!poNumber || !poDate || !companyName) {
      return Swal.fire("Warning", "Please fill all required fields", "warning");
    }

    const payload = {
      po_number: poNumber,
      quotation_number,
      po_date: poDate,
      total_amount: totalAmount,
      company_name: companyName,
    };

    try {
      const res = await axiosInstance.post(`/api/purchaseOrder`, payload);

      Swal.fire("Success", "Purchase Order created successfully!", "success");
      navigate("/dashboard/QuotationManagement");
    } catch (err) {
      console.error("Error creating PO:", err);
      const message =
        err.response?.data?.message || "Server error while creating PO";
      Swal.fire("Error", message, "error");
    }
  };

  if (loading) return <p>Loading...</p>;
  if (!quotation) return <p>No quotation data found.</p>;

  const isPOGenerated = quotation.quotation_status === "generate_po";

  return (
    <div className="page-wrapper">
      <div className="content">
        <h2>Create Purchase Order</h2>

        {/* PO Input Fields */}
        <div className="row mb-3">
          <div className="col-md-4">
            <label>PO Number:</label>
            {isPOGenerated ? (
              <input
                type="text"
                className="form-control"
                value={quotation.po_number || "-"}
                readOnly
              />
            ) : (
              <input
                type="text"
                className="form-control"
                value={poNumber}
                onChange={(e) => setPoNumber(e.target.value)}
                required
              />
            )}
          </div>
          <div className="col-md-4">
            <label>PO Date:</label>
            {isPOGenerated ? (
              <input
                type="date"
                className="form-control"
                value={quotation.po_date || "-"}
                readOnly
              />
            ) : (
              <input
                type="date"
                className="form-control"
                value={poDate}
                onChange={(e) => setPoDate(e.target.value)}
                required
              />
            )}
          </div>
          <div className="col-md-4">
            <label>Customer Name:</label>
            {isPOGenerated ? (
              <input
                type="text"
                className="form-control"
                value={quotation.customer_name || "-"}
                readOnly
              />
            ) : (
              <input
                type="text"
                className="form-control"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
              />
            )}
          </div>
        </div>

        {/* Quotation Details (View Only) */}
        <div className="card p-4 shadow-sm mb-4">
          <h4>Quotation Details (View Only)</h4>
          <p>
            <strong>Quotation No:</strong> {quotation.quotation_number} <br />
            <strong>Date:</strong> {quotation.date} <br />
            <strong>Quoted By:</strong> {quotation.quotation_by}
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
                <th>Company</th>
              </tr>
            </thead>
            <tbody>
              {quotation.products.map((p, i) => (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td>{p.product_name}</td>
                  <td>{p.cas_number}</td>
                  <td>{p.hsn_number || "-"}</td>
                  <td>{p.quantity}</td>
                  <td>₹{p.price}</td>
                  <td>{p.lead_time}</td>
                  <td>{p.company_name || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mb-3">
            <strong>Total Price:</strong> ₹
            {parseNumber(quotation.total_price).toFixed(2)} <br />
            <strong>GST (18%):</strong> ₹{parseNumber(quotation.gst).toFixed(2)}{" "}
            <br />
            <strong>Grand Total:</strong> ₹
            {(
              parseNumber(quotation.total_price) + parseNumber(quotation.gst)
            ).toFixed(2)}
          </div>

          <p>
            <strong>Remarks:</strong> {quotation.remark || "-"}
          </p>
        </div>

        {/* Generate Button at the Bottom */}
        {!isPOGenerated && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSubmit}
          >
            Generate Purchase Order
          </button>
        )}
      </div>
    </div>
  );
};

export default EditPurchaseOrder;
