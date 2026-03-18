import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axiosInstance from "../../apis/axiosConfig";
const QuotationManagement = ({
  canAdd = true,
  canEdit = true,
  canDelete = true,
}) => {
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reminderDaysInput, setReminderDaysInput] = useState({}); // store input for each quotation

  // Fetch quotations
  const fetchQuotations = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axiosInstance.get(
        "/api/quotations/fetch/Processed",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setQuotations(response.data.data || []);
    } catch (error) {
      console.error("Error fetching quotations:", error);
    } finally {
      setLoading(false);
    }
  };

  // Set reminder
  const handleSetReminder = async (quotation_number) => {
    const days = reminderDaysInput[quotation_number];
    if (!days || days <= 0)
      return alert("Please enter a valid number of days.");

    try {
      const token = localStorage.getItem("token");
      const response = await axiosInstance.put(
        `/api/quotations/${quotation_number}/reminder`,
        { reminder_days: days },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert(response.data.message);
      fetchQuotations(); // refresh data
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || "Failed to set reminder");
    }
  };

  useEffect(() => {
    fetchQuotations();
  }, []);
  useEffect(() => {
    const fetchReminders = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axiosInstance.get("/api/quotations/reminders", {
          headers: { Authorization: `Bearer ${token}` },
        });

        const reminders = response.data.data || [];

        const today = new Date().toISOString().split("T")[0];

        // Filter only reminders for TODAY
        const todayReminders = reminders.filter((r) => {
          const reminderDate = r.next_reminder_date
            ? new Date(r.next_reminder_date).toISOString().split("T")[0]
            : null;

          return reminderDate === today; // 🔥 Only today's date
        });

        if (todayReminders.length > 0) {
          const reminderText = todayReminders
            .map(
              (r) =>
                `Quotation ${r.quotation_number} – Reminder Date: ${
                  new Date(r.next_reminder_date).toISOString().split("T")[0]
                }`
            )
            .join("\n");

          alert(reminderText); // 🔥 Alert ONLY when reminder is TODAY
        }
      } catch (error) {
        console.error("Error fetching reminders:", error);
      }
    };

    // Run immediately on page load
    fetchReminders();

    // Optional: auto-check every hour
    const interval = setInterval(fetchReminders, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <p>Loading quotations...</p>;

  return (
    <div className="page-wrapper">
      <div className="content">
        <h5 className="mb-3">Quotation Management</h5>
        {/* {canAdd && (
          <Link to="/CreateQuotation" className="btn btn-primary mb-3">
            Add Quotation
          </Link>
        )} */}

        <div className="table-responsive">
          <table className="table table-striped table-bordered">
            <thead>
              <tr>
                <th>Quotation No</th>
                <th>Date</th>
                <th>Created By</th>
                <th>Status</th>
                {/* <th>Email Sent At</th> */}
                <th>Reminder</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {quotations.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center">
                    No quotations found.
                  </td>
                </tr>
              ) : (
                quotations.map((q) => {
                  const today = new Date().toISOString().split("T")[0];
                  const reminderDate = q.next_reminder_date
                    ? new Date(q.next_reminder_date).toISOString().split("T")[0]
                    : null;

                  const isReminderDue =
                    q.reminder_active && reminderDate && reminderDate <= today;

                  return (
                    <tr
                      key={q.quotation_number}
                      style={{
                        backgroundColor: isReminderDue
                          ? "#fff3cd"
                          : "transparent", // highlight yellow
                      }}
                    >
                      <td>{q.quotation_number}</td>
                      <td>
                        {q.date ? new Date(q.date).toLocaleDateString() : "N/A"}
                      </td>
                      <td>{q.quotation_by || "N/A"}</td>
                      <td>{q.quotation_status || "N/A"}</td>
                      {/* <td>
                        {q.email_sent_date
                          ? new Date(q.email_sent_date).toLocaleDateString()
                          : "-"}
                      </td> */}

                      {/* Reminder  Section */}
                      <td>
                        {q.quotation_status !== "generate_po" ? (
                          <div className="d-flex flex-column">
                            {q.reminder_active ? (
                              <>
                                <div className="d-flex justify-content-between align-items-center">
                                  <span
                                    className="badge bg-warning text-dark"
                                    style={{ fontSize: "0.8rem" }}
                                  >
                                    Reminder Active
                                  </span>
                                  <button
                                    className="btn btn-sm btn-outline-danger ms-2"
                                    onClick={async () => {
                                      if (
                                        window.confirm(
                                          "Deactivate reminder for this quotation?"
                                        )
                                      ) {
                                        try {
                                          const token =
                                            localStorage.getItem("token");
                                          const res = await axios.put(
                                            `/api/quotations/deactivate_reminder/${q.quotation_number}`,
                                            {},
                                            {
                                              headers: {
                                                Authorization: `Bearer ${token}`,
                                              },
                                            }
                                          );
                                          alert(res.data.message);
                                          fetchQuotations();
                                        } catch (err) {
                                          alert(
                                            "Failed to deactivate reminder"
                                          );
                                        }
                                      }
                                    }}
                                  >
                                    Deactivate
                                  </button>
                                </div>

                                <small className="text-muted mt-1">
                                  Next:{" "}
                                  {new Date(
                                    q.next_reminder_date
                                  ).toLocaleDateString()}
                                </small>
                              </>
                            ) : (
                              <div className="d-flex align-items-center gap-2">
                                <input
                                  type="number"
                                  min="1"
                                  className="form-control form-control-sm"
                                  style={{ width: "70px" }}
                                  placeholder="Days"
                                  value={
                                    reminderDaysInput[q.quotation_number] ||
                                    q.reminder_days ||
                                    ""
                                  }
                                  onChange={(e) =>
                                    setReminderDaysInput((prev) => ({
                                      ...prev,
                                      [q.quotation_number]: e.target.value,
                                    }))
                                  }
                                />
                                <button
                                  className="btn btn-sm btn-success"
                                  onClick={() =>
                                    handleSetReminder(q.quotation_number)
                                  }
                                >
                                  Set
                                </button>
                              </div>
                            )}
                          </div>
                        ) : (
                          "N/A"
                        )}
                      </td>

                      {/* Actions */}
                      <td>
                        {canEdit && (
                          <Link
                            to={`Revice_Quotation/${q.quotation_number}`}
                            className="btn btn-warning btn-sm me-1"
                          >
                            Revise
                          </Link>
                        )}
                        <Link
                          to={`Revice_history/${q.quotation_number}`}
                          className="btn btn-info btn-sm me-1"
                        >
                          Revised History
                        </Link>
                        {/* <button
                          className="btn btn-success btn-sm me-1"
                          onClick={() => alert("Send Email logic here")}
                        >
                          Send Email
                        </button>
                        <Link
                          to={`GeneratePurchase/${q.quotation_number}`}
                          className="btn btn-primary btn-sm"
                        >
                          Generate Po
                        </Link> */}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default QuotationManagement;
