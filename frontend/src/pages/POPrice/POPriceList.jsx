import React, { useState, useEffect, useMemo, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import * as XLSX from "xlsx";

import axiosInstance from "../../apis/axiosConfig";
import Pagination from "../../components/Common/Pagination";
import PageHeader from "../../components/Common/PageHeader";
import PageFilters from "../../components/Common/PageFilters";

// ─── Excel parser helpers ───────────────────────────────────────────
const UNIT_MAP = {
  mg: "mg",
  gm: "gm",
  g: "gm",
  gram: "gm",
  grams: "gm",
  ml: "ml",
  kg: "kg",
  ltr: "ltr",
  l: "ltr",
  litre: "ltr",
  liter: "ltr",
  mcg: "mcg",
  ug: "mcg",
};

/** Strip Indian / international commas: "1,10,000" → 110000 */
const stripCommas = (v) => String(v).replace(/,/g, "");

/**
 * Parse a Qty cell. Supported formats:
 *   "2*1000 mg"              → { unitQty: 1000, multiplier: 2, unit: "mg" }
 *   "25 mg*2"                → { unitQty: 25,   multiplier: 2, unit: "mg" }
 *   "50mgx3=150mg"           → { unitQty: 50,   multiplier: 3, unit: "mg" }
 *   "25 mg*10 vials =250 mg" → { unitQty: 25,   multiplier: 10, unit: "mg" }
 *   "10 mg+90 mg = 100 mg"   → { unitQty: 100,  multiplier: 1, unit: "mg" }
 *   "150mg+30mg+20mg"        → { unitQty: 200,  multiplier: 1, unit: "mg" }
 *   "2*100 mg+50 mg+10 mg"   → { unitQty: 260,  multiplier: 1, unit: "mg" }
 *   "10 mg"                  → { unitQty: 10,   multiplier: 1, unit: "mg" }
 */
const parseQty = (raw) => {
  if (!raw) return null;
  let s = String(raw).trim().toLowerCase();

  // Strip "= 50 mg" suffix (e.g. "25 mg*2 = 50 mg" → "25 mg*2")
  s = s.replace(/\s*=.*$/, "").trim();
  // Normalize: treat "x" as "*" (e.g. "50mgx3")
  s = s.replace(/x/g, "*");
  // Normalize: treat "&" as "+" (e.g. "10 mg * 2 Vial & 20 mg * 2 vail")
  s = s.replace(/&/g, "+");
  // Remove "vials" / "vial" / "vail" (e.g. "25 mg*10 vials")
  s = s.replace(/\bvials?\b/gi, "").replace(/\bvail\b/gi, "").trim();

  // ── 1) Try simple multiply: A * B unit  (e.g. "2*1000 mg")
  const m1 = s.match(/^(\d+(?:\.\d+)?)\s*\*\s*(\d+(?:\.\d+)?)\s*([a-z]+)$/);
  if (m1) {
    const a = parseFloat(m1[1]);
    const b = parseFloat(m1[2]);
    const unit = UNIT_MAP[m1[3]];
    if (!unit) return null;
    const multiplier = Math.min(a, b);
    const unitQty = Math.max(a, b);
    return { unitQty, multiplier, unit };
  }

  // ── 2) Try: A unit * B  (e.g. "25 mg*2")
  const m2 = s.match(/^(\d+(?:\.\d+)?)\s*([a-z]+)\s*\*\s*(\d+(?:\.\d+)?)$/);
  if (m2) {
    const unitQty = parseFloat(m2[1]);
    const unit = UNIT_MAP[m2[2]];
    const multiplier = parseFloat(m2[3]);
    if (!unit) return null;
    return { unitQty, multiplier, unit };
  }
  // ── 2b) Try: A unit * B unit (e.g. "10 mg*100 mg") → treat as multiplication
  const m2b = s.match(/^(\d+(?:\.\d+)?)\s*([a-z]+)\s*\*\s*(\d+(?:\.\d+)?)\s*([a-z]+)$/);
  if (m2b) {
    const a = parseFloat(m2b[1]);
    const unitA = UNIT_MAP[m2b[2]];
    const b = parseFloat(m2b[3]);
    const unitB = UNIT_MAP[m2b[4]];
    const unit = unitA || unitB;
    if (!unit) return null;
    const multiplier = Math.min(a, b);
    const unitQty = Math.max(a, b);
    return { unitQty, multiplier, unit };
  }

  // ── 3) Addition format: "10 mg+90 mg" or "150mg+30mg+20mg" or "2*100 mg+50 mg"
  if (s.includes("+")) {
    // Split on "+" and sum all parts
    const parts = s.split("+");
    let total = 0;
    let detectedUnit = null;

    for (const part of parts) {
      const p = part.trim();
      // Each part can be "2*100 mg" or "100mg" or "50 mg"
      const mulMatch = p.match(/^(\d+(?:\.\d+)?)\s*\*\s*(\d+(?:\.\d+)?)\s*([a-z]+)$/);
      if (mulMatch) {
        const a = parseFloat(mulMatch[1]);
        const b = parseFloat(mulMatch[2]);
        const u = UNIT_MAP[mulMatch[3]];
        if (!u) return null;
        detectedUnit = u;
        total += a * b;
        continue;
      }
      const simpleMatch = p.match(/^(\d+(?:\.\d+)?)\s*([a-z]+)$/);
      if (simpleMatch) {
        total += parseFloat(simpleMatch[1]);
        const u = UNIT_MAP[simpleMatch[2]];
        if (u) detectedUnit = u;
        continue;
      }
      // A unit * B (e.g. "10 mg * 2")
      const unitMulMatch = p.match(/^(\d+(?:\.\d+)?)\s*([a-z]+)\s*\*\s*(\d+(?:\.\d+)?)$/);
      if (unitMulMatch) {
        const qty = parseFloat(unitMulMatch[1]);
        const u = UNIT_MAP[unitMulMatch[2]];
        const mul = parseFloat(unitMulMatch[3]);
        if (u) detectedUnit = u;
        total += qty * mul;
        continue;
      }
      // Just a number
      const numMatch = p.match(/^(\d+(?:\.\d+)?)$/);
      if (numMatch) {
        total += parseFloat(numMatch[1]);
        continue;
      }
    }

    if (detectedUnit && total > 0) {
      return { unitQty: total, multiplier: 1, unit: detectedUnit };
    }
    return null;
  }

  // ── 4) Simple: "10 mg" or "2 g"
  const m3 = s.match(/^(\d+(?:\.\d+)?)\s*([a-z]+)$/);
  if (m3) {
    const unitQty = parseFloat(m3[1]);
    const unit = UNIT_MAP[m3[2]];
    if (!unit) return null;
    return { unitQty, multiplier: 1, unit };
  }

  // ── 5) Number only (no unit): "1000" → default to mg
  const m4 = s.match(/^(\d+(?:\.\d+)?)$/);
  if (m4) {
    return { unitQty: parseFloat(m4[1]), multiplier: 1, unit: "mg" };
  }

  return null;
};


const parseExcelRows = (worksheet) => {
  const jsonRows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
  const parsed = [];

  for (const row of jsonRows) {
    const productName =
      row["Name of Product"] || row["Product Name"] || row["product_name"] || "";
    const casNo =
      row["CAS No."] || row["CAS No"] || row["cas_number"] || row["CAS"] || "";
    const qtyRaw = row["Qty."] || row["Qty"] || row["quantity"] || "";
    const orderValueRaw =
      row["Order Value"] || row["order_value"] || row["Price"] || "";

    if (!productName) continue;

    const qtyParsed = parseQty(qtyRaw);
    if (!qtyParsed) {
      console.warn("⚠️ Skipped (unknown qty format):", productName, "| Qty:", qtyRaw);
      continue;
    }

    const orderValue = parseFloat(stripCommas(String(orderValueRaw))) || 0;

    const unitPrice = orderValue > 0 ? orderValue / qtyParsed.multiplier : 0;

    const casClean =
      !casNo || casNo === "NA" || casNo === "N/A" ? "" : String(casNo).trim();

    parsed.push({
      product_name: String(productName).trim(),
      cas_number: casClean,
      quantity: qtyParsed.unitQty,
      quantity_unit: qtyParsed.unit,
      po_price: Math.round(unitPrice * 100) / 100,
    });
  }

  return parsed;
};
// ─── End helpers ────────────────────────────────────────────────────

const POPriceList = () => {
  const navigate = useNavigate();
  const [poPrices, setPoPrices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({
    key: "createdAt",
    direction: "descending",
  });

  // Excel upload
  const fileInputRef = useRef(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [previewRows, setPreviewRows] = useState([]);
  const [showPreview, setShowPreview] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Fetch PO Prices from API
  const fetchPoPrices = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axiosInstance.get("/api/poPrice", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setPoPrices(response.data.data || []);
      setCurrentPage(1);
    } catch (error) {
      console.error("Error fetching PO prices:", error);
      Swal.fire({
        icon: "error",
        title: "Fetch Error",
        text: error.response?.data?.message || "Failed to fetch PO prices.",
      });
    } finally {
      setLoading(false);
    }
  };

  // Memoized processing: Filter -> Sort
  const processedPoPrices = useMemo(() => {
    let prices = [...poPrices];
    const lowerSearchTerm = searchTerm.toLowerCase();
    if (lowerSearchTerm) {
      prices = prices.filter(
        (price) =>
          price.product_name?.toLowerCase().includes(lowerSearchTerm) ||
          price.cas_no?.toLowerCase().includes(lowerSearchTerm)
      );
    }
    if (sortConfig.key) {
      prices.sort((a, b) => {
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
    return prices;
  }, [poPrices, searchTerm, sortConfig]);

  const paginatedPoPrices = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return processedPoPrices.slice(startIndex, startIndex + itemsPerPage);
  }, [processedPoPrices, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(processedPoPrices.length / itemsPerPage);

  const handlePageChange = (pageNumber) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
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

  const handleSearch = (event) => {
    setSearchTerm(event.target.value);
    setCurrentPage(1);
  };

  // Delete PO Price
  const handleDelete = async (id) => {
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
        const token = localStorage.getItem("token");
        await axiosInstance.delete(`/api/poPrice/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        Swal.fire("Deleted!", "PO Price has been deleted.", "success");
        setPoPrices((prev) => prev.filter((price) => price.id !== id));
      } catch (error) {
        console.error("Delete Error:", error);
        Swal.fire(
          "Error",
          error.response?.data?.message || "Failed to delete PO price",
          "error"
        );
      }
    }
  };

  // ─── Excel upload handlers ────────────────────────────────────────
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const ws = workbook.Sheets[workbook.SheetNames[0]];
        const rows = parseExcelRows(ws);

        if (rows.length === 0) {
          Swal.fire("Warning", "No valid rows found in the Excel file.", "warning");
          return;
        }

      // Valid file parsed, close the "Instructions" modal and show the "Preview" modal
      setShowUploadModal(false);
      setPreviewRows(rows);
      setShowPreview(true);
    } catch (err) {
      console.error("Excel parse error:", err);
      Swal.fire("Error", "Failed to parse the Excel file.", "error");
    }
  };
  reader.readAsArrayBuffer(file);
  // reset so same file can be re-selected
  e.target.value = "";
};

  const handleConfirmUpload = async () => {
    setUploading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axiosInstance.post(
        "/api/poPrice/bulk-upload",
        { rows: previewRows },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const { inserted, updated, skipped } = res.data;
      Swal.fire(
        "Upload Complete",
        `${inserted} inserted, ${updated} updated, ${skipped} skipped.`,
        "success"
      );

      setShowPreview(false);
      setPreviewRows([]);
      fetchPoPrices(); // refresh list
    } catch (err) {
      console.error("Bulk upload error:", err);
      Swal.fire(
        "Error",
        err.response?.data?.message || "Bulk upload failed.",
        "error"
      );
    } finally {
      setUploading(false);
    }
  };

  const handleCancelPreview = () => {
    setShowPreview(false);
    setPreviewRows([]);
  };

  const handleDownloadFormat = () => {
    const ws = XLSX.utils.json_to_sheet([
      {
        "Product Name": "Example Product",
        "CAS No.": "123-45-6",
        "Qty.": "100 mg",
        "Order Value": 1500,
      },
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "PO_Price_Format");
    XLSX.writeFile(wb, "PO_Price_Upload_Format.xlsx");
  };
  // ─── End Excel upload handlers ────────────────────────────────────

  useEffect(() => {
    fetchPoPrices();
  }, []);

  return (
    <div className="main-wrapper">
      <div className="page-wrapper">
        <div className="content">
          <PageHeader
            title="PO Price Management"
            onRefresh={fetchPoPrices}
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
              addButtonText="Add PO Price"
              addButtonLink="po-price/add"
              showExport={false}
              showSort={true}
              showAddButton={true}
              showViewToggle={false}
              showHorizontalScrollButtons={false}
            />

            {/* Upload Excel button */}
            <div className="d-flex justify-content-end px-3 mb-2">
              <input
                type="file"
                accept=".xlsx,.xls"
                ref={fileInputRef}
                style={{ display: "none" }}
                onChange={handleFileChange}
              />
              <button
                className="btn btn-success btn-sm"
                onClick={() => setShowUploadModal(true)}
              >
                📤 Upload Excel
              </button>
            </div>

            <div className="card-body">
              {loading ? (
                <div className="text-center mt-4">
                  <span className="spinner-border spinner-border-sm me-2"></span>{" "}
                  Loading PO prices...
                </div>
              ) : (
                <>
                  <div style={{ overflowX: "auto" }}>
                    <table className="table table-striped table-bordered">
                      <thead>
                        <tr className="table-light">
                          <th>Sr. No</th>
                          <th>Product Name</th>
                          <th>CAS No</th>
                          <th>Quantity</th>
                          <th>Unit Price</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedPoPrices.length === 0 ? (
                          <tr>
                            <td
                              colSpan="6"
                              className="text-center p-4 text-muted"
                            >
                              {processedPoPrices.length > 0
                                ? "No PO prices found for this page."
                                : "No PO prices found."}
                            </td>
                          </tr>
                        ) : (
                          paginatedPoPrices.map((price, index) => (
                            <tr key={price.id}>
                              <td>
                                {(currentPage - 1) * itemsPerPage + index + 1}
                              </td>

                              <td
                                title={price.product_name}
                                style={{
                                  maxWidth: "200px",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {price.product_name}
                              </td>

                              <td>{price.cas_number}</td>

                              <td>
                                {price.quantity} {price.quantity_unit}
                              </td>

                              <td>₹{price.po_price}</td>

                              <td>
                                <div className="d-flex gap-1">
                                  <Link
                                    to={`edit/${price.id}`}
                                    className="btn btn-warning btn-sm"
                                  >
                                    Edit
                                  </Link>
                                  <button
                                    className="btn btn-danger btn-sm"
                                    onClick={() => handleDelete(price.id)}
                                  >
                                    Delete
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
                      totalItems={processedPoPrices.length}
                    />
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Upload Instructions Modal ─────────────────────────────────────────── */}
      {showUploadModal && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Upload PO Price Excel</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowUploadModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <p>Please upload an Excel file with the following columns:</p>
                <div className="table-responsive">
                  <table className="table table-bordered table-sm text-center">
                    <thead className="table-success">
                      <tr>
                        <th>Product Name</th>
                        <th>CAS No.</th>
                        <th>Qty.</th>
                        <th>Order Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="text-muted small">Required</td>
                        <td className="text-muted small">Optional</td>
                        <td className="text-muted small">e.g. 100 mg</td>
                        <td className="text-muted small">Total amount</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="text-center mt-3 d-flex justify-content-center gap-2">
                  <button
                    className="btn btn-outline-success"
                    onClick={handleDownloadFormat}
                  >
                    ⬇️ Download Format
                  </button>
                  <button
                    className="btn btn-success text-white"
                    onClick={() => fileInputRef.current.click()}
                  >
                    Browse & Upload File
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Preview Modal ─────────────────────────────────────────── */}
      {showPreview && (
        <div
          className="modal fade show d-block"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-lg modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  Preview Upload ({previewRows.length} rows)
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={handleCancelPreview}
                ></button>
              </div>
              <div className="modal-body">
                <div style={{ overflowX: "auto" }}>
                  <table className="table table-bordered table-sm">
                    <thead className="table-light">
                      <tr>
                        <th>Sr No</th>
                        <th>Product Name</th>
                        <th>CAS No</th>
                        <th>Qty</th>
                        <th>Unit</th>
                        <th>Unit Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((row, i) => (
                        <tr key={i}>
                          <td>{i + 1}</td>
                          <td
                            title={row.product_name}
                            style={{
                              maxWidth: "200px",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {row.product_name}
                          </td>
                          <td>{row.cas_number || "-"}</td>
                          <td>{row.quantity}</td>
                          <td>{row.quantity_unit}</td>
                          <td>₹{row.po_price}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-success"
                  onClick={handleConfirmUpload}
                  disabled={uploading}
                >
                  {uploading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-1"></span>
                      Uploading...
                    </>
                  ) : (
                    "Confirm Upload"
                  )}
                </button>
                <button
                  className="btn btn-danger"
                  onClick={handleCancelPreview}
                  disabled={uploading}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default POPriceList;
