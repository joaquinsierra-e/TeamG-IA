# 🤖 TeamG AI Assistant

Asistente de Inteligencia Artificial local desarrollado con **Next.js**, **LangChain** y **Ollama**, completamente containerizado mediante **Docker Compose**.

## 🚀 Tecnologías Utilizadas

* **Frontend / Framework:** Next.js (TypeScript, Tailwind CSS)
* **Orquestación LLM:** LangChain
* **Motor LLM Local:** Ollama (`qwen2.5:7b`)
* **Containerización:** Docker & Docker Compose

## 🛠️ Arquitectura e Infraestructura

El proyecto utiliza una red privada de Docker para comunicar la aplicación web con el servicio de Ollama de forma transparente:

* `teamg-app`: Interfaz web en Next.js corriendo en el puerto `3000`.
* `teamg-ollama`: Servicio de Ollama exponiendo el modelo en el puerto `11434`.

---

## 💻 Requisitos Previos

* [Docker Desktop](https://www.docker.com/) instalado y corriendo.
* Git.

---

## ⚙️ Instalación y Configuración

1. **Clonar el repositorio:**
   git clone [https://github.com/joaquinsierra-e/TeamG-IA.git](https://github.com/joaquinsierra-e/TeamG-IA.git)
   cd TeamG-IA