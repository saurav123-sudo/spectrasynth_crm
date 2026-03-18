import "./App.css";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import React, { useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import PrivateRoute from "./components/PrivateRoute.jsx"; // import private route

import Login from "./components/login.jsx";
import ForgotPassword from "./components/ForgotPassword.jsx";
import Register from "./components/Register.jsx";

import Inquiry from "./pages/Inquiry/inquiry.jsx";
import CreateInquiry from "./pages/Inquiry/CreateInquiry.jsx";
import EditInquiry from "./pages/Inquiry/EditInquiry.jsx";
import EmailInquiries from "./pages/Inquiry/EmailInquiries.jsx";

import EmailInquiriesWorking from "./pages/Inquiry/EmailInquiriesWorking.jsx";
import NewInquiry from "./pages/Inquiry/NewInquiry.jsx";
import Technical from "./pages/technical/technical.jsx";
import Index_purchase_orders from "./pages/purchase_orders/Index_purchase_orders.jsx";
import Create_purchase_orders from "./pages/purchase_orders/Create_purchase_orders.jsx";
import Product_master from "./pages/products/product_master.jsx";
import AddProduct from "./pages/CompanyPrice/AddProduct.jsx";
import ProductList from "./pages/CompanyPrice/ProductList.jsx";
import QuotationManagement from "./pages/Quotation/QuotationManagement.jsx";

import CreateQuotation from "./pages/Quotation/CreateQuotation.jsx";
import IndexUser from "./pages/user/indexUser.jsx";
import CreateUser from "./pages/user/createUser.jsx";
import EditUser from "./pages/user/editUser.jsx";
import EditQuotation from "./pages/MarketingPrice/EditQuotation.jsx";
import EditProduct from "./pages/CompanyPrice/EditProduct.jsx";
import Technical_CreateQuotation from "./pages/technical/Technical_CreateQuotation.jsx";
import Permission from "./pages/user/permission.jsx";
import MarketingPersonList from "./pages/MarketingPrice/MarketingPersonList.jsx";
import ReviceQuotation from "./pages/Quotation/ReviceQuotation.jsx";
import QuotationRevisions from "./pages/Quotation/QuotationRevisions.jsx";
import EditPurchaseOrder from "./pages/Quotation/EditPurchasesOrder.jsx";
import Dashboard from "./pages/dashboard/Dashboard.jsx";
import POPriceList from "./pages/POPrice/POPriceList.jsx";
import AddPOPrice from "./pages/POPrice/AddPOPrice.jsx";
import EditPOPrice from "./pages/POPrice/EditPOPrice.jsx";
import ReminderHistoryList from "./pages/ReminderHistory/ReminderHistoryList.jsx";
import ReminderHistoryFollowup from "./pages/ReminderHistory/ReminderHistoryFollowup.jsx";
import LeadTimeMaster from "./pages/Master/LeadTimeMaster.jsx";

function App() {
  const [products, setProducts] = useState([]);

  const addProduct = (product) => {
    setProducts([...products, product]);
  };

  const deleteProduct = (index) => {
    setProducts(products.filter((_, i) => i !== index));
  };

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Login />} />
        <Route path="Register" element={<Register />} />
        <Route path="ForgotPassword" element={<ForgotPassword />} />

        {/* Protected Routes */}
        <Route element={<PrivateRoute />}>
          <Route path="/dashboard" element={<Layout />}>
            <Route
              path="QuotationManagement"
              element={<QuotationManagement />}
            />
            {/* <Route path="QuotationManagement/ViewQuotation/:quotation_number" element={<ViewQuotation />} />
            <Route path="QuotationManagement/CreateQuotation/:inquiry_number" element={<CreateQuotation />} /> */}
            <Route
              path="QuotationManagement/Revice_Quotation/:quotation_number"
              element={<ReviceQuotation />}
            />
            <Route
              path="QuotationManagement/Revice_history/:quotation_number"
              element={<QuotationRevisions />}
            />
            <Route
              path="QuotationManagement/GeneratePurchase/:quotation_number"
              element={<EditPurchaseOrder />}
            />

            <Route
              path="ProductList"
              element={
                <ProductList products={products} onDelete={deleteProduct} />
              }
            />
            <Route
              path="ProductList/AddProduct"
              element={<AddProduct onAdd={addProduct} />}
            />
            <Route
              path="ProductList/EditProductPrice/:id"
              element={<EditProduct />}
            />
            <Route path="product_master" element={<Product_master />} />
            <Route
              path="Index_purchase_orders"
              element={<Index_purchase_orders />}
            />
            <Route
              path="Index_purchase_orders/Create_purchase_orders"
              element={<Create_purchase_orders />}
            />
            <Route path="Technical" element={<Technical />} />
            <Route
              path="Technical/technical_CreateQuotation/:inquiry_number"
              element={<Technical_CreateQuotation />}
            />

            <Route path="Inquiry" element={<Inquiry />} />
            <Route path="Inquiry/new-inquiry" element={<NewInquiry />} />
            <Route
              path="Inquiry/EmailInquiries/:inquiry_number"
              element={<EmailInquiries />}
            />
            <Route
              path="Inquiry/new-email-inquiry"
              element={<EmailInquiriesWorking />}
            />
            <Route
              path="Inquiry/EditInquiry/:inquiry_number"
              element={<EditInquiry />}
            />
            <Route path="Inquiry/CreateInquiry" element={<CreateInquiry />} />
            <Route path="IndexUser" element={<IndexUser />} />
            <Route path="IndexUser/CreateUser" element={<CreateUser />} />
            <Route path="IndexUser/EditUser/:id" element={<EditUser />} />

            <Route path="IndexUser/Permission/:id" element={<Permission />} />

            <Route path="marketing_person" element={<MarketingPersonList />} />
            <Route
              path="marketing_person/EditQuotation/:quotation_number"
              element={<EditQuotation />}
            />
            <Route path="po-price" element={<POPriceList />} />
            <Route path="po-price/add" element={<AddPOPrice />} />
            <Route path="po-price/edit/:id" element={<EditPOPrice />} />
            <Route path="reminder-history" element={<ReminderHistoryList />} />
            <Route path="reminder-followup" element={<ReminderHistoryFollowup />} />
            <Route path="Dashboard" element={<Dashboard />} />
            
            {/* Master Data Routes */}
            <Route path="lead-time-master" element={<LeadTimeMaster />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
