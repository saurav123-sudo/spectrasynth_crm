import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../../apis/axiosConfig"; // import your axiosInstance

const TechnicalList = () => {
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchInquiries = async () => {
      try {
        const response = await axiosInstance.get(
          "/api/technical/fetchInquiries",
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );

        const data = await response.json();

        if (response.ok) {
          const formatted = data.map((item) => {
            // Original creation date
            const inquiryDate = new Date(item.createdAt);

            // Use inquiry_update_date  if exists, otherwise fallback to createdAt
            const referenceDate = item.inquiry_update_date
              ? new Date(item.inquiry_update_date)
              : inquiryDate;

            // Calculate difference in milliseconds
            const diffMs = new Date() - referenceDate;

            // Convert milliseconds to days
            const daysSinceForwarded = Math.floor(
              diffMs / (1000 * 60 * 60 * 24)
            );

            return {
              inquiry_number: item.inquiry_number,
              customer_name: item.customer_name,
              inquiry_date: inquiryDate.toLocaleDateString(),
              days_since_forwarded: daysSinceForwarded,
              current_stage: item.current_stage,
              technical_status: item.technical_status,
              inquiry_by: item.inquiry_by,
            };
          });

          setInquiries(formatted);
        } else {
          Swal.fire({
            icon: "error",
            title: "Error",
            text: data.error || "Failed to fetch inquiries",
          });
        }
      } catch (error) {
        console.error(error);
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "Something went wrong while fetching inquiries",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchInquiries();
  }, []);

  // const handleStatusChange = async (inquiry_number, currentStatus) => {
  //   if (currentStatus === "forwarded") return; // prevent updating again

  //   try {
  //     const response = await fetch(
  //       `http://localhost:8000/api/technical/updateStatus/${inquiry_number}`,
  //       {
  //         method: "PUT",
  //         headers: {
  //           "Content-Type": "application/json",
  //           Authorization: `Bearer ${localStorage.getItem("token")}`,
  //         },
  //         body: JSON.stringify({ technical_status: "forwarded" }),
  //       }
  //     );

  //     if (response.ok) {
  //       setInquiries((prev) =>
  //         prev.map((inq) =>
  //           inq.inquiry_number === inquiry_number
  //             ? {
  //                 ...inq,
  //                 technical_status: "forwarded",
  //                 days_since_forwarded: 0,
  //               }
  //             : inq
  //         )
  //       );
  //       Swal.fire({
  //         icon: "success",
  //         title: "Status Updated",
  //         text: "Inquiry marked as forwarded",
  //         timer: 1500,
  //         showConfirmButton: false,
  //       });
  //     } else {
  //       Swal.fire({
  //         icon: "error",
  //         title: "Error",
  //         text: "Failed to update status.",
  //       });
  //     }
  //   } catch (error) {
  //     console.error("Error updating status:", error);
  //     Swal.fire({
  //       icon: "error",
  //       title: "Error",
  //       text: "Something went wrong while updating status",
  //     });
  //   }
  // };

  if (loading) {
    return (
      <div className="text-center mt-5">
        <h5>Loading inquiries...</h5>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      <div className="container mt-4">
        <h2>Technical Evaluation - Inquiries</h2>

        <table className="table table-bordered">
          <thead>
            <tr>
              <th>Inquiry Number</th>
              <th>Employee Email ID</th>
              <th>Inquiry Date</th>
              {/* <th>Inquiry_forwarded_by</th> */}
              <th>Date</th>
              <th>Current Stage</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {inquiries.length > 0 ? (
              inquiries.map((inquiry) => (
                <tr key={inquiry.inquiry_number}>
                  <td>{inquiry.inquiry_number}</td>
                  <td>{inquiry.customer_name}</td>
                  <td>{inquiry.inquiry_date}</td>
                  {/* <td>{inquiry.inquiry_by}</td> */}
                  <td>{inquiry.days_since_forwarded}</td>
                  <td>{inquiry.current_stage}</td>
                  <td>
                    {inquiry.technical_status === "pending" ? (
                      <button
                        className="btn btn-sm btn-warning"
                        // onClick={() =>
                        //   handleStatusChange(
                        //     inquiry.inquiry_number,
                        //     inquiry.technical_status
                        //   )
                        // }
                      >
                        New Inquiry
                      </button>
                    ) : (
                      <span className="badge bg-success">Forwarded</span>
                    )}
                    <br />
                    <button
                      className="btn btn-info btn-sm mt-2"
                      onClick={() =>
                        navigate(
                          `technical_CreateQuotation/${inquiry.inquiry_number}`
                        )
                      }
                    >
                      view
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="text-center">
                  No inquiries available for evaluation.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TechnicalList;
