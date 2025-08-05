import React, { useState, useRef } from "react";
import Message from "./components/Message";

interface Chats {
  streamId: string;
  message: string;
  response: string;
}

export default function App() {
  const [message, setMessage] = useState<string>("");
  const [chat, setChat] = useState<Chats[]>([]);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [currentStreamId, setCurrentStreamId] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  const handleSendOrStop = async () => {
    if (isStreaming && currentStreamId) {
      // Stop the current stream
      await fetch("http://localhost:3001/stop-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ streamId: currentStreamId }),
      });
      setIsStreaming(false);
      setCurrentStreamId(null);
      return;
    }

    if (message.trim() !== "") {
      const streamId = Date.now().toString();
      const newChat: Chats = {
        streamId: streamId,
        message: message,
        response: "",
      };

      setChat((prevChat) => [...prevChat, newChat]);
      setMessage("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }

      setIsStreaming(true);
      setCurrentStreamId(streamId);

      const response = await fetch("http://localhost:3001/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, streamId }),
      });

      if (response.ok && response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let responseText = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const textChunk = decoder.decode(value);
          responseText += textChunk;

          setChat((prevChat) =>
            prevChat.map((c) =>
              c.streamId === streamId ? { ...c, response: responseText } : c
            )
          );
        }
      }

      setIsStreaming(false);
      setCurrentStreamId(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendOrStop();
    }
  };

  return (
    <div className="flex justify-center h-screen">
      <div className="flex flex-col h-screen w-1/2">
        <div className="p-5">
          <h1 className="text-3xl font-bold">AskMe</h1>
        </div>

        <div className="flex-1 overflow-y-auto px-5 space-y-4">
          {chat.map((chatItem) => (
            <React.Fragment key={chatItem.streamId}>
              <div className="flex justify-end w-full">
                <Message message={chatItem.message} />
              </div>
              {chatItem.response && (
                <div className="flex justify-start w-full">
                  <Message message={chatItem.response} />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>

        <div className="py-5">
          <div className="relative w-full">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder="Enter your query"
              rows={1}
              className="w-full border rounded p-4 pr-24 resize-none overflow-hidden"
            />
            <button
              onClick={handleSendOrStop}
              className={`absolute right-3 bottom-1 -translate-y-1/3 px-4 py-1 rounded text-white ${
                isStreaming ? "bg-red-500 hover:bg-red-600" : "bg-blue-500 hover:bg-blue-600"
              }`}
            >
              {isStreaming ? "Stop" : "Send"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
