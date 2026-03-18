import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "../../apis/axiosConfig";
import Swal from "sweetalert2";
import PageFilters from "../../components/Common/PageFilters";
import Pagination from "../../components/Common/Pagination";
import axiosInstance from "../../apis/axiosConfig";
import BLDImg from "../../assets/img/BLD.png";
import TCIImg from "../../assets/img/TCI.png";
import AmbeedImg from "../../assets/img/AMBEED.png";
import SigmaImg from "../../assets/img/SIGMA.png";

const EmailInquiriesWorking = ({ onEmailProcessed }) => {
  console.log("EmailInquiriesWorking component loaded");

  const [emails, setEmails] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const [totalItems, setTotalItems] = useState(0);

  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [productSuggestions, setProductSuggestions] = useState({});
  const [searchTriggeredBy, setSearchTriggeredBy] = useState({});
  const searchDebounceRef = useRef({});
  const [selectedEmailDetails, setSelectedEmailDetails] = useState(null); // full email with attachments
  const IMAGE_BASE_URL = import.meta.env.VITE_IMAGE_BASE_URL;

  //Filter
  const [selectedSender, setSelectedSender] = useState("");
  const [selectedDateFilter, setSelectedDateFilter] = useState("");
  const dateFilterOptions = [
    { value: "", label: "All Dates" },
    { value: "today", label: "Today" },
    { value: "7days", label: "Last 7 Days" },
    { value: "30days", label: "Last 30 Days" },
    { value: "thisMonth", label: "This Month" },
  ];

  const senderOptions = [
    "",
    "sales@spectrasynth.com",
    "sales1@spectrasynth.com",
    "sales2@spectrasynth.com",
    "sales3@spectrasynth.com",
    "sales4@spectrasynth.com",
  ];

  const [formData, setFormData] = useState({
    customer_name: "",
    email: "",
    inquiry_number: "",
    products: [
      {
        product_name: "",
        cas_number: "",
        quantities_and_packages: [
          {
            quantity_required: "",
            quantity_unit: "mg",
            package_size: "",
          },
        ],
        product_image: null,
        company_prices: [],
        selected_company_price: null,
        product_not_found: false, // Track if product needs to be added
      },
    ],
  });
  // State for Add Product Modal
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [addProductIndex, setAddProductIndex] = useState(null);
  const [addProductPricesOnlyMode, setAddProductPricesOnlyMode] = useState(false);
  const [addProductFormData, setAddProductFormData] = useState({
    product_name: "",
    cas_number: "",
    hsn_code: "",
    status: "active",
    companies: [
      { company: "", pricing: [{ price: "", quantity: "", unit: "mg" }] },
    ],
  });
  const [addingProduct, setAddingProduct] = useState(false);

  // State for Edit Prices Modal
  const [showEditPricesModal, setShowEditPricesModal] = useState(false);
  const [editPricesIndex, setEditPricesIndex] = useState(null);
  const [editPricesFormData, setEditPricesFormData] = useState({
    product_name: "",
    companies: [
      { company: "", pricing: [{ price: "", quantity: "", unit: "mg" }] },
    ],
  });
  const [updatingPrices, setUpdatingPrices] = useState(false);
  const [editPricesAddMode, setEditPricesAddMode] = useState(false);

  // Fetch emails from API
  const fetchEmails = async (pageNumber = 1) => {
    try {
      setLoading(true);

      const response = await axios.get("/api/email", {
        params: { page: pageNumber, limit: itemsPerPage },
      });

      setEmails(response.data.emails);
      setTotalPages(response.data.totalPages);
      setTotalItems(response.data.total);
      setCurrentPage(pageNumber);
    } catch (error) {
      console.error("Error fetching emails:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmails(1);
  }, []);

  const filteredEmails = emails.filter((email) => {
    const term = searchTerm.toLowerCase();

    const matchesSearch =
      email.sender_email?.toLowerCase().includes(term) ||
      email.subject?.toLowerCase().includes(term) ||
      email.inquiry_number?.toLowerCase().includes(term);

    const matchesSender = selectedSender
      ? email.sender_email?.toLowerCase() === selectedSender.toLowerCase()
      : true;

    // 📅 Date filter logic
    let matchesDate = true;
    if (selectedDateFilter) {
      const emailDate = new Date(email.createdAt);
      const now = new Date();

      if (selectedDateFilter === "today") {
        matchesDate =
          emailDate.toDateString() === now.toDateString();
      }

      if (selectedDateFilter === "7days") {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(now.getDate() - 7);
        matchesDate = emailDate >= sevenDaysAgo;
      }

      if (selectedDateFilter === "30days") {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(now.getDate() - 30);
        matchesDate = emailDate >= thirtyDaysAgo;
      }

      if (selectedDateFilter === "thisMonth") {
        matchesDate =
          emailDate.getMonth() === now.getMonth() &&
          emailDate.getFullYear() === now.getFullYear();
      }
    }

    return matchesSearch && matchesSender && matchesDate;
  });


  // const totalItems = filteredEmails.length;
  // const totalPages = Math.ceil(totalItems / itemsPerPage);

  // const startIndex = (currentPage - 1) * itemsPerPage;
  // const paginatedEmails = filteredEmails.slice(
  //   startIndex,
  //   startIndex + itemsPerPage,
  // );

  const handlePageChange = (page) => {
    fetchEmails(page);
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleCreateInquiry = (email) => {
    console.log("Creating inquiry for email:", email);
    // Extract name from email address (e.g., "john@example.com" -> "john")
    const extractedName = email.sender_email
      ? email.sender_email
        .split("@")[0]
        .replace(".", " ")
        .replace(/\b\w/g, (l) => l.toUpperCase())
      : "Customer";

    setSelectedEmail(email);
    setSelectedEmailDetails(null);
    setFormData(prev => ({
      ...prev,
      customer_name: extractedName,
      email: email.sender_email || "",
    }));
    setShowCreateForm(true);

    // Fetch full email details including attachments
    axios
      .get(`/api/email/fetchById/${email.id}`)
      .then((res) => {
        setSelectedEmailDetails(res.data);
      })
      .catch((err) => {
        console.error("Error fetching full email details:", err);
      });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const fetchProductSuggestions = async (index, query, field = "product_name") => {
    if (!query || query.trim().length < 1) {
      setProductSuggestions((prev) => ({ ...prev, [index]: [] }));
      return;
    }

    setSearchTriggeredBy((prev) => ({ ...prev, [index]: field }));

    try {
      const res = await axiosInstance.get("/api/products/search", {
        params: { q: query.trim(), searchBy: field },
      });

      const list = Array.isArray(res.data) ? res.data : [];

      // ✅ AUTO FILL WHEN EXACT ONE CAS MATCH
      // ✅ AUTO FILL WHEN EXACT CAS MATCH (even if multiple results returned)
      if (field === "cas_number") {
        const exactMatch = list.find(
          (item) =>
            item.cas_number &&
            item.cas_number.trim() === query.trim()
        );

        if (exactMatch) {
          const updatedProducts = [...formData.products];

          updatedProducts[index] = {
            ...updatedProducts[index],
            product_name: exactMatch.product_name || "",
            cas_number:
              exactMatch.cas_number && exactMatch.cas_number !== "N/A"
                ? exactMatch.cas_number
                : "",
            product_not_found: false,
          };

          setFormData((prev) => ({
            ...prev,
            products: updatedProducts,
          }));

          // Fetch prices for matched product
          fetchCompanyPrices(index, exactMatch.product_name);

          // Close suggestion dropdown
          setProductSuggestions((prev) => ({
            ...prev,
            [index]: [],
          }));

          // 🔥 Stop debounce
          if (searchDebounceRef.current[index]) {
            clearTimeout(searchDebounceRef.current[index]);
          }

          return;
        }
      }
      // ✅ Map suggestions normally
      const mapped = list.map((p) => ({
        id: p.id,
        product_name: p.product_name || "",
        cas_number:
          p.cas_number && p.cas_number !== "N/A"
            ? p.cas_number
            : "N/A",
      }));

      setProductSuggestions((prev) => ({ ...prev, [index]: mapped }));

      // ✅ If no CAS found → mark as not found
      if (field === "cas_number" && list.length === 0) {
        const updatedProducts = [...formData.products];
        updatedProducts[index].product_not_found = true;

        setFormData((prev) => ({
          ...prev,
          products: updatedProducts,
        }));
      }
    } catch (err) {
      console.error("Failed to fetch product suggestions", err);
      setProductSuggestions((prev) => ({ ...prev, [index]: [] }));
    }
  };
  const debouncedFetchSuggestions = (index, query, field = "product_name") => {
    const key = `${index}`;
    if (searchDebounceRef.current[key]) {
      clearTimeout(searchDebounceRef.current[key]);
    }
    if (!query || query.trim().length < 1) {
      setProductSuggestions((prev) => ({ ...prev, [index]: [] }));
      return;
    }
    searchDebounceRef.current[key] = setTimeout(() => {
      fetchProductSuggestions(index, query, field);
    }, 300);
  };

  const handleProductChange = (index, field, value) => {
    console.log(
      `🔄 Changing product field: ${field} for Product ${index} to:`,
      value,
    );
    const updatedProducts = [...formData.products];
    updatedProducts[index][field] = value;

    // Debug: Log the updated product object
    console.log(`✅ Updated Product object:`, updatedProducts[index]);

    // Auto-fetch company prices when product name changes
    if (field === "product_name" && value.trim()) {
      fetchCompanyPrices(index, value.trim());
    } else if (field === "product_name" && !value.trim()) {
      // Clear prices when product name is cleared
      updatedProducts[index].company_prices = [];
      updatedProducts[index].selected_company_price = null;
    }

    setFormData((prev) => ({
      ...prev,
      products: updatedProducts,
    }));
  };

  const handleQuantityAndPackageChange = (
    productIndex,
    qpIndex,
    field,
    value,
  ) => {
    console.log(
      `🔄 Changing field: ${field} for Product ${productIndex}, QP ${qpIndex} to:`,
      value,
    );
    const updatedProducts = [...formData.products];
    updatedProducts[productIndex].quantities_and_packages[qpIndex][field] =
      value;

    // Debug: Log the updated qp object
    console.log(
      `✅ Updated QP object:`,
      updatedProducts[productIndex].quantities_and_packages[qpIndex],
    );

    setFormData((prev) => ({
      ...prev,
      products: updatedProducts,
    }));
  };

  const handleImageUpload = (index, event) => {
    const file = event.target.files[0];
    if (file) {
      const updatedProducts = [...formData.products];
      updatedProducts[index].product_image = file;
      setFormData((prev) => ({
        ...prev,
        products: updatedProducts,
      }));
    }
  };

  // Fetch company prices for a product
  const fetchCompanyPrices = async (productIndex, productName) => {
    try {
      const response = await axios.get(
        `/api/product_prices/${encodeURIComponent(productName)}`
      );

      setFormData((prev) => {
        const updatedProducts = [...prev.products];

        if (!updatedProducts[productIndex]) return prev;

        updatedProducts[productIndex] = {
          ...updatedProducts[productIndex],
          company_prices: response.data.product?.prices || [],
          selected_company_price: null,
          product_not_found: false,
        };

        return {
          ...prev,
          products: updatedProducts,
        };
      });

    } catch (error) {
      setFormData((prev) => {
        const updatedProducts = [...prev.products];

        if (!updatedProducts[productIndex]) return prev;

        if (error.response?.status === 404) {
          updatedProducts[productIndex] = {
            ...updatedProducts[productIndex],
            product_not_found: true,
            company_prices: [],
            selected_company_price: null,
          };
        } else {
          updatedProducts[productIndex] = {
            ...updatedProducts[productIndex],
            product_not_found: false,
            company_prices: [],
            selected_company_price: null,
          };
        }

        return {
          ...prev,
          products: updatedProducts,
        };
      });
    }
  };

  const handleCompanyPriceSelect = (productIndex, priceId) => {
    const updatedProducts = [...formData.products];
    const selectedPrice = updatedProducts[productIndex].company_prices.find(
      (p) => p.id === priceId,
    );
    updatedProducts[productIndex].selected_company_price = selectedPrice;
    setFormData((prev) => ({
      ...prev,
      products: updatedProducts,
    }));
  };

  // Open Add Product Modal (used for both: new product + prices, or existing product + prices only)
  const openAddProductModal = (productIndex) => {
    const product = formData.products[productIndex];
    const pricesOnly = !product.product_not_found && (!product.company_prices || product.company_prices.length === 0);
    setAddProductPricesOnlyMode(pricesOnly);
    setAddProductIndex(productIndex);
    setAddProductFormData({
      product_name: product.product_name || "",
      cas_number: product.cas_number || "",
      hsn_code: product.hsn_code || "",
      status: "active",
      companies: [
        { company: "", pricing: [{ price: "", quantity: "", unit: "mg" }] },
      ],
    });
    setShowAddProductModal(true);
  };

  // Handle Add Product Form Input Changes
  const handleAddProductInputChange = (e) => {
    const { name, value } = e.target;
    setAddProductFormData({
      ...addProductFormData,
      [name]: value,
    });
  };

  // Handle Company Changes in Add Product Modal
  const handleAddProductCompanyChange = (index, value) => {
    const newCompanies = [...addProductFormData.companies];
    newCompanies[index].company = value;
    setAddProductFormData({
      ...addProductFormData,
      companies: newCompanies,
    });
  };

  // Handle Pricing Changes in Add Product Modal
  const handleAddProductPricingChange = (
    companyIndex,
    priceIndex,
    field,
    value,
  ) => {
    const newCompanies = [...addProductFormData.companies];
    newCompanies[companyIndex].pricing[priceIndex][field] = value;
    setAddProductFormData({
      ...addProductFormData,
      companies: newCompanies,
    });
  };

  // Add Company in Add Product Modal
  const addCompanyInModal = () => {
    setAddProductFormData({
      ...addProductFormData,
      companies: [
        ...addProductFormData.companies,
        { company: "", pricing: [{ price: "", quantity: "", unit: "mg" }] },
      ],
    });
  };

  // Remove Company in Add Product Modal
  const removeCompanyInModal = (index) => {
    if (addProductFormData.companies.length > 1) {
      setAddProductFormData({
        ...addProductFormData,
        companies: addProductFormData.companies.filter((_, i) => i !== index),
      });
    }
  };

  // Add Price Row in Add Product Modal
  const addPriceRowInModal = (companyIndex) => {
    const newCompanies = [...addProductFormData.companies];
    newCompanies[companyIndex].pricing.push({
      price: "",
      quantity: "",
      unit: "mg",
    });
    setAddProductFormData({
      ...addProductFormData,
      companies: newCompanies,
    });
  };

  // Remove Price Row in Add Product Modal
  const removePriceRowInModal = (companyIndex, priceIndex) => {
    const newCompanies = [...addProductFormData.companies];
    if (newCompanies[companyIndex].pricing.length > 1) {
      newCompanies[companyIndex].pricing.splice(priceIndex, 1);
      setAddProductFormData({
        ...addProductFormData,
        companies: newCompanies,
      });
    }
  };

  // Submit Add Product (Product + Company Prices) or Add Prices Only
  const handleAddProductSubmit = async (e) => {
    e.preventDefault();
    setAddingProduct(true);

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        Swal.fire("Error", "No token provided", "error");
        return;
      }

      // Step 1: Create the product (skip if product already exists - prices only mode)
      if (!addProductPricesOnlyMode) {
        await axios.post(
          "/api/products",
          {
            product_name: addProductFormData.product_name,
            cas_number: addProductFormData.cas_number || "N/A",
            hsn_code: addProductFormData.hsn_code || "N/A",
            status: addProductFormData.status,
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );
      }

      // Step 2: Add company prices if provided
      if (
        addProductFormData.companies.some((comp) => comp.company.trim() !== "")
      ) {
        try {
          await axios.post(
            "/api/product_prices",
            {
              productName: addProductFormData.product_name,
              companies: addProductFormData.companies.filter(
                (comp) => comp.company.trim() !== "",
              ),
            },
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            },
          );
        } catch (priceError) {
          console.error("Error adding product prices:", priceError);
          // Product was created, but prices failed - show warning
          Swal.fire({
            icon: "warning",
            title: "Product Created",
            text: "Product was created but some prices may not have been added. Please check.",
            confirmButtonText: "OK",
          });
        }
      }

      // Step 3: Update the form data (for new product: set product_not_found false; for prices-only: no change)
      const updatedProducts = [...formData.products];
      if (addProductFormData.cas_number) {
        updatedProducts[addProductIndex].cas_number =
          addProductFormData.cas_number;
      }
      if (!addProductPricesOnlyMode) {
        updatedProducts[addProductIndex].product_not_found = false;
      }

      setFormData((prev) => ({
        ...prev,
        products: updatedProducts,
      }));

      // Step 4: Fetch company prices for the newly added product
      await fetchCompanyPrices(
        addProductIndex,
        addProductFormData.product_name,
      );

      // Step 5: Close modal and show success
      setShowAddProductModal(false);
      setAddProductIndex(null);
      setAddProductPricesOnlyMode(false);
      setAddProductFormData({
        product_name: "",
        cas_number: "",
        hsn_code: "",
        status: "active",
        companies: [
          { company: "", pricing: [{ price: "", quantity: "", unit: "mg" }] },
        ],
      });

      Swal.fire({
        icon: "success",
        title: "Success!",
        text: addProductPricesOnlyMode
          ? "Company prices added successfully!"
          : "Product and prices added successfully!",
        confirmButtonText: "OK",
      });
    } catch (error) {
      console.error("Error adding product:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text:
          error.response?.data?.message ||
          "Failed to add product. Please try again.",
      });
    } finally {
      setAddingProduct(false);
    }
  };

  // Open Edit Prices Modal (supports both edit existing and add new when none exist)
  const openEditPricesModal = (productIndex) => {
    console.log(
      "🔧 Opening Edit Prices Modal for product index:",
      productIndex,
    );
    const product = formData.products[productIndex];
    const hasNoPrices = !product.company_prices || product.company_prices.length === 0;
    setEditPricesAddMode(hasNoPrices);
    console.log("📦 Product data:", product);
    console.log("💰 Company prices:", product.company_prices);

    setEditPricesIndex(productIndex);

    // Convert existing prices to the format needed for editing
    const companiesMap = {};
    if (product.company_prices && product.company_prices.length > 0) {
      product.company_prices.forEach((price) => {
        // Skip PO price as it's read-only
        if (price.company === "PO Price") return;

        const key = price.company;
        if (!companiesMap[key]) {
          companiesMap[key] = {
            company: price.company,
            pricing: [],
          };
        }
        companiesMap[key].pricing.push({
          price: price.price?.toString() || "",
          quantity: price.quantity?.toString() || "",
          unit: price.unit || "mg",
          id: price.id, // Keep the ID for reference
        });
      });
    }

    const companiesArray =
      Object.values(companiesMap).length > 0
        ? Object.values(companiesMap)
        : [{ company: "", pricing: [{ price: "", quantity: "", unit: "mg" }] }];

    console.log("🏢 Companies array:", companiesArray);

    setEditPricesFormData({
      product_name: product.product_name || "",
      companies: companiesArray,
    });

    console.log("✅ Setting showEditPricesModal to true");
    setShowEditPricesModal(true);
  };

  // Handle Edit Prices Form Input Changes
  const handleEditPricesInputChange = (e) => {
    const { name, value } = e.target;
    setEditPricesFormData({
      ...editPricesFormData,
      [name]: value,
    });
  };

  // Handle Company Changes in Edit Prices Modal
  const handleEditPricesCompanyChange = (index, value) => {
    const newCompanies = [...editPricesFormData.companies];
    newCompanies[index].company = value;
    setEditPricesFormData({
      ...editPricesFormData,
      companies: newCompanies,
    });
  };

  // Handle Pricing Changes in Edit Prices Modal
  const handleEditPricesPricingChange = (
    companyIndex,
    priceIndex,
    field,
    value,
  ) => {
    const newCompanies = [...editPricesFormData.companies];
    newCompanies[companyIndex].pricing[priceIndex][field] = value;
    setEditPricesFormData({
      ...editPricesFormData,
      companies: newCompanies,
    });
  };

  // Add Company in Edit Prices Modal
  const addCompanyInEditModal = () => {
    setEditPricesFormData({
      ...editPricesFormData,
      companies: [
        ...editPricesFormData.companies,
        { company: "", pricing: [{ price: "", quantity: "", unit: "mg" }] },
      ],
    });
  };

  // Remove Company in Edit Prices Modal
  const removeCompanyInEditModal = (index) => {
    if (editPricesFormData.companies.length > 1) {
      setEditPricesFormData({
        ...editPricesFormData,
        companies: editPricesFormData.companies.filter((_, i) => i !== index),
      });
    }
  };

  // Add Price Row in Edit Prices Modal
  const addPriceRowInEditModal = (companyIndex) => {
    const newCompanies = [...editPricesFormData.companies];
    newCompanies[companyIndex].pricing.push({
      price: "",
      quantity: "",
      unit: "mg",
    });
    setEditPricesFormData({
      ...editPricesFormData,
      companies: newCompanies,
    });
  };

  // Remove Price Row in Edit Prices Modal
  const removePriceRowInEditModal = (companyIndex, priceIndex) => {
    const newCompanies = [...editPricesFormData.companies];
    if (newCompanies[companyIndex].pricing.length > 1) {
      newCompanies[companyIndex].pricing.splice(priceIndex, 1);
      setEditPricesFormData({
        ...editPricesFormData,
        companies: newCompanies,
      });
    }
  };

  // Submit Edit Prices
  const handleEditPricesSubmit = async (e) => {
    e.preventDefault();
    setUpdatingPrices(true);

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        Swal.fire("Error", "No token provided", "error");
        return;
      }

      // Use the same API endpoint - it will update existing prices
      await axios.post(
        "/api/product_prices",
        {
          productName: editPricesFormData.product_name,
          companies: editPricesFormData.companies.filter(
            (comp) => comp.company.trim() !== "",
          ),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      // Close modal
      setShowEditPricesModal(false);
      setEditPricesAddMode(false);
      const savedIndex = editPricesIndex;
      const savedProductName = editPricesFormData.product_name;

      setEditPricesIndex(null);
      setEditPricesFormData({
        product_name: "",
        companies: [
          { company: "", pricing: [{ price: "", quantity: "", unit: "mg" }] },
        ],
      });

      // Refetch company prices to show updated values
      if (savedIndex !== null && savedProductName) {
        await fetchCompanyPrices(savedIndex, savedProductName);
      }

      Swal.fire({
        icon: "success",
        title: "Success!",
        text: "Product prices updated successfully!",
        confirmButtonText: "OK",
      });
    } catch (error) {
      console.error("Error updating product prices:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text:
          error.response?.data?.message ||
          "Failed to update product prices. Please try again.",
      });
    } finally {
      setUpdatingPrices(false);
    }
  };
  const addProduct = () => {
    setFormData((prev) => ({
      ...prev,
      products: [
        ...prev.products,
        {
          product_name: "",
          cas_number: "",
          quantities_and_packages: [
            {
              quantity_required: "",
              quantity_unit: "mg",
              package_size: "",
            },
          ],
          product_image: null,
          company_prices: [],
          selected_company_price: null,
          product_not_found: false,
        },
      ],
    }));
  };

  const addQuantityAndPackage = (productIndex) => {
    const updatedProducts = [...formData.products];
    updatedProducts[productIndex].quantities_and_packages.push({
      quantity_required: "",
      quantity_unit: "mg",
      package_size: "",
    });
    setFormData((prev) => ({
      ...prev,
      products: updatedProducts,
    }));
  };

  const removeQuantityAndPackage = (productIndex, qpIndex) => {
    const updatedProducts = [...formData.products];
    if (updatedProducts[productIndex].quantities_and_packages.length > 1) {
      updatedProducts[productIndex].quantities_and_packages = updatedProducts[
        productIndex
      ].quantities_and_packages.filter((_, i) => i !== qpIndex);
      setFormData(prev => ({
        ...prev,
        products: updatedProducts,
      }));
    }
  };

  const removeProduct = (index) => {
    if (formData.products.length > 1) {
      const updatedProducts = formData.products.filter((_, i) => i !== index);
      setFormData((prev) => ({
        ...prev,
        products: updatedProducts,
      }));
    }
  };

  const extractImagesFromEmail = (emailBody) => {
    if (!emailBody) return [];
    const imgRegex = /<img[^>]+src="([^">]+)"/gi;
    const images = [];
    let match;
    while ((match = imgRegex.exec(emailBody)) !== null) {
      images.push(match[1]);
    }
    return images;
  };

  const downloadImage = async (imageSrc, filename) => {
    try {
      const link = document.createElement("a");
      link.href = imageSrc;
      link.download = filename || "email-image";
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error downloading image:", error);
      // Fallback: try to open in new tab
      window.open(imageSrc, "_blank");
    }
  };

  const downloadAllImages = async (emailImages) => {
    if (emailImages.length === 0) {
      Swal.fire("No Images", "No images found in this email.", "info");
      return;
    }

    try {
      // Download all images with a small delay between downloads
      for (let i = 0; i < emailImages.length; i++) {
        await new Promise((resolve) => setTimeout(resolve, 500)); // 500ms delay between downloads
        downloadImage(emailImages[i], `email-image-${i + 1}.jpg`);
      }
      Swal.fire("Success", "All images downloaded successfully!", "success");
    } catch (error) {
      console.error("Error downloading images:", error);
      Swal.fire(
        "Error",
        "Failed to download images. Please try again.",
        "error",
      );
    }
  };

  const createDownloadableEmailBody = (emailBody) => {
    if (!emailBody) return emailBody;

    // Replace img tags with clickable versions for download
    return emailBody.replace(
      /<img[^>]+src="([^">]+)"[^>]*>/gi,
      (match, src) => {
        const filename = `email-image-${Date.now()}-${Math.random()
          .toString(36)
          .substr(2, 9)}.jpg`;
        return `<img src="${src}" style="cursor: pointer; max-width: 100%; height: auto; border: 2px dashed #007bff; border-radius: 8px; padding: 5px; margin: 5px 0; transition: all 0.3s ease;" onclick="downloadImageFromEmail('${src}', '${filename}')" onmouseover="this.style.borderColor='#28a745'; this.style.backgroundColor='#f8f9fa';" onmouseout="this.style.borderColor='#007bff'; this.style.backgroundColor='transparent';" title="Click to download image" alt="Email image">`;
      },
    );
  };

  // Add global function for image download
  React.useEffect(() => {
    window.downloadImageFromEmail = (imageSrc, filename) => {
      downloadImage(imageSrc, filename);
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    // 🔴 VALIDATION: Block if any product is new and not yet added with company prices
    const productNotAdded = formData.products.find(
      (p) => p.product_name?.trim() && p.product_not_found === true
    );
    if (productNotAdded) {
      Swal.fire({
        icon: "warning",
        title: "Product Not Added",
        text: `Product "${productNotAdded.product_name}" is not in the database. Please add this product and its company prices using "Add Product & Prices" before creating the inquiry.`,
      });
      setSubmitting(false);
      return;
    }

    // 🔴 VALIDATION: Block if any product has no company prices
    const productNoPrices = formData.products.find(
      (p) =>
        p.product_name?.trim() &&
        !p.product_not_found &&
        (!p.company_prices || p.company_prices.length === 0)
    );
    if (productNoPrices) {
      Swal.fire({
        icon: "warning",
        title: "Company Prices Required",
        text: `Product "${productNoPrices.product_name}" has no company prices. Please add company prices using "Add Product & Prices" before creating the inquiry.`,
      });
      setSubmitting(false);
      return;
    }

    try {
      const submitData = new FormData();
      submitData.append("customer_name", formData.customer_name);
      submitData.append("email", formData.email);
      submitData.append("emailBodyId", selectedEmail.id); // ✅ important for linking email

      // Prepare product details - flatten quantities_and_packages into separate products
      const productsForSubmit = [];
      formData.products.forEach((product, productIndex) => {
        console.log(`🔍 Processing Product ${productIndex}:`, product);
        console.log(
          `🧪 CAS Number for Product ${productIndex}:`,
          product.cas_number,
        );

        product.quantities_and_packages.forEach((qp, qpIndex) => {
          console.log(`📊 QP ${qpIndex} for Product ${productIndex}:`, {
            quantity_required: qp.quantity_required,
            quantity_unit: qp.quantity_unit,
            package_size: qp.package_size,
          });

          const unitValue = qp.quantity_unit || "mg";
          const casValue = product.cas_number || "N/A";
          console.log(`🧪 CAS value for QP ${qpIndex}:`, casValue);
          console.log(`🏷️ Unit value for QP ${qpIndex}:`, unitValue);

          productsForSubmit.push({
            ProductName: product.product_name,
            cas_number: casValue, // Ensure CAS number is passed
            product_code: "N/A", // ✅ Add product_code (required by backend)
            quantity_required: parseFloat(qp.quantity_required) || 0,
            quantity_unit: unitValue, // Ensure default unit
            package_size:
              qp.package_size && qp.package_size.trim() !== ""
                ? qp.package_size
                : null,
            selected_company_price: product.selected_company_price || null,
            product_index: productIndex, // Add reference to original product for image
          });
        });
      });

      // Debug log to verify data being sent
      console.log("📦 Products being submitted:", productsForSubmit);

      submitData.append("products", JSON.stringify(productsForSubmit));

      // Attach product images if any - attach for each flattened product entry with sequential indexing
      let imageIndex = 0;
      formData.products.forEach((product) => {
        if (product.product_image) {
          // Count how many entries this product creates in flattened array
          const productEntryCount = product.quantities_and_packages.length;

          // Attach the same image for each quantity/package combination of this product
          for (let i = 0; i < productEntryCount; i++) {
            submitData.append(
              `product_${imageIndex}_image`,
              product.product_image,
            );
            imageIndex++;
          }
        } else {
          // Even if no image, increment index to maintain correct sequence
          imageIndex += product.quantities_and_packages.length;
        }
      });

      // Send request to backend
      const response = await axios.post("/api/email/Add", submitData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (response.data) {
        Swal.fire({
          title: "Success!",
          text: "Inquiry created successfully!",
          icon: "success",
          confirmButtonText: "OK",
        }).then(() => {
          setShowCreateForm(false);
          setSelectedEmail(null);
          setFormData({
            customer_name: "",
            email: "",
            products: [
              {
                product_name: "",
                cas_number: "",
                quantities_and_packages: [
                  {
                    quantity_required: "",
                    quantity_unit: "mg",
                    package_size: "",
                  },
                ],
                product_image: null,
                company_prices: [],
                selected_company_price: null,
              },
            ],
          });
          fetchEmails(); // ✅ Refresh list to show new inquiry_created status
          if (onEmailProcessed) onEmailProcessed();
        });
      }
    } catch (error) {
      console.error("Error creating inquiry:", error);
      Swal.fire({
        title: "Error!",
        text: "Failed to create inquiry. Please try again.",
        icon: "error",
        confirmButtonText: "OK",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (showCreateForm && selectedEmail) {
    const emailSource = selectedEmailDetails || selectedEmail;
    const emailImages = extractImagesFromEmail(emailSource.body);
    const attachments = emailSource.attachments || [];

    // Check if inquiry has already been created for this email
    const inquiryCreate = selectedEmail.inquiry_created === true;

    // Debug logging
    console.log("Email data:", selectedEmail);
    console.log("inquiry_create value:", selectedEmail.inquiry_created);
    console.log("inquiryCreate boolean:", inquiryCreate);

    return (
      <>
        <div className="main-wrapper">
          <div className="page-wrapper">
            <div className="content">
              <div className="page-header">
                <div className="row align-items-center">
                  <div className="col-md-4">
                    <h3 className="page-title">
                      {inquiryCreate
                        ? "Email Details - Inquiry Already Created"
                        : "Create Inquiry from Email"}
                    </h3>
                  </div>
                  <div className="col-md-8 float-end ms-auto">
                    <div className="d-flex title-head">
                      <div className="head-icons mb-0">
                        <button
                          onClick={() => setShowCreateForm(false)}
                          className="btn btn-secondary me-2"
                        >
                          <i className="ti ti-arrow-left me-1"></i>
                          Back to Emails
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Show notice if inquiry already created */}
              {inquiryCreate && (
                <div className="row mb-3">
                  <div className="col-12">
                    <div className="alert alert-warning">
                      <i className="ti ti-info-circle me-2"></i>
                      <strong>Note:</strong> An inquiry has already been created
                      from this email on{" "}
                      {new Date(selectedEmail.processed_at).toLocaleString()}.
                      The inquiry form has been hidden for this email.
                    </div>
                  </div>
                </div>
              )}

              <div className="row">
                {/* Left Side - Email Body */}
                <div className={inquiryCreate ? "col-12" : "col-md-6"}>
                  <div className="card">
                    <div className="card-header d-flex justify-content-between align-items-start">
                      <div>
                        <h4 className="card-title">Email Content</h4>
                        <div className="text-muted">
                          <strong>From:</strong> {emailSource.sender_email}
                          <br />
                          <strong>Subject:</strong> {emailSource.subject}
                          <br />
                          <strong>Date:</strong>{" "}
                          {new Date(selectedEmail.createdAt).toLocaleString()}
                        </div>
                      </div>
                      <div className="d-flex flex-column gap-2">
                        {emailImages.length > 0 && (
                          <button
                            onClick={() => downloadAllImages(emailImages)}
                            className="btn btn-outline-success btn-sm"
                            title="Download all images from email"
                          >
                            <i className="ti ti-images me-1"></i>
                            Download Images ({emailImages.length})
                          </button>
                        )}
                      </div>
                    </div>
                    <div
                      className="card-body"
                      style={{ maxHeight: "600px", overflowY: "auto" }}
                    >
                      <div
                        className="email-body-content"
                        dangerouslySetInnerHTML={{
                          __html:
                            createDownloadableEmailBody(emailSource.body) ||
                            "No content available",
                        }}
                      />

                      {/* Prominent Image Download Section */}
                      {emailImages.length > 0 && (
                        <div className="mt-4">
                          <div className="alert alert-success d-flex align-items-center">
                            <i className="ti ti-images text-success me-2 fs-4"></i>
                            <div>
                              <h6 className="mb-1">
                                📸 Images Available for Download
                              </h6>
                              <small className="mb-0">
                                This email contains{" "}
                                <strong>{emailImages.length}</strong> image(s)
                                that can be downloaded
                              </small>
                            </div>
                          </div>

                          {/* Download All Images Button */}
                          <div className="text-center mb-4">
                            <button
                              onClick={() => downloadAllImages(emailImages)}
                              className="btn btn-success btn-lg px-4"
                              style={{ boxShadow: "0 4px 8px rgba(0,0,0,0.2)" }}
                            >
                              <i className="ti ti-download me-2"></i>
                              Download All Images ({emailImages.length})
                            </button>
                          </div>

                          {/* Individual Images Grid */}
                          <div className="row">
                            {emailImages.map((imageSrc, index) => (
                              <div
                                key={index}
                                className="col-md-6 col-lg-4 mb-3"
                              >
                                <div className="card border-success shadow-sm">
                                  <img
                                    src={imageSrc}
                                    alt={`Email Image ${index + 1}`}
                                    className="card-img-top"
                                    style={{
                                      maxHeight: "140px",
                                      objectFit: "cover",
                                      cursor: "pointer",
                                      border: "2px dashed #28a745",
                                      borderRadius: "8px",
                                    }}
                                    onClick={() =>
                                      downloadImage(
                                        imageSrc,
                                        `email-image-${index + 1}.jpg`,
                                      )
                                    }
                                    title="Click to download this image"
                                    onError={(e) => {
                                      e.target.style.display = "none";
                                    }}
                                  />
                                  <div className="card-body p-2 text-center">
                                    <small className="text-muted d-block mb-2">
                                      <strong>Image {index + 1}</strong>
                                    </small>
                                    <button
                                      onClick={() =>
                                        downloadImage(
                                          imageSrc,
                                          `email-image-${index + 1}.jpg`,
                                        )
                                      }
                                      className="btn btn-sm btn-outline-success"
                                    >
                                      <i className="ti ti-download me-1"></i>
                                      Download
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="text-center">
                            <small className="text-success">
                              <i className="ti ti-info-circle me-1"></i>
                              <strong>💡 Pro Tip:</strong> You can also click
                              any image directly in the email content above to
                              download it instantly!
                            </small>
                          </div>
                        </div>
                      )}

                      {/* Attachments (PDFs, docs, etc.) */}
                      {attachments.length > 0 && (
                        <div className="mt-4">
                          <div className="alert alert-secondary">
                            <i className="ti ti-paperclip me-2"></i>
                            <strong>Attachments:</strong>
                          </div>
                          <ul className="list-group">
                            {attachments.map((att) => (
                              <li
                                key={att.id}
                                className="list-group-item d-flex justify-content-between align-items-center"
                              >
                                <div>
                                  <i className="ti ti-file-text me-2"></i>
                                  {att.filename}
                                  {att.mime_type && (
                                    <small className="text-muted ms-2">
                                      ({att.mime_type})
                                    </small>
                                  )}
                                </div>
                                <a
                                  href={`${IMAGE_BASE_URL.replace(/\/+$/, "")}/${att.storage_path}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="btn btn-sm btn-outline-primary"
                                >
                                  <i className="ti ti-download me-1"></i>
                                  Download
                                </a>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* No Images Message */}
                      {emailImages.length === 0 && attachments.length === 0 && (
                        <div className="mt-3">
                          <div className="alert alert-info">
                            <i className="ti ti-info-circle me-2"></i>
                            No images or file attachments found in this email.
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Side - Add Inquiry Form - Only show if inquiry not created yet */}
                {!inquiryCreate && (
                  <div className="col-md-6">
                    <div className="card">
                      <div className="card-header">
                        <h4 className="card-title">Create Inquiry</h4>
                      </div>
                      <div
                        className="card-body"
                        style={{ maxHeight: "600px", overflowY: "auto" }}
                      >
                        <form onSubmit={handleSubmit}>
                          {/* Customer Name */}
                          <div className="mb-3">
                            <label className="form-label">Customer Name</label>
                            <input
                              type="text"
                              className="form-control"
                              name="customer_name"
                              value={formData.customer_name}
                              onChange={handleInputChange}
                              required
                            />
                          </div>

                          {/* Email */}
                          <div className="mb-3">
                            <label className="form-label">Email</label>
                            <input
                              type="email"
                              className="form-control"
                              name="email"
                              value={formData.email}
                              onChange={handleInputChange}
                              required
                            />
                          </div>

                          {/* Inquiry Number */}
                          <div className="mb-3">
                            <label className="form-label">
                              Inquiry Number (Optional)
                            </label>
                            <input
                              type="text"
                              className="form-control"
                              name="inquiry_number"
                              value={formData.inquiry_number}
                              onChange={handleInputChange}
                              placeholder="Auto-generated or enter manually"
                            />
                          </div>

                          {/* Products */}
                          <div className="mb-3">
                            <label className="form-label">Products</label>
                            {formData.products.map((product, index) => (
                              <div
                                key={index}
                                className="border p-3 mb-3 rounded"
                              >
                                <div className="row">
                                  <div className="col-md-6 position-relative">
                                    <input
                                      type="text"
                                      className="form-control mb-2"
                                      placeholder="Product Name"
                                      value={product.product_name}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        handleProductChange(
                                          index,
                                          "product_name",
                                          val,
                                        );
                                        debouncedFetchSuggestions(index, val, "product_name");
                                      }}
                                      required
                                      autoComplete="off"
                                    />

                                    {/* Suggestions dropdown (Product Name) */}
                                    {productSuggestions[index] &&
                                      productSuggestions[index].length > 0 &&
                                      searchTriggeredBy[index] === "product_name" && (
                                        <div
                                          className="list-group position-absolute w-100"
                                          style={{
                                            zIndex: 1000,
                                            maxHeight: "200px",
                                            overflowY: "auto",
                                          }}
                                        >
                                          {productSuggestions[index].map(
                                            (item) => (
                                              <button
                                                type="button"
                                                key={item.id}
                                                className="list-group-item list-group-item-action"
                                                onClick={() => {
                                                  console.log("Selected item:", item);
                                                  const updatedProducts = [...formData.products];

                                                  // Set product name and CAS from selected suggestion
                                                  updatedProducts[index].product_name = item.product_name || "";
                                                  updatedProducts[index].cas_number =
                                                    item.cas_number && item.cas_number !== "N/A" ? item.cas_number : "";


                                                  setFormData((prev) => ({
                                                    ...prev,
                                                    products: updatedProducts,
                                                  }));

                                                  // Fetch company prices
                                                  fetchCompanyPrices(index, item.product_name);

                                                  // Close suggestion dropdown
                                                  setProductSuggestions((prev) => ({
                                                    ...prev,
                                                    [index]: [],
                                                  }));
                                                }}

                                              >
                                                {item.product_name || "—"}
                                              </button>
                                            ),
                                          )}
                                        </div>
                                      )}
                                  </div>

                                  <div className="col-md-6 position-relative">
                                    <input
                                      type="text"
                                      className="form-control mb-2"
                                      placeholder="CAS Number"
                                      value={product.cas_number}
                                      onChange={(e) => {
                                        const val = e.target.value;

                                        handleProductChange(index, "cas_number", val);

                                        if (val.length >= 5) {
                                          debouncedFetchSuggestions(index, val, "cas_number");
                                        }
                                      }}
                                      autoComplete="off"
                                    />

                                    {/* Suggestions dropdown (CAS Number) */}
                                    {productSuggestions[index] &&
                                      productSuggestions[index].length > 0 &&
                                      searchTriggeredBy[index] === "cas_number" && (
                                        <div
                                          className="list-group position-absolute w-100"
                                          style={{
                                            zIndex: 1000,
                                            maxHeight: "200px",
                                            overflowY: "auto",
                                          }}
                                        >
                                          {productSuggestions[index].map(
                                            (item) => (
                                              <button
                                                type="button"
                                                key={item.id}
                                                className="list-group-item list-group-item-action"
                                                onClick={() => {
                                                  const updatedProducts = [
                                                    ...formData.products,
                                                  ];
                                                  updatedProducts[
                                                    index
                                                  ].product_name =
                                                    item.product_name || "";
                                                  updatedProducts[
                                                    index
                                                  ].cas_number =
                                                    item.cas_number &&
                                                      item.cas_number !== "N/A"
                                                      ? item.cas_number
                                                      : "";
                                                  setFormData((prev) => ({
                                                    ...prev,
                                                    products: updatedProducts,
                                                  }));
                                                  fetchCompanyPrices(
                                                    index,
                                                    item.product_name
                                                  );
                                                  setProductSuggestions(
                                                    (prev) => ({
                                                      ...prev,
                                                      [index]: [],
                                                    })
                                                  );
                                                }}
                                              >
                                                {item.product_name || "—"}
                                                {item.cas_number &&
                                                  item.cas_number !== "N/A" &&
                                                  ` (${item.cas_number})`}
                                              </button>
                                            )
                                          )}
                                        </div>
                                      )}
                                  </div>

                                  {/* Quantities and Packages */}
                                  <div className="col-12">
                                    <label className="form-label">
                                      Quantities & Packages
                                    </label>
                                    {product.quantities_and_packages.map(
                                      (qp, qpIndex) => (
                                        <div key={qpIndex} className="row mb-2">
                                          <div className="col-md-3">
                                            <input
                                              type="number"
                                              className="form-control"
                                              placeholder="Quantity"
                                              value={qp.quantity_required}
                                              onChange={(e) =>
                                                handleQuantityAndPackageChange(
                                                  index,
                                                  qpIndex,
                                                  "quantity_required",
                                                  e.target.value,
                                                )
                                              }
                                              required
                                              step="0.01"
                                              min="0"
                                            />
                                          </div>
                                          <div className="col-md-3">
                                            <select
                                              className="form-control"
                                              value={qp.quantity_unit}
                                              onChange={(e) =>
                                                handleQuantityAndPackageChange(
                                                  index,
                                                  qpIndex,
                                                  "quantity_unit",
                                                  e.target.value,
                                                )
                                              }
                                            >
                                              <option value="mg">mg</option>
                                              <option value="gm">gm</option>
                                              <option value="ml">ml</option>
                                              <option value="kg">kg</option>
                                              <option value="mt">mt</option>
                                              <option value="ltr">ltr</option>
                                            </select>
                                          </div>
                                          <div className="col-md-3">
                                            <input
                                              type="text"
                                              className="form-control"
                                              placeholder="Package Size"
                                              value={qp.package_size}
                                              onChange={(e) =>
                                                handleQuantityAndPackageChange(
                                                  index,
                                                  qpIndex,
                                                  "package_size",
                                                  e.target.value,
                                                )
                                              }
                                            />
                                          </div>
                                          <div className="col-md-3">
                                            {product.quantities_and_packages
                                              .length > 1 && (
                                                <button
                                                  type="button"
                                                  className="btn btn-danger btn-sm"
                                                  onClick={() =>
                                                    removeQuantityAndPackage(
                                                      index,
                                                      qpIndex,
                                                    )
                                                  }
                                                >
                                                  Remove
                                                </button>
                                              )}
                                          </div>
                                        </div>
                                      ),
                                    )}
                                    <button
                                      type="button"
                                      className="btn btn-secondary btn-sm mt-2"
                                      onClick={() =>
                                        addQuantityAndPackage(index)
                                      }
                                    >
                                      <i className="ti ti-plus me-1"></i>
                                      Add More
                                    </button>
                                  </div>
                                </div>

                                {/* Product Image Upload */}
                                <div className="mt-2">
                                  <label className="form-label">
                                    Product Image (Optional)
                                  </label>
                                  <input
                                    type="file"
                                    className="form-control"
                                    accept="image/*"
                                    onChange={(e) =>
                                      handleImageUpload(index, e)
                                    }
                                  />
                                  {product.product_image && (
                                    <div className="mt-1">
                                      <small className="text-success">
                                        <i className="ti ti-check"></i>{" "}
                                        {product.product_image.name}
                                      </small>
                                    </div>
                                  )}
                                </div>

                                {/* Company Price Mapping */}
                                {product.company_prices &&
                                  product.company_prices.length > 0 && (
                                    <div className="mt-3">
                                      <div className="d-flex justify-content-between align-items-center mb-2">
                                        <label className="form-label mb-0">
                                          <i className="ti ti-building me-1"></i>
                                          Available Company Prices
                                        </label>
                                        <button
                                          type="button"
                                          className="btn btn-sm btn-warning"
                                          onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            console.log(
                                              "🔘 Edit Prices button clicked for product index:",
                                              index,
                                            );
                                            openEditPricesModal(index);
                                          }}
                                        >
                                          <i className="ti ti-edit me-1"></i>
                                          Edit Prices
                                        </button>
                                      </div>
                                      <div className="border rounded p-2 bg-light">
                                        <small className="text-muted d-block mb-2">
                                          Available company prices (for
                                          reference only):
                                        </small>
                                        {product.company_prices.map((price) => (
                                          <div
                                            key={price.id}
                                            className="mb-2 p-2 rounded border bg-white"
                                          >
                                            <div className="d-flex justify-content-between align-items-center">
                                              <div>
                                                <strong>
                                                  {price.company ===
                                                    "PO Price"
                                                    ? "PO Price"
                                                    : price.company}
                                                </strong>
                                                {price.company ===
                                                  "PO Price" && (
                                                    <span className="badge bg-warning text-dark ms-2">
                                                      Latest PO
                                                    </span>
                                                  )}
                                              </div>
                                              <div className="text-end">
                                                <div className="fw-bold text-success">
                                                  {price.currency === 'USD' ? '$' : '₹'}{price.price}
                                                </div>
                                                <small className="text-muted">
                                                  {price.quantity}{" "}
                                                  {price.unit}
                                                </small>
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                {/* Product Not Found - Show Add Product Option */}
                                {product.product_not_found && (
                                  <div className="mt-3">
                                    <div className="alert alert-warning py-3">
                                      <div className="d-flex align-items-center justify-content-between">
                                        <div>
                                          <i className="ti ti-alert-circle me-2"></i>
                                          <strong>
                                            Product "{product.product_name}" not
                                            found in database.
                                          </strong>
                                          <br />
                                          <small>
                                            Add this product and company prices
                                            to continue.
                                          </small>
                                        </div>
                                        <button
                                          type="button"
                                          className="btn btn-primary btn-sm"
                                          onClick={() =>
                                            openAddProductModal(index)
                                          }
                                        >
                                          <i className="ti ti-plus me-1"></i>
                                          Add Product & Prices
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* No Prices Available - Use Add Product & Prices button/modal */}
                                {product.product_name &&
                                  !product.product_not_found &&
                                  product.company_prices &&
                                  product.company_prices.length === 0 && (
                                    <div className="mt-3">
                                      <div className="alert alert-warning py-3">
                                        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                                          <div>
                                            <i className="ti ti-alert-circle me-2"></i>
                                            <strong>
                                              No company prices found for "{product.product_name}"
                                            </strong>
                                            <br />
                                            <small>
                                              Add company prices to create the inquiry.
                                            </small>
                                          </div>
                                          <button
                                            type="button"
                                            className="btn btn-primary btn-sm"
                                            onClick={() =>
                                              openAddProductModal(index)
                                            }
                                          >
                                            <i className="ti ti-plus me-1"></i>
                                            Add Product & Prices
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                {/* Remove Product Button */}
                                {formData.products.length > 1 && (
                                  <div className="mt-3">
                                    <button
                                      type="button"
                                      className="btn btn-danger btn-sm"
                                      onClick={() => removeProduct(index)}
                                    >
                                      <i className="ti ti-trash me-1"></i>
                                      Remove Product
                                    </button>
                                  </div>
                                )}
                              </div>
                            ))}
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={addProduct}
                            >
                              Add Product
                            </button>
                          </div>

                          {/* Submit Button */}
                          <div className="d-flex justify-content-end">
                            <button
                              type="submit"
                              className="btn btn-primary"
                              disabled={submitting}
                            >
                              {submitting ? (
                                <>
                                  <span
                                    className="spinner-border spinner-border-sm me-2"
                                    role="status"
                                    aria-hidden="true"
                                  ></span>
                                  Creating...
                                </>
                              ) : (
                                <>
                                  <i className="ti ti-plus me-1"></i>
                                  Create Inquiry
                                </>
                              )}
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        {/* Add Product Modal - for form view */}
        {showAddProductModal && (
          <div
            className="modal fade show d-block"
            style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1050 }}
          >
            <div className="modal-dialog modal-lg">
              <div className="modal-content">
                <form onSubmit={handleAddProductSubmit}>
                  <div className="modal-header">
                    <h5 className="modal-title">
                      <i className="ti ti-plus me-2"></i>
                      Add Product & Company Prices
                    </h5>
                    <button
                      type="button"
                      className="btn-close"
                      onClick={() => {
                        setShowAddProductModal(false);
                        setAddProductIndex(null);
                        setAddProductPricesOnlyMode(false);
                      }}
                      disabled={addingProduct}
                    ></button>
                  </div>
                  <div
                    className="modal-body"
                    style={{ maxHeight: "70vh", overflowY: "auto" }}
                  >
                    {/* Product Details Section - read-only when adding prices only */}
                    <div className="mb-4">
                      <h6 className="mb-3">
                        <i className="ti ti-package me-2"></i>
                        Product Details
                        {addProductPricesOnlyMode && (
                          <small className="text-muted ms-2">(Existing product)</small>
                        )}
                      </h6>
                      <div className="row">
                        <div className="col-md-6 mb-3">
                          <label className="form-label">
                            Product Name <span className="text-danger">*</span>
                          </label>
                          <input
                            type="text"
                            name="product_name"
                            className="form-control"
                            value={addProductFormData.product_name}
                            onChange={addProductPricesOnlyMode ? undefined : handleAddProductInputChange}
                            readOnly={addProductPricesOnlyMode}
                            required
                            disabled={addingProduct}
                            style={addProductPricesOnlyMode ? { backgroundColor: "#f8f9fa" } : {}}
                          />
                        </div>
                        <div className="col-md-6 mb-3">
                          <label className="form-label">CAS Number</label>
                          <input
                            type="text"
                            name="cas_number"
                            className="form-control"
                            value={addProductFormData.cas_number}
                            onChange={addProductPricesOnlyMode ? undefined : handleAddProductInputChange}
                            readOnly={addProductPricesOnlyMode}
                            disabled={addingProduct}
                            style={addProductPricesOnlyMode ? { backgroundColor: "#f8f9fa" } : {}}
                          />
                        </div>
                        {!addProductPricesOnlyMode && (
                          <>
                            <div className="col-md-6 mb-3">
                              <label className="form-label">HSN Code</label>
                              <input
                                type="text"
                                name="hsn_code"
                                className="form-control"
                                value={addProductFormData.hsn_code}
                                onChange={handleAddProductInputChange}
                                disabled={addingProduct}
                              />
                            </div>
                            <div className="col-md-6 mb-3">
                              <label className="form-label">Status</label>
                              <select
                                name="status"
                                className="form-control"
                                value={addProductFormData.status}
                                onChange={handleAddProductInputChange}
                                disabled={addingProduct}
                              >
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                              </select>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Company Prices Section */}
                    <div className="mb-4">
                      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                        <div className="d-flex align-items-center gap-3 flex-wrap">
                          <h6 className="mb-0">
                            <i className="ti ti-building me-2"></i>
                            Company Prices (Optional)
                          </h6>
                          <div className="d-flex align-items-center gap-4">
                            <a href="https://www.bldpharm.com/" target="_blank" rel="noopener noreferrer" title="BLDpharm" className="d-flex align-items-center">
                              <img src={BLDImg} alt="BLD" style={{ height: "24px", width: "auto", objectFit: "contain" }} />
                            </a>
                            <a href="https://www.tcichemicals.com/IN/en/" target="_blank" rel="noopener noreferrer" title="TCI" className="d-flex align-items-center">
                              <img src={TCIImg} alt="TCI" style={{ height: "24px", width: "auto", objectFit: "contain" }} />
                            </a>
                            <a href="https://www.ambeed.com/" target="_blank" rel="noopener noreferrer" title="Ambeed" className="d-flex align-items-center">
                              <img src={AmbeedImg} alt="Ambeed" style={{ height: "24px", width: "auto", objectFit: "contain" }} />
                            </a>
                            <a href="https://www.sigmaaldrich.com/IN/en/" target="_blank" rel="noopener noreferrer" title="Sigma-Aldrich" className="d-flex align-items-center">
                              <img src={SigmaImg} alt="Sigma" style={{ height: "24px", width: "auto", objectFit: "contain" }} />
                            </a>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="btn btn-outline-primary btn-sm"
                          onClick={addCompanyInModal}
                          disabled={addingProduct}
                        >
                          <i className="ti ti-plus me-1"></i>
                          Add Company
                        </button>
                      </div>

                      {addProductFormData.companies.map((comp, cIdx) => (
                        <div key={cIdx} className="mb-3 p-3 border rounded">
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <div className="w-75">
                              <label className="form-label small">
                                Company Name
                              </label>
                              <input
                                type="text"
                                className="form-control form-control-sm"
                                value={comp.company}
                                onChange={(e) =>
                                  handleAddProductCompanyChange(
                                    cIdx,
                                    e.target.value,
                                  )
                                }
                                placeholder="Enter company name"
                                disabled={addingProduct}
                              />
                            </div>
                            {addProductFormData.companies.length > 1 && (
                              <button
                                type="button"
                                className="btn btn-outline-danger btn-sm ms-2 mt-4"
                                onClick={() => removeCompanyInModal(cIdx)}
                                disabled={addingProduct}
                              >
                                Remove
                              </button>
                            )}
                          </div>

                          {/* Pricing Rows */}
                          {comp.pricing.map((p, pIdx) => (
                            <div
                              key={pIdx}
                              className="row g-2 mb-2 align-items-end"
                            >
                              <div className="col-4">
                                <label className="form-label small text-muted">
                                  Price (₹)
                                </label>
                                <input
                                  type="number"
                                  className="form-control form-control-sm"
                                  value={p.price}
                                  onChange={(e) =>
                                    handleAddProductPricingChange(
                                      cIdx,
                                      pIdx,
                                      "price",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="0.00"
                                  step="0.01"
                                  min="0"
                                  disabled={addingProduct}
                                />
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
                                    handleAddProductPricingChange(
                                      cIdx,
                                      pIdx,
                                      "quantity",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="0"
                                  min="0"
                                  disabled={addingProduct}
                                />
                              </div>
                              <div className="col-3">
                                <label className="form-label small text-muted">
                                  Unit
                                </label>
                                <select
                                  className="form-select form-select-sm"
                                  value={p.unit}
                                  onChange={(e) =>
                                    handleAddProductPricingChange(
                                      cIdx,
                                      pIdx,
                                      "unit",
                                      e.target.value,
                                    )
                                  }
                                  disabled={addingProduct}
                                >
                                  <option value="mg">mg</option>
                                  <option value="gm">gm</option>
                                  <option value="ml">ml</option>
                                  <option value="kg">kg</option>
                                  <option value="mt">mt</option>
                                  <option value="ltr">ltr</option>
                                </select>
                              </div>
                              <div className="col-1">
                                {comp.pricing.length > 1 && (
                                  <button
                                    type="button"
                                    className="btn btn-danger btn-sm"
                                    onClick={() =>
                                      removePriceRowInModal(cIdx, pIdx)
                                    }
                                    disabled={addingProduct}
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
                            onClick={() => addPriceRowInModal(cIdx)}
                            disabled={addingProduct}
                          >
                            <i className="ti ti-plus me-1"></i>
                            Add Another Price
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => {
                        setShowAddProductModal(false);
                        setAddProductIndex(null);
                        setAddProductPricesOnlyMode(false);
                      }}
                      disabled={addingProduct}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={addingProduct}
                    >
                      {addingProduct ? (
                        <>
                          <span
                            className="spinner-border spinner-border-sm me-2"
                            role="status"
                            aria-hidden="true"
                          ></span>
                          Adding...
                        </>
                      ) : (
                        <>
                          <i className="ti ti-check me-1"></i>
                          Add Product & Prices
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Edit Prices Modal - for form view */}
        {showEditPricesModal && (
          <div
            className="modal fade show d-block"
            style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1050 }}
          >
            <div className="modal-dialog modal-lg">
              <div className="modal-content">
                <form onSubmit={handleEditPricesSubmit}>
                  <div className="modal-header">
                    <h5 className="modal-title">
                      <i className="ti ti-edit me-2"></i>
                      Edit Company Prices
                    </h5>
                    <button
                      type="button"
                      className="btn-close"
                      onClick={() => {
                        setShowEditPricesModal(false);
                        setEditPricesIndex(null);
                        setEditPricesAddMode(false);
                      }}
                      disabled={updatingPrices}
                    ></button>
                  </div>
                  <div
                    className="modal-body"
                    style={{ maxHeight: "70vh", overflowY: "auto" }}
                  >
                    {/* Product Name Display */}
                    <div className="mb-3">
                      <label className="form-label">Product Name</label>
                      <input
                        type="text"
                        name="product_name"
                        className="form-control"
                        value={editPricesFormData.product_name}
                        readOnly
                        style={{ backgroundColor: "#f8f9fa" }}
                      />
                    </div>

                    {/* Company Prices Section */}
                    <div className="mb-4">
                      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                        <div>
                          <h6 className="mb-0">
                            <i className="ti ti-building me-2"></i>
                            {editPricesAddMode
                              ? "Add Company Prices"
                              : "Company Prices (Edit Price Only)"}
                          </h6>
                          <small className="text-muted">
                            {editPricesAddMode
                              ? "Add company names and their prices below."
                              : "You can only edit the price. Company, Quantity, and Unit are read-only."}
                          </small>
                        </div>
                        {editPricesAddMode && (
                          <button
                            type="button"
                            className="btn btn-outline-primary btn-sm"
                            onClick={addCompanyInEditModal}
                            disabled={updatingPrices}
                          >
                            <i className="ti ti-plus me-1"></i>
                            Add Company
                          </button>
                        )}
                      </div>

                      {editPricesFormData.companies.map((comp, cIdx) => (
                        <div key={cIdx} className="mb-3 p-3 border rounded">
                          {/* Company Name */}
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <div className={editPricesAddMode ? "w-75" : "w-100"}>
                              <label className="form-label small">
                                Company Name
                              </label>
                              <input
                                type="text"
                                className="form-control form-control-sm"
                                value={comp.company}
                                onChange={
                                  editPricesAddMode
                                    ? (e) =>
                                      handleEditPricesCompanyChange(
                                        cIdx,
                                        e.target.value
                                      )
                                    : undefined
                                }
                                readOnly={!editPricesAddMode}
                                disabled={!editPricesAddMode || updatingPrices}
                                style={
                                  !editPricesAddMode
                                    ? { backgroundColor: "#f8f9fa" }
                                    : {}
                                }
                                placeholder={
                                  editPricesAddMode
                                    ? "e.g. BLDpharm, TCI, Ambeed"
                                    : ""
                                }
                              />
                            </div>
                            {editPricesAddMode &&
                              editPricesFormData.companies.length > 1 && (
                                <button
                                  type="button"
                                  className="btn btn-outline-danger btn-sm ms-2 mt-4"
                                  onClick={() => removeCompanyInEditModal(cIdx)}
                                  disabled={updatingPrices}
                                >
                                  Remove
                                </button>
                              )}
                          </div>

                          {/* Pricing Rows */}
                          {comp.pricing.map((p, pIdx) => (
                            <div
                              key={pIdx}
                              className="row g-2 mb-2 align-items-end"
                            >
                              <div className="col-4">
                                <label className="form-label small text-muted">
                                  Price (₹){" "}
                                  <span className="text-danger">*</span>
                                </label>
                                <input
                                  type="number"
                                  className="form-control form-control-sm"
                                  value={p.price}
                                  onChange={(e) =>
                                    handleEditPricesPricingChange(
                                      cIdx,
                                      pIdx,
                                      "price",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="0.00"
                                  step="0.01"
                                  min="0"
                                  required
                                  disabled={updatingPrices}
                                />
                              </div>
                              <div className="col-4">
                                <label className="form-label small text-muted">
                                  Quantity
                                </label>
                                <input
                                  type="number"
                                  className="form-control form-control-sm"
                                  value={p.quantity}
                                  onChange={
                                    editPricesAddMode
                                      ? (e) =>
                                        handleEditPricesPricingChange(
                                          cIdx,
                                          pIdx,
                                          "quantity",
                                          e.target.value,
                                        )
                                      : undefined
                                  }
                                  readOnly={!editPricesAddMode}
                                  disabled={!editPricesAddMode || updatingPrices}
                                  style={
                                    !editPricesAddMode
                                      ? { backgroundColor: "#f8f9fa" }
                                      : {}
                                  }
                                  placeholder={editPricesAddMode ? "0" : ""}
                                />
                              </div>
                              <div className="col-3">
                                <label className="form-label small text-muted">
                                  Unit
                                </label>
                                {editPricesAddMode ? (
                                  <select
                                    className="form-select form-select-sm"
                                    value={p.unit}
                                    onChange={(e) =>
                                      handleEditPricesPricingChange(
                                        cIdx,
                                        pIdx,
                                        "unit",
                                        e.target.value,
                                      )
                                    }
                                    disabled={updatingPrices}
                                  >
                                    <option value="mg">mg</option>
                                    <option value="gm">gm</option>
                                    <option value="ml">ml</option>
                                    <option value="kg">kg</option>
                                    <option value="mt">mt</option>
                                    <option value="ltr">ltr</option>
                                  </select>
                                ) : (
                                  <input
                                    type="text"
                                    className="form-control form-control-sm"
                                    value={p.unit}
                                    readOnly
                                    disabled
                                    style={{ backgroundColor: "#f8f9fa" }}
                                  />
                                )}
                              </div>
                              <div className="col-1">
                                {editPricesAddMode &&
                                  comp.pricing.length > 1 && (
                                    <button
                                      type="button"
                                      className="btn btn-danger btn-sm"
                                      onClick={() =>
                                        removePriceRowInEditModal(
                                          cIdx,
                                          pIdx
                                        )
                                      }
                                      disabled={updatingPrices}
                                    >
                                      &times;
                                    </button>
                                  )}
                              </div>
                            </div>
                          ))}

                          {editPricesAddMode && (
                            <button
                              type="button"
                              className="btn btn-outline-primary btn-sm"
                              onClick={() => addPriceRowInEditModal(cIdx)}
                              disabled={updatingPrices}
                            >
                              <i className="ti ti-plus me-1"></i>
                              Add Another Price
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => {
                        setShowEditPricesModal(false);
                        setEditPricesIndex(null);
                        setEditPricesAddMode(false);
                      }}
                      disabled={updatingPrices}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={updatingPrices}
                    >
                      {updatingPrices ? (
                        <>
                          <span
                            className="spinner-border spinner-border-sm me-2"
                            role="status"
                            aria-hidden="true"
                          ></span>
                          Updating...
                        </>
                      ) : (
                        <>
                          <i className="ti ti-check me-1"></i>
                          Update Prices
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // Default view - Email table
  return (
    <>
      <div className="main-wrapper">
        <div className="page-wrapper">
          <div className="content">
            {/* Header */}
            <div className="page-header">
              <div className="row align-items-center">
                <div className="col-md-4">
                  <h3 className="page-title">Email Inquiries</h3>
                </div>
                <div className="col-md-8 float-end ms-auto">
                  <div className="d-flex title-head">
                    <div className="head-icons mb-0">
                      <Link
                        to="/dashboard/Inquiry"
                        data-bs-toggle="tooltip"
                        data-bs-placement="top"
                        title="Back to Inquiries"
                      >
                        <i className="ti ti-arrow-left"></i>
                      </Link>
                      <button
                        className="btn btn-sm btn-primary ms-2"
                        onClick={fetchEmails}
                        disabled={loading}
                      >
                        {loading ? (
                          <span
                            className="spinner-border spinner-border-sm"
                            role="status"
                            aria-hidden="true"
                          ></span>
                        ) : (
                          <i className="ti ti-refresh me-1"></i>
                        )}
                        Refresh
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <PageFilters
              searchTerm={searchTerm}
              onSearchChange={handleSearch}
              showSort={false}
              showExport={false}
              showViewToggle={false}
              showAddButton={false}
            />

            <div className="mb-3 d-flex align-items-center gap-2">
              <div className="ms-auto d-flex align-items-center gap-2 rounded bg-light border shadow-sm">
                <select
                  className="form-select form-select-sm"
                  style={{ maxWidth: "200px" }}
                  value={selectedDateFilter}
                  onChange={(e) => {
                    setSelectedDateFilter(e.target.value);
                    setCurrentPage(1);
                    fetchEmails(1); // optional if you later move to server-side filtering
                  }}
                >
                  {dateFilterOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>

                <select
                  className="form-select form-select-sm"
                  style={{ maxWidth: "300px" }}
                  value={selectedSender}
                  onChange={(e) => {
                    setSelectedSender(e.target.value);
                    setCurrentPage(1);
                  }}
                >
                  <option value="">All Senders</option>
                  {senderOptions.map((sender) => (
                    <option key={sender} value={sender}>
                      {sender}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="row">
              <div className="col-md-12">
                <div className="card">
                  <div className="card-header">
                    <h4 className="card-title">Email List</h4>
                  </div>
                  <div className="card-body">
                    {loading ? (
                      <div className="text-center">
                        <div className="spinner-border" role="status">
                          <span className="visually-hidden">Loading...</span>
                        </div>
                      </div>
                    ) : (
                      <div className="table-responsive">
                        <div
                          className="horizontal-scroll-container"
                          style={{ overflowX: "auto" }}
                        >
                          <table className="table table-bordered">
                            <thead>
                              <tr>
                                <th>Sr. No</th>
                                <th>From</th>
                                <th>Subject</th>
                                <th>Date</th>
                                <th>Status</th>
                                <th>Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredEmails.length === 0 ? (
                                <tr>
                                  <td colSpan="6" className="text-center">
                                    No emails found
                                  </td>
                                </tr>
                              ) : (
                                filteredEmails.map((email, index) => (
                                  <tr key={email.id}>
                                    <td>{email.id}</td>
                                    <td>
                                      {email.sender_email || "Unknown"}
                                      <br />
                                      <small className="text-muted">
                                        {email.sender_email}
                                      </small>
                                    </td>
                                    <td>{email.subject || "No Subject"}</td>
                                    <td>
                                      {new Date(
                                        email.createdAt,
                                      ).toLocaleDateString()}
                                    </td>
                                    <td>
                                      {email.inquiry_created === true ? (
                                        <span className="badge bg-success">
                                          <i className="ti ti-check me-1"></i>
                                          Inquiry Created
                                        </span>
                                      ) : (
                                        <span className="badge bg-warning">
                                          <i className="ti ti-clock me-1"></i>
                                          Pending
                                        </span>
                                      )}
                                    </td>
                                    <td>
                                      {email.inquiry_created === true ? (
                                        <span className="text-muted">
                                          <i className="ti ti-lock me-1"></i>
                                          Already Processed
                                        </span>
                                      ) : (
                                        <button
                                          className="btn btn-sm btn-primary"
                                          onClick={() =>
                                            handleCreateInquiry(email)
                                          }
                                        >
                                          <i className="ti ti-plus me-1"></i>
                                          Create Inquiry
                                        </button>
                                      )}
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                    itemsPerPage={itemsPerPage}
                    totalItems={totalItems}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Add Product Modal - for email list view */}
      {showAddProductModal && (
        <div
          className="modal fade show d-block"
          style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1050 }}
        >
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <form onSubmit={handleAddProductSubmit}>
                <div className="modal-header">
                  <h5 className="modal-title">
                    <i className="ti ti-plus me-2"></i>
                    Add Product & Company Prices
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => {
                      setShowAddProductModal(false);
                      setAddProductIndex(null);
                      setAddProductPricesOnlyMode(false);
                    }}
                    disabled={addingProduct}
                  ></button>
                </div>
                <div
                  className="modal-body"
                  style={{ maxHeight: "70vh", overflowY: "auto" }}
                >
                  {/* Product Details Section - same as form view */}
                  <div className="mb-4">
                    <h6 className="mb-3">
                      <i className="ti ti-package me-2"></i>
                      Product Details
                      {addProductPricesOnlyMode && (
                        <small className="text-muted ms-2">(Existing product)</small>
                      )}
                    </h6>
                    <div className="row">
                      <div className="col-md-6 mb-3">
                        <label className="form-label">
                          Product Name <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          name="product_name"
                          className="form-control"
                          value={addProductFormData.product_name}
                          onChange={addProductPricesOnlyMode ? undefined : handleAddProductInputChange}
                          readOnly={addProductPricesOnlyMode}
                          required
                          disabled={addingProduct}
                          style={addProductPricesOnlyMode ? { backgroundColor: "#f8f9fa" } : {}}
                        />
                      </div>
                      <div className="col-md-6 mb-3">
                        <label className="form-label">CAS Number</label>
                        <input
                          type="text"
                          name="cas_number"
                          className="form-control"
                          value={addProductFormData.cas_number}
                          onChange={addProductPricesOnlyMode ? undefined : handleAddProductInputChange}
                          readOnly={addProductPricesOnlyMode}
                          disabled={addingProduct}
                          style={addProductPricesOnlyMode ? { backgroundColor: "#f8f9fa" } : {}}
                        />
                      </div>
                      {!addProductPricesOnlyMode && (
                        <>
                          <div className="col-md-6 mb-3">
                            <label className="form-label">HSN Code</label>
                            <input
                              type="text"
                              name="hsn_code"
                              className="form-control"
                              value={addProductFormData.hsn_code}
                              onChange={handleAddProductInputChange}
                              disabled={addingProduct}
                            />
                          </div>
                          <div className="col-md-6 mb-3">
                            <label className="form-label">Status</label>
                            <select
                              name="status"
                              className="form-control"
                              value={addProductFormData.status}
                              onChange={handleAddProductInputChange}
                              disabled={addingProduct}
                            >
                              <option value="active">Active</option>
                              <option value="inactive">Inactive</option>
                            </select>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Company Prices Section */}
                  <div className="mb-4">
                    <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                      <div className="d-flex align-items-center gap-3 flex-wrap">
                        <h6 className="mb-0">
                          <i className="ti ti-building me-2"></i>
                          Company Prices (Optional)
                        </h6>
                        <div className="d-flex align-items-center gap-4">
                          <a href="https://www.bldpharm.com/" target="_blank" rel="noopener noreferrer" title="BLDpharm" className="d-flex align-items-center">
                            <img src={BLDImg} alt="BLD" style={{ height: "24px", width: "auto", objectFit: "contain" }} />
                          </a>
                          <a href="https://www.tcichemicals.com/IN/en/" target="_blank" rel="noopener noreferrer" title="TCI" className="d-flex align-items-center">
                            <img src={TCIImg} alt="TCI" style={{ height: "24px", width: "auto", objectFit: "contain" }} />
                          </a>
                          <a href="https://www.ambeed.com/" target="_blank" rel="noopener noreferrer" title="Ambeed" className="d-flex align-items-center">
                            <img src={AmbeedImg} alt="Ambeed" style={{ height: "24px", width: "auto", objectFit: "contain" }} />
                          </a>
                          <a href="https://www.sigmaaldrich.com/IN/en/" target="_blank" rel="noopener noreferrer" title="Sigma-Aldrich" className="d-flex align-items-center">
                            <img src={SigmaImg} alt="Sigma" style={{ height: "24px", width: "auto", objectFit: "contain" }} />
                          </a>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="btn btn-outline-primary btn-sm"
                        onClick={addCompanyInModal}
                        disabled={addingProduct}
                      >
                        <i className="ti ti-plus me-1"></i>
                        Add Company
                      </button>
                    </div>

                    {addProductFormData.companies.map((comp, cIdx) => (
                      <div key={cIdx} className="mb-3 p-3 border rounded">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <div className="w-75">
                            <label className="form-label small">
                              Company Name
                            </label>
                            <input
                              type="text"
                              className="form-control form-control-sm"
                              value={comp.company}
                              onChange={(e) =>
                                handleAddProductCompanyChange(
                                  cIdx,
                                  e.target.value,
                                )
                              }
                              placeholder="Enter company name"
                              disabled={addingProduct}
                            />
                          </div>
                          {addProductFormData.companies.length > 1 && (
                            <button
                              type="button"
                              className="btn btn-outline-danger btn-sm ms-2 mt-4"
                              onClick={() => removeCompanyInModal(cIdx)}
                              disabled={addingProduct}
                            >
                              Remove
                            </button>
                          )}
                        </div>

                        {/* Pricing Rows */}
                        {comp.pricing.map((p, pIdx) => (
                          <div
                            key={pIdx}
                            className="row g-2 mb-2 align-items-end"
                          >
                            <div className="col-4">
                              <label className="form-label small text-muted">
                                Price (₹)
                              </label>
                              <input
                                type="number"
                                className="form-control form-control-sm"
                                value={p.price}
                                onChange={(e) =>
                                  handleAddProductPricingChange(
                                    cIdx,
                                    pIdx,
                                    "price",
                                    e.target.value,
                                  )
                                }
                                placeholder="0.00"
                                step="0.01"
                                min="0"
                                disabled={addingProduct}
                              />
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
                                  handleAddProductPricingChange(
                                    cIdx,
                                    pIdx,
                                    "quantity",
                                    e.target.value,
                                  )
                                }
                                placeholder="0"
                                min="0"
                                disabled={addingProduct}
                              />
                            </div>
                            <div className="col-3">
                              <label className="form-label small text-muted">
                                Unit
                              </label>
                              <select
                                className="form-select form-select-sm"
                                value={p.unit}
                                onChange={(e) =>
                                  handleAddProductPricingChange(
                                    cIdx,
                                    pIdx,
                                    "unit",
                                    e.target.value,
                                  )
                                }
                                disabled={addingProduct}
                              >
                                <option value="mg">mg</option>
                                <option value="gm">gm</option>
                                <option value="ml">ml</option>
                                <option value="kg">kg</option>
                                <option value="mt">mt</option>
                                <option value="ltr">ltr</option>
                              </select>
                            </div>
                            <div className="col-1">
                              {comp.pricing.length > 1 && (
                                <button
                                  type="button"
                                  className="btn btn-danger btn-sm"
                                  onClick={() =>
                                    removePriceRowInModal(cIdx, pIdx)
                                  }
                                  disabled={addingProduct}
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
                          onClick={() => addPriceRowInModal(cIdx)}
                          disabled={addingProduct}
                        >
                          <i className="ti ti-plus me-1"></i>
                          Add Another Price
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowAddProductModal(false);
                      setAddProductIndex(null);
                      setAddProductPricesOnlyMode(false);
                    }}
                    disabled={addingProduct}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={addingProduct}
                  >
                    {addingProduct ? (
                      <>
                        <span
                          className="spinner-border spinner-border-sm me-2"
                          role="status"
                          aria-hidden="true"
                        ></span>
                        Adding...
                      </>
                    ) : (
                      <>
                        <i className="ti ti-check me-1"></i>
                        Add Product & Prices
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Prices Modal - for email list view */}
      {showEditPricesModal && (
        <div
          className="modal fade show d-block"
          style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1050 }}
        >
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <form onSubmit={handleEditPricesSubmit}>
                <div className="modal-header">
                  <h5 className="modal-title">
                    <i className="ti ti-edit me-2"></i>
                    Edit Company Prices
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => {
                      setShowEditPricesModal(false);
                      setEditPricesIndex(null);
                      setEditPricesAddMode(false);
                    }}
                    disabled={updatingPrices}
                  ></button>
                </div>
                <div
                  className="modal-body"
                  style={{ maxHeight: "70vh", overflowY: "auto" }}
                >
                  {/* Product Name Display */}
                  <div className="mb-3">
                    <label className="form-label">Product Name</label>
                    <input
                      type="text"
                      name="product_name"
                      className="form-control"
                      value={editPricesFormData.product_name}
                      readOnly
                      style={{ backgroundColor: "#f8f9fa" }}
                    />
                  </div>

                  {/* Company Prices Section - same as form view */}
                  <div className="mb-4">
                    <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                      <div>
                        <h6 className="mb-0">
                          <i className="ti ti-building me-2"></i>
                          {editPricesAddMode
                            ? "Add Company Prices"
                            : "Company Prices (Edit Price Only)"}
                        </h6>
                        <small className="text-muted">
                          {editPricesAddMode
                            ? "Add company names and their prices below."
                            : "You can only edit the price. Company, Quantity, and Unit are read-only."}
                        </small>
                      </div>
                      {editPricesAddMode && (
                        <button
                          type="button"
                          className="btn btn-outline-primary btn-sm"
                          onClick={addCompanyInEditModal}
                          disabled={updatingPrices}
                        >
                          <i className="ti ti-plus me-1"></i>
                          Add Company
                        </button>
                      )}
                    </div>

                    {editPricesFormData.companies.map((comp, cIdx) => (
                      <div key={cIdx} className="mb-3 p-3 border rounded">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <div className={editPricesAddMode ? "w-75" : "w-100"}>
                            <label className="form-label small">
                              Company Name
                            </label>
                            <input
                              type="text"
                              className="form-control form-control-sm"
                              value={comp.company}
                              onChange={
                                editPricesAddMode
                                  ? (e) =>
                                    handleEditPricesCompanyChange(
                                      cIdx,
                                      e.target.value
                                    )
                                  : undefined
                              }
                              readOnly={!editPricesAddMode}
                              disabled={!editPricesAddMode || updatingPrices}
                              style={
                                !editPricesAddMode
                                  ? { backgroundColor: "#f8f9fa" }
                                  : {}
                              }
                              placeholder={
                                editPricesAddMode
                                  ? "e.g. BLDpharm, TCI, Ambeed"
                                  : ""
                              }
                            />
                          </div>
                          {editPricesAddMode &&
                            editPricesFormData.companies.length > 1 && (
                              <button
                                type="button"
                                className="btn btn-outline-danger btn-sm ms-2 mt-4"
                                onClick={() => removeCompanyInEditModal(cIdx)}
                                disabled={updatingPrices}
                              >
                                Remove
                              </button>
                            )}
                        </div>

                        {comp.pricing.map((p, pIdx) => (
                          <div
                            key={pIdx}
                            className="row g-2 mb-2 align-items-end"
                          >
                            <div className="col-4">
                              <label className="form-label small text-muted">
                                Price (₹){" "}
                                <span className="text-danger">*</span>
                              </label>
                              <input
                                type="number"
                                className="form-control form-control-sm"
                                value={p.price}
                                onChange={(e) =>
                                  handleEditPricesPricingChange(
                                    cIdx,
                                    pIdx,
                                    "price",
                                    e.target.value,
                                  )
                                }
                                placeholder="0.00"
                                step="0.01"
                                min="0"
                                required
                                disabled={updatingPrices}
                              />
                            </div>
                            <div className="col-4">
                              <label className="form-label small text-muted">
                                Quantity
                              </label>
                              <input
                                type="number"
                                className="form-control form-control-sm"
                                value={p.quantity}
                                onChange={
                                  editPricesAddMode
                                    ? (e) =>
                                      handleEditPricesPricingChange(
                                        cIdx,
                                        pIdx,
                                        "quantity",
                                        e.target.value,
                                      )
                                    : undefined
                                }
                                readOnly={!editPricesAddMode}
                                disabled={!editPricesAddMode || updatingPrices}
                                style={
                                  !editPricesAddMode
                                    ? { backgroundColor: "#f8f9fa" }
                                    : {}
                                }
                                placeholder={editPricesAddMode ? "0" : ""}
                              />
                            </div>
                            <div className="col-3">
                              <label className="form-label small text-muted">
                                Unit
                              </label>
                              {editPricesAddMode ? (
                                <select
                                  className="form-select form-select-sm"
                                  value={p.unit}
                                  onChange={(e) =>
                                    handleEditPricesPricingChange(
                                      cIdx,
                                      pIdx,
                                      "unit",
                                      e.target.value,
                                    )
                                  }
                                  disabled={updatingPrices}
                                >
                                  <option value="mg">mg</option>
                                  <option value="gm">gm</option>
                                  <option value="ml">ml</option>
                                  <option value="kg">kg</option>
                                  <option value="mt">mt</option>
                                  <option value="ltr">ltr</option>
                                </select>
                              ) : (
                                <input
                                  type="text"
                                  className="form-control form-control-sm"
                                  value={p.unit}
                                  readOnly
                                  disabled
                                  style={{ backgroundColor: "#f8f9fa" }}
                                />
                              )}
                            </div>
                            <div className="col-1">
                              {editPricesAddMode && comp.pricing.length > 1 && (
                                <button
                                  type="button"
                                  className="btn btn-danger btn-sm"
                                  onClick={() =>
                                    removePriceRowInEditModal(cIdx, pIdx)
                                  }
                                  disabled={updatingPrices}
                                >
                                  &times;
                                </button>
                              )}
                            </div>
                          </div>
                        ))}

                        {editPricesAddMode && (
                          <button
                            type="button"
                            className="btn btn-outline-primary btn-sm"
                            onClick={() => addPriceRowInEditModal(cIdx)}
                            disabled={updatingPrices}
                          >
                            <i className="ti ti-plus me-1"></i>
                            Add Another Price
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowEditPricesModal(false);
                      setEditPricesIndex(null);
                      setEditPricesAddMode(false);
                    }}
                    disabled={updatingPrices}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={updatingPrices}
                  >
                    {updatingPrices ? (
                      <>
                        <span
                          className="spinner-border spinner-border-sm me-2"
                          role="status"
                          aria-hidden="true"
                        ></span>
                        Updating...
                      </>
                    ) : (
                      <>
                        <i className="ti ti-check me-1"></i>
                        Update Prices
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default EmailInquiriesWorking;
