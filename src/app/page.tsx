"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userQuery = input.trim();
    setInput("");

    setMessages((prev) => [...prev, { role: "user", content: userQuery }]);
    setIsLoading(true);

    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: userQuery }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.response },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `⚠️ Error: ${data.error || "No se pudo obtener respuesta."}`,
          },
        ]);
      }
    } catch (error) {
      console.error("Error al enviar la consulta:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "⚠️ Error de conexión con el servidor.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex flex-col h-screen w-full bg-[#050505] text-zinc-100 font-sans">
      {/* Header TeamG */}
      <header className="p-5 border-b border-lime-950/60 bg-zinc-950/90 flex items-center justify-between shadow-lg shadow-lime-950/20 backdrop-blur w-full">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-lime-600 via-green-600 to-lime-400 flex items-center justify-center font-black text-black text-2xl tracking-wider shadow-md shadow-lime-600/30">
            G
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white leading-none">
              TeamG<span className="text-lime-500">-IA</span>
            </h1>
            <p className="text-xs text-lime-400/80 font-mono tracking-widest uppercase mt-1">
              Asistente Inteligente
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 bg-lime-950/40 border border-lime-800/40 px-4 py-1.5 rounded-full">
          <span className="w-2.5 h-2.5 rounded-full bg-lime-500 animate-pulse shadow-[0_0_8px_#84cc16]" />
          <span className="text-sm text-lime-400 font-medium">Sistema Online</span>
        </div>
      </header>

      {/* Área de Mensajes */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6 bg-gradient-to-b from-[#050505] via-zinc-950 to-[#050505] w-full">
        <div className="max-w-5xl mx-auto space-y-6">
          {messages.length === 0 ? (
            <div className="h-[60vh] flex flex-col items-center justify-center text-center text-zinc-400 gap-4">
              <div className="w-20 h-20 rounded-2xl bg-lime-500/10 border border-lime-500/30 flex items-center justify-center text-lime-400 text-3xl font-bold shadow-lg shadow-lime-500/10">
                TeamG
              </div>
              <p className="text-2xl font-semibold text-zinc-100">¡Bienvenido a TeamG!</p>
              <p className="text-sm sm:text-base max-w-md text-zinc-400">
                Escribí tu consulta para empezar a interactuar con el agente.
              </p>
            </div>
          ) : (
            messages.map((msg, index) => (
              <div
                key={index}
                className={`flex ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-5 py-3.5 text-base sm:text-lg leading-relaxed ${
                    msg.role === "user"
                      ? "bg-lime-500 text-black font-semibold rounded-br-none shadow-md shadow-lime-950/50"
                      : "bg-zinc-900/90 text-zinc-100 border border-lime-950/80 rounded-bl-none whitespace-pre-wrap shadow-sm"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))
          )}

          {/* Indicador de Carga */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-zinc-900 border border-lime-900/50 text-lime-400 rounded-2xl rounded-bl-none px-5 py-4 text-base flex items-center gap-3">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-lime-400 animate-ping" />
                <span className="font-mono text-sm text-lime-400">
                  TeamG procesando respuesta...
                </span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Formulario / Input */}
      <form
        onSubmit={handleSubmit}
        className="p-5 bg-zinc-950 border-t border-lime-950/60 w-full"
      >
        <div className="max-w-5xl mx-auto flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escribí un mensaje para TeamG..."
            className="flex-1 bg-zinc-900/80 border border-zinc-800 rounded-xl px-5 py-3.5 text-base sm:text-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500 transition-all"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-lime-500 hover:bg-lime-400 active:bg-lime-600 disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold text-base sm:text-lg px-7 py-3.5 rounded-xl transition-all flex items-center justify-center shadow-lg shadow-lime-500/20"
          >
            Enviar
          </button>
        </div>
      </form>
    </main>
  );
}