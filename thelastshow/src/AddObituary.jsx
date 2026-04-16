import React, { useState } from "react";
import "./App.css";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://56.112.10.18:8000";

export default function AddObituary({ user, setObituaries, onClose }) {
  const [name, setName] = useState("");
  const [bornYear, setBornYear] = useState("");
  const [diedYear, setDiedYear] = useState("");
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleImageChange(e) {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    } else {
      setImage(null);
      setImagePreview(null);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!image) {
      alert("Please select an image before submitting.");
      return;
    }

    const createdBy = user?.email || user?.name || "";
    if (!createdBy) {
      alert("Please log in before creating an obituary.");
      return;
    }

    const formData = new FormData();
    formData.append("name", name);
    formData.append("born_year", bornYear);
    formData.append("died_year", diedYear);
    formData.append("image", image);
    formData.append("email", createdBy);

    try {
      setIsSubmitting(true);
      const response = await fetch(`${API_BASE_URL}/create-obituary`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to add obituary");
      }

      const data = await response.json();
      setObituaries((prev) => [...prev, data]);
      onClose();
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h2>Add Obituary</h2>
        <form onSubmit={handleSubmit}>
          <div className="image-upload-area">
            <label
              style={{
                fontWeight: 600,
                fontSize: "1.1em",
                marginBottom: 8,
                display: "block",
              }}
            >
              Image Update
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                style={{ display: "block", marginTop: 8 }}
              />
            </label>
            {imagePreview && (
              <img
                src={imagePreview}
                alt="Preview"
                style={{
                  width: 120,
                  height: 120,
                  objectFit: "cover",
                  borderRadius: 8,
                  border: "1px solid #bbb",
                  marginTop: 8,
                  marginBottom: 16,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                }}
              />
            )}
          </div>
          <label>
            Name:
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </label>
          <label>
            Born Year:
            <input
              type="number"
              value={bornYear}
              onChange={(e) => setBornYear(e.target.value)}
              required
              min="1800"
              max={new Date().getFullYear()}
            />
          </label>
          <label>
            Died Year:
            <input
              type="number"
              value={diedYear}
              onChange={(e) => setDiedYear(e.target.value)}
              required
              min="1800"
              max={new Date().getFullYear()}
            />
          </label>
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Adding..." : "Add"}
            </button>
            <button type="button" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
