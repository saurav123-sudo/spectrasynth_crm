import React, { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import axiosInstance from "../../apis/axiosConfig";

// --- NEW IMPORTS for EXPORT ---
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
// ---------------------------------

// --- IMPORT for PAGINATION ---
import Pagination from "../../components/Common/Pagination"; // Adjusted path
// ---------------------------------

// --- IMPORT for PAGE HEADER ---
import PageHeader from "../../components/Common/PageHeader";
// ---------------------------------

// --- IMPORT for PAGE FILTERS ---
import PageFilters from "../../components/Common/PageFilters";
import { formatInquiryNumberForDisplay } from "../../utils/inquiryNumberUtils";
// ---------------------------------

/**
 * TechnicalList (Dumb Component)
 * Displays inquiries in a table format.
 */
const TechnicalList = ({ inquiries }) => {
  const navigate = useNavigate();

  if (inquiries.length === 0) {
    return (
      <div className="text-center p-4 text-muted">
        No inquiries found for this page.
      </div>
    );
  }

  return (
    <div className="table-responsive custom-table">
      <table className="table table-bordered table-hover">
        <thead>
          <tr className="table-light">
            <th>Inquiry No.</th>
            <th>Employee Name</th>
            <th>Inquiry Date</th>
            <th>Forwarded Date/Time</th>
            <th>Current Stage</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {inquiries.map((inquiry) => (
            
            <tr key={inquiry.inquiry_number}>
              <td>{formatInquiryNumberForDisplay(inquiry.inquiry_number, inquiry.inquiry_date || inquiry.createdAt)}</td>
              <td
                title={inquiry.inquiry_by}
                style={{
                  maxWidth: "200px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {inquiry.inquiry_by}
              </td>
              <td>{inquiry.inquiry_date}</td>
              <td>{inquiry.forwarded_date}</td>{" "}
              {/* Displays the formatted date/time string */}
              <td>{inquiry.current_stage}</td>
              <td>
                {inquiry.technical_status === "pending" ? (
                  <span className="badge bg-warning text-dark">Pending</span>
                ) : (
                  <span className="badge bg-success">Forwarded</span>
                )}
              </td>
              <td>
                <button
                  className="btn btn-info btn-sm"
                  onClick={() =>
                    navigate(
                      `technical_CreateQuotation/${inquiry.inquiry_number}`
                    )
                  }
                >
                  View
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/**
 * TechnicalGrid (Dumb Component)
 * Displays inquiries in a grid format.
 */
const TechnicalGrid = ({ inquiries }) => {
  const navigate = useNavigate();

  if (inquiries.length === 0) {
    return (
      <div className="text-center p-4 text-muted">
        No inquiries found for this page.
      </div>
    );
  }

  return (
    <div className="row">
      {inquiries.map((inquiry) => (
        <div
          key={inquiry.inquiry_number}
          className="col-xl-3 col-lg-4 col-md-6 col-sm-12 mb-4"
        >
          <div className="card h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h6 className="mb-0">#{formatInquiryNumberForDisplay(inquiry.inquiry_number, inquiry.inquiry_date || inquiry.createdAt)}</h6>
                {inquiry.technical_status === "pending" ? (
                  <span className="badge bg-warning text-dark">Pending</span>
                ) : (
                  <span className="badge bg-success">Forwarded</span>
                )}
              </div>

              <p className="mb-1">
                <strong>Employee:</strong> {inquiry.inquiry_by}
              </p>
              <p className="mb-1">
                <strong>Inquiry Date:</strong> {inquiry.inquiry_date}
              </p>
              <p className="mb-1">
                <strong>Forwarded:</strong> {inquiry.forwarded_date}
              </p>
              <p className="mb-3">
                <strong>Stage:</strong> {inquiry.current_stage}
              </p>

              <button
                className="btn btn-info btn-sm w-100"
                onClick={() =>
                  navigate(
                    `technical_CreateQuotation/${inquiry.inquiry_number}`
                  )
                }
              >
                View
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * Technical  (Smart Parent Component)
 * Manages state, fetches data, handles pagination, and calculates count.
 */
const Technical = () => {
  const [view, setView] = useState("list");
  const [allInquiries, setAllInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({
    key: "createdAt",
    direction: "descending",
  });

  useEffect(() => {
    setItemsPerPage(view === "grid" ? 8 : 10);
    setCurrentPage(1);
  }, [view]);

  useEffect(() => {
    const fetchInquiries = async () => {
      setLoading(true);
      try {
        const response = await axiosInstance.get(
          "/api/technical/fetchInquiries",
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );
        const data = response.data;

        const formatted = data.map((item) => {
          const inquiryDate = new Date(item.createdAt);
          const referenceDate = item.inquiry_update_date
            ? new Date(item.inquiry_update_date)
            : inquiryDate;

          // --- CHANGE HERE: Use toLocaleString for date and time ---
          const forwardedDateString =
            referenceDate instanceof Date && !isNaN(referenceDate)
              ? referenceDate.toLocaleString("en-IN", {
                  // Use your preferred locale
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true, // Add time options
                  timeZone: "Asia/Kolkata", // Explicitly set timezone
                })
              : "N/A";
          // --- END CHANGE ---

          return {
            inquiry_number: item.inquiry_number,
            customer_name: item.customer_name || "N/A",
            inquiry_date: inquiryDate.toLocaleDateString("en-IN"),
            forwarded_date: forwardedDateString,
            current_stage: (item.current_stage || "N/A").replace("_", " "),
            technical_status: item.technical_status || "pending",
            inquiry_by: item.inquiry_by,
            product_names: Array.isArray(item.product_names) ? item.product_names : [],
            cas_numbers: Array.isArray(item.cas_numbers) ? item.cas_numbers : [],
          };
        });

        setAllInquiries(formatted);
        setCurrentPage(1);
      } catch (error) {
        console.error("Error fetching inquiries:", error);
        Swal.fire({
          icon: "error",
          title: "Fetch Error",
          text:
            error.response?.data?.message ||
            "Could not fetch technical inquiries.",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchInquiries();
  }, []);

  const pendingCount = useMemo(() => {
    return allInquiries.filter((inq) => inq.technical_status === "pending")
      .length;
  }, [allInquiries]);

  // Memoized processing: Filter -> Sort
  const processedInquiries = useMemo(() => {
    let inquiries = [...allInquiries];
    const lowerSearchTerm = searchTerm.toLowerCase();
    if (lowerSearchTerm) {
      inquiries = inquiries.filter(
        (inq) =>
          inq.inquiry_number?.toLowerCase().includes(lowerSearchTerm) ||
          inq.customer_name?.toLowerCase().includes(lowerSearchTerm) ||
          inq.current_stage?.toLowerCase().includes(lowerSearchTerm) ||
          inq.product_names?.some((name) => name && name.toLowerCase().includes(lowerSearchTerm)) ||
          inq.cas_numbers?.some((cas) => cas && cas.toLowerCase().includes(lowerSearchTerm))
      );
    }
    if (sortConfig.key) {
      inquiries.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];
        if (sortConfig.key === "inquiry_date") {
          aValue = new Date(aValue);
          bValue = new Date(bValue);
        }
        if (sortConfig.key === "createdAt") {
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
    return inquiries;
  }, [allInquiries, searchTerm, sortConfig]);

  const paginatedInquiries = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return processedInquiries.slice(startIndex, startIndex + itemsPerPage);
  }, [processedInquiries, currentPage, itemsPerPage]);

  // Calculate total pages based on *processed* inquiries
  const totalPages = Math.ceil(processedInquiries.length / itemsPerPage);

  const handlePageChange = (pageNumber) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  const handleSearch = (event) => {
    setSearchTerm(event.target.value);
    setCurrentPage(1);
  };

  const handleSort = (key) => {
    let direction = "ascending";
    if (sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending";
    } else if (
      sortConfig.key === key &&
      sortConfig.direction === "descending"
    ) {
      direction = "ascending";
    }
    setSortConfig({ key, direction });
    setCurrentPage(1);
  };

  // Export handlers
  const handleExportExcel = () => {
    const dataToExport = allInquiries.map((inq) => ({
      "Inquiry Number": formatInquiryNumberForDisplay(inq.inquiry_number, inq.inquiry_date || inq.createdAt),
      "Customer Name": inq.customer_name,
      "Inquiry Date": inq.inquiry_date,
      "Forwarded Date": inq.forwarded_date,
      "Current Stage": inq.current_stage.replace("_", " "),
      Status: inq.technical_status === "pending" ? "Pending" : "Forwarded",
    }));
    if (dataToExport.length === 0) {
      Swal.fire("Info", "No data available to export.", "info");
      return;
    }
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Technical_Inquiries");
    XLSX.writeFile(wb, "Technical_Inquiries_Report.xlsx");
  };

  const handleExportPdf = () => {
    const dataToExport = allInquiries;
    if (dataToExport.length === 0) {
      Swal.fire("Info", "No data available to export.", "info");
      return;
    }
    const doc = new jsPDF();
    doc.text("Technical Inquiry Report", 14, 16);
    const tableHead = [
      "Inquiry #",
      "Customer",
      "Inquiry Date",
      "Forwarded Date",
      "Stage",
      "Status",
    ];
    const tableBody = dataToExport.map((inq) => [
      formatInquiryNumberForDisplay(inq.inquiry_number, inq.inquiry_date || inq.createdAt),
      inq.customer_name,
      inq.inquiry_date,
      inq.forwarded_date,
      inq.current_stage.replace("_", " "),
      inq.technical_status === "pending" ? "Pending" : "Forwarded",
    ]);
    autoTable(doc, {
      startY: 22,
      head: [tableHead],
      body: tableBody,
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: {
        fillColor: [22, 160, 133],
        textColor: 255,
        fontSize: 9,
        fontStyle: "bold",
      },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      didDrawPage: function (data) {
        let str = "Page " + doc.internal.getNumberOfPages();
        doc.setFontSize(10);
        doc.text(
          str,
          data.settings.margin.left,
          doc.internal.pageSize.height - 10
        );
      },
    });
    doc.save("Technical_Inquiries_Report.pdf");
  };

  return (
    <div className="main-wrapper">
      <div className="page-wrapper">
        <div className="content">
          <PageHeader
            title="Technical"
            count={pendingCount}
            onRefresh={() => {
              // Add refresh functionality if needed
              window.location.reload();
            }}
            onCollapse={() => {
              // Add collapse functionality if needed
            }}
          />
          <div className="card">
            <PageFilters
              searchTerm={searchTerm}
              onSearchChange={handleSearch}
              onExportPdf={handleExportPdf}
              onExportExcel={handleExportExcel}
              onSort={handleSort}
              sortConfig={sortConfig}
              view={view}
              onViewChange={setView}
              showExport={true}
              showSort={true}
              showAddButton={false}
              showHorizontalScrollButtons={false}
            />
            <div className="card-body">
              {loading ? (
                <div className="text-center p-4">
                  <h5>Loading inquiries...</h5>
                </div>
              ) : view === "list" ? (
                <TechnicalList inquiries={paginatedInquiries} />
              ) : (
                <TechnicalGrid inquiries={paginatedInquiries} />
              )}

              {!loading && totalPages > 0 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                  itemsPerPage={itemsPerPage}
                  totalItems={processedInquiries.length}
                />
              )}
              {!loading && processedInquiries.length === 0 && (
                <div className="text-center p-4 text-muted">
                  No inquiries available for evaluation.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Technical;
