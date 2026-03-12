/** Base error for all eval-engine failures. */
export class EvalError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = "EvalError";
  }
}

/** Judge timed out waiting for LLM response. */
export class JudgeTimeout extends EvalError {
  constructor(
    public readonly model: string,
    public readonly timeoutMs: number,
  ) {
    super(
      `Judge timed out after ${timeoutMs}ms waiting for ${model}`,
      "JUDGE_TIMEOUT",
    );
    this.name = "JudgeTimeout";
  }
}

/** LLM returned a response that could not be parsed as structured JSON. */
export class MalformedJudgeResponse extends EvalError {
  public readonly rawResponse: string;

  constructor(rawResponse: string, parseError: string) {
    super(
      `Malformed judge response: ${parseError}`,
      "MALFORMED_JUDGE_RESPONSE",
    );
    this.name = "MalformedJudgeResponse";
    this.rawResponse = rawResponse;
  }
}

/** LLM API returned a non-2xx status. */
export class LLMApiError extends EvalError {
  constructor(
    public readonly status: number,
    public readonly body: string,
    public readonly model: string,
  ) {
    super(
      `LLM API error (${status}) for ${model}: ${body.slice(0, 200)}`,
      "LLM_API_ERROR",
    );
    this.name = "LLMApiError";
  }
}

/** SpecDoc validation failed schema checks. */
export class SpecValidationError extends EvalError {
  constructor(
    public readonly validationErrors: string[],
  ) {
    super(
      `SpecDoc validation failed: ${validationErrors.join("; ")}`,
      "SPEC_VALIDATION_ERROR",
    );
    this.name = "SpecValidationError";
  }
}
