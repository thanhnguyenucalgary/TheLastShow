import React, { useState } from "react";
import "./App.css";

export default function AddObituary({ user, setObituaries, onClose }) {
  const [userEmail, setUserEmail] = useState(user?.email || user?.name || "");
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [story, setStory] = useState("");
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

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

  function handleSubmit(e) {
    e.preventDefault();
    setObituaries((prev) => [
      ...prev,
      {
        name,
        date,
        story,
        image: imagePreview,
        createdBy: user?.email || user?.name || "",
      },
    ]);
    onClose();
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
            Date:
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </label>
          <label>
            Story:
            <textarea
              value={story}
              onChange={(e) => setStory(e.target.value)}
              required
            />
          </label>
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button type="submit">Add</button>
            <button type="button" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
