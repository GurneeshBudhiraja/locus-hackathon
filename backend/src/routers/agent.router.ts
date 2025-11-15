import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { generateText, tool } from "ai";
import { openai } from "@ai-sdk/openai";
import { runLocusAgent } from "../agents/locus-agent";
import { getSupabaseTools } from "../agents/supabase-agent";

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

    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      return res.status(500).json({
        success: false,
        error: "SUPABASE_URL and SUPABASE_ANON_KEY must be configured",
      });
    }

    console.log("🏃‍➡️ Running the agent")
    const response = await generateText({
      model: openai("gpt-5"),
      prompt: message,
      system: `You are a helpful assistant that can:
      1. Execute blockchain transactions and payments using the Locus payment system
      2. Interact with Supabase database to read, insert, update, or delete data
      3. Get the schema of a Supabase table

      When users ask about:
        - Payments, transactions, or sending money → use the locus_payment tool
        - Getting table structure/schema → use the supabase_get_table_schema tool (use this first to understand table structure)
        - Reading data from a table → use the supabase_read_table tool
        - Inserting/adding data to a table → use the supabase_insert_data tool
        - Updating data in a table → use the supabase_update_data tool
        - Deleting data from a table → use the supabase_delete_data tool

      IMPORTANT WORKFLOW RULES:
      1. When a table is empty and you need to insert data, you MUST first get the schema using supabase_get_table_schema with insertSampleData=true to understand the table structure
      2. After getting the schema, use that information to construct the proper data object for supabase_insert_data
      3. ALWAYS complete the full task - if the user asks you to find something and then insert data, you must do BOTH steps
      4. When inserting data, use the schema information to include all required fields and appropriate data types
      5. If you get a schema result showing the table is empty, call supabase_get_table_schema again with insertSampleData=true to get the actual schema structure
      6. Never stop mid-task - always complete all requested operations

      You would also be required to use more than one tool to get the job done. Plan the best approach to get the job done, plan all the steps, and then execute the steps one by one until the task is complete.
      `,
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
        } as any),
        ...getSupabaseTools()
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

