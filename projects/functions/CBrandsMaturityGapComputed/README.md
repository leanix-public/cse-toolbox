# Azure function: CBrandsMaturityGapComputed

## Description

### Customer
Constellation Brands

### UseCase
The user wants to compute the difference (maturityGap) between two single-select fields,
targetMaturity and currentMaturity, set for BusinessCapability factsheet type. The maturityGap is computed as an integer resulting from the absolute difference between the array indexes of targetMaturity and currentMaturity values. If any of targetMaturity or currentMaturity is null, then maturityGap becomes null as well.

| Value      | Index |
| ---------- | ----- |
| adhoc      | 0     |
| repeatable | 1     |
| defined    | 2     |
| managed    | 3     |
| optimized  | 4     |

E.g.:
1. targetMaturity = 'defined' and currentMaturity = 'adhoc', maturityGap = | 2 - 0 | = 2
2. targetMaturity = 'repeatable' and currentMaturity = 'defined', maturityGap = | 1 - 2 | = 1

## Requirements

### Data model
The three following fields must be added to the **Business Capability** data model:

| Key             | Type          | inFacet | inView | Values                                                     |
| --------------- | ------------- | ------- | ------ | ---------------------------------------------------------- |
| targetMaturity  | SINGLE_SELECT | true    | true   | ["adhoc", "repeatable", "defined", "managed", "optimized"] |
| currentMaturity | SINGLE_SELECT | true    | true   | ["adhoc", "repeatable", "defined", "managed", "optimized"] |
| maturityGap     | SINGLE_SELECT | true    | true   | ["aligned", "low", "medium", "large", "max"]               |


## References

### Target workspace
https://cbrands.leanix.net/ConstellationBrands (US)


### Tickets
https://leanix.zendesk.com/agent/tickets/64895
https://leanix.atlassian.net/browse/CSES-2403


