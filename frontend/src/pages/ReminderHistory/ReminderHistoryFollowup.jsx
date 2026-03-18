import React, { useState, useEffect, useMemo } from "react";
import Swal from "sweetalert2";
import axiosInstance from "../../apis/axiosConfig";
import Pagination from "../../components/Common/Pagination";
import PageHeader from "../../components/Common/PageHeader";
import PageFilters from "../../components/Common/PageFilters";

const ReminderHistoryFollowup = () => {
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({
    key: "next_reminder_date",
    direction: "descending",
  });

  const fetchReminders = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axiosInstance.get(
        "/api/quotations/reminders/followup",
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log(response);
      setReminders(response.data.data || []);
      setCurrentPage(1);
    } catch (error) {
      console.error(error);
      Swal.fire("Error", "Failed to fetch follow-up history", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReminders();
  }, []);

  // 🔹 Search + sort (NO filtering here)
  const processedReminders = useMemo(() => {
    let data = [...reminders];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      data = data.filter(
        (r) =>
          r.quotation_number?.toLowerCase().includes(term) ||
          r.customer_name?.toLowerCase().includes(term)
      );
    }

    data.sort((a, b) => {
      const aVal = new Date(a[sortConfig.key]);
      const bVal = new Date(b[sortConfig.key]);
      return sortConfig.direction === "ascending" ? aVal - bVal : bVal - aVal;
    });

    return data;
  }, [reminders, searchTerm, sortConfig]);

  // 🔹 Pagination
  const paginatedReminders = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return processedReminders.slice(startIndex, startIndex + itemsPerPage);
  }, [processedReminders, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(processedReminders.length / itemsPerPage);

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleSort = (key) => {
    let direction = "ascending";
    if (sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending";
    }
    setSortConfig({ key, direction });
    setCurrentPage(1);
  };

  return (
    <div className="main-wrapper">
      <div className="page-wrapper">
        <div className="content">
          <PageHeader
            title="Reminder Follow-up History"
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
              showExport={false}
              showSort={true}
              showAddButton={false}
              showViewToggle={false}
              showHorizontalScrollButtons={false}
            />

            <div className="card-body">
              {loading ? (
                <div className="text-center mt-4">
                  <span className="spinner-border spinner-border-sm me-2" />
                  Loading reminders...
                </div>
              ) : (
                <>
                  <div style={{ overflowX: "auto" }}>
                    <table className="table table-striped table-bordered">
                      <thead className="table-light">
                        <tr>
                          <th>Sr. No</th>
                          <th>Quotation Number</th>
                          <th>Customer Name</th>
                          <th>Reminder Date</th>
                          <th>Remark</th>
                          <th>Follow-up Status</th>
                        </tr>
                      </thead>

                      <tbody>
                        {paginatedReminders.length === 0 ? (
                          <tr>
                            <td colSpan="5" className="text-center text-muted">
                              No follow-up history found.
                            </td>
                          </tr>
                        ) : (
                          paginatedReminders.map((r, index) => (
                            <tr key={r.quotation_number}>
                              <td>
                                {(currentPage - 1) * itemsPerPage + index + 1}
                              </td>
                              <td>{r.quotation_number}</td>
                              <td>{r.customer_name}</td>
                              <td>
                                {r.next_reminder_date
                                  ? new Date(
                                      r.next_reminder_date
                                    ).toLocaleDateString("en-IN")
                                  : "-"}
                              </td>
                              <td>{r.remark || "-"}</td>
                              <td className="text-center">
                                <span className="badge bg-success">
                                  Follow-up Taken
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {totalPages > 1 && (
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={setCurrentPage}
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

export default ReminderHistoryFollowup;
