import Fastify from "fastify"

const app = Fastify()

app.get("/", async () => {
  return { message: "ERP AI Copilot API running" }
})

app.post("/ask", async (request) => {
  return {
    message: "AI endpoint coming soon"
  }
})

const start = async () => {
  await app.listen({ port: 3000 })
  console.log("Server running on http://localhost:3000")
}

start()