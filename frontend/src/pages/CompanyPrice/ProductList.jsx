import React, { useEffect, useState, useMemo } from "react"; // Added useMemo
import { Link } from "react-router-dom";
import Swal from "sweetalert2";
import axiosInstance from "../../apis/axiosConfig";
import Pagination from "../../components/Common/Pagination"; // Import Pagination


// --- IMPORT for PAGE HEADER ---
import PageHeader from "../../components/Common/PageHeader";
// ---------------------------------

// --- IMPORT for PAGE FILTERS ---
import PageFilters from "../../components/Common/PageFilters";
// ---------------------------------

function ProductList() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState({
    key: "product_name",
    direction: "descending",
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10); // Adjust as needed

  // Fetch all product prices
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const res = await axiosInstance.get("/api/product_prices");
        setProducts(res.data?.data || []);
        setCurrentPage(1);
      } catch (err) {
        console.error("Error fetching products:", err);
        setError(err.response?.data?.message || "Failed to fetch products.");
        Swal.fire({
          // Use Swal for better error display
          icon: "error",
          title: "Fetch Error",
          text: err.response?.data?.message || "Failed to fetch products.",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // ✅ Filter and sort products based on search query and sort config
  const filteredProducts = useMemo(() => {
    let filtered = products;

    // Filter based on search query
    if (searchQuery) {
      const lowerCaseQuery = searchQuery.toLowerCase();
      filtered = products
        .map((product) => {
          const nameMatch = product.product_name
            ?.toLowerCase()
            .includes(lowerCaseQuery);
          const casMatch = product.cas_number
            ?.toLowerCase()
            .includes(lowerCaseQuery);

          // Filter prices that match the company name
          const matchedPrices = product.ProductPrices?.filter((price) =>
            price.company?.toLowerCase().includes(lowerCaseQuery)
          );

          // If product name/CAS matches, keep all its prices
          if (nameMatch || casMatch) return product;

          // If only some prices match company, return product with just those prices
          if (matchedPrices?.length > 0) {
            return { ...product, ProductPrices: matchedPrices };
          }

          // Otherwise, exclude the product
          return null;
        })
        .filter(Boolean); // Remove null entries
    }

    // Sort based on sort config
    if (sortConfig.key) {
      filtered.sort((a, b) => {
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

    return filtered;
  }, [products, searchQuery, sortConfig]);

  const flattenedFilteredProducts = useMemo(() => {
    return filteredProducts.flatMap((product) => {
      if (!product.ProductPrices || product.ProductPrices.length === 0) {
        // If no prices, return one row object for the product itself
        // Include a unique key structure
        return [{ type: "productOnly", product, key: `product-${product.id}` }];
      } else {
        // If prices exist, return one row object for each price, including product info
        // Include a unique key structure
        return product.ProductPrices.map((price) => ({
          type: "productWithPrice",
          product,
          price,
          key: `price-${product.id}-${price.id}`, // More specific key
        }));
      }
    });
  }, [filteredProducts]);

  // --- Pagination Logic ---
  const paginatedRows = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return flattenedFilteredProducts.slice(
      startIndex,
      startIndex + itemsPerPage
    );
  }, [flattenedFilteredProducts, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(flattenedFilteredProducts.length / itemsPerPage);

  const handlePageChange = (pageNumber) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };
  // --- End Pagination Logic ---

  // Reset page to 1 when search query or sort config changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortConfig]);

  // ✅ Delete specific product price
  const handleDeletePrice = async (productId, priceId) => {
    const confirm = await Swal.fire({
      title: "Are you sure?",
      text: "Do you want to delete this price?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!",
      cancelButtonText: "Cancel",
    });

    if (confirm.isConfirmed) {
      try {
        await axiosInstance.delete(`/api/product_prices/${priceId}`);

        Swal.fire("Deleted!", "Price deleted successfully.", "success");

        // ✅ Remove deleted price from state (triggers recalculation of flattened/paginated)
        setProducts((prev) =>
          prev.map((p) =>
            p.id === productId
              ? {
                ...p,
                ProductPrices: p.ProductPrices.filter(
                  (price) => price.id !== priceId
                ),
              }
              : p
          )
        );

        // --- Adjust Current Page After Deletion ---
        // Calculate what the total number of items WILL BE after deletion
        const newTotalItems = flattenedFilteredProducts.length - 1;
        // Calculate what the total pages WILL BE
        const newTotalPages = Math.ceil(newTotalItems / itemsPerPage);

        // If the current page is now greater than the new total pages,
        // and there are still pages left, go to the last page.
        if (currentPage > newTotalPages && newTotalPages > 0) {
          setCurrentPage(newTotalPages);
        }
        // If deleting the last item overall, reset to page 1
        else if (newTotalItems === 0) {
          setCurrentPage(1);
        }
        // If deleting the last item *on the current page* (but not overall last),
        // and it's not the first page, go to the previous page. (More complex check)
        else if (paginatedRows.length === 1 && currentPage > 1) {
          setCurrentPage(currentPage - 1);
        }
        // --- End Adjust Current Page ---
      } catch (err) {
        console.error("Delete failed:", err);
        Swal.fire(
          "Error!",
          err.response?.data?.message || "Failed to delete price.",
          "error"
        );
      }
    }
  };

  // Handle sort
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

  // Handle search
  const handleSearch = (event) => {
    setSearchQuery(event.target.value);
    setCurrentPage(1);
  };
  const refreshProducts = async () => {
    try {
      const res = await axiosInstance.get("/api/product_prices");
      setProducts(res.data?.data || []);
      setCurrentPage(1);
    } catch (err) {
      console.error("Error refreshing products:", err);
    }
  };

  // Handle import Excel
  const handleImportExcel = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".xlsx,.xls";

    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const formData = new FormData();
      formData.append("file", file);

      Swal.fire({
        title: "Uploading...",
        text: "Please wait while we import your Excel file.",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });

      try {
        const res = await axiosInstance.post(
          "/api/product_prices/import-prices",
          formData,
          { headers: { "Content-Type": "multipart/form-data" } }
        );

        Swal.fire({
          icon: "success",
          title: "Import Successful!",
          html: `<strong>${res.data.count} records processed.</strong>`,
        });

        // Refresh products after import
        await refreshProducts();
      } catch (error) {
        console.error("Excel import error:", error);

        Swal.fire({
          icon: "error",
          title: "Import Failed",
          text: error.response?.data?.message || "Error processing Excel file",
        });
      }
    };

    input.click();
  };

  // Removed generic error display as Swal handles errors

  return (
    <div className="main-wrapper">
      <div className="page-wrapper">
        <div className="content">
          <PageHeader
            title="Product Management"
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
              searchTerm={searchQuery}
              onSearchChange={handleSearch}
              onSort={handleSort}
              sortConfig={sortConfig}
              view="list"
              onViewChange={() => { }}
              showExport={false}
              showSort={true}
              showAddButton={true}
              addButtonText="Add Product Price"
              addButtonLink="ProductList/AddProduct"
              showViewToggle={false}
            />

            <div className="card-body">
              <div className="table-responsive">
                {" "}
                {/* Removed mt-3 */}
                <div className="horizontal-scroll-container" style={{ overflowX: "auto" }}>
                  <table className="table table-striped table-bordered table-hover">
                    {" "}
                    {/* Added hover */}
                    <thead>
                      <tr className="table-light">
                        {" "}
                        {/* Added header style */}
                        <th>Name</th>
                        <th>CAS No</th>
                        <th>HSN Code</th>
                        <th>Company</th>
                        <th>Price</th>
                        <th>Quantity</th>
                        <th>Unit</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Map over paginatedRows */}
                      {paginatedRows.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="text-center p-4 text-muted">
                            {" "}
                            {/* Consistent styling */}
                            {searchQuery
                              ? "No matching products found."
                              : "No products available."}
                          </td>
                        </tr>
                      ) : (
                        paginatedRows.map((row) => {
                          // Use the unique key generated during flattening
                          if (row.type === "productOnly") {
                            const product = row.product;
                            return (
                              <tr key={row.key}>
                                {" "}
                                {/* Use pre-generated key */}
                                <td>{product.product_name}</td>
                                <td>{product.cas_number || "N/A"}</td>
                                <td
                                  colSpan="5"
                                  className="text-muted text-center"
                                >
                                  No price information
                                </td>
                                <td>
                                  <Link
                                    className="btn btn-success btn-sm me-1"
                                    to={`/dashboard/ProductList/AddProduct?productId=${product.id}`} // Use absolute path and pass productId as query param
                                    title="Add Price"
                                  >
                                    Add Price
                                  </Link>
                                </td>
                              </tr>
                            );
                          } else if (row.type === "productWithPrice") {
                            const product = row.product;
                            const price = row.price;
                            return (
                              <tr key={row.key}>
                                {" "}
                                {/* Use pre-generated key */}
                                <td>{product.product_name}</td>
                                <td>{product.cas_number || "N/A"}</td>
                                <td>{product.product_code || "N/A"}</td>
                                <td>{price.company || "N/A"}</td>
                                <td>
                                  {price.currency === 'USD' ? '$' : '₹'}{price.price != null ? price.price : "N/A"}
                                </td>
                                <td>
                                  {price.quantity != null
                                    ? price.quantity
                                    : "N/A"}
                                </td>
                                <td>{price.unit || "mg"}</td>
                                <td>
                                  <Link
                                    className="btn btn-warning btn-sm me-1"
                                    to={`EditProductPrice/${price.id}`}
                                    title="Edit Price"
                                  >
                                    {/* <i className="ti ti-pencil"></i> */} Edit
                                    Price {/* Kept original text */}
                                  </Link>
                                  <button
                                    className="btn btn-danger btn-sm"
                                    onClick={() =>
                                      handleDeletePrice(product.id, price.id)
                                    }
                                    title="Delete Price"
                                  >
                                    {/* <i className="ti ti-trash"></i> */} Delete
                                    Price {/* Kept original text */}
                                  </button>
                                </td>
                              </tr>
                            );
                          }
                          return null; // Should not happen
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* --- Render Pagination --- */}
              {!loading && totalPages > 0 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                  itemsPerPage={itemsPerPage}
                  totalItems={flattenedFilteredProducts.length} // Total based on flattened rows
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProductList;
