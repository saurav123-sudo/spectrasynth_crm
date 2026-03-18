import React from "react";
import { Link } from "react-router-dom";
import { isAdmin } from "../../utils/authUtils";

const PageFilters = ({
  searchTerm,
  onSearchChange,
  onExportPdf,
  onExportExcel,
  onSort,
  sortConfig,
  view,
  onViewChange,
  addButtonText,
  addButtonLink,
  onNewInquiry,
  onImportExcel,
  onNewEmailInquiry,
  showAddButton = true,
  showExport = true,
  showSort = true,
  showViewToggle = true,
  showHorizontalScrollButtons = true,
  showNewInquiryButton = false,
  showNewEmailInquiryButton = false,
  showImportExcel = false,
  pendingEmailCount = 0,
  emailCountLoading = false,
}) => {
  const scrollTarget = () => {
  return document.querySelector(".horizontal-scroll-container");
};

  const [scrollDir, setScrollDir] = React.useState("right");

const handleScroll = () => {
  const el = scrollTarget();
  if (!el) return;

  const amount = 1000;

  if (scrollDir === "right") {
    el.scrollBy({ left: amount, behavior: "smooth" });
    setScrollDir("left");
  } else {
    el.scrollBy({ left: -amount, behavior: "smooth" });
    setScrollDir("right");
  }
};


  // Check if current user is admin
  const currentUserIsAdmin = isAdmin();
  // Only show export buttons for admin users
  const shouldShowExport = showExport && currentUserIsAdmin;
  return (
    <>
      {/* Search */}
      <div className="card-header">
        <div className="row align-items-center">
          <div className="col-sm-4">
            <div className="icon-form mb-3 mb-sm-0">
              <span className="form-icon">
                <i className="ti ti-search"></i>
              </span>
              <input
                type="text"
                className="form-control"
                placeholder="Search Inquiry"
                value={searchTerm}
                onChange={onSearchChange}
              />
            </div>
          </div>
          <div className="col-sm-8">
            <div className="d-flex align-items-center flex-wrap row-gap-2 justify-content-sm-end">
              {shouldShowExport && (
                <div className="dropdown me-2">
                  <a
                    href="javascript:void(0);"
                    className="dropdown-toggle"
                    data-bs-toggle="dropdown"
                  >
                    <i className="ti ti-package-export me-2"></i>Export
                  </a>
                  <div className="dropdown-menu dropdown-menu-end">
                    <ul>
                      <li>
                        <a
                          href="#!"
                          onClick={(e) => {
                            e.preventDefault();
                            onExportPdf();
                          }}
                          className="dropdown-item"
                        >
                          <i className="ti ti-file-type-pdf text-danger me-1"></i>{" "}
                          Export as PDF
                        </a>
                      </li>
                      <li>
                        <a
                          href="#!"
                          onClick={(e) => {
                            e.preventDefault();
                            onExportExcel();
                          }}
                          className="dropdown-item"
                        >
                          <i className="ti ti-file-type-xls text-green me-1"></i>{" "}
                          Export as Excel
                        </a>
                      </li>
                    </ul>
                  </div>
                </div>
              )}
              {showNewEmailInquiryButton && (
                <div>
                  <Link to="new-email-inquiry" className="btn btn-info me-2">
                    <i className="ti ti-mail me-1"></i>
                    New Email Inquiry
                    {emailCountLoading ? (
                      <span className="ms-2">
                        <span
                          className="spinner-border spinner-border-sm"
                          role="status"
                          aria-hidden="true"
                        ></span>
                      </span>
                    ) : (
                      <span className="ms-1">({pendingEmailCount})</span>
                    )}
                  </Link>
                </div>
              )}
              {showAddButton && addButtonLink && (
                <div>
                  <a href={addButtonLink} className="btn btn-primary">
                    {addButtonText || "Add Inquiry"}
                  </a>
                </div>
              )}
              {showImportExcel && (
                <div>
                  <button
                    className="btn btn-success me-2"
                    onClick={onImportExcel}
                  >
                    Import Excel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* /Search */}

      {/* Filter */}
      <div className="card-body">
        <div className="d-flex align-items-center justify-content-between flex-wrap row-gap-2 mb-4">
          <div className="d-flex align-items-center flex-wrap row-gap-2">
            {showSort && (
              <div className="dropdown me-2">
                <a
                  href="javascript:void(0);"
                  className="dropdown-toggle"
                  data-bs-toggle="dropdown"
                >
                  <i className="ti ti-sort-ascending-2 me-2"></i>Sort
                </a>
                <div className="dropdown-menu dropdown-menu-start">
                  <ul>
                    <li>
                      <a
                        href="#!"
                        onClick={(e) => {
                          e.preventDefault();
                          onSort("createdAt");
                        }}
                        className="dropdown-item"
                      >
                        <i className="ti ti-circle-chevron-right me-1"></i> Sort
                        by Date
                        {sortConfig.key === "createdAt" &&
                          (sortConfig.direction === "ascending"
                            ? " (Asc)"
                            : " (Desc)")}
                      </a>
                    </li>
                    <li>
                      <a
                        href="#!"
                        onClick={(e) => {
                          e.preventDefault();
                          onSort("customer_name");
                        }}
                        className="dropdown-item"
                      >
                        <i className="ti ti-circle-chevron-right me-1"></i> Sort
                        by Name
                        {sortConfig.key === "customer_name" &&
                          (sortConfig.direction === "ascending"
                            ? " (Asc)"
                            : " (Desc)")}
                      </a>
                    </li>
                    <li>
                      <a
                        href="#!"
                        onClick={(e) => {
                          e.preventDefault();
                          onSort("inquiry_number");
                        }}
                        className="dropdown-item"
                      >
                        <i className="ti ti-circle-chevron-right me-1"></i> Sort
                        by Inquiry Number
                        {sortConfig.key === "inquiry_number" &&
                          (sortConfig.direction === "ascending"
                            ? " (Asc)"
                            : " (Desc)")}
                      </a>
                    </li>
                    <li>
                      <a
                        href="#!"
                        onClick={(e) => {
                          e.preventDefault();
                          onSort("current_stage");
                        }}
                        className="dropdown-item"
                      >
                        <i className="ti ti-circle-chevron-right me-1"></i> Sort
                        by Stage
                        {sortConfig.key === "current_stage" &&
                          (sortConfig.direction === "ascending"
                            ? " (Asc)"
                            : " (Desc)")}
                      </a>
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </div>

          <div className="d-flex align-items-center flex-wrap row-gap-2 gap-2">
            {showViewToggle && (
              <div className="view-icons">
                <button
                  onClick={() => onViewChange("list")}
                  className={view === "list" ? "active" : ""}
                  type="button"
                >
                  <i className="ti ti-list-tree"></i>
                </button>
                <button
                  onClick={() => onViewChange("grid")}
                  className={view === "grid" ? "active" : ""}
                  type="button"
                >
                  <i className="ti ti-grid-dots"></i>
                </button>
              </div>
            )}

            {showHorizontalScrollButtons && (
              <button
                className="btn btn-light btn-sm"
                title="Scroll"
                onClick={handleScroll}
                type="button"
              >
                <i className="ti ti-arrows-horizontal"></i>
              </button>
            )}
          </div>
        </div>
      </div>
      {/* /Filter */}
    </>
  );
};

export default PageFilters;
