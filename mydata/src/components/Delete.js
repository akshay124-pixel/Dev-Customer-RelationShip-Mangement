import React, { useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";

function DeleteModal({ isOpen, onClose, onDelete, itemId, itemIds }) {
  const [isLoading, setIsLoading] = useState(false);
  const [confirmationText, setConfirmationText] = useState("");

  const handleDelete = async () => {
    if (confirmationText !== "DELETE") {
      toast.error("Please type 'DELETE' to confirm!");
      return;
    }

    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("You must be logged in to delete entries.");
        return;
      }

      const config = {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      };

      if (itemIds && itemIds.length > 0) {
        // Handle multiple deletes
        await Promise.all(
          itemIds.map((id) =>
            axios.delete(`${process.env.REACT_APP_URL}/api/entry/${id}`, config)
          )
        );
        onDelete(itemIds); // Pass array of deleted IDs to parent
        toast.success(`Successfully deleted ${itemIds.length} entries!`);
      } else if (itemId) {
        // Handle single delete
        const response = await axios.delete(
          `${process.env.REACT_APP_URL}/api/entry/${itemId}`,
          config
        );
        if (response.status === 200) {
          onDelete([itemId]); // Pass single ID as array for consistency
          toast.success("Entry deleted successfully!");
        }
      }
      onClose(); // Close the modal
    } catch (error) {
      console.error("Error deleting entry/entries:", error);

      let message =
        "Sorry, we couldn't delete the entry/entries at this time. Please try again later.";
      if (error.response?.data?.message) {
        message = error.response.data.message;
      } else if (error.message === "Network Error") {
        message =
          "Network error detected. Please check your internet connection and try again.";
      }

      toast.error(message);
    } finally {
      setIsLoading(false);
      setConfirmationText("");
    }
  };

  const handleInputChange = (e) => {
    setConfirmationText(e.target.value);
  };

  if (!isOpen) return null; // Render nothing if not open

  const isMultiple = itemIds && itemIds.length > 0;
  const deleteCount = isMultiple ? itemIds.length : 1;

  return (
    <div
      className="modal"
      style={{ display: "block", background: "rgba(0, 0, 0, 0.5)" }}
      tabIndex={-1}
    >
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h1 className="modal-title fs-5">Confirm Deletion</h1>
            <button
              type="button"
              className="btn-close"
              onClick={() => {
                setConfirmationText(""); // Reset input on close
                onClose();
              }}
              disabled={isLoading}
            />
          </div>
          <div className="modal-body">
            <p>
              Are you sure you want to delete{" "}
              {isMultiple ? `${deleteCount} items` : "this item"}? This action
              cannot be undone.
            </p>
            <p>
              Type <strong>DELETE</strong> below to confirm:
            </p>
            <input
              type="text"
              className="form-control"
              value={confirmationText}
              onChange={handleInputChange}
              placeholder="Type DELETE"
              disabled={isLoading}
              style={{ marginTop: "10px" }}
            />
          </div>
          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setConfirmationText(""); // Reset input on cancel
                onClose();
              }}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={handleDelete}
              disabled={isLoading || confirmationText !== "DELETE"}
            >
              {isLoading ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DeleteModal;
