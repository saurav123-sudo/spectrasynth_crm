import React, { useState } from "react";
import { Link } from "react-router-dom";

const Create_purchase_orders = ({ quotations }) => {
  const [poNo, setPoNo] = useState("");
  const [date, setDate] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [quotationId, setQuotationId] = useState("");
  const [reminderDate, setReminderDate] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = {
      po_no: poNo,
      date,
      company_name: companyName,
      quotation_id: quotationId,
      reminder_date: reminderDate,
    };
    console.log("Form Data Submitted:", formData);
    // TODO: Implement actual form submission logic here
  };

  return (
    <div class="page-wrapper">
      <div class="content">
        <div class="row">
          <div class="col-md-12">
            <div class="page-header">
              <div class="row align-items-center ">
                <div className="container mt-4">
                  <h2>Add Purchase Order</h2>
                  <form onSubmit={handleSubmit}>
                    <div className="mb-3">
                      <label htmlFor="poNo" className="form-label">
                        PO No
                      </label>
                      <input
                        type="text"
                        id="poNo"
                        name="po_no"
                        className="form-control"
                        value={poNo}
                        onChange={(e) => setPoNo(e.target.value)}
                        required
                      />
                    </div>
                    <div className="mb-3">
                      <label htmlFor="date" className="form-label">
                        Date
                      </label>
                      <input
                        type="date"
                        id="date"
                        name="date"
                        className="form-control"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        required
                      />
                    </div>
                    <div className="mb-3">
                      <label htmlFor="companyName" className="form-label">
                        Company Name
                      </label>
                      <input
                        type="text"
                        id="companyName"
                        name="company_name"
                        className="form-control"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="mb-3">
                      <label htmlFor="quotationId" className="form-label">
                        Quotation
                      </label>
                      <select
                        id="quotationId"
                        name="quotation_id"
                        className="form-control"
                        value={quotationId}
                        onChange={(e) => setQuotationId(e.target.value)}
                        required
                      >
                        <option value="">Select Quotation</option>
                        {quotations &&
                          quotations.map((quotation) => (
                            <option key={quotation.id} value={quotation.id}>
                              {quotation.quotation_no}
                            </option>
                          ))}
                      </select>
                    </div>
                    <div className="mb-3">
                      <label htmlFor="reminderDate" className="form-label">
                        Reminder Date
                      </label>
                      <input
                        type="datetime-local"
                        id="reminderDate"
                        name="reminder_date"
                        className="form-control"
                        value={reminderDate}
                        onChange={(e) => setReminderDate(e.target.value)}
                      />
                    </div>
                    <button type="submit" className="btn btn-primary me-2">
                      Add Purchase Order
                    </button>
                    <Link
                      to="/Index_purchase_orders"
                      className="btn btn-secondary"
                    >
                      Back
                    </Link>
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

export default Create_purchase_orders;
