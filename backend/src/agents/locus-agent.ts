import 'dotenv/config';
import { query } from '@anthropic-ai/claude-agent-sdk';

export interface LocusAgentProps {
  prompt: string;
}

export interface LocusAgentResult {
  success: boolean;
  result?: any;
  error?: string;
  mcpStatus?: {
    connected: boolean;
    status?: string;
  };
}

// Get SDK options configuration
function getSdkOptions() {
  const mcpServers = {
    'locus': {
      type: 'http' as const,
      url: 'https://mcp.paywithlocus.com/mcp',
      headers: {
        'Authorization': `Bearer ${process.env.LOCUS_API_KEY}`
      }
    }
  };

  return {
    mcpServers,
    allowedTools: [
      'mcp__locus__*',      // Allow all Locus tools
      'mcp__list_resources',
      'mcp__read_resource',
    ],
    apiKey: process.env.OPENAI_API_KEY,
    // Auto-approve Locus tool usage
    canUseTool: async (toolName: string, input: Record<string, unknown>) => {
      if (toolName.startsWith('mcp__locus__')) {
        return {
          behavior: 'allow' as const,
          updatedInput: input
        };
      }
      return {
        behavior: 'deny' as const,
        message: 'Only Locus tools are allowed'
      };
    }
  };
}

// Process a query and return the result with MCP status
async function processQuery(userPrompt: string): Promise<{ result: any; mcpStatus: any }> {
  const options = getSdkOptions();
  let mcpStatus: any = null;
  let finalResult: any = null;

  console.log('Running sample query...\n');
  console.log('─'.repeat(50));

  for await (const message of query({
    prompt: userPrompt,
    options
  })) {
    if (message.type === 'system' && message.subtype === 'init') {
      // Check MCP connection status
      const mcpServersInfo = (message as any).mcp_servers;
      mcpStatus = mcpServersInfo?.find((s: any) => s.name === 'locus');
      if (mcpStatus?.status === 'connected') {
        console.log(`✓ Connected to Locus MCP server\n`);
      } else {
        console.warn(`⚠️  MCP connection issue\n`);
      }
    } else if (message.type === 'result' && message.subtype === 'success') {
      finalResult = (message as any).result;
    }
  }

  console.log('Response:', finalResult);
  console.log('─'.repeat(50));
  console.log('\n✓ Query completed successfully!');

  return {
    result: finalResult || 'No response received',
    mcpStatus
  };
}

/**
 * Locus agent to handle payments and transactions via Claude SDK
 * This integrates with the Locus MCP server to execute blockchain transactions
 */
export async function runLocusAgent({
  prompt,
}: LocusAgentProps): Promise<LocusAgentResult> {
  try {
    console.log('🎯 Starting Locus Claude SDK application...\n');

    // 1. Configure MCP connection to Locus
    console.log('Configuring Locus MCP connection...');

    if (!process.env.LOCUS_API_KEY) {
      throw new Error('LOCUS_API_KEY is not set in environment variables');
    }

    if (!process.env.OPENAI_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is not set in environment variables');
    }

    console.log('✓ MCP configured\n');

    const { result, mcpStatus } = await processQuery(prompt);

    console.log('\n🚀 Your Locus application is working!');
    console.log('\nNext steps:');
    console.log('  • Modify the prompt in index.ts to use Locus tools');
    console.log('  • Try asking Claude to use specific Locus tools');
    console.log('  • Explore MCP resources and capabilities\n');

    return {
      success: true,
      result: result,
      mcpStatus: {
        connected: mcpStatus?.status === 'connected',
        status: mcpStatus?.status
      }
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Error:', errorMessage);
    console.error('\nPlease check:');
    console.error('  • Your .env file contains valid credentials');
    console.error('  • Your network connection is active');
    console.error('  • Your Locus and Anthropic API keys are correct\n');

    return {
      success: false,
      error: errorMessage
    };
  }
}