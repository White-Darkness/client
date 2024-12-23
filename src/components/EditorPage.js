import React, { useEffect, useRef, useState } from "react";
import Editor from "./Editor";
import { initSocket } from "../Socket";
import { ACTIONS } from "../Actions";
import { useNavigate, useLocation, Navigate, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import axios from "axios";

// List of supported languages
const LANGUAGES = [
  "Javascript",
  "htmlmixed",
  "Python",
  "XML",
  "SQL",
  "CSS",
  "C",
  "C++ , C#", // C, C++, C#
];

function EditorPage() {
  const [clients, setClients] = useState([]);
  const [ output, setOutput] = useState("");
  const [isCompileWindowOpen, setIsCompileWindowOpen] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState("javascript");
  const codeRef = useRef(null);

  const location = useLocation();
  const navigate = useNavigate();
  const { roomId } = useParams();

  const socketRef = useRef(null);

  useEffect(() => {
    const init = async () => {
      socketRef.current = await initSocket();
      socketRef.current.on("connect_error", (err) => handleErrors(err));
      socketRef.current.on("connect_failed", (err) => handleErrors(err));

      const handleErrors = (err) => {
        console.log("Error", err);
        toast.error("Socket connection failed, Try again later");
        navigate("/");
      };

      socketRef.current.emit(ACTIONS.JOIN, {
        roomId,
        username: location.state?.username,
      });

      socketRef.current.on(ACTIONS.JOINED, ({ clients, username }) => {
        if (username !== location.state?.username) {
          toast.success(`${username} joined the room.`);
        }
        setClients(clients);
        socketRef.current.emit(ACTIONS.SYNC_CODE, {
          code: codeRef.current,
          socketId: socketRef.current.id,
        });
      });

      socketRef.current.on(ACTIONS.DISCONNECTED, ({ socketId, username }) => {
        toast.success(`${username} left the room`);
        setClients((prev) => prev.filter((client) => client.socketId !== socketId));
      });
    };
    init();

    return () => {
      socketRef.current && socketRef.current.disconnect();
      socketRef.current.off(ACTIONS.JOINED);
      socketRef.current.off(ACTIONS.DISCONNECTED);
    };
  }, []);

  if (!location.state) {
    return <Navigate to="/" />;
  }

  const copyRoomId = async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      toast.success(`Room ID is copied`);
    } catch (error) {
      console.log(error);
      toast.error("Unable to copy the room ID");
    }
  };

  const leaveRoom = async () => {
    navigate("/");
  };

  const runCode = async () => {
    setIsCompiling(true);
    try {
      const response = await axios.post("https://server-jmwe.onrender.com/compile", {
        code: codeRef.current,
        language: selectedLanguage,
      });
      console.log("Backend response:", response.data);
      setOutput(response.data.output || JSON.stringify(response.data));
    } catch (error) {
      console.error("Error compiling code:", error);
      setOutput(error.response?.data?.error || "An error occurred");
    } finally {
      setIsCompiling(false);
    }
  };

  const toggleCompileWindow = () => {
    setIsCompileWindowOpen(!isCompileWindowOpen);
  };

  return (
    <div
      className="container-fluid vh-100 d-flex flex-column"
      style={{
        backgroundColor: "#121212", // Dark background
        color: "#E0E0E0", // Light text
      }}
    >
      <div className="row flex-grow-1">
        {/* Client panel */}
        <div className="col-md-2 bg-dark text-light d-flex flex-column">
          <img
            src="/images/codecast.png"
            alt="Logo"
            className="img-fluid mx-auto"
            style={{ maxWidth: "150px", marginTop: "-43px" }}
          />
          <hr style={{ marginTop: "-3rem" }} />

          {/* Client list container */}
          <div className="d-flex flex-column flex-grow-1 overflow-auto">
            <span className="mb-3">Connected Users</span>
            <div className="d-flex flex-column">
              {clients.map((client) => (
                <div key={client.socketId} className="p-2">
                  {client.username}
                </div>
              ))}
            </div>
          </div>

          <button className="btn btn-danger mt-2" onClick={leaveRoom}>
            Leave Room
          </button>
          <button className="btn btn-info mt-2" onClick={copyRoomId}>
            Copy Room ID
          </button>
        </div>

        {/* Editor section */}
        <div className="col-md-10">
          <div className="d-flex justify-content-between align-items-center">
            <h2 className="text-light">Code Editor</h2>
            <select
              className="form-select"
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
            >
              {LANGUAGES.map((lang) => (
                <option key={lang} value={lang}>
                  {lang.charAt(0).toUpperCase() + lang.slice(1)}
                </option>
              ))}
            </select>
            <button 
              className="btn btn-primary" 
              onClick={runCode} 
              style={{ padding: "10px 20px", fontSize: "16px", marginRight: "10px" }}
            >
              Run Code
            </button>
            <button 
              className="btn btn-secondary" 
              onClick={toggleCompileWindow} 
              style={{ padding: "10px 20px", fontSize: "16px" }}
            >
              {isCompileWindowOpen ? "Hide Output" : "Show Output"}
            </button>
          </div>

          <Editor
            socketRef={socketRef}
            roomId={roomId}
            onCodeChange={(code) => {
              codeRef.current = code;
            }}
            selectedLanguage={selectedLanguage}
          />

          {isCompileWindowOpen && (
            <div className="output-window mt-3">
              <h4 className="text-light">Output</h4>
              <pre className="bg-dark text-light p-2">{isCompiling ? "Compiling..." : output}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default EditorPage;
