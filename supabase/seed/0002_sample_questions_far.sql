-- SAMPLE question bank: 26 FAR questions (2 per topic) so the full journey works end-to-end.
-- These are starter/demo items — replace and grow the bank via scripts/import-questions.mjs (PLAN.md Phase 1).
-- Idempotent-ish: skips insert if a question with the same stem already exists.

with t as (
  select tp.id, tp.name from public.topics tp
  join public.subjects s on s.id = tp.subject_id and s.code = 'FAR'
),
q(topic, stem, a, b, c, d, correct_index, explanation, difficulty) as (values
  ('Conceptual Framework & FS Presentation',
   'Under the Conceptual Framework, the two fundamental qualitative characteristics of useful financial information are:',
   'Comparability and verifiability','Relevance and faithful representation','Understandability and timeliness','Materiality and prudence',
   1,'Relevance and faithful representation are the fundamental qualitative characteristics. Comparability, verifiability, timeliness, and understandability are enhancing characteristics.',1),
  ('Conceptual Framework & FS Presentation',
   'An entity shall classify a liability as current when:',
   'It expects to settle it within its normal operating cycle','It is due more than 12 months after the reporting period but refinanced before the FS issue date','It has an unconditional right to defer settlement for at least 12 months','It arises from a long-term loan with no covenant breach',
   0,'PAS 1 classifies a liability as current when settlement is expected within the normal operating cycle, it is held for trading, it is due within 12 months, or there is no right at the reporting date to defer settlement beyond 12 months. Refinancing after the reporting date does not change classification.',2),

  ('Cash & Cash Equivalents',
   'Which of the following is included in "cash and cash equivalents"?',
   'A 1-year time deposit','A money market placement acquired 2 months before maturity','Equity securities held for trading','Postdated checks received from customers',
   1,'Cash equivalents are short-term, highly liquid investments acquired within 3 months of maturity. Equity securities have no maturity; postdated checks remain receivables; a 1-year time deposit is a short-term investment, not a cash equivalent.',1),
  ('Cash & Cash Equivalents',
   'In a bank reconciliation, deposits in transit are:',
   'Added to the bank balance','Deducted from the bank balance','Added to the book balance','Deducted from the book balance',
   0,'Deposits in transit have been recorded by the depositor but not yet by the bank, so they are added to the bank balance to arrive at the correct cash balance.',1),

  ('Receivables',
   'Under PFRS 9, trade receivables without a significant financing component are initially measured at:',
   'Fair value plus transaction costs','Present value of future cash flows','Transaction price','Net realizable value',
   2,'PFRS 9 provides a practical expedient: trade receivables without a significant financing component are measured at the transaction price under PFRS 15.',2),
  ('Receivables',
   'When accounts receivable are factored on a without-recourse basis, the transaction is accounted for as:',
   'A secured borrowing','A sale of receivables','A pledge of receivables','An assignment of receivables',
   1,'Without recourse, the risks and rewards (and control) transfer to the factor, so the receivables are derecognized and the transfer is treated as a sale.',2),

  ('Inventories',
   'Under PAS 2, inventories are measured at:',
   'Cost','Net realizable value','Lower of cost and net realizable value','Fair value less costs to sell',
   2,'PAS 2 requires the lower of cost and NRV. (Fair value less costs to sell applies to biological/agricultural produce under PAS 41, not PAS 2.)',1),
  ('Inventories',
   'In a period of rising prices, which cost formula produces the highest ending inventory?',
   'FIFO','Weighted average','Specific identification','Moving average',
   0,'FIFO assigns the oldest (cheapest) costs to cost of goods sold, leaving the newest (highest) costs in ending inventory when prices are rising.',1),

  ('Property, Plant & Equipment',
   'The cost of an item of PPE includes all of the following, except:',
   'Purchase price net of trade discounts','Costs of site preparation and installation','Initial estimate of dismantling and restoration costs','Costs of opening a new facility (grand opening)',
   3,'PAS 16 excludes costs of opening a new facility, introducing a product, and administration/general overhead from the cost of PPE.',1),
  ('Property, Plant & Equipment',
   'An asset has a cost of P1,000,000, residual value of P100,000, and a 5-year life. Under double-declining balance, depreciation for Year 1 is:',
   'P180,000','P200,000','P360,000','P400,000',
   3,'DDB rate = 2/5 = 40%. Year 1 depreciation = 40% × P1,000,000 = P400,000. Residual value is ignored in computing DDB depreciation (it only floors the carrying amount).',2),

  ('Intangibles & Investment Property',
   'Which of the following is expensed as incurred rather than recognized as an intangible asset?',
   'Purchased patent','Internally generated goodwill','Acquired franchise right','Purchased customer list',
   1,'PAS 38 prohibits recognizing internally generated goodwill (and internally generated brands, mastheads, customer lists) because cost cannot be measured reliably.',1),
  ('Intangibles & Investment Property',
   'Under the fair value model for investment property, changes in fair value are:',
   'Recognized in other comprehensive income','Recognized in profit or loss','Recognized directly in equity','Not recognized until disposal',
   1,'PAS 40 fair value model: gains or losses from fair value changes are recognized in profit or loss in the period they arise, with no depreciation recorded.',2),

  ('Investments in Debt & Equity Securities',
   'A debt investment held within a business model whose objective is to collect contractual cash flows, and whose cash flows are solely payments of principal and interest, is measured at:',
   'Fair value through profit or loss','Fair value through OCI','Amortized cost','Cost less impairment',
   2,'Hold-to-collect + SPPI cash flows = amortized cost under PFRS 9 (unless the fair value option is elected).',2),
  ('Investments in Debt & Equity Securities',
   'Dividends received on an equity investment designated at FVOCI are recognized in:',
   'Profit or loss','Other comprehensive income','Retained earnings directly','Investment account as a reduction',
   0,'Even for FVOCI equity investments, dividend income goes to profit or loss (unless the dividend clearly represents a recovery of cost).',2),

  ('Liabilities & Provisions',
   'A provision is recognized when:',
   'There is a possible obligation from past events','There is a present obligation, outflow is probable, and the amount can be estimated reliably','Management decides to incur future operating losses','A contingent asset becomes virtually certain',
   1,'PAS 37 requires (1) a present obligation from a past event, (2) probable outflow, and (3) reliable estimate. Future operating losses are never provided for.',1),
  ('Liabilities & Provisions',
   'Bonds with face value P5,000,000 were issued at 97 with bond issue costs of P50,000. The initial carrying amount of the bonds payable is:',
   'P5,000,000','P4,850,000','P4,800,000','P4,900,000',
   2,'Issue price = 97% × P5,000,000 = P4,850,000, less issue costs P50,000 = P4,800,000. Issue costs reduce the carrying amount under the effective interest method.',2),

  ('Leases',
   'Under PFRS 16, a lessee initially measures the right-of-use asset at:',
   'Fair value of the underlying asset','Cost, including the initial lease liability, prepaid rent, initial direct costs and restoration estimates','Present value of unguaranteed residual value','Undiscounted total lease payments',
   1,'The ROU asset = initial lease liability + payments made at/before commencement − incentives + initial direct costs + estimated dismantling/restoration costs.',2),
  ('Leases',
   'The lessee recognition exemptions under PFRS 16 apply to:',
   'Short-term leases and leases of low-value assets','All operating leases','Leases with variable payments only','Leases shorter than 24 months',
   0,'Lessees may elect not to recognize ROU assets/lease liabilities for leases of 12 months or less and leases of low-value assets, expensing payments instead.',1),

  ('Employee Benefits & Income Taxes',
   'Remeasurements of the net defined benefit liability (actuarial gains and losses) are recognized in:',
   'Profit or loss','Other comprehensive income, never reclassified to P/L','Other comprehensive income, reclassified to P/L on settlement','Retained earnings only on plan termination',
   1,'PAS 19 requires remeasurements in OCI; they are never reclassified to profit or loss (they may be transferred within equity).',2),
  ('Employee Benefits & Income Taxes',
   'A deductible temporary difference gives rise to:',
   'A deferred tax liability','A deferred tax asset','Current tax expense','No tax consequence',
   1,'Deductible temporary differences result in amounts deductible in future periods, producing a deferred tax asset (recognized to the extent recovery is probable).',1),

  ('Shareholders'' Equity & Share-Based Payment',
   'Share issuance costs are accounted for as:',
   'Expense in profit or loss','A deduction from share premium arising from the issuance','An intangible asset','A deduction from retained earnings always',
   1,'Transaction costs of an equity transaction are deducted from equity — first against related share premium; any excess against retained earnings.',2),
  ('Shareholders'' Equity & Share-Based Payment',
   'For equity-settled share-based payments to employees, compensation expense is measured at the:',
   'Fair value of the options at grant date','Fair value of the options at vesting date','Intrinsic value at exercise date','Par value of the shares promised',
   0,'PFRS 2 measures equity-settled employee awards at the grant-date fair value of the equity instruments, recognized over the vesting period.',2),

  ('Revenue Recognition (PFRS 15)',
   'The correct order of the five-step revenue model is:',
   'Identify contract → identify performance obligations → determine price → allocate price → recognize revenue','Identify contract → determine price → identify performance obligations → recognize revenue → allocate price','Determine price → identify contract → allocate price → identify obligations → recognize revenue','Identify obligations → identify contract → determine price → allocate price → recognize revenue',
   0,'PFRS 15: (1) identify the contract, (2) identify performance obligations, (3) determine the transaction price, (4) allocate it to the obligations, (5) recognize revenue when/as obligations are satisfied.',1),
  ('Revenue Recognition (PFRS 15)',
   'Revenue is recognized over time when:',
   'The seller retains legal title until full payment','The customer simultaneously receives and consumes the benefits as the entity performs','The contract price is collectible in installments','The goods are physically delivered',
   1,'Over-time recognition applies when the customer simultaneously receives/consumes benefits, the entity''s performance creates an asset the customer controls, or the asset has no alternative use with an enforceable right to payment.',2),

  ('Cash Flows, Interim, Segment & Other Topics',
   'Under PAS 7, interest paid by a non-financial entity may be classified as:',
   'Operating or financing activities','Operating or investing activities','Financing activities only','Investing activities only',
   0,'Interest paid may be classified as operating (because it enters profit or loss) or financing (as a cost of obtaining financing), applied consistently.',2),
  ('Cash Flows, Interim, Segment & Other Topics',
   'An operating segment is reportable when its revenue is at least:',
   '5% of combined revenue','10% of combined revenue (external and intersegment) of all segments','15% of external revenue','20% of total assets',
   1,'PFRS 8''s quantitative thresholds: 10% of combined revenue, 10% of the greater absolute profit/loss measure, or 10% of combined assets.',2)
)
insert into public.questions (topic_id, stem, choices, correct_index, explanation, difficulty)
select t.id, q.stem, jsonb_build_array(q.a, q.b, q.c, q.d), q.correct_index, q.explanation, q.difficulty
from q join t on t.name = q.topic
where not exists (select 1 from public.questions x where x.stem = q.stem);
