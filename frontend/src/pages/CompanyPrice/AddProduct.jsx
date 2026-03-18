import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import axiosInstance from "../../apis/axiosConfig";
import Swal from "sweetalert2";

function AddProduct() {
  const [products, setProducts] = useState([]); // fetched products
  const [productName, setProductName] = useState(""); // selected product
  const [selectedProduct, setSelectedProduct] = useState(null); // selected product object
  const [companies, setCompanies] = useState([
    { company: "", pricing: [{ price: "", currency: "INR", quantity: "", unit: "mg" }] },
  ]);
  const navigate = useNavigate();

  // Fetch all products on component mount
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await axiosInstance.get("/api/products", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        setProducts(response.data.data);
      } catch (error) {
        console.error(
          "Error fetching products:",
          error.response?.data || error
        );
      }
    };

    fetchProducts();
  }, []);

  // If navigation passed a productId via query params, preselect that product
  const location = useLocation();
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const productId = params.get("productId");
    if (productId && products.length > 0) {
      const selected = products.find((p) => String(p.id) === String(productId));
      if (selected) {
        setProductName(selected.product_name);
        setSelectedProduct(selected);
      }
    }
  }, [location.search, products]);

  // Company & pricing handlers
  const handleCompanyChange = (index, value) => {
    const newCompanies = [...companies];
    newCompanies[index].company = value;
    setCompanies(newCompanies);
  };

  const handlePricingChange = (companyIndex, priceIndex, field, value) => {
    const newCompanies = [...companies];
    newCompanies[companyIndex].pricing[priceIndex][field] = value;
    setCompanies(newCompanies);
  };

  const addCompany = () => {
    setCompanies([
      ...companies,
      { company: "", pricing: [{ price: "", currency: "INR", quantity: "", unit: "mg" }] },
    ]);
  };

  const removeCompany = (index) => {
    setCompanies(companies.filter((_, i) => i !== index));
  };

  const addPriceRow = (companyIndex) => {
    const newCompanies = [...companies];
    newCompanies[companyIndex].pricing.push({
      price: "",
      currency: "INR",
      quantity: "",
      unit: "mg",
    });
    setCompanies(newCompanies);
  };

  const removePriceRow = (companyIndex, priceIndex) => {
    const newCompanies = [...companies];
    newCompanies[companyIndex].pricing.splice(priceIndex, 1);
    setCompanies(newCompanies);
  };

  // Handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axiosInstance.post(
        "/api/product_prices",
        {
          productName,
          companies,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      // Show SweetAlert success message
      Swal.fire({
        icon: "success",
        title: "Success",
        text: "Product prices added successfully!",
        confirmButtonText: "OK",
      }).then(() => {
        navigate("/dashboard/ProductList");
      });
    } catch (error) {
      console.error(
        "Error adding product prices:",
        error.response?.data || error
      );

      // Optional: Show error alert
      Swal.fire({
        icon: "error",
        title: "Error",
        text: error.response?.data?.message || "Failed to add product prices",
      });
    }
  };

  return (
    <div className="page-wrapper">
      <div className="content" style={{ backgroundColor: "#fff" }}>
        <h2>Add Product Prices</h2>
        <form onSubmit={handleSubmit}>
          {/* Product Selection */}
          <div className="mb-3">
            <label>Product Name</label>
            <select
              className="form-control"
              value={productName}
              onChange={(e) => {
                setProductName(e.target.value);
                const selected = products.find(
                  (p) => p.product_name === e.target.value
                );
                setSelectedProduct(selected || null);
              }}
              required
            >
              <option value="">Select Product</option>
              {products.map((product) => (
                <option key={product.id} value={product.product_name}>
                  {product.product_name}
                </option>
              ))}
            </select>
          </div>

          {/* CAS Number Display */}
          <div className="mb-3">
            <label>CAS No</label>
            <input
              type="text"
              className="form-control"
              value={selectedProduct?.cas_number || "N/A"}
              readOnly
              style={{ backgroundColor: "#f8f9fa" }}
            />
          </div>

          {/* Companies Section */}
          {companies.map((comp, cIdx) => (
            <div key={cIdx} className="mb-4 p-3 border rounded">
              {/* Company Name */}
              <div className="mb-3 d-flex align-items-center justify-content-between">
                <div className="w-75">
                  <label>Company Name</label>
                  <input
                    type="text"
                    className="form-control"
                    value={comp.company}
                    onChange={(e) => handleCompanyChange(cIdx, e.target.value)}
                    required
                  />
                </div>
                {companies.length > 1 && (
                  <button
                    type="button"
                    className="btn btn-outline-danger ms-2 mt-4"
                    onClick={() => removeCompany(cIdx)}
                  >
                    Remove Company
                  </button>
                )}
              </div>

              {/* Pricing Rows */}
              {comp.pricing.map((p, pIdx) => (
                <div key={pIdx} className="row g-2 mb-2 align-items-end">
                  <div className="col-4">
                    <label className="form-label small text-muted">
                      Price
                    </label>
                    <div className="input-group input-group-sm">
                      <select
                        className="form-select form-select-sm shadow-none"
                        style={{ maxWidth: "65px", padding: "0.25rem 0.5rem" }}
                        value={p.currency || "INR"}
                        onChange={(e) =>
                          handlePricingChange(cIdx, pIdx, "currency", e.target.value)
                        }
                      >
                        <option value="INR">₹</option>
                        <option value="USD">$</option>
                      </select>
                      <input
                        type="number"
                        className="form-control"
                        value={p.price}
                        onChange={(e) =>
                          handlePricingChange(cIdx, pIdx, "price", e.target.value)
                        }
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                        required
                      />
                    </div>
                  </div>
                  <div className="col-4">
                    <label className="form-label small text-muted">
                      Quantity
                    </label>
                    <input
                      type="number"
                      className="form-control form-control-sm"
                      value={p.quantity}
                      onChange={(e) =>
                        handlePricingChange(
                          cIdx,
                          pIdx,
                          "quantity",
                          e.target.value
                        )
                      }
                      placeholder="0"
                      min="0"
                      required
                    />
                  </div>
                  <div className="col-3">
                    <label className="form-label small text-muted">Unit</label>
                    <select
                      className="form-select form-select-sm"
                      value={p.unit}
                      onChange={(e) =>
                        handlePricingChange(cIdx, pIdx, "unit", e.target.value)
                      }
                      required
                    >
                      <option value="mg">mg</option>
                      <option value="gm">gm</option>
                      <option value="ml">ml</option>
                      <option value="kg">kg</option>
                      <option value="ltr">ltr</option>
                    </select>
                  </div>

                  <div className="col-1">
                    {comp.pricing.length > 1 && (
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        onClick={() => removePriceRow(cIdx, pIdx)}
                      >
                        &times;
                      </button>
                    )}
                  </div>
                </div>
              ))}

              <button
                type="button"
                className="btn btn-outline-primary btn-sm"
                onClick={() => addPriceRow(cIdx)}
              >
                Add Another Price
              </button>
            </div>
          ))}

          {/* Add Company */}
          <div className="mb-3">
            <button
              type="button"
              className="btn btn-outline-primary"
              onClick={addCompany}
            >
              Add Another Company
            </button>
          </div>

          {/* Submit */}
          <button type="submit" className="btn btn-primary">
            Add Product Prices
          </button>
          <Link to="/dashboard/ProductList" className="btn btn-secondary ms-2">
            Back
          </Link>
        </form>
      </div >
    </div >
  );
}

export default AddProduct;
