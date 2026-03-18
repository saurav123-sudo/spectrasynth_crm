import React, { useEffect, useState } from "react";

import { Link, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { jwtDecode } from "jwt-decode";
import axiosInstance from "../../apis/axiosConfig";
// import "../../assets/css/style.css"
const IMAGE_BASE = import.meta.env.VITE_IMAGE_BASE_URL;

const Header = () => {
  const navigate = useNavigate();

  const [userProfile, setUserProfile] = useState(null);
  const avatarUrl = userProfile?.avatar
    ? `${IMAGE_BASE}${userProfile.avatar}`
    : "/assets/img/profiles/avatar-20.jpg";

  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await axiosInstance.get("/api/users/me");
        // your backend returns user directly or { user }
        setUserProfile(res.data.user || res.data);
      } catch (err) {
        console.error("Failed to load user profile", err);
      }
    };
    fetchMe();
  }, []);

  const getUserFromToken = () => {
    const token = localStorage.getItem("token");
    if (!token) return null;

    try {
      return jwtDecode(token); // { id, name, email, role/roles, ... }
    } catch (e) {
      console.error("Invalid token", e);
      return null;
    }
  };

  const handleLogoutClick = (e) => {
    e.preventDefault();

    Swal.fire({
      title: "Are you sure?",
      text: "You will be logged out!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, logout",
      cancelButtonText: "Cancel",
      reverseButtons: true,
    }).then((result) => {
      if (result.isConfirmed) {
        // Remove token
        localStorage.removeItem("token"); // adjust if using sessionStorage or other auth
        navigate("/");
        Swal.fire(
          "Logged Out!",
          "You have been successfully logged out.",
          "success",
        );
      }
    });
  };

  const handleProfileClick = async (e) => {
    e.preventDefault();

    const user = getUserFromToken(); // your helper that decodes JWT
    if (!user) {
      Swal.fire("Error", "User not logged in", "error");
      return;
    }

    const rolesArray = user.role || user.roles || [];
    const rolesText = Array.isArray(rolesArray)
      ? rolesArray.join(", ")
      : String(rolesArray || "");

    let isEditing = false;
    let currentName = user.name || "";

    const renderHtml = () => {
      if (!isEditing) {
        // VIEW MODE
        return `
       <div style="text-align:center;">
  <div style="display:flex; justify-content:center; margin-bottom:12px;">
    <img
      src="${avatarUrl}"
      alt="Profile"
      style="width:200px;height:200px;border-radius:50%;object-fit:cover;"
    />
  </div>

  <div style="display:flex; justify-content:center; align-items:center; gap:10px; margin-bottom:8px;">
    <p style="margin:0;">
      <strong>Name:</strong> <span id="name-text">${currentName}</span>
    </p>
    <button id="edit-btn" class="swal2-styled" style="padding:4px 10px;">
      <i class="fa fa-edit"></i>
    </button>
  </div>

  <p style="margin:4px 0;"><strong>Email:</strong> ${user.email || "N/A"}</p>
  <p style="margin:4px 0;"><strong>Roles:</strong> ${rolesText || "N/A"}</p>
</div>

      `;
      } else {
        // EDIT MODE
        return `
        <div style="text-align:left;">
    <div style="display:flex; justify-content:center; margin-bottom:12px;">
      <img
        id="avatar-preview"
        src="${avatarUrl}"
        alt="Profile"
        style="width:150px;height:150px;border-radius:50%;object-fit:cover;"
      />
    </div>

    <div style="margin-bottom:10px;">
      <input type="file" id="avatar-input" accept="image/*" />
    </div>

    <div style="display:flex; align-items:center; justify-content:flex-start; gap:10px;">
      <label><strong>Name:</strong></label>
      <input
        id="name-input"
        class="swal2-input"
        style="margin:0; width:180px; height:34px"
        value="${currentName}"
      />
    </div>

    <p style="margin:2px 0;"><strong>Email:</strong> ${user.email || "N/A"}</p>
    <p ><strong>Roles:</strong> ${rolesText || "N/A"}</p>


    <button id="update-btn" class="swal2-styled" style="padding:6px 14px; margin-top:0px;">
      Update
    </button>
  </div>
      `;
      }
    };

    const showModal = async () => {
      await Swal.fire({
        title: "User Details",
        html: renderHtml(),
        showConfirmButton: false,
        showCancelButton: true,
        cancelButtonText: "Close",
        didOpen: () => {
          const input = document.getElementById("name-input");
          if (input) {
            input.focus();
            input.select(); // ✅ full text selected
          }

          if (!isEditing) {
            const editBtn = document.getElementById("edit-btn");
            if (editBtn) {
              editBtn.addEventListener("click", () => {
                isEditing = true;
                Swal.close();
                showModal(); // re-open in edit mode
              });
            }
          } else {
            let selectedFile = null;

            // 🖼️ Preview logic
            const fileInput = document.getElementById("avatar-input");
            const previewImg = document.getElementById("avatar-preview");

            if (fileInput) {
              fileInput.addEventListener("change", (e) => {
                const file = e.target.files[0];
                if (file) {
                  selectedFile = file;
                  const reader = new FileReader();
                  reader.onload = () => {
                    previewImg.src = reader.result; // instant preview
                  };
                  reader.readAsDataURL(file);
                }
              });
            }

            const updateBtn = document.getElementById("update-btn");
            if (updateBtn) {
              updateBtn.addEventListener("click", async () => {
                const input = document.getElementById("name-input");
                const newName = input.value.trim();

                if (newName.length < 2) {
                  Swal.showValidationMessage(
                    "Name must be at least 2 characters",
                  );
                  return;
                }

                try {
                  let nameUpdated = false;
                  let avatarUpdated = false;
                  let updatedUser = null;

                  // 1️⃣ Update name if changed
                  if (newName !== currentName) {
                    const resName = await axiosInstance.put(
                      "/api/users/update-name",
                      {
                        name: newName,
                      },
                    );

                    if (resName.data?.user) {
                      updatedUser = resName.data.user;
                      setUserProfile(resName.data.user);
                      localStorage.setItem(
                        "user",
                        JSON.stringify(resName.data.user),
                      );
                    }

                    if (resName.data?.token) {
                      localStorage.setItem("token", resName.data.token);
                    }

                    currentName = newName;
                    nameUpdated = true;
                  }

                  // 2️⃣ Update avatar if selected
                  if (selectedFile) {
                    const formData = new FormData();
                    formData.append("avatar", selectedFile);

                    const resAvatar = await axiosInstance.post(
                      "/api/users/upload-avatar",
                      formData,
                      {
                        headers: { "Content-Type": "multipart/form-data" },
                      },
                    );

                    if (resAvatar.data?.user) {
                      updatedUser = resAvatar.data.user;
                      setUserProfile(resAvatar.data.user); // 🔥 updates header image
                      localStorage.setItem(
                        "user",
                        JSON.stringify(resAvatar.data.user),
                      );
                    }

                    avatarUpdated = true;
                  }

                  if (!nameUpdated && !avatarUpdated) {
                    Swal.fire("No changes", "Nothing to update", "info");
                    return;
                  }

                  isEditing = false;

                  Swal.fire(
                    "Updated!",
                    "Your profile has been updated.",
                    "success",
                  );

                  Swal.close();
                  window.location.reload(); // reopen in view mode
                } catch (err) {
                  console.error(err);
                  Swal.fire("Error", "Failed to update profile", "error");
                }
              });
            }
          }
        },
      });
    };

    showModal();
  };

  return (
    <div className="header">
      {/* Logo */}
      <div className="header-left active">
        <div className="logo logo-normal">
          <img
            src="/assets/img/spect_logo.png"
            alt="Logo"
            style={{ width: "250px", height: "auto" }}
          />
          <img
            src="/assets/img/spect_logo.png"
            className="white-logo"
            alt="Logo"
          />
        </div>

        <div className="logo-small">
          <img src="/assets/img/spect_logo.png" alt="Logo" />
        </div>

        <a id="toggle_btn" href="#" onClick={(e) => e.preventDefault()}>
          <i className="ti ti-arrow-bar-to-left"></i>
        </a>
      </div>

      <a id="mobile_btn" className="mobile_btn" href="#sidebar">
        <span className="bar-icon">
          <span></span>
          <span></span>
          <span></span>
        </span>
      </a>

      <div className="header-user">
        <ul className="nav user-menu">
          <li className="nav-item nav-search-inputs me-auto">
            <div className="top-nav-search">
              <a
                href="#"
                onClick={(e) => e.preventDefault()}
                className="responsive-search"
              >
                <i className="fa fa-search"></i>
              </a>
            </div>
          </li>

          {/* Profile Dropdown */}
          <li className="nav-item dropdown has-arrow main-drop">
            <a
              href="#"
              onClick={(e) => e.preventDefault()}
              className="nav-link userset"
              data-bs-toggle="dropdown"
            >
              <span className="user-info">
                <span className="user-letter">
                  <img
                    src={avatarUrl}
                    alt="Profile"
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "50%",
                      objectFit: "cover",
                    }}
                  />
                </span>
                <span className="badge badge-success rounded-pill"></span>
              </span>
            </a>
            <div className="dropdown-menu menu-drop-user">
              <div className="profilename">
                <Link to="Dashboard" className="dropdown-item">
                  <i className="ti ti-layout-2"></i> Dashboard
                </Link>
                <a
                  href="#"
                  className="dropdown-item"
                  onClick={handleProfileClick}
                >
                  <i className="ti ti-user-pin"></i> My Profile
                </a>
                <a
                  href="#"
                  className="dropdown-item"
                  onClick={handleLogoutClick}
                >
                  <i className="ti ti-lock"></i> Logout
                </a>
              </div>
            </div>
          </li>
        </ul>
      </div>

      {/* Mobile Menu */}
      <div className="dropdown mobile-user-menu">
        <a
          href="#"
          onClick={(e) => e.preventDefault()}
          className="nav-link dropdown-toggle"
          data-bs-toggle="dropdown"
          aria-expanded="false"
        >
          <i className="fa fa-ellipsis-v"></i>
        </a>
        <div className="dropdown-menu">
          <Link to="/dashboard" className="dropdown-item">
            <i className="ti ti-layout-2"></i> Dashboard
          </Link>
          <a href="#" className="dropdown-item" onClick={handleProfileClick}>
            <i className="ti ti-user-pin"></i> My Profile
          </a>
          <a href="#" className="dropdown-item" onClick={handleLogoutClick}>
            <i className="ti ti-lock"></i> Logout
          </a>
        </div>
      </div>
    </div>
  );
};

export default Header;
