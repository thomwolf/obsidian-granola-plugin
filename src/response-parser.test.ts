import { describe, it, expect } from "vitest";
import { convertNextStepsTasks } from "./response-parser";

// Realistic Granola MCP summary fixture — free-form markdown with a "Next Steps" section.
// Mirrors what the `summary` field from the MCP API looks like.
const EXAMPLE_SUMMARY = `## Summary

Discussed roadmap priorities for Q2, reviewed open PRs, and aligned on the release timeline. Thomas walked the team through the new feature proposal.

## Key Decisions

- Release target confirmed for end of April
- Thomas will own the integration work
- Pierre to handle infrastructure changes

## Next Steps

- Thomas to finalize the API design doc by Friday
- Pierre to review the infra proposal
- Thomas and Marie to schedule a follow-up call
- Send updated timeline to stakeholders
- Thomas: confirm budget approval with finance
`;

const EXAMPLE_SUMMARY_MID_TITLE = `## Summary

Quick sync on ongoing projects.

## Discussion and Next Steps

- Thomas to open the tracking issue
- Everyone to review the RFC before Thursday
- Thomas will update the roadmap doc
`;

// Real note format: level-3 heading, multi-space bullets, full name "Thomas Wolf"
const REAL_NOTE_EXCERPT = `### Next Steps

-   Thomas Wolf: Send angel investor contact list
-   Thomas Wolf: Available for $10K (small rounds) or $100-200K (larger rounds) investment
-   Cheng-Wei Hu: Continue seed fundraising process
-   Cheng-Wei Hu: Provide access code "cw" for Thomas to try product
-   Thomas Wolf: Review pitch deck if needed
`;

describe("convertNextStepsTasks", () => {
	it("handles real Granola note format (level-3 heading, multi-space bullets, full name)", () => {
		const result = convertNextStepsTasks(REAL_NOTE_EXCERPT, "Thomas");

		expect(result).toContain("- [ ] Thomas Wolf: Send angel investor contact list");
		expect(result).toContain("- [ ] Thomas Wolf: Available for $10K");
		expect(result).toContain("- [ ] Thomas Wolf: Review pitch deck if needed");
		// "Thomas" mentioned in passing in a Cheng-Wei bullet — also matches (whole-word, acceptable)
		expect(result).toContain("- [ ] Cheng-Wei Hu: Provide access code");
		// Cheng-Wei-only bullet unchanged
		expect(result).toContain("-   Cheng-Wei Hu: Continue seed fundraising process");
	});


	it("converts bullets mentioning Thomas to task checkboxes", () => {
		const result = convertNextStepsTasks(EXAMPLE_SUMMARY, "Thomas");

		expect(result).toContain("- [ ] Thomas to finalize the API design doc by Friday");
		expect(result).toContain("- [ ] Thomas and Marie to schedule a follow-up call");
		expect(result).toContain("- [ ] Thomas: confirm budget approval with finance");
	});

	it("leaves bullets not mentioning Thomas unchanged", () => {
		const result = convertNextStepsTasks(EXAMPLE_SUMMARY, "Thomas");

		expect(result).toContain("- Pierre to review the infra proposal");
		expect(result).toContain("- Send updated timeline to stakeholders");
	});

	it("does not affect content outside the Next Steps section", () => {
		const result = convertNextStepsTasks(EXAMPLE_SUMMARY, "Thomas");

		// Bullet in Key Decisions section — should NOT become a task
		expect(result).toContain("- Thomas will own the integration work");
		// Regular paragraph mention — should be untouched
		expect(result).toContain("Thomas walked the team through the new feature proposal.");
	});

	it("matches 'Next Steps' anywhere in the heading, not just at the start", () => {
		const result = convertNextStepsTasks(EXAMPLE_SUMMARY_MID_TITLE, "Thomas");

		expect(result).toContain("- [ ] Thomas to open the tracking issue");
		expect(result).toContain("- [ ] Thomas will update the roadmap doc");
		expect(result).toContain("- Everyone to review the RFC before Thursday");
	});

	it("is case-insensitive for the owner name", () => {
		const result = convertNextStepsTasks(EXAMPLE_SUMMARY, "thomas");

		expect(result).toContain("- [ ] Thomas to finalize the API design doc by Friday");
	});

	it("is idempotent — does not double-convert already-task lines", () => {
		const once = convertNextStepsTasks(EXAMPLE_SUMMARY, "Thomas");
		const twice = convertNextStepsTasks(once, "Thomas");

		expect(once).toEqual(twice);
	});

	it("does not convert lines already marked as completed tasks", () => {
		const input = `## Next Steps\n- [x] Thomas already did this\n`;
		const result = convertNextStepsTasks(input, "Thomas");

		expect(result).toContain("- [x] Thomas already did this");
		expect(result).not.toContain("- [ ] - [x]");
	});

	it("returns content unchanged when ownerName is empty", () => {
		const result = convertNextStepsTasks(EXAMPLE_SUMMARY, "");

		expect(result).toEqual(EXAMPLE_SUMMARY);
	});

	it("returns content unchanged when ownerName is not present in Next Steps", () => {
		const result = convertNextStepsTasks(EXAMPLE_SUMMARY, "Alice");

		expect(result).toEqual(EXAMPLE_SUMMARY);
	});

	it("does not match partial name (whole-word only)", () => {
		const input = `## Next Steps\n- Thomaston to do something\n`;
		const result = convertNextStepsTasks(input, "Thomas");

		// "Thomaston" should NOT match \bThomas\b
		expect(result).toContain("- Thomaston to do something");
		expect(result).not.toContain("- [ ]");
	});
});
