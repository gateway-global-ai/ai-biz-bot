import { salesFunnelsArraySchema } from "@shared/conversationWorkflow";

export function parseSalesFunnelsArray(input: unknown) {
  return salesFunnelsArraySchema.safeParse(input);
}
