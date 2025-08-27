import React, { useState, useCallback, useEffect } from "react";
import { Modal, Button, Form, ProgressBar, Table } from "react-bootstrap";
import axios from "axios";
import { toast } from "react-toastify";
import styled from "styled-components";
import Select from "react-select";
import DatePicker from "react-datepicker";
import { statesAndCities, productOptions } from "./Options"; // Adjust path
import "react-datepicker/dist/react-datepicker.css";

const customSelectStyles = {
  control: (provided, state) => ({
    ...provided,
    minHeight: "42px",
    fontSize: "1rem",
    borderColor: state.isFocused ? "#007bff" : theme.colors.border,
    boxShadow: state.isFocused
      ? "0 0 0 0.2rem rgba(0, 123, 255, 0.25)"
      : "none",
    "&:hover": {
      borderColor: "#007bff",
    },
  }),
  menu: (provided) => ({
    ...provided,
    zIndex: 9999,
  }),
  multiValue: (provided) => ({
    ...provided,
    backgroundColor: theme.colors.tableHeaderBg,
  }),
  multiValueLabel: (provided) => ({
    ...provided,
    color: theme.colors.tableHeaderText,
  }),
};

const theme = {
  colors: {
    border: "#dee2e6",
    tableHeaderText: "#333",
    tableHoverBg: "#dee2e6",
    tableHeaderBg: "#f1f3f5",
  },
  breakpoints: {
    sm: "576px",
    md: "768px",
  },
};

const StyledFormGroup = styled(Form.Group)`
  .form-control,
  .form-select {
    min-height: 42px;
    font-size: 1rem;
    transition: border-color 0.2s ease-in-out;

    &:focus {
      border-color: #007bff;
      box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
    }
  }

  .flex-container {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;

    @media (max-width: ${theme.breakpoints.sm}) {
      flex-direction: column;
      gap: 10px;
    }
  }

  .add-button {
    min-height: 42px;
    font-size: 1rem;

    @media (max-width: ${theme.breakpoints.sm}) {
      width: 100%;
    }
  }
`;

const StyledTable = styled(Table)`
  margin-top: 1rem;
  font-size: 1rem;

  & th,
  & td {
    padding: 0.75rem;
    vertical-align: middle;
    border: 1px solid ${theme.colors.border};
  }

  & th {
    background: ${theme.colors.tableHeaderBg};
    color: ${theme.colors.tableHeaderText};
    font-weight: 600;
  }

  & tbody tr:hover {
    background: ${theme.colors.tableHoverBg};
  }

  @media (max-width: ${theme.breakpoints.sm}) {
    font-size: 0.9rem;
    & th,
    & td {
      padding: 0.5rem;
    }
  }
`;

const ResponsiveTableWrapper = styled.div`
  @media (max-width: ${theme.breakpoints.sm}) {
    .table {
      display: block;
      overflow-x: auto;
      width: 100%;
      max-width: 100%;
    }

    thead {
      display: none;
    }

    tbody tr {
      display: block;
      margin-bottom: 12px;
      border: 1px solid ${theme.colors.border};
      border-radius: 6px;
      background: #fff;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    tbody td {
      display: flex;
      align-items: center;
      text-align: left;
      border: none;
      padding: 10px 12px;
      font-size: 0.9rem;

      &::before {
        content: attr(data-label);
        font-weight: 600;
        width: 40%;
        min-width: 110px;
        margin-right: 10px;
        color: ${theme.colors.tableHeaderText};
      }
    }

    tbody td:last-child {
      justify-content: center;
      padding: 12px;
      border-top: 1px solid ${theme.colors.border};
    }
  }
`;

function AddEntry({ isOpen, onClose, onEntryAdded }) {
  const initialFormData = {
    customerName: "",
    mobileNumber: "",
    contactperson: "",
    status: "",
    firstdate: "",
    products: [],
    estimatedValue: "",
    type: "",
    address: "",
    state: "",
    city: "",
    organization: "",
    category: "",
    remarks: "",
    liveLocation: "",
    assignedTo: [],
    createdAt: new Date().toISOString(),
  };

  const [formData, setFormData] = useState(initialFormData);
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedState, setSelectedState] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [locationFetched, setLocationFetched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [productInput, setProductInput] = useState({
    name: "",
    specification: "",
    size: "",
    quantity: "",
  });
  const [users, setUsers] = useState([]);

  const totalSteps = 4;

  useEffect(() => {
    const fetchUsersForTagging = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(
          `${process.env.REACT_APP_URL}/api/tag-users`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setUsers(response.data || []);
      } catch (error) {
        console.error("Error fetching users for tagging:", error);
        toast.error("Failed to fetch users for tagging.");
        setUsers([]);
      }
    };

    if (isOpen) {
      fetchUsersForTagging();
      setFormData({ ...initialFormData, createdAt: new Date().toISOString() });
      setSelectedState("");
      setSelectedCity("");
      setCurrentStep(1);
      setProductInput({ name: "", specification: "", size: "", quantity: "" });
    }
  }, [isOpen]);

  const handleInput = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === "mobileNumber"
          ? value.replace(/\D/g, "").slice(0, 10)
          : name === "estimatedValue"
          ? value.replace(/\D/g, "")
          : value,
    }));
  }, []);

  const handleProductInput = (e) => {
    const { name, value } = e.target;
    setProductInput((prev) => ({
      ...prev,
      [name]: name === "quantity" ? value.replace(/\D/g, "") : value,
      ...(name === "name" ? { specification: "", size: "" } : {}),
    }));
  };

  const addProduct = () => {
    if (
      !productInput.name ||
      !productInput.specification ||
      !productInput.size ||
      !productInput.quantity ||
      Number(productInput.quantity) <= 0
    ) {
      toast.error("Please fill all product fields with valid values!");
      return;
    }

    setFormData((prev) => ({
      ...prev,
      products: [
        ...prev.products,
        {
          name: productInput.name,
          specification: productInput.specification,
          size: productInput.size,
          quantity: Number(productInput.quantity),
        },
      ],
    }));

    setProductInput({ name: "", specification: "", size: "", quantity: "" });
    toast.success("Product added to list!");
  };

  const removeProduct = (index) => {
    setFormData((prev) => ({
      ...prev,
      products: prev.products.filter((_, i) => i !== index),
    }));
    toast.info("Product removed from list.");
  };

  const fetchLocation = () => {
    setLoading(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = `${position.coords.latitude}, ${position.coords.longitude}`;
          setFormData((prev) => ({
            ...prev,
            liveLocation: location,
          }));
          setLocationFetched(true);
          setLoading(false);
          toast.success("Location fetched successfully!");
        },
        (error) => {
          console.error("Error fetching location:", error);
          setLocationFetched(false);
          setLoading(false);
          toast.error("Failed to fetch location!");
        }
      );
    } else {
      console.error("Geolocation is not supported by this browser.");
      setLocationFetched(false);
      setLoading(false);
      toast.error("Geolocation not supported!");
    }
  };

  const validateStep = (step) => {
    const stepFields = {
      1: ["customerName", "mobileNumber", "contactperson"],
      2: ["firstdate", "products", "estimatedValue", "type"],
      3: ["address", "state", "city", "organization", "category"],
      4: ["status", "liveLocation"],
    };

    const fieldsToValidate = stepFields[step] || [];

    for (const field of fieldsToValidate) {
      if (field === "products") {
        if (!formData.products.length) {
          toast.error("At least one product is required!");
          return false;
        }
      } else if (!formData[field] || formData[field].toString().trim() === "") {
        toast.error(
          `${field.charAt(0).toUpperCase() + field.slice(1)} is required!`
        );
        return false;
      }
    }

    if (
      step === 1 &&
      formData.mobileNumber &&
      formData.mobileNumber.length !== 10
    ) {
      toast.error("Mobile number must be exactly 10 digits!");
      return false;
    }

    return true;
  };

  const handleNext = (e) => {
    e.preventDefault();
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => prev - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (currentStep !== totalSteps) {
      return;
    }

    if (!validateStep(4)) {
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("You must be logged in to add an entry.");
        setLoading(false);
        return;
      }

      const submitData = {
        ...formData,
        createdAt: new Date().toISOString(),
        estimatedValue: Number(formData.estimatedValue) || 0,
        assignedTo: formData.assignedTo.map((option) => option.value),
      };

      const response = await axios.post(
        `${process.env.REACT_APP_URL}/api/entry`,
        submitData,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const newEntry = response.data.data;
      toast.success("Entry added successfully!");
      onEntryAdded(newEntry);

      setFormData({ ...initialFormData, createdAt: new Date().toISOString() });
      setSelectedState("");
      setSelectedCity("");
      setCurrentStep(1);
      setProductInput({ name: "", specification: "", size: "", quantity: "" });
      setLocationFetched(false);
      onClose();
    } catch (error) {
      console.error(
        "Error adding entry:",
        error.response?.data || error.message
      );

      // Friendly error messages for non-tech users
      let friendlyMessage = "Oops! Something went wrong. Please try again.";

      if (error.response) {
        // Check specific status codes or error messages
        const status = error.response.status;
        const serverMessage = error.response.data?.message || "";

        if (status === 400) {
          friendlyMessage =
            "Please check the information you entered and try again.";
        } else if (status === 401) {
          friendlyMessage = "You are not authorized. Please log in again.";
        } else if (status === 403) {
          friendlyMessage =
            "Access denied. You don't have permission to do this.";
        } else if (status === 404) {
          friendlyMessage = "The requested resource was not found.";
        } else if (serverMessage) {
          // If server provides a clear message, use that (can also sanitize it if needed)
          friendlyMessage = serverMessage;
        }
      } else if (error.message === "Network Error") {
        friendlyMessage =
          "Network issue detected. Please check your internet connection.";
      }

      toast.error(friendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleStateChange = (e) => {
    const state = e.target.value;
    setSelectedState(state);
    setSelectedCity("");
    setFormData((prev) => ({
      ...prev,
      state,
      city: "",
    }));
  };

  const handleCityChange = (e) => {
    const city = e.target.value;
    setSelectedCity(city);
    setFormData((prev) => ({
      ...prev,
      city,
    }));
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <>
            <Form.Group controlId="formCustomerName" className="mb-3">
              <Form.Label>Customer Name</Form.Label>
              <Form.Control
                type="text"
                name="customerName"
                value={formData.customerName}
                onChange={handleInput}
                placeholder="Enter customer name"
                disabled={loading}
                required
              />
            </Form.Group>

            <Form.Group controlId="mobileNumber" className="mb-3">
              <Form.Label>Mobile Number</Form.Label>
              <Form.Control
                type="text"
                name="mobileNumber"
                value={formData.mobileNumber}
                onChange={handleInput}
                placeholder="Enter mobile number"
                maxLength={10}
                pattern="[0-9]{10}"
                disabled={loading}
                required
              />
              {formData.mobileNumber && formData.mobileNumber.length < 10 && (
                <Form.Text style={{ color: "red" }}>
                  Mobile number must be exactly 10 digits
                </Form.Text>
              )}
            </Form.Group>

            <Form.Group controlId="contactperson" className="mb-3">
              <Form.Label>Contact Person Name</Form.Label>
              <Form.Control
                type="text"
                name="contactperson"
                value={formData.contactperson}
                onChange={handleInput}
                placeholder="Enter contact person name"
                disabled={loading}
                required
              />
            </Form.Group>
          </>
        );
      case 2:
        return (
          <>
            <Form.Group controlId="formFirstDate" className="mb-3">
              <Form.Label>First Meeting Date</Form.Label>
              <DatePicker
                selected={
                  formData.firstdate ? new Date(formData.firstdate) : null
                }
                onChange={(date) =>
                  handleInput({ target: { name: "firstdate", value: date } })
                }
                dateFormat="dd/MM/yy"
                className="form-control"
                maxDate={new Date()}
                disabled={loading}
                placeholderText="DD/MM/YY"
                required
              />
              <Form.Control
                type="hidden"
                value={formData.firstdate || ""}
                required
              />
            </Form.Group>

            <StyledFormGroup controlId="formProductSelection" className="mb-3">
              <Form.Label>Add Product</Form.Label>
              <div className="flex-container">
                <Form.Select
                  name="name"
                  value={productInput.name}
                  onChange={handleProductInput}
                  disabled={loading}
                  required
                >
                  <option value="">Select Product</option>
                  {productOptions.map((product) => (
                    <option key={product.name} value={product.name}>
                      {product.name}
                    </option>
                  ))}
                </Form.Select>

                <Form.Select
                  name="specification"
                  value={productInput.specification}
                  onChange={handleProductInput}
                  disabled={!productInput.name || loading}
                  required={!!productInput.name}
                >
                  <option value="">Select Specification</option>
                  {productInput.name &&
                    productOptions
                      .find((p) => p.name === productInput.name)
                      ?.specifications.map((spec) => (
                        <option key={spec} value={spec}>
                          {spec}
                        </option>
                      ))}
                </Form.Select>

                <Form.Select
                  name="size"
                  value={productInput.size}
                  onChange={handleProductInput}
                  disabled={!productInput.name || loading}
                  required={!!productInput.name}
                >
                  <option value="">Select Size</option>
                  {productInput.name &&
                    productOptions
                      .find((p) => p.name === productInput.name)
                      ?.sizes.map((size) => (
                        <option key={size} value={size}>
                          {size}
                        </option>
                      ))}
                </Form.Select>

                <Form.Control
                  type="text"
                  name="quantity"
                  value={productInput.quantity}
                  onChange={handleProductInput}
                  placeholder="Quantity"
                  disabled={loading || !productInput.name}
                  required={!!productInput.name}
                />

                <Button
                  variant="outline-primary"
                  onClick={addProduct}
                  disabled={loading}
                  className="add-button"
                >
                  Add
                </Button>
              </div>
            </StyledFormGroup>

            {formData.products.length > 0 && (
              <ResponsiveTableWrapper>
                <StyledTable className="table table-striped table-bordered table-hover">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Specification</th>
                      <th>Size</th>
                      <th>Quantity</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.products.map((product, index) => (
                      <tr key={index}>
                        <td data-label="Product">{product.name}</td>
                        <td data-label="Specification">
                          {product.specification}
                        </td>
                        <td data-label="Size">{product.size}</td>
                        <td data-label="Quantity">{product.quantity}</td>
                        <td data-label="Action">
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => removeProduct(index)}
                            disabled={loading}
                          >
                            Remove
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </StyledTable>
              </ResponsiveTableWrapper>
            )}

            <Form.Group controlId="formEstimatedValue" className="mb-3">
              <Form.Label>Estimated Value (₹)</Form.Label>
              <Form.Control
                type="text"
                name="estimatedValue"
                value={formData.estimatedValue}
                onChange={handleInput}
                placeholder="Enter estimated value (numeric)"
                disabled={loading}
                required
              />
            </Form.Group>

            <Form.Group controlId="formCustomerType" className="mb-3">
              <Form.Label>Customer Type</Form.Label>
              <Form.Select
                name="type"
                value={formData.type}
                onChange={handleInput}
                disabled={loading}
                required
              >
                <option value="">-- Select Type --</option>
                <option value="Direct Client">Direct Client</option>
                <option value="Partner">Partner</option>
              </Form.Select>
            </Form.Group>
          </>
        );
      case 3:
        return (
          <>
            <Form.Group controlId="formAddress" className="mb-3">
              <Form.Label>Address</Form.Label>
              <Form.Control
                type="text"
                name="address"
                value={formData.address}
                onChange={handleInput}
                placeholder="Enter address"
                disabled={loading}
                required
              />
            </Form.Group>

            <Form.Group controlId="formState" className="mb-3">
              <Form.Label>State</Form.Label>
              <Form.Control
                as="select"
                name="state"
                value={selectedState}
                onChange={handleStateChange}
                disabled={loading}
                required
              >
                <option value="">-- Select State --</option>
                {Object.keys(statesAndCities).map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </Form.Control>
            </Form.Group>

            <Form.Group controlId="formCity" className="mb-3">
              <Form.Label>City</Form.Label>
              <Form.Control
                as="select"
                name="city"
                value={selectedCity}
                onChange={handleCityChange}
                disabled={!selectedState || loading}
                required
              >
                <option value="">-- Select City --</option>
                {selectedState &&
                  statesAndCities[selectedState].map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
              </Form.Control>
            </Form.Group>

            <Form.Group controlId="formOrganization" className="mb-3">
              <Form.Label>Organization</Form.Label>
              <Form.Select
                name="organization"
                value={formData.organization}
                onChange={handleInput}
                disabled={loading}
                required
              >
                <option value="">Select organization type</option>
                <option value="Hospital">Hospital</option>
                <option value="Govt department">Govt department</option>
                <option value="Corporate">Corporate</option>
                <option value="Private coaching">Private coaching</option>
                <option value="Private school">Private school</option>
                <option value="Private college">Private college</option>
                <option value="Govt school">Govt school</option>
                <option value="Govt college">Govt college</option>

                <option value="Govt aided college">Govt aided college</option>
                <option value="Ngo">Ngo</option>
                <option value="Dealer/partner">Dealer/partner</option>
                <option value="Others">Others</option>
              </Form.Select>
            </Form.Group>

            <Form.Group controlId="formCategory" className="mb-3">
              <Form.Label>Category</Form.Label>
              <Form.Select
                name="category"
                value={formData.category}
                onChange={handleInput}
                disabled={loading}
                required
              >
                <option value="">Select category</option>
                <option value="Private">Private</option>
                <option value="Government">Government</option>
              </Form.Select>
            </Form.Group>
          </>
        );
      case 4:
        return (
          <>
            <Form.Group controlId="status" className="mb-3">
              <Form.Label>Status</Form.Label>
              <Form.Control
                as="select"
                value={formData.status}
                onChange={handleInput}
                name="status"
                disabled={loading}
                required
              >
                <option value="">-- Select Status --</option>
                <option value="Maybe">Maybe</option>
                <option value="Interested">Interested</option>
                <option value="Not Interested">Not Interested</option>
              </Form.Control>
            </Form.Group>

            <Form.Group controlId="formRemarks" className="mb-3">
              <Form.Label>Remarks</Form.Label>
              <Form.Control
                as="textarea"
                name="remarks"
                value={formData.remarks}
                onChange={handleInput}
                disabled={loading}
                placeholder="Enter remarks"
                rows={3}
                required
              />
            </Form.Group>

            <Form.Group controlId="formLiveLocation" className="mb-3">
              <Form.Label>Live Location</Form.Label>
              <div style={{ display: "flex", gap: "10px" }}>
                <Form.Control
                  type="text"
                  name="liveLocationDisplay"
                  value={
                    locationFetched
                      ? "Location Fetched ✅"
                      : "Location Not Fetched ❌"
                  }
                  readOnly
                  disabled={loading}
                  style={{ flex: 1, backgroundColor: "#f8f9fa" }}
                />
                <Button
                  variant="outline-primary"
                  onClick={fetchLocation}
                  disabled={loading}
                >
                  {loading ? "Fetching..." : "Get Location"}
                </Button>
              </div>
              <Form.Control
                type="hidden"
                name="liveLocation"
                value={formData.liveLocation}
                required
              />
            </Form.Group>

            <Form.Group controlId="formAssignedTo" className="mb-3">
              <Form.Label>Tag (Optional)</Form.Label>
              <Select
                isMulti
                name="assignedTo"
                options={users.map((user) => ({
                  value: user._id,
                  label: user.username,
                }))}
                value={formData.assignedTo}
                onChange={(selectedOptions) => {
                  setFormData((prev) => ({
                    ...prev,
                    assignedTo: selectedOptions || [],
                  }));
                }}
                placeholder="Select users..."
                isDisabled={loading || users.length === 0}
                styles={customSelectStyles}
              />
              <Form.Text>Select multiple users to tag this entry.</Form.Text>
            </Form.Group>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <Modal
      show={isOpen}
      onHide={onClose}
      centered
      backdrop="static"
      keyboard={false}
      size="lg"
    >
      <Modal.Header
        closeButton
        style={{
          background: "linear-gradient(to right, #6a11cb, #2575fc)",
          color: "#fff",
          boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
          borderBottom: "none",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Modal.Title style={{ fontWeight: "bold", fontSize: "1.5rem" }}>
          <span role="img" aria-label="add-entry">
            ✨
          </span>{" "}
          Add New Entry - Step {currentStep} of {totalSteps}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body style={{ padding: "2rem", backgroundColor: "#f8f9fa" }}>
        <ProgressBar
          now={(currentStep / totalSteps) * 100}
          label={`${Math.round((currentStep / totalSteps) * 100)}%`}
          style={{
            marginBottom: "1.5rem",
            height: "20px",
            borderRadius: "10px",
          }}
          variant="success"
        />

        <Form>
          <div
            style={{
              transition: "all 0.3s ease",
              opacity: 1,
            }}
          >
            {renderStep()}
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: "2rem",
            }}
          >
            <div style={{ display: "flex", gap: "20px" }}>
              {currentStep > 1 && (
                <Button
                  variant="outline-secondary"
                  onClick={handleBack}
                  disabled={loading}
                  style={{
                    borderRadius: "8px",
                    padding: "10px 20px",
                    fontWeight: "bold",
                  }}
                >
                  Back
                </Button>
              )}
              {currentStep === totalSteps && (
                <Button
                  variant="success"
                  onClick={handleSubmit}
                  disabled={loading}
                  style={{
                    borderRadius: "8px",
                    padding: "10px 40px",
                    backgroundColor: "#28a745",
                    border: "none",
                    fontWeight: "bold",
                    transition: "all 0.3s ease",
                  }}
                  onMouseOver={(e) =>
                    (e.target.style.backgroundColor = "#218838")
                  }
                  onMouseOut={(e) =>
                    (e.target.style.backgroundColor = "#28a745")
                  }
                >
                  {loading ? "Submitting..." : "Submit"}
                </Button>
              )}
            </div>

            {currentStep < totalSteps && (
              <Button
                variant="primary"
                onClick={handleNext}
                disabled={loading}
                style={{
                  borderRadius: "8px",
                  padding: "10px 20px",
                  background: "linear-gradient(to right, #6a11cb, #2575fc)",
                  border: "none",
                  fontWeight: "bold",
                  transition: "all 0.3s ease",
                }}
                onMouseOver={(e) =>
                  (e.target.style.background =
                    "linear-gradient(to right, #5a0bb8, #1a5ad7)")
                }
                onMouseOut={(e) =>
                  (e.target.style.background =
                    "linear-gradient(to right, #6a11cb, #2575fc)")
                }
              >
                Next
              </Button>
            )}
          </div>
        </Form>
      </Modal.Body>
    </Modal>
  );
}

export default AddEntry;
