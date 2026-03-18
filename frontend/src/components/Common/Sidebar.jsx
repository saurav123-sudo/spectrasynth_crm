import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import axiosInstance from "../../apis/axiosConfig";
import "../../assets/css/style.css";

const Sidebar = () => {
  const location = useLocation();
  const [permissions, setPermissions] = useState({});
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("User");
  const [userAvatar, setUserAvatar] = useState(
    "/assets/img/profiles/avatar-14.jpg",
  );
  const [roles, setRoles] = useState([]);

  const fetchMe = async () => {
  try {
    const res = await axiosInstance.get("/api/users/me");
    const user = res.data.user || res.data;

    setUserName(user.name || "User");
    

    if (user.avatar) {
      setUserAvatar(import.meta.env.VITE_IMAGE_BASE_URL + user.avatar);
    } else {
      setUserAvatar("/assets/img/profiles/avatar-14.jpg");
    }
  } catch (err) {
    console.error("Failed to fetch user", err);
  }
};


  useEffect(() => {
  const token = localStorage.getItem("token");

  // 1️⃣ First try to read from localStorage user (updated data)
  // const storedUser = localStorage.getItem("user");
  // if (storedUser) {
  //   const user = JSON.parse(storedUser);
  //   setUserName(user.name || "User");
  //   if (user.avatar) {
  //     setUserAvatar(import.meta.env.VITE_IMAGE_BASE_URL + user.avatar);
  //   }
  // }

  // 2️⃣ Read roles from token
  if (token) {
    try {
      const decoded = jwtDecode(token);
      setRoles(decoded.roles || []);
    } catch (e) {
      console.error("Invalid token");
    }
  }

  // const handleStorageChange = () => {
  //   const storedUser = localStorage.getItem("user");
  //   if (storedUser) {
  //     const user = JSON.parse(storedUser);
  //     setUserName(user.name || "User");
  //     if (user.avatar) {
  //       setUserAvatar(import.meta.env.VITE_IMAGE_BASE_URL + user.avatar);
  //     }
  //   }
  // };

  // window.addEventListener("storage", handleStorageChange);

  // // Sync once immediately
  // handleStorageChange();

  const fetchPermissions = async () => {
    try {
      const res = await axiosInstance.get("/api/users/fetch/permissions", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const permsArray = res.data.permissions || [];
      const permsMap = {};
      permsArray.forEach((p) => {
        permsMap[p.module_name] = p;
      });

      setPermissions(permsMap);
    } catch (err) {
      console.error("Failed to fetch permissions", err);
    } finally {
      setLoading(false);
    }
  };

  fetchMe();

  fetchPermissions();

  // return () => {
  //   window.removeEventListener("storage", handleStorageChange);
  // };
}, []);


  const isAdmin = roles.includes("admin");

  const navLinks = [
    {
      to: "Dashboard",
      label: "Dashboard",
      icon: "ti ti-dashboard",
      module: null,
    },
    {
      to: "Inquiry",
      label: "Inquiry",
      icon: "form-check-input me-3 ti ti-file-plus",
      module: "inquiry",
    },
    {
      to: "Technical",
      label: "Technical Person",
      icon: "form-check-input me-3 ti ti-tools",
      module: "technical_person",
    },
    {
      to: "marketing_person",
      label: "Marketing Person",
      icon: "form-check-input me-3 ti ti-trending-up",
      module: "marketing_person",
    },
    {
      to: "product_master",
      label: "Product",
      icon: "form-check-input me-3 ti ti-package",
      module: "product",
    },
    {
      to: "ProductList",
      label: "Company Price",
      icon: "form-check-input me-3  ti ti-target",
      module: "company_price",
    },
    {
      to: "QuotationManagement",
      label: "Quotations",
      icon: "form-check-input me-3 ti ti-file-text",
      module: "quotation",
    },
    {
      to: "IndexUser",
      label: "Users",
      icon: "form-check-input me-3 ti ti-refresh",
      module: "users",
    },
    {
      to: "po-price",
      label: "PO Price",
      icon: "form-check-input me-3  ti ti-currency-dollar",
      module: "purchase_order",
    },
    {
      to: "reminder-history",
      label: "Reminder History",
      icon: "form-check-input me-3 ti ti-bell",
      module: "reminder_history",
    },
    {
      to: "reminder-followup",
      label: "Reminder Followup",
      icon: "form-check-input me-3  ti ti-clipboard-check",
      module: "reminder_followup",
    },
    {
      to: "lead-time-master",
      label: "Lead Time Master",
      icon: "form-check-input me-3 ti ti-clock",
    },
  ];

  if (loading) return null;

  const filteredLinks = isAdmin
    ? navLinks
    : navLinks.filter((item) => {
        if (item.module === null) return true; // Dashboard always
        return !!permissions[item.module]?.can_read;
      });

  return (
    <div className="sidebar mr-9" id="sidebar">
      <div className="sidebar-inner slimscroll">
        <div className="sidebar" id="sidebar">
          <div className="profile-section">
            <img src={userAvatar
              
            } alt="Profile" />
            <div className="user-names">
              <h5>{userName}</h5>
              <h6>
                {roles.length > 0
                  ? roles
                      .map((r) => r.charAt(0).toUpperCase() + r.slice(1))
                      .join(", ")
                  : "Role"}
              </h6>
            </div>
          </div>
          <ul className="sidebar-menu">
            {filteredLinks.map((item) => (
              <li className="sidebar-item" key={item.to}>
                <Link
                  to={item.to}
                  className={
                    "sidebar-link" +
                    (location.pathname.includes(item.to) ? " active" : "")
                  }
                >
                  <i className={`sidebar-icon ${item.icon}`}></i>
                  <span>{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
          <style>
            {`
        .sidebar {
          background: #fff;
          min-height: 100vh;
          border-right: 1px solid #e9e9e9;
          padding: 0px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start; 
          padding-bottom: 40px;
        }
        .profile-section {
          display: flex;
          align-items: center;
          padding: 12px 8px 12px 22px;
          gap: 10px;
          border-radius: 10px;
          margin: 24px 8px 0 0;
          background: #f7f7fd;
          width: 90%;
        }
        .profile-section img {
          width: 36px;
          height: 36px;
          border-radius: 6px;
          object-fit: cover;
        }
        .profile-section .user-names h5 {
          font-size: 14.3px;
          margin: 0 0 3px 0;
          color: #161616;
          font-weight: 600;
        }
        .profile-section .user-names h6 {
          font-size: 12px;
          margin: 0;
          color: #818181;
        }
        .sidebar-menu {
          margin-top: 7px;
          overflow-y: auto;  
        }
        .sidebar-menu::-webkit-scrollbar {
        width: 0px;
        background: transparent;
        }

        .sidebar-item {
          margin-bottom: 7px;
        }
        .sidebar-link {
          display: flex;
          align-items: center;
          gap: 10px;
          border-radius: 10px;
          font-size: 15.7px;
          font-weight: 500;
          padding: 9px 14px 9px 18px;
          color: #232323;
          background: transparent;
          text-decoration: none;
          transition: background 0.18s, color 0.14s;
        }
        .sidebar-link .sidebar-icon {
          font-size: 18px;
          margin-right: 2px;
          color: #989898;
          transition: color 0.17s;
        }
        .sidebar-link.active {
          background: #ffe2d1;
          color: #e65000;
          font-weight: 600;
        }
        .sidebar-link.active .sidebar-icon {
          color: #ff6600 !important;
        }
        .sidebar-link:hover {
          background: #ffe7dc;
          color: #ff6600;
        }
        .sidebar-link:hover .sidebar-icon {
          color: #ff6600;
        }
        `}
          </style>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
