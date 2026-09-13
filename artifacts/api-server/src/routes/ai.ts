import { Router, type IRouter } from "express";
import OpenAI from "openai";
import { DraftManagementActionBody, DraftManagementActionResponse } from "@workspace/api-zod";
import { logger } from "../lib/logger";

const router: IRouter = Router();

/**
 * AI-assisted drafting for the "Propose Action" form. A human still types
 * a one-line request ("we need to reprioritize the export button work");
 * this turns it into structured fields (actionType/target/description/
 * priority) they can review and edit before submitting — it never creates
 * the action itself. Requires `OPENAI_API_KEY`; the button that calls this
 * degrades to a config-needed message when unset, nothing else in the app
 * depends on it.
 */

const MODEL = "gpt-5-mini";

const SYSTEM_PROMPT = `You turn a one-line project-management request into a structured draft. Reply with strict JSON only, matching this shape:
{"actionType": "feature_request" | "create_task" | "update_priority" | "reassign_owner" | "change_deadline" | "close_task" | "create_milestone" | "update_scope", "target": string, "description": string, "priority": "low" | "medium" | "high" | "urgent"}
"target" is a short ticket/milestone-style title, at most 80 characters. "description" is 1-3 sentences explaining why the action is needed, written for a human approver. Infer "actionType" and "priority" from context; if genuinely unclear, use "create_task" and "medium".`;

router.post("/management-actions/ai-draft", async (req, res) => {
  const parsed = DraftManagementActionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid request." });
    return;
  }

  const apiKey = process.env["OPENAI_API_KEY"];
  if (!apiKey) {
    res.status(502).json({ error: "OPENAI_API_KEY is not configured on this app." });
    return;
  }

  try {
    const openai = new OpenAI({ apiKey });
    const completion = await openai.chat.completions.create({
      model: MODEL,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: parsed.data.prompt },
      ],
    });
    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      throw new Error("The model returned an empty response.");
    }
    res.json(DraftManagementActionResponse.parse(JSON.parse(raw)));
  } catch (err) {
    logger.error({ err }, "AI action drafting failed");
    res.status(502).json({ error: err instanceof Error ? err.message : "AI drafting failed." });
  }
});

export default router;
