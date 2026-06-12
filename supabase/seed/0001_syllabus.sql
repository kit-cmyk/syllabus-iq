-- Syllabus seed: 6 CPALE subjects + Table of Specifications topics.
-- Topic weights approximate the BOA Res. No. 30 s. 2022 TOS and sum to 100 per subject.
-- Adjust names/weights here (and re-run) when PRC publishes revisions — the app reads, never hardcodes.
-- Idempotent: safe to re-run.

insert into public.subjects (code, name, exam_item_count, exam_minutes, sort_order) values
  ('FAR',  'Financial Accounting & Reporting',           70, 180, 1),
  ('AFAR', 'Advanced Financial Accounting & Reporting',  70, 180, 2),
  ('MAS',  'Management Advisory Services',               70, 180, 3),
  ('AUD',  'Auditing',                                   70, 180, 4),
  ('TAX',  'Taxation',                                   70, 180, 5),
  ('RFBT', 'Regulatory Framework for Business Transactions', 100, 180, 6)
on conflict (code) do update set name = excluded.name,
  exam_item_count = excluded.exam_item_count, sort_order = excluded.sort_order;

with s as (select id, code from public.subjects)
insert into public.topics (subject_id, name, tos_weight, sort_order)
select s.id, t.name, t.w, t.ord from s join (values
  -- FAR
  ('FAR', 'Conceptual Framework & FS Presentation', 10, 1),
  ('FAR', 'Cash & Cash Equivalents', 6, 2),
  ('FAR', 'Receivables', 8, 3),
  ('FAR', 'Inventories', 8, 4),
  ('FAR', 'Property, Plant & Equipment', 12, 5),
  ('FAR', 'Intangibles & Investment Property', 7, 6),
  ('FAR', 'Investments in Debt & Equity Securities', 8, 7),
  ('FAR', 'Liabilities & Provisions', 10, 8),
  ('FAR', 'Leases', 6, 9),
  ('FAR', 'Employee Benefits & Income Taxes', 7, 10),
  ('FAR', 'Shareholders'' Equity & Share-Based Payment', 8, 11),
  ('FAR', 'Revenue Recognition (PFRS 15)', 6, 12),
  ('FAR', 'Cash Flows, Interim, Segment & Other Topics', 4, 13),
  -- AFAR
  ('AFAR', 'Partnership Accounting', 10, 1),
  ('AFAR', 'Corporate Liquidation', 5, 2),
  ('AFAR', 'Joint Arrangements', 6, 3),
  ('AFAR', 'Installment Sales & Long-Term Construction', 12, 4),
  ('AFAR', 'Franchise & Consignment', 6, 5),
  ('AFAR', 'Home Office & Branch Accounting', 7, 6),
  ('AFAR', 'Business Combinations', 12, 7),
  ('AFAR', 'Consolidated Financial Statements', 12, 8),
  ('AFAR', 'Foreign Currency Transactions & Translation', 8, 9),
  ('AFAR', 'Derivatives & Hedge Accounting', 6, 10),
  ('AFAR', 'Not-for-Profit & Government Accounting', 8, 11),
  ('AFAR', 'Cost Accounting Systems', 8, 12),
  -- MAS
  ('MAS', 'Management Accounting Basics & Cost Behavior', 10, 1),
  ('MAS', 'Cost-Volume-Profit Analysis', 12, 2),
  ('MAS', 'Standard Costing & Variance Analysis', 10, 3),
  ('MAS', 'Variable & Absorption Costing', 6, 4),
  ('MAS', 'Budgeting & Forecasting', 10, 5),
  ('MAS', 'Responsibility Accounting & Transfer Pricing', 8, 6),
  ('MAS', 'Relevant Costing & Short-Term Decisions', 12, 7),
  ('MAS', 'Capital Budgeting', 12, 8),
  ('MAS', 'Financial Statement Analysis', 8, 9),
  ('MAS', 'Working Capital Management', 6, 10),
  ('MAS', 'Economics & Strategy Concepts', 6, 11),
  -- AUD
  ('AUD', 'Framework, Standards & Professional Ethics', 12, 1),
  ('AUD', 'Audit Planning & Risk Assessment', 12, 2),
  ('AUD', 'Internal Control Consideration', 10, 3),
  ('AUD', 'Audit Evidence & Procedures', 12, 4),
  ('AUD', 'Audit Sampling', 6, 5),
  ('AUD', 'Auditing in an IT Environment', 8, 6),
  ('AUD', 'Substantive Tests: Cash, Receivables & Inventories', 12, 7),
  ('AUD', 'Substantive Tests: PPE, Investments & Intangibles', 8, 8),
  ('AUD', 'Substantive Tests: Liabilities & Equity', 8, 9),
  ('AUD', 'Completing the Audit', 6, 10),
  ('AUD', 'Audit Reports & Opinions', 6, 11),
  -- TAX
  ('TAX', 'General Principles of Taxation', 10, 1),
  ('TAX', 'Income Tax: Individuals', 14, 2),
  ('TAX', 'Income Tax: Corporations', 14, 3),
  ('TAX', 'Income Tax: Partnerships, Estates & Trusts', 6, 4),
  ('TAX', 'Gross Income, Deductions & Exemptions', 12, 5),
  ('TAX', 'Withholding Taxes & Compliance', 8, 6),
  ('TAX', 'Estate Tax', 10, 7),
  ('TAX', 'Donor''s Tax', 6, 8),
  ('TAX', 'VAT & Percentage Taxes', 12, 9),
  ('TAX', 'Tax Remedies & Local Taxation', 8, 10),
  -- RFBT
  ('RFBT', 'Law on Obligations', 14, 1),
  ('RFBT', 'Law on Contracts', 12, 2),
  ('RFBT', 'Sales', 8, 3),
  ('RFBT', 'Credit Transactions: Pledge, Mortgage & Guaranty', 8, 4),
  ('RFBT', 'Negotiable Instruments', 10, 5),
  ('RFBT', 'Partnership Law', 8, 6),
  ('RFBT', 'Revised Corporation Code', 14, 7),
  ('RFBT', 'Insurance Code', 6, 8),
  ('RFBT', 'Securities Regulation & Cooperatives', 6, 9),
  ('RFBT', 'Banking Laws, AMLA, PDIC & BP 22', 6, 10),
  ('RFBT', 'E-Commerce, Data Privacy, Consumer Protection & IP', 5, 11),
  ('RFBT', 'Insolvency (FRIA) & Other Regulatory Laws', 3, 12)
) as t(code, name, w, ord) on s.code = t.code
on conflict (subject_id, name) do update set tos_weight = excluded.tos_weight, sort_order = excluded.sort_order;
