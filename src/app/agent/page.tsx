"use client"

import { AgentChat, createAgentChat } from "@21st-sdk/nextjs"
import { useChat } from "@ai-sdk/react"
import theme from "../theme.json"

const chat = createAgentChat({
    agent: "my-agent",
    tokenUrl: "/api/an-token",
})

export default function AgentPage() {
    const { messages, sendMessage, status, stop, error } =
        useChat({ chat })

    return (
        <div className="flex flex-col h-[calc(100vh-80px)] mt-20 max-w-2xl mx-auto w-full border rounded-2xl overflow-hidden shadow-lg bg-background">
            <AgentChat
                messages={messages}
                onSend={(msg) => sendMessage({ parts: [{ type: "text", text: msg.content }] })}
                status={status}
                onStop={stop}
                error={error ?? undefined}
                theme={theme}
            />
        </div>
    )
}
