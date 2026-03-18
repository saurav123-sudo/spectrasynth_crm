import React, { useState, useEffect, useMemo } from "react";
import Swal from "sweetalert2";
import axiosInstance from "../../apis/axiosConfig";
import Pagination from "../../components/Common/Pagination";
import PageHeader from "../../components/Common/PageHeader";
import PageFilters from "../../components/Common/PageFilters";

const ReminderHistoryList = () => {
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [remarks, setRemarks] = useState({});
  const [sortConfig, setSortConfig] = useState({
    key: "reminder_date",
    direction: "descending",
  });

  const fetchReminders = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axiosInstance.get("/api/quotations/reminders", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setReminders(response.data.data || []);
      setCurrentPage(1);
    } catch (error) {
      console.error("Error fetching reminders:", error);
      Swal.fire({
        icon: "error",
        title: "Fetch Error",
        text: error.response?.data?.message || "Failed to fetch reminders.",
      });
    } finally {
      setLoading(false);
    }
  };

  const processedReminders = useMemo(() => {
    let rems = [...reminders];
    const lowerSearchTerm = searchTerm.toLowerCase();
    if (lowerSearchTerm) {
      rems = rems.filter(
        (reminder) =>
          reminder.quotation_number?.toLowerCase().includes(lowerSearchTerm) ||
          reminder.reminder_date?.toLowerCase().includes(lowerSearchTerm),
      );
    }
    if (sortConfig.key) {
      rems.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];
        if (sortConfig.key === "reminder_date") {
          aValue = new Date(aValue);
          bValue = new Date(bValue);
        }
        if (aValue < bValue)
          return sortConfig.direction === "ascending" ? -1 : 1;
        if (aValue > bValue)
          return sortConfig.direction === "ascending" ? 1 : -1;
        return 0;
      });
    }
    return rems;
  }, [reminders, searchTerm, sortConfig]);

  const paginatedReminders = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return processedReminders.slice(startIndex, startIndex + itemsPerPage);
  }, [processedReminders, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(processedReminders.length / itemsPerPage);

  const handlePageChange = (pageNumber) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) setCurrentPage(pageNumber);
  };

  const handleSort = (key) => {
    let direction = "ascending";
    if (sortConfig.key === key && sortConfig.direction === "ascending")
      direction = "descending";
    else if (sortConfig.key === key && sortConfig.direction === "descending")
      direction = "ascending";
    setSortConfig({ key, direction });
    setCurrentPage(1);
  };

  const handleSearch = (event) => {
    setSearchTerm(event.target.value);
    setCurrentPage(1);
  };

  // ✅ Done → deactivate API
  const handleDone = async (quotationNumber) => {
    const result = await Swal.fire({
      title: "Mark as Done?",
      text: "This will mark the reminder as completed.",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Yes, mark as done",
      confirmButtonColor: "#28a745",
      cancelButtonColor: "#6c757d",
    });

    if (result.isConfirmed) {
      try {
        const token = localStorage.getItem("token");
        await axiosInstance.put(
          `/api/quotations/deactivate_reminder/${quotationNumber}`,
          {
            remark: remarks[quotationNumber] || "",
          },
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        console.log(remarks);

        setRemarks((prev) => {
          const updated = { ...prev };
          delete updated[quotationNumber];
          return updated;
        });
        console.log(`Updated remarks: ${JSON.stringify(remarks)}`);
        Swal.fire("Success", "Reminder marked as done!", "success");
        fetchReminders();
      } catch (error) {
        console.error("Error marking reminder as done:", error);
        Swal.fire(
          "Error",
          error.response?.data?.message || "Failed to mark reminder as done",
          "error",
        );
      }
    }
  };

  // ✅ Reset → set API
  const handleReset = async (quotationNumber) => {
    const { value: days } = await Swal.fire({
      title: "Reset Reminder",
      input: "number",
      inputLabel: "Enter number of days for reminder",
      inputPlaceholder: "e.g. 3",
      inputAttributes: { min: 1 },
      showCancelButton: true,
    });

    if (!days) return;

    try {
      const token = localStorage.getItem("token");
      await axiosInstance.put(
        `/api/quotations/${quotationNumber}/reminder`,
        { reminder_days: days },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      Swal.fire("Success", "Reminder reset successfully!", "success");
      fetchReminders();
    } catch (error) {
      console.error("Error resetting reminder:", error);
      Swal.fire(
        "Error",
        error.response?.data?.message || "Failed to reset reminder",
        "error",
      );
    }
  };

  useEffect(() => {
    fetchReminders();
  }, []);

  return (
    <div className="main-wrapper">
      <div className="page-wrapper">
        <div className="content">
          <PageHeader
            title="Reminder History"
            onRefresh={fetchReminders}
            onCollapse={() => {}}
          />
          <div className="card">
            <PageFilters
              searchTerm={searchTerm}
              onSearchChange={handleSearch}
              onSort={handleSort}
              sortConfig={sortConfig}
              view="list"
              onViewChange={() => {}}
              showExport={false}
              showSort={true}
              showAddButton={false}
              showViewToggle={false}
              showHorizontalScrollButtons={false}
            />
            <div className="card-body">
              {loading ? (
                <div className="text-center mt-4">
                  <span className="spinner-border spinner-border-sm me-2"></span>{" "}
                  Loading reminders...
                </div>
              ) : (
                <>
                  <div style={{ overflowX: "auto" }}>
                    <table className="table table-striped table-bordered">
                      <thead>
                        <tr className="table-light">
                          <th>Sr. No</th>
                          <th>Quotation Number</th>
                          <th>Customer Name</th> {/* ✅ new column */}
                          <th>Reminder Date</th>
                          <th>Remark</th>
                          <th>Action</th>
                        </tr>
                      </thead>

                      <tbody>
                        {paginatedReminders.length === 0 ? (
                          <tr>
                            <td
                              colSpan="4"
                              className="text-center p-4 text-muted"
                            >
                              {processedReminders.length > 0
                                ? "No reminders found for this page."
                                : "No reminders found."}
                            </td>
                          </tr>
                        ) : (
                          paginatedReminders.map((reminder, index) => (
                            <tr key={reminder.id}>
                              <td>
                                {(currentPage - 1) * itemsPerPage + index + 1}
                              </td>
                              <td>{reminder.quotation_number}</td>
                              <td>{reminder.customer_name}</td>{" "}
                              {/* ✅ new column */}
                              <td>
                                {new Date(
                                  reminder.next_reminder_date,
                                ).toLocaleDateString("en-IN")}
                              </td>
                              <td>
                                <textarea
                                  className="form-control form-control-sm"
                                  placeholder="Add remark..."
                                  style={{ height: "50px" }}
                                  value={
                                    remarks[reminder.quotation_number] || ""
                                  }
                                  onChange={(e) =>
                                    setRemarks({
                                      ...remarks,
                                      [reminder.quotation_number]:
                                        e.target.value,
                                    })
                                  }
                                />
                              </td>
                              <td>
                                <div className="d-flex gap-1">
                                  <button
                                    className="btn btn-success btn-sm"
                                    onClick={() =>
                                      handleDone(reminder.quotation_number)
                                    }
                                  >
                                    Done
                                  </button>
                                  <button
                                    className="btn btn-warning btn-sm"
                                    onClick={() =>
                                      handleReset(reminder.quotation_number)
                                    }
                                  >
                                    Reset Reminder
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                  {!loading && totalPages > 0 && (
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={handlePageChange}
                      itemsPerPage={itemsPerPage}
                      totalItems={processedReminders.length}
                    />
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReminderHistoryList;
