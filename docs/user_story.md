# Assignment context

All acceptance criteria in this file (stories 3.1, 3.2, 3.3) are mine to deliver.
Some may already be implemented by teammates — verify against the codebase
rather than assuming either way.

**Rules:** These acceptance criteria are fixed. Do not reword, reinterpret, or
expand them. If an AC is ambiguous, ask me — don't pick a reading and proceed.
When implementing, work on only the AC I name in that request.

USER STORY 3.1 — Risk Reduction Recommendations

As a middle-aged Malaysian adult,
I want practical actions matched to the health priorities identified for me,
So that I know what I can realistically start doing rather than only being told what my risks are.

Acceptance Criteria 3.1.1 — Actions Linked to Priorities
Given the system has produced a prioritised set of health indicators for the user,
When the user views their recommendations,
Then each recommended action is explicitly linked to the indicator it addresses, and the recommendations follow the same priority order as the indicators.

Acceptance Criteria 3.1.2 — Practical and Achievable
Given a recommended action is displayed,
When the user views it,
Then the action is expressed as a specific, everyday behaviour the user can act on without specialist equipment, clinical supervision or significant cost.

Acceptance Criteria 3.1.3 — Scope Boundary
Given any recommendation is displayed,
When the user views it,
Then it contains no diagnosis, no medication or dosage guidance, and no treatment instruction, and states that it is educational and does not replace professional medical advice.

USER STORY 3.2 — AI Explanation Assistant

As a middle-aged Malaysian adult with no medical background,
I want to ask for a plain-language explanation of anything I don't understand,
So that I can make sense of my results without needing to look up medical terms elsewhere.

Acceptance Criteria 3.2.1 — Plain-Language Explanation on Request
Given a user is viewing an indicator, statistic or recommendation,
When the user requests an explanation of that item,
Then the system returns an explanation in everyday language, free of unexplained clinical terminology.

Acceptance Criteria 3.2.2 — Grounded in Displayed Content
Given a user has requested an explanation,
When the system responds,
Then the explanation refers to the content and data already presented to the user and does not introduce statistics or claims that are not part of the application's own data.

Acceptance Criteria 3.2.3 — Out-of-Scope Requests Declined
Given a user asks the assistant for a diagnosis, a medication or dosage recommendation, a treatment plan, or a prediction of their own outcome,
When the request is submitted,
Then the system declines to answer, states that it cannot provide medical advice, and directs the user to consult a qualified healthcare professional.

Acceptance Criteria 3.2.4 — Assistant Nature Disclosed
Given a user is interacting with the explanation assistant,
When the interaction begins,
Then the system discloses that responses are AI-generated, are educational only, and may contain errors.

USER STORY 3.3 — Full Report

As a middle-aged Malaysian adult,
I want to see everything from my session brought together in one report,
So that I can review my results as a whole and refer back to them or discuss them with my doctor or family.

Acceptance Criteria 3.3.1 — Consolidated Content
Given a user has completed their profile, received their insights and viewed their recommendations,
When the user opens the full report,
Then it presents, in a single view: the profile inputs provided, the prioritised indicators with their contributing factors, the national and mortality data context, and the recommended preventive actions.

Acceptance Criteria 3.3.2 — Attribution Retained
Given the report contains statistics drawn from national datasets,
When the user views the report,
Then each statistic retains its source and reference year as displayed elsewhere in the application.

Acceptance Criteria 3.3.3 — Consistency with Session
Given a user generates their report,
When the report is displayed,
Then its contents match the indicators and recommendations shown during the session, with no additional or contradictory content.

Acceptance Criteria 3.3.4 — Report Scope Statement
Given the report is displayed,
When the user views it,
Then it carries the educational-use statement and states that it is not a medical record, diagnosis or clinical assessment.