import React from "react";

const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
  itemsPerPage,
  totalItems,
}) => {
  // Logic to create the array of page numbers to display (e.g., [1, 2, 3, '...', 18])
  const getPageNumbers = () => {
    const pages = [];
    const maxPagesToShow = 5; // How many page numbers to show around the current page
    const halfWindow = Math.floor(maxPagesToShow / 2);

    if (totalPages <= maxPagesToShow) {
      // Show all pages if total is less than or equal to max
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Show windowed pages with ellipses for larger sets
      let start = Math.max(1, currentPage - halfWindow);
      let end = Math.min(totalPages, currentPage + halfWindow);

      // Adjust window if near the beginning or end
      if (currentPage - halfWindow <= 1) {
        end = maxPagesToShow;
      }
      if (currentPage + halfWindow >= totalPages) {
        start = totalPages - maxPagesToShow + 1;
      }

      // Add '1' and '...' if needed at the beginning
      if (start > 1) {
        pages.push(1);
        if (start > 2) {
          pages.push("..."); // Ellipsis if there's a gap after '1'
        }
      }

      // Add page numbers within the calculated window
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      // Add '...' and last page if needed at the end
      if (end < totalPages) {
        if (end < totalPages - 1) {
          pages.push("..."); // Ellipsis if there's a gap before the last page
        }
        pages.push(totalPages);
      }
    }
    return pages;
  };

  const pageNumbers = getPageNumbers();
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1; // Handle no items case
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  // Don't render pagination if there are no pages
  if (totalPages === 0) {
    return null;
  }

  return (
    <div className="row align-items-center mt-3">
      {" "}
      {/* Added margin-top for spacing */}
      <div className="col-md-6">
        {/* Display item count */}
        <div className="datatable-length text-muted">
          {" "}
          {/* Use text-muted for less emphasis */}
          Showing {startItem} to {endItem} of {totalItems} items
        </div>
      </div>
      <div className="col-md-6">
        {/* Pagination controls */}
        <div className="datatable-paginate d-flex justify-content-md-end">
          {" "}
          {/* Align right on medium screens and up */}
          <ul className="pagination pagination-sm mb-0">
            {" "}
            {/* Use pagination-sm for smaller controls */}
            {/* Previous Button */}
            <li className={`page-item ${currentPage === 1 ? "disabled" : ""}`}>
              <a
                className="page-link"
                href="#!" // Use #! for placeholder links
                onClick={(e) => {
                  e.preventDefault();
                  if (currentPage > 1) onPageChange(currentPage - 1);
                }}
                aria-label="Previous" // Accessibility
              >
                <span aria-hidden="true">&laquo;</span>{" "}
                {/* Use HTML entity for arrow */}
              </a>
            </li>
            {/* Page Numbers */}
            {pageNumbers.map((page, index) =>
              page === "..." ? (
                // Non-clickable ellipsis
                <li key={`ellipsis-${index}`} className="page-item disabled">
                  <span className="page-link">...</span>
                </li>
              ) : (
                // Clickable page number
                <li
                  key={page}
                  className={`page-item ${
                    currentPage === page ? "active" : ""
                  }`}
                >
                  <a
                    className="page-link"
                    href="#!"
                    onClick={(e) => {
                      e.preventDefault();
                      onPageChange(page);
                    }}
                  >
                    {page}
                  </a>
                </li>
              )
            )}
            {/* Next Button */}
            <li
              className={`page-item ${
                currentPage === totalPages ? "disabled" : ""
              }`}
            >
              <a
                className="page-link"
                href="#!"
                onClick={(e) => {
                  e.preventDefault();
                  if (currentPage < totalPages) onPageChange(currentPage + 1);
                }}
                aria-label="Next"
              >
                <span aria-hidden="true">&raquo;</span>{" "}
                {/* Use HTML entity for arrow */}
              </a>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Pagination; // Make the component available for import
