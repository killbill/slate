# Aviate Revenue Recognition

The Aviate plugin can recognize the revenue of your invoices over the service period they cover. When an invoice is committed, Aviate creates a revenue schedule for each of its revenue lines and splits the schedule into installments (revenue entries). Recognition runs then move these installments from deferred to recognized revenue, one calendar month (accounting period) at a time. This section documents the revenue recognition APIs exposed by the Aviate plugin.

## Before You Begin

### Authentication

The Aviate Plugin uses a JWT based authentication mechanism. Thus, all the APIs listed in this document require a valid token. This can be obtained via the [Auth API](aviate-auth.html).

When role-based access control is turned on (`com.killbill.billing.plugin.aviate.auth.rbac.enabled=true`, `false` by default), the `GET` endpoints below require one of the `viewer`, `reader`, `operator`, `billing_admin`, `finance_admin`, `finance_vp`, `system_admin`, `admin` or `super_admin` roles (a token without roles counts as `viewer`), while the `POST` and `DELETE` endpoints require one of the `finance_admin`, `finance_vp`, `system_admin`, `admin` or `super_admin` roles.

### Tenancy

Each endpoint requires the standard Kill Bill `X-Killbill-ApiKey` and `X-Killbill-ApiSecret` headers, which identify the tenant. Revenue schedules, accounting periods, standalone selling prices and contract allocations all belong to a tenant: accounting periods in particular are shared by all the accounts of the tenant.

The endpoints that change data use the optional `X-Killbill-CreatedBy` header (`admin` by default) as the name of the user making the change. For example, it is saved as `closedBy` when a period is closed, and as `createdBy` on standalone selling prices and contract allocations.

## Resources

This section lists the models used by the Aviate revenue recognition APIs.

### RevenueSchedule

The revenue of one invoice line, recognized over its service period.

| Name | Type | Description |
|------|------|-------------|
| `revenueScheduleId` | `string` | Unique identifier of the schedule (a number, as a string) |
| `invoiceId` | `string` (UUID) | Invoice of the line |
| `invoiceItemId` | `string` (UUID) | Invoice line (item) |
| `accountId` | `string` (UUID) | Account of the invoice |
| `subscriptionId` | `string` (UUID) | Subscription of the line; empty when the line has none |
| `bundleId` | `string` (UUID) | Bundle of the line; empty when the line has none |
| `planName` | `string` | Plan of the line; empty when the line has none |
| `phaseName` | `string` | Phase of the line; empty when the line has none |
| `invoiceItemType` | `string` | Type of the line: `RECURRING`, `USAGE`, `FIXED` or `EXTERNAL_CHARGE` |
| `invoiceItemDescription` | `string` | Description of the line |
| `totalAmount` | `string` | Amount to recognize: the line amount, or the amount allocated to its contract term |
| `recognizedAmount` | `string` | Amount recognized so far |
| `deferredAmount` | `string` | Amount not recognized yet (set to 0 when the schedule is adjusted) |
| `currency` | `string` | Currency of the line |
| `recognitionRule` | `string` | `REVENUE_RECOGNITION_RULE_STRAIGHT_LINE` or `REVENUE_RECOGNITION_RULE_IMMEDIATE` (`REVENUE_RECOGNITION_RULE_UNKNOWN` for an unknown stored value) |
| `servicePeriodStartDate` | `string` (date) | Start of the service period |
| `servicePeriodEndDate` | `string` (date) | End of the service period: the first day not served |
| `invoiceDate` | `string` (date) | Date of the invoice |
| `isClosed` | `boolean` | Whether the schedule is closed (fully recognized, or adjusted) |
| `closedDate` | `string` (date-time) | When the schedule was closed; empty when it is open |

---

### RevenueEntry

One installment of a revenue schedule, or a reversal.

| Name | Type | Description |
|------|------|-------------|
| `revenueEntryId` | `string` | Unique identifier of the entry (a number, as a string) |
| `revenueScheduleId` | `string` | Schedule of the entry |
| `recognitionDate` | `string` (date) | Date of the entry |
| `amount` | `string` | Amount of the entry; negative for a reversal |
| `entryType` | `string` | `REVENUE_ENTRY_TYPE_RECOGNITION` (an installment) or `REVENUE_ENTRY_TYPE_REVERSAL` (from an adjustment or a credit) |
| `description` | `string` | For example `Day 1 of 31`, `Month 1 of 2`, `Immediate recognition`, or the adjustment or credit it reverses |
| `isRecognized` | `boolean` | Whether the entry is recognized |
| `recognizedDate` | `string` (date) | Date of the run that recognized the entry; empty when not recognized |
| `accountingPeriod` | `string` | Accounting period of the entry (`yyyy-MM`); empty for reversal entries, which belong to the period of the month of their date |
| `isPeriodClosed` | `boolean` | Whether the entry is closed: by a period close, or by an adjustment of its schedule |

---

### AccountingPeriod

| Name | Type | Description |
|------|------|-------------|
| `periodName` | `string` | Name of the period (`yyyy-MM`) |
| `startDate` | `string` (date) | First day of the period |
| `endDate` | `string` (date) | Last day of the period |
| `closed` | `boolean` | Whether the period is closed |
| `closedDate` | `string` (date-time) | When the period was closed; `null` when it is open |
| `closedBy` | `string` | Who closed the period; `null` when it is open |
| `tenantId` | `string` (UUID) | Tenant of the period |

---

### AccountingPeriodSummary

| Name | Type | Description |
|------|------|-------------|
| `accountingPeriod` | `string` | Name of the period |
| `recognizedAmount` | `number` | Total of the recognized entries of the period |
| `deferredAmount` | `number` | Total of the entries of the period not recognized yet |
| `entryCount` | `integer` | Number of entries of the period |
| `unrecognizedCount` | `integer` | Number of entries of the period not recognized yet: the entries that block a close without `force` |

The amounts and `entryCount` cover the entries saved with the period. `unrecognizedCount` also counts the reversal entries of a standalone credit dated in the period.

---

### AccountingPeriodCurrencySummary

The `AccountingPeriodSummary` of one currency of a period: the same fields, plus `currency` (`string`). The `unrecognizedCount` of all the currencies add up to the `unrecognizedCount` of the period. A currency whose only entries in the period are reversal entries of a standalone credit has a row with zero amounts.

---

### CurrencyPeriodSummary

One row of the revenue waterfall.

| Name | Type | Description |
|------|------|-------------|
| `accountingPeriod` | `string` | Accounting period of the entries |
| `currency` | `string` | Currency of the entries |
| `recognizedAmount` | `number` | Total of the recognized entries |
| `deferredAmount` | `number` | Total of the entries not recognized yet |
| `entryCount` | `integer` | Number of entries |

---

### DeferredBalanceEntry

| Name | Type | Description |
|------|------|-------------|
| `currency` | `string` | Currency |
| `totalDeferred` | `number` | Total deferred amount of the open schedules in this currency |
| `scheduleCount` | `integer` | Number of open schedules in this currency |

---

### SspEntry

A standalone selling price (SSP).

| Name | Type | Description |
|------|------|-------------|
| `id` | `string` (UUID) | Unique identifier of the SSP |
| `planName` | `string` | Plan |
| `phaseName` | `string` | Phase |
| `currency` | `string` | Currency |
| `sspAmount` | `number` | Standalone selling price |
| `effectiveDate` | `string` (date) | First day the SSP applies |
| `expirationDate` | `string` (date) | Last day the SSP applies; `null` when it does not expire |
| `source` | `string` | Source of the SSP, `LIST_PRICE` by default. `RESIDUAL` selects the residual allocation method. |
| `createdBy` | `string` | Who created the SSP |
| `createdDate` | `string` (date-time) | When the SSP was created |
| `accountId` | `string` (UUID) | Always `null` when created through the API |
| `tenantId` | `string` (UUID) | Tenant of the SSP |

---

### ContractAllocationEntry

The revenue allocated to one term of a contract.

| Name | Type | Description |
|------|------|-------------|
| `id` | `string` (UUID) | Unique identifier of the allocation |
| `contractId` | `string` (UUID) | Contract |
| `contractTermId` | `string` (UUID) | Contract term |
| `planName` | `string` | Plan of the term |
| `phaseName` | `string` | Phase used to look up the SSP of the term (see [Allocate a Contract](#allocate-a-contract)) |
| `listPrice` | `number` | List price of the term |
| `sspAmount` | `number` | SSP of the term, or the fallback value when the term has no SSP |
| `sspRatio` | `number` | Share of the term. Proportional allocation: its SSP divided by the total SSP of the terms. Residual allocation: its SSP (`RELATIVE_SSP` terms) or its allocated amount (`RESIDUAL` terms) divided by the transaction price. |
| `allocatedAmount` | `number` | Revenue allocated to the term |
| `transactionPrice` | `number` | Transaction price of the whole contract |
| `currency` | `string` | Currency |
| `allocationMethod` | `string` | `RELATIVE_SSP` or `RESIDUAL` |
| `createdBy` | `string` | Who created the allocation |
| `createdDate` | `string` (date-time) | When the allocation was created |
| `accountId` | `string` (UUID) | Always `null` when created through the API |
| `tenantId` | `string` (UUID) | Tenant of the allocation |

---

### ContractAllocationSummary

| Name | Type | Description |
|------|------|-------------|
| `contractId` | `string` (UUID) | Contract |
| `allocationCount` | `integer` | Number of allocated terms |
| `totalAllocated` | `number` | Total allocated amount |
| `totalTransactionPrice` | `number` | Sum of the `transactionPrice` of the allocations of the contract. Each allocation holds the transaction price of the whole contract, so this is the transaction price multiplied by `allocationCount`. |
| `currency` | `string` | Currency of the allocations (the first one alphabetically if they differ) |

---

### RevenueByPlanEntry

| Name | Type | Description |
|------|------|-------------|
| `planName` | `string` | Plan; empty for lines without a plan (for example external charges) |
| `currency` | `string` | Currency |
| `totalAmount` | `number` | Total amount |
| `recognizedAmount` | `number` | Recognized amount |
| `deferredAmount` | `number` | Deferred amount |
| `scheduleCount` | `integer` | Number of schedules for this plan in this currency |
| `accounts` | `integer` | Number of distinct accounts with such a schedule |
| `subscriptions` | `integer` | Number of distinct subscriptions with such a schedule |

---

### RecognitionRateEntry

| Name | Type | Description |
|------|------|-------------|
| `recognitionRule` | `string` | Recognition rule of the schedules |
| `currency` | `string` | Currency |
| `totalAmount` | `number` | Total amount of the schedules |
| `recognizedAmount` | `number` | Recognized amount of the schedules |
| `deferredAmount` | `number` | Deferred amount of the schedules |
| `recognitionRate` | `number` | `recognizedAmount` divided by `totalAmount`, 4 decimal places (`0` when the total is zero) |
| `avgRecognitionPercent` | `number` | `recognitionRate` as a percentage, 2 decimal places |
| `scheduleCount` | `integer` | Number of schedules |
| `avgDaysSinceInvoice` | `integer` | Average number of days from the invoice date to the as-of date, over the schedules invoiced on or before the as-of date |

---

### AccountLedgerEntry

One row of the transaction ledger of an account: a revenue schedule or one of its reversal entries.

| Name | Type | Description |
|------|------|-------------|
| `createDate` | `string` (date) | Invoice date of a schedule, or date of a reversal entry |
| `startDate` | `string` (date) | Service period start of the schedule |
| `endDate` | `string` (date) | Service period end of the schedule |
| `credit` | `string` | Amount of a reversal entry (or of a negative schedule); `"0"` otherwise |
| `debit` | `string` | Total amount of a schedule; `"0"` otherwise |
| `balance` | `string` | Running total of the rows so far in this currency |
| `currency` | `string` | Currency of the schedule |
| `planName` | `string` | Plan of the schedule |
| `invoiceItemType` | `string` | Line type of a schedule, or `REVERSAL` |
| `invoiceItemDescription` | `string` | Description of the line, or of the reversal entry |
| `subscriptionExternalKey` | `string` | External key of the subscription of the schedule; `null` when it has none |
| `invoiceId` | `string` (UUID) | Invoice of the schedule |

---

### AccountRevenueByPlan

One revenue schedule of an account, with the number of its entries.

| Name | Type | Description |
|------|------|-------------|
| `planName` | `string` | Plan |
| `phaseName` | `string` | Phase |
| `totalAmount` | `string` | Total amount of the schedule |
| `recognizedAmount` | `string` | Recognized amount |
| `deferredAmount` | `string` | Deferred amount, as stored on the schedule |
| `currency` | `string` | Currency |
| `serviceStartDate` | `string` (date) | Service period start |
| `serviceEndDate` | `string` (date) | Service period end |
| `invoiceDate` | `string` (date) | Invoice date |
| `recognitionRule` | `string` | Recognition rule |
| `totalEntries` | `integer` | Number of entries of the schedule, reversal entries included |
| `recognizedEntries` | `integer` | Number of recognized entries |
| `pendingEntries` | `integer` | Number of entries neither recognized nor closed |
| `scheduleId` | `string` | Identifier of the schedule |

The entry counts show the stored state: a later run may still recognize entries closed by an adjustment (those before the new service end), and entries of a closed period are not counted as pending.

## Revenue Schedule APIs

### Get the Revenue Schedule of an Invoice Item

Returns the revenue schedule of an invoice line.

**HTTP Request**

`GET /plugins/aviate-plugin/v1/revenue/{itemId}/schedule`

> Example Request:

```shell
curl -X GET \
     -H "Authorization: Bearer ${ID_TOKEN}" \
     -H 'X-Killbill-ApiKey: bob' \
     -H 'X-Killbill-ApiSecret: lazar' \
     'http://127.0.0.1:8080/plugins/aviate-plugin/v1/revenue/0c9f7a3e-5d1b-4c58-8b6a-0e3b8d0e7f21/schedule'
```

```java
```

```ruby
```

```python
```

````php
````

````javascript
````

> Example Response:

```json
{
  "revenueScheduleId": "12",
  "invoiceId": "903e55d3-8072-47f1-80fc-32857dbdbcc5",
  "invoiceItemId": "0c9f7a3e-5d1b-4c58-8b6a-0e3b8d0e7f21",
  "accountId": "2ad52f53-85ae-408a-9879-32a7e59dd03d",
  "subscriptionId": "4e4c2f9b-77a1-4c3c-a8a2-6f9d3e1b5c10",
  "bundleId": "7b1e9d2c-3f4a-4e5b-9c6d-8a7b6c5d4e3f",
  "planName": "pistol-monthly",
  "phaseName": "pistol-monthly-evergreen",
  "invoiceItemType": "RECURRING",
  "invoiceItemDescription": "pistol-monthly-evergreen",
  "totalAmount": "29.950000000",
  "recognizedAmount": "16.424193544",
  "deferredAmount": "13.525806456",
  "currency": "USD",
  "recognitionRule": "REVENUE_RECOGNITION_RULE_STRAIGHT_LINE",
  "servicePeriodStartDate": "2026-01-15",
  "servicePeriodEndDate": "2026-02-15",
  "invoiceDate": "2026-01-15",
  "isClosed": false,
  "closedDate": ""
}
```

**Query Parameters**

None.

**Response**

If successful, returns a status code of 200 and a `RevenueSchedule` object. Returns 404 if the invoice item has no revenue schedule.

### Regenerate a Revenue Schedule

Creates the revenue schedule of an invoice line when it is missing (for example, because an entry would have fallen in a closed accounting period when the invoice was committed), the same way as when the invoice is committed. If the line has a schedule without entries, its entries are created. A schedule that already has entries is returned unchanged, so calling this again for the same line changes nothing.

Adjustments and credits that were not applied while the line had no schedule are not applied.

**HTTP Request**

`POST /plugins/aviate-plugin/v1/revenue/{itemId}/schedule/regenerate`

> Example Request:

```shell
curl -X POST \
     -H "Authorization: Bearer ${ID_TOKEN}" \
     -H 'X-Killbill-ApiKey: bob' \
     -H 'X-Killbill-ApiSecret: lazar' \
     -H 'X-Killbill-CreatedBy: demo' \
     -H 'Content-Type: application/json' \
     -d '{}' \
     'http://127.0.0.1:8080/plugins/aviate-plugin/v1/revenue/0c9f7a3e-5d1b-4c58-8b6a-0e3b8d0e7f21/schedule/regenerate'
```

```java
```

```ruby
```

```python
```

````php
````

````javascript
````

> Example Response:

```json
{
  "revenueScheduleId": "12",
  "invoiceId": "903e55d3-8072-47f1-80fc-32857dbdbcc5",
  "invoiceItemId": "0c9f7a3e-5d1b-4c58-8b6a-0e3b8d0e7f21",
  "accountId": "2ad52f53-85ae-408a-9879-32a7e59dd03d",
  "subscriptionId": "4e4c2f9b-77a1-4c3c-a8a2-6f9d3e1b5c10",
  "bundleId": "7b1e9d2c-3f4a-4e5b-9c6d-8a7b6c5d4e3f",
  "planName": "pistol-monthly",
  "phaseName": "pistol-monthly-evergreen",
  "invoiceItemType": "RECURRING",
  "invoiceItemDescription": "pistol-monthly-evergreen",
  "totalAmount": "29.950000000",
  "recognizedAmount": "0.000000000",
  "deferredAmount": "29.950000000",
  "currency": "USD",
  "recognitionRule": "REVENUE_RECOGNITION_RULE_STRAIGHT_LINE",
  "servicePeriodStartDate": "2026-01-15",
  "servicePeriodEndDate": "2026-02-15",
  "invoiceDate": "2026-01-15",
  "isClosed": false,
  "closedDate": ""
}
```

**Query Parameters**

None.

**Response**

If successful, returns a status code of 200 and the `RevenueSchedule` of the line (created, completed or already complete). Otherwise:

| Status | Reason |
|--------|--------|
| 400 | The invoice of the line is not `COMMITTED`, or the line is not a revenue line (`RECURRING`, `USAGE`, `FIXED` or `EXTERNAL_CHARGE` with a positive amount) |
| 404 | Invoice item not found |
| 409 | An entry of the schedule would fall in a closed accounting period: nothing is saved |
| 500 | The revenue allocation of the line's contract failed |

### Get the Entries of a Revenue Schedule

Returns the revenue entries of a schedule, in creation order.

**HTTP Request**

`GET /plugins/aviate-plugin/v1/revenue/{scheduleId}/entriesPerSchedule`

> Example Request:

```shell
curl -X GET \
     -H "Authorization: Bearer ${ID_TOKEN}" \
     -H 'X-Killbill-ApiKey: bob' \
     -H 'X-Killbill-ApiSecret: lazar' \
     'http://127.0.0.1:8080/plugins/aviate-plugin/v1/revenue/12/entriesPerSchedule'
```

```java
```

```ruby
```

```python
```

````php
````

````javascript
````

> Example Response (tenant with `MONTHLY` installments, after the run of period `2026-01`):

```json
[
  {
    "revenueEntryId": "101",
    "revenueScheduleId": "12",
    "recognitionDate": "2026-01-31",
    "amount": "16.424193544",
    "entryType": "REVENUE_ENTRY_TYPE_RECOGNITION",
    "description": "Month 1 of 2",
    "isRecognized": true,
    "recognizedDate": "2026-01-31",
    "accountingPeriod": "2026-01",
    "isPeriodClosed": false
  },
  {
    "revenueEntryId": "102",
    "revenueScheduleId": "12",
    "recognitionDate": "2026-02-14",
    "amount": "13.525806456",
    "entryType": "REVENUE_ENTRY_TYPE_RECOGNITION",
    "description": "Month 2 of 2",
    "isRecognized": false,
    "recognizedDate": "",
    "accountingPeriod": "2026-02",
    "isPeriodClosed": false
  }
]
```

**Query Parameters**

None.

**Response**

If successful, returns a status code of 200 and a list of `RevenueEntry` objects. An unknown schedule returns an empty list.

### List Revenue Schedules

Returns the revenue schedules of the tenant, most recent first, filtered by the given criteria.

**HTTP Request**

`GET /plugins/aviate-plugin/v1/revenue/schedules`

> Example Request:

```shell
curl -X GET \
     -H "Authorization: Bearer ${ID_TOKEN}" \
     -H 'X-Killbill-ApiKey: bob' \
     -H 'X-Killbill-ApiSecret: lazar' \
     'http://127.0.0.1:8080/plugins/aviate-plugin/v1/revenue/schedules?accountId=2ad52f53-85ae-408a-9879-32a7e59dd03d&closed=false&limit=50'
```

```java
```

```ruby
```

```python
```

````php
````

````javascript
````

> Example Response:

```json
[
  {
    "revenueScheduleId": "12",
    "invoiceId": "903e55d3-8072-47f1-80fc-32857dbdbcc5",
    "invoiceItemId": "0c9f7a3e-5d1b-4c58-8b6a-0e3b8d0e7f21",
    "accountId": "2ad52f53-85ae-408a-9879-32a7e59dd03d",
    "subscriptionId": "4e4c2f9b-77a1-4c3c-a8a2-6f9d3e1b5c10",
    "bundleId": "7b1e9d2c-3f4a-4e5b-9c6d-8a7b6c5d4e3f",
    "planName": "pistol-monthly",
    "phaseName": "pistol-monthly-evergreen",
    "invoiceItemType": "RECURRING",
    "invoiceItemDescription": "pistol-monthly-evergreen",
    "totalAmount": "29.950000000",
    "recognizedAmount": "16.424193544",
    "deferredAmount": "13.525806456",
    "currency": "USD",
    "recognitionRule": "REVENUE_RECOGNITION_RULE_STRAIGHT_LINE",
    "servicePeriodStartDate": "2026-01-15",
    "servicePeriodEndDate": "2026-02-15",
    "invoiceDate": "2026-01-15",
    "isClosed": false,
    "closedDate": ""
  }
]
```

**Query Parameters**

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| **accountId** | UUID | false | none | Only the schedules of this account |
| **subscriptionId** | UUID | false | none | Only the schedules of this subscription |
| **planName** | string | false | none | Only the schedules of this plan |
| **withoutPlan** | boolean | false | false | Only the schedules of lines without a plan (for example external charges). Cannot be used with a non-empty `planName`. |
| **closed** | boolean | false | none | Only the closed (`true`) or open (`false`) schedules |
| **currency** | string | false | none | Only the schedules in this currency |
| **servicePeriodStart** | string (date) | false | none | Only the schedules whose service period starts on or after this date (`yyyy-MM-dd`) |
| **offset** | integer | false | 0 | Number of schedules to skip |
| **limit** | integer | false | 1000 | Maximum number of schedules to return (at most 1000) |

**Response**

If successful, returns a status code of 200 and a list of `RevenueSchedule` objects. Returns 400 if `planName` and `withoutPlan=true` are used together.

### Get a Revenue Schedule

Returns a revenue schedule by its identifier.

**HTTP Request**

`GET /plugins/aviate-plugin/v1/revenue/schedules/{scheduleId}`

> Example Request:

```shell
curl -X GET \
     -H "Authorization: Bearer ${ID_TOKEN}" \
     -H 'X-Killbill-ApiKey: bob' \
     -H 'X-Killbill-ApiSecret: lazar' \
     'http://127.0.0.1:8080/plugins/aviate-plugin/v1/revenue/schedules/12'
```

```java
```

```ruby
```

```python
```

````php
````

````javascript
````

> Example Response:

```json
{
  "revenueScheduleId": "12",
  "invoiceId": "903e55d3-8072-47f1-80fc-32857dbdbcc5",
  "invoiceItemId": "0c9f7a3e-5d1b-4c58-8b6a-0e3b8d0e7f21",
  "accountId": "2ad52f53-85ae-408a-9879-32a7e59dd03d",
  "subscriptionId": "4e4c2f9b-77a1-4c3c-a8a2-6f9d3e1b5c10",
  "bundleId": "7b1e9d2c-3f4a-4e5b-9c6d-8a7b6c5d4e3f",
  "planName": "pistol-monthly",
  "phaseName": "pistol-monthly-evergreen",
  "invoiceItemType": "RECURRING",
  "invoiceItemDescription": "pistol-monthly-evergreen",
  "totalAmount": "29.950000000",
  "recognizedAmount": "16.424193544",
  "deferredAmount": "13.525806456",
  "currency": "USD",
  "recognitionRule": "REVENUE_RECOGNITION_RULE_STRAIGHT_LINE",
  "servicePeriodStartDate": "2026-01-15",
  "servicePeriodEndDate": "2026-02-15",
  "invoiceDate": "2026-01-15",
  "isClosed": false,
  "closedDate": ""
}
```

**Query Parameters**

None.

**Response**

If successful, returns a status code of 200 and a `RevenueSchedule` object. Returns 404 if the schedule does not exist.

### List the Revenue Schedules of a Contract

Returns the revenue schedules of the lines of a contract, most recent first.

**HTTP Request**

`GET /plugins/aviate-plugin/v1/revenue/contracts/{contractId}/schedules`

> Example Request:

```shell
curl -X GET \
     -H "Authorization: Bearer ${ID_TOKEN}" \
     -H 'X-Killbill-ApiKey: bob' \
     -H 'X-Killbill-ApiSecret: lazar' \
     'http://127.0.0.1:8080/plugins/aviate-plugin/v1/revenue/contracts/1f3c5e7a-2b4d-4f6a-8c0e-9a1b3c5d7e9f/schedules'
```

```java
```

```ruby
```

```python
```

````php
````

````javascript
````

> Example Response:

```json
[
  {
    "revenueScheduleId": "20",
    "invoiceId": "a1c7f3d2-6b5e-4f8a-9d0c-1e2f3a4b5c6d",
    "invoiceItemId": "b2d8e4f3-7c6f-4a9b-8e1d-2f3a4b5c6d7e",
    "accountId": "2ad52f53-85ae-408a-9879-32a7e59dd03d",
    "subscriptionId": "c3e9f5a4-8d7a-4b0c-9f2e-3a4b5c6d7e8f",
    "bundleId": "d4f0a6b5-9e8b-4c1d-8a3f-4b5c6d7e8f90",
    "planName": "gold-annual",
    "phaseName": "gold-annual-evergreen",
    "invoiceItemType": "RECURRING",
    "invoiceItemDescription": "gold-annual-evergreen",
    "totalAmount": "800.000000000",
    "recognizedAmount": "0.000000000",
    "deferredAmount": "800.000000000",
    "currency": "USD",
    "recognitionRule": "REVENUE_RECOGNITION_RULE_STRAIGHT_LINE",
    "servicePeriodStartDate": "2026-03-01",
    "servicePeriodEndDate": "2027-03-01",
    "invoiceDate": "2026-03-01",
    "isClosed": false,
    "closedDate": ""
  }
]
```

**Query Parameters**

None.

**Response**

If successful, returns a status code of 200 and a list of `RevenueSchedule` objects (empty for an unknown contract).

## Accounting Period APIs

### Create an Accounting Period

Creates an accounting period for one calendar month. Periods are also created automatically when an entry is dated in them.

**HTTP Request**

`POST /plugins/aviate-plugin/v1/revenue/periods`

> Example Request:

```shell
curl -X POST \
     -H "Authorization: Bearer ${ID_TOKEN}" \
     -H 'X-Killbill-ApiKey: bob' \
     -H 'X-Killbill-ApiSecret: lazar' \
     -H 'X-Killbill-CreatedBy: demo' \
     -H 'Content-Type: application/json' \
     -d '{}' \
     'http://127.0.0.1:8080/plugins/aviate-plugin/v1/revenue/periods?periodName=2026-04&startDate=2026-04-01&endDate=2026-04-30'
```

```java
```

```ruby
```

```python
```

````php
````

````javascript
````

> Example Response:

```
HTTP/1.1 201 Created
```

**Query Parameters**

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| **periodName** | string | true | none | Name of the period, `yyyy-MM` |
| **startDate** | string (date) | true | none | First day of that month (`yyyy-MM-dd`) |
| **endDate** | string (date) | true | none | Last day of that month (`yyyy-MM-dd`) |

**Response**

If successful, returns a status code of 201 and an empty body. Otherwise:

| Status | Reason |
|--------|--------|
| 400 | A parameter is missing or invalid: the name is not `yyyy-MM` (or not a valid month), or the dates are not the first and last days of that month |
| 409 | A period with this name already exists |

### List Accounting Periods

Returns the accounting periods of the tenant, by start date.

**HTTP Request**

`GET /plugins/aviate-plugin/v1/revenue/periods`

> Example Request:

```shell
curl -X GET \
     -H "Authorization: Bearer ${ID_TOKEN}" \
     -H 'X-Killbill-ApiKey: bob' \
     -H 'X-Killbill-ApiSecret: lazar' \
     'http://127.0.0.1:8080/plugins/aviate-plugin/v1/revenue/periods'
```

```java
```

```ruby
```

```python
```

````php
````

````javascript
````

> Example Response:

```json
[
  {
    "periodName": "2026-01",
    "startDate": "2026-01-01",
    "endDate": "2026-01-31",
    "closed": true,
    "closedDate": "2026-02-03T10:15:30",
    "closedBy": "demo",
    "tenantId": "6d1b2c3a-4e5f-4a6b-8c7d-9e0f1a2b3c4d"
  },
  {
    "periodName": "2026-02",
    "startDate": "2026-02-01",
    "endDate": "2026-02-28",
    "closed": false,
    "closedDate": null,
    "closedBy": null,
    "tenantId": "6d1b2c3a-4e5f-4a6b-8c7d-9e0f1a2b3c4d"
  }
]
```

**Query Parameters**

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| **closed** | boolean | false | none | Only the closed (`true`) or open (`false`) periods |

**Response**

If successful, returns a status code of 200 and a list of `AccountingPeriod` objects.

### Get an Accounting Period

**HTTP Request**

`GET /plugins/aviate-plugin/v1/revenue/periods/{name}`

> Example Request:

```shell
curl -X GET \
     -H "Authorization: Bearer ${ID_TOKEN}" \
     -H 'X-Killbill-ApiKey: bob' \
     -H 'X-Killbill-ApiSecret: lazar' \
     'http://127.0.0.1:8080/plugins/aviate-plugin/v1/revenue/periods/2026-02'
```

```java
```

```ruby
```

```python
```

````php
````

````javascript
````

> Example Response:

```json
{
  "periodName": "2026-02",
  "startDate": "2026-02-01",
  "endDate": "2026-02-28",
  "closed": false,
  "closedDate": null,
  "closedBy": null,
  "tenantId": "6d1b2c3a-4e5f-4a6b-8c7d-9e0f1a2b3c4d"
}
```

**Query Parameters**

None.

**Response**

If successful, returns a status code of 200 and an `AccountingPeriod` object. Returns 404 if the period does not exist.

### Run Revenue Recognition for an Accounting Period

Recognizes the revenue of an accounting period: its entries dated up to the end of the period. The call returns once the run is done. Only the first open period can be run, once it has ended; it can be run again until it is closed. If another run is in progress, the call waits for it (up to 30 seconds).

**HTTP Request**

`POST /plugins/aviate-plugin/v1/revenue/periods/{name}/recognize`

> Example Request:

```shell
curl -X POST \
     -H "Authorization: Bearer ${ID_TOKEN}" \
     -H 'X-Killbill-ApiKey: bob' \
     -H 'X-Killbill-ApiSecret: lazar' \
     -H 'X-Killbill-CreatedBy: demo' \
     -H 'Content-Type: application/json' \
     -d '{}' \
     'http://127.0.0.1:8080/plugins/aviate-plugin/v1/revenue/periods/2026-02/recognize'
```

```java
```

```ruby
```

```python
```

````php
````

````javascript
````

> Example Response:

```
HTTP/1.1 204 No Content
```

**Query Parameters**

None.

**Response**

If successful, returns a status code of 204 and an empty body. Otherwise, nothing is recognized:

| Status | Reason |
|--------|--------|
| 400 | The period has not ended |
| 404 | The period does not exist |
| 409 | The period is closed, an earlier period is still open, or the run in progress did not finish in time |

### Close an Accounting Period

Closes an accounting period. Only the first open period can be closed, once it has ended. Without `force`, the period can be closed only when all its entries are recognized: use the [period summary](#get-an-accounting-period-summary) to check `unrecognizedCount` first.

With `force=true`, the period is closed even if some of its entries are not recognized. These entries are then no longer recognized by any run, unless the period is reopened.

**HTTP Request**

`POST /plugins/aviate-plugin/v1/revenue/periods/{name}/close`

> Example Request:

```shell
curl -X POST \
     -H "Authorization: Bearer ${ID_TOKEN}" \
     -H 'X-Killbill-ApiKey: bob' \
     -H 'X-Killbill-ApiSecret: lazar' \
     -H 'X-Killbill-CreatedBy: demo' \
     -H 'Content-Type: application/json' \
     -d '{}' \
     'http://127.0.0.1:8080/plugins/aviate-plugin/v1/revenue/periods/2026-02/close'
```

```java
```

```ruby
```

```python
```

````php
````

````javascript
````

> Example Response:

```
HTTP/1.1 204 No Content
```

**Query Parameters**

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| **force** | boolean | false | false | Close the period even if some of its entries are not recognized |

**Response**

If successful, returns a status code of 204 and an empty body. Otherwise, nothing is closed:

| Status | Reason |
|--------|--------|
| 400 | The period has not ended, or (without `force`) some of its entries are not recognized |
| 404 | The period does not exist |
| 409 | The period is already closed, or an earlier period is still open |

### Reopen an Accounting Period

Reopens a closed accounting period. The entries of the period that were never recognized can then be recognized again; entries already recognized are not changed.

**HTTP Request**

`POST /plugins/aviate-plugin/v1/revenue/periods/{name}/reopen`

> Example Request:

```shell
curl -X POST \
     -H "Authorization: Bearer ${ID_TOKEN}" \
     -H 'X-Killbill-ApiKey: bob' \
     -H 'X-Killbill-ApiSecret: lazar' \
     -H 'X-Killbill-CreatedBy: demo' \
     -H 'Content-Type: application/json' \
     -d '{}' \
     'http://127.0.0.1:8080/plugins/aviate-plugin/v1/revenue/periods/2026-01/reopen'
```

```java
```

```ruby
```

```python
```

````php
````

````javascript
````

> Example Response:

```
HTTP/1.1 204 No Content
```

**Query Parameters**

None.

**Response**

If successful, returns a status code of 204 and an empty body. Returns 404 if the period does not exist or is not closed.

### Get an Accounting Period Summary

Returns the totals of an accounting period, for all currencies together.

**HTTP Request**

`GET /plugins/aviate-plugin/v1/revenue/periods/{name}/summary`

> Example Request:

```shell
curl -X GET \
     -H "Authorization: Bearer ${ID_TOKEN}" \
     -H 'X-Killbill-ApiKey: bob' \
     -H 'X-Killbill-ApiSecret: lazar' \
     'http://127.0.0.1:8080/plugins/aviate-plugin/v1/revenue/periods/2026-01/summary'
```

```java
```

```ruby
```

```python
```

````php
````

````javascript
````

> Example Response:

```json
{
  "accountingPeriod": "2026-01",
  "recognizedAmount": 16.424193544000000000000000000000,
  "deferredAmount": 0E-30,
  "entryCount": 1,
  "unrecognizedCount": 0
}
```

**Query Parameters**

None.

**Response**

If successful, returns a status code of 200 and an `AccountingPeriodSummary` object. Returns 404 if the period does not exist. The totals add up amounts in different currencies: use the [currency summary](#get-an-accounting-period-summary-by-currency) to get them per currency.

### Get an Accounting Period Summary by Currency

Returns the totals of an accounting period, one row per currency.

**HTTP Request**

`GET /plugins/aviate-plugin/v1/revenue/periods/{name}/currencySummary`

> Example Request:

```shell
curl -X GET \
     -H "Authorization: Bearer ${ID_TOKEN}" \
     -H 'X-Killbill-ApiKey: bob' \
     -H 'X-Killbill-ApiSecret: lazar' \
     'http://127.0.0.1:8080/plugins/aviate-plugin/v1/revenue/periods/2026-01/currencySummary'
```

```java
```

```ruby
```

```python
```

````php
````

````javascript
````

> Example Response:

```json
[
  {
    "accountingPeriod": "2026-01",
    "currency": "EUR",
    "recognizedAmount": 52.500000000000000000000000000000,
    "deferredAmount": 0E-30,
    "entryCount": 1,
    "unrecognizedCount": 0
  },
  {
    "accountingPeriod": "2026-01",
    "currency": "USD",
    "recognizedAmount": 16.424193544000000000000000000000,
    "deferredAmount": 0E-30,
    "entryCount": 1,
    "unrecognizedCount": 0
  }
]
```

**Query Parameters**

None.

**Response**

If successful, returns a status code of 200 and a list of `AccountingPeriodCurrencySummary` objects, by currency. Returns 404 if the period does not exist.

## Period Extract APIs

These endpoints return CSV files of the data of an accounting period (open or closed), for all the accounts of the tenant. Each file is returned as an attachment (`Content-Type: text/csv; charset=utf-8`) named `revenue-{period}-{extract}.csv`, for example `revenue-2026-01-invoice-lines.csv`.

All the extracts start with the same 13 columns, followed by 3 columns of their own. A column with no value in an extract is left empty. The files follow RFC 4180 (comma-separated, rows ended by CRLF); a text value starting with `=`, `+`, `-`, `@`, a tab or a carriage return is prefixed with a single quote so that spreadsheets do not read it as a formula.

| Column | Invoice lines | Payments | Installments |
|--------|---------------|----------|--------------|
| Transaction Type | `INVOICE`, or `CREDIT_NOTE` for `REPAIR_ADJ`, `ITEM_ADJ`, `CREDIT_ADJ` and negative `TAX` lines | `PAYMENT` (`PURCHASE`, `CAPTURE`, failed `CHARGEBACK`), `REFUND` (`REFUND`, `CREDIT`, `CHARGEBACK`) | `RECOGNITION` or `REVERSAL` |
| Transaction Number | Invoice number | Payment number | empty |
| Transaction ID | Invoice item ID | Payment transaction ID | Revenue entry ID |
| Transaction Status | Invoice status | Transaction status | `RECOGNIZED` or `NOT_RECOGNIZED` |
| Transaction Date | Invoice date | Effective date (UTC, e.g. `2026-01-15T10:20:30Z`) | Recognition date |
| Account | Account ID | Account ID | Account ID |
| Product | Product name | empty | empty |
| Custom Labels/Tags | empty | empty | empty |
| Service Period Start | Line start date | empty | Schedule service period start |
| Service Period End | Line end date | empty | Schedule service period end |
| Net Amount | Line amount (empty for tax lines) | empty | Entry amount |
| Tax Amount | Line amount of tax lines | empty | empty |
| Gross Amount | Line amount | Transaction amount | Entry amount |
| 14th column | `Line type`: line type | `Line type`: transaction type (`PURCHASE`, `REFUND`, ...) | `Schedule ID`: revenue schedule ID |
| 15th column | `Linked line ID`: linked line ID | `Payment ID`: payment ID | `Invoice line ID`: invoice item ID |
| 16th column | `Currency` | `Currency` | `Currency` |

### Get the Invoice Lines Extract

Returns the lines of the invoices dated in the period (invoice dates as stored by Kill Bill), except the lines of draft invoices, account credit lines (`CBA_ADJ`) and parent summary lines (`PARENT_SUMMARY`). The lines of voided invoices are included, with their status.

**HTTP Request**

`GET /plugins/aviate-plugin/v1/revenue/periods/{name}/extract/invoice-lines`

> Example Request:

```shell
curl -X GET \
     -H "Authorization: Bearer ${ID_TOKEN}" \
     -H 'X-Killbill-ApiKey: bob' \
     -H 'X-Killbill-ApiSecret: lazar' \
     -o revenue-2026-01-invoice-lines.csv \
     'http://127.0.0.1:8080/plugins/aviate-plugin/v1/revenue/periods/2026-01/extract/invoice-lines'
```

```java
```

```ruby
```

```python
```

````php
````

````javascript
````

> Example Response:

```
Transaction Type,Transaction Number,Transaction ID,Transaction Status,Transaction Date,Account,Product,Custom Labels/Tags,Service Period Start,Service Period End,Net Amount,Tax Amount,Gross Amount,Line type,Linked line ID,Currency
INVOICE,1042,0c9f7a3e-5d1b-4c58-8b6a-0e3b8d0e7f21,COMMITTED,2026-01-15,2ad52f53-85ae-408a-9879-32a7e59dd03d,Pistol,,2026-01-15,2026-02-15,29.950000000,,29.950000000,RECURRING,,USD
```

**Query Parameters**

None.

**Response**

If successful, returns a status code of 200 and the CSV file. Returns 404 if the period does not exist.

### Get the Payments Extract

Returns the payment transactions effective in the period (from the first day at 00:00 UTC to the end of the last day, UTC). Authorizations and voids are left out; pending and failed transactions are included, with their status.

**HTTP Request**

`GET /plugins/aviate-plugin/v1/revenue/periods/{name}/extract/payments`

> Example Request:

```shell
curl -X GET \
     -H "Authorization: Bearer ${ID_TOKEN}" \
     -H 'X-Killbill-ApiKey: bob' \
     -H 'X-Killbill-ApiSecret: lazar' \
     -o revenue-2026-01-payments.csv \
     'http://127.0.0.1:8080/plugins/aviate-plugin/v1/revenue/periods/2026-01/extract/payments'
```

```java
```

```ruby
```

```python
```

````php
````

````javascript
````

> Example Response:

```
Transaction Type,Transaction Number,Transaction ID,Transaction Status,Transaction Date,Account,Product,Custom Labels/Tags,Service Period Start,Service Period End,Net Amount,Tax Amount,Gross Amount,Line type,Payment ID,Currency
PAYMENT,317,5e6f7a8b-9c0d-4e1f-a2b3-c4d5e6f7a8b9,SUCCESS,2026-01-15T10:20:30Z,2ad52f53-85ae-408a-9879-32a7e59dd03d,,,,,,,29.950000000,PURCHASE,8f9e0d1c-2b3a-4c5d-9e8f-7a6b5c4d3e2f,USD
```

**Query Parameters**

None.

**Response**

If successful, returns a status code of 200 and the CSV file. Returns 404 if the period does not exist.

### Get the Installments Extract

Returns the revenue entries of the period: the entries saved with the period, and the reversal entries dated in it.

**HTTP Request**

`GET /plugins/aviate-plugin/v1/revenue/periods/{name}/extract/installments`

> Example Request:

```shell
curl -X GET \
     -H "Authorization: Bearer ${ID_TOKEN}" \
     -H 'X-Killbill-ApiKey: bob' \
     -H 'X-Killbill-ApiSecret: lazar' \
     -o revenue-2026-01-installments.csv \
     'http://127.0.0.1:8080/plugins/aviate-plugin/v1/revenue/periods/2026-01/extract/installments'
```

```java
```

```ruby
```

```python
```

````php
````

````javascript
````

> Example Response:

```
Transaction Type,Transaction Number,Transaction ID,Transaction Status,Transaction Date,Account,Product,Custom Labels/Tags,Service Period Start,Service Period End,Net Amount,Tax Amount,Gross Amount,Schedule ID,Invoice line ID,Currency
RECOGNITION,,101,RECOGNIZED,2026-01-31,2ad52f53-85ae-408a-9879-32a7e59dd03d,,,2026-01-15,2026-02-15,16.424193544,,16.424193544,12,0c9f7a3e-5d1b-4c58-8b6a-0e3b8d0e7f21,USD
```

**Query Parameters**

None.

**Response**

If successful, returns a status code of 200 and the CSV file. Returns 404 if the period does not exist.

## Report APIs

### Get the Deferred Balance

Returns the deferred amount of the open revenue schedules, one row per currency.

**HTTP Request**

`GET /plugins/aviate-plugin/v1/revenue/reports/deferred-balance`

> Example Request:

```shell
curl -X GET \
     -H "Authorization: Bearer ${ID_TOKEN}" \
     -H 'X-Killbill-ApiKey: bob' \
     -H 'X-Killbill-ApiSecret: lazar' \
     'http://127.0.0.1:8080/plugins/aviate-plugin/v1/revenue/reports/deferred-balance?currency=USD'
```

```java
```

```ruby
```

```python
```

````php
````

````javascript
````

> Example Response:

```json
[
  {
    "currency": "USD",
    "totalDeferred": 813.525806456,
    "scheduleCount": 2
  }
]
```

**Query Parameters**

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| **currency** | string | false | none | Only this currency |

**Response**

If successful, returns a status code of 200 and a list of `DeferredBalanceEntry` objects, by currency.

### Get the Revenue Waterfall

Returns the recognized and deferred amounts of the revenue entries, one row per accounting period and currency, by period then currency.

**HTTP Request**

`GET /plugins/aviate-plugin/v1/revenue/reports/waterfall`

> Example Request:

```shell
curl -X GET \
     -H "Authorization: Bearer ${ID_TOKEN}" \
     -H 'X-Killbill-ApiKey: bob' \
     -H 'X-Killbill-ApiSecret: lazar' \
     'http://127.0.0.1:8080/plugins/aviate-plugin/v1/revenue/reports/waterfall?startPeriod=2026-01&endPeriod=2026-02&currency=USD'
```

```java
```

```ruby
```

```python
```

````php
````

````javascript
````

> Example Response:

```json
[
  {
    "accountingPeriod": "2026-01",
    "currency": "USD",
    "recognizedAmount": 16.424193544000000000000000000000,
    "deferredAmount": 0E-30,
    "entryCount": 1
  },
  {
    "accountingPeriod": "2026-02",
    "currency": "USD",
    "recognizedAmount": 0E-30,
    "deferredAmount": 13.525806456000000000000000000000,
    "entryCount": 1
  }
]
```

**Query Parameters**

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| **startPeriod** | string | false | none | First accounting period (`yyyy-MM`), included |
| **endPeriod** | string | false | none | Last accounting period (`yyyy-MM`), included |
| **currency** | string | false | none | Only this currency |

The period names are compared as text and are not validated. Reversal entries are saved without an accounting period: without `startPeriod` and `endPeriod`, they are reported in a row with an empty or `null` `accountingPeriod`, and with either parameter they are left out.

**Response**

If successful, returns a status code of 200 and a list of `CurrencyPeriodSummary` objects.

### Get the Revenue by Plan

Returns the revenue of the tenant, one row per plan and currency, by currency, then by total amount (highest first), then by plan.

* Without `from` and `to`, the amounts are the totals of all the schedules.
* With `from` and/or `to`, the amounts are those of the revenue entries of the accounting periods of the months of `from` and `to` and the months in between, and `scheduleCount` counts the schedules with such entries. Entries without an accounting period (reversal entries) are not in any range.

**HTTP Request**

`GET /plugins/aviate-plugin/v1/revenue/reports/by-plan`

> Example Request:

```shell
curl -X GET \
     -H "Authorization: Bearer ${ID_TOKEN}" \
     -H 'X-Killbill-ApiKey: bob' \
     -H 'X-Killbill-ApiSecret: lazar' \
     'http://127.0.0.1:8080/plugins/aviate-plugin/v1/revenue/reports/by-plan?from=2026-01-01&to=2026-03-31'
```

```java
```

```ruby
```

```python
```

````php
````

````javascript
````

> Example Response:

```json
[
  {
    "planName": "gold-annual",
    "currency": "USD",
    "totalAmount": 67.945205482,
    "recognizedAmount": 0E-30,
    "deferredAmount": 67.945205482000000000000000000000,
    "scheduleCount": 1,
    "accounts": 1,
    "subscriptions": 1
  },
  {
    "planName": "pistol-monthly",
    "currency": "USD",
    "totalAmount": 29.950000000,
    "recognizedAmount": 16.424193544000000000000000000000,
    "deferredAmount": 13.525806456000000000000000000000,
    "scheduleCount": 1,
    "accounts": 1,
    "subscriptions": 1
  }
]
```

**Query Parameters**

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| **from** | string (date) | false | none | A date (`yyyy-MM-dd`) in the first accounting period of the range |
| **to** | string (date) | false | none | A date (`yyyy-MM-dd`) in the last accounting period of the range |

**Response**

If successful, returns a status code of 200 and a list of `RevenueByPlanEntry` objects. Returns 400 if a date is invalid or `from` is after `to`.

### Get the Recognition Rate

Returns how much of the revenue has been recognized, one row per recognition rule and currency, by rule then currency.

**HTTP Request**

`GET /plugins/aviate-plugin/v1/revenue/reports/recognition-rate`

> Example Request:

```shell
curl -X GET \
     -H "Authorization: Bearer ${ID_TOKEN}" \
     -H 'X-Killbill-ApiKey: bob' \
     -H 'X-Killbill-ApiSecret: lazar' \
     'http://127.0.0.1:8080/plugins/aviate-plugin/v1/revenue/reports/recognition-rate?asOfDate=2026-02-15'
```

```java
```

```ruby
```

```python
```

````php
````

````javascript
````

> Example Response:

```json
[
  {
    "recognitionRule": "REVENUE_RECOGNITION_RULE_STRAIGHT_LINE",
    "currency": "USD",
    "totalAmount": 29.950000000,
    "recognizedAmount": 16.424193544,
    "deferredAmount": 13.525806456,
    "recognitionRate": 0.5484,
    "avgRecognitionPercent": 54.84,
    "scheduleCount": 1,
    "avgDaysSinceInvoice": 31
  }
]
```

**Query Parameters**

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| **asOfDate** | string (date) | false | current date | Date (`yyyy-MM-dd`) used for `avgDaysSinceInvoice` |

**Response**

If successful, returns a status code of 200 and a list of `RecognitionRateEntry` objects. Returns 400 if `asOfDate` is invalid. The amounts and rates cover all the schedules, whatever their invoice date: `asOfDate` only affects `avgDaysSinceInvoice`.

### Get the Ledger of an Account

Returns the transaction ledger of an account: one row per revenue schedule of the account (its total amount as a debit, or as a credit when negative), dated on its invoice date, and one row per reversal entry of these schedules (as a credit), dated on its own date. Rows are sorted by date (schedules before reversals on the same date), with a running balance per currency. An account without schedules has an empty ledger.

**HTTP Request**

`GET /plugins/aviate-plugin/v1/revenue/accounts/{accountId}/ledger`

> Example Request:

```shell
curl -X GET \
     -H "Authorization: Bearer ${ID_TOKEN}" \
     -H 'X-Killbill-ApiKey: bob' \
     -H 'X-Killbill-ApiSecret: lazar' \
     'http://127.0.0.1:8080/plugins/aviate-plugin/v1/revenue/accounts/2ad52f53-85ae-408a-9879-32a7e59dd03d/ledger?from=2026-01-01&to=2026-12-31'
```

```java
```

```ruby
```

```python
```

````php
````

````javascript
````

> Example Response:

```json
[
  {
    "createDate": "2026-01-15",
    "startDate": "2026-01-15",
    "endDate": "2026-02-15",
    "credit": "0",
    "debit": "29.950000000",
    "balance": "29.950000000",
    "currency": "USD",
    "planName": "pistol-monthly",
    "invoiceItemType": "RECURRING",
    "invoiceItemDescription": "pistol-monthly-evergreen",
    "subscriptionExternalKey": "pistol-sub-1",
    "invoiceId": "903e55d3-8072-47f1-80fc-32857dbdbcc5"
  },
  {
    "createDate": "2026-02-01",
    "startDate": "2026-01-15",
    "endDate": "2026-02-15",
    "credit": "10.000000000",
    "debit": "0",
    "balance": "19.950000000",
    "currency": "USD",
    "planName": "pistol-monthly",
    "invoiceItemType": "REVERSAL",
    "invoiceItemDescription": "Reversal due to credit memo 9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d",
    "subscriptionExternalKey": "pistol-sub-1",
    "invoiceId": "903e55d3-8072-47f1-80fc-32857dbdbcc5"
  }
]
```

**Query Parameters**

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| **from** | string (date) | false | none | Only the schedules invoiced on or after this date (`yyyy-MM-dd`) |
| **to** | string (date) | false | none | Only the schedules invoiced on or before this date (`yyyy-MM-dd`) |

`from` and `to` select schedules: the reversal entries of the selected schedules are always included, whatever their date.

**Response**

If successful, returns a status code of 200 and a list of `AccountLedgerEntry` objects. Returns 400 if a date is invalid or `from` is after `to`.

### Get the Revenue by Plan of an Account

Returns the revenue schedules of an account, one row per schedule, with its amounts and the number of its entries, sorted by service start date. An account without schedules has no rows.

**HTTP Request**

`GET /plugins/aviate-plugin/v1/revenue/accounts/{accountId}/revenue-by-plan`

> Example Request:

```shell
curl -X GET \
     -H "Authorization: Bearer ${ID_TOKEN}" \
     -H 'X-Killbill-ApiKey: bob' \
     -H 'X-Killbill-ApiSecret: lazar' \
     'http://127.0.0.1:8080/plugins/aviate-plugin/v1/revenue/accounts/2ad52f53-85ae-408a-9879-32a7e59dd03d/revenue-by-plan'
```

```java
```

```ruby
```

```python
```

````php
````

````javascript
````

> Example Response:

```json
[
  {
    "planName": "pistol-monthly",
    "phaseName": "pistol-monthly-evergreen",
    "totalAmount": "29.950000000",
    "recognizedAmount": "16.424193544",
    "deferredAmount": "13.525806456",
    "currency": "USD",
    "serviceStartDate": "2026-01-15",
    "serviceEndDate": "2026-02-15",
    "invoiceDate": "2026-01-15",
    "recognitionRule": "REVENUE_RECOGNITION_RULE_STRAIGHT_LINE",
    "totalEntries": 2,
    "recognizedEntries": 1,
    "pendingEntries": 1,
    "scheduleId": "12"
  }
]
```

**Query Parameters**

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| **from** | string (date) | false | none | Only the schedules invoiced on or after this date (`yyyy-MM-dd`) |
| **to** | string (date) | false | none | Only the schedules invoiced on or before this date (`yyyy-MM-dd`) |

**Response**

If successful, returns a status code of 200 and a list of `AccountRevenueByPlan` objects. Returns 400 if a date is invalid or `from` is after `to`.

## Standalone Selling Price APIs

Standalone selling prices (SSPs) are used to [allocate the transaction price of a contract](#allocate-a-contract) across its terms. The SSP of a term is the SSP of its plan, phase and currency that is effective on the allocation date: effective on or before that date, not expired before it, and with the latest effective date if several match.

### Create a Standalone Selling Price

**HTTP Request**

`POST /plugins/aviate-plugin/v1/revenue/ssp`

> Example Request:

```shell
curl -X POST \
     -H "Authorization: Bearer ${ID_TOKEN}" \
     -H 'X-Killbill-ApiKey: bob' \
     -H 'X-Killbill-ApiSecret: lazar' \
     -H 'X-Killbill-CreatedBy: demo' \
     -H 'Content-Type: application/json' \
     -d '{}' \
     'http://127.0.0.1:8080/plugins/aviate-plugin/v1/revenue/ssp?planName=gold-annual&phaseName=gold-annual-evergreen&currency=USD&amount=1200&effectiveDate=2026-01-01'
```

```java
```

```ruby
```

```python
```

````php
````

````javascript
````

> Example Response:

```
HTTP/1.1 201 Created
```

**Query Parameters**

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| **planName** | string | true | none | Plan |
| **phaseName** | string | true | none | Phase |
| **currency** | string | true | none | Currency |
| **amount** | string (decimal) | true | none | Standalone selling price |
| **effectiveDate** | string (date) | true | none | First day the SSP applies (`yyyy-MM-dd`) |
| **expirationDate** | string (date) | false | none | Last day the SSP applies (`yyyy-MM-dd`); without it, the SSP does not expire |
| **source** | string | false | `LIST_PRICE` | Source of the SSP. `RESIDUAL` selects the residual allocation method for the contracts that use it. |

The values are saved as given: the plan, phase and currency are not checked, and several SSPs can be created for the same plan, phase and currency.

**Response**

If successful, returns a status code of 201 and an empty body. Returns 400 if a required parameter is missing or `amount` is not a number.

### List Standalone Selling Prices

Returns the SSPs of the tenant, by plan, phase, then effective date (latest first).

**HTTP Request**

`GET /plugins/aviate-plugin/v1/revenue/ssp`

> Example Request:

```shell
curl -X GET \
     -H "Authorization: Bearer ${ID_TOKEN}" \
     -H 'X-Killbill-ApiKey: bob' \
     -H 'X-Killbill-ApiSecret: lazar' \
     'http://127.0.0.1:8080/plugins/aviate-plugin/v1/revenue/ssp'
```

```java
```

```ruby
```

```python
```

````php
````

````javascript
````

> Example Response:

```json
[
  {
    "id": "3b2a1c0d-9e8f-4a7b-8c6d-5e4f3a2b1c0d",
    "planName": "gold-annual",
    "phaseName": "gold-annual-evergreen",
    "currency": "USD",
    "sspAmount": 1200.000000000,
    "effectiveDate": "2026-01-01",
    "expirationDate": null,
    "source": "LIST_PRICE",
    "createdBy": "demo",
    "createdDate": "2026-01-02T09:30:12",
    "accountId": null,
    "tenantId": "6d1b2c3a-4e5f-4a6b-8c7d-9e0f1a2b3c4d"
  }
]
```

**Query Parameters**

None.

**Response**

If successful, returns a status code of 200 and a list of `SspEntry` objects.

### Delete a Standalone Selling Price

Deletes an SSP. Allocations already computed with it are not changed.

**HTTP Request**

`DELETE /plugins/aviate-plugin/v1/revenue/ssp/{id}`

The same operation is also available as `POST /plugins/aviate-plugin/v1/revenue/ssp/{id}/delete`.

> Example Request:

```shell
curl -X DELETE \
     -H "Authorization: Bearer ${ID_TOKEN}" \
     -H 'X-Killbill-ApiKey: bob' \
     -H 'X-Killbill-ApiSecret: lazar' \
     -H 'X-Killbill-CreatedBy: demo' \
     'http://127.0.0.1:8080/plugins/aviate-plugin/v1/revenue/ssp/3b2a1c0d-9e8f-4a7b-8c6d-5e4f3a2b1c0d'
```

```java
```

```ruby
```

```python
```

````php
````

````javascript
````

> Example Response:

```
HTTP/1.1 204 No Content
```

**Query Parameters**

None.

**Response**

If successful, returns a status code of 204 and an empty body. Returns 404 if the SSP does not exist.

## Contract Allocation APIs

### Allocate a Contract

Allocates a transaction price across the terms of an Aviate contract (see [Contract Allocation](#allocate-a-contract)), and saves the allocation of each term, replacing any existing allocation of the term. The revenue schedules already created for the contract are not changed.

When allocating through this endpoint:

* The SSP of each term is looked up for the term's plan, with the term's term period (for example `P1Y`) as the phase name, and the current date as the allocation date. This term period is also saved as the allocation's `phaseName`.
* Allocations made when an invoice is processed use the phase of the invoice line instead.

**HTTP Request**

`POST /plugins/aviate-plugin/v1/revenue/contracts/{contractId}/allocations`

> Example Request:

```shell
curl -X POST \
     -H "Authorization: Bearer ${ID_TOKEN}" \
     -H 'X-Killbill-ApiKey: bob' \
     -H 'X-Killbill-ApiSecret: lazar' \
     -H 'X-Killbill-CreatedBy: demo' \
     -H 'Content-Type: application/json' \
     -d '{}' \
     'http://127.0.0.1:8080/plugins/aviate-plugin/v1/revenue/contracts/1f3c5e7a-2b4d-4f6a-8c0e-9a1b3c5d7e9f/allocations?currency=USD&transactionPrice=1000'
```

```java
```

```ruby
```

```python
```

````php
````

````javascript
````

> Example Response:

```json
[
  {
    "id": "e1d2c3b4-a5f6-4e7d-8c9b-0a1f2e3d4c5b",
    "contractId": "1f3c5e7a-2b4d-4f6a-8c0e-9a1b3c5d7e9f",
    "contractTermId": "5a6b7c8d-9e0f-4a1b-8c2d-3e4f5a6b7c8d",
    "planName": "gold-annual",
    "phaseName": "P1Y",
    "listPrice": 1200.000000000,
    "sspAmount": 1200.000000000,
    "sspRatio": 0.800000000,
    "allocatedAmount": 800.000000000,
    "transactionPrice": 1000.000000000,
    "currency": "USD",
    "allocationMethod": "RELATIVE_SSP",
    "createdBy": "demo",
    "createdDate": "2026-03-01T08:12:45",
    "accountId": null,
    "tenantId": "6d1b2c3a-4e5f-4a6b-8c7d-9e0f1a2b3c4d"
  },
  {
    "id": "f2e3d4c5-b6a7-4f8e-9d0c-1b2a3f4e5d6c",
    "contractId": "1f3c5e7a-2b4d-4f6a-8c0e-9a1b3c5d7e9f",
    "contractTermId": "6b7c8d9e-0f1a-4b2c-9d3e-4f5a6b7c8d9e",
    "planName": "support-annual",
    "phaseName": "P1Y",
    "listPrice": 300.000000000,
    "sspAmount": 300.000000000,
    "sspRatio": 0.200000000,
    "allocatedAmount": 200.000000000,
    "transactionPrice": 1000.000000000,
    "currency": "USD",
    "allocationMethod": "RELATIVE_SSP",
    "createdBy": "demo",
    "createdDate": "2026-03-01T08:12:45",
    "accountId": null,
    "tenantId": "6d1b2c3a-4e5f-4a6b-8c7d-9e0f1a2b3c4d"
  }
]
```

**Query Parameters**

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| **currency** | string | true | none | Currency of the transaction price, also used to look up the SSPs |
| **transactionPrice** | string (decimal) | true | none | Transaction price of the contract |

**Response**

If successful, returns a status code of 200 and the list of the `ContractAllocationEntry` objects saved. A contract without terms (or an unknown contract) returns an empty list. Returns 400 if a parameter is missing or `transactionPrice` is not a number.

### List the Allocations of a Contract

Returns the allocations of the terms of a contract, by contract term ID.

**HTTP Request**

`GET /plugins/aviate-plugin/v1/revenue/contracts/{contractId}/allocations`

> Example Request:

```shell
curl -X GET \
     -H "Authorization: Bearer ${ID_TOKEN}" \
     -H 'X-Killbill-ApiKey: bob' \
     -H 'X-Killbill-ApiSecret: lazar' \
     'http://127.0.0.1:8080/plugins/aviate-plugin/v1/revenue/contracts/1f3c5e7a-2b4d-4f6a-8c0e-9a1b3c5d7e9f/allocations'
```

```java
```

```ruby
```

```python
```

````php
````

````javascript
````

> Example Response:

```json
[
  {
    "id": "e1d2c3b4-a5f6-4e7d-8c9b-0a1f2e3d4c5b",
    "contractId": "1f3c5e7a-2b4d-4f6a-8c0e-9a1b3c5d7e9f",
    "contractTermId": "5a6b7c8d-9e0f-4a1b-8c2d-3e4f5a6b7c8d",
    "planName": "gold-annual",
    "phaseName": "P1Y",
    "listPrice": 1200.000000000,
    "sspAmount": 1200.000000000,
    "sspRatio": 0.800000000,
    "allocatedAmount": 800.000000000,
    "transactionPrice": 1000.000000000,
    "currency": "USD",
    "allocationMethod": "RELATIVE_SSP",
    "createdBy": "demo",
    "createdDate": "2026-03-01T08:12:45",
    "accountId": null,
    "tenantId": "6d1b2c3a-4e5f-4a6b-8c7d-9e0f1a2b3c4d"
  }
]
```

**Query Parameters**

None.

**Response**

If successful, returns a status code of 200 and a list of `ContractAllocationEntry` objects (empty for a contract without allocations).

### List Contract Allocation Summaries

Returns one summary per allocated contract of the tenant.

**HTTP Request**

`GET /plugins/aviate-plugin/v1/revenue/contracts/allocations/summary`

> Example Request:

```shell
curl -X GET \
     -H "Authorization: Bearer ${ID_TOKEN}" \
     -H 'X-Killbill-ApiKey: bob' \
     -H 'X-Killbill-ApiSecret: lazar' \
     'http://127.0.0.1:8080/plugins/aviate-plugin/v1/revenue/contracts/allocations/summary'
```

```java
```

```ruby
```

```python
```

````php
````

````javascript
````

> Example Response:

```json
[
  {
    "contractId": "1f3c5e7a-2b4d-4f6a-8c0e-9a1b3c5d7e9f",
    "allocationCount": 2,
    "totalAllocated": 1000.000000000,
    "totalTransactionPrice": 2000.000000000,
    "currency": "USD"
  }
]
```

**Query Parameters**

None.

**Response**

If successful, returns a status code of 200 and a list of `ContractAllocationSummary` objects.
