import {
  McpServer,
  type CallToolResult,
  type TextContent,
  type ToolAnnotations,
  type ToolCallback,
} from '@modelcontextprotocol/server';
import { z } from 'zod';
import type { BringService } from './bringClient.js';

type ToolInputSchema = z.ZodObject<z.ZodRawShape>;
type ToolOutputSchema = z.ZodType;

export type RegisterToolOptions<TInput extends ToolInputSchema, TOutput extends ToolOutputSchema> = {
  server: McpServer;
  bc: BringService;
  name: string;
  title: string;
  description: string;
  inputSchema: TInput;
  outputSchema: TOutput;
  actionFn: (args: z.output<TInput>, bc: BringService) => Promise<z.output<TOutput>>;
  failureMessage: string;
  annotations: ToolAnnotations;
  formatText?: (result: z.output<TOutput>) => string;
};

function textContent(text: string): TextContent[] {
  return [{ type: 'text', text }];
}

export function registerTool<TInput extends ToolInputSchema, TOutput extends ToolOutputSchema>(
  options: RegisterToolOptions<TInput, TOutput>,
): void {
  const {
    server,
    bc,
    name,
    title,
    description,
    inputSchema,
    outputSchema,
    actionFn,
    failureMessage,
    annotations,
    formatText,
  } = options;

  const callback = async (args: z.output<TInput>): Promise<CallToolResult> => {
    try {
      const result = await actionFn(args, bc);
      const serialized = formatText ? formatText(result) : JSON.stringify(result, null, 2);
      return {
        content: textContent(serialized ?? 'null'),
        structuredContent: result,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`${failureMessage}:`, error);
      return {
        content: textContent(`${failureMessage}: ${errorMessage}`),
        isError: true,
      };
    }
  };

  server.registerTool<TOutput, TInput>(
    name,
    {
      title,
      description,
      inputSchema,
      outputSchema,
      annotations,
    },
    callback as ToolCallback<TInput>,
  );
}
