import React, { useEffect, useState, useRef } from "react";
import axios from "../../apis/axiosConfig";
import ApexCharts from "apexcharts";
import { Link } from "react-router-dom";
import { formatInquiryNumberForDisplay } from "../../utils/inquiryNumberUtils";

// We assume jQuery, moment, and daterangepicker are loaded globally
// by your template's <script> tags.
const $ = window.jQuery || window.$;
const moment = window.moment;

const Dashboard = () => {
  // ------------------- Filters -------------------
  // --- Individual Card Filters (Kept) ---
  const [inquiryDaysFilter, setInquiryDaysFilter] = useState(30);
  const [dealsDaysFilter, setDealsDaysFilter] = useState(30);
  const [yearlyMonthsFilter, setYearlyMonthsFilter] = useState(3);
  const [reminderDaysFilter, setReminderDaysFilter] = useState(7);

  // --- Master Global Filter (New) ---
  const [isGlobalFilterActive, setIsGlobalFilterActive] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: moment().subtract(29, "days"),
    endDate: moment(),
  });

  // ------------------- Data -------------------
  const [recentInquiries, setRecentInquiries] = useState([]);
  const [inquiries, setInquiries] = useState([]);
  const [selectedInquiry, setSelectedInquiry] = useState(null);
  const [mixedReminders, setMixedReminders] = useState([]);

  // ------------------- Pagination -------------------
  const [currentInquiryPage, setCurrentInquiryPage] = useState(1);
  const [currentReminderPage, setCurrentReminderPage] = useState(1);
  const inquiriesPerPage = 5;
  const remindersPerPage = 3;

  // ------------------- Refs -------------------
  const chartRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const leadsChartRef = useRef(null);
  const leadsChartInstanceRef = useRef(null);
  const yearlyChartRef = useRef(null);
  const yearlyChartInstanceRef = useRef(null);
  const dateRangeInputRef = useRef(null); // Ref for the header input

  const stages = [
    "inquiry_received",
    "technical_review",
    "management_review",
    "finalize_quotation",
  ];

  // ------------------- Fetch Functions (UPDATED) -------------------
  // These functions are now flexible to accept days OR dates

  const fetchRecentInquiries = async (
    days = null,
    startDate = null,
    endDate = null,
  ) => {
    try {
      const params = {};
      if (days && !isGlobalFilterActive) {
        params.days = days;
      } else if (startDate && endDate && isGlobalFilterActive) {
        params.startDate = startDate.format("YYYY-MM-DD");
        params.endDate = endDate.format("YYYY-MM-DD");
      }

      const res = await axios.get(`/api/inquiries/recent`, { params });
      setRecentInquiries(res.data);
      setCurrentInquiryPage(1);
    } catch (error) {
      console.error("Error fetching recent inquiries:", error);
    }
  };

  const fetchStageCounts = async (
    days = null,
    startDate = null,
    endDate = null,
  ) => {
    try {
      const params = {};
      if (days && !isGlobalFilterActive) {
        params.range = days;
      } else if (startDate && endDate && isGlobalFilterActive) {
        params.startDate = startDate.toISOString();
        params.endDate = endDate.toISOString();
      }

      const res = await axios.get(`/api/inquiries/stagecount`, { params });
      const data = res.data;

      // Fixed stage sequence
      const stages = [
        "inquiry_received",
        "technical_review",
        "management_review",
        "finalize_quotation",
      ];

      // Map API counts to fixed stage order
      const countsMap = {};
      data.forEach((item) => {
        // Map purchase_order to finalize_quotation if needed
        let stage =
          item.current_stage === "purchase_order"
            ? "finalize_quotation"
            : item.current_stage;
        countsMap[stage] = Number(item.count);
      });

      const labels = stages.map((s) => s.replace(/_/g, " ").toUpperCase());
      const counts = stages.map((s) => countsMap[s] || 0); // fill 0 if missing

      const options = {
        series: [{ name: "Deals", data: counts }],
        chart: { type: "bar", height: 275 },
        plotOptions: {
          bar: { borderRadiusApplication: "around", columnWidth: "40%" },
        },
        colors: ["#00918E"],
        xaxis: { categories: labels },
        yaxis: { title: { text: "Count" }, min: 0 },
      };

      if (chartInstanceRef.current) chartInstanceRef.current.destroy();
      chartInstanceRef.current = new ApexCharts(chartRef.current, options);
      chartInstanceRef.current.render();
    } catch (err) {
      console.error("Error fetching stage counts:", err);
    }
  };

  const fetchYearlyData = async (
    months = null,
    startDate = null,
    endDate = null,
  ) => {
    try {
      const params = {};
      if (months && !isGlobalFilterActive) {
        params.months = months;
      } else if (startDate && endDate && isGlobalFilterActive) {
        params.startDate = startDate.format("YYYY-MM-DD");
        params.endDate = endDate.format("YYYY-MM-DD");
      }

      const res = await axios.get(`/api/inquiries/yearly`, { params });
      const data = res.data;

      // This logic might need updating based on your API response
      // when using date ranges instead of months.
      const allMonths = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
      const countsMap = {};
      data.forEach((item) => {
        const [year, month] = item.year_month.split("-");
        const monthIndex = parseInt(month, 10) - 1;
        countsMap[monthIndex] = Number(item.count);
      });
      const counts = allMonths.map((_, idx) => countsMap[idx] || 0);

      const options = {
        series: [{ name: "Deals", data: counts }],
        chart: { type: "area", height: 273, zoom: { enabled: false } },
        colors: ["#E41F07"],
        dataLabels: { enabled: false },
        stroke: { curve: "straight" },
        xaxis: { categories: allMonths },
        yaxis: {
          min: 0,
          tickAmount: 5,
          labels: {
            formatter: (val) => (val >= 1000 ? val / 1000 + "K" : val),
          },
        },
        legend: { position: "top", horizontalAlign: "left" },
      };

      if (yearlyChartInstanceRef.current)
        yearlyChartInstanceRef.current.destroy();
      yearlyChartInstanceRef.current = new ApexCharts(
        yearlyChartRef.current,
        options,
      );
      yearlyChartInstanceRef.current.render();
    } catch (err) {
      console.error("Error fetching yearly data:", err);
    }
  };

  const fetchInquiries = async () => {
    try {
      const res = await axios.get("/api/inquiries/getInquiryNumber");
      setInquiries(res.data.data);
      if (res.data.data.length > 0) setSelectedInquiry(res.data.data[0]);
    } catch (err) {
      console.error("Error fetching inquiries:", err);
    }
  };

  const fetchDashboardReminders = async (days = 1) => {
    try {
      const token = localStorage.getItem("token");

      const params = { days }; // 👈 send days to backend

      const [pendingRes, followupRes] = await Promise.all([
        axios.get("/api/quotations/reminders", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get("/api/quotations/reminders/followup", {
          headers: { Authorization: `Bearer ${token}` },
          params:{days}
        }),
      ]);

      const pending = (pendingRes.data.data || []).map((r) => ({
        ...r,
        followupStatus: "pending",
      }));

      const taken = (followupRes.data.data || []).map((r) => ({
        ...r,
        followupStatus: "taken",
      }));

      setMixedReminders([...pending, ...taken]);
    } catch (err) {
      console.error("Error fetching dashboard reminders:", err);
    }
  };

  // --- UPDATED Refresh Handler ---
  const handleRefresh = () => {
    // Re-fetch all data, respecting the current filter mode
    if (isGlobalFilterActive) {
      fetchRecentInquiries(null, dateRange.startDate, dateRange.endDate);
      fetchStageCounts(null, dateRange.startDate, dateRange.endDate);
      fetchYearlyData(null, dateRange.startDate, dateRange.endDate);
    } else {
      fetchRecentInquiries(inquiryDaysFilter);
      fetchStageCounts(dealsDaysFilter);
      fetchYearlyData(yearlyMonthsFilter);
    }
    // Fetch non-filtered data
    fetchDashboardReminders();
    fetchInquiries();
  };

  // ------------------- Effects -------------------

  // --- NEW: Master useEffect to control all data fetching ---
  useEffect(() => {
    if (isGlobalFilterActive) {
      // Global filter is ON
      fetchRecentInquiries(null, dateRange.startDate, dateRange.endDate);
      fetchStageCounts(null, dateRange.startDate, dateRange.endDate);
      fetchYearlyData(null, dateRange.startDate, dateRange.endDate);
    } else {
      // Global filter is OFF, use individual filters
      fetchRecentInquiries(inquiryDaysFilter);
      fetchStageCounts(dealsDaysFilter);
      fetchYearlyData(yearlyMonthsFilter);
    }
  }, [
    isGlobalFilterActive,
    dateRange,
    inquiryDaysFilter,
    dealsDaysFilter,
    yearlyMonthsFilter,
  ]);

  // - This effect initializes the jQuery plugin ---
  useEffect(() => {
    if (
      !dateRangeInputRef.current ||
      !$ ||
      !$(dateRangeInputRef.current).daterangepicker ||
      !moment
    ) {
      console.warn(
        "jQuery, Moment, or Daterangepicker not found. Cannot initialize master filter.",
      );
      return;
    }

    const picker = $(dateRangeInputRef.current);

    picker.daterangepicker({
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      ranges: {
        Today: [moment().startOf("day"), moment().endOf("day")],
        Yesterday: [
          moment().subtract(1, "days").startOf("day"),
          moment().subtract(1, "days").endOf("day"),
        ],
        "Last 7 Days": [
          moment().subtract(6, "days").startOf("day"),
          moment().endOf("day"),
        ],
        "Last 30 Days": [
          moment().subtract(29, "days").startOf("day"),
          moment().endOf("day"),
        ],
        "This Month": [moment().startOf("month"), moment().endOf("month")],
        "Last Month": [
          moment().subtract(1, "month").startOf("month"),
          moment().subtract(1, "month").endOf("month"),
        ],
      },
    });

    // Link the plugin's "apply" event to our React state
    picker.on("apply.daterangepicker", (ev, picker) => {
      setDateRange({
        startDate: picker.startDate,
        endDate: picker.endDate,
      });
      setIsGlobalFilterActive(true); // <-- Activate global filter
    });

    // Link the "cancel" event to deactivate global filter
    picker.on("cancel.daterangepicker", (ev, picker) => {
      setIsGlobalFilterActive(false); // <-- Deactivate global filter
    });

    // Cleanup
    return () => {
      picker.data("daterangepicker")?.remove();
    };
  }, []); // Run only once on mount

  // --- This effect fetches non-filtered data on initial load ---
  useEffect(() => {
    fetchDashboardReminders(reminderDaysFilter);
    fetchInquiries();
  }, [reminderDaysFilter]);

  // --- Leads Chart (no changes) ---
  useEffect(() => {
    if (!selectedInquiry) return;
    // ... (rest of leads chart logic is unchanged) ...
    const seriesData = stages.map((stage) =>
      stage === selectedInquiry.current_stage ? 1 : 0,
    );

    const options = {
      series: [{ name: "Stage Status", data: seriesData }],
      chart: { type: "line", height: 150, toolbar: { show: false } },
      stroke: { curve: "straight", width: 2, colors: ["#000"] },
      markers: {
        size: 6,
        colors: seriesData.map((val) => (val === 1 ? "#00918E" : "#000")),
        hover: { sizeOffset: 2 },
      },
      xaxis: {
        categories: stages.map((s) => s.replace(/_/g, " ").toUpperCase()),
      },
      yaxis: { min: 0, max: 1, tickAmount: 1, labels: { formatter: () => "" } },
      tooltip: {
        shared: false,
        custom: ({ series, seriesIndex, dataPointIndex }) => {
          const stageKey = stages[dataPointIndex]; // e.g., "technical_review"
          const stageName = stageKey.replace(/_/g, " ").toUpperCase();
          const inquiry = selectedInquiry.inquiry_number;

          // Map stage to the correct date field in selectedInquiry
          const stageDateMap = {
            inquiry_received: selectedInquiry.inquiry_update_date,
            technical_review: selectedInquiry.technical_update_date,
            management_review: selectedInquiry.management_update_date,
            finalize_quotation: selectedInquiry.management_update_date, // or po_update_date if you want
            po_generated: selectedInquiry.po_update_date,
          };

          const date = stageDateMap[stageKey]
            ? new Date(stageDateMap[stageKey]).toLocaleDateString("en-IN")
            : "-";

          const isCurrent = series[seriesIndex][dataPointIndex] === 1;

          return `<div style="padding:5px">
              <strong>Inquiry:</strong> ${inquiry}<br/>
              <strong>Stage:</strong> ${stageName} ${
                isCurrent ? "(Current)" : ""
              }<br/>
              <strong>Date:</strong> ${date}
            </div>`;
        },
      },
    };

    if (leadsChartInstanceRef.current) leadsChartInstanceRef.current.destroy();
    leadsChartInstanceRef.current = new ApexCharts(
      leadsChartRef.current,
      options,
    );
    leadsChartInstanceRef.current.render();
  }, [selectedInquiry]);

  // ------------------- Pagination (no changes) -------------------
  const indexOfLastInquiry = currentInquiryPage * inquiriesPerPage;
  const indexOfFirstInquiry = indexOfLastInquiry - inquiriesPerPage;
  const currentInquiries = recentInquiries.slice(
    indexOfFirstInquiry,
    indexOfLastInquiry,
  );
  const totalInquiryPages = Math.ceil(
    recentInquiries.length / inquiriesPerPage,
  );
  // ... (rest of pagination logic is unchanged) ...
  const indexOfLastReminder = currentReminderPage * remindersPerPage;
  const indexOfFirstReminder = indexOfLastReminder - remindersPerPage;
  const currentReminders = mixedReminders.slice(
    indexOfFirstReminder,
    indexOfLastReminder,
  );
  const totalReminderPages = Math.ceil(
    mixedReminders.length / remindersPerPage,
  );

  const handleInquiryPageChange = (page) => setCurrentInquiryPage(page);
  const handleReminderPageChange = (page) => setCurrentReminderPage(page);

  const getRowBg = (reminder_date) => {
    // ... (rest of getRowBg logic is unchanged) ...
    const today = new Date();
    const reminder = new Date(reminder_date);
    today.setHours(0, 0, 0, 0);
    reminder.setHours(0, 0, 0, 0);

    const diffDays = Math.floor((today - reminder) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "bg-danger text-white";
    if (diffDays === 1) return "bg-warning text-dark";
    if (diffDays === 2) return "bg-info text-dark";
    return "";
  };

  // ------------------- JSX (UPDATED) -------------------
  return (
    <div className="main-wrapper">
      <div className="page-wrapper">
        <div className="content">
          {/* Page Header */}
          <div className="row">
            <div className="col-md-12">
              <div className="page-header">
                <div className="row align-items-center">
                  <div className="col-md-4">
                    <h3 className="page-title">Inquiry Dashboard</h3>
                    <small className="text-muted">Inquiry format: SSPC-INQ-YYMM-NNN</small>
                  </div>
                  <div className="col-md-8 float-end ms-auto">
                    <div className="d-flex title-head">
                      <div className="daterange-picker d-flex align-items-center justify-content-center">
                        <div className="form-sort me-2">
                          <i className="ti ti-calendar"></i>
                          {/* --- ADDED REF TO INPUT --- */}
                          <input
                            ref={dateRangeInputRef}
                            type="text"
                            className="form-control date-range bookingrange"
                          />
                        </div>

                        {/* --- NEW: Conditional Clear Button --- */}
                        {isGlobalFilterActive && (
                          <button
                            className="btn btn-sm btn-outline-danger me-2"
                            onClick={() => setIsGlobalFilterActive(false)}
                            data-bs-toggle="tooltip"
                            data-bs-placement="top"
                            title="Clear Global Filter"
                          >
                            <i className="ti ti-x"></i>
                          </button>
                        )}
                        {/* --- END: New Button --- */}

                        <div className="head-icons mb-0">
                          <a
                            href="#!"
                            onClick={(e) => {
                              e.preventDefault();
                              handleRefresh();
                            }}
                            data-bs-toggle="tooltip"
                            data-bs-placement="top"
                            title="Refresh"
                          >
                            <i className="ti ti-refresh-dot"></i>
                          </a>
                          <a
                            href="javascript:void(0);"
                            data-bs-toggle="tooltip"
                            data-bs-placement="top"
                            title="Collapse"
                            id="collapse-header"
                          >
                            <i className="ti ti-chevrons-up"></i>
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recently Created Inquiries & Deals By Stage */}
          <div className="row">
            {/* Recently Created Inquiries */}
            <div className="col-md-6 d-flex">
              <div className="card flex-fill">
                {/* --- Individual Filter Dropdown (Kept) --- */}
                <div className="card-header border-0 pb-0 d-flex justify-content-between">
                  <h4>
                    <i className="ti ti-grip-vertical me-1"></i>
                    Recently Created Inquiries
                  </h4>
                  {/* --- This dropdown is now VISUALLY DISABLED if global filter is on --- */}
                  <div className="dropdown">
                    <a
                      className={`dropdown-toggle ${
                        isGlobalFilterActive ? "disabled" : ""
                      }`}
                      data-bs-toggle="dropdown"
                      href="#"
                    >
                      Last {inquiryDaysFilter} Days
                    </a>
                    <div className="dropdown-menu dropdown-menu-end">
                      {[7, 15, 30].map((d) => (
                        <button
                          key={d}
                          className="dropdown-item"
                          onClick={() => {
                            setInquiryDaysFilter(d);
                            fetchRecentInquiries(d);
                          }}
                        >
                          Last {d} Days
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="card-body">
                  <div className="table-responsive custom-table">
                    {/* ... (table JSX is unchanged) ... */}
                    <table className="table dataTable">
                      <thead className="thead-light">
                        <tr>
                          <th>Inquiry Number</th>
                          <th>Employee Name</th>
                          <th>Date</th>
                          <th>Stage</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentInquiries.length > 0 ? (
                          currentInquiries.map((inq) => {
                            const stage =
                              inq.current_stage?.toLowerCase() || "";
                            let colorClass = "bg-light text-dark";
                            if (stage === "inquiry_received")
                              colorClass = "bg-primary text-white";
                            else if (stage === "technical_review")
                              colorClass = "bg-info text-dark";
                            else if (stage === "management_review")
                              colorClass = "bg-warning text-dark";
                            else if (stage === "finalize_quotation")
                              colorClass = "bg-success text-white";

                            return (
                              <tr key={inq.inquiry_number}>
                                <td>{formatInquiryNumberForDisplay(inq.inquiry_number, inq.createdAt)}</td>
                                <td>{inq.customer_name || "N/A"}</td>
                                <td>
                                  {new Date(inq.createdAt).toLocaleDateString()}
                                </td>
                                <td>
                                  <span
                                    className={`badge px-3 py-2 rounded-pill ${colorClass}`}
                                  >
                                    {stage.replace(/_/g, " ").toUpperCase() ||
                                      "N/A"}
                                  </span>
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan="4" className="text-center text-muted">
                              No inquiries found for the selected range
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {totalInquiryPages > 1 && (
                    <nav className="mt-3">
                      {/* ... (pagination JSX is unchanged) ... */}
                      <ul className="pagination justify-content-center mb-0">
                        {[...Array(totalInquiryPages)].map((_, index) => (
                          <li
                            key={index}
                            className={`page-item ${
                              currentInquiryPage === index + 1 ? "active" : ""
                            }`}
                          >
                            <button
                              className="page-link"
                              onClick={() => handleInquiryPageChange(index + 1)}
                            >
                              {index + 1}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </nav>
                  )}
                </div>
              </div>
            </div>

            {/* Deals By Stage */}
            <div className="col-md-6 d-flex">
              <div className="card flex-fill">
                {/* --- Individual Filter Dropdown (Kept) --- */}
                <div className="card-header border-0 pb-0 d-flex justify-content-between">
                  <h4>
                    <i className="ti ti-grip-vertical me-1"></i>
                    Deals By Stage
                  </h4>
                  {/* --- This dropdown is now VISUALLY DISABLED if global filter is on --- */}
                  <div className="dropdown">
                    <a
                      className={`dropdown-toggle ${
                        isGlobalFilterActive ? "disabled" : ""
                      }`}
                      data-bs-toggle="dropdown"
                      href="#"
                    >
                      Last {dealsDaysFilter} Days
                    </a>
                    <div className="dropdown-menu dropdown-menu-end">
                      {[7, 15, 30].map((d) => (
                        <button
                          key={d}
                          className="dropdown-item"
                          onClick={() => {
                            setDealsDaysFilter(d);
                            fetchStageCounts(d);
                          }}
                        >
                          Last {d} Days
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="card-body">
                  <div ref={chartRef}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Leads By Stage & Recently Due Reminders */}
          <div className="row">
            {/* Leads By Stage (no changes here) */}
            <div className="col-md-6 d-flex">
              {/* ... (JSX is unchanged) ... */}
              <div className="card flex-fill">
                <div className="card-header border-0 pb-0 d-flex justify-content-between">
                  <h4 className="mb-0">
                    <i className="ti ti-grip-vertical me-1"></i>Leads By Stage
                  </h4>
                  <div className="ms-auto" style={{ minWidth: "200px" }}>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      placeholder="Search Inquiry"
                      list="inquiry-options"
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value) {
                          const found = inquiries.find((inq) =>
                            inq.inquiry_number
                              .toLowerCase()
                              .includes(value.toLowerCase()),
                          );
                          if (found) setSelectedInquiry(found);
                        }
                      }}
                    />
                    <datalist id="inquiry-options">
                      {inquiries.map((inq) => (
                        <option
                          key={inq.inquiry_number}
                          value={inq.inquiry_number}
                        />
                      ))}
                    </datalist>
                  </div>
                </div>
                <div className="card-body">
                  <div ref={leadsChartRef}></div>
                </div>
              </div>
            </div>

            {/* Recently Due Reminders (no changes here) */}
            <div className="col-md-6 d-flex">
              {/* ... (JSX is unchanged) ... */}
              <div className="card flex-fill">
                <div className="card-header border-0 pb-0 d-flex justify-content-between align-items-center">
                  <h4>
                    <i className="ti ti-grip-vertical me-1"></i>Recently Due
                    Reminders
                  </h4>

                  <div className="d-flex align-items-center gap-2">
                    <div className="dropdown">
                      <a
                        className="dropdown-toggle"
                        data-bs-toggle="dropdown"
                        href="#!"
                      >
                        Last {reminderDaysFilter} Days
                      </a>
                      <div className="dropdown-menu dropdown-menu-end">
                        {[7, 15, 30].map((d) => (
                          <button
                            key={d}
                            className="dropdown-item"
                            onClick={() => setReminderDaysFilter(d)}
                          >
                            Last {d} Days
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="card-body">
                  <div className="table-responsive custom-table">
                    <table className="table dataTable">
                      <thead className="thead-light">
                        <tr>
                          <th>Quotation Number</th>
                          <th>Employee Name</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentReminders.length > 0 ? (
                          currentReminders.map((reminder) => (
                            <tr key={reminder.id || reminder.quotation_number}>
                              <td>{reminder.quotation_number}</td>
                              <td>{reminder.customer_name || "N/A"}</td>
                              <td>
                                {reminder.followupStatus === "taken" ? (
                                  <span className="badge bg-success">
                                    Follow-Up Taken
                                  </span>
                                ) : (
                                  <span className="badge bg-danger">
                                    Follow-Up Pending
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="3" className="text-center text-muted">
                              No reminders found
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Reminder Pagination */}
                  {totalReminderPages > 1 && (
                    <nav className="mt-3">
                      <ul className="pagination justify-content-center mb-0">
                        {[...Array(totalReminderPages)].map((_, index) => (
                          <li
                            key={index}
                            className={`page-item ${
                              currentReminderPage === index + 1 ? "active" : ""
                            }`}
                          >
                            <button
                              className="page-link"
                              onClick={() =>
                                handleReminderPageChange(index + 1)
                              }
                            >
                              {index + 1}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </nav>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Deals by Year */}
          <div className="row">
            <div className="col-md-12 d-flex">
              <div className="card flex-fill">
                {/* --- Individual Filter Dropdown (Kept) --- */}
                <div className="card-header border-0 pb-0 d-flex justify-content-between">
                  <h4>
                    <i className="ti ti-grip-vertical me-1"></i>Inquiry by Year
                  </h4>
                  {/* --- This dropdown is now VISUALLY DISABLED if global filter is on --- */}
                  <div className="dropdown">
                    <a
                      className={`dropdown-toggle ${
                        isGlobalFilterActive ? "disabled" : ""
                      }`}
                      data-bs-toggle="dropdown"
                      href="#"
                    >
                      Last {yearlyMonthsFilter} Months
                    </a>
                    <div className="dropdown-menu dropdown-menu-end">
                      {[3, 6, 12].map((m) => (
                        <button
                          key={m}
                          className="dropdown-item"
                          onClick={() => {
                            setYearlyMonthsFilter(m);
                            fetchYearlyData(m);
                          }}
                        >
                          Last {m} Months
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="card-body">
                  <div ref={yearlyChartRef}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
