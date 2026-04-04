import AddObituary from "./AddObituary";
import "./App.css";
import Login from "./Login";
import { GoogleOAuthProvider } from "@react-oauth/google";
import React, { useState } from "react";

function App() {
  const [user, setUser] = useState(null);
  const [obituaries, setObituaries] = useState([]);
  const [showModal, setShowModal] = useState(false);

  // Only show obituaries created by the current user
  const myObituaries = obituaries.filter(
    (ob) => ob.createdBy === (user?.email || user?.name),
  );

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
                  <li key={idx} className="obituary-item">
                    <img src={ob.image} alt={ob.name} />
                    <h2>{ob.name}</h2>
                    <p>Date: {ob.date}</p>
                    <p>
                      {ob.story.split(/\s+/).slice(0, 50).join(" ")}
                      {ob.story.split(/\s+/).length > 50 ? "..." : ""}
                    </p>
                    <button
                      className="delete-button"
                      onClick={() =>
                        setObituaries((prev) =>
                          prev.filter((item) => item !== ob),
                        )
                      }
                    >
                      Delete
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
