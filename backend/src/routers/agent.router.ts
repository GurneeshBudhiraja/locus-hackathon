import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { generateText, tool } from "ai";
import { openai } from "@ai-sdk/openai";
import { runLocusAgent } from "../agents/locus-agent";

const router: Router = Router();


router.post("/chat", async (req: Request, res: Response) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({
        success: false,
        error: "Message is required and must be a string",
      });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        success: false,
        error: "OPENAI_API_KEY is not configured",
      });
    }

    if (!process.env.LOCUS_API_KEY) {
      return res.status(500).json({
        success: false,
        error: "LOCUS_API_KEY is not configured",
      });
    }

    console.log("🏃‍➡️ Running the agent")
    const response = await generateText({
      model: openai("gpt-5"),
      prompt: message,
      system: `You are a helpful assistant that can execute blockchain transactions and payments using the Locus payment system. When the user adds the address use that address and pass that to the agent with the proper prompt constructed.`,
      tools: {
        locus_payment: tool({
          description: "Execute blockchain payments and transactions using the Locus payment system. Use this tool when users want to send money, make payments, or execute any blockchain transactions.",
          inputSchema: z.object({
            prompt: z.string().describe("The payment instruction or transaction request from the user, e.g., 'send 1 usdc to 0xabc123'")
          }),
          execute: async ({ prompt }: { prompt: string }) => {
            console.log(`💳 Executing Locus payment: ${prompt}`);
            try {
              const result = await runLocusAgent({ prompt });
              return result;
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : String(error);
              return {
                success: false,
                error: errorMessage
              };
            }
          }
        } as any)
      },
    })
    console.log("📝 Response:")
    console.log(response)

    return res.json({
      success: true,
      text: response.text,
      toolCalls: response.toolCalls,
      toolResults: response.toolResults
    }).status(200)

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
});

export default router;

