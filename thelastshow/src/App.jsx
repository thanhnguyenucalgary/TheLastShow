import AddObituary from "./AddObituary";
import "./App.css";
import Login from "./Login";
import { GoogleOAuthProvider } from "@react-oauth/google";
import React, { useEffect, useState } from "react";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://35.183.24.39:30791";

function App() {
  const [user, setUser] = useState(null);
  const [obituaries, setObituaries] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    const createdBy = user?.email || user?.name;
    if (!createdBy) {
      setObituaries([]);
      return;
    }

    async function loadObituaries() {
      try {
        const response = await fetch(
          `${API_BASE_URL}/get-obituaries?created_by=${encodeURIComponent(createdBy)}`,
        );

        if (!response.ok) {
          throw new Error("Failed to load obituaries");
        }

        const data = await response.json();
        setObituaries(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error(error);
        setObituaries([]);
      }
    }

    loadObituaries();
  }, [user]);

  // Only show obituaries created by the current user
  const myObituaries = obituaries.filter(
    (ob) => ob.createdBy === (user?.email || user?.name),
  );

  async function handleDelete(obituary) {
    const createdBy = user?.email || user?.name;
    if (!createdBy || !obituary?.id) {
      alert("Unable to delete this obituary.");
      return;
    }

    try {
      setDeletingId(obituary.id);
      const response = await fetch(
        `${API_BASE_URL}/delete-obituary/${encodeURIComponent(obituary.id)}?created_by=${encodeURIComponent(createdBy)}`,
        { method: "DELETE" },
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to delete obituary");
      }

      setObituaries((prev) => prev.filter((item) => item.id !== obituary.id));
    } catch (error) {
      alert("Error: " + error.message);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <GoogleOAuthProvider clientId="478041193756-j4f5mdu0jc15c1i5n7io36j8qc9ubr62.apps.googleusercontent.com">
      <div className="App">
        {/* Top Navigation Bar */}
        <div className="top-bar">
          <div className="title">
            <b>The Last Show</b>
          </div>
          <Login user={user} setUser={setUser} />
        </div>

        {/* Main Content Area */}
        <div className={`main-content${showModal ? " transparent" : ""}`}>
          {user && obituaries.length === 0 ? (
            <>
              <div className="main-content-withoutobituaries">
                {" "}
                <h1>Let's Create the Last Show</h1>
                <button
                  className="addObituary"
                  onClick={() => setShowModal(true)}
                >
                  Add Obituary +
                </button>
              </div>
            </>
          ) : user && myObituaries.length > 0 ? (
            <>
              <ul className="obituary-list">
                {myObituaries.map((ob, idx) => (
                  <li key={ob.id || idx} className="obituary-item">
                    <img src={ob.image} alt={ob.name} />
                    <h2>{ob.name}</h2>
                    <p>Date: {ob.date}</p>
                    {ob.story && <p className="story-text">{ob.story}</p>}
                    {ob.audio && (
                      <audio controls preload="none" className="obituary-audio">
                        <source src={ob.audio} type="audio/mpeg" />
                        Your browser does not support the audio element.
                      </audio>
                    )}
                    <button
                      className="delete-button"
                      onClick={() => handleDelete(ob)}
                      disabled={deletingId === ob.id}
                    >
                      {deletingId === ob.id ? "Deleting..." : "Delete"}
                    </button>
                  </li>
                ))}
              </ul>
              <button
                className="addObituary"
                onClick={() => setShowModal(true)}
              >
                Add Obituary +
              </button>
            </>
          ) : (
            <>
              <div className="main-content-withoutobituaries">
                {" "}
                <h1>Welcome to The Last Show</h1>
                <p className="description">
                  Create and celebrate the stories of lives lived. Generate
                  obituaries, listen to their stories, and preserve memories
                  with AI and cloud technology.
                </p>
              </div>
            </>
          )}
        </div>
        {showModal && (
          <AddObituary
            user={user}
            setObituaries={setObituaries}
            onClose={() => setShowModal(false)}
          />
        )}
      </div>
    </GoogleOAuthProvider>
  );
}
export default App;
