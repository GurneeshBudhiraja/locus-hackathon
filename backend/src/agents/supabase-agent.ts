import { createClient } from "@supabase/supabase-js";
import { tool } from "ai";
import { z } from "zod";

// Initialize Supabase client
function getSupabaseClient() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY must be set');
  }
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
  );
}

/**
 * Get all Supabase tools for database operations
 */
export function getSupabaseTools(): Record<string, any> {
  return {
    supabase_get_table_schema: tool({
      description: "Get the schema/structure of a Supabase table. Use this when users want to know the columns, data types, constraints, or structure of a table. IMPORTANT: If the user asks to 'add sample data' or 'insert sample data' when the table is empty, you MUST set insertSampleData to true. This will automatically insert a sample row to help infer the schema. This is useful before inserting or updating data to understand what fields are available.",
      inputSchema: z.object({
        tableName: z.string().describe("The name of the table to get schema for, e.g., 'users', 'products', 'orders'"),
        insertSampleData: z.boolean().optional().describe("If true and table is empty, insert sample data to help infer schema. Set this to true when user explicitly asks to add/insert sample data. Default: false")
      }),
      execute: async ({ tableName, insertSampleData = false }: { tableName: string; insertSampleData?: boolean }) => {
        console.log(`📋 Getting schema for table: ${tableName}`);
        try {
          const supabase = getSupabaseClient();

          // Method 1: Try to get schema via RPC if available
          try {
            const { data: schemaData, error: rpcError } = await supabase.rpc('get_table_schema', {
              table_name: tableName
            });

            if (!rpcError && schemaData) {
              return {
                success: true,
                tableName,
                schema: schemaData,
                method: 'RPC function'
              };
            }
          } catch (rpcErr) {
            // RPC not available, continue to fallback
          }

          // Method 2: Get a sample row to infer schema (most reliable)
          const { data: sampleData, error: sampleError } = await supabase
            .from(tableName)
            .select('*')
            .limit(1);

          if (sampleError) {
            // If table doesn't exist or we can't access it
            return {
              success: false,
              error: sampleError.message || `Could not access table: ${tableName}`,
              tableName,
              hint: 'Make sure the table exists and you have proper permissions'
            };
          }

          // If table is empty, handle it
          if (!sampleData || sampleData.length === 0) {
            // If insertSampleData is true, try to insert sample data
            if (insertSampleData) {
              console.log(`📝 Table is empty. Attempting to insert sample data...`);

              // Try to get column info by attempting an insert with minimal data
              // First, try to insert a row with common default values
              const sampleRow: Record<string, any> = {};

              // Common patterns for sample data
              const commonDefaults: Record<string, any> = {
                id: 1,
                name: 'Sample',
                email: 'sample@example.com',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                status: 'active',
                amount: 0,
                quantity: 1,
                description: 'Sample entry',
                title: 'Sample Title'
              };

              // Try inserting with common defaults
              try {
                const { data: insertedData, error: insertError } = await supabase
                  .from(tableName)
                  .insert(sampleRow) // Start with empty object
                  .select();

                // If that fails, try with some common fields
                if (insertError) {
                  // Try with minimal common fields
                  const minimalRow: Record<string, any> = {};
                  if (commonDefaults.created_at) minimalRow.created_at = commonDefaults.created_at;

                  const { data: retryData, error: retryError } = await supabase
                    .from(tableName)
                    .insert(minimalRow)
                    .select();

                  if (retryError) {
                    return {
                      success: false,
                      error: `Could not insert sample data: ${retryError.message}. Table may have required fields.`,
                      tableName,
                      hint: 'Try inserting data manually first, or check table constraints'
                    };
                  }

                  // Successfully inserted, now get the schema
                  const { data: newSampleData } = await supabase
                    .from(tableName)
                    .select('*')
                    .limit(1);

                  if (newSampleData && newSampleData.length > 0) {
                    const inferredSchema = Object.keys(newSampleData[0]).map(key => {
                      const value = newSampleData[0][key];
                      return {
                        column_name: key,
                        data_type: value === null ? 'unknown' : typeof value,
                        is_nullable: value === null ? 'YES' : 'NO',
                        sample_value: value,
                        javascript_type: typeof value
                      };
                    });

                    return {
                      success: true,
                      tableName,
                      schema: inferredSchema,
                      columnCount: inferredSchema.length,
                      sampleDataInserted: true,
                      insertedRow: newSampleData[0],
                      note: 'Schema inferred from inserted sample data. Sample row was added to the table.'
                    };
                  }
                } else if (insertedData && insertedData.length > 0) {
                  // Successfully inserted with empty object (all defaults/auto-generated)
                  const inferredSchema = Object.keys(insertedData[0]).map(key => {
                    const value = insertedData[0][key];
                    return {
                      column_name: key,
                      data_type: value === null ? 'unknown' : typeof value,
                      is_nullable: value === null ? 'YES' : 'NO',
                      sample_value: value,
                      javascript_type: typeof value
                    };
                  });

                  return {
                    success: true,
                    tableName,
                    schema: inferredSchema,
                    columnCount: inferredSchema.length,
                    sampleDataInserted: true,
                    insertedRow: insertedData[0],
                    note: 'Schema inferred from inserted sample data. Sample row was added to the table.'
                  };
                }
              } catch (insertErr) {
                return {
                  success: false,
                  error: `Could not insert sample data: ${insertErr instanceof Error ? insertErr.message : String(insertErr)}`,
                  tableName
                };
              }
            }

            // Table is empty and insertSampleData is false
            return {
              success: true,
              tableName,
              schema: [],
              note: 'Table exists but is empty. No columns can be inferred. Set insertSampleData=true to insert sample data.',
              columnCount: 0,
              isEmpty: true
            };
          }

          // Infer schema from existing sample data
          const inferredSchema = Object.keys(sampleData[0]).map(key => {
            const value = sampleData[0][key];
            return {
              column_name: key,
              data_type: value === null ? 'unknown' : typeof value,
              is_nullable: value === null ? 'YES' : 'NO',
              sample_value: value,
              javascript_type: typeof value
            };
          });

          return {
            success: true,
            tableName,
            schema: inferredSchema,
            columnCount: inferredSchema.length,
            note: 'Schema inferred from sample data. For PostgreSQL-specific types, use database admin tools.'
          };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          return {
            success: false,
            error: errorMessage,
            tableName
          };
        }
      }
    } as any),
    supabase_read_table: tool({
      description: "Read all data from a Supabase table. Use this when users want to query, fetch, or get data from a table.",
      inputSchema: z.object({
        tableName: z.string().describe("The name of the table to read from, e.g., 'users', 'products', 'orders'"),
        filters: z.record(z.any()).optional().describe("Optional filters as key-value pairs, e.g., { status: 'active', age: 25 }"),
        limit: z.number().optional().describe("Optional limit for the number of rows to return")
      }),
      execute: async ({ tableName, filters, limit }: { tableName: string; filters?: Record<string, any>; limit?: number }) => {
        console.log(`📖 Reading from table: ${tableName}`);
        try {
          const supabase = getSupabaseClient();
          let query = supabase.from(tableName).select('*');

          // Apply filters if provided
          if (filters) {
            Object.entries(filters).forEach(([key, value]) => {
              query = query.eq(key, value);
            });
          }

          // Apply limit if provided
          if (limit) {
            query = query.limit(limit);
          }

          const { data, error } = await query;

          if (error) {
            return {
              success: false,
              error: error.message,
              tableName
            };
          }

          return {
            success: true,
            tableName,
            count: data?.length || 0,
            data: data || []
          };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          return {
            success: false,
            error: errorMessage,
            tableName
          };
        }
      }
    } as any),
    supabase_insert_data: tool({
      description: "Insert/add new data into a Supabase table. Use this when users want to create, add, or insert new records. IMPORTANT: Before inserting, you should first get the table schema using supabase_get_table_schema to understand what columns exist and their data types. If the table is empty, use supabase_get_table_schema with insertSampleData=true first to get the schema structure.",
      inputSchema: z.object({
        tableName: z.string().describe("The name of the table to insert into, e.g., 'users', 'products'"),
        data: z.record(z.any()).describe("The data to insert as key-value pairs, e.g., { name: 'John', email: 'john@example.com', age: 30 }. Make sure to include all required fields based on the table schema.")
      }),
      execute: async ({ tableName, data }: { tableName: string; data: Record<string, any> }) => {
        console.log(`➕ Inserting into table: ${tableName}`, data);
        try {
          const supabase = getSupabaseClient();
          const { data: insertedData, error } = await supabase
            .from(tableName)
            .insert(data)
            .select();

          if (error) {
            return {
              success: false,
              error: error.message,
              tableName
            };
          }

          return {
            success: true,
            tableName,
            inserted: insertedData || [],
            message: `Successfully inserted ${insertedData?.length || 1} row(s) into ${tableName}`
          };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          return {
            success: false,
            error: errorMessage,
            tableName
          };
        }
      }
    } as any),
    supabase_update_data: tool({
      description: "Update existing data in a Supabase table. Use this when users want to modify or update records.",
      inputSchema: z.object({
        tableName: z.string().describe("The name of the table to update, e.g., 'users', 'products'"),
        filters: z.record(z.any()).describe("Filters to identify which rows to update, e.g., { id: 1 } or { email: 'john@example.com' }"),
        data: z.record(z.any()).describe("The data to update as key-value pairs, e.g., { name: 'John Doe', status: 'active' }")
      }),
      execute: async ({ tableName, filters, data }: { tableName: string; filters: Record<string, any>; data: Record<string, any> }) => {
        console.log(`✏️ Updating table: ${tableName}`, { filters, data });
        try {
          const supabase = getSupabaseClient();
          let query = supabase.from(tableName).update(data);

          // Apply filters
          Object.entries(filters).forEach(([key, value]) => {
            query = query.eq(key, value);
          });

          const { data: updatedData, error } = await query.select();

          if (error) {
            return {
              success: false,
              error: error.message,
              tableName
            };
          }

          return {
            success: true,
            tableName,
            updated: updatedData || [],
            count: updatedData?.length || 0,
            message: `Successfully updated ${updatedData?.length || 0} row(s) in ${tableName}`
          };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          return {
            success: false,
            error: errorMessage,
            tableName
          };
        }
      }
    } as any),
    supabase_delete_data: tool({
      description: "Delete data from a Supabase table. Use this when users want to remove or delete records.",
      inputSchema: z.object({
        tableName: z.string().describe("The name of the table to delete from, e.g., 'users', 'products'"),
        filters: z.record(z.any()).describe("Filters to identify which rows to delete, e.g., { id: 1 } or { status: 'inactive' }")
      }),
      execute: async ({ tableName, filters }: { tableName: string; filters: Record<string, any> }) => {
        console.log(`🗑️ Deleting from table: ${tableName}`, filters);
        try {
          const supabase = getSupabaseClient();
          let query = supabase.from(tableName).delete();

          // Apply filters
          Object.entries(filters).forEach(([key, value]) => {
            query = query.eq(key, value);
          });

          const { data: deletedData, error } = await query.select();

          if (error) {
            return {
              success: false,
              error: error.message,
              tableName
            };
          }

          return {
            success: true,
            tableName,
            deleted: deletedData || [],
            count: deletedData?.length || 0,
            message: `Successfully deleted ${deletedData?.length || 0} row(s) from ${tableName}`
          };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          return {
            success: false,
            error: errorMessage,
            tableName
          };
        }
      }
    } as any)
  };
}
