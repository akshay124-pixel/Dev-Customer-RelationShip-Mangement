import React, { useState, useCallback, useEffect, useMemo } from "react";
import { Modal, Button, Dropdown } from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";
import { toast } from "react-toastify";
import {
  FaHistory,
  FaMapMarkerAlt,
  FaAngleDown,
  FaAngleUp,
  FaEllipsisV,
} from "react-icons/fa";
import { Box, Typography, Collapse, Chip } from "@mui/material";
import styled from "styled-components";
import * as XLSX from "xlsx";
import DisableCopy from "./DisableCopy";

// Styled Components
const GradientModalHeader = styled(Modal.Header)`
  background: linear-gradient(135deg, #2575fc, #6a11cb);
  color: #fff;
  padding: 1.5rem 2rem;
  border-bottom: none;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
`;

const GradientSection = styled.div`
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.98),
    rgba(240, 240, 245, 0.98)
  );
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
  }
`;

const SectionHeader = styled(Box)`
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  padding: 0.5rem 0;
`;

const InfoRow = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
  padding: 1rem 0;
  @media (max-width: 576px) {
    grid-template-columns: 1fr;
  }
`;

const InfoItem = styled.div`
  display: flex;
  flex-direction: column;
  font-size: 1rem;
  color: #333;
`;

const Label = styled.strong`
  font-size: 0.9rem;
  color: #2575fc;
  margin-bottom: 0.5rem;
  text-transform: uppercase;
  letter-spacing: 0.6px;
`;

const Value = styled.span`
  font-size: 1rem;
  color: #444;
  word-break: break-word;
  line-height: 1.5;
`;

const HistoryContainer = styled.div`
  max-height: 300px;
  overflow-y: auto;
  padding-right: 1rem;
  margin-top: 1rem;
  &::-webkit-scrollbar {
    width: 8px;
  }
  &::-webkit-scrollbar-thumb {
    background: linear-gradient(135deg, #2575fc, #6a11cb);
    border-radius: 4px;
  }
`;

const HistoryItem = styled.div`
  position: relative;
  padding: 1rem 0 1rem 2.5rem;
  border-left: 3px solid #2575fc;
  margin-bottom: 1.5rem;
  &:before {
    content: "";
    position: absolute;
    left: -8px;
    top: 1.2rem;
    width: 16px;
    height: 16px;
    background: linear-gradient(135deg, #2575fc, #6a11cb);
    border-radius: 50%;
    box-shadow: 0 0 8px rgba(37, 117, 252, 0.6);
  }
`;

const HistoryContent = styled.div`
  background: #fff;
  padding: 1.2rem;
  border-radius: 10px;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.08);
  transition: transform 0.2s ease;
  &:hover {
    transform: translateX(10px);
  }
`;

const HistoryTimestamp = styled.div`
  font-size: 0.9rem;
  color: #666;
  margin-bottom: 0.6rem;
  font-weight: 500;
`;

const HistoryRemarks = styled.div`
  font-size: 1rem;
  color: #333;
  margin-bottom: 0.6rem;
`;

const HistoryLocation = styled.div`
  font-size: 0.9rem;
  color: #2575fc;
  display: flex;
  align-items: center;
  gap: 10px;
`;

const MapLink = styled.a`
  text-decoration: none;
  color: #2575fc;
  font-weight: 500;
  transition: color 0.2s ease;
  &:hover {
    color: #6a11cb;
    text-decoration: underline;
  }
`;

const GradientButton = styled(Button)`
  background: ${(props) =>
    props.disabled ? "#cccccc" : "linear-gradient(135deg, #2575fc, #6a11cb)"};
  border: none;
  border-radius: 30px;
  padding: 12px 24px;
  font-size: 1rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: #fff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;
  &:hover {
    transform: translateY(-2px);
    background: ${(props) =>
      props.disabled ? "#cccccc" : "linear-gradient(135deg, #6a11cb, #2575fc)"};
  }
  &:focus {
    outline: none;
    box-shadow: 0 0 0 3px rgba(37, 117, 252, 0.3);
  }
`;

const GradientDropdownToggle = styled(Dropdown.Toggle)`
  background: linear-gradient(135deg, #2575fc, #6a11cb);
  border: none;
  border-radius: 20px;
  padding: 8px 16px;
  font-size: 0.9rem;
  font-weight: 600;
  color: #fff;
  display: flex;
  align-items: center;
  gap: 8px;
  &:hover {
    background: linear-gradient(135deg, #6a11cb, #2575fc);
  }
  &:focus {
    box-shadow: 0 0 0 3px rgba(37, 117, 252, 0.3);
  }
`;

const GradientDropdownMenu = styled(Dropdown.Menu)`
  background: #fff;
  border: none;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 0.5rem 0;
`;

const GradientDropdownItem = styled(Dropdown.Item)`
  font-size: 0.9rem;
  color: #333;
  padding: 0.5rem 1.5rem;
  transition: all 0.2s ease;
  &:hover {
    background: linear-gradient(
      135deg,
      rgba(37, 117, 252, 0.1),
      rgba(106, 17, 203, 0.1)
    );
    color: #2575fc;
  }
`;

const TagContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const TagChip = styled(Chip)`
  background: linear-gradient(135deg, #e0f7fa, #b2ebf2);
  color: #006064;
  font-weight: 500;
  border-radius: 16px;
`;

function ViewEntry({ isOpen, onClose, entry, role }) {
  const [copied, setCopied] = useState(false);
  const [openSections, setOpenSections] = useState({
    personal: true,
    location: true,
    business: true,
    followup: true,
    history: false,
  });

  // Utility to format dates safely
  const formatDate = (date) => {
    if (!date || isNaN(new Date(date).getTime())) return "N/A";
    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  useEffect(() => {
    setOpenSections({
      personal: true,
      location: true,
      business: true,
      followup: true,
      history: false,
    });
    setCopied(false);
  }, [entry]);

  const toggleSection = (section) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // Enhanced function to format assignedTo for display
  const formatAssignedTo = useCallback(
    (assignedTo) => {
      if (!Array.isArray(assignedTo) || assignedTo.length === 0) {
        return "Not Assigned";
      }
      const usernames = assignedTo
        .map((user) => {
          if (typeof user === "object" && user?.username) {
            return user.username;
          } else if (typeof user === "string") {
            // Handle case where assignedTo contains ObjectIds (not populated)
            // This assumes the entry.assignedTo is already populated, so we look there
            const foundUser = entry?.assignedTo?.find(
              (u) => u._id.toString() === user
            );
            return foundUser?.username || null;
          }
          return null;
        })
        .filter(Boolean);
      return usernames.length > 0 ? usernames.join(", ") : "Not Assigned";
    },
    [entry?.assignedTo]
  );

  const handleCopy = useCallback(() => {
    if (role !== "admin" && role !== "superadmin") {
      toast.error("Only admins and superadmins can copy data.");
      return;
    }

    if (!entry) return;

    const productsText = Array.isArray(entry.products)
      ? entry.products
          .map(
            (product, index) =>
              `Product ${index + 1}: ${product.name}, Specification: ${
                product.specification
              }, Size: ${product.size}, Quantity: ${product.quantity}`
          )
          .join("\n")
      : "N/A";

    const assignedToText = formatAssignedTo(entry.assignedTo);

    const textToCopy = `
      Date: ${formatDate(entry.createdAt)}
      Customer Name: ${entry.customerName || "N/A"}
      Mobile Number: ${entry.mobileNumber || "N/A"}
      Contact Person Name: ${entry.contactperson || "N/A"}
      First Meeting Date: ${formatDate(entry.firstdate)}
      Products: ${productsText}
      Customer Type: ${entry.type || "N/A"}
      Address: ${entry.address || "N/A"}
      City: ${entry.city || "N/A"}
      State: ${entry.state || "N/A"}
      Organization: ${entry.organization || "N/A"}
      Category: ${entry.category || "N/A"}
      Status: ${entry.status || "Not Interested"}
      Expected Closure Date: ${formatDate(entry.expectedClosingDate)}
      Follow Up Date: ${formatDate(entry.followUpDate)}
      Remarks: ${entry.remarks || "N/A"}
      Priority: ${entry.priority || "N/A"}
      Next Action: ${entry.nextAction || "N/A"}
      Estimated Value: ${
        entry.estimatedValue
          ? `₹${new Intl.NumberFormat("en-IN").format(entry.estimatedValue)}`
          : "N/A"
      }
      Closing Amount: ${
        entry.closeamount
          ? `₹${new Intl.NumberFormat("en-IN").format(entry.closeamount)}`
          : "N/A"
      }
      Updated At: ${formatDate(entry.updatedAt)}
      Created By: ${entry.createdBy?.username || "N/A"}
      Assigned To: ${assignedToText}
    `.trim();

    navigator.clipboard
      .writeText(textToCopy)
      .then(() => {
        setCopied(true);
        toast.success("Details copied to clipboard!");
        setTimeout(() => setCopied(false), 2000);
      })
      .catch((err) => {
        toast.error("Failed to copy details!");
        console.error("Copy error:", err);
      });
  }, [entry, role, formatAssignedTo]);

  const handleExportEntry = useCallback(() => {
    try {
      if (!entry) {
        toast.error("No entry data to export.");
        return;
      }

      const assignedToText = formatAssignedTo(entry.assignedTo);

      const exportData = [
        {
          Section: "Client Entry",
          Customer: "Customer Name",
          "Mobile Number": "Mobile Number",
          "Contact Person": "Contact Person",
          Address: "Address",
          City: "City",
          State: "State",
          Organization: "Organization",
          Category: "Category",
          Type: "Type",
          Products: "Products",
          "Estimated Value": "Estimated Value (₹)",
          "Closing Amount": "Closing Amount (₹)",
          Status: "Status",
          "Close Type": "Close Type",
          "First Meeting": "First Meeting",
          "Follow Up": "Follow Up",
          "Expected Closing Date": "Expected Closing Date",
          Priority: "Priority",
          "Next Action": "Next Action",
          Remarks: "Remarks",
          Created: "Created",
          Updated: "Updated",
          "Created By": "Created By",
          "Assigned To": "Assigned To",
        },
        {
          Section: "Client Entry",
          Customer: entry.customerName || "",
          "Mobile Number": entry.mobileNumber || "",
          "Contact Person": entry.contactperson || "",
          Address: entry.address || "",
          City: entry.city || "",
          State: entry.state || "",
          Organization: entry.organization || "",
          Category: entry.category || "",
          Type: entry.type || "",
          Products: Array.isArray(entry.products)
            ? entry.products
                .map(
                  (p) =>
                    `${p.name} (Spec: ${p.specification}, Size: ${p.size}, Qty: ${p.quantity})`
                )
                .join("; ")
            : "",
          "Estimated Value": entry.estimatedValue
            ? `₹${new Intl.NumberFormat("en-IN").format(entry.estimatedValue)}`
            : "",
          "Closing Amount": entry.closeamount
            ? `₹${new Intl.NumberFormat("en-IN").format(entry.closeamount)}`
            : "",
          Status: entry.status || "Not Interested",
          "Close Type": entry.closetype || "",
          "First Meeting": formatDate(entry.firstdate),
          "Follow Up": formatDate(entry.followUpDate),
          "Expected Closing Date": formatDate(entry.expectedClosingDate),
          Priority: entry.priority || "",
          "Next Action": entry.nextAction || "",
          Remarks: entry.remarks || "",
          Created: formatDate(entry.createdAt),
          Updated: formatDate(entry.updatedAt),
          "Created By": entry.createdBy?.username || "Unknown",
          "Assigned To": assignedToText,
        },
      ];

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const colWidths = Object.keys(exportData[0]).map((key) => {
        const maxLength = Math.max(
          key.length,
          ...exportData.map((row) => String(row[key] || "").length)
        );
        return { wch: Math.min(maxLength + 2, 50) };
      });
      worksheet["!cols"] = colWidths;

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Client Entry");

      const excelBuffer = XLSX.write(workbook, {
        bookType: "xlsx",
        type: "array",
      });
      const blob = new Blob([excelBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `client_entry_${
        entry.customerName || "entry"
      }_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(link);
      link.click();

      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("Entry exported successfully!");
    } catch (error) {
      console.error("Error exporting entry:", error);
      toast.error("Failed to export entry!");
    }
  }, [entry, formatAssignedTo]);

  const getGoogleMapsUrl = (location) => {
    if (!location) return "#";
    const coordMatch = location.match(/^(-?\d+\.\d+),\s*(-?\d+\.\d+)$/);
    if (coordMatch) {
      const [lat, lng] = coordMatch.slice(1);
      return `https://www.google.com/maps?q=${lat},${lng}`;
    }
    return `https://www.google.com/maps/search/${encodeURIComponent(location)}`;
  };

  // Sort history once
  const sortedHistory = useMemo(() => {
    return Array.isArray(entry?.history)
      ? [...entry.history].sort(
          (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
        )
      : [];
  }, [entry?.history]);

  if (!entry) return null;

  return (
    <>
      <DisableCopy role={role} />
      <Modal
        show={isOpen}
        onHide={onClose}
        backdrop="static"
        keyboard={false}
        size="lg"
        aria-labelledby="view-entry-modal-title"
        dialogClassName="compact-modal"
        centered
      >
        <GradientModalHeader closeButton>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              width: "100%",
            }}
          >
            <Modal.Title
              id="view-entry-modal-title"
              style={{
                fontWeight: "700",
                fontSize: "1.6rem",
                letterSpacing: "0.8px",
                textTransform: "uppercase",
                textShadow: "1px 1px 3px rgba(0, 0, 0, 0.2)",
                display: "flex",
                alignItems: "center",
              }}
            >
              Client Profile
            </Modal.Title>
            <Box sx={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <Box
                component="div"
                sx={{
                  borderRadius: "8px",
                  px: 2,
                  py: 0.8,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <Typography
                  sx={{
                    fontSize: "1.1rem",
                    fontWeight: "600",
                    color: "#fff",
                    textShadow: "0 1px 2px rgba(0, 0, 0, 0.3)",
                  }}
                >
                  Visits: {sortedHistory.length}
                </Typography>
              </Box>
              <Dropdown>
                <GradientDropdownToggle
                  id="dropdown-actions"
                  aria-label="More Actions"
                >
                  <FaEllipsisV />
                </GradientDropdownToggle>
                <GradientDropdownMenu>
                  {(role === "admin" || role === "superadmin") && (
                    <GradientDropdownItem
                      onClick={handleCopy}
                      aria-label={copied ? "Copied" : "Copy Details"}
                    >
                      {copied ? "✅ Copied!" : "📑 Copy Details"}
                    </GradientDropdownItem>
                  )}
                  <GradientDropdownItem
                    onClick={handleExportEntry}
                    aria-label="Export Entry"
                  >
                    📤 Export Entry
                  </GradientDropdownItem>
                  <GradientDropdownItem
                    onClick={onClose}
                    aria-label="Close Modal"
                  >
                    🔙 Close
                  </GradientDropdownItem>
                </GradientDropdownMenu>
              </Dropdown>
            </Box>
          </Box>
        </GradientModalHeader>

        <Modal.Body
          style={{
            padding: "2rem",
            background: "#f9fafb",
            borderRadius: "0 0 12px 12px",
            minHeight: "500px",
            boxShadow: "inset 0 -4px 12px rgba(0, 0, 0, 0.08)",
            display: "flex",
            flexDirection: "column",
            gap: "1.5rem",
          }}
        >
          <GradientSection>
            <SectionHeader
              onClick={() => toggleSection("personal")}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && toggleSection("personal")}
              aria-expanded={openSections.personal}
              aria-controls="personal-section"
            >
              <Typography
                sx={{
                  fontSize: "1.2rem",
                  fontWeight: "600",
                  background: "linear-gradient(135deg, #2575fc, #6a11cb)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Personal Info
              </Typography>
              {openSections.personal ? <FaAngleUp /> : <FaAngleDown />}
            </SectionHeader>
            <Collapse in={openSections.personal} id="personal-section">
              <InfoRow>
                <InfoItem>
                  <Label>Customer Name</Label>
                  <Value>{entry.customerName || "N/A"}</Value>
                </InfoItem>
                <InfoItem>
                  <Label>Mobile</Label>
                  <Value>{entry.mobileNumber || "N/A"}</Value>
                </InfoItem>
                <InfoItem>
                  <Label>Contact Person</Label>
                  <Value>{entry.contactperson || "N/A"}</Value>
                </InfoItem>
                <InfoItem>
                  <Label>Status</Label>
                  <Value>{entry.status || "Not Interested"}</Value>
                </InfoItem>
              </InfoRow>
            </Collapse>
          </GradientSection>

          <GradientSection>
            <SectionHeader
              onClick={() => toggleSection("location")}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && toggleSection("location")}
              aria-expanded={openSections.location}
              aria-controls="location-section"
            >
              <Typography
                sx={{
                  fontSize: "1.2rem",
                  fontWeight: "600",
                  background: "linear-gradient(135deg, #2575fc, #6a11cb)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Location
              </Typography>
              {openSections.location ? <FaAngleUp /> : <FaAngleDown />}
            </SectionHeader>
            <Collapse in={openSections.location} id="location-section">
              <InfoRow>
                <InfoItem>
                  <Label>Address</Label>
                  <Value>{entry.address || "N/A"}</Value>
                </InfoItem>
                <InfoItem>
                  <Label>City</Label>
                  <Value>{entry.city || "N/A"}</Value>
                </InfoItem>
                <InfoItem>
                  <Label>State</Label>
                  <Value>{entry.state || "N/A"}</Value>
                </InfoItem>
              </InfoRow>
            </Collapse>
          </GradientSection>

          <GradientSection>
            <SectionHeader
              onClick={() => toggleSection("business")}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && toggleSection("business")}
              aria-expanded={openSections.business}
              aria-controls="business-section"
            >
              <Typography
                sx={{
                  fontSize: "1.2rem",
                  fontWeight: "600",
                  background: "linear-gradient(135deg, #2575fc, #6a11cb)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Business Info
              </Typography>
              {openSections.business ? <FaAngleUp /> : <FaAngleDown />}
            </SectionHeader>
            <Collapse in={openSections.business} id="business-section">
              <InfoRow>
                <InfoItem>
                  <Label>Organization</Label>
                  <Value>{entry.organization || "N/A"}</Value>
                </InfoItem>
                <InfoItem>
                  <Label>Category</Label>
                  <Value>{entry.category || "N/A"}</Value>
                </InfoItem>
                <InfoItem>
                  <Label>Products</Label>
                  <Value>
                    {Array.isArray(entry.products) && entry.products.length > 0
                      ? entry.products.map((product, index) => (
                          <div key={index}>
                            {product.name || "N/A"} (Spec:{" "}
                            {product.specification || "N/A"}, Size:{" "}
                            {product.size || "N/A"}, Qty:{" "}
                            {product.quantity || "N/A"})
                          </div>
                        ))
                      : "N/A"}
                  </Value>
                </InfoItem>
                <InfoItem>
                  <Label>Type</Label>
                  <Value>{entry.type || "N/A"}</Value>
                </InfoItem>
                <InfoItem>
                  <Label>Estimated Value (₹)</Label>
                  <Value>
                    {entry.estimatedValue
                      ? `₹${new Intl.NumberFormat("en-IN").format(
                          entry.estimatedValue
                        )}`
                      : "N/A"}
                  </Value>
                </InfoItem>
                <InfoItem>
                  <Label>Closing Amount (₹)</Label>
                  <Value>
                    {entry.closeamount
                      ? `₹${new Intl.NumberFormat("en-IN").format(
                          entry.closeamount
                        )}`
                      : "N/A"}
                  </Value>
                </InfoItem>
              </InfoRow>
            </Collapse>
          </GradientSection>

          <GradientSection>
            <SectionHeader
              onClick={() => toggleSection("followup")}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && toggleSection("followup")}
              aria-expanded={openSections.followup}
              aria-controls="followup-section"
            >
              <Typography
                sx={{
                  fontSize: "1.2rem",
                  fontWeight: "600",
                  background: "linear-gradient(135deg, #2575fc, #6a11cb)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Follow-up Actions
              </Typography>
              {openSections.followup ? <FaAngleUp /> : <FaAngleDown />}
            </SectionHeader>
            <Collapse in={openSections.followup} id="followup-section">
              <InfoRow>
                <InfoItem>
                  <Label>Status</Label>
                  <Value>{entry.status || "Not Interested"}</Value>
                </InfoItem>
                <InfoItem>
                  <Label>Close Type</Label>
                  <Value>{entry.closetype || "N/A"}</Value>
                </InfoItem>
                <InfoItem>
                  <Label>First Meeting</Label>
                  <Value>{formatDate(entry.firstdate)}</Value>
                </InfoItem>
                <InfoItem>
                  <Label>Follow Up</Label>
                  <Value>{formatDate(entry.followUpDate)}</Value>
                </InfoItem>
                <InfoItem>
                  <Label>Expected Closure</Label>
                  <Value>{formatDate(entry.expectedClosingDate)}</Value>
                </InfoItem>
                <InfoItem>
                  <Label>Priority</Label>
                  <Value>{entry.priority || "N/A"}</Value>
                </InfoItem>
                <InfoItem>
                  <Label>Next Action</Label>
                  <Value>{entry.nextAction || "N/A"}</Value>
                </InfoItem>
                <InfoItem>
                  <Label>Remarks</Label>
                  <Value>{entry.remarks || "N/A"}</Value>
                </InfoItem>
                <InfoItem>
                  <Label>Created</Label>
                  <Value>{formatDate(entry.createdAt)}</Value>
                </InfoItem>
                <InfoItem>
                  <Label>Updated</Label>
                  <Value>{formatDate(entry.updatedAt)}</Value>
                </InfoItem>
                <InfoItem>
                  <Label>Created By</Label>
                  <Value>{entry.createdBy?.username || "N/A"}</Value>
                </InfoItem>
                <InfoItem>
                  <Label>Tagged With</Label>
                  <TagContainer>
                    {Array.isArray(entry.assignedTo) &&
                    entry.assignedTo.length > 0 ? (
                      entry.assignedTo.map((user, index) => (
                        <TagChip
                          key={index}
                          label={
                            typeof user === "object"
                              ? user.username || "Unknown"
                              : "Unknown"
                          }
                          size="small"
                        />
                      ))
                    ) : (
                      <Value>Not Assigned</Value>
                    )}
                  </TagContainer>
                </InfoItem>
              </InfoRow>
            </Collapse>
          </GradientSection>

          <GradientSection>
            <SectionHeader
              onClick={() => toggleSection("history")}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && toggleSection("history")}
              aria-expanded={openSections.history}
              aria-controls="history-section"
            >
              <Typography
                sx={{
                  fontSize: "1.2rem",
                  fontWeight: "600",
                  background: "linear-gradient(135deg, #2575fc, #6a11cb)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                History Log
              </Typography>
              {openSections.history ? <FaAngleUp /> : <FaAngleDown />}
            </SectionHeader>
            <Collapse in={openSections.history} id="history-section">
              <HistoryContainer>
                {sortedHistory.length > 0 ? (
                  sortedHistory.map((log, index, array) => (
                    <HistoryItem key={`${log.timestamp}-${index}`}>
                      <HistoryContent>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            marginBottom: "0.6rem",
                          }}
                        >
                          <Typography
                            sx={{
                              fontSize: "1.1rem",
                              fontWeight: "600",
                              color: "#2575fc",
                              marginRight: "1rem",
                            }}
                          >
                            #{array.length - index}
                          </Typography>
                          <HistoryTimestamp>
                            {formatDate(log.timestamp)}
                          </HistoryTimestamp>
                        </Box>
                        <Chip
                          label={log.status || "N/A"}
                          color={
                            log.status === "Interested"
                              ? "success"
                              : log.status === "Not Interested"
                              ? "error"
                              : "warning"
                          }
                          size="small"
                          sx={{ marginBottom: "0.6rem" }}
                        />
                        <HistoryRemarks>
                          {log.remarks || "No remarks"}
                        </HistoryRemarks>
                        {Array.isArray(log.products) &&
                          log.products.length > 0 && (
                            <InfoItem>
                              <Label>Products</Label>
                              <Value>
                                {log.products.map((product, idx) => (
                                  <div key={idx}>
                                    {product.name || "N/A"} (Spec:{" "}
                                    {product.specification || "N/A"}, Size:{" "}
                                    {product.size || "N/A"}, Qty:{" "}
                                    {product.quantity || "N/A"})
                                  </div>
                                ))}
                              </Value>
                            </InfoItem>
                          )}
                        {log.liveLocation && (
                          <HistoryLocation>
                            <FaMapMarkerAlt />
                            <MapLink
                              href={getGoogleMapsUrl(log.liveLocation)}
                              target="_blank"
                              rel="noreferrer"
                              aria-label="View Location on Google Maps"
                            >
                              View Location
                            </MapLink>
                          </HistoryLocation>
                        )}
                        <InfoItem>
                          <Label>Tagged With</Label>
                          <TagContainer>
                            {Array.isArray(log.assignedTo) &&
                            log.assignedTo.length > 0 ? (
                              log.assignedTo.map((user, index) => {
                                const username = formatAssignedTo([user]);
                                return (
                                  <TagChip
                                    key={index}
                                    label={username || "Unknown"}
                                    size="small"
                                  />
                                );
                              })
                            ) : (
                              <Value>Not Assigned</Value>
                            )}
                          </TagContainer>
                        </InfoItem>
                        {log.firstPersonMeet && (
                          <InfoItem>
                            <Label>First Person Meet</Label>
                            <Value>{log.firstPersonMeet}</Value>
                          </InfoItem>
                        )}
                        {log.secondPersonMeet && (
                          <InfoItem>
                            <Label>Second Person Meet</Label>
                            <Value>{log.secondPersonMeet}</Value>
                          </InfoItem>
                        )}
                        {log.thirdPersonMeet && (
                          <InfoItem>
                            <Label>Third Person Meet</Label>
                            <Value>{log.thirdPersonMeet}</Value>
                          </InfoItem>
                        )}
                        {log.fourthPersonMeet && (
                          <InfoItem>
                            <Label>Fourth Person Meet</Label>
                            <Value>{log.fourthPersonMeet}</Value>
                          </InfoItem>
                        )}
                      </HistoryContent>
                    </HistoryItem>
                  ))
                ) : (
                  <Typography
                    variant="subtitle2"
                    sx={{ color: "#777", fontStyle: "italic", padding: "1rem" }}
                  >
                    No history available.
                  </Typography>
                )}
              </HistoryContainer>
            </Collapse>
          </GradientSection>
        </Modal.Body>
        <Modal.Footer>
          <GradientButton
            variant="secondary"
            onClick={onClose}
            aria-label="Close Modal"
          >
            Close
          </GradientButton>
        </Modal.Footer>
      </Modal>
    </>
  );
}

export default ViewEntry;
