import React, { useState, useEffect, useMemo } from "react"; // Ensure useMemo is imported
import { Link, useNavigate } from "react-router-dom";
import Swal from "sweetalert2"; // Added Swal import

import { isAdmin } from "../../utils/authUtils";
import axiosInstance from "../../apis/axiosConfig";
import Pagination from "../../components/Common/Pagination"; // Assuming Pagination.js is here

// --- NEW IMPORTS for EXPORT ---
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
// ---------------------------------

// --- IMPORT for PAGE HEADER ---
import PageHeader from "../../components/Common/PageHeader";
// ---------------------------------

// --- IMPORT for PAGE FILTERS ---
import PageFilters from "../../components/Common/PageFilters";
// ---------------------------------

const MaketingPersonList = ({
  canAdd = true,
  canEdit = true,
  canDelete = true,
}) => {
  const navigate = useNavigate();
  const [quotations, setQuotations] = useState([]);
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({
    key: "createdAt",
    direction: "descending",
  });
  const IMAGE_BASE_URL = import.meta.env.VITE_IMAGE_BASE_URL;
  // Check if current user is admin
  const currentUserIsAdmin = isAdmin();
  // Module permissions fetched from backend (like Sidebar)
  const [modulePermissions, setModulePermissions] = useState({});

  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axiosInstance.get("/api/users/fetch/permissions", {
          headers: { Authorization: `Bearer ${token}` },
        });

        const permsArray = res.data.permissions || [];
        const permsMap = {};
        permsArray.forEach((p) => {
          permsMap[p.module_name] = p;
        });
        setModulePermissions(permsMap);
      } catch (err) {
        console.error("Failed to fetch permissions", err);
      }
    };

    fetchPermissions();
  }, []);

  // ✅ Fetch quotations from API
  const fetchQuotations = async () => {
    setLoading(true); // Set loading true at start
    try {
      const token = localStorage.getItem("token");

      const response = await axiosInstance.get("/api/quotations", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setQuotations(response.data.data || []);
      setCurrentPage(1); // Reset page on fetch
    } catch (error) {
      console.error("Error fetching quotations:", error);
      Swal.fire({
        // Use Swal for errors
        icon: "error",
        title: "Fetch Error",
        text: error.response?.data?.message || "Failed to fetch quotations.",
      });
    } finally {
      setLoading(false);
    }
  };

  // Memoized processing: Filter -> Sort
  const processedQuotations = useMemo(() => {
    let quotes = [...quotations];
    const lowerSearchTerm = searchTerm.toLowerCase();
    if (lowerSearchTerm) {
      quotes = quotes.filter(
        (quote) =>
          quote.quotation_number?.toLowerCase().includes(lowerSearchTerm) ||
          quote.inquiry?.customer_name
            ?.toLowerCase()
            .includes(lowerSearchTerm) ||
          quote.quotation_status?.toLowerCase().includes(lowerSearchTerm) ||
          quote.product_names?.some((name) => name && name.toLowerCase().includes(lowerSearchTerm)) ||
          quote.cas_numbers?.some((cas) => cas && cas.toLowerCase().includes(lowerSearchTerm))
      );
    }
    if (sortConfig.key) {
      quotes.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];
        if (sortConfig.key === "date") {
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
    return quotes;
  }, [quotations, searchTerm, sortConfig]);

  // --- START:  Corrected Pagination Logic ---
  const paginatedQuotations = useMemo(() => {
    // Renamed from paginatedData
    const startIndex = (currentPage - 1) * itemsPerPage;
    // Use 'processedQuotations' state variable here
    return processedQuotations.slice(startIndex, startIndex + itemsPerPage);
  }, [processedQuotations, currentPage, itemsPerPage]); // Dependency array uses 'processedQuotations'

  // Use 'processedQuotations' state variable here
  const totalPages = Math.ceil(processedQuotations.length / itemsPerPage);

  const handlePageChange = (pageNumber) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  // // ✅ Delete quotation (Keep commented or uncomment if needed)
  // const handleDelete = async (quotation_number) => { ... }; // (Keep implementation if needed)

  // Handlers for controls
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

  const handleSearch = (event) => {
    setSearchTerm(event.target.value);
    setCurrentPage(1);
  };

  // Export handlers
  const handleExportExcel = () => {
    const dataToExport = processedQuotations.map((quotation) => ({
      "Quotation Number": quotation.quotation_number,
      "Inquiry Date": quotation.date
        ? new Date(quotation.date).toLocaleDateString()
        : "N/A",
      Status: quotation?.quotation_status || "N/A",
      "Forwarded Date/Time": quotation.inquiry?.technical_update_date
        ? new Date(quotation.inquiry.technical_update_date).toLocaleString(
          "en-IN",
          {
            timeZone: "Asia/Kolkata",
          }
        )
        : "N/A",
      "Management Status": quotation.inquiry?.management_status || "unknown",
    }));
    if (dataToExport.length === 0) {
      Swal.fire("Info", "No data available to export.", "info");
      return;
    }
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Marketing_Quotations");
    XLSX.writeFile(wb, "Marketing_Quotations_Report.xlsx");
  };

  const handleViewPDF = async (quotationNumber) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        Swal.fire("Error", "No token provided", "error");
        return;
      }

      // Find selected quotation to get quotation_pdf path
      const selectedQuotation = quotations.find(
        (q) => q.quotation_number === quotationNumber
      );

      if (!selectedQuotation || !selectedQuotation.quotation_pdf) {
        Swal.fire("Error", "PDF not available for this quotation", "error");
        return;
      }

      const pdfPath = selectedQuotation.quotation_pdf; // e.g. uploads/quotations/file.pdf
      const pdfUrl = `${IMAGE_BASE_URL}/${pdfPath}`;

      // Fetch the PDF using headers
      const response = await fetch(pdfUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to download PDF");
      }

      const blob = await response.blob();
      const fileURL = window.URL.createObjectURL(blob);

      // Open in new tab
      window.open(fileURL, "_blank");
    } catch (error) {
      console.error("Error opening PDF:", error);
      Swal.fire("Error", "Failed to open PDF", "error");
    }
  };

  const handleExportPdf = () => {
    const dataToExport = processedQuotations;
    if (dataToExport.length === 0) {
      Swal.fire("Info", "No data available to export.", "info");
      return;
    }
    const doc = new jsPDF();
    doc.text("Marketing Quotations Report", 14, 16);
    const tableHead = [
      "Quotation #",
      "Inquiry Date",
      "Status",
      "Forwarded Date/Time",
      "Management Status",
    ];
    const tableBody = dataToExport.map((quotation) => [
      quotation.quotation_number,
      quotation.date ? new Date(quotation.date).toLocaleDateString() : "N/A",
      quotation?.quotation_status || "N/A",
      quotation.inquiry?.technical_update_date
        ? new Date(quotation.inquiry.technical_update_date).toLocaleString(
          "en-IN",
          {
            timeZone: "Asia/Kolkata",
          }
        )
        : "N/A",
      quotation.inquiry?.management_status || "unknown",
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
    doc.save("Marketing_Quotations_Report.pdf");
  };

  useEffect(() => {
    fetchQuotations();
  }, []); // Fetch only once on component mount

  // --- JSX Starts Here ---
  return (
    <div className="main-wrapper">
      <div className="page-wrapper">
        <div className="content">
          <PageHeader
            title="Marketing Person Evaluation"
            onRefresh={fetchQuotations}
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
              view="list"
              onViewChange={() => { }}
              showExport={true}
              showSort={true}
              showAddButton={false}
              showViewToggle={false}
              showQuotations={false}
              showHorizontalScrollButtons={false}
            />
            <div className="card-body">
              {loading ? (
                <div className="text-center mt-4">
                  <span className="spinner-border spinner-border-sm me-2"></span>{" "}
                  Loading quotations...
                </div>
              ) : (
                <>
                  {successMessage && (
                    <div
                      className="alert alert-success alert-dismissible fade show mt-3"
                      role="alert"
                    >
                      {" "}
                      {/* Keeping original theme classes */}
                      {successMessage}
                      <button
                        type="button"
                        className="btn-close"
                        onClick={() => setSuccessMessage("")}
                        aria-label="Close"
                      ></button>
                    </div>
                  )}
                  <div style={{ overflowX: "auto" }}>
                    <table className="table table-striped table-bordered">
                      {" "}
                      {/* Kept original classes */}
                      <thead>
                        <tr className="table-light">
                          {" "}
                          {/* Added header style */}
                          <th>Quotation No</th>
                          <th>Employee Name</th>
                          <th>Inquiry Date</th>
                          <th>Status</th>
                          <th>Forwarded Date/Time</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* Use paginatedQuotations */}
                        {paginatedQuotations.length === 0 ? (
                          <tr>
                            <td
                              colSpan="6"
                              className="text-center p-4 text-muted"
                            >
                              {" "}
                              {/* Corrected colspan */}
                              {processedQuotations.length > 0
                                ? "No quotations found for this page."
                                : "No quotations found."}
                            </td>
                          </tr>
                        ) : (
                          paginatedQuotations.map((quotation) => {
                            // Map over paginated data
                            const inquiryDate = quotation.inquiry?.createdAt
                              ? new Date(
                                quotation.inquiry.createdAt
                              ).toLocaleDateString("en-IN") // Use locale
                              : "N/A";

                            const forwardedDateTime = quotation.inquiry
                              ?.technical_update_date
                              ? new Date(
                                quotation.inquiry.technical_update_date
                              ).toLocaleString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                                hour12: true,
                                timeZone: "Asia/Kolkata", // Ensure correct timezone
                              })
                              : "N/A"; // Fallback if date is missing

                            const managementStatus =
                              quotation.inquiry?.management_status || "unknown"; // Default if undefined

                            return (
                              <tr key={quotation.quotation_number}>
                                <td>{quotation.quotation_number}</td>
                                <td
                                  title={
                                    quotation.inquiry?.technical_quotation_by || "N/A"
                                  }
                                  style={{
                                    maxWidth: "200px",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {quotation.inquiry?.technical_quotation_by || "N/A"}
                                </td>
                                <td>
                                  {quotation.date
                                    ? new Date(
                                      quotation.date
                                    ).toLocaleDateString()
                                    : "N/A"}
                                </td>

                                <td>
                                  {quotation?.quotation_status
                                    ? quotation.quotation_status
                                    : "N/A"}
                                </td>

                                {/* <td>{quotation.quotation_by || "N/A"}</td> */}

                                {/* New column */}
                                <td>
                                  {new Date(
                                    quotation.inquiry.technical_update_date
                                  ).toLocaleString("en-IN", {
                                    timeZone: "Asia/Kolkata",
                                  })}
                                </td>

                                <td>
                                  <div className="d-flex gap-1 flex-wrap">
                                    {quotation.inquiry?.management_status ===
                                      "pending" ? (
                                      <>
                                        {/* <button
                                          className="btn btn-danger btn-sm"
                                          disabled
                                        >
                                          New
                                        </button> */}
                                        <Link
                                          to={`EditQuotation/${quotation.quotation_number}`}
                                          className="btn btn-warning btn-sm"
                                        >
                                          View
                                        </Link>
                                      </>
                                    ) : quotation.inquiry?.management_status ===
                                      "forwarded" ? (
                                      <>
                                        <button
                                          className="btn btn-success btn-sm"
                                          disabled
                                        >
                                          Forwarded
                                        </button>
                                        <Link
                                          to={`EditQuotation/${quotation.quotation_number}`}
                                          className="btn btn-warning btn-sm"
                                        >
                                          View
                                        </Link>
                                        {(currentUserIsAdmin ||
                                          modulePermissions?.marketing_person?.can_read) && (
                                          // <button
                                          //   className="btn btn-info btn-sm"
                                          //   onClick={() =>
                                          //     handleViewPDF(
                                          //       quotation.quotation_number
                                          //     )
                                          //   }
                                          // >
                                          //   Quotation PDF
                                          // </button>
                                          <a
                                            href={`${IMAGE_BASE_URL}/api/pdf/${quotation.quotation_pdf.replace(/^uploads\/quotations\//, "")}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="btn btn-sm btn-primary"
                                          >
                                            Quotation PDF
                                          </a>
                                        )}
                                      </>
                                    ) : (
                                      <>
                                        <Link
                                          to={`EditQuotation/${quotation.quotation_number}`}
                                          className="btn btn-warning btn-sm"
                                        >
                                          View
                                        </Link>
                                      </>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                  {/* --- Render Pagination --- */}
                  {!loading && totalPages > 0 && (
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={handlePageChange}
                      itemsPerPage={itemsPerPage}
                      totalItems={processedQuotations.length} // Total items from the filtered list
                    />
                  )}
                </>
              )}
            </div>
          </div>
        </div>{" "}
        {/* End content */}
      </div>{" "}
      {/* End page-wrapper */}
    </div> // End main-wrapper
  );
};

export default MaketingPersonList;
