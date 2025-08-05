import express from 'express';
import ollama from 'ollama';
import cors from 'cors';
import fs from "fs";

const app = express();
app.use(cors());
app.use(express.json());

const streamControllers = new Map();

app.post("/chat", async (req, res) => {
    const { message, streamId } = req.body;
    if (!message) return res.status(400).send("Message is required");
    if (!streamId) return res.status(400).send("streamId is required");

    const controller = new AbortController();
    streamControllers.set(streamId, controller);

    try {
        const response = await ollama.chat({
            model: "gemma:2b",
            stream: true,
            messages: [{ role: "system", content: "Write in a plain text" },{ role: "user", content: message }],
            signal: controller.signal
        });

        res.setHeader("Content-Type", "text/plain");
        res.setHeader("Transfer-Encoding", "chunked");

        req.on("close", () => {
            console.log(`Client disconnected: ${streamId}`);
            if (streamControllers.has(streamId)) {
                controller.abort();
                streamControllers.delete(streamId);
            }
        });
        
        for await (const chunk of response) {
            if (controller.signal.aborted) {
                break;
            }
            const data = chunk.message?.content || '';
            if (data) {
                fs.appendFile("output.txt",data,(err)=>{
                    if (err) {
                        console.error("Error writing to file:", err);
                    }
                })
                res.write(data);
            }
        }
        res.end();
        streamControllers.delete(streamId);
    } catch (err) {
        console.error("Streaming error:", err);
        streamControllers.delete(streamId);
        if (!res.headersSent) {
            res.status(500).send(err.message || "Internal Server Error");
        } else {
            res.end();
        }
    }
});

app.post("/stop-stream", (req, res) => {
    const { streamId } = req.body;
    if (!streamId) return res.status(400).send("Missing streamId");

    const controller = streamControllers.get(streamId);
    if (!controller) return res.status(404).send("Stream not found");

    controller.abort();
    streamControllers.delete(streamId);

    console.log(`Stop signal sent for streamId: ${streamId}`);
    res.send("Stream stopped");
});

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
