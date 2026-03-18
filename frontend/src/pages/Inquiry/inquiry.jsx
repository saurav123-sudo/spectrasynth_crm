import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import Swal from "sweetalert2";
import CreateInquiry from "./CreateInquiry";
import axiosInstance from "../../apis/axiosConfig";

// --- NEW IMPORTS for EXPORT ---
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
// ---------------------------------

// --- IMPORT for PAGINATION ---
import Pagination from "../../components/Common/Pagination"; // Assuming Pagination.js is in the same folder
// ---------------------------------

// --- IMPORT for PAGE HEADER ---
import PageHeader from "../../components/Common/PageHeader";
// ---------------------------------

// --- IMPORT for PAGE FILTERS ---
import PageFilters from "../../components/Common/PageFilters";
import { formatInquiryNumberForDisplay } from "../../utils/inquiryNumberUtils";
// ---------------------------------
const ContactGrid = ({ inquiries, handleEvaluate, handleDelete }) => {
  if (inquiries.length === 0) {
    return <div className="text-center p-4">No inquiries found.</div>;
  }

  return (
    // <div className="table-responsive custom-table"> {/* Original structure */}
    //   <div className="card">
    //     <div className="card-body">
    <div className="row">
      {" "}
      {/* Main grid row */}
      {inquiries.map((inquiry) => (
        <div
          key={inquiry.inquiry_number}
          className="col-xl-3 col-lg-4 col-md-6 col-sm-12 mb-4"
        >
          <div className="card">
            {" "}
            {/* Card for each item */}
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <h6 className="card-title mb-0">
                  Inquiry #{formatInquiryNumberForDisplay(inquiry.inquiry_number, inquiry.createdAt)}
                  {inquiry.is_full_catalog_match && (
                    <span
                      className="ms-2"
                      title="Full Catalog Match (All products matched)"
                      style={{
                        color: "#4ade80",
                        fontSize: "1.6rem",
                        fontWeight: "bold",
                        lineHeight: "1",
                        display: "inline-block",
                        verticalAlign: "middle"
                      }}
                    >
                      ✔
                    </span>
                  )}
                </h6>
                <span
                  className={`badge ${inquiry.inquiry_status === "forwarded"
                    ? "bg-success"
                    : "bg-warning" // Reverted text-dark for original theme
                    }`}
                >
                  {inquiry.inquiry_status === "forwarded"
                    ? "Forwarded"
                    : "Pending"}
                </span>
              </div>
              <div className="mb-2">
                <strong>Customer:</strong> {inquiry.customer_name}
              </div>
              <div className="mb-2">
                <strong>Email:</strong> {inquiry.email}
              </div>
              <div className="mb-2">
                <strong>Date Since Inquiry:</strong> {/* Original label */}
                {new Date(inquiry.createdAt).toLocaleDateString("en-US", {
                  // Original  format
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </div>
              <div className="mb-3">
                <strong>Current Stage:</strong> {inquiry.current_stage}{" "}
                {/* Original field */}
              </div>
              <div className="d-flex justify-content-between">
                {" "}
                {/* Original actions layout */}
                {inquiry.inquiry_status === "pending" ? (
                  <button
                    className="btn btn-sm btn-info"
                    onClick={() => handleEvaluate(inquiry.inquiry_number)}
                  >
                    Evaluate
                  </button>
                ) : (
                  <span className="badge bg-success">Forwarded</span> // Original badge
                )}
                <div>
                  {" "}
                  {/* Original wrapper */}
                  <Link
                    to={`EmailInquiries/${inquiry.inquiry_number}`}
                    className="btn btn-sm btn-warning me-1" // Original style
                  >
                    View {/* Original text */}
                  </Link>
                  {inquiry.inquiry_status !== "forwarded" && (
                    <Link
                      to={`EditInquiry/${inquiry.inquiry_number}`}
                      className="btn btn-sm btn-warning me-1" // Original style
                    >
                      Edit {/* Original text */}
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
    //     </div>
    //   </div>
    // </div>
  );
};

//=================================================================
// 2. DUMB COMPONENT: InquiryList (receives props)
// (Using the version provided by the user)
//=================================================================
const InquiryList = ({ inquiries, handleEvaluate, handleDelete }) => {
  if (inquiries.length === 0) {
    return <div className="text-center p-4">No inquiries found.</div>;
  }

  return (
    <div className="table-responsive custom-table">
      <div
        className="horizontal-scroll-container"
        style={{ overflowX: "auto" }}
      >
        <table className="table table-bordered">
          {" "}
          {/* Original table class */}
          <thead>
            <tr>
              {" "}
              {/* Original header */}
              <th>Inquiry Number</th>
              <th>Customer Name</th>
              <th>Email</th>
              <th>Date Inquiry</th>
              <th>Current Stage</th>
              <th>Evaluate</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {inquiries.map((inquiry) => (
              <tr key={inquiry.inquiry_number}>
                <td>
                  {formatInquiryNumberForDisplay(inquiry.inquiry_number, inquiry.createdAt)}
                  {inquiry.is_full_catalog_match && (
                    <span
                      className="ms-2"
                      title="Full Catalog Match (All products matched)"
                      style={{
                        color: "#4ade80",
                        fontSize: "1.4rem",
                        fontWeight: "bold",
                        lineHeight: "1",
                        display: "inline-block",
                        verticalAlign: "middle"
                      }}
                    >
                      ✔
                    </span>
                  )}
                </td>
                <td>{inquiry.customer_name}</td>
                <td>{inquiry.email}</td>
                <td>
                  {new Date(inquiry.createdAt).toLocaleDateString("en-US", {
                    // Original format
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </td>
                <td>{inquiry.current_stage}</td>
                <td>
                  {" "}
                  {/* Original Evaluate cell */}
                  {inquiry.inquiry_status === "pending" ? (
                    <button
                      className="btn btn-sm btn-info"
                      onClick={() => handleEvaluate(inquiry.inquiry_number)}
                    >
                      New Inquiry {/* Original text */}
                    </button>
                  ) : (
                    <span className="badge bg-success">Forwarded</span>
                  )}
                </td>
                <td>
                  {" "}
                  {/* Original Actions cell */}
                  <Link
                    to={`EmailInquiries/${inquiry.inquiry_number}`}
                    className="btn btn-sm btn-warning me-2" // Original style
                  >
                    View
                  </Link>
                  {inquiry.inquiry_status !== "forwarded" && (
                    <>
                      {" "}
                      {/* Original fragment */}
                      <Link
                        to={`EditInquiry/${inquiry.inquiry_number}`}
                        className="btn btn-sm btn-warning me-2" // Original style
                      >
                        Edit
                      </Link>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

//=================================================================
// --- REMOVED PAGINATION COMPONENT DEFINITION ---
//=================================================================

//=================================================================
// 4. MAIN COMPONENT: Inquiry (Smart Component)
// (Restored original structure, uses imported Pagination)
//=================================================================
const Inquiry = () => {
  // State for data
  const [allInquiries, setAllInquiries] = useState([]);
  const [pendingEmailCount, setPendingEmailCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [emailCountLoading, setEmailCountLoading] = useState(true);

  //Filter
  const [selectedEmail, setSelectedEmail] = useState("all");
  const emailOptions = [
    "all",
    "sales@spectrasynth.com",
    "sales1@spectrasynth.com",
    "sales2@spectrasynth.com",
    "sales3@spectrasynth.com",
    "sales4@spectrasynth.com",
  ];

  // State for UI controls
  const [view, setView] = useState("list"); // 'list' or 'grid'
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({
    key: "createdAt",
    direction: "descending",
  });

  // State for Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10); // Default items per page

  // Adjust itemsPerPage based on view - OPTIONAL
  useEffect(() => {
    // You can adjust this logic if you want different numbers per page for list/grid
    // setItemsPerPage(view === 'grid' ? 8 : 10);
    setCurrentPage(1); // Reset page when view changes
  }, [view]);

  // Fetch all inquiries ONCE on mount
  const fetchInquiries = async () => {
    setLoading(true);
    try {
      const { data } = await axiosInstance.get("/api/inquiries/fetchInquiries");

      const formatted = data.map((item, index) => ({
        id: index + 1,
        customer_name: item.customer_name || "N/A",
        email: item.email || "N/A",
        inquiry_number: item.inquiry_number,
        createdAt: item.createdAt,
        inquiry_update_date: item.inquiry_update_date,
        products: Array.isArray(item.impurities)
          ? item.impurities.map((prod) => ({
            // Check array
            product_name: prod,
            cas_no: "-",
            hsn_no: "-",
            qty: "-",
          }))
          : [],
        inquiry_status: item.inquiry_status || "pending",
        current_stage: item.current_stage || "inquiry_received",
        is_full_catalog_match: item.is_full_catalog_match || false,
        product_names: Array.isArray(item.impurities) ? item.impurities : [],
        cas_numbers: Array.isArray(item.cas_numbers) ? item.cas_numbers : [],
      }));

      setAllInquiries(formatted);
    } catch (error) {
      console.error("Fetch Inquiries Error:", error);
      Swal.fire(
        "Error",
        error.response?.data?.message ||
        "Something went wrong while fetching inquiries",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  // Fetch pending email count
  const fetchPendingEmailCount = async () => {
    try {
      setEmailCountLoading(true);

      const { data } = await axiosInstance.get("/api/email/pending/count");

      setPendingEmailCount(data.pending_count || 0);
    } catch (error) {
      console.error("Error fetching email count:", error);
      setPendingEmailCount(0);
    } finally {
      setEmailCountLoading(false);
    }
  };

  useEffect(() => {
    fetchInquiries();
    fetchPendingEmailCount();
  }, []);

  // Handle forwarding inquiry
  const handleEvaluate = async (inquiry_number) => {
    // ... (logic remains the same)
    const inquiry = allInquiries.find(
      (inq) => inq.inquiry_number === inquiry_number,
    );
    if (!inquiry || inquiry.inquiry_status === "forwarded") {
      Swal.fire(
        "Info",
        "This inquiry has already been forwarded or cannot be found.",
        "info",
      );
      return;
    }

    const result = await Swal.fire({
      title: "Forward Inquiry?",
      text: "Forward this inquiry to the technical review stage?", // Clarified text
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Yes, forward it",
      confirmButtonColor: "#3085d6", // Standard confirm color
      cancelButtonColor: "#d33", // Standard cancel color
    });

    if (result.isConfirmed) {
      try {
        setAllInquiries((prev) =>
          prev.map((inq) =>
            inq.inquiry_number === inquiry_number
              ? {
                ...inq,
                inquiry_status: "forwarded",
                current_stage: "technical_review",
              }
              : inq,
          ),
        );

        await axiosInstance.patch(`/api/inquiries/${inquiry_number}/status`, {
          inquiry_status: "forwarded",
          current_stage: "technical_review",
        });

        Swal.fire("Success", "Inquiry forwarded successfully!", "success");
      } catch (error) {
        console.error("Forward Error:", error);
        Swal.fire(
          "Error",
          error.response?.data?.message || "Failed to forward inquiry",
          "error",
        );
        fetchInquiries();
      }
    }
  };

  // Handle delete
  const handleDelete = async (inquiry_number) => {
    // ... (logic remains the same)
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "This action cannot be undone!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete it!",
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
    });

    if (result.isConfirmed) {
      try {
        const { data } = await axiosInstance.delete(
          `/api/inquiries/${inquiry_number}`,
        );
        Swal.fire(
          "Deleted!",
          data.message || "Inquiry has been deleted.",
          "success",
        );
        setAllInquiries((prev) =>
          prev.filter((inq) => inq.inquiry_number !== inquiry_number),
        );
      } catch (error) {
        console.error("Delete Error:", error);
        Swal.fire(
          "Error",
          error.response?.data?.message ||
          "Something went wrong while deleting inquiry",
          "error",
        );
      }
    }
  };

  // Calculate Pending Count
  const pendingCount = useMemo(() => {
    return allInquiries.filter((inq) => inq.inquiry_status === "pending")
      .length;
  }, [allInquiries]);

  // Memoized processing: Filter -> Sort
  const processedInquiries = useMemo(() => {
    let inquiries = [...allInquiries];

    const lowerSearchTerm = searchTerm.toLowerCase();

    if (lowerSearchTerm) {
      inquiries = inquiries.filter(
        (inq) =>
          inq.inquiry_number.toLowerCase().includes(lowerSearchTerm) ||
          inq.customer_name.toLowerCase().includes(lowerSearchTerm) ||
          inq.email.toLowerCase().includes(lowerSearchTerm) ||
          inq.product_names.some((name) => name && name.toLowerCase().includes(lowerSearchTerm)) ||
          inq.cas_numbers.some((cas) => cas && cas.toLowerCase().includes(lowerSearchTerm)),
      );
    }

    // ✅ EMAIL DROPDOWN FILTER (LOCAL TO THIS PAGE)
    if (selectedEmail !== "all") {
      inquiries = inquiries.filter(
        (inq) => inq.email?.toLowerCase() === selectedEmail.toLowerCase(),
      );
    }

    if (sortConfig.key) {
      inquiries.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];
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
  }, [allInquiries, searchTerm, sortConfig, selectedEmail]);

  // Memoized pagination: Paginate the processed data
  const paginatedInquiries = useMemo(() => {
    // ... (logic remains the same)
    const startIndex = (currentPage - 1) * itemsPerPage;
    return processedInquiries.slice(startIndex, startIndex + itemsPerPage);
  }, [processedInquiries, currentPage, itemsPerPage]);

  // Calculate total pages based on *processed* inquiries
  const totalPages = Math.ceil(processedInquiries.length / itemsPerPage);

  // Handlers for controls
  const handleSort = (key) => {
    // ... (logic remains the same)
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
    // ... (logic remains the same)
    setSearchTerm(event.target.value);
    setCurrentPage(1);
  };

  const handlePageChange = (pageNumber) => {
    // ... (logic remains the same)
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  const handleRefresh = () => {
    // ... (logic remains the same)
    setLoading(true);
    setEmailCountLoading(true);
    setSortConfig({ key: "createdAt", direction: "descending" });
    setSearchTerm("");
    setCurrentPage(1);
    fetchInquiries();
    fetchPendingEmailCount();
  };

  // Export handlers
  const handleExportExcel = () => {
    // ... (logic remains the same)
    const dataToExport = processedInquiries.map((inq) => ({
      "Inquiry Number": formatInquiryNumberForDisplay(inq.inquiry_number, inq.createdAt),
      "Customer Name": inq.customer_name,
      Email: inq.email,
      "Date Received": new Date(inq.createdAt).toLocaleDateString("en-IN"),
      "Current Stage": inq.current_stage.replace("_", " "),
      Status: inq.inquiry_status === "forwarded" ? "Forwarded" : "Pending",
    }));
    if (dataToExport.length === 0) {
      Swal.fire("Info", "No data available to export.", "info");
      return;
    }
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inquiries");
    XLSX.writeFile(wb, "Inquiries_Report.xlsx");
  };

  const handleExportPdf = () => {
    // ... (logic remains the same)
    const dataToExport = processedInquiries;
    if (dataToExport.length === 0) {
      Swal.fire("Info", "No data available to export.", "info");
      return;
    }
    const doc = new jsPDF();
    doc.text("Inquiry Report", 14, 16);
    const tableHead = [
      "Inquiry #",
      "Customer",
      "Email",
      "Date",
      "Stage",
      "Status",
    ];
    const tableBody = dataToExport.map((inq) => [
      formatInquiryNumberForDisplay(inq.inquiry_number, inq.createdAt),
      inq.customer_name,
      inq.email,
      new Date(inq.createdAt).toLocaleDateString("en-IN"),
      inq.current_stage.replace("_", " "),
      inq.inquiry_status === "forwarded" ? "Forwarded" : "Pending",
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
          doc.internal.pageSize.height - 10,
        );
      },
    });
    doc.save("Inquiries_Report.pdf");
  };

  // Main Render (Restored Original Layout)
  return (
    <div className="main-wrapper">
      <div className="page-wrapper">
        <div className="content">
          <PageHeader
            title="Inquiry"
            count={pendingCount}
            onRefresh={handleRefresh}
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
              addButtonText="Add Inquiry"
              addButtonLink="Inquiry/CreateInquiry"
              showAddButton={true}
              showNewInquiryButton={true}
              showNewEmailInquiryButton={true}
              onNewInquiry={() =>
                (window.location.href = "/dashboard/Inquiry/new-inquiry")
              }
              pendingEmailCount={pendingEmailCount}
              emailCountLoading={emailCountLoading}
            />
            <div className="ms-auto d-flex align-items-center gap-2 rounded bg-light border shadow-sm">
              <select
                className="form-select form-select-sm"
                style={{ maxWidth: "280px" }}
                value={selectedEmail}
                onChange={(e) => {
                  setSelectedEmail(e.target.value);
                  setCurrentPage(1); // reset page when filter changes
                }}
              >
                <option value="all">All Emails</option>
                {emailOptions
                  .filter((e) => e !== "all")
                  .map((email) => (
                    <option key={email} value={email}>
                      {email}
                    </option>
                  ))}
              </select>
            </div>

            <div className="card-body">
              {/* Content */}
              {loading ? (
                <div className="text-center p-4">
                  <span className="spinner-border spinner-border-sm me-2"></span>{" "}
                  Loading...
                </div>
              ) : view === "list" ? (
                <InquiryList
                  inquiries={paginatedInquiries}
                  handleEvaluate={handleEvaluate}
                  handleDelete={handleDelete}
                />
              ) : (
                <div className="p-0">
                  {" "}
                  {/* Use p-0 if ContactGrid adds its own padding */}
                  <ContactGrid
                    inquiries={paginatedInquiries}
                    handleEvaluate={handleEvaluate}
                    handleDelete={handleDelete}
                  />
                </div>
              )}
            </div>
            {/* Pagination Controls - Kept in card-footer */}
            {!loading && totalPages > 0 && (
              <div className="card-footer">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                  itemsPerPage={itemsPerPage}
                  totalItems={processedInquiries.length} // Show total based on filtered results
                />
              </div>
            )}
            {/* No results message */}
            {!loading && processedInquiries.length === 0 && (
              <div className="text-center p-4 text-muted">
                {" "}
                {/* Kept original message placement */}
                No inquiries found matching your criteria.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Inquiry;
