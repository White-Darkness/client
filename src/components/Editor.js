import React, { useEffect, useRef } from "react";
import "codemirror/lib/codemirror.css"; // Core styles for CodeMirror
import "codemirror/theme/dracula.css"; // Theme for CodeMirror
import "codemirror/addon/edit/closetag"; // Auto-close tags
import "codemirror/addon/edit/closebrackets"; // Auto-close brackets
import "codemirror/addon/hint/show-hint"; // Autocomplete addon
import "codemirror/addon/hint/javascript-hint"; // JavaScript autocomplete
import "codemirror/addon/hint/sql-hint";
import "codemirror/addon/hint/xml-hint";
import "codemirror/addon/hint/html-hint"; // HTML autocomplete
import "codemirror/addon/hint/css-hint"; // CSS autocomplete
import "codemirror/addon/hint/show-hint.css"; // Styles for autocomplete
import CodeMirror from "codemirror"; // Main CodeMirror library
import { ACTIONS } from "../Actions"; // Import actions for socket communication

// Import modes for different languages
import "codemirror/mode/javascript/javascript"; // JavaScript mode
import "codemirror/mode/python/python";
import "codemirror/mode/xml/xml";
import "codemirror/mode/sql/sql";
import "codemirror/mode/htmlmixed/htmlmixed"; // HTML mixed mode
import "codemirror/mode/css/css"; // CSS mode
import "codemirror/mode/clike/clike"; // C, C++, C# mode

function Editor({ socketRef, roomId, onCodeChange, selectedLanguage }) {
  const editorRef = useRef(null);

  useEffect(() => {
    const init = async () => {
      const editor = CodeMirror.fromTextArea(
        document.getElementById("realtimeEditor"),
        {
          mode: { name: selectedLanguage }, // Set mode based on selected language
          theme: "dracula", // Set theme
          autoCloseTags: true, // Enable auto-closing of tags
          autoCloseBrackets: true, // Enable auto-closing of brackets
          lineNumbers: true, // Show line numbers
          extraKeys: {
            "Ctrl-Space": "autocomplete", // Trigger autocomplete on Ctrl + Space
          },
        }
      );

      editorRef.current = editor; // Store editor instance
      editor.setSize(null, "100%"); // Set editor size

      // Handle changes in the editor
      editor.on("change", (instance, changes) => {
        const { origin } = changes;
        const code = instance.getValue(); // Get current code
        onCodeChange(code); // Call the onCodeChange prop
        if (origin !== "setValue") {
          socketRef.current.emit(ACTIONS.CODE_CHANGE, {
            roomId,
            code,
          });
        }
      });
    };

    init(); // Initialize the editor

    // Cleanup function to remove event listeners
    return () => {
      editorRef.current && editorRef.current.toTextArea();
    };
  }, [selectedLanguage]); // Re-run effect when selectedLanguage changes

  // Data receive from server
  useEffect(() => {
    if (socketRef.current) {
      socketRef.current.on(ACTIONS.CODE_CHANGE, ({ code }) => {
        if (code !== null) {
          editorRef.current.setValue(code); // Update editor with new code
        }
      });
    }
    return () => {
      socketRef.current.off(ACTIONS.CODE_CHANGE); // Cleanup listener
    };
  }, [socketRef.current]);

  return (
    <div style={{ height: "600px" }}>
      <textarea id="realtimeEditor" defaultValue="// Write your code here..." />
    </div>
  );
}

export default Editor;



