import React, { useState, useEffect, useMemo, useRef } from "react";
import axiosInstance from "../../apis/axiosConfig";
import Swal from "sweetalert2";
import * as XLSX from "xlsx";
import PageFilters from "../../components/Common/PageFilters";
import Pagination from "../../components/Common/Pagination";
import PageHeader from "../../components/Common/PageHeader";

const ProductMaster = () => {
  const [products, setProducts] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  const [formData, setFormData] = useState({
    product_name: "",
    cas_number: "",
    hsn_code: "",
    stock: "",
    stock_unit: "",
    status: "active",
  });
  const [message, setMessage] = useState("");
  const [sortConfig, setSortConfig] = useState({
    key: "",
    direction: "ascending",
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    fetchProducts();
  }, []);

  // ✅ Fetch all products
  const fetchProducts = async () => {
    try {
      const response = await axiosInstance.get("/api/products");
      setProducts(response.data.data || []);
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  const handleSort = (key) => {
    let direction = "ascending";
    if (sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending";
    }
    setSortConfig({ key, direction });
  };

  const fileInputRef = React.useRef(null);
  const stockFileInputRef = React.useRef(null);
  const filteredProducts = useMemo(() => {
    if (!searchQuery) return products;

    const q = searchQuery.toLowerCase();
    return products.filter(
      (p) =>
        p.product_name?.toLowerCase().includes(q) ||
        p.cas_number?.toLowerCase().includes(q) ||
        p.product_code?.toLowerCase().includes(q),
    );
  }, [products, searchQuery]);

  // ✅ Pagination
  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredProducts, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // ✅ Add new product
  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      const response = await axiosInstance.post("/api/products", formData);
      setMessage("Product added successfully");
      fetchProducts();
      setShowAddModal(false);
      setFormData({
        product_name: "",
        cas_number: "",
        hsn_code: "",
        stock: "",
        stock_unit: "",
        status: "active",
      });
    } catch (error) {
      console.error("Error adding product:", error);
      setMessage(error.response?.data?.message || "Error adding product");
    }
  };

  // ✅ Open edit modal
  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      product_name: product.product_name,
      cas_number: product.cas_number,
      hsn_code: product.product_code,
      stock: product.stock || "",
      stock_unit: product.stock_unit || "",
      status: product.status,
    });
    setShowEditModal(true);
  };

  // ✅ Update product
  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await axiosInstance.put(`/api/products/${editingProduct.id}`, formData);
      setMessage("Product updated successfully");
      fetchProducts();
      setShowEditModal(false);
      setEditingProduct(null);
    } catch (error) {
      console.error("Error updating product:", error);
      setMessage(error.response?.data?.message || "Error updating product");
    }
  };

  // ✅ Delete product
  const handleDelete = async (id) => {
    if (window.confirm("Are you sure?")) {
      try {
        await axiosInstance.delete(`/api/products/${id}`);
        setMessage("Product deleted successfully");
        fetchProducts();
      } catch (error) {
        console.error("Error deleting product:", error);
        setMessage(error.response?.data?.message || "Error deleting product");
      }
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleImportClick = () => {
    fileInputRef.current.click();
  };

  const handleFileUpload = async (e) => {
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
      const res = await axiosInstance.post("/api/products/import", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      Swal.fire({
        icon: "success",
        title: "Import Successful!",
        html: `
        <b>Created:</b> ${res.data.createdProducts}<br/>
      `,
      });

      setMessage("Products imported successfully");
      fetchProducts();
    } catch (error) {
      console.error("Import error:", error);
      Swal.fire({
        icon: "error",
        title: "Import Failed",
        text: error.response?.data?.message || "Error importing products",
      });
      setMessage("Failed to import products");
    } finally {
      // Reset input so same file can be uploaded again if needed
      e.target.value = "";
    }
  };

  const handleStockImportClick = () => {
    setShowStockModal(true);
  };

  const handleDownloadStockFormat = () => {
    const ws = XLSX.utils.json_to_sheet([
      {
        "FINAL GOODS": "Example Product",
        "CAS NO.": "123-45-6",
        "GM": "",
        "MG": 100,
        "ML": "",
        "LTR": "",
        "KG": "",
      },
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Stock_Format");
    XLSX.writeFile(wb, "Product_Stock_Upload_Format.xlsx");
  };

  const handleStockFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    setShowStockModal(false);

    Swal.fire({
      title: "Uploading Stock...",
      text: "Please wait while we update stock from the Excel file.",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    try {
      const res = await axiosInstance.post("/api/products/import-stock", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      Swal.fire({
        icon: "success",
        title: "Stock Import Successful!",
        html: `
          <b>Updated:</b> ${res.data.updated}<br/>
          <b>Not Found:</b> ${res.data.notFound}<br/>
          <b>Skipped:</b> ${res.data.skipped}<br/>
          <b>Total Rows:</b> ${res.data.total}
        `,
      });

      fetchProducts();
    } catch (error) {
      console.error("Stock import error:", error);
      Swal.fire({
        icon: "error",
        title: "Stock Import Failed",
        text: error.response?.data?.message || "Error importing stock",
      });
    } finally {
      e.target.value = "";
    }
  };

  return (
    <div className="page-wrapper">
      <div className="content">
        <h4 className="page-title">Product Master</h4>
        {message && <div className="alert alert-success">{message}</div>}

        <PageFilters
          searchTerm={searchQuery}
          onSearchChange={(e) => setSearchQuery(e.target.value)}
          onSort={handleSort}
          sortConfig={sortConfig}
          showSort={false}
          showExport={false}
          showAddButton={true}
          addButtonText="Add Product"
          onAddClick={() => setShowAddModal(true)}
          showViewToggle={false}
        />

        <div className="d-flex justify-content-between align-items-center mb-3">
          <div className="d-flex gap-2">
            <button className="btn btn-success" onClick={handleImportClick}>
              Import Product
            </button>
            <button className="btn btn-info text-white" onClick={handleStockImportClick}>
              Upload Stock
            </button>
          </div>
          <input
            type="file"
            accept=".xlsx,.xls"
            ref={fileInputRef}
            style={{ display: "none" }}
            onChange={handleFileUpload}
          />
          <input
            type="file"
            accept=".xlsx,.xls"
            ref={stockFileInputRef}
            style={{ display: "none" }}
            onChange={handleStockFileUpload}
          />
          <button
            className="btn btn-primary"
            onClick={() => setShowAddModal(true)}
          >
            + Add Product
          </button>
        </div>

        {/* ✅ Products Table */}
        <div className="table-responsive">
        <div className="horizontal-scroll-container" style={{ overflowX: "auto" }}>
          <table className="table table-bordered table-hover align-middle">
            <thead className="table-light">
              <tr>
                <th>Product Name</th>
                <th>CAS Number</th>
                <th>HSN Code</th>
                <th>Stock</th>
                <th>Status</th>
                <th width="140">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedProducts.length > 0 ? (
                paginatedProducts.map((product) => (
                  <tr key={product.id}>
                    <td>{product.product_name}</td>
                    <td>{product.cas_number}</td>
                    <td>{product.product_code}</td>
                    <td>
                      {product.stock
                        ? `${product.stock}${product.stock_unit ? `(${product.stock_unit})` : ""}`
                        : "-"}
                    </td>
                    <td>
                      {product.status.charAt(0).toUpperCase() +
                        product.status.slice(1)}
                    </td>
                    <td>
                      <button
                        className="btn btn-sm btn-warning me-1"
                        onClick={() => handleEdit(product)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDelete(product.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="text-center">
                    No products found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
          {totalPages > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              itemsPerPage={itemsPerPage}
              totalItems={filteredProducts.length}
            />
          )}
        </div>
      </div>

      {/* ✅ Add Product Modal */}
      {showAddModal && (
        <div
          className="modal fade show d-block"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog">
            <div className="modal-content">
              <form onSubmit={handleAdd}>
                <div className="modal-header">
                  <h5 className="modal-title">Add Product</h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setShowAddModal(false)}
                  ></button>
                </div>
                <div className="modal-body">
                  <div className="mb-3">
                    <label>Product Name</label>
                    <input
                      type="text"
                      name="product_name"
                      className="form-control"
                      value={formData.product_name}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label>CAS Number</label>
                    <input
                      type="text"
                      name="cas_number"
                      className="form-control"
                      value={formData.cas_number}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="mb-3">
                    <label>HSN Code</label>
                    <input
                      type="text"
                      name="hsn_code"
                      className="form-control"
                      value={formData.hsn_code}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="mb-3">
                    <label>Stock</label>
                    <div className="d-flex gap-2">
                      <input
                        type="text"
                        name="stock"
                        className="form-control"
                        value={formData.stock}
                        onChange={handleInputChange}
                        placeholder="Enter stock quantity"
                      />
                      <select
                        name="stock_unit"
                        className="form-control"
                        style={{ maxWidth: "120px" }}
                        value={formData.stock_unit}
                        onChange={handleInputChange}
                      >
                        <option value="">Unit</option>
                        <option value="mg">mg</option>
                        <option value="gm">gm</option>
                        <option value="ml">ml</option>
                        <option value="kg">kg</option>
                        <option value="ltr">ltr</option>
                      </select>
                    </div>
                  </div>
                  <div className="mb-3">
                    <label>Status</label>
                    <select
                      name="status"
                      className="form-control"
                      value={formData.status}
                      onChange={handleInputChange}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>
                <div className="modal-footer">
                  <button className="btn btn-primary" type="submit">
                    Add
                  </button>
                  <button
                    className="btn btn-secondary"
                    type="button"
                    onClick={() => setShowAddModal(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ✅ Edit Product Modal */}
      {showEditModal && editingProduct && (
        <div
          className="modal fade show d-block"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog">
            <div className="modal-content">
              <form onSubmit={handleUpdate}>
                <div className="modal-header">
                  <h5 className="modal-title">Edit Product</h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingProduct(null);
                    }}
                  ></button>
                </div>
                <div className="modal-body">
                  <div className="mb-3">
                    <label>Product Name</label>
                    <input
                      type="text"
                      name="product_name"
                      className="form-control"
                      value={formData.product_name}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label>CAS Number</label>
                    <input
                      type="text"
                      name="cas_number"
                      className="form-control"
                      value={formData.cas_number}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="mb-3">
                    <label>HSN Code</label>
                    <input
                      type="text"
                      name="hsn_code"
                      className="form-control"
                      value={formData.hsn_code}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="mb-3">
                    <label>Stock</label>
                    <div className="d-flex gap-2">
                      <input
                        type="text"
                        name="stock"
                        className="form-control"
                        value={formData.stock}
                        onChange={handleInputChange}
                        placeholder="Enter stock quantity"
                      />
                      <select
                        name="stock_unit"
                        className="form-control"
                        style={{ maxWidth: "120px" }}
                        value={formData.stock_unit}
                        onChange={handleInputChange}
                      >
                        <option value="">Unit</option>
                        <option value="mg">mg</option>
                        <option value="gm">gm</option>
                        <option value="ml">ml</option>
                        <option value="kg">kg</option>
                        <option value="ltr">ltr</option>
                      </select>
                    </div>
                  </div>
                  <div className="mb-3">
                    <label>Status</label>
                    <select
                      name="status"
                      className="form-control"
                      value={formData.status}
                      onChange={handleInputChange}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>
                <div className="modal-footer">
                  <button className="btn btn-primary" type="submit">
                    Update
                  </button>
                  <button
                    className="btn btn-secondary"
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingProduct(null);
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Stock Upload Modal */}
      {showStockModal && (
        <div className="modal fade show d-block" tabIndex="-1">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Upload Stock</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowStockModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <p>Please upload an Excel file with the following columns:</p>
                <div className="table-responsive">
                  <table className="table table-bordered table-sm text-center">
                    <thead className="table-warning">
                      <tr>
                        <th>FINAL GOODS</th>
                        <th>CAS NO.</th>
                        <th>GM</th>
                        <th>MG</th>
                        <th>ML</th>
                        <th>LTR</th>
                        <th>KG</th>
                      </tr>
                    </thead>
                  </table>
                </div>
                <div className="text-center mt-3 d-flex justify-content-center gap-2">
                  <button
                    className="btn btn-outline-info"
                    onClick={handleDownloadStockFormat}
                  >
                    ⬇️ Download Format
                  </button>
                  <button
                    className="btn btn-info text-white"
                    onClick={() => stockFileInputRef.current.click()}
                  >
                    Browse & Upload File
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ProductMaster;
